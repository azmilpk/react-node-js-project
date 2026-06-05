import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SiteOwnerPage from './pages/SiteOwnerPage';
import FacilitySelectionPage from './pages/FacilitySelectionPage';
import FormDetailsPage from './pages/FormDetailsPage';
import ValidatePage from './pages/ValidatePage';
import ValidatedDataPage from './pages/ValidatedDataPage';
import UlPurePage from './pages/UlPurePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/site-owner" element={<SiteOwnerPage />} />
        <Route path="/facility-selection" element={<FacilitySelectionPage />} />
        <Route path="/form-details" element={<FormDetailsPage />} />
        <Route path="/validate-data" element={<ValidatePage />} />
        <Route path="/validated-data" element={<ValidatedDataPage />} />
        <Route path="/ul-pure" element={<UlPurePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;