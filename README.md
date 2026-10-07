# SCD Web Interface

Real-time visualization interface for Squadra Corse PoliTO (rip driverless). Built with Next.js. The app receives live telemetry over WebSockets, renders car widgets, and offers tooling to review recorded rosbags.

This repository is meant to be used together with the **[automated-autonomous-simulator-tests-backend](https://github.com/squadracorsepolito/automated-autonomous-simulator-tests-backend)** Django API. The backend stores rosbag test metadata and files; this frontend authenticates against it, uploads and edits tests, processes rosbags into replay JSON, and plays them back in the dashboard. Live telemetry does not go through the REST API, it uses a separate WebSocket source powered by **[websocket_ros](https://github.com/AlessioCammarata/websocket_ros)**, a ROS 2 bridge that aggregates vehicle data.

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

- **Rosbag / test management:** [automated-autonomous-simulator-tests-backend](https://github.com/squadracorsepolito/automated-autonomous-simulator-tests-backend) on `http://localhost:8000` (see that repo's README for setup, migrations, and `.env`)
- **Live telemetry (optional):** [websocket_ros](https://github.com/AlessioCammarata/websocket_ros) running on the NVIDIA at `ws://192.168.10.69:9090` (this is the default if not specified)

### Installation

```bash
git clone https://github.com/squadracorsepolito/scd-web-interface.git
cd scd-web-interface
pnpm install
cp .env.example .env.local   # optional; defaults match localhost:3000 / :8000
```

### Development

```bash
pnpm run dev
```

This boots Next.js at `http://localhost:3000`. The dashboard attempts to open a WebSocket using the last configured IP/port (edit via "Connection Settings" in the sidebar).

### Full stack (frontend + all backends)

Typical local workflow for rosbag upload, processing, and replay with live telemetry:

1. **ROS 2 + websocket_ros** — in [websocket_ros](https://github.com/AlessioCammarata/websocket_ros):

   ```bash
   git clone https://github.com/AlessioCammarata/websocket_ros.git
   cd websocket_ros
   colcon build --packages-select interfaces websocket_ros
   source install/setup.bash
   ros2 launch websocket_ros launch.py
   ```

   This aggregates ROS 2 telemetry and broadcasts it over WebSocket on `ws://192.168.10.69:9090`.

2. **Backend** — in [automated-autonomous-simulator-tests-backend](https://github.com/squadracorsepolito/automated-autonomous-simulator-tests-backend):

   ```bash
   git clone https://github.com/squadracorsepolito/automated-autonomous-simulator-tests-backend.git
   cd automated-autonomous-simulator-tests-backend
   python -m venv venv
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   python manage.py migrate
   python create_admin.py
   python manage.py runserver
   ```

   Ensure `CORS_ALLOWED_ORIGINS` in the backend `.env` includes `http://localhost:3000`.

3. **Frontend** — in this repo: `pnpm install` then `pnpm run dev`.

4. **In the UI** — open the Tests area, log in with the backend admin credentials (`POST /api-token-auth/`), then upload YAML/DB or ZIP rosbags, process them to JSON, and replay from the test list. Live telemetry from **websocket_ros** will stream to the dashboard automatically.

| Service            | Default URL              | Role                                      |
|--------------------|--------------------------|-------------------------------------------|
| SCD Web Interface  | `http://localhost:3000`  | Dashboard, replay, test UI                |
| automated-autonomous-simulator-tests-backend | `http://localhost:8000` | Auth, rosbag CRUD, JSON/ROS generation |
| websocket_ros      | `ws://192.168.10.69:9090` | Live vehicle telemetry (ROS 2 bridge)    |

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
- Endpoints used by the UI include `POST /api-token-auth/`, `/api/rosbags/`, `/api/rosbags/{id}/`, `/api/rosbags/{id}/json/`, and `/api/rosbags/{id}/ros/`.

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
