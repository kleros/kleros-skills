#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  createPublicClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  isAddress,
  parseAbi,
  parseEther,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
} from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { z } from "zod";

// Deployment allowlist. Source of truth (deployed state = master branch):
// https://github.com/kleros/kleros-v2/tree/master/contracts/deployments/{arbitrum,arbitrumSepolia}
//
// `evidenceModuleImplementation` pins the EIP-1967 implementation behind the
// EvidenceModule UUPS proxy (EvidenceModule_Implementation.json on master,
// confirmed on chain 2026-11-04). The proxy address never changes on upgrade,
// but the meaning of submitEvidence's key can: kleros-v2 `dev` already re-keys it
// from the arbitrable's _externalDisputeID to the arbitrator dispute ID. Evidence
// prepared with the wrong key lands on another case, permanently, so any other
// implementation is refused until this skill is reviewed and updated.
//
// `arbitrableWhitelist`: "required" means Kleros Core must positively answer
// arbitrableWhitelist(resolver) == true; "absent" means the deployment has no
// such function (the call reverts) and enforces nothing.
export const NETWORKS = {
  arbitrum: {
    key: "arbitrum",
    label: "Arbitrum One",
    chain: arbitrum,
    chainId: 42161,
    core: "0x991d2df165670b9cac3B022f4B68D65b664222ea",
    resolver: "0xb5526D022962A1fFf6eD32C93e8b714c901F4323",
    evidenceModule: "0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3",
    evidenceModuleImplementation: "0xA502A3942abCF8e71FBD87ed442B39b798b192C8",
    arbitrableWhitelist: "required",
    app: "https://v2.kleros.builders",
    explorer: "https://arbiscan.io",
    production: true,
  },
  arbitrumSepolia: {
    key: "arbitrumSepolia",
    label: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    chainId: 421614,
    core: "0xE8442307d36e9bf6aB27F1A009F95CE8E11C3479",
    resolver: "0xed31bEE8b1F7cE89E93033C0d3B2ccF4cEb27652",
    evidenceModule: "0xA88A9a25cE7f1d8b3941dA3b322Ba91D009E1397",
    evidenceModuleImplementation: "0xC4e64e6E949936a18269937FC1e18cb11E3db14D",
    arbitrableWhitelist: "absent",
    app: "https://kleros-v2-testnet.netlify.app",
    explorer: "https://sepolia.arbiscan.io",
    production: false,
  },
} as const;

type Network = (typeof NETWORKS)[keyof typeof NETWORKS];

const NETWORK_ALIASES: Record<string, Network> = {
  arbitrum: NETWORKS.arbitrum,
  "arbitrum-one": NETWORKS.arbitrum,
  arbitrumone: NETWORKS.arbitrum,
  mainnet: NETWORKS.arbitrum,
  "42161": NETWORKS.arbitrum,
  arbitrumsepolia: NETWORKS.arbitrumSepolia,
  "arbitrum-sepolia": NETWORKS.arbitrumSepolia,
  sepolia: NETWORKS.arbitrumSepolia,
  testnet: NETWORKS.arbitrumSepolia,
  "421614": NETWORKS.arbitrumSepolia,
};

const KLEROS_IPFS_HTTP_GATEWAY = "https://cdn.kleros.link";
const QUOTE_TTL_MS = 300_000;

const coreAbi = parseAbi([
  "function arbitrationCost(bytes _extraData) view returns (uint256 cost)",
  "function courts(uint256 _courtID) view returns (uint96 parent, bool hiddenVotes, uint256 minStake, uint256 alpha, uint256 feeForJuror, uint256 jurorsForCourtJump, bool disabled)",
  "function isSupported(uint96 _courtID, uint256 _disputeKitID) view returns (bool)",
  "function arbitrableWhitelist(address _arbitrable) view returns (bool)",
  "function disputes(uint256 _disputeID) view returns (uint96 courtID, address arbitrated, uint8 period, bool ruled, uint256 lastPeriodChange)",
  "event DisputeCreation(uint256 indexed _disputeID, address indexed _arbitrable)",
]);
// The deployed EvidenceModule keys evidence by `_externalDisputeID`, the
// arbitrable-side identifier emitted with the arbitrator dispute ID in
// DisputeRequest. These signatures are pinned to the deployed ABIs consumed by
// the indexer and Court application.
const evidenceAbi = parseAbi([
  "function submitEvidence(uint256 _externalDisputeID, string _evidence)",
  "event Evidence(uint256 indexed _externalDisputeID, address indexed _party, string _evidence)",
]);
const PERIODS = ["evidence", "commit", "vote", "appeal", "execution"] as const;

// Ruling 0 belongs to the protocol and is rendered by the Court before the
// template's ruling options. It must not be duplicated in the template, and each
// review artifact includes it so the reviewer sees the complete juror ballot.
export const RESERVED_RULING = {
  id: "0x00",
  title: "Refuse to Arbitrate / Invalid",
  description: "Added by the Court on every case. Jurors pick it when the dispute cannot be ruled on. It is not part of this template and cannot be edited or removed.",
  pattern: /refuse to arbitrate|refuse to rule|unable to rule|^\s*(refuse|invalid)\s*$|^\s*refuse\s*\/\s*invalid\s*$/i,
} as const;
const resolverAbi = parseAbi([
  "function createDisputeForTemplate(bytes _arbitratorExtraData, string _disputeTemplate, string _disputeTemplateDataMappings, uint256 _numberOfRulingOptions) payable returns (uint256 disputeID)",
  "function arbitrator() view returns (address)",
  "function arbitratorDisputeIDToLocalID(uint256 _arbitratorDisputeID) view returns (uint256 localDisputeID)",
  "event DisputeRequest(address indexed _arbitrator, uint256 indexed _arbitratorDisputeID, uint256 _externalDisputeID, uint256 _templateId, string _templateUri)",
]);

const schema = z.object({
  schemaVersion: z.literal("1.0"),
  title: z.string().trim().min(5).max(240),
  description: z.string().trim().min(20).max(20_000),
  question: z.string().trim().min(10).max(2_000),
  answers: z.array(z.object({
    id: z.string().regex(/^0x[0-9a-fA-F]+$/),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(12).max(2_000),
  })).min(2).max(32),
  policyURI: z.string().trim().min(1),
  category: z.string().trim().min(1).max(100).default("Other"),
  lang: z.string().regex(/^[a-z]{2}_[A-Z]{2}$/).default("en_US"),
  version: z.literal("1.0").default("1.0"),
  courtId: z.string().default("1"), // decimal-only, checked and normalised in validate()
  numberOfJurors: z.number().int().positive().max(10_001).default(3),
  disputeKitId: z.literal(1).default(1),
}).strict();

