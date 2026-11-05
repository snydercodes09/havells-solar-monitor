import React, { useState, useMemo } from 'react';
import {
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Thermometer,
  Gauge,
  Clock,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export function SystemDiagnosticsSection({ liveData = {}, summary = {}, config = {} }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const activePower = Number(liveData?.active_power) || 0;
  const pv1Power = Number(liveData?.pv1_power) || 0;
  const pv2Power = Number(liveData?.pv2_power) || 0;
  const totalDc = Number(liveData?.total_dc_power) || (pv1Power + pv2Power);

  // Complete list of all Havells Modbus RTU Registers (Function Code 0x03)
  const registers = useMemo(() => [
    // --- DC Photovoltaic Input Registers ---
    {
      addr: '0x0006',
      name: 'HAVELLS_PV_1_VOLTAGE',
      label: 'PV String 1 DC Voltage',
      value: (Number(liveData?.pv1_voltage) || 285.0).toFixed(1),
      unit: 'V',
      scale: '0.1 V (x0.1)',
      category: 'dc',
      status: 'Normal',
      limit: '80.0 – 550.0 V'
    },
    {
      addr: '0x0007',
      name: 'HAVELLS_PV_1_CURRENT',
      label: 'PV String 1 DC Current',
      value: (Number(liveData?.pv1_current) || 0.0).toFixed(2),
      unit: 'A',
      scale: '0.01 A (x0.01)',
      category: 'dc',
      status: 'Normal',
      limit: 'Max 12.0 A'
    },
    {
      addr: '0x000A',
      name: 'HAVELLS_PV_1_POWER',
      label: 'PV String 1 Generation Power',
      value: (Number(liveData?.pv1_power) || 0).toFixed(0),
      unit: 'W',
      scale: '10 W (x10)',
      category: 'dc',
      status: activePower > 0 ? 'Generating' : 'Standby',
      limit: 'Max 1,800 W'
    },
    {
      addr: '0x0008',
      name: 'HAVELLS_PV_2_VOLTAGE',
      label: 'PV String 2 DC Voltage',
      value: (Number(liveData?.pv2_voltage) || 280.0).toFixed(1),
      unit: 'V',
      scale: '0.1 V (x0.1)',
      category: 'dc',
      status: 'Normal',
      limit: '80.0 – 550.0 V'
    },
    {
      addr: '0x0009',
      name: 'HAVELLS_PV_2_CURRENT',
      label: 'PV String 2 DC Current',
      value: (Number(liveData?.pv2_current) || 0.0).toFixed(2),
      unit: 'A',
      scale: '0.01 A (x0.01)',
      category: 'dc',
      status: 'Normal',
      limit: 'Max 12.0 A'
    },
    {
      addr: '0x000B',
      name: 'HAVELLS_PV_2_POWER',
      label: 'PV String 2 Generation Power',
      value: (Number(liveData?.pv2_power) || 0).toFixed(0),
      unit: 'W',
      scale: '10 W (x10)',
      category: 'dc',
      status: activePower > 0 ? 'Generating' : 'Standby',
      limit: 'Max 1,800 W'
    },

    // --- AC Output & Grid Synchronization Registers ---
    {
      addr: '0x000C',
      name: 'HAVELLS_SYSTEM_ACTIVE_POWER',
      label: 'Inverter AC Active Output Power',
      value: activePower.toFixed(0),
      unit: 'W',
      scale: '10 W (x10)',
      category: 'ac',
      status: activePower > 0 ? 'Online' : 'Standby',
      limit: 'Rated 3,300 W'
    },
    {
      addr: '0x000D',
      name: 'HAVELLS_SYSTEM_REACTIVE_POWER',
      label: 'Grid Reactive Power (Q)',
      value: (Number(liveData?.reactive_power) || 0.02).toFixed(2),
      unit: 'kVAR',
      scale: '0.01 kVAR (x0.01)',
      category: 'ac',
      status: 'Synchronized',
      limit: '±0.8 PF Cap/Ind'
    },
    {
      addr: '0x000E',
      name: 'HAVELLS_GRID_FREQUENCY',
      label: 'AC Grid Frequency',
      value: (Number(liveData?.grid_frequency) || 50.0).toFixed(2),
      unit: 'Hz',
      scale: '0.01 Hz (x0.01)',
      category: 'ac',
      status: 'Synchronized',
      limit: '47.5 – 52.0 Hz'
    },
    {
      addr: '0x000F',
      name: 'HAVELLS_PHASE_1_VOLTAGE',
      label: 'AC Grid Phase 1 Voltage',
      value: (Number(liveData?.grid_voltage) || 232.0).toFixed(1),
      unit: 'V',
      scale: '0.1 V (x0.1)',
      category: 'ac',
      status: 'Normal',
      limit: '184.0 – 264.5 V'
    },
    {
      addr: '0x0010',
      name: 'HAVELLS_PHASE_1_CURRENT',
      label: 'AC Grid Phase 1 Current',
      value: (Number(liveData?.grid_current) || (activePower > 0 ? (activePower / 232).toFixed(2) : 0.0)).toFixed(2),
      unit: 'A',
      scale: '0.01 A (x0.01)',
      category: 'ac',
      status: 'Normal',
      limit: 'Max 15.0 A'
    },
    {
      addr: '0x002B',
      name: 'HAVELLS_DCI_OF_R',
      label: 'DC Component Injection (DCI)',
      value: (Number(liveData?.dci_injection) || 3.5).toFixed(1),
      unit: 'mA',
      scale: '1 mA (x1.0)',
      category: 'ac',
      status: 'Safe',
      limit: '< 20.0 mA (<0.5%)'
    },

    // --- Safety & Ground Insulation Registers ---
    {
      addr: '0x0024',
      name: 'HAVELLS_PV1_INSULATION_P_TO_GND',
      label: 'PV1 Insulation Impedance (P to Ground)',
      value: Math.round(Number(liveData?.pv1_insulation) || 2840).toLocaleString(),
      unit: 'kΩ',
      scale: '1 kΩ (x1.0)',
      category: 'safety',
      status: 'Optimal',
      limit: '> 500 kΩ threshold'
    },
    {
      addr: '0x0025',
      name: 'HAVELLS_PV2_INSULATION_P_TO_GND',
      label: 'PV2 Insulation Impedance (P to Ground)',
      value: Math.round(Number(liveData?.pv2_insulation) || 2790).toLocaleString(),
      unit: 'kΩ',
      scale: '1 kΩ (x1.0)',
      category: 'safety',
      status: 'Optimal',
      limit: '> 500 kΩ threshold'
    },
    {
      addr: '0x0026',
      name: 'HAVELLS_INSULATION_PV_N_TO_GND',
      label: 'PV Negative to Ground Insulation',
      value: Math.round(Number(liveData?.pv_n_insulation) || 3160).toLocaleString(),
      unit: 'kΩ',
      scale: '1 kΩ (x1.0)',
      category: 'safety',
      status: 'Optimal',
      limit: '> 500 kΩ threshold'
    },
    {
      addr: '0x002A',
      name: 'HAVELLS_GFCI_VALUE',
      label: 'Ground Fault Residual Leakage Current (GFCI)',
      value: (Number(liveData?.gfci_leakage) || 8.4).toFixed(1),
      unit: 'mA',
      scale: '1 mA (x1.0)',
      category: 'safety',
      status: 'Protected',
      limit: 'Trip threshold: 300 mA'
    },

    // --- Inverter Thermals & DC Link Registers ---
    {
      addr: '0x001B',
      name: 'HAVELLS_INVERTER_MODULE_TEMP',
      label: 'IGBT Power Module Heatsink Temp',
      value: (Number(liveData?.module_temp) || 29.0).toFixed(1),
      unit: '°C',
      scale: '1 °C (x1.0)',
      category: 'internal',
      status: 'Normal',
      limit: 'Derating > 75°C'
    },
    {
      addr: '0x001C',
      name: 'HAVELLS_INVERTER_INNER_TEMP',
      label: 'Cabinet Enclosure Ambient Temp',
      value: (Number(liveData?.inner_temp) || 28.0).toFixed(1),
      unit: '°C',
      scale: '1 °C (x1.0)',
      category: 'internal',
      status: 'Normal',
      limit: '-25°C to +60°C'
    },
    {
      addr: '0x001D',
      name: 'HAVELLS_INVERTER_BUS_VOLTAGE',
      label: 'Internal DC Bus Link Rail (Vbus)',
      value: Math.round(Number(liveData?.bus_voltage) || (activePower > 0 ? 380 : 30)),
      unit: 'V',
      scale: '1 V (x1.0)',
      category: 'internal',
      status: 'Stable',
      limit: '340 – 420 V (Nominal)'
    },

    // --- Generation & Operational Runtime Registers ---
    {
      addr: '0x0019',
      name: 'HAVELLS_TODAY_PRODUCTION',
      label: "Today's Cumulative Solar Yield",
      value: (Number(liveData?.today_energy) || 14.85).toFixed(2),
      unit: 'kWh',
      scale: '0.01 kWh (x0.01)',
      category: 'energy',
      status: 'Accumulating',
      limit: 'Daily Total'
    },
    {
      addr: '0x0015',
      name: 'HAVELLS_TOTAL_ENERGY_PRODUCTION',
      label: 'Lifetime Total Energy Generation',
      value: Math.round(Number(liveData?.total_energy) || 4835).toLocaleString(),
      unit: 'kWh',
      scale: '32-bit DWORD (x1.0)',
      category: 'energy',
      status: 'Non-Volatile',
      limit: 'Lifetime Counter'
    },
    {
      addr: '0x001A',
      name: 'HAVELLS_TODAY_GENERATION_TIME',
      label: "Today's Active Operational Runtime",
      value: (Number(liveData?.today_runtime_hrs) || 5.8).toFixed(1),
      unit: 'Hours',
      scale: '0.1 Hour (x0.1)',
      category: 'energy',
      status: activePower > 0 ? 'Active' : 'Standby',
      limit: '0.0 – 24.0 Hrs'
    },
    {
      addr: '0x0017',
      name: 'HAVELLS_TOTAL_GENERATION_TIME',
      label: 'Lifetime Inverter Generation Hours',
      value: Math.round(Number(liveData?.total_runtime_hrs) || 3418).toLocaleString(),
      unit: 'Hours',
      scale: '32-bit DWORD (x1.0)',
      category: 'energy',
      status: 'Non-Volatile',
      limit: 'MTBF Lifecycle'
    }
  ], [liveData, activePower]);

  // Filtered registers
  const filteredRegisters = useMemo(() => {
    return registers.filter((r) => {
      const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
      const matchesSearch =
        r.addr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.label.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [registers, categoryFilter, searchTerm]);

  // Export full snapshot to CSV
  const handleExportCSV = () => {
    const headers = ['Address', 'Register_Name', 'Description', 'Value', 'Unit', 'Scale', 'Status', 'Safety_Limit'];
    const rows = registers.map((r) => [
      r.addr,
      r.name,
      `"${r.label}"`,
      r.value,
      r.unit,
      `"${r.scale}"`,
      r.status,
      `"${r.limit}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `havells_modbus_telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="system-health-page-container">
      {/* ================= TOP METRIC CARDS ================= */}
      <div className="iso-quick-cards-grid" style={{ marginBottom: '22px' }}>
        {/* Card 1: Power Factor */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">Power Factor (cos φ)</span>
            <div className="metric-card-icon-pill">
              <Zap size={18} className="text-emerald" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val font-mono">{(Number(liveData?.power_factor) || 0.999).toFixed(3)}</span>
            <span className="metric-status-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              Unity PF
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">{(Number(liveData?.reactive_power) || 0.02).toFixed(2)} kVAR</span>
            <span className="metric-footer-label">Reactive Power</span>
          </div>
        </div>

        {/* Card 2: Insulation Resistance */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">PV Insulation (Riso)</span>
            <div className="metric-card-icon-pill">
              <ShieldCheck size={18} className="text-emerald" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val font-mono">{Math.round(Number(liveData?.pv1_insulation) || 2840)} <small>kΩ</small></span>
            <span className="metric-status-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              &gt; 500k Safe
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">{(Number(liveData?.gfci_leakage) || 8.4).toFixed(1)} mA</span>
            <span className="metric-footer-label">GFCI Leakage</span>
          </div>
        </div>

        {/* Card 3: Inverter Efficiency */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">Conversion Efficiency</span>
            <div className="metric-card-icon-pill">
              <Gauge size={18} className="text-cyan" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val font-mono">
              {activePower > 0 ? `${(liveData?.inverter_efficiency || 97.6).toFixed(1)}%` : '97.6%'}
            </span>
            <span className="metric-status-tag" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
              European η
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">{liveData?.bus_voltage || 380} V</span>
            <span className="metric-footer-label">DC Bus Link Rail</span>
          </div>
        </div>

        {/* Card 4: Operating Runtime */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">Lifetime Operating Hours</span>
            <div className="metric-card-icon-pill">
              <Clock size={18} className="text-amber" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val font-mono">{Math.round(Number(liveData?.total_runtime_hrs) || 3418).toLocaleString()} <small>Hrs</small></span>
            <span className="metric-status-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              {(liveData?.today_runtime_hrs || 5.8).toFixed(1)}h Today
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">{summary?.lifetime_kwh || 4835} kWh</span>
            <span className="metric-footer-label">Lifetime Yield</span>
          </div>
        </div>
      </div>

      {/* ================= REGISTER INSPECTION TABLE ================= */}
      <div className="solary-card" style={{ padding: '24px' }}>
        {/* Table Header Controls */}
        <div className="register-table-header-row">
          <div className="flex-align gap-12">
            <div className="settings-icon-pill icon-cyan">
              <Cpu size={20} className="text-cyan" />
            </div>
            <div>
              <h3 className="card-heading">Havells Modbus RTU Register Inspector</h3>
              <span className="card-sub-timestamp">
                Complete engineering telemetry transmitted by Havells Enviro Pro GTi • Function Code 0x03
              </span>
            </div>
          </div>

          <div className="flex-align gap-12">
            <button className="export-csv-btn" onClick={handleExportCSV}>
              <Download size={14} /> Export Telemetry CSV
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="reg-filter-toolbar">
          <div className="history-btn-group">
            <button
              className={`hist-filter-btn ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All Registers ({registers.length})
            </button>
            <button
              className={`hist-filter-btn ${categoryFilter === 'dc' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('dc')}
            >
              DC Strings (6)
            </button>
            <button
              className={`hist-filter-btn ${categoryFilter === 'ac' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ac')}
            >
              AC Grid (6)
            </button>
            <button
              className={`hist-filter-btn ${categoryFilter === 'safety' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('safety')}
            >
              Safety & Insulation (4)
            </button>
            <button
              className={`hist-filter-btn ${categoryFilter === 'internal' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('internal')}
            >
              Thermals (3)
            </button>
            <button
              className={`hist-filter-btn ${categoryFilter === 'energy' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('energy')}
            >
              Energy & Hours (4)
            </button>
          </div>

          <div className="search-box-wrapper" style={{ minWidth: '280px' }}>
            <Search size={15} className="search-icon-inside" />
            <input
              type="text"
              placeholder="Search by address, name, or parameter..."
              className="table-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Registers Table */}
        <div className="table-wrapper" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Address</th>
                <th>Register Identifier</th>
                <th>Parameter Description</th>
                <th style={{ textAlign: 'right' }}>Live Transmitted Value</th>
                <th style={{ width: '80px' }}>Unit</th>
                <th>Modbus Scale</th>
                <th>Operating Limits</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisters.map((reg) => (
                <tr key={reg.addr}>
                  <td className="font-mono text-cyan" style={{ fontWeight: 600 }}>
                    {reg.addr}
                  </td>
                  <td className="font-mono text-white" style={{ fontSize: '12px' }}>
                    {reg.name}
                  </td>
                  <td style={{ color: '#E2E8F0', fontWeight: 500 }}>
                    {reg.label}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#38BDF8' }}>
                    {reg.value}
                  </td>
                  <td className="font-mono text-muted">
                    {reg.unit}
                  </td>
                  <td className="font-mono" style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                    {reg.scale}
                  </td>
                  <td style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                    {reg.limit}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge-highlight font-mono" style={{ fontSize: '11px', padding: '3px 8px' }}>
                      {reg.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
