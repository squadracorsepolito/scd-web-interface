"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload, File, AlertCircle, Save, Trash2 } from "lucide-react"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Rosbag, RosbagUpload } from "@/types/api-types"
import { rosbagsApi } from "@/lib/api"

type FileType = 'rosbag' | 'yaml' | 'db'

type FileValidation = {
  isValid: boolean
  error?: string
}

type FormErrors = {
  [K in keyof RosbagUpload]?: string
}

type EditTestModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedRosbag: Rosbag) => void
  rosbag: Rosbag | null
}

export default function EditTestModal({ isOpen, onClose, onSuccess, rosbag }: EditTestModalProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<RosbagUpload>>({
    track_name: "",
    mission_name: "",
    number_of_evaluated_cones_yellow: 0,
    number_of_evaluated_cones_blue: 0,
    avg_lap_time: 0,
    number_of_laps_completed: undefined,
    is_successful: false,
  })

  // File state
  const [files, setFiles] = useState<{
    zip_file?: File
    yaml_file?: File
    db_file?: File
  }>({})

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState<FormErrors>({})
  const [dragActive, setDragActive] = useState(false)
  const [submitError, setSubmitError] = useState<string>("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Constants based
  const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
  const ACCEPTED_EXTENSIONS = useMemo(() => ({
    rosbag: ['.zip'],
    yaml: ['.yaml', '.yml'],
    db: ['.db', '.db3']
  }), [])

  // Initialize form with rosbag data
  useEffect(() => {
    if (isOpen && rosbag) {
      setFormData({
        track_name: rosbag.track_name,
        mission_name: rosbag.mission_name,
        number_of_evaluated_cones_yellow: rosbag.number_of_evaluated_cones_yellow,
        number_of_evaluated_cones_blue: rosbag.number_of_evaluated_cones_blue,
        avg_lap_time: rosbag.avg_lap_time,
        number_of_laps_completed: rosbag.number_of_laps_completed,
        is_successful: rosbag.is_successful,
      })
      
      // Reset file and error states
      setFiles({})
      setErrors({})
      setSubmitError("")
      setUploadProgress(0)
    }
  }, [isOpen, rosbag])

  // Validate individual fields
  const validateField = (name: keyof RosbagUpload, value: unknown): string | undefined => {
    switch (name) {
      case 'track_name':
        if (!value || typeof value !== 'string') return 'Track name is required'
        if (value.length > 100) return 'Track name must be 100 characters or less'
        break
      case 'mission_name':
        if (!value || typeof value !== 'string') return 'Mission name is required'
        if (value.length > 100) return 'Mission name must be 100 characters or less'
        break
      case 'number_of_evaluated_cones_yellow':
        if (typeof value !== 'number' || value < 0) return 'Must be a number greater than or equal to 0'
        break
      case 'number_of_evaluated_cones_blue':
        if (typeof value !== 'number' || value < 0) return 'Must be a number greater than or equal to 0'
        break
      case 'avg_lap_time':
        if (typeof value !== 'number' || value <= 0) return 'Must be a number greater than 0'
        break
    }
    return undefined
  }

  // Helper function to format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // Validate file based
  const validateFile = useCallback((file: File, type: FileType): FileValidation => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size must be less than 500 MB. Current size: ${formatFileSize(file.size)}`
      }
    }

    // Check file extension
    const extension = '.' + file.name.toLowerCase().split('.').pop()
    const allowedExtensions = ACCEPTED_EXTENSIONS[type]
    
    if (!allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `Invalid file type. Expected: ${allowedExtensions.join(', ')}`
      }
    }

    return { isValid: true }
  }, [MAX_FILE_SIZE, ACCEPTED_EXTENSIONS, formatFileSize])

  // Categorize and validate files
  const handleFileSelection = useCallback((fileList: File[]) => {
    const newFiles = { ...files }
    const newErrors = { ...errors }

    // Clear existing file errors
    delete newErrors.zip_file
    delete newErrors.yaml_file
    delete newErrors.db_file

    fileList.forEach(file => {
      const extension = file.name.toLowerCase().split('.').pop()
      
      let fileType: FileType | null = null
      if (extension === 'zip') fileType = 'rosbag'
      else if (['yaml', 'yml'].includes(extension || '')) fileType = 'yaml'
      else if (['db', 'db3'].includes(extension || '')) fileType = 'db'

      if (fileType) {
        const validation = validateFile(file, fileType)
        
        if (validation.isValid) {
          if (fileType === 'rosbag') {
            newFiles.zip_file = file
          } else {
            newFiles[`${fileType}_file` as keyof typeof newFiles] = file
          }
        } else {
          if (fileType === 'rosbag') {
            newErrors.zip_file = validation.error
          } else {
            newErrors[`${fileType}_file` as keyof FormErrors] = validation.error
          }
        }
      } else {
        // Show general error for unsupported files
        setSubmitError(`Unsupported file type: ${file.name}. Please upload ZIP, YAML, or DB files.`)
      }
    })

    setFiles(newFiles)
    setErrors(newErrors)
  }, [files, errors, validateFile, setSubmitError])

  // Handle form field changes
  const handleFieldChange = (name: keyof RosbagUpload, value: string | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError("")
    }
  }

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files?.length > 0) {
      handleFileSelection(Array.from(e.dataTransfer.files))
    }
  }, [handleFileSelection])

  // Handle file input change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFileSelection(Array.from(e.target.files))
    }
  }

  // Remove a specific file
  const removeFile = (fileType: 'zip_file' | 'yaml_file' | 'db_file') => {
    setFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[fileType]
      return newFiles
    })
    
    // Clear any errors for this file type
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fileType]
      return newErrors
    })
    
    // Clear submit error when user removes files
    if (submitError) {
      setSubmitError("")
    }
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate required fields
    const requiredFields: (keyof RosbagUpload)[] = [
      'track_name',
      'mission_name', 
      'number_of_evaluated_cones_yellow',
      'number_of_evaluated_cones_blue',
      'avg_lap_time'
    ]

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field])
      if (error) newErrors[field] = error
    })

    // Validate optional fields if they have values
    if (formData.number_of_laps_completed !== undefined) {
      const error = validateField('number_of_laps_completed', formData.number_of_laps_completed)
      if (error) newErrors.number_of_laps_completed = error
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check what has changed compared to original rosbag
  const getChangedFields = (): Partial<RosbagUpload> => {
    if (!rosbag) return {}

    const changes: Partial<RosbagUpload> = {}

    // Check metadata changes
    if (formData.track_name !== rosbag.track_name) {
      changes.track_name = formData.track_name
    }
    if (formData.mission_name !== rosbag.mission_name) {
      changes.mission_name = formData.mission_name
    }
    if (formData.number_of_evaluated_cones_yellow !== rosbag.number_of_evaluated_cones_yellow) {
      changes.number_of_evaluated_cones_yellow = formData.number_of_evaluated_cones_yellow
    }
    if (formData.number_of_evaluated_cones_blue !== rosbag.number_of_evaluated_cones_blue) {
      changes.number_of_evaluated_cones_blue = formData.number_of_evaluated_cones_blue
    }
    if (formData.avg_lap_time !== rosbag.avg_lap_time) {
      changes.avg_lap_time = formData.avg_lap_time
    }
    if (formData.number_of_laps_completed !== rosbag.number_of_laps_completed) {
      changes.number_of_laps_completed = formData.number_of_laps_completed
    }
    if (formData.is_successful !== rosbag.is_successful) {
      changes.is_successful = formData.is_successful
    }

    // Add file changes
    if (files.zip_file) changes.zip_file = files.zip_file
    if (files.yaml_file) changes.yaml_file = files.yaml_file
    if (files.db_file) changes.db_file = files.db_file

    return changes
  }

  // Submit form
  const handleSubmit = async () => {
    if (!rosbag) return

    // Validate form
    if (!validateForm()) {
      setSubmitError("Please fix the errors above before submitting.")
      return
    }

    // Get only changed fields for partial update
    const changes = getChangedFields()

    // Check if anything actually changed
    if (Object.keys(changes).length === 0) {
      setSubmitError("No changes detected. Please modify some fields or add new files.")
      return
    }

    setIsSubmitting(true)
    setUploadProgress(0)
    setSubmitError("")

    try {
      const response = await rosbagsApi.partialUpdate(
        rosbag.id,
        changes,
        (progress) => setUploadProgress(progress)
      )

      if (response.error) {
        setSubmitError(response.error)
      } else if (response.data) {
        // Success - call parent callback with updated rosbag data and close modal
        onSuccess(response.data)
        onClose()
      } else {
        setSubmitError("No data returned from server")
      }
    } catch (error) {
      void error
      setSubmitError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  // Don't render if modal is closed or no rosbag
  if (!isOpen || !rosbag) return null

  const hasChanges = Object.keys(getChangedFields()).length > 0
  const canSubmit = hasChanges && !isSubmitting

  return (
    <>
      <ProgressBar 
        progress={uploadProgress} 
        isUploading={isSubmitting}
        description="Updating test..." 
      />
      
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl h-[95vh] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-700 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-white">Edit Test</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Update test metadata and optionally replace files
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-300"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Global Error Message */}
            {submitError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Error</p>
                    <p className="text-sm text-red-300 mt-1">{submitError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Test Metadata Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-zinc-200">Test Metadata</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Track Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Track Name *
                  </label>
                  <input
                    type="text"
                    value={formData.track_name || ''}
                    onChange={(e) => handleFieldChange('track_name', e.target.value)}
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.track_name ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    placeholder="e.g., FSG19"
                    disabled={isSubmitting}
                    maxLength={100}
                    required
                  />
                  {errors.track_name && (
                    <p className="text-sm text-red-400 mt-1">{errors.track_name}</p>
                  )}
                </div>

                {/* Mission Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Mission Name *
                  </label>
                  <input
                    type="text"
                    value={formData.mission_name || ''}
                    onChange={(e) => handleFieldChange('mission_name', e.target.value)}
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.mission_name ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    placeholder="e.g., Track Drive"
                    disabled={isSubmitting}
                    maxLength={100}
                    required
                  />
                  {errors.mission_name && (
                    <p className="text-sm text-red-400 mt-1">{errors.mission_name}</p>
                  )}
                </div>

                {/* Yellow Cones */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Yellow Cones Evaluated *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.number_of_evaluated_cones_yellow || 0}
                    onChange={(e) => handleFieldChange('number_of_evaluated_cones_yellow', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.number_of_evaluated_cones_yellow ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    disabled={isSubmitting}
                    required
                  />
                  {errors.number_of_evaluated_cones_yellow && (
                    <p className="text-sm text-red-400 mt-1">{errors.number_of_evaluated_cones_yellow}</p>
                  )}
                </div>

                {/* Blue Cones */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Blue Cones Evaluated *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.number_of_evaluated_cones_blue || 0}
                    onChange={(e) => handleFieldChange('number_of_evaluated_cones_blue', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.number_of_evaluated_cones_blue ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    disabled={isSubmitting}
                    required
                  />
                  {errors.number_of_evaluated_cones_blue && (
                    <p className="text-sm text-red-400 mt-1">{errors.number_of_evaluated_cones_blue}</p>
                  )}
                </div>

                {/* Average Lap Time */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Average Lap Time (seconds) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.avg_lap_time || 0}
                    onChange={(e) => handleFieldChange('avg_lap_time', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.avg_lap_time ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    placeholder="e.g., 45.67"
                    disabled={isSubmitting}
                    required
                  />
                  {errors.avg_lap_time && (
                    <p className="text-sm text-red-400 mt-1">{errors.avg_lap_time}</p>
                  )}
                </div>

                {/* Laps Completed */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Laps Completed
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.number_of_laps_completed || ''}
                    onChange={(e) => handleFieldChange('number_of_laps_completed', e.target.value ? parseInt(e.target.value) : undefined)}
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.number_of_laps_completed ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    placeholder="Optional"
                    disabled={isSubmitting}
                  />
                  {errors.number_of_laps_completed && (
                    <p className="text-sm text-red-400 mt-1">{errors.number_of_laps_completed}</p>
                  )}
                </div>
              </div>

              {/* Success Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isSuccessful"
                  checked={formData.is_successful || false}
                  onChange={(e) => handleFieldChange('is_successful', e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-zinc-800 border-zinc-600 rounded focus:ring-red-500 focus:ring-2"
                  disabled={isSubmitting}
                />
                <label htmlFor="isSuccessful" className="text-sm font-medium text-zinc-300">
                  Test was successful
                </label>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-zinc-200 mb-2">Replace Files (Optional)</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Upload new files to replace existing ones. Leave empty to keep current files.
                </p>
              </div>
              
              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                  dragActive
                    ? "border-red-500 bg-red-500/5"
                    : "border-zinc-600 hover:border-zinc-500"
                } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-zinc-300 mb-2">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-zinc-500 mb-4">
                    Supported: .zip (rosbag), .yaml/.yml (config), .db/.db3 (database)
                  </p>
                  <p className="text-xs text-zinc-600 mb-4">
                    Maximum file size: 500 MB per file
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                    disabled={isSubmitting}
                  >
                    <File className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".zip,.yaml,.yml,.db,.db3"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* File Errors */}
              {(errors.zip_file || errors.yaml_file || errors.db_file) && (
                <div className="space-y-2">
                  {errors.zip_file && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>Rosbag file: {errors.zip_file}</span>
                    </div>
                  )}
                  {errors.yaml_file && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>YAML file: {errors.yaml_file}</span>
                    </div>
                  )}
                  {errors.db_file && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>Database file: {errors.db_file}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Files Display */}
              {(files.zip_file || files.yaml_file || files.db_file) && (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-zinc-300 mb-3">New Files Selected:</h4>
                  <div className="space-y-2">
                    {files.zip_file && (
                      <div className="flex items-center justify-between gap-2 text-sm bg-zinc-700/50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-blue-400" />
                          <span className="text-zinc-300">Rosbag:</span>
                          <span className="text-zinc-400">{files.zip_file.name}</span>
                          <span className="text-zinc-500 text-xs">({formatFileSize(files.zip_file.size)})</span>
                        </div>
                        <Button
                          onClick={() => removeFile('zip_file')}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                          disabled={isSubmitting}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {files.yaml_file && (
                      <div className="flex items-center justify-between gap-2 text-sm bg-zinc-700/50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-green-400" />
                          <span className="text-zinc-300">YAML:</span>
                          <span className="text-zinc-400">{files.yaml_file.name}</span>
                          <span className="text-zinc-500 text-xs">({formatFileSize(files.yaml_file.size)})</span>
                        </div>
                        <Button
                          onClick={() => removeFile('yaml_file')}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                          disabled={isSubmitting}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {files.db_file && (
                      <div className="flex items-center justify-between gap-2 text-sm bg-zinc-700/50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-yellow-400" />
                          <span className="text-zinc-300">Database:</span>
                          <span className="text-zinc-400">{files.db_file.name}</span>
                          <span className="text-zinc-500 text-xs">({formatFileSize(files.db_file.size)})</span>
                        </div>
                        <Button
                          onClick={() => removeFile('db_file')}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                          disabled={isSubmitting}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Requirements */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-1">Upload Requirements</p>
                    <ul className="text-xs text-amber-300/80 space-y-1">
                      <li>• Upload either a ZIP file with rosbag data OR separate YAML and DB files</li>
                      <li>• Maximum file size: 500 MB per file</li>
                      <li>• Only modified fields and new files will be updated</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-zinc-700 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <AlertCircle className="w-4 h-4" />
                <span>* Required fields</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Test
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
