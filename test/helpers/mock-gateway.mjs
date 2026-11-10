// Test-only stand-in for the Kleros IPFS gateway. Lives under test/ (stripped
// from master, never shipped); the helper itself has no switch that loads it.
//
// Two ways in, both driven only by the test harness:
// - as a preload of a spawned helper: `node --import <this file>` with the map
//   in KCD_TEST_GATEWAY — installs itself at load;
// - in the test process: `createGatewayFetch(() => map, fetch)`, installed on
//   globalThis around in-process `main()` runs.
//
// The replacement fetch keeps every run offline and deterministic:
// - https://cdn.kleros.link/<path> is answered from the map
//   ({ "/ipfs/<cid>[/path]": { status?, body } }); any other path is a 404,
//   exactly like a CID nobody uploaded;
// - http://127.0.0.1 (the in-process JSON-RPC stub) passes through;
// - every other host is refused, so a test can never reach a real network.
export function createGatewayFetch(served, realFetch) {
  return async (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.host === "cdn.kleros.link") {
      const entry = served()[url.pathname];
      if (!entry) return new Response("ipfs resolve: no link named", { status: 404 });
      return new Response(entry.body ?? "", { status: entry.status ?? 200 });
    }
    if (url.hostname === "127.0.0.1") return realFetch(input, init);
    throw new TypeError(`fetch failed: test harness refuses network access to ${url.host}`);
  };
}

if (process.env.KCD_TEST_GATEWAY !== undefined) {
  const served = JSON.parse(process.env.KCD_TEST_GATEWAY);
  globalThis.fetch = createGatewayFetch(() => served, globalThis.fetch);
}
