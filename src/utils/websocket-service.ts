import { type VehicleData, type DataPoint, MAX_DATA_POINTS } from "@/types/vehicle-types"
import { uncompressJsonData } from '@/utils/json-uncompressor';

type WebSocketCallbacks = {
  onConnect: () => void
  onDisconnect: () => void
  onReconnecting: (attempt: number) => void
  onData: (data: VehicleData) => void
  onSpeedData: (data: DataPoint[]) => void
  onThrottleData: (data: DataPoint[]) => void
  onLapLog?: (payload: LapLogMessage) => void
  onReset?: () => void
}

type IncomingPacket = Partial<VehicleData> & { log?: unknown }

type LapLogMessage = {
  payload: Record<string, unknown>
  raw: string
  lapNumber: number | null
}

type ConnectionMode = 'live' | 'replay'

type ConnectionConfig = {
  ip: string
  port: number
}

const DEFAULT_WS_HOST = process.env.NEXT_PUBLIC_WS_DEFAULT_HOST || '127.0.0.1'
const DEFAULT_WS_PORT = Number(process.env.NEXT_PUBLIC_WS_DEFAULT_PORT) || 9090

export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private startTime: number
  private speedData: DataPoint[] = []
  private throttleData: DataPoint[] = []
  private callbacks: WebSocketCallbacks
  // Replay
  private connectionMode: ConnectionMode = 'live'
  private replayData: VehicleData[] = []
  private replayIndex = 0
  private replayInterval: NodeJS.Timeout | null = null
  private replaySpeed = 1
  private replayPaused = false
  private isTestReplay = false
  private intentionalDisconnect = false
  private connectionConfig: ConnectionConfig = { ip: DEFAULT_WS_HOST, port: DEFAULT_WS_PORT }
  private liveSnapshot: VehicleData | null = null
  private static readonly STATIC_MAP_STORAGE_KEY = 'scd-web-static-map-data'
  private staticMapData: Pick<VehicleData, 'map_cones' | 'active_cones' | 'waypoint_array' | 'green_points'> | null = null

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks
    this.startTime = Date.now()
    this.loadStaticMapData()
  }

  async connect(mode: ConnectionMode = 'live', replayDataPath?: string, config?: ConnectionConfig) {
    this.connectionMode = mode;
    
    if (config) {
      this.connectionConfig = config;
    }
    
    // Close any existing connection
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
    
    if (mode === 'live') {
      this.isTestReplay = false;
      this.resetSessionState();
      this.connectToLive();
    } else if (mode === 'replay' && replayDataPath) {
      try {
        // Determine if we're loading compressed data
        const isCompressed = replayDataPath.includes('compact');
        
        const response = await fetch(replayDataPath);
        if (!response.ok) throw new Error(`Failed to load replay data: ${response.status}`);
        
        let jsonData = await response.json();
        
        if (isCompressed) {
          jsonData = await uncompressJsonData(jsonData);
        }

        this.isTestReplay = false;
        this.replayData = jsonData;
        this.replayIndex = 0;
        this.replayPaused = false;
        this.startReplay();
        
        this.callbacks.onConnect();
      } catch (error) {
        console.error('Error loading replay data:', error);
        this.callbacks.onDisconnect();
      }
    }
  }

  private connectToLive() {
    if (this.ws) {
      this.ws.close()
    }
    
    this.intentionalDisconnect = false
    const wsUrl = `ws://${this.connectionConfig.ip}:${this.connectionConfig.port}`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      const wasReconnecting = this.reconnectAttempts > 0
      if (wasReconnecting) {
        this.resetSessionState()
      }
      this.callbacks.onConnect()
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data) as IncomingPacket
        this.processData(receivedData)
      } catch (error) {
        console.error("Error parsing WebSocket data:", error)
      }
    }

    this.ws.onclose = () => {
      this.callbacks.onDisconnect()

      if (this.intentionalDisconnect || this.connectionMode === 'replay') {
        return
      }

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }

      const reconnectDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

      this.callbacks.onReconnecting(this.reconnectAttempts + 1)
      this.reconnectAttempts += 1

      this.reconnectTimeout = setTimeout(() => {
        this.connectToLive()
      }, reconnectDelay)
    }
  }

  private processData(receivedData: IncomingPacket) {
    const lapLogMessage = this.extractLapLogPayload(receivedData)
    if (lapLogMessage && this.callbacks.onLapLog) {
      this.callbacks.onLapLog(lapLogMessage)
    }

    const vehicleUpdate = this.stripLogFromPacket(receivedData)
    if (!this.hasVehiclePayload(vehicleUpdate)) {
      return
    }

    const normalizedData = this.connectionMode === 'live'
      ? this.mergeLivePacket(vehicleUpdate)
      : vehicleUpdate as VehicleData

    if (!normalizedData) {
      return
    }

    const payloadForCallback: VehicleData = this.connectionMode === 'live'
      ? { ...normalizedData }
      : normalizedData as VehicleData

    this.callbacks.onData(payloadForCallback)

    const now = Date.now()
    const timeInSeconds = (now - this.startTime) / 1000

    const hasSpeedUpdate = this.connectionMode !== 'live' || Object.prototype.hasOwnProperty.call(receivedData, 'speed')
    if (hasSpeedUpdate && normalizedData.speed !== undefined) {
      this.speedData.push({ value: normalizedData.speed, timestamp: timeInSeconds })
      if (this.speedData.length > MAX_DATA_POINTS) {
        this.speedData = this.speedData.slice(-MAX_DATA_POINTS)
      }
      this.callbacks.onSpeedData([...this.speedData])
    }

    const hasThrottleUpdate = this.connectionMode !== 'live' || Object.prototype.hasOwnProperty.call(receivedData, 'throttle')
    if (hasThrottleUpdate && normalizedData.throttle !== undefined) {
      this.throttleData.push({ value: normalizedData.throttle, timestamp: timeInSeconds })
      if (this.throttleData.length > MAX_DATA_POINTS) {
        this.throttleData = this.throttleData.slice(-MAX_DATA_POINTS)
      }
      this.callbacks.onThrottleData([...this.throttleData])
    }
  }

  private extractLapLogPayload(packet: IncomingPacket): LapLogMessage | null {
    if (!Object.prototype.hasOwnProperty.call(packet, 'log')) {
      return null
    }

    const rawLog = packet.log
    if (rawLog === null || rawLog === undefined) {
      return null
    }

    let parsedLog: Record<string, unknown> | null = null
    let rawRepresentation = ''

    if (typeof rawLog === 'string') {
      try {
        const candidate = JSON.parse(rawLog)
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
          parsedLog = candidate as Record<string, unknown>
          rawRepresentation = rawLog
        }
      } catch (error) {
        console.warn('Failed to parse log payload string:', error)
        return null
      }
    } else if (typeof rawLog === 'object' && !Array.isArray(rawLog)) {
      parsedLog = rawLog as Record<string, unknown>
      rawRepresentation = JSON.stringify(rawLog)
    }

    if (!parsedLog) {
      return null
    }

    const lapTime = parsedLog.lap_time
    const isEmptyLapTime =
      lapTime === null ||
      lapTime === undefined ||
      (typeof lapTime === 'string' && lapTime.trim().length === 0)

    if (isEmptyLapTime) {
      return null
    }

    const rawLapValue = typeof packet.lap === 'number' ? Math.floor(packet.lap) : null
    const previousLap = rawLapValue !== null ? rawLapValue - 1 : null
    const resolvedLapNumber = previousLap !== null ? Math.max(1, previousLap) : null

    return {
      payload: parsedLog,
      raw: rawRepresentation || JSON.stringify(parsedLog),
      lapNumber: resolvedLapNumber,
    }
  }

  private stripLogFromPacket(packet: IncomingPacket): Partial<VehicleData> {
    const vehicleFields = { ...packet } as Partial<VehicleData> & { log?: unknown }
    if ('log' in vehicleFields) {
      delete vehicleFields.log
    }
    return vehicleFields
  }

  private hasVehiclePayload(update: Partial<VehicleData>): boolean {
    return Object.keys(update).length > 0
  }

  private startReplay() {
    if (this.replayInterval) {
      clearInterval(this.replayInterval)
    }
    
    this.replayPaused = false
    
    if (this.isTestReplay && this.replayData.length > 0) {
      this.scheduleNextReplayFrame()
    } else {
      // Use different timing for file replays vs test replays (fallback)
      const baseInterval = this.isTestReplay ? 16.67 : 100
      const interval = baseInterval / this.replaySpeed
      
      this.replayInterval = setInterval(() => {
        if (this.replayPaused) return
        
        if (this.replayIndex < this.replayData.length) {
          const data = this.replayData[this.replayIndex]
          this.processData(data)
          this.replayIndex++
        } else {
          this.pauseReplay()
        }
      }, interval)
    }
  }

  private scheduleNextReplayFrame() {
    if (this.replayPaused || this.replayIndex >= this.replayData.length) {
      if (this.replayIndex >= this.replayData.length) {
        this.pauseReplay()
      }
      return
    }

    const currentData = this.replayData[this.replayIndex]
    
    // Process current frame
    this.processData(currentData)
    this.replayIndex++

    // Calculate delay to next frame
    if (this.replayIndex < this.replayData.length) {
      const nextData = this.replayData[this.replayIndex]
      const currentTimestamp = currentData.timestamp
      const nextTimestamp = nextData.timestamp
      
      // Calculate the time difference between frames in milliseconds
      let timeDiff = nextTimestamp - currentTimestamp
      
      // Handle edge cases
      if (timeDiff <= 0 || timeDiff > 10000) { // If invalid timestamp diff, fallback to 16.67ms (60fps)
        timeDiff = 16.67
      }
      
      // Apply replay speed modifier
      const adjustedDelay = timeDiff / this.replaySpeed
      
      // Schedule next frame
      this.replayInterval = setTimeout(() => {
        this.scheduleNextReplayFrame()
      }, adjustedDelay)
    } else {
      this.pauseReplay()
    }
  }

  pauseReplay() {
    this.replayPaused = true
    if (this.replayInterval) {
      clearInterval(this.replayInterval)
      clearTimeout(this.replayInterval)
      this.replayInterval = null
    }
  }

  resumeReplay() {
    if (this.connectionMode === 'replay') {
      if (this.replayIndex >= this.replayData.length) {
        this.replayIndex = 0
      }
      this.replayPaused = false
      if (!this.replayInterval) {
        if (this.isTestReplay && this.replayData.length > 0) {
          this.scheduleNextReplayFrame()
        } else {
          this.startReplay()
        }
      }
    }
  }

  setReplaySpeed(speed: number) {
    if (speed > 0) {
      this.replaySpeed = speed
      if (this.connectionMode === 'replay' && !this.replayPaused) {
        this.startReplay()
      }
    }
  }

  resetReplay() {
    this.replayIndex = 0
    this.startTime = Date.now()
    this.speedData = []
    this.throttleData = []
  }

  rewindReplay(frames: number = 10) {
    if (this.connectionMode === 'replay') {
      this.replayIndex = Math.max(0, this.replayIndex - frames)
      
      if (!this.replayPaused && this.replayData[this.replayIndex]) {
        this.processData(this.replayData[this.replayIndex])
      }
    }
  }

  fastForwardReplay(frames: number = 10) {
    if (this.connectionMode === 'replay') {
      this.replayIndex = Math.min(this.replayData.length - 1, this.replayIndex + frames)
      
      if (!this.replayPaused && this.replayData[this.replayIndex]) {
        this.processData(this.replayData[this.replayIndex])
      }
      
      if (this.replayIndex >= this.replayData.length - 1) {
        this.pauseReplay()
      }
    }
  }
  
  jumpToFrame(frameIndex: number) {
    if (this.connectionMode !== 'replay' || !this.replayData.length) {
      return;
    }
    
    this.replayIndex = Math.max(0, Math.min(frameIndex, this.replayData.length - 1));
    
    if (this.replayPaused) {
      const data = this.replayData[this.replayIndex];
      this.processData(data);
    }
  }

  disconnect() {
    if (this.replayInterval) {
      clearInterval(this.replayInterval)
      clearTimeout(this.replayInterval)
      this.replayInterval = null
    }

    // Clean up WebSocket connection
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.clearLiveSnapshot()
  }

  getConnectionMode(): ConnectionMode {
    return this.connectionMode
  }

  isReplayPaused(): boolean {
    return this.replayPaused
  }

  getReplaySpeed(): number {
    return this.replaySpeed
  }

  connectWithCompressedReplay(replayDataPath: string) {
    this.connect('replay', replayDataPath);
  }

  startTestReplay(testData: VehicleData[]) {
    // Close any existing connection
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }

    // Set up test replay mode with faster timing (60 packets/second)
    this.connectionMode = 'replay';
    this.isTestReplay = true;
    this.replayData = testData;
    this.replayIndex = 0;
    this.replayPaused = false;
    this.startTime = Date.now();
    this.speedData = [];
    this.throttleData = [];

    // Simulate connection
    this.callbacks.onConnect();
    this.startReplay();
  }

  getConnectionConfig(): ConnectionConfig {
    return { ...this.connectionConfig }
  }

  setConnectionConfig(config: ConnectionConfig) {
    this.connectionConfig = config
  }

  private mergeLivePacket(update: VehicleData | Partial<VehicleData>): VehicleData | null {
    if (!this.liveSnapshot) {
      const initialPacket = this.applyStaticDataToInitialPacket(update)
      if (!initialPacket || !this.isValidInitialLivePacket(initialPacket)) {
        if (!this.staticMapData) {
          this.liveSnapshot = this.buildFallbackLivePacket(update)
          this.updateStaticMapData(this.liveSnapshot)
          return this.liveSnapshot
        }

        console.warn("Initial live packet missing required map data; waiting for full payload before rendering.")
        return null
      }
      this.liveSnapshot = initialPacket
      this.updateStaticMapData(initialPacket)
      return this.liveSnapshot
    }

    const snapshot = this.liveSnapshot

    this.liveSnapshot = {
      ...snapshot,
      ...update,
      map_cones: this.resolveArrayField('map_cones', update, snapshot.map_cones),
      active_cones: this.resolveArrayField('active_cones', update, snapshot.active_cones),
      waypoint_array: this.resolveArrayField('waypoint_array', update, snapshot.waypoint_array),
      green_points: this.resolveArrayField('green_points', update, snapshot.green_points)
    }

    this.updateStaticMapData(this.liveSnapshot)

    return this.liveSnapshot
  }

  private isValidInitialLivePacket(packet: VehicleData | Partial<VehicleData>): packet is VehicleData {
    if (!packet) {
      return false
    }

    const requiredArrayKeys: Array<keyof VehicleData> = ['map_cones', 'active_cones', 'waypoint_array']

    return requiredArrayKeys.every((key) => Array.isArray((packet as VehicleData)[key]))
  }

  private applyStaticDataToInitialPacket(update: VehicleData | Partial<VehicleData>): VehicleData | null {
    const basePacket = { ...(update as VehicleData) }

    let mapCones = this.resolveInitialRequiredArray('map_cones', update)
    let activeCones = this.resolveInitialRequiredArray('active_cones', update)
    let waypoints = this.resolveInitialRequiredArray('waypoint_array', update)

    if (!mapCones || !activeCones || !waypoints) {
      if (this.staticMapData) {
        return null
      }

      mapCones = mapCones ?? []
      activeCones = activeCones ?? []
      waypoints = waypoints ?? []
    }

    basePacket.map_cones = mapCones
    basePacket.active_cones = activeCones
    basePacket.waypoint_array = waypoints
    basePacket.green_points = this.resolveArrayField('green_points', update, basePacket.green_points)

    return basePacket
  }

  private resolveInitialRequiredArray<K extends 'map_cones' | 'active_cones' | 'waypoint_array'>(
    field: K,
    update: VehicleData | Partial<VehicleData>
  ): VehicleData[K] | null {
    const updateValue = (update as VehicleData)[field]
    if (Array.isArray(updateValue) && updateValue.length > 0) {
      return updateValue
    }

    const cachedValue = this.staticMapData?.[field]
    if (Array.isArray(cachedValue) && cachedValue.length > 0) {
      return cachedValue
    }

    if (Array.isArray(updateValue)) {
      return updateValue
    }

    return null
  }

  private resolveArrayField<K extends keyof Pick<VehicleData, 'map_cones' | 'active_cones' | 'waypoint_array' | 'green_points'>>(
    field: K,
    update: VehicleData | Partial<VehicleData>,
    previousValue: VehicleData[K]
  ): VehicleData[K] {
    if (Object.prototype.hasOwnProperty.call(update, field)) {
      const newValue = (update as VehicleData)[field]
      if (Array.isArray(newValue)) {
        if (newValue.length > 0) {
          return newValue
        }
        if (field === 'green_points') {
          return (previousValue ?? this.staticMapData?.green_points) as VehicleData[K]
        }
        return (previousValue ?? this.staticMapData?.[field] ?? []) as VehicleData[K]
      }
      if (newValue) {
        return newValue
      }
    }

    if (field === 'green_points') {
      return (previousValue ?? this.staticMapData?.green_points) as VehicleData[K]
    }

    const cachedValue = this.staticMapData?.[field]
    if (Array.isArray(cachedValue) && cachedValue.length > 0) {
      return cachedValue as VehicleData[K]
    }

    return previousValue
  }

  private loadStaticMapData() {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const raw = window.localStorage.getItem(WebSocketService.STATIC_MAP_STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const { map_cones, active_cones, waypoint_array, green_points } = parsed as Partial<VehicleData>
        if (Array.isArray(map_cones) && Array.isArray(active_cones) && Array.isArray(waypoint_array)) {
          this.staticMapData = {
            map_cones,
            active_cones,
            waypoint_array,
            green_points: Array.isArray(green_points) ? green_points : undefined
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cached map data from storage:', error)
    }
  }

  private persistStaticMapData() {
    if (typeof window === 'undefined' || !this.staticMapData) {
      return
    }

    try {
      window.localStorage.setItem(
        WebSocketService.STATIC_MAP_STORAGE_KEY,
        JSON.stringify(this.staticMapData)
      )
    } catch (error) {
      console.warn('Failed to persist map data to storage:', error)
    }
  }

  private updateStaticMapData(data: VehicleData) {
    if (this.connectionMode !== 'live') {
      return
    }

    const nextStaticData = {
      map_cones: Array.isArray(data.map_cones) && data.map_cones.length > 0 ? data.map_cones : this.staticMapData?.map_cones ?? [],
      active_cones: Array.isArray(data.active_cones) && data.active_cones.length > 0 ? data.active_cones : this.staticMapData?.active_cones ?? [],
      waypoint_array: Array.isArray(data.waypoint_array) && data.waypoint_array.length > 0 ? data.waypoint_array : this.staticMapData?.waypoint_array ?? [],
      green_points: Array.isArray(data.green_points) && data.green_points.length > 0
        ? data.green_points
        : this.staticMapData?.green_points
    }

    this.staticMapData = nextStaticData
    this.persistStaticMapData()
  }

  private resetLiveSessionState() {
    this.startTime = Date.now()
    this.speedData = []
    this.throttleData = []
    this.clearLiveSnapshot()
  }

  private resetSessionState() {
    this.resetLiveSessionState()
    this.clearStaticMapData()
    this.callbacks.onReset?.()
  }

  private clearLiveSnapshot() {
    this.liveSnapshot = null
  }

  private clearStaticMapData() {
    this.staticMapData = null

    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem(WebSocketService.STATIC_MAP_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear cached map data from storage:', error)
    }
  }

  private buildFallbackLivePacket(update: VehicleData | Partial<VehicleData>): VehicleData {
    return {
      yaw: update.yaw ?? 0,
      x: update.x ?? 0,
      y: update.y ?? 0,
      speed: update.speed ?? 0,
      delta: update.delta ?? 0,
      throttle: update.throttle ?? 0,
      state: update.state ?? 0,
      lap: update.lap ?? 0,
      timestamp: update.timestamp ?? Date.now(),
      Ndata: update.Ndata ?? 0,
      map_cones: Array.isArray(update.map_cones) ? update.map_cones : [],
      active_cones: Array.isArray(update.active_cones) ? update.active_cones : [],
      waypoint_array: Array.isArray(update.waypoint_array) ? update.waypoint_array : [],
      green_points: Array.isArray(update.green_points) ? update.green_points : undefined,
    }
  }
}