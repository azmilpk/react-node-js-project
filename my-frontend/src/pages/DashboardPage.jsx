import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

import fileDashboardIcon from '../assets/siteownervectors/files.svg';
import graphIcon from '../assets/siteownervectors/graph.svg';

function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);

  const selectedFacility = location.state?.facility || '';
  const selectedSite = location.state?.site || '';
  const selectedEntry = location.state?.entry || '';

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const cards = [
    {
      title: 'File Dashboard',
      desc: 'View uploaded invoices, track file status and preview documents.',
      icon: fileDashboardIcon,
      action: () =>
        navigate('/file-dashboard', {
          state: {
            facility: selectedFacility,
            site: selectedSite,
            entry: selectedEntry,
          },
        }),
    },
    {
      title: 'Consumption Trend',
      desc: 'Track month-over-month consumption changes and spot increases.',
      icon: graphIcon,
      action: () =>
        navigate('/consumption-trend', {
          state: {
            facility: selectedFacility,
            site: selectedSite,
            entry: selectedEntry,
          },
        }),
    },
  ];

  return (
    <div className="w-full h-screen bg-[#fafaf9] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex justify-center px-4 py-4">
        <section className="w-full max-w-[1280px] mx-auto">
          <div className="text-center mb-5">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black mb-2">
              Dashboard
            </h1>
            <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-black max-w-[760px] mx-auto leading-6">
              {selectedEntry || selectedSite || 'Your Site'} — Select a dashboard view
            </p>
          </div>

          <div className="flex justify-end mb-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="min-w-[140px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 hover:scale-105 transition-all duration-300 shadow-md"
            >
              Go Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[700px] mx-auto mb-6">
            {cards.map((card, idx) => (
              <div
                key={idx}
                style={{ transitionDelay: `${idx * 100}ms` }}
                className={`group bg-black rounded-[22px] px-4 py-5 min-h-[240px] flex flex-col items-center text-center justify-between
                  transform transition-all duration-600 ease-out
                  hover:-translate-y-2 hover:shadow-xl hover:scale-[1.02]
                  ${isLoaded ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-5 opacity-0 scale-95'}`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-[52px] h-[52px] rounded-full border border-white/20 group-hover:border-white/50 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
                    <img
                      src={card.icon}
                      alt={card.title}
                      className="w-6 h-6 object-contain"
                    />
                  </div>

                  <h3 className="text-white text-[18px] font-bold mb-1">
                    {card.title}
                  </h3>

                  <p className="text-white/80 text-[12px] leading-5 mb-3">
                    {card.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={card.action}
                  className="min-w-[120px] h-[36px] px-5 rounded-full border border-white bg-transparent text-white text-[12px] font-semibold hover:bg-white hover:text-black transition duration-300 active:scale-95"
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

export default DashboardPage;