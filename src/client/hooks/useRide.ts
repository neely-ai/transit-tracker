import { useEffect, useRef, useState } from "react";
import { sendPosition, startRide, stopRide } from "@/serverFunctions/member";
import { POSITION_INTERVAL_MS } from "@/shared/network";

type LocationAccess =
  | "checking"
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported";

/** Whether the page may read the device's location. */
export function useLocationAccess() {
  const [access, setAccess] = useState<LocationAccess>("checking");
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setAccess("unsupported");
      return;
    }
    let status: PermissionStatus | null = null;
    const update = () => status && setAccess(status.state);
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        status = result;
        update();
        result.addEventListener("change", update);
      })
      .catch(() => setAccess("prompt"));
    return () => status?.removeEventListener("change", update);
  }, []);

  function ask() {
    navigator.geolocation.getCurrentPosition(
      () => setAccess("granted"),
      () => setAccess("denied"),
    );
  }
  return { access, ask };
}

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
    }),
  );
}

/** The member's own ride: start, send the position every few seconds, stop. */
export function useRide(initial: { rideId: string; lineId: string } | null) {
  const [ride, setRide] = useState(initial);
  const latest = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!ride) return;
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        latest.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      () => {},
      { enableHighAccuracy: true },
    );
    const timer = setInterval(async () => {
      if (!latest.current) return;
      const { live } = await sendPosition({
        data: { rideId: ride.rideId, ...latest.current },
      });
      if (!live) setRide(null);
    }, POSITION_INTERVAL_MS);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
    };
  }, [ride]);

  async function start(lineId: string) {
    const position = await currentPosition();
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    latest.current = coords;
    const { rideId } = await startRide({ data: { lineId, ...coords } });
    setRide({ rideId, lineId });
  }

  async function stop() {
    if (!ride) return;
    await stopRide({ data: { rideId: ride.rideId } });
    setRide(null);
  }

  return { ride, start, stop };
}
