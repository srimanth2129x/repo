import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// System Status & Health Check
export const getStatus = () => api.get('/system/status')
export const getSystemStatus = () => api.get('/system/status')
export const getHealth = () => axios.get('http://localhost:5000/health')

// Dashboard Aggregates
export const getDashboardSummary = () => api.get('/dashboard/summary')
export const getDashboard = () => api.get('/dashboard/summary')

// Network Discovery & Interfaces
export const getNetworkInterfaces = () => api.get('/network/interfaces')
export const getDiscoveredDevices = () => api.get('/network/devices')
export const triggerDiscovery = (data) => api.post('/network/discover', data)
export const startMonitoring = (data) => api.post('/network/monitoring/start', data)
export const stopMonitoring = () => api.post('/network/monitoring/stop')
export const clearDiscoveredDevices = () => api.post('/network/devices/clear')

// Cyber Twin Topology & Simulations
export const getTopology = () => api.get('/network/topology')
export const runSimulation = (data) => api.post('/simulation/run', data)
export const getSimulationResults = () => api.get('/simulation/results')

// CyberDNA & Behavioral Analytics
export const getCyberDNAUsers = () => api.get('/cyberdna/users')
export const getCyberDNAUser = (userId) => api.get(`/cyberdna/profile/${userId}`)
export const getCyberDNAProfile = (userId) => api.get(`/cyberdna/profile/${userId}`)
export const getCyberDNABaselines = (userId) => api.get(`/cyberdna/profile/${userId}`)

// Events, Alerts & Incidents
export const getEvents = (params) => api.get('/events', { params })
export const getAlerts = (params) => api.get('/alerts', { params })
export const updateAlert = (alertId, data) => api.patch(`/alerts/${alertId}`, data)
export const getIncidents = (params) => api.get('/incidents', { params })
export const getIncident = (incidentId) => api.get(`/incidents/${incidentId}`)
export const createIncident = (data) => api.post('/incidents', data)
export const updateIncident = (incidentId, data) => api.patch(`/incidents/${incidentId}`, data)

// Device Risk & Inventory
export const getRiskSummary = () => api.get('/risk/summary')
export const getRiskDevices = () => api.get('/risk/devices')
export const getDevices = (params) => api.get('/devices', { params })
export const getAllDevices = (params) => api.get('/devices', { params })
export const getDeviceDetails = (deviceId) => api.get(`/devices/${deviceId}`)
export const getDevice = (deviceId) => api.get(`/devices/${deviceId}`)

export default api