import http from 'node:http'
import dotenv from 'dotenv'

dotenv.config()

import authLogin from './api/auth/login.js'
import authFamilyAccess from './api/auth/family-access.js'
import authLogout from './api/auth/logout.js'
import authMe from './api/auth/me.js'
import authChangePassword from './api/auth/change-password.js'
import authChangePin from './api/auth/change-pin.js'
import adminUsers from './api/admin/users.js'
import { activateFamilyHandler, familyAccessAdminHandler, pendingReferralsHandler } from './api/admin/families.js'
import referralsIndex from './api/referrals/index.js'
import referralsStatus from './api/referrals/status.js'
import familiesCheckin from './api/families/checkin.js'
import familiesIndex from './api/families/index.js'
import familiesStatus from './api/families/status.js'
import requestsIndex from './api/requests/index.js'
import requestsAssign from './api/requests/assign.js'
import requestsResolve from './api/requests/resolve.js'
import requestsStatus from './api/requests/status.js'
import tripsIndex from './api/trips/index.js'
import tripsStart from './api/trips/start.js'
import tripsFinish from './api/trips/finish.js'
import volunteersShifts from './api/volunteers/shifts.js'
import volunteersRoster from './api/volunteers/roster.js'
import volunteersCoverage from './api/volunteers/coverage.js'
import volunteerTasks from './api/volunteer-tasks/index.js'
import volunteerChangeRequests from './api/volunteer-change-requests/index.js'
import volunteerAlerts from './api/volunteer-alerts/index.js'
import notificationsIndex from './api/notifications/index.js'
import inventoryStock from './api/inventory/stock.js'
import inventoryMovements from './api/inventory/movements.js'
import kioskStatus from './api/kiosk/status.js'
import analyticsKpis from './api/analytics/kpis.js'
import staffDashboard from './api/staff/dashboard.js'
import donorImpact from './api/donor/impact.js'
import communityPosts from './api/community/posts.js'
import communityReport from './api/community/report.js'
import communityModerate from './api/community/moderate.js'
import returnPasses from './api/return-passes/index.js'
import healthIndex from './api/health/index.js'

const routes = {
  'POST /api/auth/login': authLogin,
  'POST /api/auth/family-access': authFamilyAccess,
  'POST /api/auth/logout': authLogout,
  'GET /api/auth/me': authMe,
  'PATCH /api/auth/change-password': authChangePassword,
  'PATCH /api/auth/change-pin': authChangePin,
  'GET /api/admin/users': adminUsers,
  'POST /api/admin/users': adminUsers,
  'PATCH /api/admin/users': adminUsers,
  'DELETE /api/admin/users': adminUsers,
  'GET /api/admin/pending-referrals': pendingReferralsHandler,
  'POST /api/admin/activate-family': activateFamilyHandler,
  'PATCH /api/admin/family-access': familyAccessAdminHandler,
  'GET /api/referrals': referralsIndex,
  'POST /api/referrals': referralsIndex,
  'PATCH /api/referrals/status': referralsStatus,
  'GET /api/families': familiesIndex,
  'PATCH /api/families/checkin': familiesCheckin,
  'GET /api/families/status': familiesStatus,
  'GET /api/kiosk/status': kioskStatus,
  'GET /api/requests': requestsIndex,
  'POST /api/requests': requestsIndex,
  'PATCH /api/requests/assign': requestsAssign,
  'PATCH /api/requests/resolve': requestsResolve,
  'PATCH /api/requests/status': requestsStatus,
  'GET /api/trips': tripsIndex,
  'POST /api/trips': tripsIndex,
  'PATCH /api/trips/start': tripsStart,
  'PATCH /api/trips/finish': tripsFinish,
  'GET /api/volunteers/shifts': volunteersShifts,
  'POST /api/volunteers/shifts': volunteersShifts,
  'GET /api/volunteers/roster': volunteersRoster,
  'GET /api/volunteers/coverage': volunteersCoverage,
  'GET /api/volunteer-tasks': volunteerTasks,
  'POST /api/volunteer-tasks': volunteerTasks,
  'PATCH /api/volunteer-tasks': volunteerTasks,
  'GET /api/volunteer-change-requests': volunteerChangeRequests,
  'POST /api/volunteer-change-requests': volunteerChangeRequests,
  'PATCH /api/volunteer-change-requests': volunteerChangeRequests,
  'POST /api/volunteer-alerts': volunteerAlerts,
  'GET /api/notifications': notificationsIndex,
  'PATCH /api/notifications': notificationsIndex,
  'GET /api/inventory/stock': inventoryStock,
  'POST /api/inventory/movements': inventoryMovements,
  'GET /api/staff/dashboard': staffDashboard,
  'GET /api/analytics/kpis': analyticsKpis,
  'GET /api/donor/impact': donorImpact,
  'GET /api/community/posts': communityPosts,
  'POST /api/community/posts': communityPosts,
  'PATCH /api/community/report': communityReport,
  'PATCH /api/community/moderate': communityModerate,
  'GET /api/return-passes': returnPasses,
  'POST /api/return-passes': returnPasses,
  'GET /api/health': healthIndex,
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const routeKey = `${req.method} ${pathname}`
  let handler = routes[routeKey]

  if (!handler && req.method === 'OPTIONS') {
    handler = Object.entries(routes).find(([key]) => key.endsWith(` ${pathname}`))?.[1]
  }

  if (!handler) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: false, data: null, error: { message: 'Ruta no encontrada' } }))
    return
  }

  return handler(req, res)
})

const port = process.env.PORT || 8787
server.listen(port, () => {
  console.log(`Serverless dev API running on http://localhost:${port}`)
})
