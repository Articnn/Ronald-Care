import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from './components/auth/RequireRole'
import { AppShell } from './components/layout/AppShell'
import { AppProvider } from './context/AppContext'
import { AccountPage } from './pages/AccountPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminPanelPage } from './pages/admin/AdminPanelPage'
import { KioskPage } from './pages/family/KioskPage'
import { OperationalAccessPage } from './pages/OperationalAccessPage'
import { StaffAnalyticsPage } from './pages/staff/StaffAnalyticsPage'
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage'
import { StaffEntriesPage } from './pages/staff/StaffEntriesPage'
import { StaffInventoryPage } from './pages/staff/StaffInventoryPage'
import { StaffLoginPage } from './pages/staff/StaffLoginPage'
import { StaffReceptionPage } from './pages/staff/StaffReceptionPage'
import { StaffRequestsPage } from './pages/staff/StaffRequestsPage'
import { StaffRoomsPage } from './pages/staff/StaffRoomsPage'
import { StaffTripsPage } from './pages/staff/StaffTripsPage'
import { StaffVolunteersPage } from './pages/staff/StaffVolunteersPage'
import { StaffWaitlistPage } from './pages/staff/StaffWaitlistPage'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<OperationalAccessPage />} />
            <Route path="/access" element={<Navigate to="/login" replace />} />

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/panel"
              element={
                <RequireRole allowed={['admin', 'superadmin']}>
                  <AdminPanelPage />
                </RequireRole>
              }
            />
            <Route path="/hospital/login" element={<Navigate to="/login" replace />} />
            <Route path="/hospital/referrals" element={<Navigate to="/staff/admissions" replace />} />
            <Route path="/hospital/referrals/:id" element={<Navigate to="/staff/admissions" replace />} />

            <Route path="/staff/login" element={<StaffLoginPage />} />
            <Route
              path="/staff/dashboard"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/admissions"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffEntriesPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/waitlist"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffWaitlistPage />
                </RequireRole>
              }
            />
            <Route path="/staff/entries" element={<Navigate to="/staff/admissions" replace />} />
            <Route
              path="/staff/reception"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffReceptionPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/kiosk"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <KioskPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/rooms"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffRoomsPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/requests"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffRequestsPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/trips"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffTripsPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/volunteers"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffVolunteersPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/inventory"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffInventoryPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/analytics"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffAnalyticsPage />
                </RequireRole>
              }
            />

            <Route path="/volunteer/login" element={<Navigate to="/login" replace />} />
            <Route path="/volunteer/requests" element={<Navigate to="/login" replace />} />
            <Route path="/volunteer/trips" element={<Navigate to="/login" replace />} />

            <Route path="/family/login" element={<Navigate to="/login" replace />} />
            <Route path="/family/request" element={<Navigate to="/login" replace />} />
            <Route path="/family/guide" element={<Navigate to="/login" replace />} />
            <Route path="/family/pause" element={<Navigate to="/login" replace />} />
            <Route path="/family/return-pass" element={<Navigate to="/login" replace />} />
            <Route path="/family/community" element={<Navigate to="/login" replace />} />
            <Route path="/family/status" element={<Navigate to="/login" replace />} />

            <Route
              path="/account"
              element={
                <RequireRole allowed={['superadmin', 'admin', 'staff']}>
                  <AccountPage />
                </RequireRole>
              }
            />

            <Route path="/donor/home" element={<Navigate to="/login" replace />} />
            <Route path="/donor/gallery" element={<Navigate to="/login" replace />} />
            <Route path="/donor/impact" element={<Navigate to="/login" replace />} />
            <Route path="/donor/donate" element={<Navigate to="/login" replace />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
