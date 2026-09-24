#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  createPublicClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  parseAbi,
  parseEther,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
} from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { z } from "zod";

// Deployment allowlist. Source of truth:
// https://github.com/kleros/kleros-v2/tree/dev/contracts/deployments/{arbitrum,arbitrumSepolia}
const NETWORKS = {
  arbitrum: {
    key: "arbitrum",
    label: "Arbitrum One",
    chain: arbitrum,
    chainId: 42161,
    core: "0x991d2df165670b9cac3B022f4B68D65b664222ea",
    resolver: "0xb5526D022962A1fFf6eD32C93e8b714c901F4323",
    evidenceModule: "0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3",
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
const RESERVED_RULING = {
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
  courtId: z.string().regex(/^\d+$/).default("1"),
  numberOfJurors: z.number().int().positive().max(10_001).default(3),
  disputeKitId: z.literal(1).default(1),
}).strict();

/// Kleros stores IPFS references as `/ipfs/<CID>`. Accept the `ipfs://` scheme as
/// input but never emit it, and reject anything that is not CID-shaped.
function normalizeIpfsUri(raw: string, field: string) {
  const uri = raw.trim().startsWith("ipfs://") ? `/ipfs/${raw.trim().slice(7)}` : raw.trim();
  if (!/^\/ipfs\/[A-Za-z0-9]+(?:\/.*)?$/.test(uri)) {
    throw new Error(`${field} must be an IPFS reference of the form /ipfs/<CID>, got ${JSON.stringify(raw)}`);
  }
  return uri;
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

function validate(value: unknown, network: Network) {
  const input = schema.parse(value);
  input.policyURI = normalizeIpfsUri(input.policyURI, "policyURI");
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

function networkByAlias(raw: string) {
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

  if (whitelistRead.status === "rejected") {
    checks.push({ name: "arbitrable-whitelist", status: "ok", detail: `${network.label} does not enforce an arbitrable whitelist.` });
  } else if (whitelistRead.value !== true) {
    throw new Error(`Kleros Core on ${network.label} enforces an arbitrable whitelist and DisputeResolver ${resolver} is not on it`);
  } else {
    checks.push({ name: "arbitrable-whitelist", status: "ok", detail: `DisputeResolver is whitelisted on Kleros Core.` });
  }

  return { checks, hiddenVotes: court[1], feeForJurorWei: court[4] };
}

type QuoteOptions = { network?: string; maxFeeEth?: string };

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
  if (options.maxFeeEth !== undefined) {
    const cap = parseEther(options.maxFeeEth);
    if (valueWei > cap) throw new Error(`arbitration fee ${formatEther(valueWei)} ETH exceeds --max-fee ${options.maxFeeEth} ETH`);
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
        reason: `gas estimation from ${from} failed (balance ${formatEther(balanceWei)} ETH, fee ${formatEther(prepared.value)} ETH): ${gasResult.error.message.split("\n")[0]}`,
      };
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
    }
  } else {
    networkFee = {
      available: false,
      reason: "Pass --from <wallet-address> to estimate network gas, balance, and total cost without submitting.",
    };
  }

  return {
    kind: "kleros-v2-dispute-preflight",
    status: "REVIEW_ONLY_NOT_SUBMITTED",
    network: networkSummary(network),
    checks: prepared.priced.checks,
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
    warnings: prepared.warnings,
    nextStep: "Review every field. A separate explicit approval is required before any signature or broadcast.",
  };
}

type Preflight = Awaited<ReturnType<typeof preflight>>;

