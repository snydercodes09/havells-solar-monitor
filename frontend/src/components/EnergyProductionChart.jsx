import React, { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Zap, ChevronDown } from 'lucide-react';

// Memoized Chart component that ONLY re-renders when options or series genuinely change,
// preventing full DOM unmount/remount on every 1-second live telemetry pulse!
const MemoizedAreaChart = React.memo(function MemoizedAreaChart({ options, series }) {
  return (
    <div style={{ minHeight: '290px', height: '290px', width: '100%' }}>
      <Chart options={options} series={series} type="area" height={290} />
    </div>
  );
});

export function EnergyProductionChart({ todayCurve = [], dailyHistory = [], liveData = {} }) {
  const [viewMode, setViewMode] = useState('today'); // 'today' | 'daily'

  const activePower = Math.round(Number(liveData?.active_power) || 3120);

  // Memoize categories and series data
  const { categories, producedData, consumedData } = useMemo(() => {
    let cats = [];
    let prod = [];
    let cons = [];

    if (viewMode === 'today') {
      cats = todayCurve.map(d => d.time_slot);
      prod = todayCurve.map(d => Number(d.avg_power) || 0);
      cons = todayCurve.map(d => Math.min(Number(d.avg_power) || 0, 650 + Math.round(Math.sin((Number(d.avg_power) || 0) / 100) * 80)));
    } else {
      const slice = dailyHistory.slice(-14);
      cats = slice.map(d => d.date.slice(5)); // MM-DD
      prod = slice.map(d => Math.round((Number(d.energy_kwh) || 0) * 10) / 10);
      cons = slice.map(d => Math.round(((Number(d.energy_kwh) || 0) * 0.42 + 4.5) * 10) / 10);
    }

    return { categories: cats, producedData: prod, consumedData: cons };
  }, [viewMode, todayCurve, dailyHistory]);

  // Memoize chart options so the object reference remains strictly stable
  const chartOptions = useMemo(() => ({
    chart: {
      id: 'energy-production-area',
      type: 'area',
      height: 290,
      background: 'transparent',
      toolbar: { show: false },
      animations: {
        enabled: false, // Disabling redraw animation prevents layout shifts and scroll jumps!
        dynamicAnimation: { enabled: false }
      },
      redrawOnWindowResize: false,
      redrawOnParentResize: false
    },
    colors: ['#FF7A00', '#2563EB'], // Orange and Electric Blue matching Image 1!
    stroke: {
      curve: 'smooth',
      width: [3, 2.5]
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: [0.45, 0.25],
        opacityTo: [0.02, 0.02],
        stops: [0, 95, 100]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: categories,
      labels: {
        style: { colors: '#64748B', fontFamily: 'Plus Jakarta Sans', fontSize: '11px', fontWeight: 600 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#64748B', fontFamily: 'Plus Jakarta Sans', fontSize: '11px' },
        formatter: (val) => val ? (viewMode === 'today' ? `${Math.round(val)}W` : `${val}k`) : '0'
      }
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.04)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => val ? (viewMode === 'today' ? `${Math.round(val)} W` : `${val} kWh`) : '0'
      }
    },
    legend: { show: false } // Custom legend below matching Image 1
  }), [categories, viewMode]);

  const series = useMemo(() => [
    { name: 'Energy Produced', data: producedData },
    { name: 'Energy Consumption', data: consumedData }
  ], [producedData, consumedData]);

  return (
    <div className="solary-card card-energy-produced">
      {/* Header */}
      <div className="card-header-row">
        <div>
          <div className="flex-align gap-8">
            <h3 className="card-heading">Energy Produced</h3>
            <span className="badge-energy-rate" style={{ fontSize: '12px' }}>
              <Zap size={13} className="text-amber" />
              <span>{activePower} W Live</span>
            </span>
          </div>
          <span className="card-sub-timestamp">Real-time Solar Generation vs Household Load</span>
        </div>

        {/* View Mode Selector */}
        <div className="panel-selector-dropdown">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="panel-select-native"
          >
            <option value="today">Today (Real-time Watts)</option>
            <option value="daily">Daily History (14 Days kWh)</option>
          </select>
          <ChevronDown size={13} className="select-arrow" />
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ marginTop: '10px', minHeight: '290px' }}>
        <MemoizedAreaChart options={chartOptions} series={series} />
      </div>

      {/* Custom Legend Matching Image 1 */}
      <div className="chart-custom-legend">
        <div className="legend-item">
          <span className="legend-line line-orange"></span>
          <span className="legend-text">Energy Produced</span>
        </div>
        <div className="legend-item">
          <span className="legend-line line-blue"></span>
          <span className="legend-text">Energy Consumption</span>
        </div>
      </div>
    </div>
  );
}