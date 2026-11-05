import React, { useState } from 'react';
import { Sun, Cloud, CloudRain, Zap } from 'lucide-react';

export function MonthlyGenerationCard({ monthlyHistory, summary, config }) {
  const [selectedMonth, setSelectedMonth] = useState('Nov');

  const tariffRate = config.tariff_rate || 7.65;

  const months = [
    { name: 'Aug', kwh: 385, icon: CloudRain, weather: 'Monsoon' },
    { name: 'Sept', kwh: 412, icon: Cloud, weather: 'Partly Cloudy' },
    { name: 'Oct', kwh: 468, icon: Sun, weather: 'Clear Sun' },
    { name: 'Nov', kwh: 148, icon: Sun, weather: 'Sunny Autumn', active: true },
  ];

  const activeData = months.find(m => m.name === selectedMonth) || months[3];
  const activeSavings = Math.round(activeData.kwh * tariffRate);

  return (
    <div className="solary-card card-monthly-gen">
      {/* Header */}
      <div className="card-header-row">
        <div>
          <h3 className="card-heading">Monthly Generation</h3>
          <span className="card-sub-timestamp">Live APDCL Net-Metering</span>
        </div>
        <div className="badge-energy-rate">
          <Zap size={14} className="text-amber" />
          <span>{summary.month_kwh || 450} kWh</span>
        </div>
      </div>

      {/* Month Tiles Carousel */}
      <div className="month-tiles-grid">
        {months.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMonth === m.name;
          return (
            <div
              key={m.name}
              className={`month-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedMonth(m.name)}
            >
              <span className="month-name">{m.name}</span>
              <div className="month-icon-wrap">
                <Icon size={22} className={isSelected ? 'text-white' : 'text-muted'} />
              </div>
              <span className="month-kwh">{m.kwh} <small>kWh</small></span>
            </div>
          );
        })}
      </div>

      {/* Monthly Summary Statistics */}
      <div className="monthly-stats-breakdown">
        <div className="m-stat-row">
          <span className="m-label">Selected Month Yield:</span>
          <span className="m-val font-semibold">{activeData.kwh} kWh ({activeData.weather})</span>
        </div>
        <div className="m-stat-row">
          <span className="m-label">APDCL Offset Tier:</span>
          <span className="m-val text-emerald font-semibold">Slab 3 (&gt;240 Units @ ₹{tariffRate})</span>
        </div>
        <div className="m-stat-row">
          <span className="m-label">APDCL Electric Bill Saved:</span>
          <span className="m-val text-cyan font-bold" style={{ fontSize: '15px' }}>
            ₹ {activeSavings.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
