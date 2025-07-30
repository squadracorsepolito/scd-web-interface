"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Upload, FileText, Play, Trash2, Download, ArrowLeft, AlertCircle, LogOut, Edit } from "lucide-react"
import { rosbagsApi, formatDate } from "@/lib/api"
import { Rosbag, RosbagUpload } from "@/types/api-types"
import { readFileAsArrayBuffer, createBlobFromArrayBuffer } from "@/utils/file-utils"
import { WebSocketService } from "@/utils/websocket-service"
import { VehicleData } from "@/types/vehicle-types"
import { uncompressJsonData, type CompactVehicleData } from "@/utils/json-uncompressor"

type EditData = {
  rosbag_file?: File
  yaml_file?: File
  db_file?: File
  track_name: string
  mission_name: string
  number_of_evaluated_cones_yellow: number
  number_of_evaluated_cones_blue: number
  avg_lap_time: number
  number_of_laps_completed?: number
  is_successful: boolean
}

type UploadData = {
  rosbag_file?: File;
  yaml_file?: File;
  db_file?: File;
  trackName: string; 
  missionName: string;
  numberOfEvaluatedConesYellow: number;
  numberOfEvaluatedConesBlue: number;
  avgLapTime: number;
  numberOfLapsCompleted?: number;
  isSuccessful: boolean;
}

type TestsDashboardProps = {
  onViewChange: (view: 'dashboard' | 'tests') => void
  webSocketService?: WebSocketService | null
  setIsUploadModalOpen: (open: boolean) => void
  onUploadHandlerReady?: (handler: (data: UploadData, onProgress?: (progress: number) => void) => Promise<void>) => void
  setIsEditModalOpen: (open: boolean) => void
  setEditingRosbag: (rosbag: Rosbag | null) => void
  onEditSuccessHandlerReady?: (handler: (updatedRosbag: Rosbag) => void) => void
  onUpdateHandlerReady?: (handler: (id: number, data: Partial<EditData>, onProgress?: (progress: number) => void) => Promise<void>) => void
  onRefreshHandlerReady?: (handler: () => Promise<void>) => void
}

