"use client"

import { Loader2 } from "lucide-react"

type ProgressBarProps = {
  progress: number // 0-100
  isUploading: boolean
  description?: string
}

export function ProgressBar({ progress, isUploading, description }: ProgressBarProps) {
  if (!isUploading) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
        <div className="text-center space-y-4">
          {/* Loading spinner and title */}
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            <h3 className="text-lg font-semibold text-white">Uploading Test Data</h3>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">{Math.round(progress)}% complete</span>
              <span className="text-zinc-300 font-medium">
                {progress < 100 ? 'Uploading...' : 'Processing...'}
              </span>
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-zinc-400 text-center">
              {description}
            </p>
          )}

          {/* Information message */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-300 text-center">
              Large files may take several minutes to upload. Please don&apos;t close this tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
