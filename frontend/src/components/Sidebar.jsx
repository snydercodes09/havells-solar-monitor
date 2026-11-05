import React from 'react';
import {
  LayoutGrid,
  TrendingUp,
  BarChart3,
  FileText,
  Cpu,
  MapPin,
  Settings,
  Sun,
  IndianRupee,
  Activity
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, liveStatus }) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'flow', label: 'Power Flow', icon: Activity },
    { id: 'apdcl', label: 'APDCL Billing', icon: IndianRupee },
    { id: 'history', label: 'History & Logs', icon: BarChart3 },
    { id: 'system', label: 'System Health', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Sun className="brand-sun-icon" size={24} />
        </div>
        <span className="brand-name">Solary <small>Havells</small></span>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
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