import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { logoutUser } from '../utils/auth';
import { API_BASE_URL, authFetch } from '../config/api';
import { clearAllPageCaches,  clearPersistentCache, } from '../utils/pageCache';


function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/auth/me`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load profile');
      }

      setUser(data);
    } catch (error) {
      console.error('Profile fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authFetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error.message);
    } finally {
      logoutUser();
      clearAllPageCaches();
      clearPersistentCache('siteOwner_selection');
      navigate('/');
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800';
      case 'Auditor':
        return 'bg-blue-100 text-blue-800';
      case 'SiteOwner':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full h-screen bg-[#fafaf9] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <section className="w-full max-w-[900px] mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
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

          {/* Profile Info */}
          <div className="bg-white rounded-[18px] shadow-sm p-6">
            <h2 className="text-[18px] font-semibold text-black mb-5">
              Account Information
            </h2>

            {loading ? (
              <div className="text-[13px] text-black/50 py-4">
                Loading profile...
              </div>
            ) : user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 py-3 border-b border-black/10">
                  <div className="w-[120px] text-[13px] font-semibold text-black/50">Name</div>
                  <div className="text-[14px] text-black font-medium">{user.Name || '-'}</div>
                </div>

                <div className="flex items-center gap-4 py-3 border-b border-black/10">
                  <div className="w-[120px] text-[13px] font-semibold text-black/50">Email</div>
                  <div className="text-[14px] text-black">{user.Email || '-'}</div>
                </div>

                <div className="flex items-center gap-4 py-3 border-b border-black/10">
                  <div className="w-[120px] text-[13px] font-semibold text-black/50">Role</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${getRoleBadgeStyle(user.Role)}`}>
                    {user.Role || '-'}
                  </span>
                </div>

                {user.SiteCode && (
                  <div className="flex items-center gap-4 py-3 border-b border-black/10">
                    <div className="w-[120px] text-[13px] font-semibold text-black/50">Site</div>
                    <div className="text-[14px] text-black">{user.SiteCode}</div>
                  </div>
                )}

                {user.FacilityCode && (
                  <div className="flex items-center gap-4 py-3 border-b border-black/10">
                    <div className="w-[120px] text-[13px] font-semibold text-black/50">Facility</div>
                    <div className="text-[14px] text-black">{user.FacilityCode}</div>
                  </div>
                )}

                <div className="flex items-center gap-4 py-3">
                  <div className="w-[120px] text-[13px] font-semibold text-black/50">Application</div>
                  <div className="text-[14px] text-black">ECOSPHERE PORTAL</div>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-red-500 py-4">
                Failed to load profile.
              </div>
            )}
          </div>

          {/* Account Security Note */}
          <div className="bg-white rounded-[18px] shadow-sm p-6">
            <h2 className="text-[18px] font-semibold text-black mb-2">
              Password & Security
            </h2>
            <p className="text-[13px] text-black/60 mb-4">
              Your account is authenticated via Enterprise SSO / Identity Provider. To change your password
              or update security credentials, manage your organizational account.
            </p>
            <a
              href="https://account.activedirectory.windowsazure.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-[42px] px-6 rounded-full border border-black/20 text-black text-[13px] font-semibold hover:bg-black hover:text-white transition duration-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Manage SSO Security
            </a>
          </div>

          {/* Logout */}
          <div className="bg-white rounded-[18px] shadow-sm p-6">
            <h2 className="text-[18px] font-semibold text-black mb-2">
              Session
            </h2>
            <p className="text-[13px] text-black/50 mb-4">
              Logging out will clear your session and return you to the login page.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="h-[42px] px-6 rounded-full bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition duration-300"
            >
              Log Out
            </button>
          </div>

        </section>
      </main>
    </div>
  );
}

export default ProfilePage;