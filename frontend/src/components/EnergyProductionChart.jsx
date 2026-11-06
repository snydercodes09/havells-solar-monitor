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

export function EnergyProductionChart({ todayCurve = [], dailyHistory = [], liveData = {}, config = {} }) {
  const [viewMode, setViewMode] = useState('today'); // 'today' | 'daily'

  const activePower = liveData?.active_power !== null && liveData?.active_power !== undefined
    ? Math.round(Number(liveData.active_power))
    : null;
  const hasCt = config?.has_ct_meter === true || config?.has_ct_meter === 'true' || liveData?.has_ct_meter === true;

  // Memoize categories and series data - only genuine measured values
  const { categories, producedData, consumedData } = useMemo(() => {
    let cats = [];
    let prod = [];
    let cons = [];

    if (viewMode === 'today') {
      cats = todayCurve.map(d => d.time_slot);
      prod = todayCurve.map(d => Number(d.avg_power) || 0);
      if (hasCt) {
        cons = todayCurve.map(d => Number(d.avg_load) || 0);
      }
    } else {
      const slice = dailyHistory.slice(-14);
      cats = slice.map(d => d.date.slice(5)); // MM-DD
      prod = slice.map(d => Math.round((Number(d.energy_kwh) || 0) * 10) / 10);
      if (hasCt) {
        cons = slice.map(d => Math.round((Number(d.consumed_kwh) || 0) * 10) / 10);
      }
    }

    return { categories: cats, producedData: prod, consumedData: cons };
  }, [viewMode, todayCurve, dailyHistory, hasCt]);

  // Memoize chart options so the object reference remains strictly stable
  const chartOptions = useMemo(() => ({
    theme: { mode: 'dark' },
    chart: {
      id: 'energy-production-area',
      type: 'area',
      height: 290,
      background: 'transparent',
      fontFamily: 'inherit',
      toolbar: { show: false },
      animations: {
        enabled: false, // Disabling redraw animation prevents layout shifts and scroll jumps!
        dynamicAnimation: { enabled: false }
      },
      redrawOnWindowResize: false,
      redrawOnParentResize: false
    },
    colors: ['#FF7A00', '#2563EB'], // Orange and Electric Blue
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
        style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 600 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#94a3b8', fontSize: '11px' },
        formatter: (val) => val ? (viewMode === 'today' ? `${Math.round(val)}W` : `${val}k`) : '0'
      }
    },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.12)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => val ? (viewMode === 'today' ? `${Math.round(val)} W` : `${val} kWh`) : '0'
      }
    },
    legend: {
      show: Boolean(hasCt && consumedData.length > 0),
      labels: { colors: '#cbd5e1' },
      itemMargin: { horizontal: 12, vertical: 4 }
    }
  }), [categories, viewMode, hasCt, consumedData.length]);

  const series = useMemo(() => {
    const list = [
      { name: viewMode === 'today' ? 'Solar Generation (W)' : 'Daily Solar Yield (kWh)', data: producedData }
    ];
    if (hasCt && consumedData.length > 0) {
      list.push({
        name: 'Household Consumption',
        data: consumedData
      });
    }
    return list;
  }, [producedData, consumedData, viewMode, hasCt]);

  const showConsumptionLegend = hasCt && consumedData.length > 0;

  return (
    <div className="solary-card card-energy-produced">
      {/* Header */}
      <div className="card-header-row">
        <div>
          <div className="flex-align gap-8">
            <h3 className="card-heading">Energy Production Curve</h3>
            <span className="badge-energy-rate" style={{ fontSize: '12px' }}>
              <Zap size={13} className="text-amber" />
              <span>{activePower !== null && activePower > 0 ? `${activePower} W Live` : 'Standby'}</span>
            </span>
          </div>
          <span className="card-sub-timestamp">
            {hasCt
              ? 'Real-time Solar Generation vs Household Load'
              : 'Real-time Inverter AC Output (Direct Wi-Fi / Modbus Telemetry)'}
          </span>
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

      {/* Custom Legend */}
      <div className="chart-custom-legend">
        <div className="legend-item">
          <span className="legend-line line-orange"></span>
          <span className="legend-text">
            {viewMode === 'today' ? 'Solar Inverter Generation' : 'Daily Solar Yield'}
          </span>
        </div>
        {showConsumptionLegend && (
          <div className="legend-item">
            <span className="legend-line line-blue"></span>
            <span className="legend-text">
              {isSim ? '[SIMULATION] Estimated Load' : 'Household Consumption'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
