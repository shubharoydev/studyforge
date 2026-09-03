import { getAnalytics } from '../services/analytics.service.js'
import { getRecommendations } from '../services/recommendations.service.js'

export async function analyticsHandler(request) {
  return await getAnalytics(request.user.id)
}

export async function recommendationsHandler(request) {
  return { recommendations: await getRecommendations(request.user.id) }
}
