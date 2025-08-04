"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Filter, RotateCcw } from "lucide-react"
import { Rosbag } from "@/types/api-types"

export type FilterCriteria = {
  trackName: string
  missionName: string
  status: 'all' | 'completed' | 'failed' | 'ready' | 'missing' | 'processing'
  isSuccessful: 'all' | 'true' | 'false'
  dateRange: {
    from: string
    to: string
  }
  lapTimeRange: {
    min: number | null
    max: number | null
  }
  conesRange: {
    yellowMin: number | null
    yellowMax: number | null
    blueMin: number | null
    blueMax: number | null
  }
  lapsRange: {
    min: number | null
    max: number | null
  }
  hasFiles: {
    rosbag: boolean | null
    yaml: boolean | null
    db: boolean | null
    json: boolean | null
    zip: boolean | null
  }
}

type TestFilterModalProps = {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: FilterCriteria) => void
  rosbags: Rosbag[]
}

const defaultFilters: FilterCriteria = {
  trackName: '',
  missionName: '',
  status: 'all',
  isSuccessful: 'all',
  dateRange: {
    from: '',
    to: ''
  },
  lapTimeRange: {
    min: null,
    max: null
  },
  conesRange: {
    yellowMin: null,
    yellowMax: null,
    blueMin: null,
    blueMax: null
  },
  lapsRange: {
    min: null,
    max: null
  },
  hasFiles: {
    rosbag: null,
    yaml: null,
    db: null,
    json: null,
    zip: null
  }
}

