import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import homeImage from '../assets/images/HomeBack2.png';
import volvoLogo from '../assets/images/VolvoLogo.png';

function HomePage() {
  const navigate = useNavigate();
  const userName = 'HyperAuto_DT_FP';
  const userId = 'Bot_02';

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-neutral-200">
      <TopNavbar />

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] overflow-hidden">
        <section className="hidden lg:block w-full h-full overflow-hidden">
          <img
            src={homeImage}
            alt="Home visual"
            className="w-full h-full object-cover object-center"
          />
        </section>

        <section className="h-full flex items-center justify-center bg-neutral-200 px-4 py-4 sm:px-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg px-6 py-8 sm:px-8 sm:py-10 text-center">
            <h1 className="text-emerald-700 font-bold leading-tight text-2xl sm:text-3xl mb-5">
              Volvo EcoSphere Global
            </h1>

            <p className="text-gray-900 font-semibold text-lg sm:text-xl mb-1">
              Welcome, <span className="font-bold">{userName}</span>
            </p>

            <p className="text-gray-900 text-base sm:text-lg mb-5">
              {userId}
            </p>

            <p className="text-gray-800 text-sm sm:text-base font-medium mb-6">
              What would you like to do today?
            </p>

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/ul-pure')}
                className="w-full max-w-[220px] h-11 rounded-full bg-black text-white text-sm sm:text-base font-semibold hover:opacity-80 transition-all duration-300"
              >
                Auditor
              </button>

              <button
                type="button"
                onClick={() => navigate('/site-owner')}
                className="w-full max-w-[220px] h-11 rounded-full bg-black text-white text-sm sm:text-base font-semibold hover:opacity-80 transition-all duration-300"
              >
                Site Owner
              </button>
            </div>

            <div className="mt-8 flex justify-center">
              <img
                src={volvoLogo}
                alt="Volvo logo"
                className="w-24 sm:w-28 h-auto object-contain"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;