/// Kleros stores IPFS references as `/ipfs/<CID>`. Accept the `ipfs://` scheme as
/// input but never emit it, and reject anything that is not CID-shaped.
///
/// Must stay at least as strict as the SDK's `isMultiaddr`
/// (kleros-sdk/src/dataMappings/utils/disputeDetailsSchema.ts, master:
/// `^\/(?:…|ipfs)(\/[^\s\/]+)+$`): a policyURI the SDK rejects fails the Court's
/// zod parse and the whole case renders empty. On top of that, no `?`/`#`, no
/// empty, `.` or `..` path segments, and no trailing slash.
export const IPFS_URI_PATTERN = /^\/ipfs\/[A-Za-z0-9]+(\/[^\s\/?#]+)*$/;
export function normalizeIpfsUri(raw: string, field: string) {
  const trimmed = raw.trim();
  const uri = trimmed.startsWith("ipfs://") ? `/ipfs/${trimmed.slice(7)}` : trimmed;
  const segments = uri.split("/");
  if (!IPFS_URI_PATTERN.test(uri) || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`${field} must be an IPFS reference of the form /ipfs/<CID> or /ipfs/<CID>/<path> (no whitespace, "?", "#", "." or ".." segments, or trailing slash), got ${JSON.stringify(raw)}`);
  }
  return uri;
}

/// The Court renders every dispute template through mustache before parsing it
/// (kleros-sdk/src/dataMappings/utils/populateTemplate.ts, master:
/// `mustache.render` → `JSON.parse` → zod). This skill's data mappings are
/// always empty, so any `{{` or `}}` in juror-facing text is at best erased
/// (`{{name}}` → "") and at worst a render error (`{{oops`, `{{#a}}x`) that the
/// Court swallows into an empty case. The template is immutable once the dispute
/// exists, so reject the delimiters outright rather than try to escape them.
export function assertNoMustache(value: unknown, path: string): void {
  if (typeof value === "string") {
    if (value.includes("{{") || value.includes("}}")) {
      throw new Error(`${path} contains "{{" or "}}". The Court renders the template with mustache, so this text would be erased or break the whole case permanently. Rephrase without double braces.`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoMustache(item, `${path}[${index}]`));
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) assertNoMustache(item, path ? `${path}.${key}` : key);
  }
}

const UINT96_MAX = (1n << 96n) - 1n;
const UINT256_MAX = (1n << 256n) - 1n;

/// Decimal-only identifiers. `BigInt("0x10")` is 16 and `BigInt(" 1")` is 1, so
/// BigInt alone would silently accept hex and padding; normalise "01" to "1".
export function parseDecimalId(raw: string, field: string, max: bigint = UINT256_MAX): bigint {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${field} must be a decimal integer (digits only, no 0x hex, sign, or spaces), got ${JSON.stringify(raw)}`);
  }
  const value = BigInt(raw);
  if (value > max) throw new Error(`${field} ${raw} is out of range`);
  return value;
}

export function parseTxHash(raw: string, field: string): Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(`${field} must be a transaction hash: 0x followed by 64 hex characters, got ${JSON.stringify(raw)}`);
  }
  return raw.toLowerCase() as Hex;
}

/// A CID-shaped string proves nothing: an invented one is still CID-shaped, and
/// the gateway answers 4xx for garbage and 5xx/timeout for a CID nobody pinned.
/// Content the Kleros gateway cannot serve is content jurors cannot read, so
/// either outcome is a hard stop — this is the check that catches a fabricated CID.
async function checkIpfsResolves(uri: string, field: string): Promise<Check> {
  const url = `${KLEROS_IPFS_HTTP_GATEWAY}${uri}`;
  let reason = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
      if (response.ok) {
        return {
          name: `${field}-resolves`,
          status: "ok",
          detail: `${url} → HTTP ${response.status}, ${response.headers.get("content-type") ?? "unknown type"}.`,
        };
      }
      reason = `HTTP ${response.status}`;
      if (response.status >= 400 && response.status < 500) break; // malformed CID: retrying cannot help
    } catch (error) {
      reason = (error as Error).name === "TimeoutError" ? "timed out after 25s" : (error as Error).message;
    }
  }
  throw new Error(`${field} ${uri} could not be retrieved from the Kleros IPFS gateway (${reason}). Upload the real file with the kleros-ipfs-upload skill and use the CID it returns; never write a CID you did not receive from an upload. Checked: ${url}`);
}

const evidenceSchema = z.object({
  name: z.string().trim().min(3).max(240),
  description: z.string().trim().max(20_000),
  fileURI: z.string().trim().min(1).optional(),
  fileTypeExtension: z.string().trim().min(1).max(16).optional(),
}).strict();

export function validate(value: unknown, network: Network) {
  const input = schema.parse(value);
  assertNoMustache(input, "");
  input.policyURI = normalizeIpfsUri(input.policyURI, "policyURI");
  input.courtId = parseDecimalId(input.courtId, "courtId", UINT96_MAX).toString();
  if (BigInt(input.courtId) === 0n) throw new Error("courtId 0 is the reserved forking court; pick a real court");
  if (input.numberOfJurors % 2 === 0) throw new Error("numberOfJurors must be odd");
  if (!input.question.endsWith("?")) throw new Error("question must end in ?");
  // Ruling 0 is not merely reserved: the Court renders it as the first choice on
  // every ballot, titled "Refuse to Arbitrate / Invalid". An answer of the same
  // kind is therefore a second refuse option with a different description, which
  // splits that vote and cannot be corrected once the case exists. Seeding the
  // dedupe set with the reserved title makes the collision fall out of the
  // uniqueness check that is already here.
  const titles = new Set<string>([RESERVED_RULING.title.toLocaleLowerCase()]);
  input.answers.forEach((answer, index) => {
    const expected = BigInt(index + 1);
    if (BigInt(answer.id) !== expected) throw new Error(`answers[${index}].id must be 0x${expected.toString(16).padStart(2, "0")}`);
    const title = answer.title.toLocaleLowerCase();
    if (RESERVED_RULING.pattern.test(title)) {
      throw new Error(`answers[${index}] "${answer.title}" repeats ruling 0, which the Court already puts on every ballot as "${RESERVED_RULING.title}". Remove the answer; jurors can always refuse.`);
    }
    if (titles.has(title)) throw new Error("answer titles must be unique");
    titles.add(title);
    answer.id = `0x${expected.toString(16).padStart(2, "0")}`;
  });
  const template = {
    title: input.title,
    description: input.description,
    question: input.question,
    answers: input.answers,
    policyURI: input.policyURI,
    category: input.category,
    lang: input.lang,
    version: input.version,
    arbitratorAddress: getAddress(network.core),
    arbitratorChainID: String(network.chainId),
  };
  assertNoMustache(template, "");
  const warnings: string[] = [];
  if (input.courtId === "1") warnings.push("General Court (1) selected; confirm the court choice.");
  if (!network.production) warnings.push(`${network.label} is a test network: the dispute, its fee, and its ruling have no production value.`);
  return {
    network,
    input,
    template,
    templateJson: JSON.stringify(template),
    extraData: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [BigInt(input.courtId), BigInt(input.numberOfJurors), BigInt(input.disputeKitId)],
    ),
    numberOfRulingOptions: BigInt(input.answers.length),
    warnings,
  };
}

export function networkByAlias(raw: string) {
  const network = NETWORK_ALIASES[raw.trim().toLowerCase()];
  if (!network) throw new Error(`unknown --network "${raw}"; use ${Object.values(NETWORKS).map((n) => n.key).join(" or ")}`);
  return network;
}

/// Resolve the target deployment. With an RPC the chain ID is authoritative, so a
/// case can never be priced on one network and encoded for another.
async function resolveNetwork(requested: string | undefined, rpcUrl?: string): Promise<Network> {
  const asked = requested ? networkByAlias(requested) : undefined;
  if (!rpcUrl) return asked ?? NETWORKS.arbitrum;
  const chainId = await createPublicClient({ transport: http(rpcUrl) }).getChainId();
  const detected = Object.values(NETWORKS).find((n) => n.chainId === chainId);
  if (!detected) {
    throw new Error(`RPC chain ${chainId} has no Kleros V2 deployment in this skill; supported: ${Object.values(NETWORKS).map((n) => `${n.label} (${n.chainId})`).join(", ")}`);
  }
  if (asked && asked.key !== detected.key) throw new Error(`--network ${asked.key} (${asked.chainId}) contradicts the RPC chain ${chainId} (${detected.label})`);
  return detected;
}

function client(network: Network, rpcUrl: string) {
  return createPublicClient({ chain: network.chain, transport: http(rpcUrl) });
}

type Check = { name: string; status: "ok" | "warn" | "fail"; detail: string };

/// True only when the node executed the call and the contract reverted (or had
/// no matching function and returned nothing) — never for transport failures.
export function isContractRevert(error: unknown) {
  if (!(error instanceof BaseError)) return false;
  return error.walk((cause) => cause instanceof ContractFunctionRevertedError || cause instanceof ContractFunctionZeroDataError) !== null;
}

function shortError(error: unknown) {
  const message = error instanceof BaseError ? error.shortMessage : ((error as Error)?.message ?? String(error)).split("\n")[0];
  return message.replace(/\.+$/, "");
}

const EIP1967_IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

/// Read the EvidenceModule proxy's EIP-1967 implementation and compare it with
/// the pinned one. The evidence key this skill derives (_externalDisputeID) is
/// only correct for the pinned implementation; see the NETWORKS comment.
async function readEvidenceModuleImplementation(rpc: PublicClient, network: Network, blockNumber?: bigint) {
  const word = await rpc.getStorageAt({
    address: getAddress(network.evidenceModule),
    slot: EIP1967_IMPLEMENTATION_SLOT,
    ...(blockNumber === undefined ? {} : { blockNumber }),
  });
  if (!word || BigInt(word) === 0n) return null;
  return getAddress(`0x${word.slice(-40)}`);
}

function evidenceModuleMismatch(network: Network, actual: Address | null) {
  return `the ${network.label} EvidenceModule ${getAddress(network.evidenceModule)} now runs implementation ${actual ?? "(none)"}, not the ${network.evidenceModuleImplementation} this skill was verified against. The module was upgraded and the evidence key may have changed (kleros-v2 dev re-keys submitEvidence by the arbitrator dispute ID); evidence prepared here could land on another case permanently. Do not submit through this skill — update the skill first.`;
}

async function checkEvidenceModule(rpc: PublicClient, network: Network): Promise<Check> {
  const actual = await readEvidenceModuleImplementation(rpc, network);
  if (actual !== getAddress(network.evidenceModuleImplementation)) throw new Error(evidenceModuleMismatch(network, actual));
  return {
    name: "evidence-module-implementation",
    status: "ok",
    detail: `EvidenceModule proxy runs the pinned implementation ${actual}; evidence is keyed by _externalDisputeID.`,
  };
}

/// Every read that decides whether createDisputeForTemplate can succeed at all.
/// Blocking failures throw here so no command downstream can quote or prepare a
/// transaction that is already known to revert.
async function verifyDeployment(rpc: PublicClient, network: Network, courtId: string, disputeKitId: number) {
  const core = getAddress(network.core);
  const resolver = getAddress(network.resolver);
  const checks: Check[] = [];

  const [coreCode, resolverCode] = await Promise.all([rpc.getCode({ address: core }), rpc.getCode({ address: resolver })]);
  if (!coreCode || coreCode === "0x") throw new Error(`no bytecode at the allowlisted Kleros Core ${core} on ${network.label}`);
  if (!resolverCode || resolverCode === "0x") throw new Error(`no bytecode at the allowlisted DisputeResolver ${resolver} on ${network.label}`);
  checks.push({ name: "bytecode", status: "ok", detail: `Kleros Core and DisputeResolver are deployed on ${network.label}.` });

  const settled = await Promise.allSettled([
    rpc.readContract({ address: resolver, abi: resolverAbi, functionName: "arbitrator" }),
    rpc.readContract({ address: core, abi: coreAbi, functionName: "courts", args: [BigInt(courtId)] }),
    rpc.readContract({ address: core, abi: coreAbi, functionName: "isSupported", args: [BigInt(courtId), BigInt(disputeKitId)] }),
    rpc.readContract({ address: core, abi: coreAbi, functionName: "arbitrableWhitelist", args: [resolver] }),
  ]);
  const [arbitratorRead, courtRead, kitRead, whitelistRead] = settled;

  if (arbitratorRead.status === "rejected") throw new Error(`DisputeResolver ${resolver} did not answer arbitrator()`);
  if (getAddress(arbitratorRead.value as Address) !== core) {
    throw new Error(`DisputeResolver ${resolver} points at arbitrator ${arbitratorRead.value}, not the allowlisted Kleros Core ${core}`);
  }
  checks.push({ name: "resolver-arbitrator", status: "ok", detail: `DisputeResolver.arbitrator() == ${core}.` });

  if (courtRead.status === "rejected") throw new Error(`court ${courtId} does not exist on ${network.label}`);
  const court = courtRead.value as readonly [bigint, boolean, bigint, bigint, bigint, bigint, boolean];
  if (court[6]) throw new Error(`court ${courtId} is disabled on ${network.label}`);
  checks.push({
    name: "court",
    status: "ok",
    detail: `Court ${courtId} exists, is enabled, feeForJuror ${formatEther(court[4])} ETH, hiddenVotes ${court[1]}.`,
  });

  if (kitRead.status === "rejected" || kitRead.value !== true) {
    throw new Error(`court ${courtId} does not support dispute kit ${disputeKitId} on ${network.label}`);
  }
  checks.push({ name: "dispute-kit", status: "ok", detail: `Court ${courtId} supports dispute kit ${disputeKitId}.` });

  // A transport error (RPC down, rate-limited, timeout) proves nothing about the
  // whitelist, so it fails closed. "Not enforced" is only accepted where the
  // deployment is known to lack the function and the call genuinely reverted.
  if (whitelistRead.status === "rejected") {
    const error = whitelistRead.reason as Error;
    if (network.arbitrableWhitelist === "absent" && isContractRevert(error)) {
      checks.push({ name: "arbitrable-whitelist", status: "ok", detail: `${network.label} Kleros Core has no arbitrableWhitelist (call reverts); no whitelist is enforced.` });
    } else if (network.arbitrableWhitelist === "required") {
      throw new Error(`could not confirm that DisputeResolver ${resolver} is on the ${network.label} Kleros Core arbitrable whitelist (${shortError(error)}); a dispute from a non-whitelisted arbitrable reverts. Retry with a working RPC.`);
    } else {
      throw new Error(`arbitrableWhitelist read on ${network.label} failed for a reason other than a revert (${shortError(error)}); cannot tell whether a whitelist is enforced. Retry with a working RPC.`);
    }
  } else if (whitelistRead.value !== true) {
    throw new Error(`Kleros Core on ${network.label} enforces an arbitrable whitelist and DisputeResolver ${resolver} is not on it`);
  } else {
    checks.push({ name: "arbitrable-whitelist", status: "ok", detail: `DisputeResolver is whitelisted on Kleros Core.` });
  }

  return { checks, hiddenVotes: court[1], feeForJurorWei: court[4] };
}

type QuoteOptions = { network?: string; maxFeeWei?: bigint };

/// `--max-fee` in ETH, validated before any network or IPFS call so a typo can
/// never silently drop the user's cap.
export function parseMaxFee(raw: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(raw)) {
    throw new Error(`--max-fee must be a decimal ETH amount such as 0.01, got ${JSON.stringify(raw)}`);
  }
  return parseEther(raw);
}

async function quote(value: unknown, rpcUrl: string, options: QuoteOptions = {}) {
  const network = await resolveNetwork(options.network, rpcUrl);
  const result = validate(value, network);
  const rpc = client(network, rpcUrl);
  const deployment = await verifyDeployment(rpc, network, result.input.courtId, result.input.disputeKitId);
  deployment.checks.push(await checkIpfsResolves(result.input.policyURI, "policyURI"));
  const [valueWei, blockNumber] = await Promise.all([
    rpc.readContract({ address: getAddress(network.core), abi: coreAbi, functionName: "arbitrationCost", args: [result.extraData] }),
    rpc.getBlockNumber(),
  ]);
  if (options.maxFeeWei !== undefined && valueWei > options.maxFeeWei) {
    throw new Error(`arbitration fee ${formatEther(valueWei)} ETH exceeds --max-fee ${formatEther(options.maxFeeWei)} ETH`);
  }
  const quotedAt = new Date();
  return {
    network,
    result,
    checks: deployment.checks,
    hiddenVotes: deployment.hiddenVotes,
    valueWei,
    blockNumber,
    quotedAt: quotedAt.toISOString(),
    expiresAt: new Date(quotedAt.getTime() + QUOTE_TTL_MS).toISOString(),
  };
}

async function prepare(value: unknown, rpcUrl: string, options: QuoteOptions = {}) {
  const priced = await quote(value, rpcUrl, options);
  const args = [priced.result.extraData, priced.result.templateJson, "", priced.result.numberOfRulingOptions] as const;
  return {
    priced,
    chainId: priced.network.chainId,
    to: getAddress(priced.network.resolver),
    value: priced.valueWei,
    data: encodeFunctionData({ abi: resolverAbi, functionName: "createDisputeForTemplate", args }),
    decoded: {
      arbitratorExtraData: args[0],
      disputeTemplate: priced.result.template,
      disputeTemplateDataMappings: "",
      numberOfRulingOptions: args[3],
    },
    quote: { blockNumber: priced.blockNumber, quotedAt: priced.quotedAt, expiresAt: priced.expiresAt },
    warnings: priced.result.warnings,
  };
}

function networkSummary(network: Network) {
  return {
    key: network.key,
    label: network.label,
    chainId: network.chainId,
    production: network.production,
    arbitrator: getAddress(network.core),
    resolver: getAddress(network.resolver),
    appUrl: network.app,
    explorerUrl: network.explorer,
  };
}

const courtUrl = (network: Network, courtId: string) => `${network.app}/#/courts/${courtId}`;
const caseUrl = (network: Network, disputeId: bigint | string) => `${network.app}/#/cases/${disputeId}`;

async function preflight(value: unknown, rpcUrl: string, options: QuoteOptions & { from?: Address } = {}) {
  const prepared = await prepare(value, rpcUrl, options);
  const { network, result: validated } = prepared.priced;
  const from = options.from;
  const blocking: string[] = [];
  const warnings = [...prepared.warnings];
  const checks = [...prepared.priced.checks];

  // Creating the case does not touch the EvidenceModule, but this skill's
  // evidence step will refuse to run if the module has been upgraded. Surface
  // that before money is spent, without blocking creation itself.
  try {
    checks.push(await checkEvidenceModule(client(network, rpcUrl), network));
  } catch (error) {
    const detail = `${shortError(error)}`;
    checks.push({ name: "evidence-module-implementation", status: "warn", detail });
    warnings.push(`Evidence for this case cannot be submitted through this skill until it is updated: ${detail}`);
  }

  let networkFee:
    | {
        available: true;
        estimatedGas: bigint;
        gasPriceWei: bigint;
        estimatedFeeWei: bigint;
        estimatedFeeEth: string;
        estimatedTotalWei: bigint;
        estimatedTotalEth: string;
        balanceWei: bigint;
        balanceEth: string;
        sufficientBalance: boolean;
        from: Address;
        warning: string;
      }
    | { available: false; reason: string };

  if (from) {
    const rpc = client(network, rpcUrl);
    const callArgs = [
      prepared.decoded.arbitratorExtraData,
      prepared.priced.result.templateJson,
      "",
      prepared.decoded.numberOfRulingOptions,
    ] as const;
    const [gasResult, gasPriceWei, balanceWei] = await Promise.all([
      rpc.estimateContractGas({
        account: from,
        address: getAddress(network.resolver),
        abi: resolverAbi,
        functionName: "createDisputeForTemplate",
        args: callArgs,
        value: prepared.value,
      }).then((gas) => ({ gas }), (error: Error) => ({ error })),
      rpc.getGasPrice(),
      rpc.getBalance({ address: from }),
    ]);
    if ("error" in gasResult) {
      networkFee = {
        available: false,
        reason: `gas estimation from ${from} failed (balance ${formatEther(balanceWei)} ETH, fee ${formatEther(prepared.value)} ETH): ${shortError(gasResult.error)}`,
      };
      blocking.push(`The transaction would fail from ${from}: ${networkFee.reason}. Do not sign; fix the cause and re-run preflight.`);
    } else {
      const estimatedFeeWei = gasResult.gas * gasPriceWei;
      const estimatedTotalWei = prepared.value + estimatedFeeWei;
      networkFee = {
        available: true,
        estimatedGas: gasResult.gas,
        gasPriceWei,
        estimatedFeeWei,
        estimatedFeeEth: formatEther(estimatedFeeWei),
        estimatedTotalWei,
        estimatedTotalEth: formatEther(estimatedTotalWei),
        balanceWei,
        balanceEth: formatEther(balanceWei),
        sufficientBalance: balanceWei >= estimatedTotalWei,
        from,
        warning: "Gas and total are estimates, not spending guarantees; the wallet must re-estimate before signing.",
      };
      if (!networkFee.sufficientBalance) {
        blocking.push(`${from} holds ${networkFee.balanceEth} ETH, less than the estimated total ${networkFee.estimatedTotalEth} ETH. Do not sign until the wallet is funded; then re-run preflight.`);
      }
    }
  } else {
    networkFee = {
      available: false,
      reason: "Pass --from <wallet-address> to estimate network gas, balance, and total cost without submitting.",
    };
  }

  warnings.push(...blocking);
  return {
    kind: "kleros-v2-dispute-preflight",
    ok: blocking.length === 0,
    blocking,
    status: "REVIEW_ONLY_NOT_SUBMITTED",
    network: networkSummary(network),
    checks,
    case: {
      schemaVersion: validated.input.schemaVersion,
      title: validated.input.title,
      description: validated.input.description,
      jurorQuestion: validated.input.question,
      category: validated.input.category,
      language: validated.input.lang,
      templateVersion: validated.input.version,
      // Render the complete ballot: ruling 0 first, followed by template answers
      // identified by the ruling IDs used on chain.
      ballot: [
        { ruling: RESERVED_RULING.id, title: RESERVED_RULING.title, description: RESERVED_RULING.description, reserved: true },
        ...validated.input.answers.map((answer) => ({
          ruling: answer.id,
          title: answer.title,
          description: answer.description,
          reserved: false,
        })),
      ],
      numberOfRulingOptions: validated.numberOfRulingOptions,
    },
    policy: {
      protocolUri: validated.input.policyURI,
      openableUrl: `${KLEROS_IPFS_HTTP_GATEWAY}${validated.input.policyURI}`,
      initialEvidence: "Not included: createDisputeForTemplate creates the case; evidence is submitted after creation.",
    },
    arbitration: {
      network: network.label,
      chainId: network.chainId,
      courtId: validated.input.courtId,
      courtUrl: courtUrl(network, validated.input.courtId),
      jurorsToDrawInitially: validated.input.numberOfJurors,
      hiddenVotes: prepared.priced.hiddenVotes,
      disputeKitId: validated.input.disputeKitId,
      disputeKit: "Classic (ID 1)",
      arbitrator: getAddress(network.core),
      resolver: getAddress(network.resolver),
      extraData: validated.extraData,
    },
    price: {
      arbitrationFeeWei: prepared.value,
      arbitrationFeeEth: formatEther(prepared.value),
      networkFee,
      quoteBlock: prepared.quote.blockNumber,
      quotedAt: prepared.quote.quotedAt,
      expiresAt: prepared.quote.expiresAt,
    },
    transaction: {
      chainId: network.chainId,
      to: prepared.to,
      valueWei: prepared.value,
      valueEth: formatEther(prepared.value),
      functionName: "createDisputeForTemplate",
      calldata: prepared.data,
      decodedArguments: prepared.decoded,
    },
    warnings,
    nextStep: blocking.length === 0
      ? "Review every field. A separate explicit approval is required before any signature or broadcast."
      : "BLOCKED: do not ask for approval or sign. Resolve every blocking item and re-run preflight.",
  };
}

type Preflight = Awaited<ReturnType<typeof preflight>>;

function formatHumanPreflight(review: Preflight) {
  const lines = [
    "KLEROS V2 DISPUTE PREFLIGHT — REVIEW ONLY",
    "Nothing was uploaded, signed, or submitted by this command.",
    "",
    ...(review.blocking.length > 0
      ? ["!!! BLOCKED — DO NOT SIGN OR BROADCAST !!!", ...review.blocking.map((item) => `!!! ${item}`), ""]
      : []),
    "NETWORK",
    `Target: ${review.network.label} (chain ${review.network.chainId})${review.network.production ? "" : " — TEST NETWORK"}`,
    `Kleros V2 app: ${review.network.appUrl}`,
    "",
    "PREFLIGHT CHECKS",
    ...review.checks.map((check) => `[${check.status.toUpperCase()}] ${check.name}: ${check.detail}`),
    "",
    "CASE",
    `Title: ${review.case.title}`,
    `Description: ${review.case.description}`,
    `Juror question: ${review.case.jurorQuestion}`,
    `Category: ${review.case.category}`,
    `Language: ${review.case.language}`,
    `Schema / template version: ${review.case.schemaVersion} / ${review.case.templateVersion}`,
    "",
    `JUROR BALLOT (${review.case.ballot.length} choices: ruling 0 plus ${review.case.numberOfRulingOptions.toString()} template answers)`,
  ];
  for (const option of review.case.ballot) {
    lines.push(`[ruling ${option.ruling}] ${option.title}${option.reserved ? "  — reserved by the protocol, not from this template" : ""}`);
    lines.push(`   ${option.description}`);
  }
  lines.push(
    "",
    "POLICY AND EVIDENCE",
    `Policy URI: ${review.policy.protocolUri}`,
    `Open policy: ${review.policy.openableUrl}`,
    `Initial evidence: ${review.policy.initialEvidence}`,
    "",
    "ARBITRATION SETUP",
    `Court: ID ${review.arbitration.courtId} — ${review.arbitration.courtUrl}`,
    `Jurors to draw initially: ${review.arbitration.jurorsToDrawInitially}`,
    `Hidden votes (commit-reveal): ${review.arbitration.hiddenVotes}`,
    `Dispute kit: ${review.arbitration.disputeKit}`,
    `Kleros Core: ${review.arbitration.arbitrator}`,
    `DisputeResolver: ${review.arbitration.resolver}`,
    `Encoded extra data: ${review.arbitration.extraData}`,
    "",
    "LIVE PRICE",
    `Arbitration fee: ${review.price.arbitrationFeeEth} ETH (${review.price.arbitrationFeeWei.toString()} wei)`,
  );
  if (review.price.networkFee.available) {
    const fee = review.price.networkFee;
    lines.push(
      `Estimated network fee: ${fee.estimatedFeeEth} ETH (${fee.estimatedFeeWei.toString()} wei)`,
      `Estimated total: ${fee.estimatedTotalEth} ETH (${fee.estimatedTotalWei.toString()} wei)`,
      `Gas estimate / gas price: ${fee.estimatedGas.toString()} / ${fee.gasPriceWei.toString()} wei`,
      `Estimate account: ${fee.from}`,
      `Account balance: ${fee.balanceEth} ETH — ${fee.sufficientBalance ? "covers the estimated total" : "DOES NOT cover the estimated total"}`,
      `Price warning: ${fee.warning}`,
    );
  } else {
    lines.push(`Estimated network fee: unavailable — ${review.price.networkFee.reason}`);
    lines.push("Estimated total: unavailable until network gas is estimated.");
  }
  lines.push(
    `Quote block: ${review.price.quoteBlock.toString()}`,
    `Quoted at: ${review.price.quotedAt}`,
    `Quote expires at: ${review.price.expiresAt}`,
    "",
    "PREPARED TRANSACTION",
    `Chain ID: ${review.transaction.chainId}`,
    `To: ${review.transaction.to}`,
    `Function: ${review.transaction.functionName}`,
    `Native value: ${review.transaction.valueEth} ETH (${review.transaction.valueWei.toString()} wei)`,
    `Calldata: ${review.transaction.calldata}`,
  );
  const otherWarnings = review.warnings.filter((warning) => !review.blocking.includes(warning));
  if (otherWarnings.length > 0) lines.push("", "WARNINGS", ...otherWarnings.map((warning) => `- ${warning}`));
  if (review.blocking.length > 0) lines.push("", "BLOCKING (resolve before any approval)", ...review.blocking.map((item) => `- ${item}`));
  lines.push("", `STATUS: ${review.status}${review.ok ? "" : " — BLOCKED"}`, review.nextStep);
  return lines.join("\n");
}

/// Both IDs appear together in exactly one place: the DisputeRequest event the
/// arbitrable emits when the dispute is created. Reading it is the only way to
/// learn an evidence group without assuming something about it.
function decodeDisputeRequests(network: Network, logs: readonly Log[]) {
  const resolver = getAddress(network.resolver);
  const requests: { disputeId: bigint; evidenceGroupId: bigint }[] = [];
  for (const log of logs) {
    if (getAddress(log.address) !== resolver) continue;
    try {
      const event = decodeEventLog({ abi: resolverAbi, data: log.data, topics: log.topics });
      if (event.eventName !== "DisputeRequest") continue;
      const args = event.args as { _arbitratorDisputeID: bigint; _externalDisputeID: bigint };
      requests.push({ disputeId: args._arbitratorDisputeID, evidenceGroupId: args._externalDisputeID });
    } catch {
      // Not a DisputeRequest log from this ABI — ignore.
    }
  }
  return requests;
}

/// The evidence group of a dispute created through this skill, from the
/// resolver's own mapping. Only meaningful once the dispute is known to belong
/// to that resolver — the mapping answers 0 for every ID it has never seen.
async function evidenceGroupOf(rpc: PublicClient, network: Network, disputeId: bigint): Promise<bigint> {
  return await rpc.readContract({
    address: getAddress(network.resolver),
    abi: resolverAbi,
    functionName: "arbitratorDisputeIDToLocalID",
    args: [disputeId],
  }) as bigint;
}

/// Prepare an evidence submission for an existing dispute. Two things decide
/// whether jurors ever see it. The Evidence event carries a *stringified JSON
/// object* — a bare IPFS URI is not evidence and renders as an unreadable raw
/// string. And it is keyed by the dispute's evidence group, which is derived
/// here from the chain and never taken on trust from the caller. See
/// contracts/specifications/evidence-format.md upstream.
async function prepareEvidence(
  value: unknown,
  target: { disputeId?: bigint; creationTx?: Hex; claimedEvidenceGroup?: bigint },
  rpcUrl: string,
  requested?: string,
) {
  const network = await resolveNetwork(requested, rpcUrl);
  const rpc = client(network, rpcUrl);
  const input = evidenceSchema.parse(value);
  const checks: Check[] = [];
  const warnings: string[] = [];
  // Refuses (throws) unless the EvidenceModule still runs the pinned
  // implementation whose key semantics the rest of this function assumes.
  checks.push(await checkEvidenceModule(rpc, network));

  if (input.fileURI !== undefined) {
    input.fileURI = normalizeIpfsUri(input.fileURI, "fileURI");
    checks.push(await checkIpfsResolves(input.fileURI, "fileURI"));
  }

  const sources: string[] = [];
  let fromEvent: { disputeId: bigint; evidenceGroupId: bigint } | undefined;
  if (target.creationTx) {
    const created = decodeDisputeRequests(network, (await rpc.getTransactionReceipt({ hash: target.creationTx })).logs);
    if (created.length === 0) {
      throw new Error(`${target.creationTx} emits no DisputeRequest from the DisputeResolver on ${network.label}; it did not create a dispute for this deployment`);
    }
    const matching = target.disputeId === undefined ? created : created.filter((one) => one.disputeId === target.disputeId);
    if (matching.length === 0) {
      throw new Error(`${target.creationTx} created dispute ${created.map((one) => one.disputeId).join(", ")}, not ${target.disputeId} — the transaction and the case ID disagree`);
    }
    if (matching.length > 1) {
      throw new Error(`${target.creationTx} created ${matching.length} disputes; add --dispute <id> to say which one this evidence belongs to`);
    }
    fromEvent = matching[0];
    sources.push(`the DisputeRequest event in ${target.creationTx}`);
  }

  const disputeId = fromEvent?.disputeId ?? target.disputeId;
  if (disputeId === undefined) throw new Error("evidence needs --dispute <court case id>, --creation-tx <hash>, or both");

  let dispute: readonly [bigint, Address, number, boolean, bigint];
  try {
    dispute = await rpc.readContract({
      address: getAddress(network.core), abi: coreAbi, functionName: "disputes", args: [disputeId],
    }) as readonly [bigint, Address, number, boolean, bigint];
  } catch {
    throw new Error(`dispute ${disputeId} does not exist on ${network.label} — check the ID and the network`);
  }
  const [courtID, arbitrated, period, ruled] = dispute;
  if (ruled) throw new Error(`dispute ${disputeId} is already ruled on ${network.label}; evidence can no longer affect it`);
  const periodName = PERIODS[period] ?? String(period);
  checks.push({
    name: "dispute",
    status: "ok",
    detail: `Dispute ${disputeId} exists on ${network.label}: court ${courtID}, period "${periodName}", arbitrable ${getAddress(arbitrated)}.`,
  });

  // Two independent readings of the same fact. Either one alone is enough; when
  // both are available they must agree, and a disagreement stops the run.
  const ownResolver = getAddress(arbitrated) === getAddress(network.resolver);
  const fromResolver = ownResolver ? await evidenceGroupOf(rpc, network, disputeId) : undefined;
  if (fromResolver !== undefined) sources.push("DisputeResolver.arbitratorDisputeIDToLocalID");
  if (fromEvent && fromResolver !== undefined && fromEvent.evidenceGroupId !== fromResolver) {
    throw new Error(`the creation transaction and the DisputeResolver disagree about the evidence group of dispute ${disputeId} (${fromEvent.evidenceGroupId} vs ${fromResolver}); do not submit until that is explained`);
  }
  const evidenceGroupId = fromEvent?.evidenceGroupId ?? fromResolver;
  if (evidenceGroupId === undefined) {
    throw new Error(`dispute ${disputeId} belongs to arbitrable ${getAddress(arbitrated)}, not this skill's DisputeResolver, so its evidence group cannot be derived here — re-run with --creation-tx <hash of that dispute's creation> to read it from the DisputeRequest event`);
  }
  if (target.claimedEvidenceGroup !== undefined && target.claimedEvidenceGroup !== evidenceGroupId) {
    throw new Error(`--evidence-group ${target.claimedEvidenceGroup} contradicts the chain, which keys dispute ${disputeId} to evidence group ${evidenceGroupId}`);
  }
  checks.push({
    name: "evidence-group",
    status: "ok",
    detail: `Dispute ${disputeId} is keyed to evidence group ${evidenceGroupId}, read from ${sources.join(" and ")}${evidenceGroupId === disputeId ? " — equal here by coincidence, never by rule" : ""}.`,
  });

  if (periodName !== "evidence") {
    warnings.push(`Dispute ${disputeId} is in the "${periodName}" period, not "evidence". The submission is still recorded on chain, but jurors may already have voted.`);
  }
  if (!ownResolver) {
    warnings.push(`Dispute ${disputeId} belongs to arbitrable ${getAddress(arbitrated)}, not this skill's DisputeResolver. Confirm you are submitting to the right case.`);
  }
  if (!network.production) warnings.push(`${network.label} is a test network.`);

  const evidenceJson = JSON.stringify(input);
  return {
    kind: "kleros-v2-evidence-preflight",
    ok: true,
    blocking: [] as string[],
    status: "REVIEW_ONLY_NOT_SUBMITTED",
    network: networkSummary(network),
    checks,
    disputeId: disputeId.toString(),
    evidenceGroupId: evidenceGroupId.toString(),
    caseUrl: caseUrl(network, disputeId),
    period: periodName,
    evidence: input,
    evidenceString: evidenceJson,
    transaction: {
      chainId: network.chainId,
      to: getAddress(network.evidenceModule),
      valueWei: 0n,
      functionName: "submitEvidence",
      calldata: encodeFunctionData({ abi: evidenceAbi, functionName: "submitEvidence", args: [evidenceGroupId, evidenceJson] }),
      decodedArguments: { externalDisputeID: evidenceGroupId, evidence: evidenceJson },
    },
    warnings,
    nextStep: `Review the rendered name, description, and fileURI. A separate explicit approval is required before any signature or broadcast. Once it confirms, run \`receipt --tx <evidence hash> --dispute ${disputeId}\` to prove the Evidence event carries evidence group ${evidenceGroupId}, then reload the case Evidence tab — a confirmed transaction is not yet visible evidence.`,
  };
}

/// Turn a confirmed transaction into the IDs it produced, without the caller
/// having to know a topic. Reads only — safe to re-run. With `--dispute`, this
/// is also the verification step for an evidence submission: it says whether the
/// Evidence events are keyed to the group that case actually indexes.
async function receipt(hash: Hex, rpcUrl: string, requested?: string, expectDisputeId?: bigint) {
  const network = await resolveNetwork(requested, rpcUrl);
  const core = getAddress(network.core);
  const resolver = getAddress(network.resolver);
  const evidenceModule = getAddress(network.evidenceModule);
  const rpc = client(network, rpcUrl);
  const transactionReceipt = await rpc.getTransactionReceipt({ hash });

  let expected: { disputeId: bigint; evidenceGroupId: bigint } | undefined;
  if (expectDisputeId !== undefined) {
    const [, arbitrated] = await rpc.readContract({
      address: core, abi: coreAbi, functionName: "disputes", args: [expectDisputeId],
    }) as readonly [bigint, Address, number, boolean, bigint];
    if (getAddress(arbitrated) !== resolver) {
      throw new Error(`dispute ${expectDisputeId} belongs to arbitrable ${getAddress(arbitrated)}, not this skill's DisputeResolver, so its evidence group cannot be derived here`);
    }
    expected = { disputeId: expectDisputeId, evidenceGroupId: await evidenceGroupOf(rpc, network, expectDisputeId) };
  }

  // The creation transaction states both IDs itself; an evidence transaction
  // states only the key, so its case is resolved through --dispute or not at all.
  const requests = decodeDisputeRequests(network, transactionReceipt.logs);
  const groupOfDispute = new Map(requests.map((one) => [one.disputeId, one.evidenceGroupId]));
  const disputeOfGroup = new Map(requests.map((one) => [one.evidenceGroupId, one.disputeId]));

  const disputes: { disputeId: string; evidenceGroupId: string | null; arbitrable: Address; viaAllowlistedResolver: boolean; caseUrl: string }[] = [];
  const evidence: { evidenceGroupId: string; disputeId: string | null; keyedToExpectedDispute: boolean | null; party: Address; evidence: string; parsed: unknown | null; caseUrl: string | null }[] = [];
  for (const log of transactionReceipt.logs) {
    if (getAddress(log.address) === evidenceModule) {
      try {
        const event = decodeEventLog({ abi: evidenceAbi, data: log.data, topics: log.topics });
        if (event.eventName !== "Evidence") continue;
        const args = event.args as { _externalDisputeID: bigint; _party: Address; _evidence: string };
        let parsed: unknown | null = null;
        try { parsed = JSON.parse(args._evidence); } catch { parsed = null; }
        const group = args._externalDisputeID;
        const disputeId = disputeOfGroup.get(group)
          ?? (expected && expected.evidenceGroupId === group ? expected.disputeId : undefined);
        evidence.push({
          evidenceGroupId: group.toString(),
          disputeId: disputeId === undefined ? null : disputeId.toString(),
          keyedToExpectedDispute: expected ? group === expected.evidenceGroupId : null,
          party: getAddress(args._party),
          evidence: args._evidence,
          parsed,
          caseUrl: disputeId === undefined ? null : caseUrl(network, disputeId),
        });
      } catch {
        // Not an Evidence log from this ABI — ignore.
      }
      continue;
    }
    if (getAddress(log.address) !== core) continue;
    try {
      const event = decodeEventLog({ abi: coreAbi, data: log.data, topics: log.topics });
      if (event.eventName !== "DisputeCreation") continue;
      const disputeId = (event.args as { _disputeID: bigint })._disputeID;
      const arbitrable = getAddress((event.args as { _arbitrable: Address })._arbitrable);
      disputes.push({
        disputeId: disputeId.toString(),
        evidenceGroupId: groupOfDispute.get(disputeId)?.toString() ?? null,
        arbitrable,
        viaAllowlistedResolver: arbitrable === resolver,
        caseUrl: caseUrl(network, disputeId),
      });
    } catch {
      // Not a DisputeCreation log from this ABI — ignore.
    }
  }

  const blocking: string[] = [];
  const warnings: string[] = [];
  if (transactionReceipt.status !== "success") {
    blocking.push(`Transaction ${hash} REVERTED: nothing was created or submitted. Do not report success.`);
  }
  if (transactionReceipt.status === "success" && disputes.length === 0 && evidence.length === 0) {
    blocking.push(`Transaction ${hash} emitted no DisputeCreation from Kleros Core and no Evidence from the EvidenceModule on ${network.label}; it is not a dispute creation or evidence submission for this deployment.`);
  }
  if (expected && evidence.length === 0) {
    blocking.push(`--dispute ${expected.disputeId} asks to verify evidence, but ${hash} contains no Evidence event from the EvidenceModule.`);
  }
  if (expected && evidence.some((item) => !item.keyedToExpectedDispute)) {
    blocking.push(`MIS-KEYED evidence: dispute ${expected.disputeId} indexes evidence group ${expected.evidenceGroupId}, and at least one Evidence event uses a different key. It will never appear on the case; resubmit against the correct group.`);
  }
  if (evidence.some((item) => item.parsed === null || typeof item.parsed !== "object")) {
    blocking.push("An Evidence event is not a JSON object; jurors will see a raw string instead of a title and description. Resubmit as a JSON object.");
  }

  // The decoding above assumes the pinned EvidenceModule implementation. Check
  // it as of the transaction's block (falling back to latest if the RPC has no
  // historical state) whenever the evidence key is being relied on.
  let evidenceModuleCheck: Check | null = null;
  if (evidence.length > 0 || expected) {
    let actual: Address | null;
    let at = `block ${transactionReceipt.blockNumber}`;
    try {
      actual = await readEvidenceModuleImplementation(rpc, network, transactionReceipt.blockNumber);
    } catch {
      actual = await readEvidenceModuleImplementation(rpc, network);
      at = "latest block (historical state unavailable on this RPC)";
    }
    if (actual !== getAddress(network.evidenceModuleImplementation)) {
      blocking.push(`At ${at}: ${evidenceModuleMismatch(network, actual)}`);
      evidenceModuleCheck = { name: "evidence-module-implementation", status: "fail", detail: `${actual ?? "(none)"} at ${at}` };
    } else {
      evidenceModuleCheck = { name: "evidence-module-implementation", status: "ok", detail: `Pinned implementation ${actual} at ${at}.` };
    }
  }
  warnings.push(...blocking);

  return {
    kind: "kleros-v2-dispute-receipt",
    ok: blocking.length === 0,
    blocking,
    warnings,
    checks: evidenceModuleCheck ? [evidenceModuleCheck] : [],
    network: networkSummary(network),
    transactionHash: hash,
    transactionUrl: `${network.explorer}/tx/${hash}`,
    status: transactionReceipt.status,
    blockNumber: transactionReceipt.blockNumber,
    gasUsed: transactionReceipt.gasUsed,
    to: transactionReceipt.to ? getAddress(transactionReceipt.to) : null,
    sentToAllowlistedResolver: transactionReceipt.to ? getAddress(transactionReceipt.to) === resolver : false,
    disputes,
    evidence,
    expected: expected
      ? { disputeId: expected.disputeId.toString(), evidenceGroupId: expected.evidenceGroupId.toString() }
      : null,
    note: [
      disputes.length === 0
        ? "No DisputeCreation event from Kleros Core in this transaction."
        : "Dispute ID read from the Kleros Core DisputeCreation event; evidence group read from the DisputeResolver DisputeRequest event in the same transaction.",
      evidence.length === 0
        ? null
        : evidence.some((item) => item.parsed === null)
          ? "WARNING: an Evidence event is not a JSON object. Jurors will see the raw string instead of a title and description."
          : "Evidence events decoded as JSON objects.",
      evidence.length === 0 || !expected
        ? null
        : evidence.every((item) => item.keyedToExpectedDispute)
          ? `Every Evidence event is keyed to evidence group ${expected.evidenceGroupId}, which is the group dispute ${expected.disputeId} indexes.`
          : `MIS-KEYED: dispute ${expected.disputeId} indexes evidence group ${expected.evidenceGroupId}, and at least one Evidence event here uses a different key. That evidence will never appear on the case and cannot be removed; resubmit against the correct group.`,
      evidence.length === 0
        ? null
        : "A confirmed transaction is not visible evidence. Confirm the case's Evidence tab renders it before reporting success.",
    ].filter(Boolean).join(" "),
  };
}

const USAGE = `usage: prepare-dispute.ts <command> [flags]

commands:
  validate   --case <file> [--network <name>]
  quote      --case <file> --rpc-url <url> [--network <name>] [--max-fee <eth>]
  preflight  --case <file> --rpc-url <url> [--network <name>] [--max-fee <eth>] [--from <address>] [--human]
  prepare    --case <file> --rpc-url <url> [--network <name>] [--max-fee <eth>]
  simulate   --case <file> --rpc-url <url> --from <address> [--network <name>] [--max-fee <eth>]
  evidence   --evidence <file> --rpc-url <url> (--dispute <id> | --creation-tx <hash>) [--network <name>] [--evidence-group <id>]
  receipt    --tx <hash> --rpc-url <url> [--network <name>] [--dispute <id>]

networks: ${Object.values(NETWORKS).map((n) => `${n.key} (${n.chainId})`).join(", ")}
The RPC chain ID is authoritative; --network is an optional assertion against it.`;

/// Per-command flag allowlist. Every flag either takes exactly one value or is
/// a boolean switch; anything else is an error, so a misspelt or valueless
/// safety flag (`--maxfee`, a bare `--max-fee`) can never be silently ignored.
export const COMMAND_FLAGS: Record<string, { value: readonly string[]; boolean: readonly string[]; required: readonly string[] }> = {
  validate: { value: ["--case", "--network"], boolean: [], required: ["--case"] },
  quote: { value: ["--case", "--rpc-url", "--network", "--max-fee"], boolean: [], required: ["--case", "--rpc-url"] },
  preflight: { value: ["--case", "--rpc-url", "--network", "--max-fee", "--from"], boolean: ["--human"], required: ["--case", "--rpc-url"] },
  prepare: { value: ["--case", "--rpc-url", "--network", "--max-fee"], boolean: [], required: ["--case", "--rpc-url"] },
  simulate: { value: ["--case", "--rpc-url", "--network", "--max-fee", "--from"], boolean: [], required: ["--case", "--rpc-url", "--from"] },
  evidence: { value: ["--evidence", "--rpc-url", "--network", "--dispute", "--creation-tx", "--evidence-group"], boolean: [], required: ["--evidence", "--rpc-url"] },
  receipt: { value: ["--tx", "--rpc-url", "--network", "--dispute"], boolean: [], required: ["--tx", "--rpc-url"] },
};

export function parseArgs(command: string | undefined, tokens: readonly string[]) {
  const spec = command === undefined ? undefined : COMMAND_FLAGS[command];
  if (!spec) throw new Error(`unknown command: ${command ?? "(none)"}\n\n${USAGE}`);
  const args = new Map<string, string | true>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) throw new Error(`unexpected argument ${JSON.stringify(token)} for ${command}\n\n${USAGE}`);
    const eq = token.indexOf("=");
    const name = eq === -1 ? token : token.slice(0, eq);
    if (args.has(name)) throw new Error(`${name} given more than once`);
    if (spec.boolean.includes(name)) {
      if (eq !== -1) throw new Error(`${name} is a switch and takes no value`);
      args.set(name, true);
    } else if (spec.value.includes(name)) {
      const value = eq === -1 ? tokens[index + 1] : token.slice(eq + 1);
      if (value === undefined || value === "" || (eq === -1 && value.startsWith("--"))) {
        throw new Error(`${name} needs a value`);
      }
      args.set(name, value);
      if (eq === -1) index += 1;
    } else {
      const allowed = [...spec.value, ...spec.boolean].join(", ");
      throw new Error(`unknown flag ${name} for ${command}; allowed: ${allowed}`);
    }
  }
  for (const name of spec.required) {
    if (!args.has(name)) throw new Error(`${name} is required for ${command}\n\n${USAGE}`);
  }
  return args;
}

