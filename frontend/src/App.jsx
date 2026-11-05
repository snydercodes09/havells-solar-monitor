import React, { useState, useMemo } from 'react';
import { useSolarTelemetry } from './hooks/useSolarTelemetry';
import { Sidebar } from './components/Sidebar';
import { SolarPanelCard } from './components/SolarPanelCard';
import { PowerFlowCanvas } from './components/PowerFlowCanvas';
import { MonthlyGenerationCard } from './components/MonthlyGenerationCard';
import { StringPointsList } from './components/StringPointsList';
import { EnergyProductionChart } from './components/EnergyProductionChart';
import { ApdclBillingSection } from './components/ApdclBillingSection';
import { SystemDiagnosticsSection } from './components/SystemDiagnosticsSection';
import { PersistentHistorySection } from './components/PersistentHistorySection';
import { SettingsSection } from './components/SettingsSection';
import { SettingsModal } from './components/SettingsModal';
import './App.css';

const TAB_METADATA = {
  overview: {
    title: 'Live Solar & Grid Overview',
    description: 'Real-time 1 Hz RS485 Modbus RTU telemetry, dual-MPPT string balance, and instant power routing.'
  },
  flow: {
    title: 'Live Power Flow Telemetry',
    description: 'Real-time 3D isometric energy distribution between Solar PV array, Havells Inverter, Home Load, and APDCL Grid.'
  },
  apdcl: {
    title: 'APDCL LT-II Net-Metering & Savings',
    description: 'Progressive telescopic slab offset (₹5.40 / ₹6.65 / ₹7.65 per kWh), fixed demand charges, and ROI tracking.'
  },
  billing: {
    title: 'APDCL LT-II Net-Metering & Savings',
    description: 'Progressive telescopic slab offset (₹5.40 / ₹6.65 / ₹7.65 per kWh), fixed demand charges, and ROI tracking.'
  },
  diagnostics: {
    title: 'Inverter Health & Safety Diagnostics',
    description: 'Live isolation resistance, GFCI ground-fault leakage, DC injection, and thermal derating thresholds.'
  },
  system: {
    title: 'Inverter Health & Safety Diagnostics',
    description: 'Live isolation resistance, GFCI ground-fault leakage, DC injection, and thermal derating thresholds.'
  },
  history: {
    title: 'Persistent SQLite Generation Archive',
    description: 'Daily and monthly kWh production curves, peak power records, and exportable telemetry logs.'
  },
  settings: {
    title: 'RS485 Serial & Tariff Configuration',
    description: 'Configure COM port, Modbus slave parameters, APDCL tariff slabs, and simulation fallback controls.'
  }
};

function getHealthBadge(value, normalMax, warnMax, unit = '') {
  if (value == null || Number.isNaN(Number(value))) {
    return { label: 'Awaiting Data', tone: 'neutral' };
  }
  if (value <= normalMax) {
    return { label: `Optimal (${value}${unit})`, tone: 'emerald' };
  }
  if (value <= warnMax) {
    return { label: `Elevated (${value}${unit})`, tone: 'amber' };
  }
  return { label: `Critical (${value}${unit})`, tone: 'danger' };
}

