import React, { useState, useMemo } from 'react';
import { Sun, Zap } from 'lucide-react';

export function MonthlyGenerationCard({ monthlyHistory = [], summary = {}, config = {} }) {
  const tariffRate = Number(config?.tariff_rate) || 7.65;

  // Genuine monthly history records derived from database
  const months = useMemo(() => {
    if (Array.isArray(monthlyHistory) && monthlyHistory.length > 0) {
      return monthlyHistory.map(m => {
        const parts = String(m.month || '').split('-');
        let monthName = m.month;
        if (parts.length === 2) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
          monthName = d.toLocaleString('default', { month: 'short' });
        }
        const kwh = Number(m.monthly_kwh) || 0;
        const savings = Number(m.monthly_savings) || Math.round(kwh * tariffRate);
        return {
          name: monthName,
          monthKey: m.month,
          kwh,
          savings,
          days: m.days_recorded || 1
        };
      });
    }

    const curMonthName = new Date().toLocaleString('default', { month: 'short' });
    const curMonthKey = new Date().toISOString().slice(0, 7);
    const kwh = summary?.month_kwh !== null && summary?.month_kwh !== undefined ? Number(summary.month_kwh) : 0;
    const savings = summary?.month_earnings !== null && summary?.month_earnings !== undefined ? Number(summary.month_earnings) : Math.round(kwh * tariffRate);

    return [{
      name: curMonthName,
      monthKey: curMonthKey,
      kwh,
      savings,
      days: 1
    }];
  }, [monthlyHistory, summary, tariffRate]);

  const [selectedMonth, setSelectedMonth] = useState(months[0]?.name || 'Current');
  const activeData = months.find(m => m.name === selectedMonth) || months[0] || { kwh: 0, savings: 0, days: 0 };
  const currentMonthKwh = summary?.month_kwh !== null && summary?.month_kwh !== undefined ? summary.month_kwh : (months[0]?.kwh || 0);

  return (
    <div className="solary-card card-monthly-gen">
      {/* Header */}
      <div className="card-header-row">
        <div>
          <h3 className="card-heading">Monthly Generation</h3>
          <span className="card-sub-timestamp">Verified SQLite History</span>
        </div>
        <div className="badge-energy-rate">
          <Zap size={14} className="text-amber" />
          <span>{currentMonthKwh !== null ? `${currentMonthKwh} kWh` : '—'}</span>
        </div>
      </div>

      {/* Month Tiles Carousel */}
      <div className="month-tiles-grid">
        {months.map((m) => {
          const isSelected = selectedMonth === m.name;
          return (
            <div
              key={m.name}
              className={`month-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedMonth(m.name)}
            >
              <span className="month-name">{m.name}</span>
              <div className="month-icon-wrap">
                <Sun size={22} className={isSelected ? 'text-white' : 'text-muted'} />
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
          <span className="m-val font-semibold">{activeData.kwh} kWh ({activeData.days} days recorded)</span>
        </div>
        <div className="m-stat-row">
          <span className="m-label">Tariff Displacement Rate:</span>
          <span className="m-val text-emerald font-semibold">₹{tariffRate.toFixed(2)} / kWh</span>
        </div>
        <div className="m-stat-row">
          <span className="m-label">Calculated Solar Value:</span>
          <span className="m-val text-cyan font-bold" style={{ fontSize: '15px' }}>
            ₹ {activeData.savings.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
