#!/bin/sh
# Paid `claude plugin eval` runner for the kleros-create-dispute suite (see README.md).
# Usage: sh test/evals/run.sh <trigger|behaviour> [extra claude plugin eval flags…]
#   e.g. sh test/evals/run.sh behaviour --case '*b1*' --runs 1 --ablation none --max-cost-usd 1
set -eu
tag=${1:?usage: run.sh <trigger|behaviour> [flags…]}; shift
root=$(cd "$(dirname "$0")/../.." && pwd)
# The eval's Linux sandbox always denies writes under /tmp, /var/tmp and /dev/shm, and that
# deny beats the per-run allowWrite — so a run root under the default /tmp leaves the agent
# no writable directory at all (EROFS on $HOME, cwd and $TMPDIR). Put run roots elsewhere.
evtmp=${KLEROS_EVAL_TMPDIR:-$HOME/.cache/kleros-skills-eval-tmp}
case "$evtmp/" in /tmp/*|/var/tmp/*|/dev/shm/*|"$root"/*)
  echo "run.sh: KLEROS_EVAL_TMPDIR must be outside /tmp, /var/tmp, /dev/shm and the repo" >&2; exit 64 ;; esac
mkdir -p "$evtmp"
case "$tag" in
  trigger) ;;
  behaviour) sh "$root/test/evals/prepare-helper.sh" ;;
  *) echo "run.sh: tag must be trigger or behaviour" >&2; exit 64 ;;
esac
cd "$root"
# Wallet / payer secrets are stripped before the CLI starts (the CLI's own env allowlist
# would drop them too). Only behaviour runs get tools beyond the read-only set: plain Bash
# (always inside the OS sandbox), Write, and the sandbox network allowlist = the two
# public Arbitrum RPCs + the Kleros IPFS CDN. Nothing that can pay (x402 gateway, Base,
# CDP) or install (npm registry) is reachable.
set -- --tag "$tag" "$@"
if [ "$tag" = behaviour ]; then
  set -- "$@" --allow-tools Bash Write 'WebFetch(domain:sepolia-rollup.arbitrum.io)' 'WebFetch(domain:arb1.arbitrum.io)' 'WebFetch(domain:cdn.kleros.link)'
fi
exec env -u EVM_PRIVATE_KEY -u CDP_API_KEY_ID -u CDP_API_KEY_SECRET -u CDP_WALLET_SECRET -u CDP_CREDS_PATH -u GATEWAY_URL \
  TMPDIR="$evtmp" \
  claude plugin eval . --eval-dir test/evals --model sonnet --judge-model haiku --no-publish --threshold 0.8 "$@"
