// config.js (bank demo build) — demo wiring. Override at runtime with query params, e.g.
//   ?mode=live                      -> talk to the live agent (via proxy, defaults below)
//   ?domain=student                 -> source-demo student content set
//   ?agent=<id> ?proxy=<url> ?key=  -> overrides
(function () {
  var qs = new URLSearchParams(location.search);
  window.DEMO_CONFIG = {
    mode: qs.get("mode") || "mock",          // "mock" | "live"
    domain: qs.get("domain") || "business",  // "business" | "student"
    live: {
      // The browser CANNOT call the Wonderful API directly: its CORS policy only allows
      // origin https://app.demo.wonderful.ai. So live mode routes through the chat proxy
      // (API Gateway + Lambda, src/ui/proxy/) which injects the admin key server-side.
      baseUrl: "https://wonderful.api.sb.wonderful.ai",
      proxyUrl: qs.get("proxy") || "https://oirxp3nd1m.execute-api.eu-central-1.amazonaws.com",
      agentId: qs.get("agent") || "dc76c398-f699-49e4-b8ef-9c33e60b3bc1",
      apiKey: qs.get("key") || "",            // unused in proxy mode (proxy holds the key)
      fromName: "James"
    }
  };
})();
