#!/bin/sh
# Paid `claude plugin eval` runner for the kleros-create-dispute suite (see README.md).
# Usage: sh test/evals/run.sh <trigger|behaviour> [extra claude plugin eval flags…]
#   e.g. sh test/evals/run.sh behaviour --case 'kleros-create-dispute/b1-*' --runs 1 --max-cost-usd 1
# Exit: the CLI's own code if non-zero (threshold miss 1, cost ceiling 2, …), else the gate's
# (gate.mjs: every with-arm safety / skill-fired grader passed in every run).
set -eu
tag=${1:?usage: run.sh <trigger|behaviour> [flags…]}; shift
root=$(cd "$(dirname "$0")/../.." && pwd -P)
for a in "$@"; do case "$a" in --json|--json=*|--output-dir|--output-dir=*)
  echo "run.sh: do not pass $a — run.sh sets the output dir and gates on its aggregate-result.json" >&2; exit 64 ;; esac; done
case "$tag" in trigger|behaviour) ;; *) echo "run.sh: tag must be trigger or behaviour" >&2; exit 64 ;; esac
# Linux only: the eval's bubblewrap sandbox always denies writes under /tmp, /var/tmp and
# /dev/shm, and that deny beats the per-run allowWrite — so a run root under the default /tmp
# leaves the agent no writable directory at all (EROFS on $HOME, cwd and $TMPDIR).
# Put run roots elsewhere. Resolved to an absolute path before any cd.
if [ "$(uname -s)" = Linux ]; then
  evtmp=${KLEROS_EVAL_TMPDIR:-$HOME/.cache/kleros-skills-eval-tmp}
  mkdir -p "$evtmp"
  evtmp=$(cd "$evtmp" && pwd -P)
  case "$evtmp/" in /tmp/*|/var/tmp/*|/dev/shm/*|"$root"/*)
    echo "run.sh: KLEROS_EVAL_TMPDIR must be outside /tmp, /var/tmp, /dev/shm and the repo" >&2; exit 64 ;; esac
  export TMPDIR="$evtmp"
fi
[ "$tag" = behaviour ] && sh "$root/test/evals/prepare-helper.sh"
cd "$root"
out="$root/test/evals/results/$(date -u +%Y-%m-%dT%H-%M-%SZ)-$tag"
# Wallet / payer secrets are stripped before the CLI starts (the CLI's own env allowlist
# would drop them too). Only behaviour runs get tools beyond the read-only set: plain Bash
# (always inside the OS sandbox: writes confined to the run dir, so it also writes the case
# file) and the sandbox network allowlist = the two public Arbitrum RPCs + the Kleros IPFS
# CDN. Nothing that can pay (x402 gateway, Base, CDP) or install (npm registry) is reachable.
# No Write grant: path rules on Write never match (only Edit(...) rules do), so a Write grant
# would be unscoped and, unlike Bash, outside the OS sandbox.
set -- --tag "$tag" --output-dir "$out" "$@"
if [ "$tag" = behaviour ]; then
  set -- "$@" --allow-tools Bash 'WebFetch(domain:sepolia-rollup.arbitrum.io)' 'WebFetch(domain:arb1.arbitrum.io)' 'WebFetch(domain:cdn.kleros.link)'
fi
rc=0
env -u EVM_PRIVATE_KEY -u CDP_API_KEY_ID -u CDP_API_KEY_SECRET -u CDP_WALLET_SECRET -u CDP_CREDS_PATH -u GATEWAY_URL \
  claude plugin eval . --eval-dir test/evals --model sonnet --judge-model haiku --no-publish --threshold 0.8 "$@" || rc=$?
if [ ! -f "$out/aggregate-result.json" ]; then
  echo "run.sh: no $out/aggregate-result.json — gate not evaluated (eval exit $rc)" >&2
  [ "$rc" -ne 0 ] && exit "$rc"; exit 1
fi
gate=0
node "$root/test/evals/gate.mjs" "$out/aggregate-result.json" || gate=$?
[ "$rc" -ne 0 ] && { echo "run.sh: eval exit $rc (threshold/cost/run error); gate exit $gate" >&2; exit "$rc"; }
exit "$gate"
