import axios from 'axios'

const API_BASE = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
})

export const shipmentService = {
  // Fetch all shipments
  getAll: async () => {
    const res = await api.get('/shipments/')
    return res.data
  },

  // Fetch one shipment by ID
  getById: async (id) => {
    const res = await api.get(`/shipments/${id}`)
    return res.data
  },

  // Fetch summary stats
  getStats: async () => {
    const res = await api.get('/shipments/stats/summary')
    return res.data
  },
}

export default api
