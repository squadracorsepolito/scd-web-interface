export type VehicleData = {
  yaw: number
  x: number
  y: number
  speed: number
  delta: number
  throttle: number
  state: number
  lap: number
  map_cones: Cone[]
  active_cones: Cone[]
  waypoint_array: Waypoint[]
}

export type Cone = {
  x: number
  y: number
  color: number
  id: number
  isActive?: boolean
}

export type Waypoint = {
  x: number
  y: number
  vel_ref: number
}

export type DataPoint = {
  value: number
  timestamp: number
}

export type MapSettings = {
  zoom: number
  pan: { x: number; y: number }
}

export const MAX_DATA_POINTS = 100

export const getStateLabel = (state: number | undefined): string => {
  if (state === undefined) return "UNKNOWN"

  switch (state) {
    case 0:
      return "INITIALIZATION"
    case 1:
      return "EXPLORATION"
    case 2:
      return "RACING"
    case 3:
      return "STOP"
    case 4:
      return "ERROR"
    default:
      return "UNKNOWN"
  }
}

export const getStateClass = (state: number | undefined): string => {
  if (state === undefined) return "bg-zinc-600/30 text-zinc-300"

  switch (state) {
    case 0:
      return "bg-yellow-600/30 text-yellow-300"
    case 1:
      return "bg-blue-600/30 text-blue-300"
    case 2:
      return "bg-green-600/30 text-green-300"
    case 3:
      return "bg-orange-600/30 text-orange-300"
    case 4:
      return "bg-red-600/30 text-red-300"
    default:
      return "bg-zinc-600/30 text-zinc-300"
  }
}

