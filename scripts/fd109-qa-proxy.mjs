import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";

// Transport only: canonical HTTPS/secure cookies reach the real isolated app.
// No application responses or business state are fabricated by this proxy.
export async function startCanonicalQaProxy({certificateDirectory, webOrigin}) {
  const target = new URL(webOrigin);
  assert.equal(target.protocol, "http:");
  assert.equal(target.hostname, "127.0.0.1");
  assert(Number(target.port) >= 49152 && Number(target.port) <= 65535);
  assert.equal(target.pathname, "/");
  let blockedDestinations = 0;
  const tlsServer = https.createServer({
    cert: readFileSync(path.join(certificateDirectory, "qa-cert.pem")),
    key: readFileSync(path.join(certificateDirectory, "qa-key.pem")),
  }, (request, response) => {
    if (request.headers.host !== "lasoviet.net") {
      blockedDestinations++; response.writeHead(403); response.end(); return;
    }
    const upstream = http.request({hostname: target.hostname, port: target.port,
      method: request.method, path: request.url,
      headers: {...request.headers, host: "lasoviet.net", "x-forwarded-proto": "https"},
    }, result => {
      response.writeHead(result.statusCode, result.headers); result.pipe(response);
    });
    upstream.on("error", () => {if (!response.headersSent) response.writeHead(502); response.end();});
    request.on("aborted", () => upstream.destroy());
    response.on("close", () => upstream.destroy());
    request.pipe(upstream);
  });
  const proxy = http.createServer((_request, response) => {
    blockedDestinations++; response.writeHead(403); response.end();
  });
  proxy.on("connect", (request, client, head) => {
    if (request.url !== "lasoviet.net:443") {
      blockedDestinations++; client.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return;
    }
    const upstream = net.connect(tlsServer.address().port, "127.0.0.1", () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      client.pipe(upstream); upstream.pipe(client);
    });
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
    client.on("close", () => upstream.destroy());
  });
  const sockets = new Set();
  for (const server of [tlsServer, proxy]) server.on("connection", socket => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket));
  });
  const listen = server => new Promise((resolve, reject) => {
    server.once("error", reject); server.listen(0, "127.0.0.1", resolve);
  });
  try {await listen(tlsServer); await listen(proxy);} catch (error) {
    tlsServer.close(); proxy.close(); throw error;
  }
  return {server: `http://127.0.0.1:${proxy.address().port}`,
    blockedDestinations: () => blockedDestinations,
    async close() {
      for (const socket of sockets) socket.destroy();
      proxy.closeAllConnections(); tlsServer.closeAllConnections();
      await Promise.all([new Promise(resolve => proxy.close(resolve)), new Promise(resolve => tlsServer.close(resolve))]);
    },
  };
}