export default function TestsDashboard({ 
  onViewChange, 
  webSocketService, 
  setIsUploadModalOpen, 
  onUploadHandlerReady,
  setIsEditModalOpen,
  setEditingRosbag,
  onEditSuccessHandlerReady,
  onUpdateHandlerReady,
  onRefreshHandlerReady
}: TestsDashboardProps) {
  const [rosbags, setRosbags] = useState<Rosbag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingTests, setProcessingTests] = useState<Set<number>>(new Set())
  const [username, setUsername] = useState<string>('')

  const loadRosbags = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await rosbagsApi.getList()
      if (response.data) {
        // Sort by timestamp descending (newest first)
        const sortedRosbags = response.data.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        setRosbags(sortedRosbags)
      } else {
        setError(response.error || 'Failed to load tests')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error loading rosbags:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load rosbags on component mount
  useEffect(() => {
    loadRosbags()
    // Get username from localStorage
    const storedUsername = localStorage.getItem('username')
    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [loadRosbags])

  const handleUpload = useCallback(async (data: UploadData, onProgress?: (progress: number) => void) => {
    try {
      console.log("Upload data received:", data)
      
      const rosbagData: RosbagUpload = {
        track_name: data.trackName,
        mission_name: data.missionName,
        number_of_evaluated_cones_yellow: data.numberOfEvaluatedConesYellow,
        number_of_evaluated_cones_blue: data.numberOfEvaluatedConesBlue,
        avg_lap_time: data.avgLapTime,
        number_of_laps_completed: data.numberOfLapsCompleted,
        is_successful: data.isSuccessful
      }

      // Read file contents as binary data and add them if they exist
      if (data.rosbag_file) {
        const rosbagContent = await readFileAsArrayBuffer(data.rosbag_file)
        rosbagData.rosbag_file = createBlobFromArrayBuffer(rosbagContent, data.rosbag_file.type)
        console.log("Added rosbag file content:", data.rosbag_file.name, "Size:", rosbagContent.byteLength, "bytes", "Type:", data.rosbag_file.type)
        console.log("First 100 bytes:", new Uint8Array(rosbagContent.slice(0, 100)))
      }
      if (data.yaml_file) {
        const yamlContent = await readFileAsArrayBuffer(data.yaml_file)
        rosbagData.yaml_file = createBlobFromArrayBuffer(yamlContent, data.yaml_file.type)
        console.log("Added yaml file content:", data.yaml_file.name, "Size:", yamlContent.byteLength, "bytes", "Type:", data.yaml_file.type)
        // For text files, also log the beginning as text
        const textContent = new TextDecoder().decode(yamlContent.slice(0, 200))
        console.log("YAML content preview:", textContent.substring(0, 100) + "...")
      }
      if (data.db_file) {
        const dbContent = await readFileAsArrayBuffer(data.db_file)
        rosbagData.db_file = createBlobFromArrayBuffer(dbContent, data.db_file.type)
        console.log("Added db file content:", data.db_file.name, "Size:", dbContent.byteLength, "bytes", "Type:", data.db_file.type)
        console.log("First 100 bytes:", new Uint8Array(dbContent.slice(0, 100)))
      }

      console.log("Final rosbag data for API:", rosbagData)
      
      const response = await rosbagsApi.upload(rosbagData, onProgress)
      if (response.data) {
        // Add new rosbag and re-sort by timestamp
        setRosbags(prev => {
          const updated = [response.data!, ...prev]
          return updated.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        })
        // Auto-close the modal after successful upload
        setIsUploadModalOpen(false)
      } else {
        throw new Error(response.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }, [setIsUploadModalOpen])

  // Update handler
  const handleUpdate = useCallback(async (id: number, data: Partial<EditData>, onProgress?: (progress: number) => void) => {
    try {
      console.log("Update data received:", data)
      console.log("Update ID:", id)
      
      if (!data) {
        throw new Error('Update data is undefined')
      }
      
      if (!id || id <= 0) {
        throw new Error('Invalid rosbag ID')
      }
      
      const rosbagData: Partial<RosbagUpload> = {}
      
      // Only add fields that are defined and not null
      if (data.track_name !== undefined) {
        rosbagData.track_name = data.track_name
        console.log("Setting track_name:", data.track_name)
      }
      if (data.mission_name !== undefined) {
        rosbagData.mission_name = data.mission_name
        console.log("Setting mission_name:", data.mission_name)
      }
      if (data.number_of_evaluated_cones_yellow !== undefined) {
        rosbagData.number_of_evaluated_cones_yellow = data.number_of_evaluated_cones_yellow
        console.log("Setting number_of_evaluated_cones_yellow:", data.number_of_evaluated_cones_yellow)
      }
      if (data.number_of_evaluated_cones_blue !== undefined) {
        rosbagData.number_of_evaluated_cones_blue = data.number_of_evaluated_cones_blue
        console.log("Setting number_of_evaluated_cones_blue:", data.number_of_evaluated_cones_blue)
      }
      if (data.avg_lap_time !== undefined) {
        rosbagData.avg_lap_time = data.avg_lap_time
        console.log("Setting avg_lap_time:", data.avg_lap_time)
      }
      if (data.number_of_laps_completed !== undefined) {
        rosbagData.number_of_laps_completed = data.number_of_laps_completed
        console.log("Setting number_of_laps_completed:", data.number_of_laps_completed)
      }
      if (data.is_successful !== undefined) {
        rosbagData.is_successful = data.is_successful
        console.log("Setting is_successful:", data.is_successful)
      }

      // Read file contents as binary data and add them if they exist
      if (data.rosbag_file) {
        const rosbagContent = await readFileAsArrayBuffer(data.rosbag_file)
        rosbagData.rosbag_file = createBlobFromArrayBuffer(rosbagContent, data.rosbag_file.type)
        console.log("Added rosbag file content:", data.rosbag_file.name, "Size:", rosbagContent.byteLength, "bytes", "Type:", data.rosbag_file.type)
      }
      if (data.yaml_file) {
        const yamlContent = await readFileAsArrayBuffer(data.yaml_file)
        rosbagData.yaml_file = createBlobFromArrayBuffer(yamlContent, data.yaml_file.type)
        console.log("Added yaml file content:", data.yaml_file.name, "Size:", yamlContent.byteLength, "bytes", "Type:", data.yaml_file.type)
      }
      if (data.db_file) {
        const dbContent = await readFileAsArrayBuffer(data.db_file)
        rosbagData.db_file = createBlobFromArrayBuffer(dbContent, data.db_file.type)
        console.log("Added db file content:", data.db_file.name, "Size:", dbContent.byteLength, "bytes", "Type:", data.db_file.type)
      }

      console.log("Final rosbag data for update API:", rosbagData)
      console.log("Number of fields to update:", Object.keys(rosbagData).length)
      
      if (Object.keys(rosbagData).length === 0) {
        console.log("No fields to update, skipping API call")
        // Auto-close the modal even if no changes
        setIsEditModalOpen(false)
        setEditingRosbag(null)
        return
      }
      
      const response = await rosbagsApi.partialUpdate(id, rosbagData, onProgress)
      if (response.data) {
        console.log("Update successful:", response.data)
        // Update the rosbag in the local state and maintain sort order
        setRosbags(prev => {
          const updated = prev.map(rosbag => 
            rosbag.id === id ? response.data! : rosbag
          )
          return updated.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        })
        // Auto-close the modal after successful update
        setIsEditModalOpen(false)
        setEditingRosbag(null)
      } else {
        throw new Error(response.error || 'Update failed')
      }
    } catch (error) {
      console.error('Update error:', error)
      throw error
    }
  }, [setIsEditModalOpen, setEditingRosbag])

  // Handle successful edit
  const handleEditSuccess = useCallback((updatedRosbag: Rosbag) => {
    // Update the rosbag in the local state and maintain sort order
    setRosbags(prev => {
      const updated = prev.map(rosbag => 
        rosbag.id === updatedRosbag.id ? updatedRosbag : rosbag
      )
      return updated.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    })
    // Close modal
    setIsEditModalOpen(false)
    setEditingRosbag(null)
  }, [setIsEditModalOpen, setEditingRosbag])

  // Provide upload handler to parent component
  useEffect(() => {
    if (onUploadHandlerReady) {
      onUploadHandlerReady(handleUpload)
    }
  }, [onUploadHandlerReady, handleUpload])

  // Provide update handler to parent component
  useEffect(() => {
    if (onUpdateHandlerReady) {
      onUpdateHandlerReady(handleUpdate)
    }
  }, [onUpdateHandlerReady, handleUpdate])

  // Provide edit success handler to parent component
  useEffect(() => {
    if (onEditSuccessHandlerReady) {
      onEditSuccessHandlerReady(handleEditSuccess)
    }
  }, [onEditSuccessHandlerReady, handleEditSuccess])

  // Provide refresh handler to parent component
  useEffect(() => {
    if (onRefreshHandlerReady) {
      onRefreshHandlerReady(loadRosbags)
    }
  }, [onRefreshHandlerReady, loadRosbags])

  const handleProcessTest = async (id: number) => {
    setProcessingTests(prev => new Set(prev).add(id))
    
    try {
      console.log('Processing rosbag with ID:', id)
      
      // Call the API to process the rosbag and generate JSON data
      const response = await rosbagsApi.processRosbag(id)
      
      if (response.data) {
        console.log('Rosbag processed successfully:', response.data)
        // Reload the rosbags to get updated status with the new json_file
        await loadRosbags()
      } else {
        console.error('Processing error:', response.error)
        alert(response.error || 'Failed to process rosbag')
      }
    } catch (error) {
      console.error('Processing error:', error)
      alert('Failed to process rosbag')
    } finally {
      setProcessingTests(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleEdit = (rosbag: Rosbag) => {
    setEditingRosbag(rosbag)
    setIsEditModalOpen(true)
  }

  const handleDeleteTest = async (id: number) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return
    }

    try {
      const response = await rosbagsApi.delete(id)
      if (!response.data) {
        setRosbags(prev => prev.filter(rosbag => rosbag.id !== id))
      } else {
        alert(response.error || 'Failed to delete test')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete test')
    }
  }

  const handleDownloadData = async (id: number) => {
    try {
      const response = await rosbagsApi.getJsonData(id)
      if (response.data) {
        const dataStr = JSON.stringify(response.data, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `rosbag_${id}_data.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        alert(response.error || 'Failed to download data')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download data')
    }
  }

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const response = await rosbagsApi.downloadFile(filePath)

      if (response.data) {
        const url = URL.createObjectURL(response.data)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        alert(response.error || `Failed to download file`)
      }
    } catch (error) {
      console.error('Download file error:', error)
      alert(`Failed to download file`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('username')
    onViewChange('dashboard')
  }

  const handlePlayTest = async (id: number) => {
    if (!webSocketService) {
      alert('WebSocket service not available')
      return
    }

    try {
      // Find the rosbag to check if it has a json_file
      const rosbag = rosbags.find(r => r.id === id)
      let response

      if (rosbag?.json_file) {
        // If json_file exists, fetch it directly using the file path
        console.log('Fetching JSON file from path:', rosbag.json_file)
        const fileResponse = await rosbagsApi.downloadFile(rosbag.json_file)
        if (fileResponse.data) {
          // Convert blob to JSON
          const text = await fileResponse.data.text()
          const jsonData = JSON.parse(text)
          response = { data: jsonData }
        } else {
          response = { error: fileResponse.error }
        }
      } else {
        // Fall back to the original API endpoint
        console.log('Fetching data from API endpoint for rosbag:', id)
        response = await rosbagsApi.getJsonData(id)
      }

      if (response.data) {
        console.log('Test data structure:', response.data)
        
        let convertedData: VehicleData[] = []
        
        // Always treat data as compressed and use uncompression method
        // Check if we have vehicle_states in the response
        if (response.data.vehicle_states && Array.isArray(response.data.vehicle_states)) {
          console.log('Processing vehicle_states as compressed data...')
          // Use the uncompression method treating data as compressed
          const compactDataArray = response.data.vehicle_states as CompactVehicleData[]
          const uncompressedData = await uncompressJsonData(compactDataArray)
          
          convertedData = uncompressedData.map((state, index) => ({
            ...state,
            timestamp: Date.now() + index * 100,
            Ndata: state.Ndata || index
          }))
        } else {
          // If the data structure is different, try to adapt it as compressed data
          console.log('Processing fallback data as compressed...')
          const dataArray = Array.isArray(response.data) ? response.data : [response.data]
          
          const compactDataArray = dataArray as CompactVehicleData[]
          convertedData = await uncompressJsonData(compactDataArray)
          
          // Update timestamps and Ndata for replay timing
          convertedData = convertedData.map((item, index) => ({
            ...item,
            timestamp: Date.now() + index * 100,
            Ndata: item.Ndata || index
          }))
        }

        if (convertedData.length === 0) {
          alert('No vehicle data found in test file')
          return
        }

        console.log('Uncompressed and converted data sample:', convertedData.slice(0, 3))
        console.log(`Total data points after uncompression: ${convertedData.length}`)
        
        // Start replay with the converted data
        webSocketService.startTestReplay(convertedData)
        
        // Switch back to dashboard view to see the replay
        onViewChange('dashboard')
      } else {
        alert(response.error || 'Failed to load test data')
      }
    } catch (error) {
      console.error('Play test error:', error)
      alert('Failed to play test data')
    }
  }

  const getStatusInfo = (rosbag: Rosbag, isProcessing: boolean) => {
    if (isProcessing) {
      return { text: 'processing', color: 'text-yellow-400 bg-yellow-600/20' }
    }
    
    if (rosbag.json_file) {
      return rosbag.is_successful 
        ? { text: 'completed', color: 'text-green-400 bg-green-600/20' }
        : { text: 'failed', color: 'text-red-400 bg-red-600/20' }
    }
    
    // Check if both YAML and DB files are present
    if (rosbag.yaml_file && rosbag.db_file) {
      return { text: 'ready', color: 'text-blue-400 bg-blue-600/20' }
    }
    
    // If either YAML or DB file is missing
    return { text: 'missing file', color: 'text-orange-400 bg-orange-600/20' }
  }

  const getStatistics = () => {
    const completed = rosbags.filter(r => r.json_file && r.is_successful).length
    const failed = rosbags.filter(r => r.json_file && !r.is_successful).length
    const ready = rosbags.filter(r => !r.json_file && r.yaml_file && r.db_file).length
    const missingData = rosbags.filter(r => !r.json_file && (!r.yaml_file || !r.db_file)).length
    const processing = processingTests.size

    return { completed, failed, ready, missingData, processing }
  }

  const getServerInfo = () => {
    const serverUrl = localStorage.getItem('apiServerUrl') || 'localhost'
    const serverPort = localStorage.getItem('apiServerPort') || '8000'
    const fullUrl = `http://${serverUrl}:${serverPort}`
    
    return { serverUrl, serverPort, fullUrl }
  }

  const stats = getStatistics()
  const serverInfo = getServerInfo()

  if (loading) {
    return (
      <div className="w-1/4 p-6 bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800/40 flex items-center justify-center">
        <div className="text-zinc-400">Loading tests...</div>
      </div>
    )
  }

  return (
    <div
      className="w-1/4 p-6 bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800/40 overflow-y-auto"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#4B5563 #1F2937",
      }}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => onViewChange('dashboard')}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-300 p-2 -ml-2"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="relative w-32 h-6 shrink-0">
                <Image 
                  src="/SCD.svg" 
                  alt="Squadra Corse Driverless" 
                  fill 
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-bold text-white">Tests</h1>
            </div>
            <div className="flex items-center gap-3">
              {username && (
                <span className="text-sm text-zinc-400">
                  {username}
                </span>
              )}
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-red-400"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="h-0.5 w-full bg-gradient-to-r from-red-600 to-red-900"></div>
        </div>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
            <h2 className="text-lg font-medium text-zinc-300 mb-3">Upload New Test</h2>
            <Button 
              onClick={() => setIsUploadModalOpen(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Test Files
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-lg bg-red-600/20 border border-red-600/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">Error</p>
                  <p className="text-xs text-red-300">{error}</p>
                  <Button
                    onClick={loadRosbags}
                    size="sm"
                    variant="outline"
                    className="mt-2 border-red-600/30 text-red-400 hover:bg-red-600/10"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Test Files List */}
          <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium text-zinc-300">Test Files</h2>
              <Button
                onClick={loadRosbags}
                size="sm"
                variant="ghost"
                className="text-zinc-400 hover:text-zinc-300"
              >
                Refresh
              </Button>
            </div>
            
            {rosbags.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No test files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rosbags.map((rosbag) => {
                  const isProcessing = processingTests.has(rosbag.id)
                  const statusInfo = getStatusInfo(rosbag, isProcessing)
                  
                  return (
                    <div 
                      key={rosbag.id}
                      className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-700/30 relative group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-200 truncate">
                              {rosbag.track_name} - {rosbag.mission_name}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-zinc-400">
                                ID: {rosbag.id}
                              </p>
                              {/* Edit and Delete buttons */}
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => handleEdit(rosbag)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-zinc-400 hover:text-green-400 hover:bg-green-600/20"
                                  title="Edit test"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteTest(rosbag.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-600/20"
                                  title="Delete test"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 mb-3">
                        <span>Yellow: {rosbag.number_of_evaluated_cones_yellow}</span>
                        <span>Blue: {rosbag.number_of_evaluated_cones_blue}</span>
                        <span>Lap time: {rosbag.avg_lap_time}s</span>
                        <span>Laps: {rosbag.number_of_laps_completed || 'N/A'}</span>
                        <span className="col-span-2">{formatDate(rosbag.timestamp)}</span>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {!rosbag.json_file && !isProcessing && rosbag.db_file && rosbag.yaml_file && (
                          <Button
                            onClick={() => handleProcessTest(rosbag.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Process
                          </Button>
                        )}
                        
                        {isProcessing && (
                          <Button
                            size="sm"
                            disabled
                            className="bg-yellow-600/50 text-yellow-300"
                          >
                            <div className="w-3 h-3 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </Button>
                        )}
                        
                        {rosbag.json_file && (
                          <>
                            <Button
                              onClick={() => handlePlayTest(rosbag.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              title="Play test data"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Play
                            </Button>
                            <Button
                              onClick={() => handleDownloadData(rosbag.id)}
                              size="sm"
                              variant="outline"
                              className="bg-blue-600/20 border-blue-600/30 text-blue-400 hover:bg-blue-600/30"
                              title="Download JSON data"
                            >
                              <Download className="w-3 h-3" />
                              JSON
                            </Button>
                          </>
                        )}

                        {rosbag.rosbag_file && (
                          <Button
                            onClick={() => handleDownloadFile(rosbag.rosbag_file!, rosbag.rosbag_file!.split('/').pop() || `rosbag_${rosbag.id}.bag`)}
                            size="sm"
                            variant="outline"
                            className="bg-purple-600/20 border-purple-600/30 text-purple-400 hover:bg-purple-600/30"
                            title="Download ROS bag file"
                          >
                            <Download className="w-3 h-3" />
                            BAG
                          </Button>
                        )}

                        {rosbag.yaml_file && (
                          <Button
                            onClick={() => handleDownloadFile(rosbag.yaml_file!, rosbag.yaml_file!.split('/').pop() || `config_${rosbag.id}.yaml`)}
                            size="sm"
                            variant="outline"
                            className="bg-orange-600/20 border-orange-600/30 text-orange-400 hover:bg-orange-600/30"
                            title="Download YAML file"
                          >
                            <Download className="w-3 h-3" />
                            YAML
                          </Button>
                        )}

                        {rosbag.db_file && (
                          <Button
                            onClick={() => handleDownloadFile(rosbag.db_file!, rosbag.db_file!.split('/').pop() || `database_${rosbag.id}.db`)}
                            size="sm"
                            variant="outline"
                            className="bg-cyan-600/20 border-cyan-600/30 text-cyan-400 hover:bg-cyan-600/30"
                            title="Download database file"
                          >
                            <Download className="w-3 h-3" />
                            DB
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Test Statistics */}
          <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
            <h2 className="text-lg font-medium text-zinc-300 mb-3">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                <p className="text-xs text-zinc-400">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                <p className="text-xs text-zinc-400">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.ready}</p>
                <p className="text-xs text-zinc-400">Ready</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.missingData}</p>
                <p className="text-xs text-zinc-400">Missing Data</p>
              </div>
              {stats.processing > 0 && (
                <div className="text-center col-span-2">
                  <p className="text-2xl font-bold text-yellow-400">{stats.processing}</p>
                  <p className="text-xs text-zinc-400">Processing</p>
                </div>
              )}
            </div>
          </div>

          {/* Server Information */}
          <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
            <h2 className="text-lg font-medium text-zinc-300 mb-3">Server Info</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">URL:</span>
                <span className="text-sm font-mono text-zinc-200">{serverInfo.fullUrl}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
