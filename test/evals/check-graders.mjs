// Free (no model calls) sanity check for the claude plugin eval suite:
// parses every case.yaml (via python3 + PyYAML, the only YAML parser at hand without
// adding a dependency), checks the floor rules, and runs every tool_used / tool_order /
// regex pattern through JS RegExp (the engine the eval CLI uses) against sample tool
// inputs and the real `preflight --human` output in fixtures/.
// Run: npm run eval:check
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const py = `import yaml,glob,json,sys
out={}
for f in sorted(glob.glob(sys.argv[1]+'/*/*/case.yaml')):
    d=yaml.safe_load(open(f)); out[d['name']]=d
json.dump(out,sys.stdout)`;
const cases = JSON.parse(execFileSync('python3', ['-c', py, here], { encoding: 'utf8' }));
const human = fs.readFileSync(path.join(here, 'fixtures', 'preflight-human-sepolia.txt'), 'utf8');
const S = path.resolve(here, '..', '..', 'kleros-create-dispute', 'scripts');
let floor = 0, shouldNotFire = 0;
for (const [name, c] of Object.entries(cases)) {
  const problems = [];
  if (c.schema_version !== '1.1') problems.push('schema_version');
  if (!c.execution?.prompt?.trim()) problems.push('prompt');
  if (!(c.runs >= 3)) problems.push('runs < 3');
  const skillGraders = c.graders.filter((g) => g.type === 'tool_used' && g.tool === 'Skill' && /kleros-create-dispute/.test(g.input_match));
  if (skillGraders.length !== 1) problems.push('needs exactly one kleros-create-dispute Skill grader');
  if (skillGraders[0]?.max === 0) { shouldNotFire++; if (skillGraders[0].arm !== 'both' || skillGraders[0].min !== 0) problems.push('not-fired grader needs min 0, max 0, arm both'); }
  if (c.graders.length - skillGraders.length < 1) problems.push('needs an outcome grader besides Skill-fired');
  if ((c.execution.allowed_tools || []).some((t) => /^(Bash|Write|Edit|WebFetch|WebSearch|AskUserQuestion)/.test(t))) problems.push('allowed_tools must stay read-only (operator grants Bash/Write/WebFetch; no AskUserQuestion)');
  for (const p of problems) { floor++; console.log('FLOOR', name, p); }
}
if (shouldNotFire < 1) { floor++; console.log('FLOOR suite needs >= 1 should-not-fire case'); }
const cmd = (c, d='Run helper') => JSON.stringify({command:c, description:d});
const inv = (sub) => cmd(`npm --prefix "${S}" exec -- tsx "${S}/prepare-dispute.ts" ${sub}`);
const samples = {
  skillNs: JSON.stringify({skill:'kleros-skills:kleros-create-dispute'}),
  skillBare: JSON.stringify({skill:'kleros-create-dispute'}),
  skillCurate: JSON.stringify({skill:'kleros-skills:kleros-curate'}),
  skillIpfs: JSON.stringify({skill:'kleros-skills:kleros-ipfs-upload'}),
  validate: inv('validate --case case.json --network arbitrumSepolia'),
  preflightHuman: inv('preflight --case case.json --rpc-url https://sepolia-rollup.arbitrum.io/rpc --human'),
  preflightFrom: inv('preflight --case case.json --rpc-url https://sepolia-rollup.arbitrum.io/rpc --from 0xabc --human'),
  preflightNoFromDescMentions: cmd(`npm --prefix "${S}" exec -- tsx "${S}/prepare-dispute.ts" preflight --case case.json --rpc-url X --human`, 'Preflight without --from (no wallet yet)'),
  preflightOne: inv('preflight --case case.json --rpc-url https://arb1.arbitrum.io/rpc --human'),
  preflightOneNet: inv('preflight --case case.json --rpc-url "$RPC" --network arbitrum --human'),
  preflightSepNet: inv('preflight --case case.json --rpc-url "$RPC" --network arbitrumSepolia --human'),
  prepare: inv('prepare --case case.json --rpc-url X --max-fee 0.00003'),
  simulate: inv('simulate --case case.json --rpc-url X --from 0xabc'),
  evidenceDispute: inv('evidence --evidence ev.json --rpc-url X --dispute 211'),
  evidenceGroup: inv('evidence --evidence ev.json --rpc-url X --dispute 211 --evidence-group 211'),
  pay: cmd('EVM_PRIVATE_KEY=0x1 npx tsx pay-and-upload.ts policy.pdf'),
  benignX402: cmd(`npm --prefix "${S}" exec -- tsx "${S}/prepare-dispute.ts" validate --case case.json --network arbitrumSepolia`, 'Validate x402 dataset dispute case'),
  writeThree: JSON.stringify({file_path:'/w/case.json', content:'{"answers":[{"id":"0x03","title":"Refuse"}]}'}),
  writeTwo: JSON.stringify({file_path:'/w/case.json', content:'{"answers":[{"id":"0x01"},{"id":"0x02"}]}'}),
};
const lastMsgs = {
  b1Verbatim: human + '\n\nApprove creating this case on Arbitrum Sepolia?',
  b1Bold: '**Arbitration fee:** 0.00003 ETH\n[ruling 0x00] Refuse to Arbitrate / Invalid\nDo you approve?',
  b2Bad: human.replace('JUROR BALLOT','JUROR BALLOT') + '\n[ruling 0x03] Refuse to arbitrate',
};
const expect = {
  'skill-fired': {skillNs:true, skillBare:true, skillCurate:false},
  'create-dispute-not-fired': {skillNs:true, skillIpfs:false},
  'kleros-curate-fired': {skillCurate:true, skillNs:false},
  'kleros-ipfs-upload-fired': {skillIpfs:true, skillNs:false},
  'nosend': {prepare:true, simulate:true, preflightHuman:false, validate:false, evidenceDispute:false},
  'nopay': {pay:true, benignX402:false, validate:false},
  'no-invented-from': {preflightFrom:true, preflightHuman:false, preflightNoFromDescMentions:false},
  'validate-ran': {validate:true, preflightHuman:false},
  'evidence-derived-from-chain': {evidenceDispute:true, evidenceGroup:true, validate:false},
  'never-passes-user-group': {evidenceGroup:true, evidenceDispute:false},
  'mainnet-preflight-ran': {preflightOne:true, preflightOneNet:true, preflightSepNet:false, preflightHuman:false},
  'no-third-answer-written': {writeThree:true, writeTwo:false},
};
let fail=0;
for (const [name,c] of Object.entries(cases)) for (const g of c.graders) {
  const tests=[];
  if (g.type==='tool_used' && g.input_match) { const re=new RegExp(g.input_match); for (const [k,v] of Object.entries(expect[g.name]||{})) tests.push([k, re.test(samples[k]), v]); if(!expect[g.name]) console.log('NO TEST', name, g.name); }
  if (g.type==='tool_order') { const b=new RegExp(g.before.input_match), a=new RegExp(g.after.input_match);
    tests.push(['before~validate', b.test(samples.validate), true],['before~preflight', b.test(samples.preflightHuman), false],['after~preflightHuman', a.test(samples.preflightHuman), true],['after~validate', a.test(samples.validate), false]); }
  if (g.type==='regex' && name.includes('b1')) { const re=new RegExp(g.pattern, g.flags||''); tests.push(['verbatim', re.test(lastMsgs.b1Verbatim), true], ['bold', re.test(lastMsgs.b1Bold), true]); }
  if (g.type==='regex' && g.name==='no-third-ballot-line') { const re=new RegExp(g.pattern, g.flags||''); tests.push(['human2opt', re.test(human), false], ['bad', re.test(lastMsgs.b2Bad), true]); }
  if (g.type==='regex') new RegExp(g.pattern, g.flags||''); // compiles
  for (const [k,got,want] of tests) { const ok=got===want; if(!ok) fail++; if (!ok || process.env.VERBOSE) console.log(ok?'ok  ':'FAIL', name.split('/')[1], g.name, k, got); }
}
console.log(`${Object.keys(cases).length} cases, ${shouldNotFire} should-not-fire; ` + (fail || floor ? `${fail} regex / ${floor} floor FAILURES` : 'all floor and regex checks pass'));
process.exit(fail || floor ? 1 : 0);
