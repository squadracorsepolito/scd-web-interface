import { VehicleData, Cone, Waypoint } from "@/types/vehicle-types"

// Define the structure for compressed vehicle data
interface CompressedVehicleData {
    x?: string | number;
    y?: string | number;
    yaw?: string | number;
    v_y?: string | number;
    yaw_r?: string | number;
    s?: string | number;
    v_s?: string | number;
    speed?: string | number;
    delta?: string | number;
    throttle?: string | number;
    state?: string | number;
    lap?: string | number;
    map_cones?: Cone[] | string;
    active_cones?: Cone[] | string;
    waypoint_array?: Waypoint[] | string;
    green_points?: Cone[] | string;
    latency?: string | number;
    Ndata?: string | number;
    timestamp?: string | number;
}

// Define type for compact vehicle data (partial of compressed data)
export type CompactVehicleData = Partial<CompressedVehicleData>;

// Default values for compressed vehicle data fields
const DEFAULT_VALUES: Record<keyof CompressedVehicleData, string | number> = {
    x: 0,
    y: 0,
    yaw: 0,
    v_y: 0,
    yaw_r: 0,
    s: 0,
    v_s: 0,
    speed: 0,
    delta: 0,
    throttle: 0,
    state: 0,
    lap: 1,
    map_cones: "[]",
    active_cones: "[]",
    waypoint_array: "[]",
    green_points: "[]",
    latency: 0,
    Ndata: 0,
    timestamp: 0
};

export function uncompactData(compactList: CompactVehicleData[]): VehicleData[] {
    const fullMessages: VehicleData[] = [];
    let lastFull: CompressedVehicleData = {} as CompressedVehicleData;

    for (const compactMsg of compactList) {
        // Start with previous message as base
        const currentFull = { ...lastFull };
        
        // Update with new compact message data
        Object.assign(currentFull, compactMsg);
        
        // Ensure all default keys are present
        for (const [key, defaultValue] of Object.entries(DEFAULT_VALUES)) {
            if (!(key in currentFull)) {
                (currentFull as Record<string, unknown>)[key] = defaultValue;
            }
        }
        
        // Convert compressed data to actual VehicleData format
        const vehicleData: VehicleData = {
            x: typeof currentFull.x === 'string' ? parseFloat(currentFull.x) || 0 : currentFull.x || 0,
            y: typeof currentFull.y === 'string' ? parseFloat(currentFull.y) || 0 : currentFull.y || 0,
            yaw: typeof currentFull.yaw === 'string' ? parseFloat(currentFull.yaw) || 0 : currentFull.yaw || 0,
            speed: typeof currentFull.speed === 'string' ? parseFloat(currentFull.speed) || 0 : currentFull.speed || 0,
            delta: typeof currentFull.delta === 'string' ? parseFloat(currentFull.delta) || 0 : currentFull.delta || 0,
            throttle: typeof currentFull.throttle === 'string' ? parseFloat(currentFull.throttle) || 0 : currentFull.throttle || 0,
            state: typeof currentFull.state === 'string' ? parseInt(currentFull.state) || 0 : currentFull.state || 0,
            lap: typeof currentFull.lap === 'string' ? parseInt(currentFull.lap) || 1 : currentFull.lap || 1,
            timestamp: typeof currentFull.timestamp === 'string' ? parseFloat(currentFull.timestamp) || Date.now() : currentFull.timestamp || Date.now(),
            Ndata: typeof currentFull.Ndata === 'string' ? parseInt(currentFull.Ndata) || 0 : currentFull.Ndata || 0,
            map_cones: typeof currentFull.map_cones === 'string' 
                ? (currentFull.map_cones ? JSON.parse(currentFull.map_cones) : [])
                : (Array.isArray(currentFull.map_cones) ? currentFull.map_cones : []),
            active_cones: typeof currentFull.active_cones === 'string'
                ? (currentFull.active_cones ? JSON.parse(currentFull.active_cones) : [])
                : (Array.isArray(currentFull.active_cones) ? currentFull.active_cones : []),
            waypoint_array: typeof currentFull.waypoint_array === 'string'
                ? (currentFull.waypoint_array ? JSON.parse(currentFull.waypoint_array) : [])
                : (Array.isArray(currentFull.waypoint_array) ? currentFull.waypoint_array : []),
            green_points: typeof currentFull.green_points === 'string'
                ? (currentFull.green_points ? JSON.parse(currentFull.green_points) : [])
                : (Array.isArray(currentFull.green_points) ? currentFull.green_points : [])
        };
        
        // Add to full messages collection
        fullMessages.push(vehicleData);
        
        // Update base for next iteration
        lastFull = currentFull;
    }

    return fullMessages;
}    export async function uncompressJsonData(jsonData: CompactVehicleData[]): Promise<VehicleData[]> {
    return uncompactData(jsonData);
}