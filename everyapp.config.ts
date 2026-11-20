import { defineEveryApp } from "@every-app/sdk";

// defineEveryApp types the manifest. The Gateway keeps it; the Worker gets
// the bindings it lists, never the file.
export default defineEveryApp({
  id: "transit-tracker",
  name: "Transit Tracker",
  description:
    "Map your transit lines, share where your bus or train is in real time, plan trips and report problems.",
  icon: "/icon.svg",
  access: "everyone",
  resources: {
    d1: ["DB"],
    // One instance ("network") holds every open live-map connection.
    durableObjects: [{ name: "LIVE", className: "LiveHub" }],
  },
});