export default function TestFilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  rosbags
}: TestFilterModalProps) {
  const [filters, setFilters] = useState<FilterCriteria>(defaultFilters)

  // Get unique values for dropdowns
  const uniqueTrackNames = Array.from(new Set(rosbags.map(r => r.track_name))).sort()
  const uniqueMissionNames = Array.from(new Set(rosbags.map(r => r.mission_name))).sort()

  // Calculate value ranges for suggestions
  const lapTimes = rosbags.map(r => r.avg_lap_time).filter(t => t > 0)
  const minLapTime = lapTimes.length > 0 ? Math.min(...lapTimes) : 0
  const maxLapTime = lapTimes.length > 0 ? Math.max(...lapTimes) : 0
  
  const yellowCones = rosbags.map(r => r.number_of_evaluated_cones_yellow)
  const blueCones = rosbags.map(r => r.number_of_evaluated_cones_blue)
  const minYellowCones = yellowCones.length > 0 ? Math.min(...yellowCones) : 0
  const maxYellowCones = yellowCones.length > 0 ? Math.max(...yellowCones) : 0
  const minBlueCones = blueCones.length > 0 ? Math.min(...blueCones) : 0
  const maxBlueCones = blueCones.length > 0 ? Math.max(...blueCones) : 0

  const laps = rosbags.map(r => r.number_of_laps_completed).filter(l => l != null) as number[]
  const minLaps = laps.length > 0 ? Math.min(...laps) : 0
  const maxLaps = laps.length > 0 ? Math.max(...laps) : 0

  // Date range calculations
  const dates = rosbags.map(r => new Date(r.timestamp)).sort((a, b) => a.getTime() - b.getTime())
  const minDate = dates.length > 0 ? dates[0].toISOString().split('T')[0] : ''
  const maxDate = dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : ''

  const handleApply = () => {
    onApplyFilters(filters)
    onClose()
  }

  const handleReset = () => {
    setFilters(defaultFilters)
  }

  const updateFilter = (key: keyof FilterCriteria, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateNestedFilter = (category: keyof FilterCriteria, key: string, value: string | number | boolean | null) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as Record<string, unknown>),
        [key]: value
      }
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-semibold text-white">Filter Tests</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Filters */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-zinc-300 border-b border-zinc-700 pb-2">Basic Filters</h3>
              
              {/* Track Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Track Name</label>
                <select
                  value={filters.trackName}
                  onChange={(e) => updateFilter('trackName', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">All Tracks</option>
                  {uniqueTrackNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Mission Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Mission Name</label>
                <select
                  value={filters.missionName}
                  onChange={(e) => updateFilter('missionName', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">All Missions</option>
                  {uniqueMissionNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="ready">Ready</option>
                  <option value="missing">Missing Files</option>
                  <option value="processing">Processing</option>
                </select>
              </div>

              {/* Success Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Success Status</label>
                <select
                  value={filters.isSuccessful}
                  onChange={(e) => updateFilter('isSuccessful', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="true">Successful</option>
                  <option value="false">Failed</option>
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-zinc-300 border-b border-zinc-700 pb-2">Date Range</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">From</label>
                  <input
                    type="date"
                    value={filters.dateRange.from}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => updateNestedFilter('dateRange', 'from', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">To</label>
                  <input
                    type="date"
                    value={filters.dateRange.to}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => updateNestedFilter('dateRange', 'to', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {dates.length > 0 && (
                <p className="text-xs text-zinc-400">
                  Available range: {minDate} to {maxDate}
                </p>
              )}

              {/* File Presence */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-zinc-300 mb-3">File Presence</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'rosbag', label: 'ROS Bag' },
                    { key: 'yaml', label: 'YAML' },
                    { key: 'db', label: 'Database' },
                    { key: 'json', label: 'JSON' },
                    { key: 'zip', label: 'ZIP' }
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <label className="block text-sm font-medium text-zinc-300">{label}</label>
                      <select
                        value={filters.hasFiles[key as keyof typeof filters.hasFiles] === null ? 'all' : filters.hasFiles[key as keyof typeof filters.hasFiles] ? 'yes' : 'no'}
                        onChange={(e) => updateNestedFilter('hasFiles', key, e.target.value === 'all' ? null : e.target.value === 'yes')}
                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      >
                        <option value="all">Any</option>
                        <option value="yes">Has File</option>
                        <option value="no">Missing</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Numeric Ranges */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-zinc-300 border-b border-zinc-700 pb-2">Numeric Ranges</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Lap Time Range */}
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Lap Time (seconds)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Min</label>
                    <input
                      type="number"
                      step="0.1"
                      value={filters.lapTimeRange.min || ''}
                      onChange={(e) => updateNestedFilter('lapTimeRange', 'min', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={`${minLapTime.toFixed(1)}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Max</label>
                    <input
                      type="number"
                      step="0.1"
                      value={filters.lapTimeRange.max || ''}
                      onChange={(e) => updateNestedFilter('lapTimeRange', 'max', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={`${maxLapTime.toFixed(1)}`}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Range: {minLapTime.toFixed(1)}s - {maxLapTime.toFixed(1)}s
                </p>
              </div>

              {/* Yellow Cones Range */}
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Yellow Cones</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Min</label>
                    <input
                      type="number"
                      value={filters.conesRange.yellowMin || ''}
                      onChange={(e) => updateNestedFilter('conesRange', 'yellowMin', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={`${minYellowCones}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Max</label>
                    <input
                      type="number"
                      value={filters.conesRange.yellowMax || ''}
                      onChange={(e) => updateNestedFilter('conesRange', 'yellowMax', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={`${maxYellowCones}`}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Range: {minYellowCones} - {maxYellowCones}
                </p>
              </div>

              {/* Blue Cones Range */}
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Blue Cones</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Min</label>
                    <input
                      type="number"
                      value={filters.conesRange.blueMin || ''}
                      onChange={(e) => updateNestedFilter('conesRange', 'blueMin', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={`${minBlueCones}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Max</label>
                    <input
                      type="number"
                      value={filters.conesRange.blueMax || ''}
                      onChange={(e) => updateNestedFilter('conesRange', 'blueMax', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={`${maxBlueCones}`}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Range: {minBlueCones} - {maxBlueCones}
                </p>
              </div>

              {/* Laps Range */}
              {maxLaps > 0 && (
                <div>
                  <h4 className="text-md font-medium text-zinc-300 mb-3">Number of Laps</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Min</label>
                      <input
                        type="number"
                        value={filters.lapsRange.min || ''}
                        onChange={(e) => updateNestedFilter('lapsRange', 'min', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder={`${minLaps}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Max</label>
                      <input
                        type="number"
                        value={filters.lapsRange.max || ''}
                        onChange={(e) => updateNestedFilter('lapsRange', 'max', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder={`${maxLaps}`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Range: {minLaps} - {maxLaps}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-700 bg-zinc-900/50">
          <div className="text-sm text-zinc-400">
            Total tests: {rosbags.length}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