/// Everything that can be checked without the network, checked before the
/// network: a bad flag must fail in milliseconds, not after RPC and IPFS calls.
export function parseCommandLine(argv: readonly string[]) {
  const [command, ...tokens] = argv;
  const args = parseArgs(command, tokens);
  const get = (name: string) => {
    const value = args.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const rpcUrl = get("--rpc-url");
  if (rpcUrl !== undefined) {
    let protocol = "";
    try { protocol = new URL(rpcUrl).protocol; } catch { /* reported below */ }
    if (protocol !== "http:" && protocol !== "https:") throw new Error("--rpc-url must be an http(s) URL");
  }
  const network = get("--network");
  if (network !== undefined) networkByAlias(network);
  const from = get("--from");
  if (from !== undefined && !isAddress(from, { strict: true })) {
    throw new Error(`--from must be a 0x-prefixed 20-byte address with a valid checksum (or all lowercase), got ${JSON.stringify(from)}`);
  }
  const maxFee = get("--max-fee");
  const dispute = get("--dispute");
  const group = get("--evidence-group");
  const tx = get("--tx");
  const creationTx = get("--creation-tx");
  return {
    command: command as string,
    human: args.get("--human") === true,
    casePath: get("--case"),
    evidencePath: get("--evidence"),
    rpcUrl,
    network,
    from: from === undefined ? undefined : getAddress(from),
    maxFeeWei: maxFee === undefined ? undefined : parseMaxFee(maxFee),
    disputeId: dispute === undefined ? undefined : parseDecimalId(dispute, "--dispute"),
    evidenceGroup: group === undefined ? undefined : parseDecimalId(group, "--evidence-group"),
    tx: tx === undefined ? undefined : parseTxHash(tx, "--tx"),
    creationTx: creationTx === undefined ? undefined : parseTxHash(creationTx, "--creation-tx"),
  };
}

async function main(argv: readonly string[]) {
  const cli = parseCommandLine(argv);
  const { command } = cli;
  const rpcUrl = cli.rpcUrl as string;
  const quoteOptions: QuoteOptions = { network: cli.network, maxFeeWei: cli.maxFeeWei };
  const readCase = async () => JSON.parse(await readFile(cli.casePath as string, "utf8")) as unknown;

  let output: { ok: boolean; blocking: string[] } & Record<string, unknown>;
  if (command === "validate") {
    const network = await resolveNetwork(cli.network);
    const result = validate(await readCase(), network);
    output = {
      ok: true,
      blocking: [],
      valid: true,
      network: networkSummary(network),
      template: result.template,
      extraData: result.extraData,
      numberOfRulingOptions: result.numberOfRulingOptions,
      warnings: result.warnings,
    };
  } else if (command === "quote") {
    const priced = await quote(await readCase(), rpcUrl, quoteOptions);
    output = {
      ok: true,
      blocking: [],
      network: networkSummary(priced.network),
      checks: priced.checks,
      valueWei: priced.valueWei,
      valueEth: formatEther(priced.valueWei),
      blockNumber: priced.blockNumber,
      quotedAt: priced.quotedAt,
      expiresAt: priced.expiresAt,
      warnings: priced.result.warnings,
    };
  } else if (command === "prepare") {
    const prepared = await prepare(await readCase(), rpcUrl, quoteOptions);
    const { priced, ...rest } = prepared;
    output = { ok: true, blocking: [], network: networkSummary(priced.network), checks: priced.checks, ...rest };
  } else if (command === "preflight") {
    const review = await preflight(await readCase(), rpcUrl, { ...quoteOptions, from: cli.from });
    if (cli.human) {
      console.log(formatHumanPreflight(review));
      return review.ok ? 0 : 2;
    }
    output = review;
  } else if (command === "simulate") {
    const prepared = await prepare(await readCase(), rpcUrl, quoteOptions);
    const { priced, ...rest } = prepared;
    const blocking: string[] = [];
    let simulation: { nextDisputeId: bigint; caseUrlIfCreated: string } | { reverted: true; reason: string };
    try {
      const simulated = await client(priced.network, rpcUrl).simulateContract({
        account: cli.from as Address,
        address: getAddress(priced.network.resolver),
        abi: resolverAbi,
        functionName: "createDisputeForTemplate",
        args: [prepared.decoded.arbitratorExtraData, priced.result.templateJson, "", prepared.decoded.numberOfRulingOptions],
        value: prepared.value,
      });
      simulation = { nextDisputeId: simulated.result, caseUrlIfCreated: caseUrl(priced.network, simulated.result) };
    } catch (error) {
      simulation = { reverted: true, reason: shortError(error) };
      blocking.push(`Simulation from ${cli.from} failed: ${shortError(error)}. The transaction would not create a dispute; do not sign.`);
    }
    output = {
      ok: blocking.length === 0,
      blocking,
      network: networkSummary(priced.network),
      checks: priced.checks,
      prepared: rest,
      simulation,
      warnings: [...prepared.warnings, ...blocking],
    };
  } else if (command === "evidence") {
    if (cli.disputeId === undefined && cli.creationTx === undefined) {
      throw new Error(`evidence needs --dispute <court case id> or --creation-tx <hash>\n\n${USAGE}`);
    }
    const evidenceValue = JSON.parse(await readFile(cli.evidencePath as string, "utf8")) as unknown;
    output = await prepareEvidence(
      evidenceValue,
      { disputeId: cli.disputeId, creationTx: cli.creationTx, claimedEvidenceGroup: cli.evidenceGroup },
      rpcUrl,
      cli.network,
    );
  } else if (command === "receipt") {
    output = await receipt(cli.tx as Hex, rpcUrl, cli.network, cli.disputeId);
  } else {
    throw new Error(`unknown command: ${command}\n\n${USAGE}`);
  }
  console.log(JSON.stringify(output, (_key, item) => typeof item === "bigint" ? item.toString() : item, 2));
  // Exit 2 = the command completed but found something that must stop the flow
  // (would-revert, insufficient balance, reverted or mis-keyed receipt).
  return output.ok ? 0 : 2;
}

// Run only as a CLI, so tests can import the pure functions above.
const invokedDirectly = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (invokedDirectly) process.exitCode = await main(process.argv.slice(2));
