"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, LogIn, AlertCircle, CheckCircle, Settings, ChevronDown, ChevronUp } from "lucide-react"
import {
  buildApiBaseUrl,
  getApiServerSettings,
  parseApiServerSettings,
  setAuthSession,
} from "@/lib/auth-session"

type AuthModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const getInitialCredentials = () => {
  const settings = getApiServerSettings()

  return {
    username: "",
    password: "",
    serverUrl: settings.host,
    serverPort: settings.port,
  }
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [credentials, setCredentials] = useState(getInitialCredentials)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!isOpen) return null

  const handleInputChange = (field: 'username' | 'password' | 'serverUrl' | 'serverPort', value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
    setError(null) // Clear error when user types
    setSuccessMessage(null) // Clear success message when user types
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!credentials.username || !credentials.password) {
      setError("Please enter both username and password")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const serverSettings = parseApiServerSettings(credentials.serverUrl, credentials.serverPort)
      const apiUrl = buildApiBaseUrl(serverSettings)
      const response = await fetch(`${apiUrl}/api-token-auth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        }),
      })

      if (response.ok) {
        const data = await response.json() as { token?: string }
        if (data.token) {
          setAuthSession({
            token: data.token,
            username: credentials.username,
            serverSettings,
          })
          setSuccessMessage('Authentication successful!')
          
          // Wait a moment to show success message, then proceed
          setTimeout(() => {
            onSuccess()
            handleClose()
          }, 1000)
        } else {
          setError('Invalid response from server')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.detail || 'Invalid credentials')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error. Please check if the server is running and the URL/port are correct.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setCredentials(getInitialCredentials())
    setError(null)
    setSuccessMessage(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-xl font-semibold text-white">Authentication Required</h2>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <p className="text-sm text-zinc-400 mb-4">
            Please enter your credentials to access the test management system.
          </p>

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-green-600/20 border border-green-600/30">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-600/20 border border-red-600/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
              placeholder="Enter your username"
              disabled={isLoading || successMessage !== null}
              autoComplete="username"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
              placeholder="Enter your password"
              disabled={isLoading || successMessage !== null}
              autoComplete="current-password"
            />
          </div>

          {/* Server Configuration Toggle */}
          <div className="border-t border-zinc-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left p-2 rounded-md hover:bg-zinc-800/50 transition-colors"
              disabled={isLoading || successMessage !== null}
            >
              <span className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Server Configuration
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>
            
            {/* Advanced Server Settings */}
            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3 bg-zinc-800/30 rounded-md border border-zinc-700/50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Server URL
                    </label>
                    <input
                      type="text"
                      value={credentials.serverUrl}
                      onChange={(e) => handleInputChange('serverUrl', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                      placeholder="localhost"
                      disabled={isLoading || successMessage !== null}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Port
                    </label>
                    <input
                      type="number"
                      value={credentials.serverPort}
                      onChange={(e) => handleInputChange('serverPort', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                      placeholder="8000"
                      min="1"
                      max="65535"
                      disabled={isLoading || successMessage !== null}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Default: localhost:8000 - Configure if your API server is running on a different host or port
                </p>
              </div>
            )}
          </div>

          {/* Login Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              <strong>Note:</strong> You need staff permissions to access the test management features.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading || successMessage !== null}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password || successMessage !== null}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-zinc-700 disabled:text-zinc-500"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : successMessage ? (
                'Success!'
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
