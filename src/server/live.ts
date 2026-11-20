import { env } from "cloudflare:workers";
import { liveState } from "@/server/rides";

function hub() {
  return env.LIVE.get(env.LIVE.idFromName("network"));
}

/** Sends the current live rides to every open map. */
export async function publishLive() {
  const state = await liveState();
  await hub().fetch("https://live/publish", {
    method: "POST",
    body: JSON.stringify({ type: "live", ...state }),
  });
}

/** Hands a member's WebSocket upgrade to the hub. */
export function connectLive(request: Request) {
  return hub().fetch(request);
}
