import { useEffect, useState } from "react";
import type { LiveState } from "@/server/rides";
import { getLive } from "@/serverFunctions/member";

/** How often the page re-reads the rides, so a silent rider drops off. */
const REFRESH_MS = 30 * 1000;

/** Live rides and the number of open maps, pushed over the app's WebSocket. */
export function useLive(initial: LiveState) {
  const [live, setLive] = useState<LiveState>(initial);
  const [viewers, setViewers] = useState<number | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    function connect() {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${location.host}/api/live`);
      socket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as
          | { type: "presence"; viewers: number }
          | ({ type: "live" } & LiveState);
        if (message.type === "presence") setViewers(message.viewers);
        else setLive({ vehicles: message.vehicles, riders: message.riders });
      };
      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, 3000);
      };
    }
    connect();
    const refresh = setInterval(() => {
      void getLive().then(({ vehicles, riders }) =>
        setLive({ vehicles, riders }),
      );
    }, REFRESH_MS);
    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(refresh);
      socket?.close();
    };
  }, []);

  return { ...live, viewers };
}
