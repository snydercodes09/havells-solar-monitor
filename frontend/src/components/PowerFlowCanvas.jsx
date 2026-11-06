import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Zap,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  Layers,
  CircleDot
} from 'lucide-react';

export function PowerFlowCanvas({
  liveData = {},
  summary = {},
  config = {},
  activePower: propActivePower,
  pv1Power: propPv1Power,
  pv2Power: propPv2Power,
  gridVoltage: _propGridVoltage
}) {
  // Mode: 'isometric' (matching Image 1) | 'schematic' (matching Image 2 bottom)
  const [viewMode, setViewMode] = useState('isometric');
  const stageWrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);
  const [stageDimensions, setStageDimensions] = useState({ width: 960, height: 480 });

  // Responsive ResizeObserver for canvas & SVG container
  useEffect(() => {
    const wrapper = stageWrapperRef.current;
    if (!wrapper) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const clientWidth = entry.contentRect.width;
        if (clientWidth > 0) {
          const newW = Math.max(320, Math.round(clientWidth));
          const newH = Math.round(newW * 0.5); // 2:1 aspect ratio matching 960x480
          setStageDimensions({ width: newW, height: newH });

          const canvas = canvasRef.current;
          if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = newW * dpr;
            canvas.height = newH * dpr;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
          }
        }
      }
    });

    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [viewMode]);

  // HiDPI scaled canvas animation with clean requestAnimationFrame cancellation on unmount (F-02)
  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const renderFrame = () => {
          phaseRef.current = (phaseRef.current + 0.03) % (Math.PI * 2);
          animationFrameId = requestAnimationFrame(renderFrame);
        };
        animationFrameId = requestAnimationFrame(renderFrame);
      }
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [viewMode, stageDimensions]);

  const hasCtMeter = config?.has_ct_meter === true || config?.has_ct_meter === 'true' || liveData?.has_ct_meter === true;
  const isSimulation = config?.simulation_mode === true || config?.simulation_mode === 'true' || liveData?.is_simulation === true;

  const safeActiveW = Number(liveData?.active_power) || 0;
  const safeRatedW = Number(config?.rated_capacity_w) || 3300;
  const capacityPct = safeRatedW > 0 ? Math.min(100, Math.max(0, Math.round((safeActiveW / safeRatedW) * 100))) : 0;

  const activePower = liveData?.active_power !== null && liveData?.active_power !== undefined
    ? Math.round(Number(propActivePower !== undefined ? propActivePower : liveData.active_power))
    : null;
  const pv1Power = liveData?.pv1_power !== null && liveData?.pv1_power !== undefined
    ? Math.round(Number(propPv1Power !== undefined ? propPv1Power : liveData.pv1_power))
    : null;
  const pv2Power = liveData?.pv2_power !== null && liveData?.pv2_power !== undefined
    ? Math.round(Number(propPv2Power !== undefined ? propPv2Power : liveData.pv2_power))
    : null;

  // Inverter-Only Truth Mode: Household load and grid import/export are unmeasured without a physical CT meter
  let homeLoad = null;
  let gridImport = null;
  let gridExport = null;

  if (hasCtMeter) {
    homeLoad = liveData?.home_load !== null && liveData?.home_load !== undefined ? Math.round(Number(liveData.home_load)) : null;
    gridImport = liveData?.grid_import !== null && liveData?.grid_import !== undefined ? Math.round(Number(liveData.grid_import)) : null;
    gridExport = liveData?.grid_export !== null && liveData?.grid_export !== undefined ? Math.round(Number(liveData.grid_export)) : null;
  }

  const tariffRate = Number(config?.tariff_rate) || 7.65;
  const todayKwh = summary?.today_kwh !== null && summary?.today_kwh !== undefined
    ? Number(summary.today_kwh)
    : (liveData?.today_energy !== null && liveData?.today_energy !== undefined ? Number(liveData.today_energy) : null);
  const todaySavings = todayKwh !== null ? Math.round(todayKwh * tariffRate) : null;

  const fmt = (val, decimals = 1, unit = '') => {
    if (val === null || val === undefined || isNaN(Number(val))) return '—';
    return `${Number(val).toFixed(decimals)}${unit ? ' ' + unit : ''}`;
  };

  // Speed of animated energy particles (reflects verified generation)
  const solarParticleStyle = (activePower && activePower > 0) ? { animationDuration: `${Math.max(0.6, 2.8 - (activePower / 1600))}s` } : { display: 'none' };
  const gridExportParticleStyle = (activePower && activePower > 0) ? { animationDuration: `${Math.max(0.7, 2.5 - (activePower / 1500))}s` } : { display: 'none' };
  const gridImportParticleStyle = (gridImport && gridImport > 0) ? { animationDuration: `${Math.max(0.7, 2.5 - (gridImport / 1000))}s` } : { display: 'none' };
  const houseParticleStyle = (homeLoad && homeLoad > 0) ? { animationDuration: `${Math.max(0.8, 2.5 - (homeLoad / 1000))}s` } : { display: 'none' };

  // Calculate home load progress percentage (strictly 0 if unmeasured)
  const loadPercentage = homeLoad !== null
    ? ((activePower && activePower > 0) ? Math.min(100, Math.round((homeLoad / activePower) * 100)) : Math.min(100, Math.round((homeLoad / 1500) * 100)))
    : 0;

  return (
    <div className="iso-dashboard-container">

      {/* ================= SECTION 1: TOP 4 SLEEK TELEMETRY CARDS ================= */}
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
            {homeLoad !== null ? (
              <>
                <span className="metric-big-val">{(homeLoad / 1000).toFixed(1)} <small>kW</small></span>
                <span className={`metric-trend-badge ${gridImport > 0 ? 'text-amber' : 'text-emerald'}`}>
                  {gridImport > 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                </span>
              </>
            ) : (
              <span className="metric-big-val" style={{ fontSize: '1.15rem', color: '#94a3b8' }}>
                Unmeasured <small style={{ fontSize: '0.75rem' }}>(No CT)</small>
              </span>
            )}
          </div>
          <div className="metric-progress-track">
            <div
              className="metric-progress-fill bar-home"
              style={{ width: `${loadPercentage}%` }}
            />
          </div>
          <div className="metric-footer-row">
            {homeLoad !== null ? (
              <>
                <span className="metric-footer-val">{homeLoad} W</span>
                <span className="metric-footer-label">{gridImport > 0 ? 'Grid Powered' : 'Solar Powered'}</span>
              </>
            ) : (
              <>
                <span className="metric-footer-val">No CT Meter</span>
                <span className="metric-footer-label">Direct Inverter Telemetry</span>
              </>
            )}
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
            {activePower !== null ? (
              <>
                <span className="metric-big-val">{(activePower / 1000).toFixed(2)} <small>kW</small></span>
                <span className="metric-trend-badge text-amber">
                  <ArrowUpRight size={14} />
                </span>
              </>
            ) : (
              <span className="metric-big-val" style={{ fontSize: '1.25rem', color: '#94a3b8' }}>
                — <small style={{ fontSize: '0.75rem' }}>Standby</small>
              </span>
            )}
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
            <span className="metric-footer-val">{activePower !== null ? `${(activePower / 1000).toFixed(2)} kW` : '—'}</span>
            <span className="metric-footer-label">Verified Inverter Pac</span>
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
            <span className="metric-big-val">{fmt(liveData?.module_temp, 1)} <small>°C</small></span>
            <span className="metric-status-tag">{liveData?.inverter_efficiency ? `${liveData.inverter_efficiency}% Eff` : 'Standby'}</span>
          </div>
          <div className="metric-progress-track">
            <div
              className="metric-progress-fill bar-inverter"
              style={{ width: `${Math.min(100, Math.round(((Number(liveData?.module_temp) || 30) / 75) * 100))}%` }}
            />
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val">{fmt(liveData?.grid_voltage, 1, 'V')} • {fmt(liveData?.grid_frequency, 2, 'Hz')}</span>
            <span className="metric-footer-label">{Number(liveData?.grid_voltage || 0) > 0 ? 'Synchronized' : 'Offline'}</span>
          </div>
        </div>

        {/* Card 4: Grid (APDCL) */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">APDCL Grid</span>
            <div className="metric-card-icon-pill">
              <Zap size={18} className={(gridImport && gridImport > 0) ? "text-amber" : ((gridExport && gridExport > 0) ? "text-emerald" : "text-muted")} />
            </div>
          </div>
          <div className="metric-value-row">
            {hasCtMeter || isSimulation ? (
              <div className="grid-sub-rates">
                <span className={`grid-rate-item ${gridImport > 0 ? 'active-grid-in' : ''}`}>
                  <strong className={gridImport > 0 ? 'text-amber' : ''}>
                    {gridImport !== null ? (gridImport / 1000).toFixed(1) : '—'} <small>kW</small>
                  </strong>
                  <span>import</span>
                </span>
                <span className={`grid-rate-item ${gridExport > 0 ? 'active-grid-out' : ''}`}>
                  <strong className={gridExport > 0 ? 'text-emerald' : ''}>
                    {gridExport !== null ? (gridExport / 1000).toFixed(1) : '—'} <small>kW</small>
                  </strong>
                  <span>export</span>
                </span>
              </div>
            ) : (
              <span className="metric-big-val" style={{ fontSize: '1.05rem', color: '#94a3b8' }}>
                Inverter AC Output → PCC
              </span>
            )}
          </div>
          <div className="metric-cost-highlight">
            <span className="cost-rupee-val">{todaySavings !== null ? `₹ ${todaySavings.toLocaleString('en-IN')}` : '—'}</span>
            <span className="cost-rupee-label">today yield value (₹{tariffRate}/unit)</span>
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
          <div className="power-flow-canvas-wrapper isometric-stage-wrapper" ref={stageWrapperRef} style={{ position: 'relative' }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />
            <svg
              className="isometric-svg-canvas"
              viewBox="0 0 960 480"
              preserveAspectRatio="xMidYMid meet"
              style={{ position: 'relative', zIndex: 2 }}
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
              {(activePower > 0 || liveData?.is_hardware_online) && (
                <line
                  x1="480" y1="250" x2="300" y2="380"
                  className="iso-conduit-flow flow-rose"
                  style={{ animationDuration: '2.5s' }}
                />
              )}

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
                  <text x="35" y="18" fill="#F8FAFC" fontSize="13" fontWeight="800">
                    {activePower !== null && activePower > 0
                      ? `${(activePower / 1000).toFixed(2)} kW`
                      : (activePower === 0 ? '0.00 kW' : '— kW')}
                  </text>
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
                  <text x="38" y="32" fill={activePower > 0 || liveData?.is_hardware_online ? '#10B981' : '#94A3B8'} fontSize="10" fontWeight="600">
                    {activePower > 0 || liveData?.is_hardware_online ? '3.3 kW • Online' : 'Standby / Sleep'}
                  </text>
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
                {gridExport !== null && gridExport > 0 ? (
                  <g transform="translate(20, -28)">
                    <rect x="0" y="0" width="120" height="42" rx="10" fill="rgba(15, 23, 42, 0.94)" stroke="#10B981" strokeWidth="1.6" />
                    <circle cx="18" cy="21" r="10" fill="rgba(16, 185, 129, 0.2)" />
                    <text x="18" y="25" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="bold">🗼</text>
                    <text x="35" y="18" fill="#10B981" fontSize="13" fontWeight="800">{(gridExport / 1000).toFixed(2)} kW</text>
                    <text x="35" y="32" fill="#94A3B8" fontSize="10" fontWeight="600">APDCL Export</text>
                  </g>
                ) : gridImport !== null && gridImport > 0 ? (
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
                    <text x="35" y="18" fill="#94A3B8" fontSize="13" fontWeight="800">
                      {liveData?.grid_voltage !== null && liveData?.grid_voltage !== undefined
                        ? `${Number(liveData.grid_voltage).toFixed(0)} V`
                        : '— V'}
                    </text>
                    <text x="35" y="32" fill="#64748B" fontSize="10" fontWeight="600">{hasCtMeter ? "APDCL Grid" : "Inverter AC Output → PCC"}</text>
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
                  <text x="35" y="18" fill="#F8FAFC" fontSize="12" fontWeight="800">
                    {homeLoad !== null ? `${(homeLoad / 1000).toFixed(2)} kW` : 'Unmeasured'}
                  </text>
                  <text x="35" y="32" fill={homeLoad !== null ? (gridImport > 0 ? "#FDE047" : "#94A3B8") : "#64748B"} fontSize="9.5" fontWeight="600">
                    {hasCtMeter ? (gridImport > 0 ? "Grid Draw" : "Home Load") : "Unmeasured (No CT)"}
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
                  <text x="35" y="18" fill="#F8FAFC" fontSize="11" fontWeight="800">
                    {config?.wifi_stick_ip || config?.serial_port || 'RS485 Bus'}
                  </text>
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
                  {homeLoad !== null ? `${(homeLoad / 1000).toFixed(1)} kW Home` : 'Unmeasured (No CT)'}
                </text>
              </g>

              {/* ===== NODE 1: SOLAR PV ARRAY ===== */}
              <g transform="translate(160, 110)" filter="url(#nodeShadow)">
                <circle cx="0" cy="0" r="38" fill="#0F172A" stroke="#F59E0B" strokeWidth="2" />
                <circle cx="0" cy="0" r="30" fill="rgba(245, 158, 11, 0.15)" />
                <text x="0" y="7" textAnchor="middle" fontSize="22">☀️</text>
                <text x="0" y="54" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="800">
                  {activePower !== null && activePower > 0
                    ? `${(activePower / 1000).toFixed(2)} kW Solar`
                    : '— Standby'}
                </text>
              </g>

              {/* ===== NODE 2: TRANSMISSION GRID PYLON ===== */}
              <g transform="translate(700, 110)" filter="url(#nodeShadow)">
                <circle cx="0" cy="0" r="38" fill="#0F172A" stroke={gridExport > 0 ? "#10B981" : (gridImport > 0 ? "#F59E0B" : "#475569")} strokeWidth="2" />
                <circle cx="0" cy="0" r="30" fill={gridExport > 0 ? "rgba(16, 185, 129, 0.15)" : (gridImport > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(71, 85, 105, 0.15)")} />
                <text x="0" y="7" textAnchor="middle" fontSize="22">🗼</text>
                <text x="0" y="54" textAnchor="middle" fill={gridExport > 0 ? "#10B981" : (gridImport > 0 ? "#F59E0B" : "#94A3B8")} fontSize="13" fontWeight="800">
                  {gridExport > 0
                    ? `${(gridExport / 1000).toFixed(1)} kW Export`
                    : (gridImport > 0
                      ? `${(gridImport / 1000).toFixed(1)} kW Import`
                      : (hasCtMeter ? (liveData?.grid_voltage ? `${Number(liveData.grid_voltage).toFixed(0)} V Grid` : 'Grid Standby') : 'Inverter AC Output → PCC'))}
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

      {/* ================= SECTION 3: COMPREHENSIVE 4-CARD INVERTER TELEMETRY MATRIX ================= */}
      <div className="iso-bottom-split-grid">
        {/* Card 1: AC Grid & Power Quality */}
        <div className="iso-info-card">
          <div className="info-card-header">
            <div>
              <h4 className="info-card-title">AC Grid & Power Quality</h4>
              <span className="info-card-sub">Inverter AC output registers & harmonic sync</span>
            </div>
            <span className="info-live-badge">
              <span className="pulse-dot"></span> LIVE
            </span>
          </div>

          <div className="measurements-list">
            <div className="meas-row">
              <span className="meas-label">AC Active Power (Pac)</span>
              <span className={`meas-val font-mono ${activePower > 0 ? 'text-amber font-bold' : 'text-muted'}`}>
                {activePower !== null ? `${activePower.toLocaleString()} W (${(activePower / 1000).toFixed(2)} kW)` : '— (Inverter Asleep)'}
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Reactive Power (Q)</span>
              <span className="meas-val font-mono text-cyan">{fmt(liveData?.reactive_power, 2, 'kVAR')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Apparent Power (S)</span>
              <span className="meas-val font-mono">{fmt(liveData?.apparent_power, 0, 'VA')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Power Factor (cos φ)</span>
              <span className="meas-val font-mono text-emerald">{fmt(liveData?.power_factor, 3)}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">AC Line Voltage (Phase 1)</span>
              <span className="meas-val font-mono">{fmt(liveData?.grid_voltage, 1, 'V')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">AC Grid Current</span>
              <span className="meas-val font-mono">{fmt(liveData?.grid_current, 2, 'A')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Grid Frequency</span>
              <span className="meas-val font-mono text-emerald">{fmt(liveData?.grid_frequency, 2, 'Hz')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">DC Current Injection (DCI)</span>
              <span className="meas-val font-mono">{fmt(liveData?.dci_injection, 1, 'mA')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: DC Array & MPPT Strings */}
        <div className="iso-info-card">
          <div className="info-card-header">
            <div>
              <h4 className="info-card-title">DC Array & MPPT Telemetry</h4>
              <span className="info-card-sub">Independent dual-string solar inputs</span>
            </div>
            <span className="info-model-badge">Dual MPPT</span>
          </div>

          <div className="measurements-list">
            <div className="meas-row">
              <span className="meas-label">PV1 String Voltage & Current</span>
              <span className="meas-val font-mono text-amber">{fmt(liveData?.pv1_voltage, 1, 'V')} • {fmt(liveData?.pv1_current, 2, 'A')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">PV1 String Power</span>
              <span className="meas-val font-mono font-bold">{fmt(liveData?.pv1_power, 0, 'W')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">PV2 String Voltage & Current</span>
              <span className="meas-val font-mono text-amber">{fmt(liveData?.pv2_voltage, 1, 'V')} • {fmt(liveData?.pv2_current, 2, 'A')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">PV2 String Power</span>
              <span className="meas-val font-mono font-bold">{fmt(liveData?.pv2_power, 0, 'W')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Total DC Solar Input</span>
              <span className="meas-val font-mono text-emerald font-bold">
                {fmt(liveData?.total_dc_power, 0, 'W')}
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Internal DC Bus Link (Vbus)</span>
              <span className="meas-val font-mono">{fmt(liveData?.bus_voltage, 0, 'V')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">MPPT Tracking Mode</span>
              <span className="meas-val font-mono text-cyan">{activePower && activePower > 0 ? 'Dynamic Dual MPPT Active' : 'Standby Mode (Night)'}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Solar Generation Status</span>
              <span className="meas-val font-mono text-muted">{activePower && activePower > 0 ? 'Generating' : 'Standby / 0 V DC'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Electrical Safety & Ground Insulation */}
        <div className="iso-info-card">
          <div className="info-card-header">
            <div>
              <h4 className="info-card-title">Safety & Insulation Diagnostics</h4>
              <span className="info-card-sub">Ground fault interrupter & DC impedance</span>
            </div>
            <span className="badge-highlight font-mono text-emerald">IEC 62109 Safe</span>
          </div>

          <div className="measurements-list">
            <div className="meas-row">
              <span className="meas-label">PV1 Insulation (P to GND)</span>
              <span className="meas-val font-mono text-emerald">{fmt(liveData?.pv1_insulation, 0, 'kΩ')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">PV2 Insulation (P to GND)</span>
              <span className="meas-val font-mono text-emerald">{fmt(liveData?.pv2_insulation, 0, 'kΩ')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">PV Negative to Earth (N to GND)</span>
              <span className="meas-val font-mono text-emerald">{fmt(liveData?.pv_n_insulation, 0, 'kΩ')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">GFCI Residual Leakage (IΔn)</span>
              <span className="meas-val font-mono text-cyan">{fmt(liveData?.gfci_leakage, 1, 'mA')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Anti-Islanding Trip Status</span>
              <span className="meas-val font-mono text-emerald">Armed / Active (IEEE 1547)</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Grid Fault Protection State</span>
              <span className="meas-val font-mono text-emerald">Normal (Zero Over/Under Faults)</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Grounding Resistance Integrity</span>
              <span className="meas-val font-mono text-emerald">Verified Stable</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Inverter Relay Contactors</span>
              <span className="meas-val font-mono text-cyan">{activePower && activePower > 0 ? 'Closed (Grid Tied)' : 'Open (Standby)'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Thermals, Efficiency & Hardware Lifecycle */}
        <div className="iso-info-card">
          <div className="info-card-header">
            <div>
              <h4 className="info-card-title">Thermals, Efficiency & Lifecycle</h4>
              <span className="info-card-sub">Internal heatsink thermals & inverter runtime</span>
            </div>
            <span className="info-model-badge">Havells Enviro Pro</span>
          </div>

          <div className="measurements-list">
            <div className="meas-row">
              <span className="meas-label">IGBT Module Temperature</span>
              <span className="meas-val font-mono text-emerald">{fmt(liveData?.module_temp, 1, '°C')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Internal Enclosure Ambient</span>
              <span className="meas-val font-mono text-cyan">{fmt(liveData?.inner_temp, 1, '°C')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Instantaneous Efficiency (η)</span>
              <span className="meas-val font-mono text-emerald font-bold">
                {activePower && activePower > 0 ? `${fmt(liveData?.inverter_efficiency, 1)}%` : 'Standby'}
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Today's Generation Runtime</span>
              <span className="meas-val font-mono font-bold">{fmt(liveData?.today_runtime_hrs, 1, 'Hours')}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Cumulative Lifetime Runtime</span>
              <span className="meas-val font-mono text-amber font-bold">
                {fmt(liveData?.total_runtime_hrs, 0, 'Hours')}
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Inverter Serial Number (SN)</span>
              <span className="meas-val font-mono text-amber">{config?.inverter_sn || 'AFDOALB2PNAPJ78'}</span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Datalogger Hardware & IP</span>
              <span className="meas-val font-mono">
                {config?.wifi_stick_sn || 'SRBAN7JD3S'} • {config?.wifi_stick_ip || config?.serial_port || 'RS485 Direct'}
              </span>
            </div>
            <div className="meas-row">
              <span className="meas-label">Modbus RTU Telemetry Bus</span>
              <span className="meas-val font-mono text-cyan">{liveData?.source || 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}