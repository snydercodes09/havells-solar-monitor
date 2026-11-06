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
    description: 'Verified AERC FY 2026–27 Domestic-A tariff schedule (Slabs ₹4.25–₹8.19/kWh), GoA targeted subsidy, and APPC settlement.'
  },
  billing: {
    title: 'APDCL LT-II Net-Metering & Savings',
    description: 'Verified AERC FY 2026–27 Domestic-A tariff schedule (Slabs ₹4.25–₹8.19/kWh), GoA targeted subsidy, and APPC settlement.'
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
    isDbConnected,
    meterReadings,
    meterSyncSummary,
    addMeterReading,
    deleteMeterReading,
    tariffConfig,
    billingReconciliation,
    updateTariffConfig,
    calculateCustomBill
  } = useSolarTelemetry();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'flow' | 'apdcl' | 'history' | 'system' | 'settings'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const ratedCapacityW = Number(config?.rated_capacity_w || 3300);
  const activePowerW = Number(liveData?.active_power || 0);
  const capacityPct = Math.min(100, Math.round((activePowerW / ratedCapacityW) * 100));

  const hasCtMeter = config?.has_ct_meter === true || config?.has_ct_meter === 'true';

  const isSimulation = useMemo(() => {
    const isSimConfig = config?.simulation_mode === true || config?.simulation_mode === 'true';
    const isSimLive = liveData?.is_simulation === true || liveData?.is_simulation === 'true';
    const src = String(liveData?.source || '').toLowerCase();
    const st = String(liveData?.status || '').toLowerCase();
    return isSimConfig || isSimLive || src.includes('mock') || src.includes('sim') || st.includes('simulator');
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
        {/* Top Context Header */}
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
                  {liveData?.status === 'Inverter Asleep / Offline' || liveData?.active_power === null
                    ? 'Inverter Asleep (Night)'
                    : activePowerW > 0
                    ? `Generating (${(activePowerW / 1000).toFixed(2)} kW)`
                    : connStatus === 'live_ws'
                    ? '1 Hz Stream Live'
                    : connStatus === 'polling_fallback'
                    ? 'HTTP Connected'
                    : 'Reconnecting...'}
                </span>
                <span className="status-sub">
                  {liveData?.source || 'Hardware Direct (Wi-Fi 502)'}
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
              <span className={`kpi-badge ${activePowerW > 0 ? 'emerald' : 'neutral'}`}>
                {activePowerW > 0 ? `${capacityPct}% of Rated Peak` : 'Standby / Offline'}
              </span>
            </div>
            <div className="kpi-value-row">
              {liveData?.active_power !== null && liveData?.active_power !== undefined ? (
                <>
                  <span className="kpi-value">{(activePowerW / 1000).toFixed(2)}</span>
                  <span className="kpi-unit">kW</span>
                  <span className="kpi-secondary">({activePowerW.toFixed(0)} W)</span>
                </>
              ) : (
                <>
                  <span className="kpi-value">—</span>
                  <span className="kpi-unit">kW</span>
                  <span className="kpi-secondary">(Inverter Asleep)</span>
                </>
              )}
            </div>
            <div className="kpi-progress-track" aria-hidden="true">
              <div className="kpi-progress-fill emerald" style={{ width: `${capacityPct}%` }} />
            </div>
            <p className="kpi-description">
              {liveData?.bus_voltage !== null && liveData?.bus_voltage !== undefined ? (
                <>Converting DC string input at <strong>{liveData.bus_voltage}V DC bus</strong> into synchronized AC power.</>
              ) : (
                <>Inverter contactors open. No AC injection during night sleep mode (0V DC solar array).</>
              )}
            </p>
          </article>

          {/* Card 2: Solar DC Input (PV1) */}
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">Solar DC Input (PV1)</span>
              <span className="kpi-badge emerald">
                {liveData?.pv1_power !== null && Number(liveData?.pv1_power) > 0 ? 'Single-String 8-Panel Setup' : 'Standby / Asleep'}
              </span>
            </div>
            <div className="kpi-value-row">
              {liveData?.pv1_power !== null && liveData?.pv1_power !== undefined ? (
                <>
                  <span className="kpi-value">
                    {(Number(liveData.pv1_power) / 1000).toFixed(2)}
                  </span>
                  <span className="kpi-unit">kW DC</span>
                  <span className="kpi-secondary">({Number(liveData.pv1_power).toFixed(0)} W)</span>
                </>
              ) : (
                <>
                  <span className="kpi-value">—</span>
                  <span className="kpi-unit">kW DC</span>
                  <span className="kpi-secondary">(0 W DC)</span>
                </>
              )}
            </div>
            <p className="kpi-description">
              PV1: <strong>{liveData?.pv1_voltage !== null && liveData?.pv1_voltage !== undefined ? `${liveData.pv1_voltage}V · ${liveData.pv1_current}A` : '— V'}</strong> (MPPT Range 120V–450V). MPPT 2 unconnected.
            </p>
          </article>

          {/* Card 3: APDCL Grid Point (PCC) */}
          <article className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-label">APDCL Grid Point (PCC)</span>
              <span className={`kpi-badge ${gridStatus.tone}`}>{gridStatus.label}</span>
            </div>
            <div className="kpi-value-row">
              {liveData?.grid_voltage !== null && liveData?.grid_voltage !== undefined ? (
                <>
                  <span className="kpi-value">{Number(liveData.grid_voltage).toFixed(1)}</span>
                  <span className="kpi-unit">V AC</span>
                  <span className="kpi-secondary">@ {Number(liveData.grid_frequency || 50.0).toFixed(2)} Hz</span>
                </>
              ) : (
                <>
                  <span className="kpi-value">—</span>
                  <span className="kpi-unit">V AC</span>
                  <span className="kpi-secondary">@ — Hz</span>
                </>
              )}
            </div>
            <p className="kpi-description">
              {Number(liveData?.grid_voltage || 0) > 0 ? (
                <>AC feeder synchronized. Household net import/export is unmeasured without CT meter.</>
              ) : (
                <>Inverter contactors open. No AC line injection during night sleep mode.</>
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
              {liveData?.today_energy !== null || summary?.today_kwh !== null ? (
                <>
                  <span className="kpi-value">{Number(liveData?.today_energy || summary?.today_kwh || 0).toFixed(2)}</span>
                  <span className="kpi-unit">kWh</span>
                  <span className="kpi-secondary">
                    (≈ ₹{((Number(liveData?.today_energy || summary?.today_kwh || 0)) * Number(config?.tariff_rate || 7.65)).toFixed(0)} saved)
                  </span>
                </>
              ) : (
                <>
                  <span className="kpi-value">—</span>
                  <span className="kpi-unit">kWh</span>
                </>
              )}
            </div>
            <p className="kpi-description">
              Cabin temp <strong>{liveData?.inner_temp !== null && liveData?.inner_temp !== undefined ? `${liveData.inner_temp}°C` : '—'}</strong> (Thermal derating begins above 60°C heatsink).
            </p>
          </article>
        </section>

        {/* ================= VIEW 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="solary-dashboard-grid fade-in">
            {/* Top Row: Solar Panel Hero + Monthly Generation */}
            <div className="grid-row-top">
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
            <div className="grid-row-bottom">
              <EnergyProductionChart
                todayCurve={todayCurve}
                dailyHistory={dailyHistory}
                liveData={liveData}
                config={config}
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

        {/* ================= VIEW 3: APDCL BILLING & METER SYNC ================= */}
        {(activeTab === 'apdcl' || activeTab === 'billing') && (
          <div className="fade-in">
            <ApdclBillingSection
              summary={summary}
              config={config}
              meterReadings={meterReadings}
              meterSyncSummary={meterSyncSummary}
              onAddReading={addMeterReading}
              onDeleteReading={deleteMeterReading}
              tariffConfig={tariffConfig}
              billingReconciliation={billingReconciliation}
              onUpdateTariffConfig={updateTariffConfig}
              onCalculateCustomBill={calculateCustomBill}
            />
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
