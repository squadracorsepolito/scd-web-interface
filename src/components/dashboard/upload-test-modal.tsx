"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload, File, AlertCircle, Save, CheckCircle2, Trash2 } from "lucide-react"
import { ProgressBar } from "@/components/ui/progress-bar"
import { rosbagsApi } from "@/lib/api"

// Local type for form data (using File instead of File | Blob for UI)
type UploadFormData = {
  track_name: string
  mission_name: string
  number_of_evaluated_cones_yellow: number
  number_of_evaluated_cones_blue: number
  avg_lap_time: number
  is_successful: boolean
  number_of_laps_completed?: number
  zip_file?: File
  yaml_file?: File
  db_file?: File
}

type UploadTestModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (uploadedRosbag?: unknown) => void
  onRefreshNeeded?: () => void
}

export default function UploadTestModal({ isOpen, onClose, onSuccess, onRefreshNeeded }: UploadTestModalProps) {
  // Form state
  const [formData, setFormData] = useState<UploadFormData>({
    track_name: "",
    mission_name: "",
    number_of_evaluated_cones_yellow: 0,
    number_of_evaluated_cones_blue: 0,
    avg_lap_time: 0,
    is_successful: true,
    number_of_laps_completed: undefined,
  })

  // File handling state
  const [dragActive, setDragActive] = useState(false)
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  
  // Validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string[]> = {}
    
    if (!formData.track_name.trim()) {
      errors.track_name = ['Track name is required']
    } else if (formData.track_name.length > 100) {
      errors.track_name = ['Track name must be 100 characters or less']
    }
    
    if (!formData.mission_name.trim()) {
      errors.mission_name = ['Mission name is required']
    } else if (formData.mission_name.length > 100) {
      errors.mission_name = ['Mission name must be 100 characters or less']
    }
    
    if (formData.avg_lap_time <= 0) {
      errors.avg_lap_time = ['Average lap time must be greater than 0']
    }
    
    if (formData.number_of_evaluated_cones_yellow < 0) {
      errors.number_of_evaluated_cones_yellow = ['Number of yellow cones must be 0 or greater']
    }
    
    if (formData.number_of_evaluated_cones_blue < 0) {
      errors.number_of_evaluated_cones_blue = ['Number of blue cones must be 0 or greater']
    }

    if (formData.number_of_laps_completed !== undefined && formData.number_of_laps_completed < 0) {
      errors.number_of_laps_completed = ['Number of laps must be 0 or greater']
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form field changes
  const handleFieldChange = (field: keyof UploadFormData, value: string | number | boolean | File | undefined) => {
    setFormData((prev: UploadFormData) => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Handle file drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  // Process uploaded files based on type and mode
  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const extension = file.name.toLowerCase().split('.').pop()
      
      switch (extension) {
        case 'zip':
          setFormData((prev: UploadFormData) => ({ ...prev, zip_file: file }))
          break
        case 'yaml':
        case 'yml':
          setFormData((prev: UploadFormData) => ({ ...prev, yaml_file: file }))
          break
        case 'db':
        case 'db3':
          setFormData((prev: UploadFormData) => ({ ...prev, db_file: file }))
          break
        default:
          // Show a warning for unsupported file types
          console.warn(`Unsupported file type: ${extension} for file: ${file.name}`)
          break
      }
    })
    
    // Clear any existing file validation errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.zip_file
      delete newErrors.yaml_file
      delete newErrors.db_file
      delete newErrors.files
      return newErrors
    })
  }

  // Remove a specific file
  const removeFile = (fileType: 'zip_file' | 'yaml_file' | 'db_file') => {
    setFormData((prev: UploadFormData) => ({ ...prev, [fileType]: undefined }))
  }

  // Handle form submission
  const handleSubmit = async () => {
    setUploadError(null)
    setUploadSuccess(false)
    
    if (!validateForm()) {
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Convert to API format
      const apiData = {
        track_name: formData.track_name,
        mission_name: formData.mission_name,
        number_of_evaluated_cones_yellow: formData.number_of_evaluated_cones_yellow,
        number_of_evaluated_cones_blue: formData.number_of_evaluated_cones_blue,
        avg_lap_time: formData.avg_lap_time,
        is_successful: formData.is_successful,
        number_of_laps_completed: formData.number_of_laps_completed,
        zip_file: formData.zip_file,
        yaml_file: formData.yaml_file,
        db_file: formData.db_file,
      }

      const result = await rosbagsApi.upload(apiData, (progress) => {
        setUploadProgress(progress)
      })

      if (result.error) {
        setUploadError(result.error)
      } else {
        setUploadSuccess(true)
        // Reset form on successful upload
        setFormData({
          track_name: "",
          mission_name: "",
          number_of_evaluated_cones_yellow: 0,
          number_of_evaluated_cones_blue: 0,
          avg_lap_time: 0,
          is_successful: true,
          number_of_laps_completed: undefined,
        })
        
        // Trigger refresh in the tests dashboard
        onRefreshNeeded?.()
        
        // Call success callback after a short delay to show success message
        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 1500)
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle modal close
  const handleClose = () => {
    if (!isUploading) {
      setUploadError(null)
      setUploadSuccess(false)
      setFieldErrors({})
      onClose()
    }
  }

  // Check if form is valid for submission
  const isFormValid = formData.track_name.trim() && 
                     formData.mission_name.trim() && 
                     formData.avg_lap_time > 0 &&
                     formData.number_of_evaluated_cones_yellow >= 0 &&
                     formData.number_of_evaluated_cones_blue >= 0

  return (
    <>
      <ProgressBar 
        progress={uploadProgress}
        isUploading={isUploading}
        description="Uploading test data to server..."
      />
      
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl h-[95vh] flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-700 flex-shrink-0">
            <h2 className="text-xl font-semibold text-white">Upload New Test</h2>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Success/Error Messages */}
          {uploadSuccess && (
            <div className="mx-6 mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="text-sm text-green-400">Test uploaded successfully!</p>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-400">{uploadError}</p>
              </div>
            </div>
          )}

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Test Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Test Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Track Name <span className="text-red-500">*</span>
                  <span className="text-xs text-zinc-400 ml-2">({formData.track_name.length}/100)</span>
                </label>
                <input
                  type="text"
                  value={formData.track_name}
                  onChange={(e) => handleFieldChange('track_name', e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                  placeholder="e.g., FSG19"
                  disabled={isUploading}
                />
                {fieldErrors.track_name && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.track_name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Mission Name <span className="text-red-500">*</span>
                  <span className="text-xs text-zinc-400 ml-2">({formData.mission_name.length}/100)</span>
                </label>
                <input
                  type="text"
                  value={formData.mission_name}
                  onChange={(e) => handleFieldChange('mission_name', e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                  placeholder="e.g., Track Drive"
                  disabled={isUploading}
                />
                {fieldErrors.mission_name && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.mission_name[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Yellow Cones Evaluated <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.number_of_evaluated_cones_yellow}
                    onChange={(e) => handleFieldChange('number_of_evaluated_cones_yellow', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                    placeholder="0"
                    disabled={isUploading}
                  />
                  {fieldErrors.number_of_evaluated_cones_yellow && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.number_of_evaluated_cones_yellow[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Blue Cones Evaluated <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.number_of_evaluated_cones_blue}
                    onChange={(e) => handleFieldChange('number_of_evaluated_cones_blue', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                    placeholder="0"
                    disabled={isUploading}
                  />
                  {fieldErrors.number_of_evaluated_cones_blue && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.number_of_evaluated_cones_blue[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Average Lap Time (seconds) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.avg_lap_time}
                    onChange={(e) => handleFieldChange('avg_lap_time', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                    placeholder="0.00"
                    disabled={isUploading}
                  />
                  {fieldErrors.avg_lap_time && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.avg_lap_time[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Laps Completed (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.number_of_laps_completed || ""}
                    onChange={(e) => handleFieldChange('number_of_laps_completed', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                    placeholder="Optional"
                    disabled={isUploading}
                  />
                  {fieldErrors.number_of_laps_completed && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.number_of_laps_completed[0]}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Test Result
                </label>
                <select
                  value={formData.is_successful ? "true" : "false"}
                  onChange={(e) => handleFieldChange('is_successful', e.target.value === "true")}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-zinc-200 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none"
                  disabled={isUploading}
                >
                  <option value="true">Successful</option>
                  <option value="false">Failed</option>
                </select>
              </div>
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Test Files (optional)
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive
                    ? "border-red-500 bg-red-500/10"
                    : "border-zinc-600 hover:border-zinc-500"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".zip,.yaml,.yml,.db,.db3"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                
                <div className="text-center">
                  <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                  <p className="text-zinc-300 mb-2">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-sm text-zinc-500">
                    Supports: .zip, .yaml, .yml, .db, .db3 files
                  </p>
                </div>
              </div>

              {/* File Display and Management */}
              <div className="mt-4 space-y-3">
                {formData.zip_file && (
                  <FileDisplay
                    file={formData.zip_file}
                    label="ZIP Archive"
                    onRemove={() => removeFile('zip_file')}
                    disabled={isUploading}
                  />
                )}
                
                {formData.yaml_file && (
                  <FileDisplay
                    file={formData.yaml_file}
                    label="YAML Config"
                    onRemove={() => removeFile('yaml_file')}
                    disabled={isUploading}
                  />
                )}
                
                {formData.db_file && (
                  <FileDisplay
                    file={formData.db_file}
                    label="Database File"
                    onRemove={() => removeFile('db_file')}
                    disabled={isUploading}
                  />
                )}
                
                {!formData.zip_file && !formData.yaml_file && !formData.db_file && (
                  <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                    <p className="text-sm text-zinc-400 text-center">
                      No files selected - files are optional for test submission
                    </p>
                  </div>
                )}
              </div>

              {/* File validation errors */}
              {fieldErrors.yaml_file && (
                <p className="mt-2 text-xs text-red-400">{fieldErrors.yaml_file[0]}</p>
              )}
              {fieldErrors.db_file && (
                <p className="mt-2 text-xs text-red-400">{fieldErrors.db_file[0]}</p>
              )}
              {fieldErrors.files && (
                <p className="mt-2 text-xs text-red-400">{fieldErrors.files[0]}</p>
              )}
            </div>

            {/* Requirements Notice */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400 mb-1">Upload Requirements</p>
                  <ul className="text-xs text-amber-300/80 space-y-1">
                    <li>• All fields marked with * are required</li>
                    <li>• Files are optional - upload any combination of ZIP, YAML, or DB files</li>
                    <li>• ZIP files should contain rosbag data</li>
                    <li>• YAML files contain configuration data</li>
                    <li>• DB files contain database/rosbag data</li>
                    <li>• Maximum file size: 500 MB per file</li>
                    <li>• Track and mission names: maximum 100 characters</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-zinc-700 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <AlertCircle className="w-4 h-4" />
              <span>* Required fields</span>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isUploading}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Upload Test
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

// Component for displaying individual files
type FileDisplayProps = {
  file: File
  label: string
  onRemove: () => void
  disabled?: boolean
}

function FileDisplay({ file, label, onRemove, disabled }: FileDisplayProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-md">
      <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-200 truncate">{file.name}</span>
          <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-1 rounded">
            {label}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      <Button
        onClick={onRemove}
        variant="ghost"
        size="sm"
        className="text-zinc-400 hover:text-red-400 p-2"
        disabled={disabled}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
