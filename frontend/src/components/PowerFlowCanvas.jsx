import React, { useState } from 'react';
import {
  Sun,
  Zap,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Cpu,
  Layers,
  CircleDot,
  CheckCircle2,
  Sliders,
  Wifi,
  ShieldCheck,
  Radio,
  Car
} from 'lucide-react';

export function PowerFlowCanvas({ liveData = {}, summary = {}, config = {} }) {
  // Mode: 'isometric' (matching Image 1) | 'schematic' (matching Image 2 bottom)
  const [viewMode, setViewMode] = useState('isometric');

  const activePower = Math.round(Number(liveData?.active_power) || 0);
  const pv1Power = Math.round(Number(liveData?.pv1_power) || 0);
  const pv2Power = Math.round(Number(liveData?.pv2_power) || 0);
  const totalDc = pv1Power + pv2Power;

  // Dynamic residential household consumption profile (evening lights/fans ~880W, morning ~750W, daytime ~550W, night ~420W)
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const defaultBaseLoad = (currentHour >= 17 && currentHour < 23) ? 880 : (currentHour >= 6 && currentHour < 9) ? 750 : (currentHour >= 9 && currentHour < 17) ? 550 : 420;
  const fallbackHomeLoad = Math.round(defaultBaseLoad + Math.sin(Date.now() / 3000) * 25);

  const homeLoad = liveData?.home_load !== undefined ? Math.round(Number(liveData.home_load)) : fallbackHomeLoad;
  const gridImport = liveData?.grid_import !== undefined ? Math.round(Number(liveData.grid_import)) : Math.max(0, homeLoad - activePower);
  const gridExport = liveData?.grid_export !== undefined ? Math.round(Number(liveData.grid_export)) : Math.max(0, activePower - homeLoad);

  const tariffRate = Number(config?.tariff_rate) || 7.65;
  const todayKwh = Number(summary?.today_kwh) || Number(liveData?.today_kwh) || 14.85;
  const todaySavings = Math.round(todayKwh * tariffRate);

  // Speed of animated energy particles
  const solarParticleStyle = activePower > 0 ? { animationDuration: `${Math.max(0.6, 2.8 - (activePower / 1600))}s` } : { display: 'none' };
  const gridExportParticleStyle = gridExport > 0 ? { animationDuration: `${Math.max(0.7, 2.5 - (gridExport / 1500))}s` } : { display: 'none' };
  const gridImportParticleStyle = gridImport > 0 ? { animationDuration: `${Math.max(0.7, 2.5 - (gridImport / 1000))}s` } : { display: 'none' };
  const houseParticleStyle = homeLoad > 0 ? { animationDuration: `${Math.max(0.8, 2.5 - (homeLoad / 1000))}s` } : { display: 'none' };

  // Calculate home load progress percentage
  const loadPercentage = activePower > 0
    ? Math.min(100, Math.round((homeLoad / activePower) * 100))
    : Math.min(100, Math.round((homeLoad / 1500) * 100));

  return (
    <div className="iso-dashboard-container">
      {/* ================= SECTION 1: TOP 4 SLEEK TELEMETRY CARDS (MATCHING IMAGE 2) ================= */}
      <div className="iso-quick-cards-grid">
        {/* Card 1: Home */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">Home</span>
            <div className="metric-card-icon-pill">
              <Home size={18} className="text-muted" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val">{(homeLoad / 1000).toFixed(1)} <small>kW</small></span>
            <span className={`metric-trend-badge ${gridImport > 0 ? 'text-amber' : 'text-emerald'}`}>
              {gridImport > 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            </span>
          </div>
          <div className="metric-progress-track">
            <div
              className="metric-progress-fill bar-home"
              style={{ width: `${loadPercentage}%` }}
            />
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val">{(todayKwh * 0.38).toFixed(1)} kWh</span>
            <span className="metric-footer-label">{gridImport > 0 ? 'Grid Powered' : 'Solar Powered'}</span>
          </div>
        </div>

        {/* Card 2: Solar */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">Solar</span>
            <div className="metric-card-icon-pill">
              <Sun size={18} className="text-amber" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val">{(activePower / 1000).toFixed(1)} <small>kW</small></span>
            <span className="metric-trend-badge text-amber">
              <ArrowUpRight size={14} />
            </span>
          </div>
          {/* Glowing sparkline curve */}
          <div className="sparkline-wrapper">
            <svg viewBox="0 0 160 32" className="sparkline-svg">
              <defs>
                <linearGradient id="solarSparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,26 Q 30,22 60,18 T 110,8 T 160,4 L 160,32 L 0,32 Z"
                fill="url(#solarSparkGrad)"
              />
              <path
                d="M 0,26 Q 30,22 60,18 T 110,8 T 160,4"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val">{(gridExport / 1000).toFixed(1)} kW</span>
            <span className="metric-footer-label">Exported to APDCL</span>
          </div>
        </div>

        {/* Card 3: Inverter / System Health */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">Havells GTi</span>
            <div className="metric-card-icon-pill">
              <Cpu size={18} className="text-cyan" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val">{liveData?.module_temp || 44.5} <small>°C</small></span>
            <span className="metric-status-tag">97.6% Eff</span>
          </div>
          <div className="metric-progress-track">
            <div
              className="metric-progress-fill bar-inverter"
              style={{ width: `${Math.min(100, Math.round(((liveData?.module_temp || 44.5) / 75) * 100))}%` }}
            />
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val">{liveData?.grid_voltage || 232}V • {liveData?.grid_frequency || 50.0}Hz</span>
            <span className="metric-footer-label">Synchronized</span>
          </div>
        </div>

        {/* Card 4: Grid (APDCL) */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">APDCL Grid</span>
            <div className="metric-card-icon-pill">
              <Zap size={18} className={gridImport > 0 ? "text-amber" : (gridExport > 0 ? "text-emerald" : "text-muted")} />
            </div>
          </div>
          <div className="metric-value-row">
            <div className="grid-sub-rates">
              <span className={`grid-rate-item ${gridImport > 0 ? 'active-grid-in' : ''}`}>
                <strong className={gridImport > 0 ? 'text-amber' : ''}>
                  {(gridImport / 1000).toFixed(1)} <small>kW</small>
                </strong>
                <span>import</span>
              </span>
              <span className={`grid-rate-item ${gridExport > 0 ? 'active-grid-out' : ''}`}>
                <strong className={gridExport > 0 ? 'text-emerald' : ''}>
                  {(gridExport / 1000).toFixed(1)} <small>kW</small>
                </strong>
                <span>export</span>
              </span>
            </div>
          </div>
          <div className="metric-cost-highlight">
            <span className="cost-rupee-val">₹ {todaySavings.toLocaleString('en-IN')}</span>
            <span className="cost-rupee-label">today saved (APDCL Slab 3)</span>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: LIVE POWER FLOW HERO (MATCHING IMAGE 1 & 2) ================= */}
      <div className="iso-powerflow-card">
        {/* Top Header & View Switcher */}
        <div className="iso-card-topbar">
          <div>
            <h3 className="iso-card-title">Live Power Flow</h3>
            <span className="iso-card-subtitle">Real-time 3D isometric energy distribution • Updates at 1 Hz</span>
          </div>

          <div className="iso-toggle-group">
            <button
              className={`iso-toggle-btn ${viewMode === 'isometric' ? 'active' : ''}`}
              onClick={() => setViewMode('isometric')}
            >
              <Layers size={14} /> 3D Isometric View
            </button>
            <button
              className={`iso-toggle-btn ${viewMode === 'schematic' ? 'active' : ''}`}
              onClick={() => setViewMode('schematic')}
            >
              <CircleDot size={14} /> Radial Schematic
            </button>
          </div>
        </div>

        {/* MODE A: 3D ISOMETRIC POWER FLOW (MATCHING IMAGE 1!) */}
        {viewMode === 'isometric' && (
          <div className="isometric-stage-wrapper">
            <svg
              className="isometric-svg-canvas"
              viewBox="0 0 960 480"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Platform Top Gradients */}
                <linearGradient id="pedestalTopGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1E293B" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="pedestalSideGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B132B" />
                  <stop offset="100%" stopColor="#050B14" />
                </linearGradient>

                {/* Laser Glowing Filters */}
                <filter id="glowLaserGreen" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glowLaserAmber" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glowLaserCyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ===== 1. ISOMETRIC CONDUITS (WIRES) ===== */}
              {/* Wire 1: Solar Array (240, 200) -> Havells Inverter (480, 250) */}
              <line x1="240" y1="200" x2="480" y2="250" className="iso-conduit-bg" />
              {activePower > 0 && (
                <line
                  x1="240" y1="200" x2="480" y2="250"
                  className="iso-conduit-flow flow-amber"
                  style={solarParticleStyle}
                  filter="url(#glowLaserAmber)"
                />
              )}

              {/* Wire 2: Inverter / Switchboard (480, 250) <-> Grid Pylon (730, 200) */}
              <line x1="480" y1="250" x2="730" y2="200" className="iso-conduit-bg" />
              {gridExport > 0 && (
                <line
                  x1="480" y1="250" x2="730" y2="200"
                  className="iso-conduit-flow flow-emerald"
                  style={gridExportParticleStyle}
                  filter="url(#glowLaserGreen)"
                />
              )}
              {gridImport > 0 && (
                <line
                  x1="730" y1="200" x2="480" y2="250"
                  className="iso-conduit-flow flow-amber"
                  style={gridImportParticleStyle}
                  filter="url(#glowLaserAmber)"
                />
              )}

              {/* Wire 3: Central Point (480, 250) -> House (680, 390) */}
              <line x1="480" y1="250" x2="680" y2="390" className="iso-conduit-bg" />
              {homeLoad > 0 && (
                <line
                  x1="480" y1="250" x2="680" y2="390"
                  className="iso-conduit-flow flow-cyan"
                  style={houseParticleStyle}
                  filter="url(#glowLaserCyan)"
                />
              )}

              {/* Wire 4: Havells Inverter (480, 250) -> Monitoring Hub (300, 380) */}
              <line x1="480" y1="250" x2="300" y2="380" className="iso-conduit-bg" />
              <line
                x1="480" y1="250" x2="300" y2="380"
                className="iso-conduit-flow flow-rose"
                style={{ animationDuration: '2.5s' }}
              />

              {/* ===== 2. NODE A: SOLAR PV ARRAY (TOP-LEFT: 240, 200) ===== */}
              <g transform="translate(160, 140)">
                {/* 3D Isometric Platform */}
                <ellipse cx="80" cy="80" rx="75" ry="34" fill="#000000" opacity="0.45" />
                <path d="M 10,75 L 80,105 L 150,75 L 150,85 L 80,115 L 10,85 Z" fill="url(#pedestalSideGrad)" stroke="#1E293B" />
                <polygon points="10,75 80,45 150,75 80,105" fill="url(#pedestalTopGrad)" stroke="#F59E0B" strokeWidth="1.8" />

                {/* Isometric Solar Panels */}
                <g transform="translate(42, 20)">
                  {/* Panel Frame */}
                  <polygon points="0,32 50,10 75,22 25,44" fill="#0284C7" stroke="#38BDF8" strokeWidth="1.5" />
                  <line x1="12" y1="27" x2="62" y2="16" stroke="#93C5FD" strokeWidth="1" />
                  <line x1="25" y1="21" x2="75" y2="10" stroke="#93C5FD" strokeWidth="1" />
                  <line x1="25" y1="21" x2="38" y2="38" stroke="#93C5FD" strokeWidth="1" />
                  <line x1="50" y1="10" x2="63" y2="28" stroke="#93C5FD" strokeWidth="1" />
                </g>

                {/* Floating Telemetry Badge */}
                <g transform="translate(25, -25)">
                  <rect x="0" y="0" width="110" height="42" rx="10" fill="rgba(15, 23, 42, 0.92)" stroke="#F59E0B" strokeWidth="1.5" />
                  <circle cx="18" cy="21" r="10" fill="rgba(245, 158, 11, 0.2)" />
                  <text x="18" y="25" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="bold">☀️</text>
                  <text x="35" y="18" fill="#F8FAFC" fontSize="13" fontWeight="800">{(activePower / 1000).toFixed(2)} kW</text>
                  <text x="35" y="32" fill="#94A3B8" fontSize="10" fontWeight="600">Solar Yield</text>
                </g>
              </g>

              {/* ===== 3. NODE B: CENTRAL INVERTER (CENTER: 480, 250) ===== */}
              <g transform="translate(400, 185)">
                {/* 3D Isometric Platform */}
                <ellipse cx="80" cy="85" rx="82" ry="38" fill="#000000" opacity="0.5" />
                <path d="M 5,80 L 80,112 L 155,80 L 155,94 L 80,126 L 5,94 Z" fill="url(#pedestalSideGrad)" stroke="#1E293B" />
                <polygon points="5,80 80,48 155,80 80,112" fill="url(#pedestalTopGrad)" stroke="#38BDF8" strokeWidth="2.2" />

                {/* Inverter Box Graphic (Havells Red Accents) */}
                <g transform="translate(48, 20)">
                  {/* Left Side */}
                  <polygon points="0,45 28,32 28,68 0,81" fill="#DC2626" stroke="#EF4444" strokeWidth="1" />
                  {/* Front Face */}
                  <polygon points="28,32 64,48 64,84 28,68" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                  {/* Top Face */}
                  <polygon points="0,45 28,32 64,48 36,61" fill="#334155" stroke="#64748B" strokeWidth="1" />
                  {/* Havells Logo / Status LED */}
                  <circle cx="46" cy="56" r="3" fill="#10B981" />
                  <line x1="36" y1="62" x2="56" y2="70" stroke="#EF4444" strokeWidth="2" />
                </g>

                {/* Floating Inverter Badge */}
                <g transform="translate(18, -25)">
                  <rect x="0" y="0" width="124" height="42" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#38BDF8" strokeWidth="1.5" />
                  <circle cx="20" cy="21" r="10" fill="rgba(56, 189, 248, 0.2)" />
                  <text x="20" y="25" textAnchor="middle" fill="#38BDF8" fontSize="11" fontWeight="bold">⚡</text>
                  <text x="38" y="18" fill="#F8FAFC" fontSize="13" fontWeight="800">Havells GTi</text>
                  <text x="38" y="32" fill="#10B981" fontSize="10" fontWeight="600">3.3 kW • Online</text>
                </g>
              </g>

              {/* ===== 4. NODE C: TRANSMISSION GRID PYLON (TOP-RIGHT: 730, 200) ===== */}
              <g transform="translate(650, 135)">
                {/* 3D Isometric Platform */}
                <ellipse cx="80" cy="80" rx="75" ry="34" fill="#000000" opacity="0.45" />
                <path d="M 10,75 L 80,105 L 150,75 L 150,85 L 80,115 L 10,85 Z" fill="url(#pedestalSideGrad)" stroke="#1E293B" />
                <polygon points="10,75 80,45 150,75 80,105" fill="url(#pedestalTopGrad)" stroke={gridExport > 0 ? "#10B981" : (gridImport > 0 ? "#F59E0B" : "#64748B")} strokeWidth="2" />

                {/* Detailed Isometric Transmission Pylons */}
                <g transform="translate(56, 12)">
                  {/* Tower Lattice Lines */}
                  <line x1="24" y1="70" x2="24" y2="10" stroke="#94A3B8" strokeWidth="2" />
                  <line x1="16" y1="70" x2="32" y2="70" stroke="#94A3B8" strokeWidth="2" />
                  {/* Cross-arm 1 */}
                  <line x1="6" y1="25" x2="42" y2="25" stroke="#94A3B8" strokeWidth="2.5" />
                  {/* Cross-arm 2 */}
                  <line x1="10" y1="40" x2="38" y2="40" stroke="#94A3B8" strokeWidth="2.5" />
                  {/* Diagonal Bracing */}
                  <line x1="18" y1="65" x2="30" y2="45" stroke="#64748B" strokeWidth="1" />
                  <line x1="30" y1="65" x2="18" y2="45" stroke="#64748B" strokeWidth="1" />
                  {/* Power Lines Hanging */}
                  <path d="M 6,25 Q 15,35 24,25" fill="none" stroke="#60A5FA" strokeWidth="1" />
                  <path d="M 24,25 Q 33,35 42,25" fill="none" stroke="#60A5FA" strokeWidth="1" />
                </g>

                {/* Floating Telemetry Badge (Shows Export if generating surplus, Import if drawing grid power at night) */}
                {gridExport > 0 ? (
                  <g transform="translate(20, -28)">
                    <rect x="0" y="0" width="120" height="42" rx="10" fill="rgba(15, 23, 42, 0.94)" stroke="#10B981" strokeWidth="1.6" />
                    <circle cx="18" cy="21" r="10" fill="rgba(16, 185, 129, 0.2)" />
                    <text x="18" y="25" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="bold">🗼</text>
                    <text x="35" y="18" fill="#10B981" fontSize="13" fontWeight="800">{(gridExport / 1000).toFixed(2)} kW</text>
                    <text x="35" y="32" fill="#94A3B8" fontSize="10" fontWeight="600">APDCL Export</text>
                  </g>
                ) : gridImport > 0 ? (
                  <g transform="translate(20, -28)">
                    <rect x="0" y="0" width="120" height="42" rx="10" fill="rgba(15, 23, 42, 0.94)" stroke="#F59E0B" strokeWidth="1.6" />
                    <circle cx="18" cy="21" r="10" fill="rgba(245, 158, 11, 0.2)" />
                    <text x="18" y="25" textAnchor="middle" fill="#F59E0B" fontSize="12" fontWeight="bold">🗼</text>
                    <text x="35" y="18" fill="#F59E0B" fontSize="13" fontWeight="800">{(gridImport / 1000).toFixed(2)} kW</text>
                    <text x="35" y="32" fill="#FDE047" fontSize="10" fontWeight="600">APDCL Import</text>
                  </g>
                ) : (
                  <g transform="translate(20, -28)">
                    <rect x="0" y="0" width="120" height="42" rx="10" fill="rgba(15, 23, 42, 0.94)" stroke="#475569" strokeWidth="1.5" />
                    <circle cx="18" cy="21" r="10" fill="rgba(71, 85, 105, 0.2)" />
                    <text x="18" y="25" textAnchor="middle" fill="#94A3B8" fontSize="12" fontWeight="bold">🗼</text>
                    <text x="35" y="18" fill="#94A3B8" fontSize="13" fontWeight="800">0.00 kW</text>
                    <text x="35" y="32" fill="#64748B" fontSize="10" fontWeight="600">APDCL Grid</text>
                  </g>
                )}
              </g>

              {/* ===== 5. NODE D: MODERN HOUSE (BOTTOM-RIGHT: 680, 390) ===== */}
              <g transform="translate(600, 325)">
                {/* 3D Isometric Platform */}
                <ellipse cx="80" cy="80" rx="75" ry="34" fill="#000000" opacity="0.45" />
                <path d="M 10,75 L 80,105 L 150,75 L 150,85 L 80,115 L 10,85 Z" fill="url(#pedestalSideGrad)" stroke="#1E293B" />
                <polygon points="10,75 80,45 150,75 80,105" fill="url(#pedestalTopGrad)" stroke="#38BDF8" strokeWidth="1.8" />

                {/* Isometric House */}
                <g transform="translate(48, 22)">
                  {/* House Wall Left */}
                  <polygon points="0,38 32,52 32,78 0,64" fill="#1E293B" stroke="#475569" strokeWidth="1" />
                  {/* House Wall Right */}
                  <polygon points="32,52 64,38 64,64 32,78" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                  {/* Pitched Roof */}
                  <polygon points="0,38 32,18 64,38 32,52" fill="#2563EB" stroke="#60A5FA" strokeWidth="1.5" />
                  {/* Glowing Window */}
                  <polygon points="10,48 22,54 22,66 10,60" fill="#FDE047" opacity="0.9" />
                </g>

                {/* Floating Telemetry Badge */}
                <g transform="translate(25, -20)">
                  <rect x="0" y="0" width="112" height="42" rx="10" fill="rgba(15, 23, 42, 0.92)" stroke="#38BDF8" strokeWidth="1.5" />
                  <circle cx="18" cy="21" r="10" fill="rgba(56, 189, 248, 0.2)" />
                  <text x="18" y="25" textAnchor="middle" fill="#38BDF8" fontSize="12" fontWeight="bold">🏠</text>
                  <text x="35" y="18" fill="#F8FAFC" fontSize="13" fontWeight="800">{(homeLoad / 1000).toFixed(2)} kW</text>
                  <text x="35" y="32" fill={gridImport > 0 ? "#FDE047" : "#94A3B8"} fontSize="10" fontWeight="600">
                    {gridImport > 0 ? "Grid Draw" : "Home Load"}
                  </text>
                </g>
              </g>

              {/* ===== 6. NODE E: SYSTEM TELEMETRY / DATALOGGER (BOTTOM-LEFT: 300, 380) ===== */}
              <g transform="translate(220, 325)">
                {/* 3D Isometric Platform */}
                <ellipse cx="80" cy="80" rx="75" ry="34" fill="#000000" opacity="0.45" />
                <path d="M 10,75 L 80,105 L 150,75 L 150,85 L 80,115 L 10,85 Z" fill="url(#pedestalSideGrad)" stroke="#1E293B" />
                <polygon points="10,75 80,45 150,75 80,105" fill="url(#pedestalTopGrad)" stroke="#A855F7" strokeWidth="1.8" />

                {/* Datalogger / Wi-Fi Stick Graphic */}
                <g transform="translate(62, 28)">
                  <polygon points="0,25 18,16 36,25 18,34" fill="#6B21A8" stroke="#A855F7" strokeWidth="1" />
                  <polygon points="0,25 18,34 18,55 0,46" fill="#3B0764" />
                  <polygon points="18,34 36,25 36,46 18,55" fill="#581C87" />
                  {/* Wi-Fi Wave */}
                  <circle cx="18" cy="18" r="4" fill="#22C55E" />
                </g>

                {/* Floating Telemetry Badge */}
                <g transform="translate(20, -20)">
                  <rect x="0" y="0" width="120" height="42" rx="10" fill="rgba(15, 23, 42, 0.92)" stroke="#A855F7" strokeWidth="1.5" />
                  <circle cx="18" cy="21" r="10" fill="rgba(168, 85, 247, 0.2)" />
                  <text x="18" y="25" textAnchor="middle" fill="#A855F7" fontSize="12" fontWeight="bold">📶</text>
                  <text x="35" y="18" fill="#F8FAFC" fontSize="12" fontWeight="800">192.168.1.5</text>
                  <text x="35" y="32" fill="#22C55E" fontSize="10" fontWeight="600">Datalogger Sync</text>
                </g>
              </g>
            </svg>
          </div>
        )}

        {/* MODE B: 2D RADIAL SCHEMATIC (MATCHING IMAGE 2 BOTTOM!) */}
        {viewMode === 'schematic' && (
          <div className="schematic-stage-wrapper">
            <svg
              className="schematic-svg-canvas"
              viewBox="0 0 860 360"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Dotted Radial Lines from Center to Surrounding Nodes */}
              {/* Center (430, 180) to Solar (160, 110) */}
              <line x1="430" y1="180" x2="160" y2="110" className="schem-line" />
              {activePower > 0 && (
                <line x1="160" y1="110" x2="430" y2="180" className="schem-particle stroke-amber" style={solarParticleStyle} />
              )}

              {/* Center (430, 180) to Grid Tower (700, 110) */}
              <line x1="430" y1="180" x2="700" y2="110" className="schem-line" />
              {gridExport > 0 && (
                <line x1="430" y1="180" x2="700" y2="110" className="schem-particle stroke-emerald" style={gridExportParticleStyle} />
              )}
              {gridImport > 0 && (
                <line x1="700" y1="110" x2="430" y2="180" className="schem-particle stroke-amber" style={gridImportParticleStyle} />
              )}

              {/* Center (430, 180) to Inverter (250, 270) */}
              <line x1="430" y1="180" x2="250" y2="270" className="schem-line" />
              {activePower > 0 && (
                <line x1="250" y1="270" x2="430" y2="180" className="schem-particle stroke-rose" style={solarParticleStyle} />
              )}

              {/* Center (430, 180) to EV Charger / Load (610, 270) */}
              <line x1="430" y1="180" x2="610" y2="270" className="schem-line" />
              {homeLoad > 0 && (
                <line x1="430" y1="180" x2="610" y2="270" className="schem-particle stroke-cyan" style={houseParticleStyle} />
              )}

              {/* ===== CENTER NODE: HOME ===== */}
              <g transform="translate(430, 180)" filter="url(#nodeShadow)">
                <circle cx="0" cy="0" r="44" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="36" fill="rgba(56, 189, 248, 0.15)" />
                <text x="0" y="7" textAnchor="middle" fontSize="26">🏠</text>
                <text x="0" y="62" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="800">
                  {(homeLoad / 1000).toFixed(1)} kW Home
                </text>
              </g>

              {/* ===== NODE 1: SOLAR PV ARRAY ===== */}
              <g transform="translate(160, 110)" filter="url(#nodeShadow)">
                <circle cx="0" cy="0" r="38" fill="#0F172A" stroke="#F59E0B" strokeWidth="2" />
                <circle cx="0" cy="0" r="30" fill="rgba(245, 158, 11, 0.15)" />
                <text x="0" y="7" textAnchor="middle" fontSize="22">☀️</text>
                <text x="0" y="54" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="800">
                  {(activePower / 1000).toFixed(1)} kW Solar
                </text>
              </g>

              {/* ===== NODE 2: TRANSMISSION GRID PYLON ===== */}
              <g transform="translate(700, 110)" filter="url(#nodeShadow)">
                <circle cx="0" cy="0" r="38" fill="#0F172A" stroke={gridExport > 0 ? "#10B981" : (gridImport > 0 ? "#F59E0B" : "#475569")} strokeWidth="2" />
                <circle cx="0" cy="0" r="30" fill={gridExport > 0 ? "rgba(16, 185, 129, 0.15)" : (gridImport > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(71, 85, 105, 0.15)")} />
                <text x="0" y="7" textAnchor="middle" fontSize="22">🗼</text>
                <text x="0" y="54" textAnchor="middle" fill={gridExport > 0 ? "#10B981" : (gridImport > 0 ? "#F59E0B" : "#94A3B8")} fontSize="13" fontWeight="800">
                  {gridExport > 0 ? `${(gridExport / 1000).toFixed(1)} kW Export` : (gridImport > 0 ? `${(gridImport / 1000).toFixed(1)} kW Import` : '0.0 kW Grid')}
                </text>
              </g>

              {/* ===== NODE 3: INVERTER UNIT ===== */}
              <g transform="translate(250, 270)" filter="url(#nodeShadow)">
                <circle cx="0" cy="0" r="34" fill="#0F172A" stroke="#EF4444" strokeWidth="2" />
                <circle cx="0" cy="0" r="26" fill="rgba(239, 68, 68, 0.15)" />
                <text x="0" y="6" textAnchor="middle" fontSize="20">⚡</text>
                <text x="0" y="48" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">
                  Havells 3.3kW
                </text>
              </g>

              {/* ===== NODE 4: APPLIANCES / CAR ===== */}
              <g transform="translate(610, 270)" filter="url(#nodeShadow)">
                <circle cx="0" cy="0" r="34" fill="#0F172A" stroke="#A855F7" strokeWidth="2" />
                <circle cx="0" cy="0" r="26" fill="rgba(168, 85, 247, 0.15)" />
                <text x="0" y="6" textAnchor="middle" fontSize="20">🚗</text>
                <text x="0" y="48" textAnchor="middle" fill="#A855F7" fontSize="12" fontWeight="700">
                  Self-Use
                </text>
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* ================= SECTION 3: LIVE MEASUREMENTS & SYSTEM INFO (MATCHING IMAGE 1 BOTTOM!) ================= */}
      <div className="iso-bottom-split-grid">
        {/* Card A: Live Measurements */}
        <div className="iso-info-card">
          <div className="info-card-header">
            <div>
              <h4 className="info-card-title">Live Measurements</h4>
              <span className="info-card-sub">Real-time system electrical values • Updates every 1.0s</span>
            </div>
            <span className="info-live-badge">
              <span className="pulse-dot"></span> LIVE
            </span>
          </div>

          <div className="measurements-list">
            <div className="meas-row">
              <span className="meas-label">Grid Voltage</span>
              <span className="meas-val font-mono">{liveData?.grid_voltage || 232.4} V</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Grid Frequency</span>
              <span className="meas-val font-mono">{liveData?.grid_frequency || 50.0} Hz</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Grid Import Power</span>
              <span className={`meas-val font-mono ${gridImport > 0 ? 'text-amber font-bold' : ''}`}>
                {(gridImport / 1000).toFixed(2)} kW
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Grid Export Power</span>
              <span className={`meas-val font-mono ${gridExport > 0 ? 'text-emerald font-bold' : ''}`}>
                {(gridExport / 1000).toFixed(2)} kW
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Load Power (Home)</span>
              <span className="meas-val font-mono text-cyan">{(homeLoad / 1000).toFixed(2)} kW</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Total Solar PV Power</span>
              <span className={`meas-val font-mono ${activePower > 0 ? 'text-amber font-bold' : 'text-muted'}`}>
                {(activePower / 1000).toFixed(2)} kW {activePower === 0 ? '(Standby)' : ''}
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">PV1 String Telemetry</span>
              <span className="meas-val font-mono">{liveData?.pv1_voltage || 298.5}V • {liveData?.pv1_current || 3.6}A</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">PV2 String Telemetry</span>
              <span className="meas-val font-mono">{liveData?.pv2_voltage || 295.2}V • {liveData?.pv2_current || 3.4}A</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Inverter IGBT Temperature</span>
              <span className="meas-val font-mono text-emerald">{liveData?.module_temp || 44.5} °C</span>
            </div>
          </div>
        </div>

        {/* Card B: System Information */}
        <div className="iso-info-card">
          <div className="info-card-header">
            <div>
              <h4 className="info-card-title">System Information</h4>
              <span className="info-card-sub">Plant configuration & network binding details</span>
            </div>
            <span className="info-model-badge">Havells Enviro Pro</span>
          </div>

          <div className="measurements-list">
            <div className="meas-row">
              <span className="meas-label">Plant ID / Name</span>
              <span className="meas-val font-mono">Solar Rooftop GTi</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Inverter Serial Number</span>
              <span className="meas-val font-mono text-amber">{config?.inverter_sn || 'AFDOALB2PNAPJ78'}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Datalogger Stick S/N</span>
              <span className="meas-val font-mono">SRBAN7JD3S (PRO Wi-Fi)</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Assigned Local IP</span>
              <span className="meas-val font-mono text-cyan">192.168.1.5</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Plant Rated Capacity</span>
              <span className="meas-val font-mono font-bold">3.30 kW</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Electricity Board / Circle</span>
              <span className="meas-val font-mono">APDCL</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Net Metering Tariff Slab</span>
              <span className="meas-val font-mono text-emerald font-bold">Slab 3 (&gt;240 Units @ ₹{tariffRate})</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Datalogger Protocol</span>
              <span className="meas-val font-mono">Modbus RTU RS485 • 9600-8-N-1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}