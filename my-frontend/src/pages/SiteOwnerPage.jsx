import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { savePersistentCache, loadPersistentCache, clearAllPageCaches } from '../utils/pageCache';

import addDataIcon from '../assets/siteownervectors/add_data.svg';
import checkData1Icon from '../assets/siteownervectors/checkdata1.svg';
import checkData2Icon from '../assets/siteownervectors/checkdata2.svg';
import fileDashboardIcon from '../assets/siteownervectors/files.svg';

const SITE_CACHE_KEY = 'siteOwner_selection';

const siteOptions = {
  'Köping': ['Köping'],
  'NRV': ['NRV'],
  'LVO': ['LVLC', 'MEC', 'RT100', 'Macungie'],
};

function SiteOwnerPage() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  // Trigger animation after page mounts
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Load saved selection from cache on first render
  const getSaved = () => {
    const cached = loadPersistentCache(SITE_CACHE_KEY, 24 * 60 * 60 * 1000); // 24 hours
    return cached?.data || { facility: '', site: '' };
  };

  const saved = getSaved();

  const [selectedFacility, setSelectedFacility] = useState(saved.facility || '');
  const [selectedSite, setSelectedSite] = useState(saved.site || '');
  const [error, setError] = useState('');

  const availableSubSites = selectedFacility
    ? siteOptions[selectedFacility] || []
    : [];

  // Save selection to cache whenever it changes
  useEffect(() => {
    if (selectedFacility || selectedSite) {
      savePersistentCache(SITE_CACHE_KEY, {
        facility: selectedFacility,
        site: selectedSite,
      });
    }
  }, [selectedFacility, selectedSite]);

  const handleFacilityChange = (e) => {
    const value = e.target.value;
    const subSites = siteOptions[value] || [];

    setSelectedFacility(value);
    setError('');
    clearAllPageCaches();

    if (subSites.length === 1) {
      setSelectedSite(subSites[0]);
    } else if (value === 'LVO') {
      setSelectedSite('LVLC');
    } else {
      setSelectedSite('');
    }
  };

  const handleSiteChange = (e) => {
    setSelectedSite(e.target.value);
    setError('');
    clearAllPageCaches();
  };

  const getEntryValue = () => {
    if (!selectedFacility || !selectedSite) return '';
    return `${selectedFacility}-${selectedSite}`;
  };

  const handleEnterData = () => {
    if (!selectedFacility || !selectedSite) {
      setError('Please select both facility and site.');
      return;
    }
    setError('');
    navigate('/facility-selection', {
      state: {
        facility: selectedFacility,
        site: selectedSite,
        entry: getEntryValue(),
      },
    });
  };

  const handleValidateData = () => {
    if (!selectedFacility || !selectedSite) {
      setError('Please select both facility and site.');
      return;
    }
    setError('');
    navigate('/validate-data', {
      state: {
        facility: selectedFacility,
        site: selectedSite,
        entry: getEntryValue(),
      },
    });
  };

  const handleFileDashboard = () => {
    if (!selectedFacility || !selectedSite) {
      setError('Please select both facility and site.');
      return;
    }
    setError('');
    navigate('/file-dashboard', {
      state: {
        facility: selectedFacility,
        site: selectedSite,
        entry: getEntryValue(),
      },
    });
  };

  const handleUlPure = () => {
    if (!selectedFacility || !selectedSite) {
      setError('Please select both facility and site.');
      return;
    }
    setError('');
    navigate('/ul-pure', {
      state: {
        facility: selectedFacility,
        site: selectedSite,
        entry: getEntryValue(),
      },
    });
  };

  const cardsData = [
    {
      title: 'Enter Data',
      desc: 'Initiate a new Data entry. Add required details & documents.',
      icon: addDataIcon,
      action: handleEnterData,
    },
    {
      title: 'Validate Data',
      desc: 'Access entered Data, add notes & upload documents.',
      icon: checkData1Icon,
      action: handleValidateData,
    },
    {
      title: 'File Dashboard',
      desc: 'View uploaded files and track their status.',
      icon: fileDashboardIcon,
      action: handleFileDashboard,
    },
    {
      title: 'UL Pure',
      desc: 'Access validated data and reporting details.',
      icon: checkData2Icon,
      action: handleUlPure,
    },
  ];

  return (
    <div className="w-full h-screen bg-[#fafaf9] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex justify-center px-4 py-4">
        <section className="w-full max-w-[1280px] mx-auto">
          <div className="text-center mb-5">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black mb-2">
              Site Owner Login
            </h1>

            <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-black max-w-[760px] mx-auto leading-6">
              Which Site would you like to select today? Select a site below to get started.
            </p>
          </div>

          <div className="flex flex-col md:flex-row flex-wrap justify-center gap-3 sm:gap-4 mb-6">
            <select
              value={selectedFacility}
              onChange={handleFacilityChange}
              className="w-full md:w-[340px] xl:w-[380px] h-[28px] px-4 rounded-full border border-black/30 bg-white text-[14px] sm:text-[16px] outline-none"
            >
              <option value="">Select Facility</option>
              {Object.keys(siteOptions).map((facility) => (
                <option key={facility} value={facility}>
                  {facility}
                </option>
              ))}
            </select>

            <select
              value={selectedSite}
              onChange={handleSiteChange}
              disabled={!selectedFacility}
              className="w-full md:w-[340px] xl:w-[380px] h-[28px] px-4 rounded-full border border-black/30 bg-white text-[14px] sm:text-[16px] outline-none disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">
                {selectedFacility ? 'Select Site' : 'Select Facility First'}
              </option>
              {availableSubSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-center text-red-500 text-sm mb-4">
              {error}
            </p>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 w-full mx-auto">
            {cardsData.map((card, idx) => (
              <div
                key={idx}
                style={{ transitionDelay: `${idx * 100}ms` }}
                className={`group bg-black rounded-[22px] px-3 py-4 sm:px-4 sm:py-5 min-h-[220px] sm:min-h-[240px] flex flex-col items-center text-center justify-between min-w-0 
                  transform transition-all duration-600 ease-out 
                  hover:-translate-y-2 hover:shadow-xl hover:scale-[1.02]
                  ${isLoaded ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-5 opacity-0 scale-95'}`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] rounded-full border border-white/20 group-hover:border-white/50 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                  </div>

                  <h3 className="text-white text-[16px] sm:text-[18px] font-bold mb-1 truncate w-full">
                    {card.title}
                  </h3>

                  <p className="text-white/80 text-[11px] sm:text-[12px] leading-4 sm:leading-5 mb-3">
                    {card.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={card.action}
                  className="w-full sm:w-auto min-w-[100px] h-[34px] sm:h-[36px] px-3 sm:px-5 rounded-full border border-white bg-transparent text-white text-[11px] sm:text-[12px] font-semibold hover:bg-white hover:text-black transition duration-300 truncate active:scale-95"
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-1 pb-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-w-[160px] h-[44px] px-6 rounded-full bg-black text-white text-[14px] font-semibold hover:bg-neutral-800 hover:scale-105 transition-all duration-300 shadow-md"
            >
              Home Screen
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SiteOwnerPage;