function formatHumanPreflight(review: Preflight) {
  const lines = [
    "KLEROS V2 DISPUTE PREFLIGHT — REVIEW ONLY",
    "Nothing was uploaded, signed, or submitted by this command.",
    "",
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
  if (review.warnings.length > 0) lines.push("", "WARNINGS", ...review.warnings.map((warning) => `- ${warning}`));
  lines.push("", `STATUS: ${review.status}`, review.nextStep);
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
  return {
    kind: "kleros-v2-dispute-receipt",
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

const [command, ...tokens] = process.argv.slice(2);
const args = new Map<string, string | true>();
for (let index = 0; index < tokens.length; index += 1) {
  const name = tokens[index];
  if (!name?.startsWith("--")) throw new Error(`unexpected argument: ${name}\n\n${USAGE}`);
  const value = tokens[index + 1];
  if (!value || value.startsWith("--")) args.set(name, true);
  else { args.set(name, value); index += 1; }
}
const required = (name: string) => {
  const value = args.get(name);
  if (typeof value !== "string") throw new Error(`${name} is required\n\n${USAGE}`);
  return value;
};
const optional = (name: string) => {
  const value = args.get(name);
  return typeof value === "string" ? value : undefined;
};
const readCase = async () => JSON.parse(await readFile(required("--case"), "utf8")) as unknown;
const quoteOptions = (): QuoteOptions => ({ network: optional("--network"), maxFeeEth: optional("--max-fee") });

let output: unknown;
if (command === "validate") {
  const network = await resolveNetwork(optional("--network"));
  const result = validate(await readCase(), network);
  output = {
    valid: true,
    network: networkSummary(network),
    template: result.template,
    extraData: result.extraData,
    numberOfRulingOptions: result.numberOfRulingOptions,
    warnings: result.warnings,
  };
} else if (command === "quote") {
  const priced = await quote(await readCase(), required("--rpc-url"), quoteOptions());
  output = {
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
  const prepared = await prepare(await readCase(), required("--rpc-url"), quoteOptions());
  const { priced, ...rest } = prepared;
  output = { network: networkSummary(priced.network), checks: priced.checks, ...rest };
} else if (command === "preflight") {
  const review = await preflight(await readCase(), required("--rpc-url"), {
    ...quoteOptions(),
    from: optional("--from") ? getAddress(required("--from")) as Address : undefined,
  });
  if (args.get("--human") === true) {
    console.log(formatHumanPreflight(review));
    process.exit(0);
  }
  output = review;
} else if (command === "simulate") {
  const rpcUrl = required("--rpc-url");
  const prepared = await prepare(await readCase(), rpcUrl, quoteOptions());
  const simulation = await client(prepared.priced.network, rpcUrl).simulateContract({
    account: getAddress(required("--from")) as Address,
    address: getAddress(prepared.priced.network.resolver),
    abi: resolverAbi,
    functionName: "createDisputeForTemplate",
    args: [prepared.decoded.arbitratorExtraData, prepared.priced.result.templateJson, "", prepared.decoded.numberOfRulingOptions],
    value: prepared.value,
  });
  const { priced, ...rest } = prepared;
  output = {
    network: networkSummary(priced.network),
    checks: priced.checks,
    prepared: rest,
    simulation: { nextDisputeId: simulation.result, caseUrlIfCreated: caseUrl(priced.network, simulation.result) },
  };
} else if (command === "evidence") {
  const evidenceValue = JSON.parse(await readFile(required("--evidence"), "utf8")) as unknown;
  const disputeFlag = optional("--dispute");
  const creationTx = optional("--creation-tx");
  if (disputeFlag === undefined && creationTx === undefined) {
    throw new Error(`evidence needs --dispute <court case id> or --creation-tx <hash>\n\n${USAGE}`);
  }
  const claimed = optional("--evidence-group");
  output = await prepareEvidence(
    evidenceValue,
    {
      disputeId: disputeFlag === undefined ? undefined : BigInt(disputeFlag),
      creationTx: creationTx as Hex | undefined,
      claimedEvidenceGroup: claimed === undefined ? undefined : BigInt(claimed),
    },
    required("--rpc-url"),
    optional("--network"),
  );
} else if (command === "receipt") {
  const expect = optional("--dispute");
  output = await receipt(
    required("--tx") as Hex,
    required("--rpc-url"),
    optional("--network"),
    expect === undefined ? undefined : BigInt(expect),
  );
} else {
  throw new Error(`unknown command: ${command ?? "(none)"}\n\n${USAGE}`);
}
console.log(JSON.stringify(output, (_key, item) => typeof item === "bigint" ? item.toString() : item, 2));
