export type Rosbag = {
  id: number
  track_name: string
  mission_name: string
  number_of_laps_completed?: number
  number_of_evaluated_cones_yellow: number
  number_of_evaluated_cones_blue: number
  is_successful: boolean
  avg_lap_time: number
  timestamp: string
  rosbag_file?: string
  db_file?: string
  yaml_file?: string
  json_file?: string
  zip_file?: string
}

export type RosbagUpload = {
  track_name: string
  mission_name: string
  number_of_laps_completed?: number
  number_of_evaluated_cones_yellow: number
  number_of_evaluated_cones_blue: number
  is_successful: boolean
  avg_lap_time: number
  zip_file?: File | Blob
  yaml_file?: File | Blob
  db_file?: File | Blob
}

export type RosbagJsonData = {
  vehicle_states?: VehicleState[]
  cone_arrays?: ConeArray[]
  waypoints?: Waypoint[]
  states?: State[]
  [key: string]: unknown
}

export type VehicleState = {
  x: number
  y: number
  yaw: number
  v_x: number
  v_y: number
  yaw_r: number
  s: number
  v_s: number
  delta: number
  d: number
}

export type ConeArray = {
  cones: Cone[]
}

export type Cone = {
  x: number
  y: number
  color: "yellow" | "blue" | "orange" | "big_orange"
}

export type Waypoint = {
  x: number
  y: number
  s: number
}

export type State = {
  data: 0 | 1 | 2 | 3 | 4 // INITIALIZATION | EXPLORATION | RACING | STOP | ERROR
}

export type AuthToken = {
  token: string
}

export type ApiError = {
  detail: string
}

export type ValidationError = {
  [field: string]: string[]
}

// API Response types
export type ApiResponse<T> = {
  data?: T
  error?: string
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Authentication
export type LoginCredentials = {
  username: string
  password: string
}
