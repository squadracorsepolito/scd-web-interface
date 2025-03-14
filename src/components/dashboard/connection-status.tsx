"use client"

type ConnectionStatusProps = {
  connected: boolean
  isReconnecting: boolean
  reconnectAttempt: number
}

export default function ConnectionStatus({ connected, isReconnecting, reconnectAttempt }: ConnectionStatusProps) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
      <h2 className="text-lg font-medium text-zinc-300 mb-2">Connection Status</h2>
      <div className="flex items-center">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            connected ? "bg-green-500" : isReconnecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
          }`}
        ></div>
        <span>
          {connected ? "Connected" : isReconnecting ? `Reconnecting (attempt ${reconnectAttempt})` : "Disconnected"}
        </span>
      </div>
    </div>
  )
}

