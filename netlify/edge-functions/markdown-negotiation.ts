import type { Context } from "@netlify/edge-functions";

export default async function handler(
  req: Request,
  context: Context
): Promise<Response> {
  const { pathname } = new URL(req.url);

  if (pathname !== "/" && pathname !== "/index.html") {
    return context.next();
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return context.next();
  }

  const accept = req.headers.get("accept") ?? "";
  if (!prefersMarkdown(accept)) {
    return context.next();
  }

  const skillResponse = await fetch(new URL("/SKILL.md", req.url));
  if (!skillResponse.ok) {
    return context.next();
  }

  const markdown = await skillResponse.text();

  return new Response(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(Math.ceil(markdown.length / 4)),
      "vary": "Accept",
      "cache-control": "public, max-age=3600",
    },
  });
}

function prefersMarkdown(accept: string): boolean {
  if (!accept) return false;

  let markdownQ = -1;
  let htmlQ = -1;
  let wildcardQ = -1;

  for (const part of accept.split(",")) {
    const [mediaType, ...params] = part.trim().split(";");
    const type = mediaType.trim().toLowerCase();
    const qParam = params.find((p) => p.trim().startsWith("q="));
    const q = qParam ? parseFloat(qParam.split("=")[1]) : 1.0;

    if (type === "text/markdown") markdownQ = q;
    else if (type === "text/html") htmlQ = q;
    else if (type === "*/*") wildcardQ = q;
  }

  if (markdownQ <= 0) return false;

  const effectiveHtmlQ = htmlQ >= 0 ? htmlQ : wildcardQ >= 0 ? wildcardQ : 0;
  return markdownQ > effectiveHtmlQ;
}