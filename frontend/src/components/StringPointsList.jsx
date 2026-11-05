import React from 'react';
import { Zap, Sun, Cpu } from 'lucide-react';

export function StringPointsList({ liveData, config }) {
  const pv1Power = Math.round(liveData.pv1_power || 1620);
  const pv2Power = Math.round(liveData.pv2_power || 1500);
  const activePower = Math.round(liveData.active_power || 3120);

  const points = [
    {
      id: 'str1',
      title: 'PV String 1 (East Array)',
      capacity: '4 Panels • 285.4 V • 5.68 A',
      status: 'Active',
      statusColor: 'text-emerald',
      power: `${pv1Power} W`,
      type: 'panel'
    },
    {
      id: 'str2',
      title: 'PV String 2 (South Array)',
      capacity: '4 Panels • 281.2 V • 5.61 A',
      status: 'Active',
      statusColor: 'text-emerald',
      power: `${pv2Power} W`,
      type: 'panel'
    },
    {
      id: 'inv',
      title: 'Havells Enviro Pro GTi',
      capacity: `Grid: ${liveData.grid_voltage || 231}V • ${liveData.grid_frequency || 50.0}Hz`,
      status: 'Synchronized',
      statusColor: 'text-cyan',
      power: `${activePower} W`,
      type: 'inverter'
    }
  ];

  return (
    <div className="solary-card card-panel-points">
      <div className="card-header-row">
        <h3 className="card-heading">Solar Panel Points</h3>
      </div>

      <div className="points-list-container">
        {points.map((p) => (
          <div key={p.id} className="point-item-row">
            {/* Thumbnail graphic */}
            <div className="point-thumb-wrapper">
              {p.type === 'panel' ? (
                <div className="panel-micro-thumb">
                  <Sun size={20} className="text-amber" />
                </div>
              ) : (
                <div className="panel-micro-thumb inverter-thumb">
                  <Cpu size={20} className="text-rose" />
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
              <Zap size={13} className="text-amber" />
              <span>{p.power}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
