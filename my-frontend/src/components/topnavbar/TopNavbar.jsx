import violinLogo from '../../assets/images/violinLogo.png';

import downloadIcon from '../../assets/NavbarVector/downloadbt.svg';
import settingsIcon from '../../assets/NavbarVector/settings.svg';
import infoIcon from '../../assets/NavbarVector/questionmark.svg';

function TopNavbar() {
  return (
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
      <div className="flex items-center gap-1.5">
        
        {/* Share Button */}
        <button
          type="button"
          className="
            h-[35px] px-3 rounded-full
            border border-white/15
            bg-white/5
            text-[11px] font-medium
            hover:bg-white/10
            hover:scale-105
            transition-all duration-300
          "
        >
          Share <span className="ml-1 text-[9px]">▾</span>
        </button>

        {/* Download Button */}
        <button
          type="button"
          aria-label="Download"
          className="
            w-[35px] h-[35px]
            rounded-full
            border border-transparent
            hover:border-white/15
            hover:bg-white/10
            hover:scale-105
            inline-flex items-center justify-center
            transition-all duration-300
          "
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
          className="
            w-[35px] h-[35px]
            rounded-full
            border border-transparent
            hover:border-white/15
            hover:bg-white/10
            hover:scale-105
            inline-flex items-center justify-center
            transition-all duration-300
          "
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
          className="
            w-[35px] h-[35px]
            rounded-full
            border border-transparent
            hover:border-white/15
            hover:bg-white/10
            hover:scale-105
            inline-flex items-center justify-center
            transition-all duration-300
          "
        >
          <img
            src={infoIcon}
            alt="Help"
            className="w-4 h-4 object-contain"
          />
        </button>

        {/* Profile Circle */}
        <button
          type="button"
          aria-label="Profile"
          className="
            w-8 h-8
            rounded-full
            bg-[#5f8d43]
            text-white
            text-[10px]
            font-bold
            flex items-center justify-center
            ml-1
            hover:scale-105
            transition-all duration-300
          "
        >
          BH
        </button>
      </div>
    </header>
  );
}

export default TopNavbar;