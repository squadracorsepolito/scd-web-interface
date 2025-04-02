// Define types for cone data
interface Cone {
    color: number;
    id: number;
    x: number;
    y: number;
  }
  
// Define the structure for vehicle data
interface VehicleData {
    x: string | number;
    y: string | number;
    yaw: string | number;
    v_y: string | number;
    yaw_r: string | number;
    s: string | number;
    v_s: string | number;
    speed: string | number;
    delta: string | number;
    throttle: string | number;
    state: string | number;
    lap: string | number;
    map_cones: Cone[] | string;
    active_cones: Cone[] | string;
    waypoint_array: Array<[number, number]> | string;
    green_points: Array<[number, number]> | string;
    latency: string | number;
    Ndata: string | number;
    timestamp: string | number;
}

// Define type for compact vehicle data (partial of full data)
type CompactVehicleData = Partial<VehicleData>;

// Default values for vehicle data fields
const DEFAULT_VALUES: Record<keyof Omit<VehicleData, 'key'>, string> = {
    x: "",
    y: "",
    yaw: "",
    v_y: "",
    yaw_r: "",
    s: "",
    v_s: "",
    speed: "",
    delta: "",
    throttle: "",
    state: "",
    lap: "",
    map_cones: "",
    active_cones: "",
    waypoint_array: "",
    green_points: "",
    latency: "",
    Ndata: "",
    timestamp: ""
};

export function uncompactData(compactList: CompactVehicleData[]): VehicleData[] {
    const fullMessages: VehicleData[] = [];
    let lastFull: VehicleData = {} as VehicleData;

    for (const compactMsg of compactList) {
        // Start with previous message as base
        const currentFull = { ...lastFull };
        
        // Update with new compact message data
        Object.assign(currentFull, compactMsg);
        
        // Ensure all default keys are present
        for (const [key, defaultValue] of Object.entries(DEFAULT_VALUES)) {
        if (!(key in currentFull)) {
            currentFull[key as keyof VehicleData] = defaultValue;
        }
        }
        
        // Add to full messages collection
        fullMessages.push(currentFull);
        
        // Update base for next iteration
        lastFull = currentFull;
    }

    return fullMessages;
    }

    export async function uncompressJsonData(jsonData: CompactVehicleData[]): Promise<VehicleData[]> {
    return uncompactData(jsonData);
}