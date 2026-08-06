import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import loginBg from '../assets/images/login1.jpg';
import showIcon from '../assets/images/show.svg';
import { API_BASE_URL } from '../config/api';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedRole = location.state?.role || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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

      if (user.token) {
        localStorage.setItem('authToken', user.token);
      }

      if (actualRole === 'Auditor') {
        navigate('/auditor-ul-pure');
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
    <div
      className="w-full h-screen overflow-hidden flex flex-col"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <TopNavbar />

      <main className="flex-1 min-h-0 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm rounded-2xl px-5 py-6 sm:px-6 sm:py-7 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          }}
        >
          <h1 className="text-white font-bold leading-tight text-2xl sm:text-[28px] mb-2" style={{textShadow:'0 1px 4px rgba(0,0,0,0.4)'}}>
            Login
          </h1>

          <p className="text-white/90 text-sm sm:text-[15px] font-medium mb-5">
            {selectedRole ? `${selectedRole} Login` : 'Please Login'}
          </p>

          <div className="space-y-3 text-left">
            <div>
              <label className="block text-[13px] font-semibold text-white mb-2">
                Emails
              </label>
              <input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-4 rounded-lg outline-none text-[14px] text-white placeholder-white/60"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)' }}
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-4 pr-10 rounded-lg outline-none text-[14px] text-white placeholder-white/60"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <img src={showIcon} alt="Show password" className="w-4 h-4" style={{ opacity: 0.4 }} />
                </button>
              </div>
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
              className="w-full h-10 rounded-full border border-black text-white text-sm font-semibold hover:bg-black hover:text-white transition-all duration-300"
            >
              Back
            </button>
          </div>

          <div className="mt-6 flex justify-center">
            
              
            
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;