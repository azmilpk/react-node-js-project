import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

function ProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <section className="w-full max-w-[900px] mx-auto bg-white rounded-[18px] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] font-bold text-black">
              Profile
            </h1>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
            >
              Go Back
            </button>
          </div>

          <div className="space-y-4 text-[15px] text-black">
            <div><strong>Name:</strong> Bot_02</div>
            <div><strong>User ID:</strong> HyperAuto_DT_FP</div>
            <div><strong>Role:</strong> Auditor / Site Owner</div>
            <div><strong>Application:</strong> TTI ENV IDP</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ProfilePage;