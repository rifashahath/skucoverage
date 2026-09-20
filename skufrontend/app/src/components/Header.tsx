import React, { useState } from 'react';

interface HeaderProps {
  onOpenUpgrade: () => void;
  onOpenNavModal: (section: 'overview' | 'docs' | 'benchmarks' | 'integrations' | 'signin') => void;
  activeNav?: string;
  user?: { email?: string | null } | null;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenUpgrade, onOpenNavModal, user, onSignOut }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#ffffff]/90 backdrop-blur-md border-b border-[#c2c6d6]/30">
      <div className="h-16 px-3 min-[380px]:px-4 md:px-6 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <button type="button" aria-label="Open SKUcoverage overview" className="flex min-w-0 items-center gap-2 min-[390px]:gap-2.5 cursor-pointer" onClick={() => onOpenNavModal('overview')}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0058be] to-[#2170e4] flex items-center justify-center text-white shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[20px]">barcode</span>
          </div>
          <span className="hidden min-[350px]:inline font-bold text-[15px] min-[390px]:text-[18px] tracking-tight text-[#131b2e] truncate">
            SKUcoverage
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => onOpenNavModal('overview')}
            className="text-[14px] font-semibold text-[#424754] hover:text-[#131b2e] transition-colors"
          >
            Overview
          </button>
          <button
            onClick={() => onOpenNavModal('docs')}
            className="text-[14px] font-semibold text-[#424754] hover:text-[#131b2e] transition-colors"
          >
            Docs
          </button>
          <button
            onClick={() => onOpenNavModal('benchmarks')}
            className="text-[14px] font-semibold text-[#424754] hover:text-[#131b2e] transition-colors"
          >
            Benchmarks
          </button>
          <button
            onClick={() => onOpenNavModal('integrations')}
            className="text-[14px] font-semibold text-[#424754] hover:text-[#131b2e] transition-colors"
          >
            Integrations
          </button>
        </nav>

        {/* Right Action Controls */}
        <div className="flex shrink-0 items-center gap-1.5 min-[390px]:gap-2 md:gap-3">
          {user ? (
            <button
              onClick={() => onOpenNavModal('signin')}
              className="text-[13px] font-semibold text-[#424754] hover:text-[#131b2e] transition-colors hidden sm:inline-block truncate max-w-[180px]"
            >
              {user.email || 'Account'}
            </button>
          ) : (
            <button
              onClick={() => onOpenNavModal('signin')}
              className="text-[14px] font-semibold text-[#424754] hover:text-[#131b2e] transition-colors hidden sm:inline-block"
            >
              Sign in
            </button>
          )}

          <button
            onClick={onOpenUpgrade}
            className="min-h-11 text-[12px] min-[390px]:text-[13px] md:text-[14px] font-semibold text-white bg-[#0058be] hover:bg-[#2170e4] px-3 min-[390px]:px-4 md:px-5 py-1.5 rounded-full shadow-[0_8px_20px_-2px_rgba(59,130,246,0.30)] hover:shadow-[0_12px_24px_-2px_rgba(59,130,246,0.42)] transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center cursor-pointer active:translate-y-0"
          >
            <span className="min-[350px]:hidden">Start</span><span className="hidden min-[350px]:inline">Get Started</span>
          </button>

          <button
            onClick={() => onOpenNavModal('signin')}
            aria-label="User Profile"
            className="hidden sm:flex w-9 h-9 rounded-full bg-[#0058be] items-center justify-center text-white hover:opacity-90 transition-opacity font-bold text-[13px]"
          >
            {user?.email ? user.email.charAt(0).toUpperCase() : <span className="material-symbols-outlined text-[18px]">person</span>}
          </button>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden min-w-11 min-h-11 inline-flex items-center justify-center rounded-full text-[#424754] hover:text-[#131b2e] hover:bg-[#f2f3ff]"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#c2c6d6]/30 px-6 py-4 flex flex-col gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => {
              onOpenNavModal('overview');
              setMobileMenuOpen(false);
            }}
            className="text-left font-semibold text-[14px] text-[#424754] py-1"
          >
            Overview
          </button>
          <button
            onClick={() => {
              onOpenNavModal('docs');
              setMobileMenuOpen(false);
            }}
            className="text-left font-semibold text-[14px] text-[#424754] py-1"
          >
            Docs
          </button>
          <button
            onClick={() => {
              onOpenNavModal('benchmarks');
              setMobileMenuOpen(false);
            }}
            className="text-left font-semibold text-[14px] text-[#424754] py-1"
          >
            Benchmarks
          </button>
          <button
            onClick={() => {
              onOpenNavModal('integrations');
              setMobileMenuOpen(false);
            }}
            className="text-left font-semibold text-[14px] text-[#424754] py-1"
          >
            Integrations
          </button>
          <hr className="border-[#eaedff]" />
          <button
            onClick={() => {
              onOpenNavModal('signin');
              setMobileMenuOpen(false);
            }}
            className="text-left font-semibold text-[14px] text-[#0058be] py-1"
          >
            Sign in
          </button>
        </div>
      )}
    </header>
  );
};
