import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SiteOwnerPage from './pages/SiteOwnerPage';
import FacilitySelectionPage from './pages/FacilitySelectionPage';
import FormDetailsPage from './pages/FormDetailsPage';
import ValidatePage from './pages/ValidatePage';
import ValidateDetailsPage from './pages/ValidateDetailsPage';
import UlPureDetailsPage from './pages/UlPureDetailsPage';
import UlPurePage from './pages/UlPurePage';
import ProfilePage from './pages/ProfilePage';
import AuditorUlPurePage from './pages/AuditorUlPurePage';
import AuditorValidatePage from './pages/AuditorValidatePage';
import ProtectedRoute from './components/topnavbar/ProtectedRoute';
import FileDashboardPage from './pages/FileDashboardPage';
import ConsumptionTrendPage from './pages/ConsumptionTrendPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Site Owner only */}
        <Route path="/site-owner" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <SiteOwnerPage />
          </ProtectedRoute>
        } />
        
        <Route path="/facility-selection" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <FacilitySelectionPage />
          </ProtectedRoute>
        } />
        <Route path="/form-details" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <FormDetailsPage />
          </ProtectedRoute>
        } />
        <Route path="/validate-data" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <ValidatePage />
          </ProtectedRoute>
        } />
        <Route path="/file-dashboard" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <FileDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/consumption-trend" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <ConsumptionTrendPage />
          </ProtectedRoute>
        } />
        <Route path="/validate-details" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <ValidateDetailsPage />
          </ProtectedRoute>
        } />
        <Route path="/ul-pure" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <UlPurePage />
          </ProtectedRoute>
        } />
        <Route path="/ul-pure-details" element={
          <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
            <UlPureDetailsPage />
          </ProtectedRoute>
        } />

        {/* Auditor only */}
        <Route path="/auditor-ul-pure" element={
          <ProtectedRoute allowedRoles={['Auditor', 'Admin']}>
            <AuditorUlPurePage />
          </ProtectedRoute>
        } />
        <Route path="/auditor-validate-data" element={
          <ProtectedRoute allowedRoles={['Auditor', 'Admin']}>
            <AuditorValidatePage />
          </ProtectedRoute>
        } />

        {/* Shared — all logged in users */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
