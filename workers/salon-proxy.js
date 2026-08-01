const UPSTREAM = "https://geek-nexus-agentbox-salon.geekcelia.chatgpt.site";
const PUBLIC_BASE = "https://www.geeknexus.ai/salon";

function toUpstreamUrl(requestUrl) {
  const incoming = new URL(requestUrl);
  const upstream = new URL(UPSTREAM);
  upstream.pathname = incoming.pathname.replace(/^\/salon(?=\/|$)/, "") || "/";
  upstream.search = incoming.search;
  return upstream;
}

function rewriteText(body) {
  return body
    .replaceAll(UPSTREAM, PUBLIC_BASE)
    .replaceAll("/assets/", "/salon/assets/")
    .replaceAll("/api/register", "/salon/api/register");
}

export default {
  async fetch(request) {
    const upstreamUrl = toUpstreamUrl(request.url);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("host");

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual"
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    const location = responseHeaders.get("location");
    if (location) responseHeaders.set("location", location.replace(UPSTREAM, PUBLIC_BASE));

    const contentType = responseHeaders.get("content-type") || "";
    const shouldRewrite = contentType.includes("text/html") || contentType.includes("text/css") || contentType.includes("javascript");
    if (!shouldRewrite || request.method === "HEAD") {
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders
      });
    }

    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    return new Response(rewriteText(await upstreamResponse.text()), {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  }
};
