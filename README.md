# SCD Web Interface

Real-time visualization interface for Squadra Corse PoliTO (rip driverless). Built with next.js. The app receives live telemetry over WebSockets, renders car widgets, and offers tooling to review recorded rosbags.

---

## Features

- **Live telemetry** using WebSockets with automatic reconnection, configurable IP/port, and lap log tracking.
- **Driver dashboard** with speed/throttle charts, lap logs, steering wheel status, and stateful vehicle metrics.
- **Interactive map** for cone, waypoint, and trajectory overlays.
- **Test management** including authenticated upload/edit flows for rosbags against the REST backend.
- **Replay mode** to inspect recorded `data_compact.json` streams locally with frame scrubbing and speed controls.

---

## Getting Started

### Prerequisites

- Optional: a running telemetry WebSocket server (defaults to `ws://127.0.0.1:9090`)
- Optional: REST API for rosbag management (defaults to `http://localhost:8000`)

### Installation

```bash
git clone https://github.com/squadracorsepolito/scd-web-interface.git
cd scd-web-interface
pnpm install
```

### Development

```bash
pnpm run dev
```

This boots Next.js at `http://localhost:3000`. The dashboard attempts to open a WebSocket using the last configured IP/port (edit via “Connection Settings” in the sidebar).

---

## WebSocket

Live telemetry packets are merged into the `VehicleData` shape defined in `src/types/vehicle-types.ts`. Key fields include:

```ts
type VehicleData = {
	yaw: number
	x: number
	y: number
	speed: number
	delta: number
	throttle: number
	state: number
	lap: number
	timestamp: number
	map_cones: Cone[]
	active_cones: Cone[]
	waypoint_array: Waypoint[]
	green_points?: Cone[]
	log?: Record<string, any> | string
}
```

### Lap Log Packets

- Packets may include a `log` property containing either a JSON string or an object.
- When `log.lap_time` is non-empty, the UI records the payload against lap `max(1, floor(lap) - 1)` to reflect the completed lap.
- Example message:

```json
{
	"lap": 4,
	"log": "{\"lap_time\":\"87.531\"}"
}
```

The Lap Logs panel (under the throttle chart) prettyprints the saved JSON per lap and updates automatically as new entries arrive.

### Replay Mode

- Switch to **Data Replay** within the Connection Controls to load `public/data/data_compact.json`.
- Playback controls support frame scrubbing, rewind/fast-forward, adjustable speed, and optional looping.

---

## REST Backend Integration

- API base URL defaults to `http://localhost:8000`. Configure it through `.env.local` using the variables documented in `.env.example`, or enter a server host/port in the login modal.
- Authentication uses the backend token response in memory for the current tab session. The token is not persisted to `localStorage`, so refreshing the page requires logging in again.
- Rosbag uploads accept ZIP/YAML/DB payloads with progress reporting.

---

## Project Structure

```
src/
├─ app/               # Next.js App Router pages
├─ components/        # UI components (dashboard, maps, charts, forms)
├─ lib/               # REST API client and helpers
├─ types/             # Shared TypeScript types (VehicleData, rosbag models, etc.)
├─ utils/             # WebSocket service, file helpers, JSON decompression
public/data/          # Replay fixtures (data_compact.json)
```

---

## Troubleshooting

- **No telemetry shown**: confirm the WebSocket endpoint is reachable (use Connection Settings to adjust IP/port) and that packets include the required map arrays for the initial snapshot.
- **Missing lap logs**: ensure `log.lap_time` is provided and is not empty.
- **REST errors**: check the configured API URL and authentication token validity. A 401 response clears the in-memory session and prompts re-login.
