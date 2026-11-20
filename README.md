# Transit Tracker

Your organization's own map of its bus, metro, light rail and train lines. Members share where their vehicle is in real time, plan trips between stations and report problems on a line.

Inspired by https://wintransport.wstation.online

Built with [oss.new](https://oss.new) for [EveryApp](https://github.com/every-app/every-app).

## Features

- Browse lines by code, terminals and kind, and open one to see its stations in order and its path on a map; admins add, edit, reorder and delete stations and lines.
- Star up to 5 lines and switch lists and the map to only those.
- Watch a live map of every line, or one, with the vehicles members are riding, and share your own ride from your phone's location.
- Pick two stations and get direct lines, or routes with one change, ordered by stops.
- Report a delay, crowding, a breakdown or a safety problem on a line or station; admins resolve reports.

Left out: accounts and sign-in, which your Gateway handles; anonymous public access; an installable or offline app; a preloaded national network; a theme switch and base-map picker.

## Setup

- Install: `pnpm install`, then `pnpm everyapp install <repository url>` on your Gateway, or `pnpm run deploy` from a checkout.
- Run locally: `pnpm dev`.
- Test: `pnpm test` for the unit tests; `checks/` holds the browser suites run against a packaged release.
- Deploy: `pnpm run deploy`.

There are no secrets or settings to fill in. The app uses one D1 database and one Durable Object for live updates. After installing, an admin adds the network's lines and stations from the Lines page.

## Limitations

- The map's base tiles load from OpenStreetMap's public tile server, so map backgrounds need internet access and fall under its usage policy.
- Sharing a ride needs a browser that allows location access, and stops when the page is closed; a ride with no update for 2 minutes drops off the map.
- Third-party services and a real deployment were not part of the local checks.
