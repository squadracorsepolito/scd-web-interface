import { type VehicleData, type DataPoint, MAX_DATA_POINTS } from "@/types/vehicle-types"

type WebSocketCallbacks = {
  onConnect: () => void
  onDisconnect: () => void
  onReconnecting: (attempt: number) => void
  onData: (data: VehicleData) => void
  onSpeedData: (data: DataPoint[]) => void
  onThrottleData: (data: DataPoint[]) => void
}

export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private startTime: number
  private speedData: DataPoint[] = []
  private throttleData: DataPoint[] = []
  private callbacks: WebSocketCallbacks

  constructor(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks
    this.startTime = Date.now()
  }

  connect() {
    if (this.ws) {
      this.ws.close()
    }

    this.ws = new WebSocket("ws://127.0.0.1:9090")

    this.ws.onopen = () => {
      console.log("Connected to WebSocket")
      this.callbacks.onConnect()
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const receivedData = JSON.parse(event.data) as VehicleData
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
      } catch (error) {
        console.error("Error parsing WebSocket data:", error)
      }
    }

    this.ws.onclose = () => {
      console.log("Disconnected from WebSocket")
      this.callbacks.onDisconnect()

      // Don't try to reconnect if component is unmounting
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }

      // Implement exponential wait time for reconnection attempts
      const reconnectDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      console.log(`Attempting to reconnect in ${reconnectDelay}ms (attempt ${this.reconnectAttempts + 1})`)

      this.callbacks.onReconnecting(this.reconnectAttempts + 1)
      this.reconnectAttempts += 1

      this.reconnectTimeout = setTimeout(() => {
        this.connect()
      }, reconnectDelay)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }
}

