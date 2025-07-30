"use client"
import type React from "react"

import { useEffect, useState, useRef } from "react"
import type { VehicleData as VehicleDataType, DataPoint as DataPointType } from "@/types/vehicle-types"
import VehicleDashboard from "../components/dashboard/vehicle-dashboard"
import TestsDashboard from "../components/dashboard/tests-dashboard"
import { MapContainer } from "../components/map/map-container"
import { WebSocketService } from "../utils/websocket-service"
import UploadTestModal from "../components/dashboard/upload-test-modal"
import EditTestModal from "../components/dashboard/edit-test-modal"
import { Rosbag } from "@/types/api-types"

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

export default function VehicleVisualization() {
  const [data, setData] = useState<VehicleDataType | null>(null)
  const [connected, setConnected] = useState<boolean>(false)
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false)
  const [speedData, setSpeedData] = useState<DataPointType[]>([])
  const [throttleData, setThrottleData] = useState<DataPointType[]>([])
  const [currentView, setCurrentView] = useState<'dashboard' | 'tests'>('dashboard')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingRosbag, setEditingRosbag] = useState<Rosbag | null>(null)
  
  const uploadHandlerRef = useRef<((data: UploadData, onProgress?: (progress: number) => void) => Promise<void>) | null>(null)
  const updateHandlerRef = useRef<((id: number, data: Partial<EditData>, onProgress?: (progress: number) => void) => Promise<void>) | null>(null)
  const editSuccessHandlerRef = useRef<((updatedRosbag: Rosbag) => void) | null>(null)
  const refreshHandlerRef = useRef<(() => Promise<void>) | null>(null)
  
  const reconnectAttemptsRef = useRef(0)
  // Handler setters that update refs
  const setUploadHandler = (handler: ((data: UploadData, onProgress?: (progress: number) => void) => Promise<void>) | null) => {
    uploadHandlerRef.current = handler
  }
  
  const setUpdateHandler = (handler: ((id: number, data: Partial<EditData>, onProgress?: (progress: number) => void) => Promise<void>) | null) => {
    updateHandlerRef.current = handler
  }
  
  const setEditSuccessHandler = (handler: ((updatedRosbag: Rosbag) => void) | null) => {
    editSuccessHandlerRef.current = handler
  }

  const setRefreshHandler = (handler: (() => Promise<void>) | null) => {
    refreshHandlerRef.current = handler
  }

  // Wrapper functions for modal callbacks
  const handleEditSuccess = (updatedRosbag: Rosbag) => {
    if (editSuccessHandlerRef.current) {
      editSuccessHandlerRef.current(updatedRosbag)
    }
  }

  const handleRefresh = async () => {
    if (refreshHandlerRef.current) {
      await refreshHandlerRef.current()
    }
  }

  const wsRef = useRef<WebSocketService | null>(
    new WebSocketService({
      onConnect: () => setConnected(true),
      onDisconnect: () => {
        setConnected(false)
        setIsReconnecting(false)
      },
      onReconnecting: (attempt) => {
        reconnectAttemptsRef.current = attempt
        setIsReconnecting(true)
      },
      onData: (receivedData) => setData(receivedData),
      onSpeedData: (data) => setSpeedData(data),
      onThrottleData: (data) => setThrottleData(data)
    })
  )

  useEffect(() => {
    // Connect to WebSocket on mount
    const wsService = wsRef.current
    wsService?.connect()

    // Cleanup on unmount
    return () => {
      wsService?.disconnect()
    }
  }, [])

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden dark">
      {currentView === 'dashboard' ? (
        <VehicleDashboard
          data={data}
          connected={connected}
          isReconnecting={isReconnecting}
          reconnectAttempt={reconnectAttemptsRef.current}
          speedData={speedData}
          throttleData={throttleData}
          webSocketService={wsRef.current}
          onViewChange={setCurrentView}
        />
      ) : (
        <TestsDashboard 
          onViewChange={setCurrentView} 
          webSocketService={wsRef.current}
          setIsUploadModalOpen={setIsUploadModalOpen}
          onUploadHandlerReady={setUploadHandler}
          setIsEditModalOpen={setIsEditModalOpen}
          setEditingRosbag={setEditingRosbag}
          onEditSuccessHandlerReady={setEditSuccessHandler}
          onUpdateHandlerReady={setUpdateHandler}
          onRefreshHandlerReady={setRefreshHandler}
        />
      )}
      <MapContainer 
        data={data} 
        connectionMode={wsRef.current?.getConnectionMode()} 
      />
      {/* Upload Modal - rendered at root level for full screen coverage */}
      <UploadTestModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false)
          // Optionally reload data or handle success
        }}
        onRefreshNeeded={handleRefresh}
      />
      
      {/* Edit Modal - rendered at root level for full screen coverage */}
      <EditTestModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingRosbag(null)
        }}
        onSuccess={handleEditSuccess}
        rosbag={editingRosbag}
      />
    </div>
  )
}
