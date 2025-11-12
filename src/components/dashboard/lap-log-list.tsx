"use client"

import { type LapLogEntry } from "@/types/vehicle-types"

type LapLogListProps = {
  entries: LapLogEntry[]
}

export default function LapLogList({ entries }: LapLogListProps) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
      <h2 className="text-lg font-medium text-zinc-300 mb-2">Lap Logs</h2>
      <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-400">Waiting for lap data...</p>
        ) : (
          entries.map((entry) => {
            const lapTimeValue = entry.data.lap_time
            const lapTime =
              typeof lapTimeValue === "string"
                ? lapTimeValue
                : typeof lapTimeValue === "number"
                  ? lapTimeValue.toString()
                  : undefined
            let formattedJson = entry.raw
            if (formattedJson) {
              try {
                const parsed = JSON.parse(formattedJson)
                formattedJson = JSON.stringify(parsed, null, 2)
              } catch {}
            } else {
              formattedJson = JSON.stringify(entry.data, null, 2)
            }

            return (
              <div
                key={`${entry.recordedAt}-${entry.lapNumber}`}
                className="rounded-md border border-zinc-700/40 bg-zinc-900/40 p-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-sm text-zinc-200">
                  <span className="font-medium">Lap {entry.lapNumber}</span>
                  {lapTime && lapTime.trim().length > 0 && (
                    <span className="font-mono text-xs text-zinc-400">{lapTime}</span>
                  )}
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-zinc-400 overflow-x-auto">
                  {formattedJson}
                </pre>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
