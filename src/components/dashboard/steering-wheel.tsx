"use client"

type SteeringWheelProps = {
  delta: number | undefined
}

export default function SteeringWheel({ delta }: SteeringWheelProps) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
      <h2 className="text-lg font-medium text-zinc-300 mb-2">Steering Wheel</h2>
      <div className="flex justify-center items-center h-40">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="55" fill="none" stroke="#27272A" strokeWidth="2" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#3F3F46" strokeWidth="1" />
          <line x1="60" y1="10" x2="60" y2="20" stroke="#3F3F46" strokeWidth="2" />
          <line x1="60" y1="100" x2="60" y2="110" stroke="#3F3F46" strokeWidth="2" />
          <line x1="10" y1="60" x2="20" y2="60" stroke="#3F3F46" strokeWidth="2" />
          <line x1="100" y1="60" x2="110" y2="60" stroke="#3F3F46" strokeWidth="2" />
          <g transform={`rotate(${(-(delta ?? 0)) * (180 / Math.PI)}, 60, 60)`}>
            <circle cx="60" cy="60" r="40" fill="#18181B" />
            <rect x="58" y="25" width="4" height="35" rx="2" fill="#EF4444" />
            <circle cx="60" cy="60" r="5" fill="#EF4444" />
          </g>
        </svg>
      </div>
    </div>
  )
}

