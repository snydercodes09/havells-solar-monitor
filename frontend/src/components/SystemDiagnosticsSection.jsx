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

  const fmtVal = (val, decimals = 1) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '—';
    return Number(val).toFixed(decimals);
  };
  const fmtInt = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '—';
    return Math.round(Number(val)).toLocaleString();
  };

  // Complete list of SunSpec IEEE 1547-2018 DER Modbus Registers (Port 502)
  const registers = useMemo(() => [
    // --- Model 1: Common Model & Hardware Identity ---
    {
      addr: '40004',
      name: 'SUNSPEC_MANUFACTURER',
      label: 'OEM Inverter Platform',
      value: 'Solax Power',
      unit: '',
      scale: 'ASCII (16-char)',
      category: 'dc',
      status: 'Verified',
      limit: 'SolaX / Havells'
    },
    {
      addr: '40020',
      name: 'SUNSPEC_MODEL',
      label: 'Inverter Hardware Model',
      value: 'X1-MlNl-G4',
      unit: '',
      scale: 'ASCII (16-char)',
      category: 'dc',
      status: 'Verified',
      limit: 'Havells Enviro Pro'
    },
    {
      addr: '40044',
      name: 'SUNSPEC_FIRMWARE',
      label: 'Wi-Fi Stick / Inverter Firmware',
      value: '034',
      unit: '',
      scale: 'ASCII (8-char)',
      category: 'dc',
      status: 'Verified',
      limit: 'Rev 034'
    },

    // --- Model 714: DC Photovoltaic Input Registers ---
    {
      addr: '40327',
      name: 'M714_PV1_VOLTAGE',
      label: 'PV String 1 DC Voltage',
      value: fmtVal(liveData?.pv1_voltage, 1),
      unit: 'V',
      scale: '0.1 V (x0.1)',
      category: 'dc',
      status: liveData?.pv1_voltage !== null ? 'Normal' : 'Offline',
      limit: '120.0 – 450.0 V (MPPT)'
    },
    {
      addr: '40328',
      name: 'M714_PV1_POWER',
      label: 'PV String 1 Generation Power',
      value: fmtInt(liveData?.pv1_power),
      unit: 'W',
      scale: '1 W (1:1)',
      category: 'dc',
      status: liveData?.pv1_power !== null ? (Number(liveData.pv1_power) > 0 ? 'Generating' : 'Standby') : 'Offline',
      limit: 'Max 1,650 W'
    },
    {
      addr: 'Derived',
      name: 'M714_PV1_CURRENT',
      label: 'PV String 1 DC Current',
      value: fmtVal(liveData?.pv1_current, 2),
      unit: 'A',
      scale: 'Derived (P / V)',
      category: 'dc',
      status: liveData?.pv1_current !== null ? 'Normal' : 'Offline',
      limit: 'Max 12.0 A'
    },
    {
      addr: '40347',
      name: 'M714_PV2_VOLTAGE',
      label: 'PV String 2 DC Voltage',
      value: '0.0',
      unit: 'V',
      scale: '0.1 V (x0.1)',
      category: 'dc',
      status: 'Unconnected',
      limit: 'Single-String Setup'
    },
    {
      addr: '40348',
      name: 'M714_PV2_POWER',
      label: 'PV String 2 Generation Power',
      value: '0',
      unit: 'W',
      scale: '1 W (1:1)',
      category: 'dc',
      status: 'Unconnected',
      limit: 'Single-String Setup'
    },

    // --- Model 701: AC Output & Grid Synchronization Registers ---
    {
      addr: '40080',
      name: 'M701_ACTIVE_POWER',
      label: 'Inverter AC Active Output Power',
      value: fmtInt(liveData?.active_power),
      unit: 'W',
      scale: '1 W (1:1)',
      category: 'ac',
      status: liveData?.active_power !== null ? (Number(liveData.active_power) > 0 ? 'Online' : 'Standby') : 'Offline',
      limit: 'Rated 3,300 W'
    },
    {
      addr: '40083',
      name: 'M701_POWER_FACTOR',
      label: 'Inverter Power Factor (cos φ)',
      value: fmtVal(liveData?.power_factor, 2),
      unit: '',
      scale: '0.01 (x0.01)',
      category: 'ac',
      status: liveData?.power_factor !== null ? 'Synchronized' : 'Offline',
      limit: '1.00 (Unity)'
    },
    {
      addr: '40086',
      name: 'M701_LINE_VOLTAGE',
      label: 'AC Grid Voltage (PCC Phase A)',
      value: fmtVal(liveData?.grid_voltage, 1),
      unit: 'V AC',
      scale: '0.1 V (x0.1)',
      category: 'ac',
      status: liveData?.grid_voltage !== null ? 'Synchronized' : 'Offline',
      limit: '207.0 – 253.0 V (±10%)'
    },
    {
      addr: '40088',
      name: 'M701_FREQUENCY',
      label: 'AC Grid Frequency',
      value: fmtVal(liveData?.grid_frequency, 2),
      unit: 'Hz',
      scale: '0.01 Hz (x0.01)',
      category: 'ac',
      status: liveData?.grid_frequency !== null ? 'Synchronized' : 'Offline',
      limit: '49.5 – 50.5 Hz (±1%)'
    },
    {
      addr: '40107',
      name: 'M701_MODULE_TEMP',
      label: 'Inverter Heatsink / Module Temp',
      value: fmtVal(liveData?.module_temp, 1),
      unit: '°C',
      scale: '1.0 °C (1:1)',
      category: 'temp',
      status: liveData?.module_temp !== null ? 'Optimal' : 'Offline',
      limit: 'Trip @ >75°C'
    },

    // --- Model 702: DER Nameplate Ratings ---
    {
      addr: '40227',
      name: 'M702_RATED_CAPACITY',
      label: 'Rated Inverter AC Output',
      value: '3,300',
      unit: 'W',
      scale: '1 W (1:1)',
      category: 'ac',
      status: 'Verified Rating',
      limit: '3.3 kW Single-Phase'
    },
    {
      addr: '40239',
      name: 'M702_NOMINAL_VOLTAGE',
      label: 'Nominal AC Grid Voltage',
      value: '230.0',
      unit: 'V AC',
      scale: '0.1 V (x0.1)',
      category: 'ac',
      status: 'Verified Rating',
      limit: '230 V Standard'
    },
    {
      addr: '0x000D',
      name: 'HAVELLS_SYSTEM_REACTIVE_POWER',
      label: 'Grid Reactive Power (Q)',
      value: fmtVal(liveData?.reactive_power, 2),
      unit: 'kVAR',
      scale: '0.01 kVAR (x0.01)',
      category: 'ac',
      status: liveData?.reactive_power !== null ? 'Synchronized' : 'Offline',
      limit: '±0.8 PF Cap/Ind'
    },
    {
      addr: '0x000E',
      name: 'HAVELLS_GRID_FREQUENCY',
      label: 'AC Grid Frequency',
      value: fmtVal(liveData?.grid_frequency, 2),
      unit: 'Hz',
      scale: '0.01 Hz (x0.01)',
      category: 'ac',
      status: liveData?.grid_frequency !== null ? 'Synchronized' : 'Offline',
      limit: '47.5 – 52.0 Hz'
    },
    {
      addr: '0x000F',
      name: 'HAVELLS_PHASE_1_VOLTAGE',
      label: 'AC Grid Phase 1 Voltage',
      value: fmtVal(liveData?.grid_voltage, 1),
      unit: 'V',
      scale: '0.1 V (x0.1)',
      category: 'ac',
      status: liveData?.grid_voltage !== null ? 'Normal' : 'Offline',
      limit: '184.0 – 264.5 V'
    },
    {
      addr: '0x0010',
      name: 'HAVELLS_PHASE_1_CURRENT',
      label: 'AC Grid Phase 1 Current',
      value: fmtVal(liveData?.grid_current, 2),
      unit: 'A',
      scale: '0.01 A (x0.01)',
      category: 'ac',
      status: liveData?.grid_current !== null ? 'Normal' : 'Offline',
      limit: 'Max 15.0 A'
    },
    {
      addr: '0x002B',
      name: 'HAVELLS_DCI_OF_R',
      label: 'DC Component Injection (DCI)',
      value: fmtVal(liveData?.dci_injection, 1),
      unit: 'mA',
      scale: '1 mA (x1.0)',
      category: 'ac',
      status: liveData?.dci_injection !== null ? 'Safe' : 'Offline',
      limit: '< 20.0 mA (<0.5%)'
    },

    // --- Safety & Ground Insulation Registers ---
    {
      addr: '0x0024',
      name: 'HAVELLS_PV1_INSULATION_P_TO_GND',
      label: 'PV1 Insulation Impedance (P to Ground)',
      value: fmtInt(liveData?.pv1_insulation),
      unit: 'kΩ',
      scale: '1 kΩ (x1.0)',
      category: 'safety',
      status: liveData?.pv1_insulation !== null ? 'Optimal' : 'Offline',
      limit: '> 500 kΩ threshold'
    },
    {
      addr: '0x0025',
      name: 'HAVELLS_PV2_INSULATION_P_TO_GND',
      label: 'PV2 Insulation Impedance (P to Ground)',
      value: fmtInt(liveData?.pv2_insulation),
      unit: 'kΩ',
      scale: '1 kΩ (x1.0)',
      category: 'safety',
      status: liveData?.pv2_insulation !== null ? 'Optimal' : 'Offline',
      limit: '> 500 kΩ threshold'
    },
    {
      addr: '0x0026',
      name: 'HAVELLS_INSULATION_PV_N_TO_GND',
      label: 'PV Negative to Ground Insulation',
      value: fmtInt(liveData?.pv_n_insulation),
      unit: 'kΩ',
      scale: '1 kΩ (x1.0)',
      category: 'safety',
      status: liveData?.pv_n_insulation !== null ? 'Optimal' : 'Offline',
      limit: '> 500 kΩ threshold'
    },
    {
      addr: '0x002A',
      name: 'HAVELLS_GFCI_VALUE',
      label: 'Ground Fault Residual Leakage Current (GFCI)',
      value: fmtVal(liveData?.gfci_leakage, 1),
      unit: 'mA',
      scale: '1 mA (x1.0)',
      category: 'safety',
      status: liveData?.gfci_leakage !== null ? 'Protected' : 'Offline',
      limit: 'Trip threshold: 300 mA'
    },

    // --- Inverter Thermals & DC Link Registers ---
    {
      addr: '0x001B',
      name: 'HAVELLS_INVERTER_MODULE_TEMP',
      label: 'IGBT Power Module Heatsink Temp',
      value: fmtVal(liveData?.module_temp, 1),
      unit: '°C',
      scale: '1 °C (x1.0)',
      category: 'internal',
      status: liveData?.module_temp !== null ? 'Normal' : 'Offline',
      limit: 'Derating > 75°C'
    },
    {
      addr: '0x001C',
      name: 'HAVELLS_INVERTER_INNER_TEMP',
      label: 'Cabinet Enclosure Ambient Temp',
      value: fmtVal(liveData?.inner_temp, 1),
      unit: '°C',
      scale: '1 °C (x1.0)',
      category: 'internal',
      status: liveData?.inner_temp !== null ? 'Normal' : 'Offline',
      limit: '-25°C to +60°C'
    },
    {
      addr: '0x001D',
      name: 'HAVELLS_INVERTER_BUS_VOLTAGE',
      label: 'Internal DC Bus Link Rail (Vbus)',
      value: fmtInt(liveData?.bus_voltage),
      unit: 'V',
      scale: '1 V (x1.0)',
      category: 'internal',
      status: liveData?.bus_voltage !== null ? 'Stable' : 'Offline',
      limit: '340 – 420 V (Nominal)'
    },

    // --- Generation & Operational Runtime Registers ---
    {
      addr: '0x0019',
      name: 'HAVELLS_TODAY_PRODUCTION',
      label: "Today's Cumulative Solar Yield",
      value: fmtVal(liveData?.today_energy || summary?.today_kwh, 2),
      unit: 'kWh',
      scale: '0.01 kWh (x0.01)',
      category: 'energy',
      status: liveData?.today_energy !== null ? 'Accumulating' : 'Offline',
      limit: 'Daily Total'
    },
    {
      addr: '0x0015',
      name: 'HAVELLS_TOTAL_ENERGY_PRODUCTION',
      label: 'Lifetime Total Energy Generation',
      value: fmtInt(liveData?.total_energy || summary?.lifetime_kwh),
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
      value: fmtVal(liveData?.today_runtime_hrs, 1),
      unit: 'Hours',
      scale: '0.1 Hour (x0.1)',
      category: 'energy',
      status: liveData?.today_runtime_hrs !== null ? 'Active' : 'Offline',
      limit: '0.0 – 24.0 Hrs'
    },
    {
      addr: '0x0017',
      name: 'HAVELLS_TOTAL_GENERATION_TIME',
      label: 'Lifetime Inverter Generation Hours',
      value: fmtInt(liveData?.total_runtime_hrs),
      unit: 'Hours',
      scale: '32-bit DWORD (x1.0)',
      category: 'energy',
      status: liveData?.total_runtime_hrs !== null ? 'Non-Volatile' : 'Offline',
      limit: 'MTBF Lifecycle'
    }
  ], [liveData, activePower, summary]);

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

  const isOnline = liveData?.is_hardware_online || (activePower > 0);

  return (
    <div className="system-health-page-container">
      {/* Hardware Configuration & Metering Topology Banner (Priority 2 Directive) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '12px',
        padding: '1.15rem 1.35rem',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Cpu size={18} className="text-cyan" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: 700 }}>
              Hardware Telemetry & Sensor Topology
            </h4>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px'
            }}>
              Inverter-Only Telemetry
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45 }}>
            Direct SunSpec IEEE 1547 Modbus TCP telemetry via <strong>Havells Pocket Wi-Fi</strong> on Port 502 (Registers 40000–40380). External CT meter is not installed; household load and grid import/export are unmeasured.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>RS485 Modbus</span>
            <strong style={{ fontSize: '0.78rem', color: isOnline ? '#10b981' : '#f59e0b' }}>
              {isOnline ? 'Direct Online' : 'Standby / Offline'}
            </strong>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>External CT Meter</span>
            <strong style={{ fontSize: '0.78rem', color: config?.has_ct_meter ? '#10b981' : '#94a3b8' }}>
              {config?.has_ct_meter ? 'Connected' : 'Not Installed'}
            </strong>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Inverter State</span>
            <strong style={{ fontSize: '0.78rem', color: liveData?.status === 'Normal' ? '#10b981' : '#94a3b8' }}>
              {liveData?.status || 'Inverter Asleep (Night)'}
            </strong>
          </div>
        </div>
      </div>

      {/* ================= TOP METRIC CARDS ================= */}
      <div className="diag-grid iso-quick-cards-grid" style={{ marginBottom: '22px' }}>
        {/* Card 1: Power Factor */}
        <div className="iso-metric-card">
          <div className="metric-header-row">
            <span className="metric-card-title">Power Factor (cos φ)</span>
            <div className="metric-card-icon-pill">
              <Zap size={18} className="text-emerald" />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-big-val font-mono">
              {liveData?.power_factor !== null && liveData?.power_factor !== undefined ? Number(liveData.power_factor).toFixed(3) : '—'}
            </span>
            <span className="metric-status-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              {liveData?.power_factor !== null ? 'Unity PF' : 'Standby'}
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">
              {liveData?.reactive_power !== null && liveData?.reactive_power !== undefined ? `${Number(liveData.reactive_power).toFixed(2)} kVAR` : '— kVAR'}
            </span>
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
            <span className="metric-big-val font-mono">
              {liveData?.pv1_insulation !== null && liveData?.pv1_insulation !== undefined ? (
                <>{Math.round(Number(liveData.pv1_insulation)).toLocaleString()} <small>kΩ</small></>
              ) : '— kΩ'}
            </span>
            <span className="metric-status-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              {liveData?.pv1_insulation !== null ? '> 500k Safe' : 'Offline'}
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">
              {liveData?.gfci_leakage !== null && liveData?.gfci_leakage !== undefined ? `${Number(liveData.gfci_leakage).toFixed(1)} mA` : '— mA'}
            </span>
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
              {liveData?.inverter_efficiency !== null && activePower > 0 ? `${Number(liveData.inverter_efficiency).toFixed(1)}%` : '—'}
            </span>
            <span className="metric-status-tag" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
              {activePower > 0 ? 'Active MPPT' : 'Standby'}
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">
              {liveData?.bus_voltage !== null && liveData?.bus_voltage !== undefined ? `${Math.round(Number(liveData.bus_voltage))} V` : '— V'}
            </span>
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
            <span className="metric-big-val font-mono">
              {liveData?.total_runtime_hrs !== null && liveData?.total_runtime_hrs !== undefined ? (
                <>{Math.round(Number(liveData.total_runtime_hrs)).toLocaleString()} <small>Hrs</small></>
              ) : '— Hrs'}
            </span>
            <span className="metric-status-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
              {liveData?.today_runtime_hrs !== null && liveData?.today_runtime_hrs !== undefined ? `${Number(liveData.today_runtime_hrs).toFixed(1)}h Today` : 'Standby'}
            </span>
          </div>
          <div className="metric-footer-row">
            <span className="metric-footer-val font-mono">
              {summary?.lifetime_kwh !== null && summary?.lifetime_kwh !== undefined ? `${Number(summary.lifetime_kwh).toFixed(1)} kWh` : '— kWh'}
            </span>
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
        <div className="table-wrapper table-responsive" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: '100px' }}>Address</th>
                <th className="text-left">Register Identifier</th>
                <th className="text-left">Parameter Description</th>
                <th className="text-right">Live Transmitted Value</th>
                <th className="text-left" style={{ width: '80px' }}>Unit</th>
                <th className="text-left">Modbus Scale</th>
                <th className="text-left">Operating Limits</th>
                <th className="text-center" style={{ width: '110px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegisters.map((reg) => (
                <tr key={reg.addr}>
                  <td className="text-left font-mono text-cyan" style={{ fontWeight: 600 }}>
                    {reg.addr}
                  </td>
                  <td className="text-left font-mono text-white" style={{ fontSize: '12px' }}>
                    {reg.name}
                  </td>
                  <td className="text-left" style={{ color: '#E2E8F0', fontWeight: 500 }}>
                    {reg.label}
                  </td>
                  <td className="text-right font-mono" style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8' }}>
                    {reg.value}
                  </td>
                  <td className="text-left font-mono text-muted">
                    {reg.unit}
                  </td>
                  <td className="text-left font-mono" style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                    {reg.scale}
                  </td>
                  <td className="text-left" style={{ fontSize: '11.5px', color: '#94A3B8' }}>
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
