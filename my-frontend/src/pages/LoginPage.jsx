import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import volvoLogo from '../assets/images/VolvoLogo.png';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedRole = location.state?.role || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const user = await response.json();

      if (!response.ok) {
        alert(user.message || 'Login failed');
        return;
      }

      const actualRole = user.Role || user.role || '';
      const expectedRole = selectedRole || '';

      if (expectedRole && actualRole !== expectedRole) {
        alert(`This login is only for ${expectedRole}.`);
        return;
      }

      localStorage.setItem(
        'authUser',
        JSON.stringify({
          name: user.Name || user.name,
          userId: user.UserId || user.userId || user.id,
          role: actualRole,
        })
      );

      if (actualRole === 'Auditor') {
        navigate('/ul-pure');
      } else if (actualRole === 'SiteOwner') {
        navigate('/site-owner');
      } else {
        alert('Invalid role');
      }
    } catch (error) {
      console.error(error);
      alert('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-neutral-200">
      <TopNavbar />

      <main className="flex-1 min-h-0 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg px-5 py-6 sm:px-6 sm:py-7 text-center">
          <h1 className="text-emerald-700 font-bold leading-tight text-2xl sm:text-[28px] mb-2">
            Login
          </h1>

          <p className="text-gray-800 text-sm sm:text-[15px] font-medium mb-5">
            {selectedRole ? `${selectedRole} Login` : 'Please Login'}
          </p>

          <div className="space-y-3 text-left">
            <div>
              <label className="block text-[13px] font-semibold text-black mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 border border-gray-300 px-4 rounded-lg outline-none text-[14px]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-black mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 border border-gray-300 px-4 rounded-lg outline-none text-[14px]"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mt-5">
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-10 rounded-full bg-black text-white text-sm font-semibold hover:opacity-80 transition-all duration-300 disabled:opacity-60"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full h-10 rounded-full border border-black text-black text-sm font-semibold hover:bg-black hover:text-white transition-all duration-300"
            >
              Back
            </button>
          </div>

          <div className="mt-6 flex justify-center">
            <img
              src={volvoLogo}
              alt="Volvo logo"
              className="w-20 sm:w-24 h-auto object-contain"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;