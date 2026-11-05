import React, { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';

export function SolarPanelCard({ liveData, config, summary }) {
  const [selectedString, setSelectedString] = useState('all');

  const activePower = Math.round(liveData.active_power || 0);
  const pv1Power = Math.round(liveData.pv1_power || 0);
  const pv2Power = Math.round(liveData.pv2_power || 0);

  let displayPower = activePower;
  let labelString = 'Total Generation';
  if (selectedString === 'pv1') {
    displayPower = pv1Power;
    labelString = 'String 1 (PV1)';
  } else if (selectedString === 'pv2') {
    displayPower = pv2Power;
    labelString = 'String 2 (PV2)';
  }

  return (
    <div className="solary-card card-hero-panel">
      {/* Card Header */}
      <div className="card-header-row">
        <h3 className="card-heading">Solar Panel Monitoring</h3>
        <div className="location-pill">
          <span>Solar Rooftop</span>
          <ChevronDown size={14} />
        </div>
      </div>

      <div className="hero-panel-body">
        {/* Left Stats Section */}
        <div className="hero-stats-left">
          {/* Top Row Stats */}
          <div className="stats-metric-trio">
            <div className="stat-col">
              <span className="stat-label">Status</span>
              <span className="stat-val text-emerald font-bold">Active</span>
            </div>
            <div className="stat-col">
              <span className="stat-label">Capacity</span>
              <span className="stat-val font-semibold">3.3 <small>kW</small></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">Total Yield</span>
              <span className="stat-val font-semibold">{Math.round(summary.lifetime_kwh || 4835).toLocaleString()} <small>kWh</small></span>
            </div>
          </div>

          {/* Middle Row Stats */}
          <div className="stats-metric-duo">
            <div className="stat-col">
              <span className="stat-label">Self-Consumption</span>
              <span className="stat-val font-bold">680 <small>W</small></span>
            </div>
            <div className="stat-col">
              <span className="stat-label">Today's Generation</span>
              <span className="stat-val font-bold">{(liveData.today_energy || 0).toFixed(2)} <small>kWh</small></span>
            </div>
          </div>

          {/* Bottom Real Time Power Big Readout */}
          <div className="stat-realtime-block">
            <span className="stat-label">Real Time Power ({labelString})</span>
            <div className="realtime-val-wrapper">
              <span className="realtime-big-num">{displayPower.toLocaleString()}</span>
              <span className="realtime-unit">W</span>
              <span className="trend-badge">
                <ArrowUpRight size={13} /> +18.4%
              </span>
            </div>
          </div>
        </div>

        {/* Right Isometric 3D Solar Panel Render */}
        <div className="hero-panel-graphic">
          <div className="panel-selector-dropdown">
            <select
              value={selectedString}
              onChange={(e) => setSelectedString(e.target.value)}
              className="panel-select-native"
            >
              <option value="all">All Arrays (PV1 + PV2)</option>
              <option value="pv1">PV String 1 (1620 W)</option>
              <option value="pv2">PV String 2 (1500 W)</option>
            </select>
            <ChevronDown size={13} className="select-arrow" />
          </div>

          {/* Isometric Photorealistic Solar Panel SVG */}
          <div className="isometric-panel-svg-wrap">
            <svg viewBox="0 0 320 220" className="isometric-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="panelGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E3A8A" />
                  <stop offset="35%" stopColor="#1E40AF" />
                  <stop offset="70%" stopColor="#172554" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>

                <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E2E8F0" />
                  <stop offset="50%" stopColor="#94A3B8" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                <linearGradient id="sunReflection" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="45%" stopColor="rgba(255,255,255,0.08)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.25)" />
                  <stop offset="55%" stopColor="rgba(255,255,255,0.08)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>

              {/* Shadow underneath */}
              <polygon points="40,165 170,205 290,135 160,95" fill="rgba(0,0,0,0.5)" filter="blur(8px)" />

              {/* Back Stand Frame */}
              <polygon points="150,90 280,130 280,140 150,100" fill="#334155" />
              <polygon points="40,150 150,90 150,100 40,160" fill="#1E293B" />

              {/* Outer Metallic Bezel */}
              <polygon points="40,150 160,85 285,125 165,195" fill="url(#frameGradient)" />

              {/* Inner Solar Blue Glass Face */}
              <polygon points="46,148 160,89 279,126 165,189" fill="url(#panelGlass)" />

              {/* Monocrystalline Grid Wires (Isometric Lines) */}
              {/* Longitudinal busbars */}
              <line x1="75" y1="133" x2="190" y2="99" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
              <line x1="105" y1="149" x2="220" y2="114" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />
              <line x1="135" y1="165" x2="250" y2="129" stroke="#38BDF8" strokeWidth="1" opacity="0.6" />

              {/* Transverse cell dividers */}
              <line x1="68" y1="110" x2="108" y2="175" stroke="#0284C7" strokeWidth="0.8" opacity="0.5" />
              <line x1="115" y1="96" x2="155" y2="161" stroke="#0284C7" strokeWidth="0.8" opacity="0.5" />
              <line x1="162" y1="82" x2="202" y2="147" stroke="#0284C7" strokeWidth="0.8" opacity="0.5" />
              <line x1="209" y1="98" x2="249" y2="133" stroke="#0284C7" strokeWidth="0.8" opacity="0.5" />

              {/* Sun Light Sheen / Glare Polygon */}
              <polygon points="46,148 160,89 279,126 165,189" fill="url(#sunReflection)" />
            </svg>
          </div>

          <div className="panel-count-label">
            <span className="count-title">Total Array</span>
            <span className="count-num">8 Monocrystalline Panels</span>
          </div>
        </div>
      </div>
    </div>
  );
}
