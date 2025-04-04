import React, { useState, useEffect } from 'react'
import { WebSocketService } from '@/utils/websocket-service'
import { RewindIcon, FastForwardIcon, RepeatIcon, TimerResetIcon } from 'lucide-react'

interface ConnectionControlsProps {
  webSocketService: WebSocketService
  connected: boolean
  isReconnecting: boolean
  reconnectAttempt: number
}

export function ConnectionControls({ 
  webSocketService,
  connected,
  isReconnecting,
  reconnectAttempt
}: ConnectionControlsProps) {
  const [mode, setMode] = useState<'live' | 'replay'>(webSocketService.getConnectionMode())
  const [isPlaying, setIsPlaying] = useState(!webSocketService.isReplayPaused())
  const [speed, setSpeed] = useState(webSocketService.getReplaySpeed())
  const [progress, setProgress] = useState(0)
  const [framePosition, setFramePosition] = useState({ current: 0, total: 0 })
  const [savedReplayPosition, setSavedReplayPosition] = useState(0)
  const [loopEnabled, setLoopEnabled] = useState(false)

  const handleModeChange = (newMode: 'live' | 'replay') => {
    const currentMode = webSocketService.getConnectionMode();
    
    if (newMode === currentMode) {
      if (newMode === 'replay') {
        webSocketService.resetReplay();
      }
      return;
    }
    
    if (newMode === 'live') {
      // Save current replay position before switching to live
      if (currentMode === 'replay') {
        setSavedReplayPosition(webSocketService['replayIndex'] || 0);
        webSocketService.pauseReplay();
      }
      webSocketService.connect('live');
    } else {
      // Switching to replay mode
      const dataPath = '/data/data_compact.json'
      webSocketService.connect('replay', dataPath);
      
      // If position saved, restore it
      if (savedReplayPosition > 0) {
        setTimeout(() => {
          webSocketService.jumpToFrame?.(savedReplayPosition);
        }, 500);
      }
    }
    
    setMode(newMode);
    setIsPlaying(newMode === 'replay');
  }

  // Play/pause controls for replay
  const togglePlayPause = () => {
    if (isPlaying) {
      webSocketService.pauseReplay()
    } else {
      webSocketService.resumeReplay()
    }
    setIsPlaying(!isPlaying)
  }

  // Change replay speed
  const changeSpeed = (newSpeed: number) => {
    webSocketService.setReplaySpeed(newSpeed)
    setSpeed(newSpeed)
  }

  // Reset replay to beginning
  const resetReplay = () => {
    webSocketService.resetReplay()
    setIsPlaying(false)
  }

  // Toggle loop function
  const toggleLoop = () => setLoopEnabled(!loopEnabled)

  // Handle progress bar click
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickPosition = e.clientX - rect.left
    const percentClicked = clickPosition / rect.width
    const frameIndex = Math.floor(percentClicked * framePosition.total)
    
    if (webSocketService.jumpToFrame) {
      webSocketService.jumpToFrame(frameIndex)
    }
  }

  // Update progress indicator
  useEffect(() => {
    if (mode === 'replay') {
      const interval = setInterval(() => {
        const currentIndex = webSocketService['replayIndex'] || 0
        const totalLength = webSocketService['replayData']?.length || 1
        setProgress(Math.min(100, (currentIndex / totalLength) * 100))
        setFramePosition({ current: currentIndex, total: totalLength })
        
        if (loopEnabled && currentIndex >= totalLength - 1) {
          webSocketService.resetReplay()
          setTimeout(() => {
            webSocketService.resumeReplay()
            setIsPlaying(true)
          }, 100)
        }
      }, 500)
      
      return () => clearInterval(interval)
    }
  }, [mode, webSocketService, loopEnabled])
  
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-sm font-semibold text-zinc-300">Connection Mode</h3>
          {mode === 'replay' && (
            <div className="px-2 py-0.5 bg-red-600/20 border border-red-600/30 rounded text-xs font-medium text-red-400">
              Replay Mode
            </div>
          )}
          {mode === 'live' && (
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  connected 
                    ? "bg-green-500" 
                    : isReconnecting 
                      ? "bg-yellow-500 animate-pulse" 
                      : "bg-red-500"
                }`}
              ></div>
              <span className="text-xs font-medium text-zinc-400">
                {connected 
                  ? "Connected" 
                  : isReconnecting 
                    ? `Reconnecting (${reconnectAttempt})` 
                    : "Disconnected"}
              </span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-1">
          <button 
            className={`px-3 py-1.5 rounded-l text-sm font-medium transition-colors ${
              mode === 'live' 
                ? 'bg-red-600 text-white' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            onClick={() => handleModeChange('live')}
          >
            Live Connection
          </button>
          <button 
            className={`px-3 py-1.5 rounded-r text-sm font-medium transition-colors ${
              mode === 'replay' 
                ? 'bg-red-600 text-white' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            onClick={() => handleModeChange('replay')}
          >
            Data Replay
          </button>
        </div>
      </div>

      {mode === 'replay' && (
        <div className="replay-panel pt-2 border-t border-zinc-700/40">
          {/* Progress Bar */}
          <div className="relative mb-1">
            <div 
              className="relative h-1 w-full bg-zinc-800 rounded-full mb-1 overflow-hidden cursor-pointer"
              onClick={handleProgressBarClick}
            >
              <div 
                className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {/* Frame Counter */}
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Frame {framePosition.current}</span>
              <span>of {framePosition.total}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">      
            <div className="flex gap-1">        
              {/* Reset Button */}
              <button 
                onClick={resetReplay} 
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                aria-label="Reset"
              >
                <TimerResetIcon className="w-5 h-5" />
              </button>
  
              {/* Rewind Button */}
              <button 
                onClick={() => webSocketService.rewindReplay()}
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                aria-label="Rewind"
                disabled={mode !== 'replay'}
              >
                <RewindIcon className="w-5 h-5" />
              </button>

              {/* Play/Pause Button */}
              <button 
                onClick={togglePlayPause} 
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>
                
              {/* Fast Forward Button */}
              <button 
                onClick={() => webSocketService.fastForwardReplay()}
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                aria-label="Fast Forward"
                disabled={mode !== 'replay'}
              >
                <FastForwardIcon className="w-5 h-5" />
              </button>

              {/* Loop Button */}
              <button 
                onClick={toggleLoop} 
                className={`p-1.5 rounded transition-colors ${
                  loopEnabled 
                    ? 'bg-red-600 text-white' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
                aria-label={loopEnabled ? 'Loop Enabled' : 'Loop Disabled'}
                title={loopEnabled ? 'Loop Enabled' : 'Loop Disabled'}
              >
                <RepeatIcon className="w-4 h-4" />
              </button>
            </div>
            
            {/* Speed Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400">Speed:</span>
              <div className="flex rounded overflow-hidden border border-zinc-700">
                {[0.5, 1, 2, 5].map((speedOption) => (
                  <button 
                    key={speedOption}
                    className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                      speed === speedOption 
                        ? 'bg-red-600 text-white' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                    onClick={() => changeSpeed(speedOption)}
                  >
                    {speedOption}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}