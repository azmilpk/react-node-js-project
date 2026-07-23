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
        <section className="w-full max-w-[1040px] mx-auto">
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
              className="min-w-[140px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
            >
              Go Back
            </button>
          </div>

          {cards.length === 0 && (
            <p className="text-center text-sm text-black mb-6">
              No utilities configured for this site.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 max-w-[980px] mx-auto">
            {cards.map((card) => (
              <div
                key={card.utilityCode}
                className="bg-black rounded-[22px] px-4 py-5 min-h-[230px] flex flex-col items-center text-center"
              >
                <div className="w-[56px] h-[56px] rounded-full border border-white/20 flex items-center justify-center mb-4">
                  <img
                    src={iconMap[card.iconKey] || energyIcon}
                    alt={card.utilityName}
                    className="w-6 h-6 object-contain"
                  />
                </div>

                <h3 className="text-white text-[19px] font-bold mb-2">
                  {card.utilityName}
                </h3>

                <p className="text-white/90 text-[12px] leading-5 max-w-[210px] mb-5">
                  {card.description || 'Initiate a new data entry.'}
                </p>

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
                  className="mt-auto h-[36px] px-5 rounded-full border border-white bg-transparent text-white text-[12px] font-semibold hover:bg-white hover:text-black transition duration-300"
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