import React, { useState } from 'react';
import { ChevronDown, ArrowUpRight, Zap, Sun } from 'lucide-react';

const fmtNum = (val, decimals = 1, unit = '', fallback = '—') =>
  val !== null && val !== undefined && !Number.isNaN(Number(val))
    ? `${Number(val).toFixed(decimals)}${unit ? ` ${unit}` : ''}`
    : fallback;

export function SolarPanelCard({ liveData = {}, config = {}, summary = {} }) {
  const [selectedString, setSelectedString] = useState('all');

  const isPv2Unconnected = liveData?.pv2_voltage == null && liveData?.pv2_power == null;

  const activePower = liveData.active_power !== null && liveData.active_power !== undefined ? Math.round(Number(liveData.active_power)) : null;
  const pv1Power = liveData.pv1_power !== null && liveData.pv1_power !== undefined ? Math.round(Number(liveData.pv1_power)) : null;
  const pv2Power = isPv2Unconnected ? null : (liveData.pv2_power !== null && liveData.pv2_power !== undefined ? Math.round(Number(liveData.pv2_power)) : null);

  let displayPower = activePower;
  let labelString = 'Total Generation';
  if (selectedString === 'pv1') {
    displayPower = pv1Power;
    labelString = 'String 1 (PV1)';
  } else if (selectedString === 'pv2') {
    displayPower = pv2Power;
    labelString = 'String 2 (PV2)';
  }

  const hasCt = config?.has_ct_meter === true || config?.has_ct_meter === 'true' || liveData?.has_ct_meter === true;
  const ratedCapacityW = Number(config?.rated_capacity_w) || 3300;
  const isGenerating = activePower !== null && activePower > 0;

  return (
    <div className="solary-card card-hero-panel">
      {/* Card Header */}
      <div className="card-header-row">
        <div>
          <h3 className="card-heading">Solar Array & Inverter Generation</h3>
          <span className="card-sub-timestamp font-mono" style={{ fontSize: '11px' }}>
            {isGenerating ? 'Active 1 Hz Inverter Telemetry' : 'Inverter Standby (Night / Standby)'}
          </span>
        </div>
        <div className="location-pill">
          <span>Havells 3.3 kW Rooftop</span>
        </div>
      </div>

      <div className="hero-panel-body">
        {/* Left Stats Section */}
        <div className="hero-stats-left">
          {/* Top Row Stats */}
          <div className="stats-metric-trio">
            <div className="stat-col">
              <span className="stat-label">Inverter State</span>
              <span className={`stat-val font-bold ${isGenerating ? 'text-emerald' : 'text-muted'}`}>
                {isGenerating ? 'Generating' : 'Standby'}
              </span>
            </div>
            <div className="stat-col">
              <span className="stat-label">Array Rating</span>
              <span className="stat-val font-semibold font-mono">
                {(ratedCapacityW / 1000).toFixed(1)} <small>kW</small>
              </span>
            </div>
            <div className="stat-col">
              <span className="stat-label">Lifetime Yield</span>
              <span className="stat-val font-semibold font-mono">
                {summary.lifetime_kwh !== null && summary.lifetime_kwh !== undefined
                  ? `${Math.round(Number(summary.lifetime_kwh)).toLocaleString()} `
                  : '— '}
                <small>kWh</small>
              </span>
            </div>
          </div>

          {/* Middle Row Stats */}
          <div className="stats-metric-duo">
            <div className="stat-col">
              {hasCt ? (
                <>
                  <span className="stat-label">Home Consumption</span>
                  <span className="stat-val font-bold font-mono">
                    {liveData?.home_load !== null && liveData?.home_load !== undefined ? (
                      <>{Math.round(Number(liveData.home_load))} <small>W</small></>
                    ) : (
                      '— W'
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="stat-label">AC Grid Voltage (PCC)</span>
                  <span className="stat-val font-bold font-mono">
                    {liveData?.grid_voltage !== null && liveData?.grid_voltage !== undefined ? (
                      <>{fmtNum(liveData.grid_voltage, 1, 'V AC')}</>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>— V (Standby)</span>
                    )}
                  </span>
                </>
              )}
            </div>
            <div className="stat-col">
              <span className="stat-label">Today's Generation</span>
              <span className="stat-val font-bold font-mono text-emerald">
                {liveData.today_energy !== null && liveData.today_energy !== undefined ? (
                  <>{fmtNum(liveData.today_energy, 2, 'kWh')}</>
                ) : summary?.today_kwh !== null && summary?.today_kwh !== undefined ? (
                  <>{fmtNum(summary.today_kwh, 2, 'kWh')}</>
                ) : (
                  <>— <small>kWh</small></>
                )}
              </span>
            </div>
          </div>

          {/* Bottom Real Time Power Big Readout */}
          <div className="stat-realtime-block">
            <div className="flex-align gap-8">
              <span className="stat-label">Real-Time AC Output ({labelString})</span>
              {selectedString === 'pv2' && isPv2Unconnected && (
                <span className="badge-highlight font-mono text-muted" style={{ fontSize: '0.7rem' }}>
                  MPPT 2: Unconnected (Single-String Array)
                </span>
              )}
            </div>
            <div className="realtime-val-wrapper">
              <span className="realtime-big-num font-mono">
                {selectedString === 'pv2' && isPv2Unconnected
                  ? '—'
                  : displayPower !== null && displayPower !== undefined
                  ? displayPower.toLocaleString()
                  : '—'}
              </span>
              <span className="realtime-unit">W</span>
              <span className={`trend-badge ${isGenerating ? 'generating' : 'standby'}`}>
                {selectedString === 'pv2' && isPv2Unconnected ? (
                  'Unconnected'
                ) : isGenerating ? (
                  <><ArrowUpRight size={13} /> Generating</>
                ) : (
                  'Standby (0 W)'
                )}
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
              <option value="pv1">PV String 1 (PV1)</option>
              <option value="pv2">PV String 2 (PV2 - Unconnected)</option>
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
            <span className="count-title">
              {isPv2Unconnected ? 'Single-String Array' : 'Dual String Array'}
            </span>
            <span className="count-num">
              {isPv2Unconnected ? '8 Panels (PV1 Active • MPPT 2 Unconnected)' : '8 Monocrystalline Panels'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
