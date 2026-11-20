import { DurableObject } from "cloudflare:workers";

/**
 * One instance per install ("network"): holds every open live-map socket,
 * counts them, and passes ride updates on to all of them. The Worker only
 * forwards members the Gateway signed in.
 */
export class LiveHub extends DurableObject {
  async fetch(request: Request) {
    if (request.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      this.sendPresence();
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (request.method === "POST") {
      this.send(await request.text());
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  }

  webSocketMessage() {}

  webSocketClose(socket: WebSocket) {
    try {
      socket.close();
    } catch {
      // Already closed.
    }
    this.sendPresence(socket);
  }

  webSocketError(socket: WebSocket) {
    this.sendPresence(socket);
  }

  private sendPresence(leaving?: WebSocket) {
    const open = this.ctx
      .getWebSockets()
      .filter((socket) => socket !== leaving);
    this.send(
      JSON.stringify({ type: "presence", viewers: open.length }),
      leaving,
    );
  }

  private send(message: string, skip?: WebSocket) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === skip) continue;
      try {
        socket.send(message);
      } catch {
        // A socket that is closing; its close event updates the count.
      }
    }
  }
}