export default function App() {
  const {
    liveData,
    connStatus,
    todayCurve,
    dailyHistory,
    monthlyHistory,
    summary,
    config,
    updateConfig,
    saveConfig,
    availablePorts,
    historyLogs,
    isDbConnected
  } = useSolarTelemetry();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'flow' | 'apdcl' | 'history' | 'system' | 'settings'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const ratedCapacityW = Number(config?.rated_capacity_w || 3300);
  const activePowerW = Number(liveData?.active_power || 0);
  const capacityPct = Math.min(100, Math.round((activePowerW / ratedCapacityW) * 100));

  const isSimulation = useMemo(() => {
    const src = String(liveData?.source || '').toLowerCase();
    const st = String(liveData?.status || '').toLowerCase();
    return Boolean(config?.simulation_mode) || src.includes('mock') || src.includes('sim') || st.includes('sim') || Boolean(liveData?.is_simulation);
  }, [liveData?.source, liveData?.status, liveData?.is_simulation, config?.simulation_mode]);

  const gridStatus = useMemo(() => {
    const v = Number(liveData?.grid_voltage || 0);
    const f = Number(liveData?.grid_frequency || 0);
    if (!v) return { label: 'Inverter Asleep (Night)', hint: 'Zero DC solar generation, AC relay open', tone: 'neutral' };
    if (v >= 207 && v <= 253 && f >= 49.5 && f <= 50.5) {
      return {
        label: 'APDCL Grid Synced',
        hint: 'Within Indian Standard ±10% (207V–253V, 50Hz)',
        tone: 'emerald'
      };
    }
    return {
      label: 'Voltage / Freq Deviation',
      hint: `Outside nominal 230V ±10% window (${v.toFixed(1)}V / ${f.toFixed(2)}Hz)`,
      tone: 'amber'
    };
  }, [liveData?.grid_voltage, liveData?.grid_frequency]);

  const thermalStatus = useMemo(
    () => getHealthBadge(Number(liveData?.module_temp || 0), 50, 62, '°C'),
    [liveData?.module_temp]
  );

  const mpptBalance = useMemo(() => {
    const p1 = Number(liveData?.pv1_power || 0);
    const p2 = Number(liveData?.pv2_power || 0);
    const total = p1 + p2;
    if (total <= 0) return { p1Pct: 50, p2Pct: 50, deltaPct: 0 };
    const p1Pct = Math.round((p1 / total) * 100);
    const p2Pct = 100 - p1Pct;
    return { p1Pct, p2Pct, deltaPct: Math.abs(p1Pct - p2Pct) };
  }, [liveData?.pv1_power, liveData?.pv2_power]);

  const currentTabMeta = TAB_METADATA[activeTab] || TAB_METADATA.overview;

  return (
    <div className="solary-layout">
      {/* 1. Left Vertical Navigation Rail */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        liveStatus={connStatus}
      />

      {/* 2. Main Dashboard Area */}
      <main className="solary-main main-content">
        {/* Top Context Header (F-04) */}
        <header className="top-header">
          <div className="header-title-group">
            <div className="eyebrow-row">
              <span className="brand-badge">HAVELLS ENVIRO PRO GTi</span>
              <span className="capacity-chip">{(ratedCapacityW / 1000).toFixed(1)} kW Single-Phase On-Grid</span>
            </div>
            <h1>{currentTabMeta.title}</h1>
            <p className="subtitle">{currentTabMeta.description}</p>
          </div>

          <div className="status-indicators">
            <div
              className={`status-pill ${connStatus}`}
              title={
                liveData?.status === 'Inverter Asleep / Offline' || Number(liveData?.grid_voltage || 0) === 0
                  ? 'Inverter is in night standby / offline mode'
                  : connStatus === 'live_ws'
                  ? 'Streaming live frames over WebSocket'
                  : 'Polling REST gateway'
              }
            >
              <span className="dot"></span>
              <div className="status-pill-text">
                <span className="status-primary">
                  {liveData?.status === 'Inverter Asleep / Offline' || Number(liveData?.grid_voltage || 0) === 0
                    ? 'Inverter Asleep (Night)'
                    : connStatus === 'live_ws'
                    ? '1 Hz Stream Live'
                    : connStatus === 'polling_fallback'
                    ? 'HTTP Connected'
                    : 'Reconnecting...'}
                </span>
                <span className="status-sub">
                  {liveData?.source || (isSimulation ? 'Simulation Mode' : 'Hardware Direct')}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="settings-trigger-btn"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open Serial & Tariff Settings"
            >
              ⚙️ Configure
            </button>
          </div>
        </header>

        {/* Descriptive 4-Card Hero KPI Strip (F-04) */}
        <section className="kpi-hero-strip" aria-label="Key System Telemetry Summary">
          {/* Card 1: Instant AC Generation */}
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Instant AC Generation</span>
              <span className="kpi-badge emerald">{capacityPct}% of Rated Peak</span>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">{(activePowerW / 1000).toFixed(2)}</span>
              <span className="kpi-unit">kW</span>
              <span className="kpi-secondary">({activePowerW.toFixed(0)} W)</span>
            </div>
            <div className="kpi-progress-track" aria-hidden="true">
              <div className="kpi-progress-fill emerald" style={{ width: `${capacityPct}%` }} />
            </div>
            <p className="kpi-description">
              Converting DC string input at <strong>{liveData?.bus_voltage || 380}V DC bus</strong> into synchronized AC power.
            </p>
          </article>

          {/* Card 2: Dual-MPPT String Balance */}
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Dual-MPPT String Balance</span>
              <span className={`kpi-badge ${mpptBalance.deltaPct > 20 ? 'amber' : 'blue'}`}>
                {mpptBalance.p1Pct}% / {mpptBalance.p2Pct}% Split
              </span>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">
                {((Number(liveData?.pv1_power || 0) + Number(liveData?.pv2_power || 0)) / 1000).toFixed(2)}
              </span>
              <span className="kpi-unit">kW DC</span>
            </div>
            <p className="kpi-description">
              PV1: <strong>{liveData?.pv1_voltage || 0}V · {liveData?.pv1_current || 0}A</strong> | PV2:{' '}
              <strong>{liveData?.pv2_voltage || 0}V · {liveData?.pv2_current || 0}A</strong> (Optimal MPPT: 120V–450V).
            </p>
          </article>

          {/* Card 3: APDCL Grid Point (PCC) */}
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">APDCL Grid Point (PCC)</span>
              <span className={`kpi-badge ${gridStatus.tone}`}>{gridStatus.label}</span>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">{Number(liveData?.grid_voltage || 0).toFixed(1)}</span>
              <span className="kpi-unit">V AC</span>
              <span className="kpi-secondary">@ {Number(liveData?.grid_frequency || 0).toFixed(2)} Hz</span>
            </div>
            <p className="kpi-description">
              {Number(liveData?.grid_voltage || 0) > 0 ? (
                <>Exporting <strong>{Number(liveData?.grid_current || 0).toFixed(1)} A</strong> to single-phase feeder. {gridStatus.hint}.</>
              ) : (
                <>Inverter contactors open. No AC injection during night sleep mode.</>
              )}
            </p>
          </article>

          {/* Card 4: Today's Yield & Thermal State */}
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Today's Yield & Thermal State</span>
              <span className={`kpi-badge ${thermalStatus.tone}`}>IGBT {thermalStatus.label}</span>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value">{Number(liveData?.today_energy || summary?.today_kwh || 0).toFixed(2)}</span>
              <span className="kpi-unit">kWh</span>
              <span className="kpi-secondary">
                (≈ ₹{((Number(liveData?.today_energy || summary?.today_kwh || 0)) * Number(config?.tariff_rate || 7.65)).toFixed(0)} saved)
              </span>
            </div>
            <p className="kpi-description">
              Cabin temp <strong>{liveData?.inner_temp || 0}°C</strong> (Thermal derating begins above 60°C heatsink).
            </p>
          </article>
        </section>

        {/* ================= VIEW 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="solary-dashboard-grid fade-in">
            {/* Top Row: Solar Panel Hero + Monthly Generation */}
            <div className="grid-row-top" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <SolarPanelCard
                liveData={liveData}
                config={config}
                summary={summary}
              />
              <MonthlyGenerationCard
                monthlyHistory={monthlyHistory}
                summary={summary}
                config={config}
              />
            </div>

            {/* Bottom Row: Energy Produced Spline Chart + Panel Points */}
            <div className="grid-row-bottom" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1fr)', gap: '1.25rem' }}>
              <EnergyProductionChart
                todayCurve={todayCurve}
                dailyHistory={dailyHistory}
                liveData={liveData}
              />
              <StringPointsList
                liveData={liveData}
                config={config}
              />
            </div>
          </div>
        )}

        {/* ================= VIEW 2: POWER FLOW (3D Isometric + Schematic) ================= */}
        {activeTab === 'flow' && (
          <div className="fade-in">
            <PowerFlowCanvas liveData={liveData} summary={summary} config={config} />
          </div>
        )}

        {/* ================= VIEW 3: APDCL BILLING ================= */}
        {(activeTab === 'apdcl' || activeTab === 'billing') && (
          <div className="fade-in">
            <ApdclBillingSection summary={summary} config={config} />
          </div>
        )}

        {/* ================= VIEW 4: PERSISTENT HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="fade-in">
            <PersistentHistorySection
              dailyHistory={dailyHistory}
              monthlyHistory={monthlyHistory}
              todayCurve={todayCurve}
              summary={summary}
              config={config}
            />
          </div>
        )}

        {/* ================= VIEW 5: SYSTEM HEALTH & REGISTERS ================= */}
        {(activeTab === 'system' || activeTab === 'diagnostics') && (
          <div className="fade-in">
            <SystemDiagnosticsSection
              liveData={liveData}
              summary={summary}
              config={config}
              historyLogs={historyLogs}
              isDbConnected={isDbConnected}
            />
          </div>
        )}

        {/* ================= VIEW 6: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="fade-in">
            <SettingsSection
              config={config}
              availablePorts={availablePorts}
              onSave={updateConfig || saveConfig}
            />
          </div>
        )}
      </main>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        availablePorts={availablePorts}
        onSave={updateConfig || saveConfig}
      />
    </div>
  );
}
