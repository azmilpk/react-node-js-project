import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import violinLogo from '../../assets/images/violinLogo.png';

import downloadIcon from '../../assets/NavbarVector/downloadbt.svg';
import settingsIcon from '../../assets/NavbarVector/settings.svg';
import infoIcon from '../../assets/NavbarVector/questionmark.svg';

function TopNavbar() {
  const navigate = useNavigate();

  const [shareOpen, setShareOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Page URL copied');
      setShareOpen(false);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleDownload = () => {
    const pageTitle = document.title || 'page-data';
    const pageUrl = window.location.href;

    const content = `Page: ${pageTitle}\nURL: ${pageUrl}\nDownloaded At: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const fileUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = 'current-page-data.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(fileUrl);
  };

  const handleSettings = () => {
    alert('Settings panel can be added here');
  };

  return (
    <>
      <header className="h-[52px] bg-black text-white grid grid-cols-[150px_1fr_auto] items-center px-4 border-b border-white/10 shadow-sm shrink-0">
        {/* Left Logo */}
        <div className="flex items-center">
          <img
            src={violinLogo}
            alt="Violin logo"
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Center Title */}
        <div className="flex items-center justify-center">
          <span className="text-[18px] font-semibold tracking-[0.2px]">
            TTI ENV IDP
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 relative">
          {/* Share Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShareOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              className="h-[35px] px-3 rounded-full border border-white/15 bg-white/5 text-[11px] font-medium hover:bg-white/10 hover:scale-105 transition-all duration-300"
            >
              Share <span className="ml-1 text-[9px]">▾</span>
            </button>

            {shareOpen && (
              <div className="absolute right-0 mt-2 w-[170px] rounded-[12px] bg-white text-black shadow-lg border border-black/10 overflow-hidden z-50">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="w-full text-left px-4 py-3 text-[13px] hover:bg-gray-100 transition"
                >
                  Copy page URL
                </button>
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            type="button"
            aria-label="Download"
            onClick={handleDownload}
            className="w-[35px] h-[35px] rounded-full border border-transparent hover:border-white/15 hover:bg-white/10 hover:scale-105 inline-flex items-center justify-center transition-all duration-300"
          >
            <img
              src={downloadIcon}
              alt="Download"
              className="w-4 h-4 object-contain"
            />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            aria-label="Settings"
            onClick={handleSettings}
            className="w-[35px] h-[35px] rounded-full border border-transparent hover:border-white/15 hover:bg-white/10 hover:scale-105 inline-flex items-center justify-center transition-all duration-300"
          >
            <img
              src={settingsIcon}
              alt="Settings"
              className="w-4 h-4 object-contain"
            />
          </button>

          {/* Help Button */}
          <button
            type="button"
            aria-label="Help"
            onClick={() => {
              setHelpOpen(true);
              setShareOpen(false);
              setProfileOpen(false);
            }}
            className="w-[35px] h-[35px] rounded-full border border-transparent hover:border-white/15 hover:bg-white/10 hover:scale-105 inline-flex items-center justify-center transition-all duration-300"
          >
            <img
              src={infoIcon}
              alt="Help"
              className="w-4 h-4 object-contain"
            />
          </button>

          {/* Profile Circle */}
          <div className="relative">
            <button
              type="button"
              aria-label="Profile"
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setShareOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-[#5f8d43] text-white text-[10px] font-bold flex items-center justify-center ml-1 hover:scale-105 transition-all duration-300"
            >
              BH
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-[180px] rounded-[12px] bg-white text-black shadow-lg border border-black/10 overflow-hidden z-50">
                <div className="px-4 py-3 text-[13px] border-b border-black/10">
                  <div className="font-semibold">Bot_02</div>
                  <div className="text-black/60">HyperAuto_DT_FP</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-4 py-3 text-[13px] hover:bg-gray-100 transition"
                >
                  Profile
                </button>

               
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {helpOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="w-full max-w-[500px] bg-white rounded-[18px] shadow-lg p-6 relative">
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="absolute top-4 right-4 text-black text-[18px]"
            >
              ×
            </button>

            <h2 className="text-[22px] font-bold text-black mb-4">Help</h2>

            <div className="space-y-3 text-[14px] text-black leading-6">
              <p><strong>Share:</strong> Copy the current page URL.</p>
              <p><strong>Download:</strong> Export current page information as a file.</p>
              <p><strong>Settings:</strong> Open future app settings.</p>
              <p><strong>Profile:</strong> Open user page.</p>
              <p><strong>Logout:</strong> Clear local session and return to Home.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TopNavbar;