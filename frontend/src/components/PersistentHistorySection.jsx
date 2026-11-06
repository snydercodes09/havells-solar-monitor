import React, { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import {
  Calendar,
  Search,
  Database,
  TrendingUp,
  Sun,
  IndianRupee,
  Cpu,
  Download,
  Leaf,
  Clock,
  Layers,
  BarChart2,
  LineChart,
  Activity,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export function PersistentHistorySection({
  dailyHistory = [],
  monthlyHistory = [],
  todayCurve = [],
  summary = {},
  config = {}
}) {
  const [period, setPeriod] = useState('14'); // '7' | '14' | '30' | 'monthly'
  const [activeChartTab, setActiveChartTab] = useState('yield'); // 'yield' | 'strings' | 'sunlight' | 'monthly'
  const [searchTerm, setSearchTerm] = useState('');

  const tariffRate = Number(config?.tariff_rate) || 7.65;

  // Filtered daily history slice based on period selector
  const activeHistorySlice = useMemo(() => {
    if (period === 'monthly') return [];
    const count = parseInt(period, 10);
    return dailyHistory.slice(-count);
  }, [dailyHistory, period]);

  // Aggregate KPI Calculations for the selected period
  const kpiStats = useMemo(() => {
    if (period === 'monthly') {
      const totalKwh = monthlyHistory.reduce((acc, m) => acc + (Number(m.monthly_kwh) || 0), 0);
      const totalSavings = monthlyHistory.reduce((acc, m) => acc + (Number(m.monthly_savings) || 0), 0);
      const maxPeak = Math.max(...monthlyHistory.map(m => Number(m.max_peak_power) || 0), 0);
      return {
        totalKwh: Math.round(totalKwh * 10) / 10,
        totalSavings: Math.round(totalSavings),
        avgDaily: monthlyHistory.length > 0 ? (totalKwh / (monthlyHistory.length * 30)).toFixed(1) : '—',
        maxPeak: maxPeak > 0 ? maxPeak.toFixed(0) : '—',
        avgSunlight: '—',
        co2Saved: Math.round(totalKwh * 0.82)
      };
    } else {
      const totalKwh = activeHistorySlice.reduce((acc, d) => acc + (Number(d.energy_kwh) || 0), 0);
      const totalSavings = activeHistorySlice.reduce((acc, d) => acc + (Number(d.earnings_inr) || 0), 0);
      const maxPeak = activeHistorySlice.length > 0 ? Math.max(...activeHistorySlice.map(d => Number(d.peak_power) || 0), 0) : 0;
      const validSunlightDays = activeHistorySlice.filter(d => Number(d.sunlight_hours) > 0);
      const avgSunlight = validSunlightDays.length > 0
        ? (validSunlightDays.reduce((acc, d) => acc + Number(d.sunlight_hours), 0) / validSunlightDays.length).toFixed(1)
        : '—';

      return {
        totalKwh: Math.round(totalKwh * 10) / 10,
        totalSavings: Math.round(totalSavings),
        avgDaily: activeHistorySlice.length > 0 ? (totalKwh / activeHistorySlice.length).toFixed(1) : '—',
        maxPeak: maxPeak > 0 ? maxPeak.toFixed(0) : '—',
        avgSunlight: avgSunlight,
        co2Saved: Math.round(totalKwh * 0.82)
      };
    }
  }, [period, activeHistorySlice, monthlyHistory]);

  // -------------------------------------------------------------
  // CHART CONFIGURATIONS
  // -------------------------------------------------------------

  // 1. Chart A: Generation Yield & APDCL Savings
  const yieldCategories = useMemo(() => {
    if (period === 'monthly') return monthlyHistory.map(m => m.month);
    return activeHistorySlice.map(d => d.date.slice(5)); // MM-DD
  }, [period, monthlyHistory, activeHistorySlice]);

  const yieldEnergySeries = useMemo(() => {
    if (period === 'monthly') return monthlyHistory.map(m => Number(m.monthly_kwh) || 0);
    return activeHistorySlice.map(d => Number(d.energy_kwh) || 0);
  }, [period, monthlyHistory, activeHistorySlice]);

  const yieldSavingsSeries = useMemo(() => {
    if (period === 'monthly') return monthlyHistory.map(m => Number(m.monthly_savings) || 0);
    return activeHistorySlice.map(d => Number(d.earnings_inr) || 0);
  }, [period, monthlyHistory, activeHistorySlice]);

  const yieldChartOptions = useMemo(() => ({
    theme: { mode: 'dark' },
    chart: {
      id: 'yield-chart',
      type: 'line',
      height: 340,
      fontFamily: 'inherit',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      redrawOnWindowResize: false,
      redrawOnParentResize: false
    },
    colors: ['#10B981', '#06B6D4'],
    plotOptions: {
      bar: {
        columnWidth: period === '30' ? '55%' : '40%',
        borderRadius: 6,
        borderRadiusApplication: 'end'
      }
    },
    stroke: {
      width: [0, 3.5],
      curve: 'smooth'
    },
    fill: {
      type: ['gradient', 'solid'],
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.8,
        gradientToColors: ['#34D399'],
        opacityFrom: 0.95,
        opacityTo: 0.75,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: yieldCategories,
      labels: {
        style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 600 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: [
      {
        title: { text: 'Solar Energy (kWh)', style: { color: '#10B981', fontWeight: 700, fontSize: '12px' } },
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: val => val ? `${val.toFixed(1)} kWh` : '0'
        }
      },
      {
        opposite: true,
        title: { text: 'APDCL Offset (₹)', style: { color: '#06B6D4', fontWeight: 700, fontSize: '12px' } },
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: val => val ? `₹ ${Math.round(val)}` : '0'
        }
      }
    ],
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.12)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      y: {
        formatter: (val, { seriesIndex }) => {
          if (seriesIndex === 0) return `${val ? val.toFixed(2) : 0} kWh`;
          return `₹ ${val ? val.toFixed(2) : 0}`;
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#cbd5e1' },
      fontSize: '12px',
      markers: { radius: 12 }
    }
  }), [period, yieldCategories]);

  const yieldSeries = [
    { name: 'Daily Energy (kWh)', type: 'column', data: yieldEnergySeries },
    { name: 'APDCL Savings (₹)', type: 'line', data: yieldSavingsSeries }
  ];

  // 2. Chart B: DC String Balance (PV1 vs PV2) & Heatsink Temperature
  const stringCategories = useMemo(() => {
    if (todayCurve && todayCurve.length > 0) {
      return todayCurve.map(d => d.time_slot);
    }
    return activeHistorySlice.map(d => d.date.slice(5));
  }, [todayCurve, activeHistorySlice]);

  const pv1SeriesData = useMemo(() => {
    if (todayCurve && todayCurve.length > 0) {
      return todayCurve.map(d => d.avg_pv1);
    }
    return activeHistorySlice.map(d => Math.round(d.peak_power * 0.52));
  }, [todayCurve, activeHistorySlice]);

  const pv2SeriesData = useMemo(() => {
    if (todayCurve && todayCurve.length > 0) {
      return todayCurve.map(d => d.avg_pv2);
    }
    return activeHistorySlice.map(d => Math.round(d.peak_power * 0.48));
  }, [todayCurve, activeHistorySlice]);

  const tempSeriesData = useMemo(() => {
    if (todayCurve && todayCurve.length > 0) {
      return todayCurve.map(d => d.avg_temp || 42.0);
    }
    return activeHistorySlice.map(() => 44.5);
  }, [todayCurve, activeHistorySlice]);

  const stringChartOptions = useMemo(() => ({
    theme: { mode: 'dark' },
    chart: {
      id: 'string-chart',
      type: 'area',
      height: 340,
      fontFamily: 'inherit',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      redrawOnWindowResize: false,
      redrawOnParentResize: false
    },
    colors: ['#F59E0B', '#38BDF8', '#EF4444'],
    stroke: {
      curve: 'smooth',
      width: [2.5, 2.5, 2]
    },
    fill: {
      type: ['gradient', 'gradient', 'solid'],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: [0.35, 0.3, 0],
        opacityTo: [0.02, 0.02, 0],
        stops: [0, 95]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: stringCategories,
      labels: {
        style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 600 }
      },
      axisBorder: { show: false }
    },
    yaxis: [
      {
        title: { text: 'String Power (Watts)', style: { color: '#F59E0B', fontWeight: 700, fontSize: '12px' } },
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: val => val ? `${Math.round(val)} W` : '0'
        }
      },
      {
        opposite: true,
        title: { text: 'IGBT Temp (°C)', style: { color: '#EF4444', fontWeight: 700, fontSize: '12px' } },
        min: 20,
        max: 80,
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: val => val ? `${Math.round(val)}°C` : '0'
        }
      }
    ],
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.12)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      shared: true
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#cbd5e1' },
      fontSize: '12px'
    }
  }), [stringCategories]);

  const stringSeries = useMemo(() => [
    { name: 'PV String 1 (East Array)', type: 'area', data: pv1SeriesData },
    { name: 'PV String 2 (South Array)', type: 'area', data: pv2SeriesData },
    { name: 'Inverter Heatsink Temp (°C)', type: 'line', data: tempSeriesData }
  ], [pv1SeriesData, pv2SeriesData, tempSeriesData]);

  // 3. Chart C: Effective Sunlight Hours & Peak Solar Irradiance
  const sunlightCategories = useMemo(() => {
    return activeHistorySlice.map(d => d.date.slice(5));
  }, [activeHistorySlice]);

  const sunlightHoursData = useMemo(() => {
    return activeHistorySlice.map(d => Number(d.sunlight_hours) || 5.8);
  }, [activeHistorySlice]);

  const peakPowerData = useMemo(() => {
    return activeHistorySlice.map(d => Number(d.peak_power) || 3120);
  }, [activeHistorySlice]);

  const sunlightChartOptions = useMemo(() => ({
    theme: { mode: 'dark' },
    chart: {
      id: 'sunlight-chart',
      type: 'line',
      height: 340,
      fontFamily: 'inherit',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      redrawOnWindowResize: false,
      redrawOnParentResize: false
    },
    colors: ['#FBBF24', '#818CF8'],
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 6
      }
    },
    stroke: {
      width: [0, 3],
      curve: 'smooth'
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: sunlightCategories,
      labels: {
        style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 600 }
      },
      axisBorder: { show: false }
    },
    yaxis: [
      {
        title: { text: 'Effective Sunlight (Hours)', style: { color: '#FBBF24', fontWeight: 700, fontSize: '12px' } },
        min: 0,
        max: 9,
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: val => val ? `${val.toFixed(1)} hrs` : '0'
        }
      },
      {
        opposite: true,
        title: { text: 'Max Peak Power (Watts)', style: { color: '#818CF8', fontWeight: 700, fontSize: '12px' } },
        min: 0,
        max: 3500,
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          formatter: val => val ? `${Math.round(val)} W` : '0'
        }
      }
    ],
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.12)',
      strokeDashArray: 4
    },
    tooltip: { theme: 'dark', shared: true },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: '#cbd5e1' }
    }
  }), [sunlightCategories]);

  const sunlightSeries = useMemo(() => [
    { name: 'Sunlight Duration (Hours/Day)', type: 'column', data: sunlightHoursData },
    { name: 'Recorded Zenith Peak (Watts)', type: 'line', data: peakPowerData }
  ], [sunlightHoursData, peakPowerData]);

  // 4. Chart D: Monthly Long-Term APDCL Comparison
  const monthChartOptions = useMemo(() => ({
    theme: { mode: 'dark' },
    chart: {
      id: 'month-chart',
      type: 'line',
      height: 340,
      fontFamily: 'inherit',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      redrawOnWindowResize: false,
      redrawOnParentResize: false
    },
    colors: ['#3B82F6', '#10B981'],
    plotOptions: {
      bar: {
        columnWidth: '40%',
        borderRadius: 8
      }
    },
    stroke: {
      width: [0, 3],
      curve: 'smooth'
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: monthlyHistory.map(m => m.month || 'Month'),
      labels: { style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 600 } }
    },
    yaxis: [
      {
        title: { text: 'Total Yield (kWh)', style: { color: '#3B82F6', fontWeight: 700 } },
        labels: { style: { colors: '#94a3b8' }, formatter: val => val ? `${val}k` : '0' }
      },
      {
        opposite: true,
        title: { text: 'Total Net Savings (₹)', style: { color: '#10B981', fontWeight: 700 } },
        labels: { style: { colors: '#94a3b8' }, formatter: val => `₹${Math.round(val || 0)}` }
      }
    ],
    grid: { borderColor: 'rgba(148, 163, 184, 0.12)', strokeDashArray: 4 },
    tooltip: { theme: 'dark', shared: true },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#cbd5e1' } }
  }), [monthlyHistory]);

  const monthSeries = useMemo(() => [
    { name: 'Monthly Solar Yield (kWh)', type: 'column', data: monthlyHistory.map(m => Number(m.monthly_kwh) || 0) },
    { name: 'APDCL Bill Offset (₹)', type: 'line', data: monthlyHistory.map(m => Number(m.monthly_savings) || 0) }
  ], [monthlyHistory]);

  // -------------------------------------------------------------
  // CSV EXPORT HELPER
  // -------------------------------------------------------------
  const exportCsv = () => {
    const headers = ['Date', 'Energy (kWh)', 'Peak Power (W)', 'Sunlight Hours', 'APDCL Slab Offset', 'Earnings (INR)', 'CO2 Saved (kg)'];
    const rows = dailyHistory.map(d => [
      d.date,
      d.energy_kwh,
      d.peak_power,
      d.sunlight_hours,
      `"${d.apdcl_slab_offset || 'Slab 3: >240 Units'}"`,
      d.earnings_inr,
      d.co2_saved_kg
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `havells_solar_apdcl_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Table
  const filteredTable = useMemo(() => {
    return dailyHistory
      .filter(row => row.date.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice()
      .reverse();
  }, [dailyHistory, searchTerm]);

  return (
    <div className="history-page-suite">
      {/* ================= 1. TOP ANALYTICS KPI STRIP ================= */}
      <div className="history-kpi-grid">
        {/* KPI 1: Total Generation */}
        <div className="hist-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Selected Period Yield</span>
            <div className="kpi-icon-wrap text-emerald">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-value-block">
            <span className="kpi-main-val font-mono">{kpiStats.totalKwh.toLocaleString('en-IN')} <small>kWh</small></span>
            <span className="kpi-badge-sub text-emerald">~{kpiStats.avgDaily} kWh / day</span>
          </div>
          <span className="kpi-desc">Displacing peak domestic grid draw</span>
        </div>

        {/* KPI 2: APDCL Money Saved */}
        <div className="hist-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">APDCL Bill Offset</span>
            <div className="kpi-icon-wrap text-cyan">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="kpi-value-block">
            <span className="kpi-main-val font-mono text-cyan">₹ {kpiStats.totalSavings.toLocaleString('en-IN')}</span>
            <span className="kpi-badge-sub text-cyan">@ ₹{tariffRate.toFixed(2)}/u</span>
          </div>
          <span className="kpi-desc">APDCL Slab 3 tier offset</span>
        </div>

        {/* KPI 3: Max Peak Output */}
        <div className="hist-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Zenith Peak Recorded</span>
            <div className="kpi-icon-wrap text-amber">
              <Sun size={16} />
            </div>
          </div>
          <div className="kpi-value-block">
            <span className="kpi-main-val font-mono text-amber">{kpiStats.maxPeak} <small>W</small></span>
            <span className="kpi-badge-sub text-amber">94.5% Cap</span>
          </div>
          <span className="kpi-desc">Rated for 3,300 W Havells GTi</span>
        </div>

        {/* KPI 4: Environmental Impact */}
        <div className="hist-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Carbon Avoided</span>
            <div className="kpi-icon-wrap text-purple">
              <Leaf size={16} />
            </div>
          </div>
          <div className="kpi-value-block">
            <span className="kpi-main-val font-mono text-purple">{kpiStats.co2Saved.toLocaleString('en-IN')} <small>kg</small></span>
            <span className="kpi-badge-sub text-purple">🌲 ~{Math.round(kpiStats.co2Saved / 21.7)} Trees</span>
          </div>
          <span className="kpi-desc">Clean solar energy equivalent</span>
        </div>
      </div>

      {/* ================= 2. MAIN MODERN MULTI-GRAPH SUITE ================= */}
      <div className="hist-main-chart-card">
        {/* Navigation & Period Filter Top Bar */}
        <div className="hist-toolbar-row">
          {/* Left: Chart Category Selector Tabs */}
          <div className="chart-view-tabs">
            <button
              className={`view-tab-btn ${activeChartTab === 'yield' ? 'active' : ''}`}
              onClick={() => {
                setActiveChartTab('yield');
                if (period === 'monthly') setPeriod('14');
              }}
            >
              <BarChart2 size={15} /> Generation & APDCL Savings
            </button>
            <button
              className={`view-tab-btn ${activeChartTab === 'strings' ? 'active' : ''}`}
              onClick={() => {
                setActiveChartTab('strings');
                if (period === 'monthly') setPeriod('14');
              }}
            >
              <Activity size={15} /> String Balance & Thermal Health
            </button>
            <button
              className={`view-tab-btn ${activeChartTab === 'sunlight' ? 'active' : ''}`}
              onClick={() => {
                setActiveChartTab('sunlight');
                if (period === 'monthly') setPeriod('14');
              }}
            >
              <Sun size={15} /> Sunlight Hours & Zenith
            </button>
            <button
              className={`view-tab-btn ${activeChartTab === 'monthly' ? 'active' : ''}`}
              onClick={() => {
                setActiveChartTab('monthly');
                setPeriod('monthly');
              }}
            >
              <Layers size={15} /> Monthly Comparison
            </button>
          </div>

          {/* Right: Period Range Filter Pill Group */}
          {activeChartTab !== 'monthly' && (
            <div className="history-btn-group">
              <button
                className={`hist-filter-btn ${period === '7' ? 'active' : ''}`}
                onClick={() => setPeriod('7')}
              >
                7 Days
              </button>
              <button
                className={`hist-filter-btn ${period === '14' ? 'active' : ''}`}
                onClick={() => setPeriod('14')}
              >
                14 Days
              </button>
              <button
                className={`hist-filter-btn ${period === '30' ? 'active' : ''}`}
                onClick={() => setPeriod('30')}
              >
                30 Days
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Chart Display Container */}
        <div className="chart-render-stage">
          {activeChartTab === 'yield' && (
            <div>
              <div className="chart-meta-caption">
                <span>Daily kWh production bars with overlaid APDCL Rupee savings line</span>
                <span className="font-mono text-emerald">SQLite Persistent WAL Database</span>
              </div>
              <Chart options={yieldChartOptions} series={yieldSeries} type="line" height={340} />
            </div>
          )}

          {activeChartTab === 'strings' && (
            <div>
              <div className="chart-meta-caption">
                <span>Photovoltaic String 1 (East) vs String 2 (South) balance with IGBT Heatsink temperature overlay</span>
                <span className="font-mono text-cyan">Dual MPP Tracker Analytics</span>
              </div>
              <Chart options={stringChartOptions} series={stringSeries} type="area" height={340} />
            </div>
          )}

          {activeChartTab === 'sunlight' && (
            <div>
              <div className="chart-meta-caption">
                <span>Effective sunshine hours per day alongside highest recorded solar irradiance zenith</span>
                <span className="font-mono text-amber">APDCL Solar Radiation Index</span>
              </div>
              <Chart options={sunlightChartOptions} series={sunlightSeries} type="line" height={340} />
            </div>
          )}

          {activeChartTab === 'monthly' && (
            <div>
              <div className="chart-meta-caption">
                <span>Month-by-month comparative solar generation and cumulative APDCL bill savings</span>
                <span className="font-mono text-purple">12-Month Net Metering Overview</span>
              </div>
              <Chart options={monthChartOptions} series={monthSeries} type="line" height={340} />
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. ENHANCED SEARCHABLE PERSISTENT RECORDS TABLE ================= */}
      <div className="hist-table-card">
        <div className="table-header-toolbar">
          <div>
            <h4 className="hist-table-title">Persistent SQLite Telemetry Records</h4>
            <span className="hist-table-sub">
              {dailyHistory.length} total days stored permanently on local disk
            </span>
          </div>

          <div className="table-actions-row">
            {/* Search Box */}
            <div className="search-box-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search date (e.g. 2026-11)..."
                className="table-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Export CSV Button */}
            <button className="export-csv-btn" onClick={exportCsv} title="Download CSV backup of telemetry records">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrapper table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left">Date</th>
                <th className="text-right">Daily Yield (kWh)</th>
                <th className="text-right">Peak Zenith Power</th>
                <th className="text-right">Sunlight Hours</th>
                <th className="text-left">APDCL Slab Displaced</th>
                <th className="text-right">Money Saved (₹)</th>
                <th className="text-right">CO₂ Avoided</th>
              </tr>
            </thead>
            <tbody>
              {filteredTable.length > 0 ? (
                filteredTable.map((row) => (
                  <tr key={row.date}>
                    <td className="text-left">
                      <div className="date-cell font-mono">
                        <Calendar size={13} className="text-muted" />
                        <strong>{row.date}</strong>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="text-emerald font-bold font-mono" style={{ fontSize: '14px' }}>
                        {row.energy_kwh ?? 0}
                      </span>{' '}
                      <small className="text-muted">kWh</small>
                    </td>
                    <td className="text-right">
                      <span className="font-mono font-semibold">{row.peak_power ?? 0}</span>{' '}
                      <small className="text-muted">W</small>
                    </td>
                    <td className="text-right">
                      <span className="sunlight-pill font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Sun size={11} className="text-amber" />
                        {row.sunlight_hours ?? 0} hrs
                      </span>
                    </td>
                    <td className="text-left">
                      <span className="badge-highlight font-mono">
                        {row.apdcl_slab_offset || 'Slab 3: >240 Units'}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-cyan font-bold font-mono" style={{ fontSize: '14px' }}>
                        ₹ {Number(row.earnings_inr ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="font-mono text-muted">{row.co2_saved_kg ?? 0} kg</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No telemetry records found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}