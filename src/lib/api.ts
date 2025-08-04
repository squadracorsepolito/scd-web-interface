import { Rosbag, RosbagUpload, RosbagJsonData, ApiResponse, PaginatedResponse } from '@/types/api-types'

const API_BASE_URL = 'http://localhost:8000'

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken')
  return token ? { 'Authorization': `Token ${token}` } : {}
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`
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
        localStorage.removeItem('authToken') // Clear invalid token
        return {
          error: 'Authentication required. Please login again.'
        }
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
    
    // Add text fields
    formData.append('track_name', rosbagData.track_name)
    formData.append('mission_name', rosbagData.mission_name)
    formData.append('number_of_evaluated_cones_yellow', rosbagData.number_of_evaluated_cones_yellow.toString())
    formData.append('number_of_evaluated_cones_blue', rosbagData.number_of_evaluated_cones_blue.toString())
    formData.append('is_successful', rosbagData.is_successful.toString())
    formData.append('avg_lap_time', rosbagData.avg_lap_time.toString())
    
    if (rosbagData.number_of_laps_completed !== undefined) {
      formData.append('number_of_laps_completed', rosbagData.number_of_laps_completed.toString())
    }
    
    // Add files
    if (rosbagData.rosbag_file) {
      formData.append('rosbag_file', rosbagData.rosbag_file)
    }
    if (rosbagData.yaml_file) {
      formData.append('yaml_file', rosbagData.yaml_file)
    }
    if (rosbagData.db_file) {
      formData.append('db_file', rosbagData.db_file)
    }

    try {
      const url = `${API_BASE_URL}/api/rosbags/`
      
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100
              onProgress(percentComplete)
            }
          })
        }
        
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ data })
            } catch {
              resolve({ error: 'Invalid response format' })
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              if (xhr.status === 401) {
                localStorage.removeItem('authToken')
                resolve({
                  error: 'Authentication required. Please login again.'
                })
                return
              }
              
              resolve({
                error: errorData.detail || `HTTP ${xhr.status}: ${xhr.statusText}`
              })
            } catch {
              resolve({
                error: `HTTP ${xhr.status}: ${xhr.statusText}`
              })
            }
          }
        }
        
        xhr.onerror = () => {
          resolve({
            error: 'Network error occurred'
          })
        }
        
        xhr.open('POST', url)
        
        // Add auth headers
        const token = localStorage.getItem('authToken')
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
  },

  // Delete a rosbag
  delete: async (id: number): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/api/rosbags/${id}/`, {
      method: 'DELETE',
    })
  },

  // Get rosbag JSON data
  getJsonData: async (id: number): Promise<ApiResponse<RosbagJsonData>> => {
    return apiRequest<RosbagJsonData>(`/api/rosbags/${id}/detail/`)
  },

  // Process rosbag to generate JSON data
  processRosbag: async (id: number): Promise<ApiResponse<RosbagJsonData>> => {
    return apiRequest<RosbagJsonData>(`/api/rosbags/${id}/detail/`, {
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
    
    // Add text fields
    formData.append('track_name', rosbagData.track_name)
    formData.append('mission_name', rosbagData.mission_name)
    formData.append('number_of_evaluated_cones_yellow', rosbagData.number_of_evaluated_cones_yellow.toString())
    formData.append('number_of_evaluated_cones_blue', rosbagData.number_of_evaluated_cones_blue.toString())
    formData.append('is_successful', rosbagData.is_successful.toString())
    formData.append('avg_lap_time', rosbagData.avg_lap_time.toString())
    
    if (rosbagData.number_of_laps_completed !== undefined) {
      formData.append('number_of_laps_completed', rosbagData.number_of_laps_completed.toString())
    }
    
    // Add files
    if (rosbagData.rosbag_file) {
      formData.append('rosbag_file', rosbagData.rosbag_file)
    }
    if (rosbagData.yaml_file) {
      formData.append('yaml_file', rosbagData.yaml_file)
    }
    if (rosbagData.db_file) {
      formData.append('db_file', rosbagData.db_file)
    }

    try {
      const url = `${API_BASE_URL}/api/rosbags/${id}/`
      
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100
              onProgress(percentComplete)
            }
          })
        }
        
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ data })
            } catch {
              resolve({ error: 'Invalid response format' })
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              
              if (xhr.status === 401) {
                localStorage.removeItem('authToken')
                resolve({
                  error: 'Authentication required. Please login again.'
                })
                return
              }
              
              resolve({
                error: errorData.detail || `HTTP ${xhr.status}: ${xhr.statusText}`
              })
            } catch {
              resolve({
                error: `HTTP ${xhr.status}: ${xhr.statusText}`
              })
            }
          }
        }
        
        xhr.onerror = () => {
          resolve({
            error: 'Network error occurred'
          })
        }
        
        xhr.open('PUT', url)
        
        // Add auth headers
        const token = localStorage.getItem('authToken')
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
  },

  // Update a rosbag (partial update)
  partialUpdate: async (
    id: number, 
    rosbagData: Partial<RosbagUpload>, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Rosbag>> => {
    const formData = new FormData()
    
    // Add text fields only if they exist
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
    
    // Add files
    if (rosbagData.rosbag_file) {
      formData.append('rosbag_file', rosbagData.rosbag_file)
    }
    if (rosbagData.yaml_file) {
      formData.append('yaml_file', rosbagData.yaml_file)
    }
    if (rosbagData.db_file) {
      formData.append('db_file', rosbagData.db_file)
    }

    try {
      const url = `${API_BASE_URL}/api/rosbags/${id}/`
      
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100
              onProgress(percentComplete)
            }
          })
        }
        
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve({ data })
            } catch {
              resolve({ error: 'Invalid response format' })
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              
              if (xhr.status === 401) {
                localStorage.removeItem('authToken')
                resolve({
                  error: 'Authentication required. Please login again.'
                })
                return
              }
              
              resolve({
                error: errorData.detail || `HTTP ${xhr.status}: ${xhr.statusText}`
              })
            } catch {
              resolve({
                error: `HTTP ${xhr.status}: ${xhr.statusText}`
              })
            }
          }
        }
        
        xhr.onerror = () => {
          resolve({
            error: 'Network error occurred'
          })
        }
        
        xhr.open('PATCH', url)
        
        // Add auth headers
        const token = localStorage.getItem('authToken')
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
  },

  // Download file by path
  downloadFile: async (filePath: string): Promise<ApiResponse<Blob>> => {
    try {
      const url = `${API_BASE_URL}${filePath}`
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
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
  const token = localStorage.getItem('authToken')
  return token !== null && token.length > 0
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
