import React from 'react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  issueCounts?: {
    gtin?: number;
    altText?: number;
    categories?: number;
  };
  storeDomain?: string;
  productsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  issueCounts = { gtin: 32, altText: 24, categories: 11 },
  storeDomain,
  productsCount,
}) => {
  const diagnosticItems: {
    id: NavigationTab;
    label: string;
    icon: string;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Store Overview',
      icon: 'dashboard',
    },
    {
      id: 'barcodes',
      label: 'GTIN & Barcodes',
      icon: 'qr_code_2',
      badge: issueCounts.gtin ? `${issueCounts.gtin}` : undefined,
      badgeColor: 'bg-[#ffdad6] text-[#ba1a1a]',
    },
    {
      id: 'seo-images',
      label: 'SEO & Alt Text',
      icon: 'photo_camera',
      badge: issueCounts.altText ? `${issueCounts.altText}` : undefined,
      badgeColor: 'bg-[#ffddb8] text-[#825100]',
    },
    {
      id: 'categories',
      label: 'Google Categories',
      icon: 'account_tree',
      badge: issueCounts.categories ? `${issueCounts.categories}` : undefined,
      badgeColor: 'bg-[#eaedff] text-[#0058be]',
    },
    {
      id: 'fix-export',
      label: '1-Click Fix & Export',
      icon: 'file_download',
      badge: 'Ready',
      badgeColor: 'bg-[#6ffbbe]/50 text-[#006c49]',
    },
  ];

  const secondaryItems: {
    id: NavigationTab;
    label: string;
    icon: string;
    badge?: string;
  }[] = [
    {
      id: 'quick-guide',
      label: "Beginner's Guide",
      icon: 'school',
      badge: 'New',
    },
    {
      id: 'audit-history',
      label: 'Audit History',
      icon: 'history',
    },
    {
      id: 'settings',
      label: 'Store Settings',
      icon: 'settings',
    },
  ];

  const renderNavGroup = (items: typeof diagnosticItems) => (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          activeTab === item.id ||
          (item.id === 'dashboard' && activeTab === 'catalog-health');
        return (
          <button
            key={item.id}
            onClick={() => {
              onSelectTab(item.id);
              if (onCloseMobile) onCloseMobile();
            }}
            className={`flex items-center justify-between px-3.5 py-2 rounded-2xl transition-all group text-left cursor-pointer ${
              isActive
                ? 'bg-[#e2e7ff] text-[#0058be] font-bold shadow-xs'
                : 'text-[#424754] hover:bg-[#f2f3ff] hover:text-[#131b2e]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`material-symbols-outlined text-[19px] transition-colors shrink-0 ${
                  isActive ? 'text-[#0058be]' : 'text-[#727785] group-hover:text-[#131b2e]'
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[13px] truncate">{item.label}</span>
            </div>

            {item.badge && (
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                  item.badgeColor || 'bg-[#eaedff] text-[#0058be]'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const content = (
    <div className="flex flex-col justify-between h-full py-5 px-3 overflow-y-auto">
      <div className="flex flex-col gap-5">
        {/* Diagnostics Group */}
        <div className="flex flex-col gap-1.5">
          <div className="px-3.5 py-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#727785]">
              Catalog Diagnostics
            </span>
          </div>
          {renderNavGroup(diagnosticItems)}
        </div>

        {/* Learning & Tools Group */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-[#eaedff]">
          <div className="px-3.5 py-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#727785]">
              Guides &amp; Account
            </span>
          </div>
          {renderNavGroup(secondaryItems)}
        </div>
      </div>

      {/* Bottom Sync Status Card */}
      <div className="px-3.5 py-3 rounded-2xl bg-[#f2f3ff] border border-[#c2c6d6]/30 flex flex-col gap-1 shadow-xs mt-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#727785]">
            Shopify Store Status
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c49] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c49]"></span>
          </span>
        </div>
        <span className="text-[12px] text-[#131b2e] font-bold truncate">{storeDomain || 'beststore.myshopify.com'}</span>
        <span className="text-[11px] text-[#006c49] font-semibold">Feed Ready • {productsCount ? `${productsCount} SKUs` : '248 SKUs'}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Aside */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-[#c2c6d6]/30 z-40 flex-col">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full z-50 shadow-2xl flex flex-col pt-16">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
