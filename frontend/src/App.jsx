import React, { useState } from 'react';
import {
  Zap,
  Activity,
  IndianRupee,
  Cpu,
  BarChart3,
  Sliders,
  CheckCircle,
  Radio
} from 'lucide-react';

import { useSolarTelemetry } from './hooks/useSolarTelemetry';
import { Sidebar } from './components/Sidebar';
import { SolarPanelCard } from './components/SolarPanelCard';
import { MonthlyGenerationCard } from './components/MonthlyGenerationCard';
import { EnergyProductionChart } from './components/EnergyProductionChart';
import { StringPointsList } from './components/StringPointsList';
import { PowerFlowCanvas } from './components/PowerFlowCanvas';
import { ApdclBillingSection } from './components/ApdclBillingSection';
import { PersistentHistorySection } from './components/PersistentHistorySection';
import { SettingsSection } from './components/SettingsSection';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const {
    liveData,
    connStatus,
    todayCurve,
    dailyHistory,
    monthlyHistory,
    summary,
    config,
    availablePorts,
    updateConfig
  } = useSolarTelemetry();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'flow' | 'apdcl' | 'history' | 'system'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      <main className="solary-main">
        {/* Top Warm Ambient Light Header Graphic (Matching Image 1) */}
        <div className="solary-top-ambient-banner">
          <div className="banner-content-row">
            <div>
              <h2 className="overview-title">
                {activeTab === 'overview' && 'Overview'}
                {activeTab === 'flow' && 'Live Power Flow Telemetry'}
                {activeTab === 'apdcl' && 'APDCL Solar Net Metering'}
                {activeTab === 'history' && 'Persistent Generation History'}
                {activeTab === 'system' && 'Inverter Hardware Health'}
                {activeTab === 'settings' && 'System Configuration & Plant Settings'}
              </h2>
              <span className="overview-subtitle">
                Havells Enviro Pro GTi • Inverter S/N: <strong style={{ color: '#F1F5F9' }}>{config.inverter_sn}</strong>
              </span>
            </div>

            {/* Live Status Indicator */}
            <div className="top-status-indicator">
              <span className="live-status-pill">
                <span className="pulse-indicator"></span>
                <span>
                  {connStatus === 'live_ws'
                    ? 'LIVE (1 Hz Stream)'
                    : connStatus === 'polling_fallback'
                    ? 'LIVE (Auto-Polling)'
                    : 'CONNECTING...'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ================= VIEW 1: OVERVIEW (MATCHING IMAGE 1) ================= */}
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
              />
              <StringPointsList
                liveData={liveData}
                config={config}
              />
            </div>
          </div>
        )}

        {/* ================= VIEW 2: POWER FLOW ================= */}
        {activeTab === 'flow' && (
          <div className="fade-in" style={{ padding: '0 28px 28px' }}>
            <PowerFlowCanvas liveData={liveData} summary={summary} config={config} />
          </div>
        )}

        {/* ================= VIEW 3: APDCL BILLING ================= */}
        {activeTab === 'apdcl' && (
          <div className="fade-in" style={{ padding: '0 28px 28px' }}>
            <ApdclBillingSection summary={summary} config={config} />
          </div>
        )}

        {/* ================= VIEW 4: PERSISTENT HISTORY ================= */}
        {activeTab === 'history' && (
          <div className="fade-in" style={{ padding: '0 28px 28px' }}>
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
        {activeTab === 'system' && (
          <div className="fade-in" style={{ padding: '0 28px 28px' }}>
            <div className="solary-card">
              <h3 className="card-heading" style={{ marginBottom: '16px' }}>Havells Modbus RTU Register Diagnostics</h3>
              <div className="system-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Inverter Model</span>
                  <span className="spec-val">Havells Enviro Pro GTi 3.3kW</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Inverter Serial Number</span>
                  <span className="spec-val font-mono">{config.inverter_sn}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Datalogger Stick S/N</span>
                  <span className="spec-val font-mono">SRBAN7JD3S (PRO Wi-Fi)</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Assigned Inverter IP</span>
                  <span className="spec-val text-cyan font-mono">192.168.1.5</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">AC Line Voltage</span>
                  <span className="spec-val">{liveData.grid_voltage} V</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Grid Frequency</span>
                  <span className="spec-val">{liveData.grid_frequency} Hz (Nominal 50Hz)</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">IGBT Module Temp</span>
                  <span className="spec-val text-emerald">{liveData.module_temp} °C</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Internal Bus Voltage</span>
                  <span className="spec-val">{liveData.bus_voltage} V</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Total Generation (Lifetime)</span>
                  <span className="spec-val text-amber font-bold">{summary.lifetime_kwh} kWh</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Current Modbus Source</span>
                  <span className="spec-val text-cyan">{liveData.source}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ================= VIEW 6: SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="fade-in" style={{ padding: '0 28px 28px' }}>
            <SettingsSection
              config={config}
              availablePorts={availablePorts}
              onSave={updateConfig}
            />
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        availablePorts={availablePorts}
        onSave={updateConfig}
      />
    </div>
  );
}
