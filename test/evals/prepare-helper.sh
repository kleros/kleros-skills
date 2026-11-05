#!/bin/sh
# Operator setup for the behaviour evals (run outside the eval, with network).
# Installs the kleros-create-dispute helper from its lockfile, then adapts ONLY the
# gitignored node_modules/.bin entries to the `claude plugin eval` Linux sandbox so the
# SKILL.md invocation (`npm --prefix <scripts> exec -- tsx <scripts>/prepare-dispute.ts …`)
# runs there unchanged. Why (see test/evals/README.md "Sandbox adaptations"):
#   1. The eval masks every resolvable symlink inside the plugin tree (deny read+write),
#      and bubblewrap applies the deny to the symlink's TARGET — so .bin/tsx -> tsx/dist/cli.mjs
#      makes cli.mjs itself unreadable ("sh: tsx: not found", "Permission denied").
#      Fix: replace each .bin symlink with a plain-file shell shim.
#   2. The tsx CLI always binds an AF_UNIX IPC socket ($TMPDIR/tsx-0/<pid>.pipe); the
#      sandbox's seccomp filter refuses it (listen EPERM). Fix: the tsx shim runs
#      `node --import tsx/dist/loader.mjs` (tsx's documented loader form; same transform, no IPC).
#   3. Sandboxed Bash has no DNS; the only way out is the sandbox's HTTP(S)_PROXY, which
#      Node's fetch (viem, the IPFS check) ignores by default (EAI_AGAIN). Fix: the tsx shim
#      sets NODE_USE_ENV_PROXY=1. The proxy still enforces the domain allowlist.
#   Flags-first, bare `tsx` and `tsx watch` fall through to the stock CLI (not used by the skill).
# A real `npm ci` restores the stock symlinks. Re-run this after any reinstall.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
S="$here/../../kleros-create-dispute/scripts"
npm ci --prefix "$S" --no-audit --no-fund
cd "$S/node_modules/.bin"
for f in *; do
  [ -L "$f" ] || continue
  t=$(readlink "$f")
  rm "$f"
  if [ "$f" = tsx ]; then
    cat > "$f" <<'EOF'
#!/bin/sh
# eval-sandbox shim written by test/evals/prepare-helper.sh (stock: symlink to ../tsx/dist/cli.mjs)
case "${1:-}" in -*|""|watch) exec node "$(dirname "$0")/../tsx/dist/cli.mjs" "$@" ;; esac
NODE_USE_ENV_PROXY=1 exec node --disable-warning=UNDICI-EHPA --import "$(cd "$(dirname "$0")/.." && pwd)/tsx/dist/loader.mjs" "$@"
EOF
  else
    printf '#!/bin/sh\n# eval-sandbox shim written by test/evals/prepare-helper.sh\nexec "$(dirname "$0")/%s" "$@"\n' "$t" > "$f"
  fi
  chmod +x "$f"
done
echo "prepare-helper: $(ls | wc -l) .bin shims in $S/node_modules/.bin"
