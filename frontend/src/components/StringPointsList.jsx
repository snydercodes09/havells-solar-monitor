import React from 'react';
import { Zap, Sun, Cpu } from 'lucide-react';

export function StringPointsList({ liveData = {}, config = {} }) {
  const pv1Power = liveData?.pv1_power !== null && liveData?.pv1_power !== undefined ? Math.round(liveData.pv1_power) : null;
  const pv2Power = liveData?.pv2_power !== null && liveData?.pv2_power !== undefined ? Math.round(liveData.pv2_power) : null;
  const activePower = liveData?.active_power !== null && liveData?.active_power !== undefined ? Math.round(liveData.active_power) : null;

  const pv1V = liveData?.pv1_voltage !== null && liveData?.pv1_voltage !== undefined ? Number(liveData.pv1_voltage).toFixed(1) : null;
  const pv1I = liveData?.pv1_current !== null && liveData?.pv1_current !== undefined ? Number(liveData.pv1_current).toFixed(2) : null;
  const pv2V = liveData?.pv2_voltage !== null && liveData?.pv2_voltage !== undefined ? Number(liveData.pv2_voltage).toFixed(1) : null;
  const pv2I = liveData?.pv2_current !== null && liveData?.pv2_current !== undefined ? Number(liveData.pv2_current).toFixed(2) : null;

  const gridV = liveData?.grid_voltage !== null && liveData?.grid_voltage !== undefined ? Number(liveData.grid_voltage).toFixed(1) : null;
  const gridF = liveData?.grid_frequency !== null && liveData?.grid_frequency !== undefined ? Number(liveData.grid_frequency).toFixed(2) : null;

  const isGenerating = activePower !== null && activePower > 0;
  const isGridSynced = gridV !== null && Number(gridV) > 0;

  const points = [
    {
      id: 'str1',
      title: 'PV String 1 (Main Solar Array)',
      capacity: pv1V !== null && pv1I !== null
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
      capacity: 'Unconnected (Single-String System)',
      status: 'Inactive',
      statusColor: 'text-muted',
      power: '0 W',
      type: 'panel'
    },
    {
      id: 'inv',
      title: 'Havells Enviro Pro GTi (3.3 kW)',
      capacity: isGridSynced
        ? `Grid: ${gridV} V · ${gridF || '50.00'} Hz`
        : 'AC Relay Open (Standby)',
      status: isGenerating ? 'Synchronized' : (isGridSynced ? 'AC Line Ready' : 'Standby / Sleep'),
      statusColor: isGenerating ? 'text-cyan' : 'text-muted',
      power: activePower !== null ? `${activePower} W` : '— W',
      type: 'inverter'
    }
  ];

  return (
    <div className="solary-card card-panel-points">
      <div className="card-header-row">
        <h3 className="card-heading">Solar Panel Points</h3>
        <span className="card-sub-timestamp font-mono" style={{ fontSize: '11px' }}>
          {isGenerating ? 'Active Generation' : 'Standby Mode'}
        </span>
      </div>

      <div className="points-list-container">
        {points.map((p) => (
          <div key={p.id} className="point-item-row">
            {/* Thumbnail graphic */}
            <div className="point-thumb-wrapper">
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
            <div className="point-text-block">
              <span className="point-name">{p.title}</span>
              <div className="point-meta">
                <span className="point-cap">{p.capacity}</span>
                <span className={`point-status-tag ${p.statusColor}`}>• {p.status}</span>
              </div>
            </div>

            {/* Power output */}
            <div className="point-power-badge">
              <Zap size={13} className={p.power !== '— W' && p.power !== '0 W' ? 'text-amber' : 'text-muted'} />
              <span className="font-mono">{p.power}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
