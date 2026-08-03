import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { siteUtilityConfig } from '../config/siteUtilityConfig';

import energyIcon from '../assets/facilityvectors/energy.svg';
import fuelIcon from '../assets/facilityvectors/gas.svg';
import producedUnitsIcon from '../assets/facilityvectors/fire.svg';
import wasteIcon from '../assets/facilityvectors/waste.svg';
import waterIcon from '../assets/facilityvectors/water.svg';
import dieselIcon from '../assets/facilityvectors/diesel.svg';

const iconMap = {
  energy: energyIcon,
  fuel: fuelIcon,
  producedUnits: producedUnitsIcon,
  waste: wasteIcon,
  water: waterIcon,
  diesel: dieselIcon,
};

function FacilitySelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);

  // Trigger animation when component mounts
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const selectedFacility = location.state?.facility || '';
  const selectedSite = location.state?.site || '';
  const selectedEntry =
    location.state?.entry ||
    (selectedFacility && selectedSite
      ? `${selectedFacility}-${selectedSite}`
      : selectedSite || selectedFacility);

  const cards =
    siteUtilityConfig[selectedSite] ||
    siteUtilityConfig[selectedFacility] ||
    [];

  return (
    <div className="w-full h-screen bg-[#fafaf9] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex justify-center px-4 py-4">
        <section className="w-full max-w-[1280px] mx-auto">
          <div className="text-center mb-5">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black mb-2">
              Welcome to {selectedEntry}
            </h1>

            <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-black max-w-[760px] mx-auto leading-6">
              What would you like to do today? Select the utility for which you want to enter the data
            </p>
          </div>

          <div className="flex justify-end mb-6">
            <button
              type="button"
              onClick={() =>
                navigate('/site-owner', {
                  state: {
                    facility: selectedFacility,
                    site: selectedSite,
                    entry: selectedEntry,
                  },
                })
              }
              className="min-w-[140px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 hover:scale-105 transition-all duration-300 shadow-md"
            >
              Go Back
            </button>
          </div>

          {cards.length === 0 && (
            <p className="text-center text-sm text-black mb-6">
              No utilities configured for this site.
            </p>
          )}

          {/* Dynamic Animated Grid */}
          <div
            className={`grid gap-3 sm:gap-4 mb-6 w-full mx-auto ${
              cards.length <= 3
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-[980px]'
                : 'grid-cols-2 md:grid-cols-4 max-w-[1280px]'
            }`}
          >
            {cards.map((card, idx) => (
              <div
                key={card.utilityCode}
                style={{ transitionDelay: `${idx * 100}ms` }}
                className={`group bg-black rounded-[22px] px-3 py-4 sm:px-4 sm:py-5 min-h-[220px] sm:min-h-[240px] flex flex-col items-center text-center justify-between min-w-0 
                  transform transition-all duration-600 ease-out 
                  hover:-translate-y-2 hover:shadow-xl hover:scale-[1.02]
                  ${isLoaded ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-5 opacity-0 scale-95'}`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] rounded-full border border-white/20 group-hover:border-white/50 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
                    <img
                      src={iconMap[card.iconKey] || energyIcon}
                      alt={card.utilityName}
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                  </div>

                  <h3 className="text-white text-[16px] sm:text-[18px] font-bold mb-1 truncate w-full">
                    {card.utilityName}
                  </h3>

                  <p className="text-white/80 text-[11px] sm:text-[12px] leading-4 sm:leading-5 mb-3">
                    {card.description || 'Initiate a new data entry.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/form-details', {
                      state: {
                        facility: selectedFacility,
                        site: selectedSite,
                        entry: selectedEntry,
                        utilityCode: card.utilityCode,
                        utilityName: card.utilityName,
                      },
                    })
                  }
                  className="w-full sm:w-auto min-w-[100px] h-[34px] sm:h-[36px] px-3 sm:px-5 rounded-full border border-white bg-transparent text-white text-[11px] sm:text-[12px] font-semibold hover:bg-white hover:text-black transition duration-300 truncate active:scale-95"
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default FacilitySelectionPage;