import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import homeImage from '../assets/images/final.jpg';
import ecoLogo from '../assets/images/ecoLogo.svg';

function HomePage() {
  const navigate = useNavigate();
  const userName = 'Operations Admin';
  const userId = 'Portal_User_01';

  const handleAuditorLogin = () => {
    navigate('/login', {
      state: {
        role: 'Auditor',
      },
    });
  };

  const handleSiteOwnerLogin = () => {
    navigate('/login', {
      state: {
        role: 'SiteOwner',
      },
    });
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-black">
      <main
        className="relative flex-1 min-h-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${homeImage})`,
        }}
      >
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 h-full w-full flex items-center justify-center lg:justify-end px-4 sm:px-8 lg:px-16">
          <div
            className="w-full max-w-md rounded-[30px] px-6 py-8 sm:px-8 sm:py-10 text-center border border-white/10 bg-black/25 backdrop-blur-xl"
            style={{
              boxShadow: `
                12px 12px 30px rgba(0, 0, 0, 0.45),
                -8px -8px 20px rgba(255, 255, 255, 0.06),
                inset 1px 1px 0 rgba(255, 255, 255, 0.08)
              `,
            }}
          >
            <h1
              className="text-emerald-400 font-bold uppercase tracking-[0.18em] leading-tight text-2xl sm:text-1xl lg:text-1xl mb-4"
              style={{
                fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
              }}
            >
              ECOSPHERE GLOBAL
            </h1>

            <p className="text-white font-semibold text-lg sm:text-xl mb-1">
              Welcome, <span className="font-bold">{userName}</span>
            </p>

            <p className="text-gray-300 text-base sm:text-lg mb-5">
              {userId}
            </p>

            <p className="text-gray-200 text-sm sm:text-base font-medium mb-6">
              What would you like to do today?
            </p>

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleAuditorLogin}
                className="w-full max-w-[220px] h-11 rounded-full text-white text-sm sm:text-base font-semibold transition-all duration-300 active:scale-[0.98] hover:brightness-110"
                style={{
                  background: '#1a1a1a',
                  boxShadow:
                    '6px 6px 12px rgba(0,0,0,0.55), -4px -4px 10px rgba(255,255,255,0.05)',
                }}
              >
                Auditor
              </button>

              <button
                type="button"
                onClick={handleSiteOwnerLogin}
                className="w-full max-w-[220px] h-11 rounded-full text-white text-sm sm:text-base font-semibold transition-all duration-300 active:scale-[0.98] hover:brightness-110"
                style={{
                  background: '#1a1a1a',
                  boxShadow:
                    '6px 6px 12px rgba(0,0,0,0.55), -4px -4px 10px rgba(255,255,255,0.05)',
                }}
              >
                Site Owner
              </button>
            </div>

            <div className="mt-8 flex justify-center">
              <img
                src={ecoLogo}
                alt="EcoSphere logo"
                className="w-44 sm:w-52 lg:w-60 xl:w-64 h-auto object-contain opacity-90"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


export default HomePage;