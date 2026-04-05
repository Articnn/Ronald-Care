import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from './components/auth/RequireRole'
import { AppShell } from './components/layout/AppShell'
import { AppProvider } from './context/AppContext'
import { AccountPage } from './pages/AccountPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminPanelPage } from './pages/admin/AdminPanelPage'
import { DonorDonatePage } from './pages/donor/DonorDonatePage'
import { DonorGalleryPage } from './pages/donor/DonorGalleryPage'
import { DonorHomePage } from './pages/donor/DonorHomePage'
import { DonorImpactPage } from './pages/donor/DonorImpactPage'
import { FamilyCommunityPage } from './pages/family/FamilyCommunityPage'
import { FamilyGuidePage } from './pages/family/FamilyGuidePage'
import { FamilyLoginPage } from './pages/family/FamilyLoginPage'
import { FamilyPausePage } from './pages/family/FamilyPausePage'
import { FamilyRequestPage } from './pages/family/FamilyRequestPage'
import { FamilyReturnPassPage } from './pages/family/FamilyReturnPassPage'
import { FamilyStatusPage } from './pages/family/FamilyStatusPage'
import { KioskPage } from './pages/family/KioskPage'
import { OperationalAccessPage } from './pages/OperationalAccessPage'
import { HospitalLoginPage } from './pages/hospital/HospitalLoginPage'
import { HospitalReferralDetailPage } from './pages/hospital/HospitalReferralDetailPage'
import { HospitalReferralsPage } from './pages/hospital/HospitalReferralsPage'
import { ProfileSelectorPage } from './pages/ProfileSelectorPage'
import { StaffAnalyticsPage } from './pages/staff/StaffAnalyticsPage'
import { StaffCheckinPage } from './pages/staff/StaffCheckinPage'
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage'
import { StaffInventoryPage } from './pages/staff/StaffInventoryPage'
import { StaffLoginPage } from './pages/staff/StaffLoginPage'
import { StaffReceptionPage } from './pages/staff/StaffReceptionPage'
import { StaffRequestsPage } from './pages/staff/StaffRequestsPage'
import { StaffRoomsPage } from './pages/staff/StaffRoomsPage'
import { StaffTripsPage } from './pages/staff/StaffTripsPage'
import { StaffVolunteersPage } from './pages/staff/StaffVolunteersPage'
import { VolunteerLoginPage } from './pages/volunteer/VolunteerLoginPage'
import { VolunteerRequestsPage } from './pages/volunteer/VolunteerRequestsPage'
import { VolunteerTripsPage } from './pages/volunteer/VolunteerTripsPage'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<ProfileSelectorPage />} />
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

            <Route path="/hospital/login" element={<HospitalLoginPage />} />
            <Route
              path="/hospital/referrals"
              element={
                <RequireRole allowed={['hospital', 'admin', 'superadmin']}>
                  <HospitalReferralsPage />
                </RequireRole>
              }
            />
            <Route
              path="/hospital/referrals/:id"
              element={
                <RequireRole allowed={['hospital', 'admin', 'superadmin']}>
                  <HospitalReferralDetailPage />
                </RequireRole>
              }
            />

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
              path="/staff/reception"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffReceptionPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/checkin/:refId"
              element={
                <RequireRole allowed={['staff', 'admin', 'superadmin']}>
                  <StaffCheckinPage />
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

            <Route path="/volunteer/login" element={<VolunteerLoginPage />} />
            <Route
              path="/volunteer/requests"
              element={
                <RequireRole allowed={['volunteer', 'admin', 'superadmin']}>
                  <VolunteerRequestsPage />
                </RequireRole>
              }
            />
            <Route
              path="/volunteer/trips"
              element={
                <RequireRole allowed={['volunteer', 'admin', 'superadmin']}>
                  <VolunteerTripsPage />
                </RequireRole>
              }
            />

            <Route path="/family/login" element={<FamilyLoginPage />} />
            <Route
              path="/family/request"
              element={
                <RequireRole allowed={['family']}>
                  <FamilyRequestPage />
                </RequireRole>
              }
            />
            <Route
              path="/family/guide"
              element={
                <RequireRole allowed={['family']}>
                  <FamilyGuidePage />
                </RequireRole>
              }
            />
            <Route
              path="/family/pause"
              element={
                <RequireRole allowed={['family']}>
                  <FamilyPausePage />
                </RequireRole>
              }
            />
            <Route
              path="/family/return-pass"
              element={
                <RequireRole allowed={['family']}>
                  <FamilyReturnPassPage />
                </RequireRole>
              }
            />
            <Route
              path="/family/community"
              element={
                <RequireRole allowed={['family']}>
                  <FamilyCommunityPage />
                </RequireRole>
              }
            />
            <Route
              path="/family/status"
              element={
                <RequireRole allowed={['family']}>
                  <FamilyStatusPage />
                </RequireRole>
              }
            />

            <Route
              path="/account"
              element={
                <RequireRole allowed={['superadmin', 'admin', 'hospital', 'staff', 'volunteer', 'family']}>
                  <AccountPage />
                </RequireRole>
              }
            />

            <Route path="/donor/home" element={<DonorHomePage />} />
            <Route path="/donor/gallery" element={<DonorGalleryPage />} />
            <Route path="/donor/impact" element={<DonorImpactPage />} />
            <Route path="/donor/donate" element={<DonorDonatePage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
