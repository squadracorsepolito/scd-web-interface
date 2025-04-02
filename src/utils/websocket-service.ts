import { type VehicleData, type DataPoint, MAX_DATA_POINTS } from "@/types/vehicle-types"
import { uncompressJsonData } from '@/utils/json-uncompressor';

type WebSocketCallbacks = {
  onConnect: () => void
  onDisconnect: () => void
  onReconnecting: (attempt: number) => void
  onData: (data: VehicleData) => void
  onSpeedData: (data: DataPoint[]) => void
  onThrottleData: (data: DataPoint[]) => void
}

type ConnectionMode = 'live' | 'replay'

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
  private intentionalDisconnect = false

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks
    this.startTime = Date.now()
  }

  async connect(mode: ConnectionMode = 'live', replayDataPath?: string) {
    this.connectionMode = mode;
    
    // Close any existing connection
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
    
    if (mode === 'live') {
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
    this.ws = new WebSocket("ws://127.0.0.1:9090")

    this.ws.onopen = () => {
      console.log("Connected to WebSocket")
      this.callbacks.onConnect()
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data) as VehicleData
        this.processData(receivedData)
      } catch (error) {
        console.error("Error parsing WebSocket data:", error)
      }
    }

    this.ws.onclose = () => {
      console.log("Disconnected from WebSocket")
      this.callbacks.onDisconnect()

      if (this.intentionalDisconnect || this.connectionMode === 'replay') {
        return
      }

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }

      const reconnectDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      console.log(`Attempting to reconnect in ${reconnectDelay}ms (attempt ${this.reconnectAttempts + 1})`)

      this.callbacks.onReconnecting(this.reconnectAttempts + 1)
      this.reconnectAttempts += 1

      this.reconnectTimeout = setTimeout(() => {
        this.connectToLive()
      }, reconnectDelay)
    }
  }

  private processData(receivedData: VehicleData) {
    this.callbacks.onData(receivedData)

    const now = Date.now()
    const timeInSeconds = (now - this.startTime) / 1000

    if (receivedData.speed !== undefined) {
      this.speedData.push({ value: receivedData.speed, timestamp: timeInSeconds })
      if (this.speedData.length > MAX_DATA_POINTS) {
        this.speedData = this.speedData.slice(-MAX_DATA_POINTS)
      }
      this.callbacks.onSpeedData([...this.speedData])
    }

    if (receivedData.throttle !== undefined) {
      this.throttleData.push({ value: receivedData.throttle, timestamp: timeInSeconds })
      if (this.throttleData.length > MAX_DATA_POINTS) {
        this.throttleData = this.throttleData.slice(-MAX_DATA_POINTS)
      }
      this.callbacks.onThrottleData([...this.throttleData])
    }
  }

  private startReplay() {
    if (this.replayInterval) {
      clearInterval(this.replayInterval)
    }
    
    this.replayPaused = false
    
    const interval = 100 / this.replaySpeed
    
    this.replayInterval = setInterval(() => {
      if (this.replayPaused) return
      
      if (this.replayIndex < this.replayData.length) {
        const data = this.replayData[this.replayIndex]
        this.processData(data)
        this.replayIndex++
      } else {
        this.pauseReplay()
        console.log("Replay finished")
      }
    }, interval)
  }

  pauseReplay() {
    this.replayPaused = true
  }

  resumeReplay() {
    if (this.connectionMode === 'replay') {
      if (this.replayIndex >= this.replayData.length) {
        this.replayIndex = 0
      }
      this.replayPaused = false
      if (!this.replayInterval) {
        this.startReplay()
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
}