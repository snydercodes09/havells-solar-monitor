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
import { SystemDiagnosticsSection } from './components/SystemDiagnosticsSection';
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
            <SystemDiagnosticsSection
              liveData={liveData}
              summary={summary}
              config={config}
            />
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
