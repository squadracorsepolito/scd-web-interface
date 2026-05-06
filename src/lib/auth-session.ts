export type ApiServerSettings = {
  protocol: 'http' | 'https'
  host: string
  port: string
}

type AuthSession = {
  token: string
  username: string
  serverSettings: ApiServerSettings
}

const API_SERVER_SETTINGS_KEY = 'scd-web-api-server-settings'

let authSession: AuthSession | null = null
let currentServerSettings: ApiServerSettings | null = null

const canUseStorage = () => typeof window !== 'undefined'

const normalizeProtocol = (protocol?: string | null): 'http' | 'https' => {
  return protocol?.replace(':', '') === 'https' ? 'https' : 'http'
}

const validatePort = (port: string) => {
  if (!port) return

  const numericPort = Number(port)
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
    throw new Error('Port must be a number between 1 and 65535')
  }
}

export const parseApiServerSettings = (serverUrl: string, serverPort?: string): ApiServerSettings => {
  const trimmedUrl = serverUrl.trim().replace(/\/+$/, '')
  if (!trimmedUrl) {
    throw new Error('Server URL is required')
  }

  const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `http://${trimmedUrl}`
  const parsedUrl = new URL(urlWithProtocol)
  const port = (serverPort?.trim() || parsedUrl.port || '').trim()

  validatePort(port)

  return {
    protocol: normalizeProtocol(parsedUrl.protocol),
    host: parsedUrl.hostname,
    port,
  }
}

const settingsFromBaseUrl = (baseUrl: string | undefined): ApiServerSettings | null => {
  if (!baseUrl) return null

  try {
    return parseApiServerSettings(baseUrl)
  } catch {
    return null
  }
}

export const getDefaultApiServerSettings = (): ApiServerSettings => {
  const envBaseUrl = settingsFromBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL)
  if (envBaseUrl) return envBaseUrl

  return {
    protocol: normalizeProtocol(process.env.NEXT_PUBLIC_API_PROTOCOL),
    host: process.env.NEXT_PUBLIC_API_HOST || 'localhost',
    port: process.env.NEXT_PUBLIC_API_PORT || '8000',
  }
}

const loadSavedApiServerSettings = (): ApiServerSettings | null => {
  if (!canUseStorage()) return null

  try {
    const rawSettings = window.localStorage.getItem(API_SERVER_SETTINGS_KEY)
    if (!rawSettings) return null

    const parsedSettings = JSON.parse(rawSettings) as Partial<ApiServerSettings>
    if (!parsedSettings.host) return null

    return parseApiServerSettings(
      `${parsedSettings.protocol || 'http'}://${parsedSettings.host}`,
      parsedSettings.port || ''
    )
  } catch {
    return null
  }
}

export const getApiServerSettings = (): ApiServerSettings => {
  return currentServerSettings ?? loadSavedApiServerSettings() ?? getDefaultApiServerSettings()
}

export const buildApiBaseUrl = (settings: ApiServerSettings): string => {
  return settings.port
    ? `${settings.protocol}://${settings.host}:${settings.port}`
    : `${settings.protocol}://${settings.host}`
}

export const getApiBaseUrl = (): string => buildApiBaseUrl(getApiServerSettings())

export const saveApiServerSettings = (settings: ApiServerSettings) => {
  currentServerSettings = settings

  if (!canUseStorage()) return

  window.localStorage.setItem(API_SERVER_SETTINGS_KEY, JSON.stringify(settings))
}

export const setAuthSession = (session: AuthSession) => {
  authSession = session
  saveApiServerSettings(session.serverSettings)

  if (!canUseStorage()) return
  window.localStorage.removeItem('authToken')
  window.localStorage.removeItem('username')
  window.localStorage.removeItem('apiServerUrl')
  window.localStorage.removeItem('apiServerPort')
}

export const clearAuthSession = () => {
  authSession = null

  if (!canUseStorage()) return
  window.localStorage.removeItem('authToken')
  window.localStorage.removeItem('username')
}

export const getAuthToken = (): string | null => authSession?.token ?? null

export const getAuthUsername = (): string => authSession?.username ?? ''

export const isAuthenticated = (): boolean => Boolean(authSession?.token)