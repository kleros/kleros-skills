// Test-only, in-process JSON-RPC stub for the create-dispute helper.
//
// One HTTP server per test file; every test registers its own scenario and gets
// its own URL (`http://127.0.0.1:<port>/<scenario-id>`), so tests that run
// concurrently never see each other's chain state. The CLI is pointed at that
// URL through its normal `--rpc-url` flag — nothing in the helper knows it is
// being tested, and no safety check is switched off: the stub has to answer
// eth_chainId, the bytecode / deployment reads and the EIP-1967 slot exactly as
// a real Arbitrum node would for the helper to get anywhere.
//
// A scenario is `{ handle(method, params, request) }` (`request` carries the raw
// `url` path+query and the `authorization` header, for tests that echo them). `handle` returns the JSON-RPC
// result, throws an `RpcError` (sent back as a JSON-RPC error object with any
// code / message / data), or throws an `HttpStatus` (the whole HTTP response
// becomes that status and body, as a rate-limiting or overloaded provider
// answers). Every request is recorded in `scenario.requests` for assertions.
const http = require("node:http");

class RpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

class HttpStatus extends Error {
  constructor(status, body = "") {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function startRpcStub() {
  const scenarios = new Map();
  let nextId = 0;
  const server = http.createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      const scenario = scenarios.get(request.url.split(/[?#]/)[0].split("/")[1]);
      const meta = { url: request.url, authorization: request.headers.authorization };
      const answer = (message) => {
        const base = { jsonrpc: "2.0", id: message.id };
        if (!scenario) return { ...base, error: { code: -32000, message: `unknown stub scenario ${request.url}` } };
        scenario.requests.push({ method: message.method, params: message.params });
        try {
          return { ...base, result: scenario.handle(message.method, message.params ?? [], meta) };
        } catch (error) {
          if (error instanceof HttpStatus) throw error;
          if (error instanceof RpcError) {
            return { ...base, error: { code: error.code, message: error.message, ...(error.data === undefined ? {} : { data: error.data }) } };
          }
          return { ...base, error: { code: -32000, message: `stub bug: ${error.message}` } };
        }
      };
      let payload;
      try { payload = JSON.parse(body); } catch { payload = { id: null, method: "(unparseable)" }; }
      let out;
      try {
        out = Array.isArray(payload) ? payload.map(answer) : answer(payload);
      } catch (error) {
        response.writeHead(error.status, { "content-type": "text/plain" });
        response.end(error.body);
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(out));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    /// Register a scenario and return the RPC URL that serves it.
    url(scenario) {
      const id = `s${(nextId += 1)}`;
      scenario.requests = scenario.requests ?? [];
      scenarios.set(id, scenario);
      return `http://127.0.0.1:${port}/${id}`;
    },
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); }),
  };
}

module.exports = { startRpcStub, RpcError, HttpStatus };
