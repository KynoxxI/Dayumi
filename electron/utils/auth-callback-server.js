/**
 * Retour OAuth en loopback (RFC 8252) : supporte le code PKCE et le hash implicit flow.
 */

import http from "http";

const CANDIDATE_PORTS = [8351, 8352, 8353];
const CALLBACK_PATH = "/auth-callback";
const HOST = "127.0.0.1";

const LANDING_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Dayumi — Connexion</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;
       font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
       background:#0b0b0f;color:#f5f5f7}
  .card{text-align:center;max-width:440px;padding:40px 28px}
  .check{width:64px;height:64px;border-radius:50%;background:#5865F2;
         display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
  .check.err{background:#ff4a2d1a;border:1px solid #ff4a2d55;color:#ff7259;font-size:32px;font-weight:300}
  .check svg{width:34px;height:34px;stroke:#fff;stroke-width:3;fill:none}
  h1{font-size:20px;margin:0 0 10px}
  p{font-size:14px;color:#a1a1aa;margin:0;line-height:1.5}
</style>
</head>
<body>
  <div class="card">
    <div class="check" id="iconBox">
      <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h1 id="titleBox">Connexion réussie</h1>
    <p id="msgBox">Vous pouvez fermer cet onglet et revenir à l'application Dayumi.</p>
  </div>
  <script>
    (function() {
      var hash = window.location.hash ? window.location.hash.substring(1) : "";
      var search = window.location.search ? window.location.search.substring(1) : "";
      var params = new URLSearchParams(search);
      var hashParams = new URLSearchParams(hash);

      var code = params.get("code") || hashParams.get("code");
      var accessToken = params.get("access_token") || hashParams.get("access_token");
      var refreshToken = params.get("refresh_token") || hashParams.get("refresh_token");
      var error = params.get("error_description") || hashParams.get("error_description") ||
                  params.get("error_code") || hashParams.get("error_code") ||
                  params.get("error") || hashParams.get("error");

      // Transmettre les jetons du hash au serveur loopback
      if (hash && (code || accessToken)) {
        try {
          fetch("/auth-callback-tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: code,
              access_token: accessToken,
              refresh_token: refreshToken,
              hash: hash,
              search: search,
              url: window.location.href
            })
          }).catch(function() {});
        } catch (e) {}
      }

      if (error && !code && !accessToken) {
        var ib = document.getElementById("iconBox");
        ib.className = "check err";
        ib.innerHTML = "!";
        document.getElementById("titleBox").innerText = "Échec de la connexion";
        var decoded = error.replace(/\\+/g, " ");
        try { decoded = decodeURIComponent(decoded); } catch (e) {}
        document.getElementById("msgBox").innerText = decoded;
      } else {
        setTimeout(function(){ try { window.close(); } catch (e) {} }, 1200);
      }
    })();
  </script>
</body>
</html>`;

class AuthCallbackServer {
  constructor() {
    this.server = null;
    this.port = null;
    this.onCallback = null;
  }

  async start(onCallback) {
    this.onCallback = onCallback;
    for (const port of CANDIDATE_PORTS) {
      try {
        await this._listen(port);
        this.port = port;
        console.log(`[AuthCallback] serveur OAuth loopback démarré sur ${HOST}:${port}`);
        return port;
      } catch (e) {
        if (e && e.code === "EADDRINUSE") continue;
        console.error("[AuthCallback] erreur démarrage:", e);
        return null;
      }
    }
    console.error(
      `[AuthCallback] aucun port loopback disponible parmi ${CANDIDATE_PORTS.join(", ")}`
    );
    return null;
  }

  _listen(port) {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => this._handle(req, res));
      const onError = (err) => reject(err);
      server.once("error", onError);
      server.listen(port, HOST, () => {
        server.removeListener("error", onError);
        this.server = server;
        resolve();
      });
    });
  }

  _handle(req, res) {
    let parsed;
    try {
      parsed = new URL(req.url, `http://${HOST}:${this.port}`);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
      return;
    }

    if (req.method === "POST" && parsed.pathname === "/auth-callback-tokens") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        try {
          const data = JSON.parse(body || "{}");
          if (data && (data.url || data.code || data.access_token || data.hash)) {
            const reconstructed = data.url || `http://${HOST}:${this.port}${CALLBACK_PATH}?${data.search || ""}${data.hash ? "#" + data.hash : ""}`;
            this.onCallback?.(reconstructed);
          }
        } catch (e) {
          console.error("[AuthCallback] POST tokens failed:", e);
        }
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }

    if (parsed.pathname !== CALLBACK_PATH) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const fullUrl = `http://${HOST}:${this.port}${req.url}`;
    try {
      this.onCallback?.(fullUrl);
    } catch (e) {
      console.error("[AuthCallback] onCallback a échoué:", e);
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(LANDING_HTML);
  }

  getRedirectUrl() {
    if (!this.port) return null;
    return `http://${HOST}:${this.port}${CALLBACK_PATH}`;
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.port = null;
    }
  }
}

const authCallbackServer = new AuthCallbackServer();
export default authCallbackServer;
