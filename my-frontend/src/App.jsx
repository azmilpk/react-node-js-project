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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/site-owner" element={<SiteOwnerPage />} />
        <Route path="/facility-selection" element={<FacilitySelectionPage />} />
        <Route path="/form-details" element={<FormDetailsPage />} />
        <Route path="/validate-data" element={<ValidatePage />} />
        <Route path="/validate-details" element={<ValidateDetailsPage />} />
        <Route path="/ul-pure-details" element={<UlPureDetailsPage />} />
        <Route path="/ul-pure" element={<UlPurePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;