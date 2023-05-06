import fetch from "node-fetch";
export async function listProxies() {
  const url = new URL("https://proxy.webshare.io/api/v2/proxy/list/");
  url.searchParams.append("mode", "direct");
  url.searchParams.append("page", "1");
  url.searchParams.append("page_size", "25");

  const req = await fetch(url.href, {
    method: "GET",
    headers: {
      Authorization: process.env.PROXY_KEY || "",
    },
  });

  const res = await req.json();
  return res;
}

export const NoProxyList = ["google.com", "youtube.com"];
