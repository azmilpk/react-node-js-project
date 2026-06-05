import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

import addDataIcon from '../assets/siteownervectors/add_data.svg';
import checkData1Icon from '../assets/siteownervectors/checkdata1.svg';
import checkData2Icon from '../assets/siteownervectors/checkdata2.svg';

function SiteOwnerPage() {
  const navigate = useNavigate();

  const [selectedSite, setSelectedSite] = useState('');
  const [error, setError] = useState('');

  const handleEnterData = () => {
    if (!selectedSite) {
      setError('Please select a site first.');
      return;
    }

    setError('');
    navigate('/facility-selection', {
      state: { site: selectedSite },
    });
  };

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex justify-center px-4 py-4">
        <section className="w-full max-w-[1040px] mx-auto">
          {/* Heading */}
          <div className="text-center mb-5">
  <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black mb-2">
    Site Owner Login
  </h1>

  <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-black max-w-[760px] mx-auto leading-6">
    Which Site would you like to select today? Select a site below to get started.
  </p>
</div>

          {/* Dropdowns */}
<div className="flex flex-col md:flex-row flex-wrap justify-center gap-3 sm:gap-4 mb-6">
  <select
    value={selectedSite}
    onChange={(e) => {
      setSelectedSite(e.target.value);
      setError('');
    }}
    className="w-full md:w-[340px] xl:w-[380px] h-[46px] sm:h-[30px] px-4 rounded-full border border-black/30 bg-white text-[14px]sm:text-[16px] outline-none"
  >
    <option value="">Select Site</option>
    <option value="Köping">Köping</option>
    <option value="LVO">LVO</option>
    <option value="NRV">NRV</option>
  </select>

  <select
    className="w-full md:w-[340px] xl:w-[380px] h-[46px] sm:h-[30px] px-4 rounded-full border border-black/30 bg-white text-[14px] sm:text-[16px] outline-none"
  >
    <option value="">Select Option</option>
  </select>
</div>

          {/* Error */}
          {error && (
            <p className="text-center text-red-500 text-sm mb-5">
              {error}
            </p>
          )}

          {/* Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-[980px] mx-auto">
  {/* Card 1 */}
  <div className="bg-black rounded-[22px] px-4 py-5 min-h-[230px] flex flex-col items-center text-center">
    <div className="w-[56px] h-[56px] rounded-full border border-white/20 flex items-center justify-center mb-4">
      <img
        src={addDataIcon}
        alt="Enter Data"
        className="w-6 h-6 object-contain"
      />
    </div>

    <h3 className="text-white text-[19px] font-bold mb-2">
      Enter Data
    </h3>

    <p className="text-white/90 text-[12px] leading-5 max-w-[210px] mb-5">
      Initiate a new Data entry. Add required details & additional documents.
    </p>

    <button
      type="button"
      onClick={handleEnterData}
      className="mt-auto h-[36px] px-5 rounded-full border border-white bg-transparent text-white text-[12px] font-semibold hover:bg-white hover:text-black transition duration-300"
    >
      Get Started
    </button>
  </div>

  {/* Card 2 */}
  <div className="bg-black rounded-[22px] px-4 py-5 min-h-[230px] flex flex-col items-center text-center">
    <div className="w-[56px] h-[56px] rounded-full border border-white/20 flex items-center justify-center mb-4">
      <img
        src={checkData1Icon}
        alt="Validate Data"
        className="w-6 h-6 object-contain"
      />
    </div>

    <h3 className="text-white text-[19px] font-bold mb-2">
      Validate Data
    </h3>

    <p className="text-white/90 text-[12px] leading-5 max-w-[210px] mb-5">
      Access your entered Data, add notes & upload documents if needed.
    </p>

    <button
      type="button"
      onClick={() => {
  if (!selectedSite) {
    setError('Please select a site first.');
    return;
  }

  navigate('/validate-data', {
    state: { site: selectedSite },
  });
}}
      className="mt-auto h-[36px] px-5 rounded-full border border-white bg-transparent text-white text-[12px] font-semibold hover:bg-white hover:text-black transition duration-300"
    >
      Get Started
    </button>
  </div>

  {/* Card 3 */}
  <div className="bg-black rounded-[22px] px-4 py-5 min-h-[230px] flex flex-col items-center text-center">
    <div className="w-[56px] h-[56px] rounded-full border border-white/20 flex items-center justify-center mb-4">
      <img
        src={checkData2Icon}
        alt="UL Pure"
        className="w-6 h-6 object-contain"
      />
    </div>

    <h3 className="text-white text-[19px] font-bold mb-2">
      UL Pure
    </h3>

    <p className="text-white/90 text-[12px] leading-5 max-w-[210px] mb-5">
      Access your entered Data, add notes & upload documents if needed.
    </p>

    <button
      type="button"
      onClick={() => navigate('/ul-pure')}
      className="mt-auto h-[36px] px-5 rounded-full border border-white bg-transparent text-white text-[12px] font-semibold hover:bg-white hover:text-black transition duration-300"
    >
      Get Started
    </button>
  </div>
</div>

          {/* Home Screen Button */}
          <div className="flex justify-center pb-2">
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