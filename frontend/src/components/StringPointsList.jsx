import React from 'react';
import { Zap, Sun, Cpu } from 'lucide-react';

const fmtNum = (val, decimals = 1, unit = '', fallback = '—') =>
  val !== null && val !== undefined && !Number.isNaN(Number(val))
    ? `${Number(val).toFixed(decimals)}${unit ? ` ${unit}` : ''}`
    : fallback;

export function StringPointsList({ liveData = {}, config: _config = {} }) {
  const isPv2Unconnected = liveData?.pv2_voltage == null && liveData?.pv2_power == null;

  const pv1Power = liveData?.pv1_power !== null && liveData?.pv1_power !== undefined ? Math.round(Number(liveData.pv1_power)) : null;
  const pv2Power = isPv2Unconnected ? null : (liveData?.pv2_power !== null && liveData?.pv2_power !== undefined ? Math.round(Number(liveData.pv2_power)) : null);
  const activePower = liveData?.active_power !== null && liveData?.active_power !== undefined ? Math.round(Number(liveData.active_power)) : null;

  const pv1V = fmtNum(liveData?.pv1_voltage, 1);
  const pv1I = fmtNum(liveData?.pv1_current, 2);

  const gridV = fmtNum(liveData?.grid_voltage, 1);
  const gridF = fmtNum(liveData?.grid_frequency, 2);

  const isGenerating = activePower !== null && activePower > 0;
  const isGridSynced = liveData?.grid_voltage !== null && Number(liveData?.grid_voltage) > 0;

  const points = [
    {
      id: 'str1',
      title: 'PV String 1 (Main Solar Array)',
      capacity: liveData?.pv1_voltage !== null && liveData?.pv1_current !== null
        ? `${pv1V} V · ${pv1I} A`
        : '0.0 V · 0.00 A (Night / Standby)',
      status: pv1Power !== null && pv1Power > 0 ? 'Generating' : 'Standby',
      statusColor: pv1Power !== null && pv1Power > 0 ? 'text-emerald' : 'text-muted',
      power: pv1Power !== null ? `${pv1Power} W` : '— W',
      type: 'panel'
    },
    {
      id: 'str2',
      title: 'PV String 2 (MPPT Channel 2)',
      capacity: isPv2Unconnected ? 'MPPT 2: Unconnected (Single-String Array)' : `${fmtNum(liveData?.pv2_voltage, 1, 'V')} · ${fmtNum(liveData?.pv2_current, 2, 'A')}`,
      status: isPv2Unconnected ? 'Unconnected' : (pv2Power > 0 ? 'Generating' : 'Standby'),
      statusColor: isPv2Unconnected ? 'text-muted' : (pv2Power > 0 ? 'text-emerald' : 'text-muted'),
      power: isPv2Unconnected ? '—' : (pv2Power !== null ? `${pv2Power} W` : '— W'),
      type: 'panel'
    },
    {
      id: 'inv',
      title: 'Havells Enviro Pro GTi (3.3 kW)',
      capacity: isGridSynced
        ? `Grid: ${gridV} V · ${gridF !== '—' ? gridF : '50.00'} Hz`
        : 'AC Relay Open (Standby)',
      status: isGenerating ? 'Synchronized' : (isGridSynced ? 'AC Line Ready' : 'Standby / Sleep'),
      statusColor: isGenerating ? 'text-cyan' : 'text-muted',
      power: activePower !== null ? `${activePower} W` : '— W',
      type: 'inverter'
    }
  ];

  return (
    <div className="solary-card card-panel-points surface-card">
      <div className="card-header-row">
        <h3 className="card-heading">Solar Panel Points</h3>
        <span className="card-sub-timestamp font-mono" style={{ fontSize: '11px' }}>
          {isGenerating ? 'Active Generation' : 'Standby Mode'}
        </span>
      </div>

      <div className="points-list-container">
        {points.map((p) => (
          <div key={p.id} className="point-item-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* Thumbnail graphic */}
            <div className="point-thumb-wrapper" style={{ flexShrink: 0 }}>
              {p.type === 'panel' ? (
                <div className="panel-micro-thumb">
                  <Sun size={20} className={p.status === 'Generating' ? 'text-amber' : 'text-muted'} />
                </div>
              ) : (
                <div className="panel-micro-thumb inverter-thumb">
                  <Cpu size={20} className={isGenerating ? 'text-rose' : 'text-muted'} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="point-text-block" style={{ flex: 1, minWidth: '180px' }}>
              <span className="point-name">{p.title}</span>
              <div className="point-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '2px' }}>
                <span className="point-cap">{p.capacity}</span>
                <span className={`point-status-tag ${p.statusColor}`}>• {p.status}</span>
              </div>
            </div>

            {/* Power output */}
            <div className="point-power-badge" style={{ flexShrink: 0 }}>
              <Zap size={13} className={p.power !== '— W' && p.power !== '—' && p.power !== '0 W' ? 'text-amber' : 'text-muted'} />
              <span className="font-mono">{p.power}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StringPointsList;
