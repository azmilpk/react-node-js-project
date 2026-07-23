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

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes — no auth needed */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Site Owner routes */}
        <Route
          path="/site-owner"
          element={
            <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
              <SiteOwnerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility-selection"
          element={
            <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
              <FacilitySelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/form-details"
          element={
            <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
              <FormDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/validate-data"
          element={
            <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
              <ValidatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/validate-details"
          element={
            <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
              <ValidateDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ul-pure"
          element={
            <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
              <UlPurePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ul-pure-details"
          element={
            <ProtectedRoute allowedRoles={['SiteOwner', 'Admin']}>
              <UlPureDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* Auditor routes */}
        <Route
          path="/auditor-ul-pure"
          element={
            <ProtectedRoute allowedRoles={['Auditor', 'Admin']}>
              <AuditorUlPurePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditor-validate-data"
          element={
            <ProtectedRoute allowedRoles={['Auditor', 'Admin']}>
              <AuditorValidatePage />
            </ProtectedRoute>
          }
        />

        {/* Shared routes — all authenticated users */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;