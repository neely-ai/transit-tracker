import tanstackEntry from "@tanstack/react-start/server-entry";
import { everyApp } from "@every-app/sdk/server";
import { connectLive } from "@/server/live";

export { LiveHub } from "@/server/LiveHub";

// everyApp() verifies the identity the Gateway sent before any request reaches
// the app (a request from anywhere else is a 401). /api/live is the live
// map's WebSocket, handed to the LiveHub Durable Object.
export default everyApp<Env>(async (request) => {
  if (new URL(request.url).pathname === "/api/live") {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }
    return connectLive(request);
  }
  return tanstackEntry.fetch(request);
});
