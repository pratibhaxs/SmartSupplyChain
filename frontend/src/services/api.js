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

// ── Phase 3: Routing + Decision + AI ──────────────────────────────────────

export const routingService = {
  getRoute: (id, optimizeFor = 'balanced') =>
    api.get(`/routes/${id}?optimize_for=${optimizeFor}`).then(r => r.data),

  optimizeRoute: (shipmentId, optimizeFor = 'balanced') =>
    api.post('/routes/optimize', { shipment_id: shipmentId, optimize_for: optimizeFor }).then(r => r.data),

  triggerReroute: (shipmentId, optimizeFor = 'balanced') =>
    api.post('/decision/reroute', { shipment_id: shipmentId, optimize_for: optimizeFor }).then(r => r.data),

  explainRoute: (shipmentId, optimizeFor = 'balanced') =>
    api.post('/ai/explain-route', { shipment_id: shipmentId, optimize_for: optimizeFor }).then(r => r.data),

  getLiveConditions: () =>
    api.get('/routes/conditions/live').then(r => r.data),
}
