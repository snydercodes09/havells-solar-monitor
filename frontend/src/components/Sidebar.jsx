import React from 'react';
import {
  LayoutGrid,
  BarChart3,
  Cpu,
  Settings,
  Sun,
  IndianRupee,
  Activity,
  X
} from 'lucide-react';

export function Sidebar({
  activeTab,
  setActiveTab,
  onOpenSettings: _onOpenSettings,
  liveStatus: _liveStatus,
  isOpen = false,
  onClose = () => {}
}) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'flow', label: 'Power Flow', icon: Activity },
    { id: 'apdcl', label: 'APDCL Billing', icon: IndianRupee },
    { id: 'history', label: 'History & Logs', icon: BarChart3 },
    { id: 'system', label: 'System Health', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand & Mobile Close */}
      <div className="sidebar-brand">
        <div className="flex-align gap-10">
          <div className="brand-icon-wrapper">
            <Sun className="brand-sun-icon" size={24} />
          </div>
          <span className="brand-name">Solary <small>Havells</small></span>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close navigation drawer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (activeTab === 'billing' && item.id === 'apdcl') || (activeTab === 'diagnostics' && item.id === 'system');
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectTab(item.id)}
            >
              <Icon size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom User / Plant Info Profile Pill */}
      <div className="sidebar-footer">
        <div className="user-profile-pill">
          <div className="user-avatar">
            <span>A</span>
          </div>
          <div className="user-info">
            <span className="user-name">Solar Plant</span>
            <span className="user-location">APDCL Net Metered</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
