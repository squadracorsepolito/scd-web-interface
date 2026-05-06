import { Rosbag, RosbagUpload, RosbagJsonData, ApiResponse, PaginatedResponse } from '@/types/api-types'
import { clearAuthSession, getApiBaseUrl, getAuthToken, isAuthenticated as hasAuthSession } from '@/lib/auth-session'

const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  return token ? { 'Authorization': `Token ${token}` } : {}
}

const buildApiUrl = (endpoint: string) => {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }

  return `${getApiBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

const handleUnauthorized = (): ApiResponse<never> => {
  clearAuthSession()
  return {
    error: 'Authentication required. Please login again.'
  }
}

const appendRosbagFormData = (formData: FormData, rosbagData: Partial<RosbagUpload>) => {
  if (rosbagData.track_name !== undefined) {
    formData.append('track_name', rosbagData.track_name)
  }
  if (rosbagData.mission_name !== undefined) {
    formData.append('mission_name', rosbagData.mission_name)
  }
  if (rosbagData.number_of_evaluated_cones_yellow !== undefined) {
    formData.append('number_of_evaluated_cones_yellow', rosbagData.number_of_evaluated_cones_yellow.toString())
  }
  if (rosbagData.number_of_evaluated_cones_blue !== undefined) {
    formData.append('number_of_evaluated_cones_blue', rosbagData.number_of_evaluated_cones_blue.toString())
  }
  if (rosbagData.is_successful !== undefined) {
    formData.append('is_successful', rosbagData.is_successful.toString())
  }
  if (rosbagData.avg_lap_time !== undefined) {
    formData.append('avg_lap_time', rosbagData.avg_lap_time.toString())
  }
  if (rosbagData.number_of_laps_completed !== undefined) {
    formData.append('number_of_laps_completed', rosbagData.number_of_laps_completed.toString())
  }
  if (rosbagData.zip_file) {
    formData.append('zip_file', rosbagData.zip_file)
  }
  if (rosbagData.yaml_file) {
    formData.append('yaml_file', rosbagData.yaml_file)
  }
  if (rosbagData.db_file) {
    formData.append('db_file', rosbagData.db_file)
  }
}

const sendMultipartRequest = async <T>(
  method: 'POST' | 'PUT' | 'PATCH',
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<ApiResponse<T>> => {
  try {
    const url = buildApiUrl(endpoint)

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress((event.loaded / event.total) * 100)
          }
        })
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = xhr.responseText ? JSON.parse(xhr.responseText) : null
            resolve({ data })
          } catch {
            resolve({ error: 'Invalid response format' })
          }
          return
        }

        if (xhr.status === 401) {
          resolve(handleUnauthorized())
          return
        }

        try {
          const errorData = JSON.parse(xhr.responseText)
          resolve({
            error: errorData.detail || `HTTP ${xhr.status}: ${xhr.statusText}`
          })
        } catch {
          resolve({
            error: `HTTP ${xhr.status}: ${xhr.statusText}`
          })
        }
      }

      xhr.onerror = () => {
        resolve({
          error: 'Network error occurred'
        })
      }

      xhr.open(method, url)

      const token = getAuthToken()
      if (token) {
        xhr.setRequestHeader('Authorization', `Token ${token}`)
      }

      xhr.send(formData)
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error occurred'
    }
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = buildApiUrl(endpoint)
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        return handleUnauthorized()
      }

      return {
        error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json().catch(() => {
      return null
    })
    return { data }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error occurred'
    }
  }
}

// Rosbags API
export const rosbagsApi = {
  // Get list of all rosbags with pagination
  getList: async (page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<Rosbag>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString()
    })
    const response = await apiRequest<PaginatedResponse<Rosbag>>(`/api/rosbags/?${params}`)
    return response
  },

  // Upload a new rosbag with progress tracking
  upload: async (
    rosbagData: RosbagUpload,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Rosbag>> => {
    const formData = new FormData()
    appendRosbagFormData(formData, rosbagData)
    return sendMultipartRequest<Rosbag>('POST', '/api/rosbags/', formData, onProgress)
  },

  // Delete a rosbag
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/api/rosbags/${id}/`, {
      method: 'DELETE',
    })
  },

  // Get rosbag JSON data
  getJsonData: async (id: number): Promise<ApiResponse<RosbagJsonData>> => {
    return apiRequest<RosbagJsonData>(`/api/rosbags/${id}/json/`)
  },

  // Process rosbag to generate JSON data
  processRosbag: async (id: number): Promise<ApiResponse<RosbagJsonData>> => {
    return apiRequest<RosbagJsonData>(`/api/rosbags/${id}/json/`, {
      method: 'GET'
    })
  },

  // Update a rosbag (full update)
  update: async (
    id: number,
    rosbagData: RosbagUpload,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Rosbag>> => {
    const formData = new FormData()
    appendRosbagFormData(formData, rosbagData)
    return sendMultipartRequest<Rosbag>('PUT', `/api/rosbags/${id}/`, formData, onProgress)
  },

  // Update a rosbag (partial update)
  partialUpdate: async (
    id: number,
    rosbagData: Partial<RosbagUpload>,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Rosbag>> => {
    const formData = new FormData()
    appendRosbagFormData(formData, rosbagData)
    return sendMultipartRequest<Rosbag>('PATCH', `/api/rosbags/${id}/`, formData, onProgress)
  },

  // Download file by path
  downloadFile: async (filePath: string): Promise<ApiResponse<Blob>> => {
    try {
      const url = buildApiUrl(filePath)
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          return handleUnauthorized()
        }

        return {
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const blob = await response.blob()
      return { data: blob }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}

// Utility functions
export const isAuthenticated = (): boolean => {
  return hasAuthSession()
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
