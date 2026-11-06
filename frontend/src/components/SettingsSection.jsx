import React, { useState, useEffect } from 'react';
import {
  Sliders,
  IndianRupee,
  Cpu,
  Usb,
  ShieldCheck,
  Wifi,
  Leaf,
  Database,
  CheckCircle2,
  RefreshCw,
  Info,
  HelpCircle,
  Zap,
  MapPin,
  Save
} from 'lucide-react';

export function SettingsSection({
  config = {},
  availablePorts = [],
  onSave = () => {}
}) {
  const [tariff, setTariff] = useState(7.65);
  const [isSim, setIsSim] = useState(false);
  const [selectedPort, setSelectedPort] = useState('');
  const [hasCtMeter, setHasCtMeter] = useState(false);
  const [meterModel, setMeterModel] = useState('None');
  const [meterSlaveId, setMeterSlaveId] = useState(2);
  const [savedToast, setSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when config updates
  useEffect(() => {
    if (config) {
      setTariff(config.tariff_rate !== undefined ? config.tariff_rate : 7.65);
      setIsSim(config.simulation_mode === true || config.simulation_mode === 'true');
      setSelectedPort(config.selected_com_port || '');
      setHasCtMeter(config.has_ct_meter === true || config.has_ct_meter === 'true');
      setMeterModel(config.meter_model || 'None');
      setMeterSlaveId(config.meter_slave_id !== undefined ? Number(config.meter_slave_id) : 2);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      tariff_rate: parseFloat(tariff) || 7.65,
      simulation_mode: Boolean(isSim),
      selected_com_port: selectedPort || '',
      has_ct_meter: Boolean(hasCtMeter),
      meter_model: meterModel,
      meter_slave_id: parseInt(meterSlaveId, 10) || 2
    });
    setIsSaving(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  const portsList = Array.isArray(availablePorts) ? availablePorts : [];

  // Live calculation preview
  const previewMonthKwh = 445;
  const previewSavings = Math.round(previewMonthKwh * (parseFloat(tariff) || 7.65));

  return (
    <div className="settings-page-wrapper">
      {/* Top Banner Alert on Save */}
      {savedToast && (
        <div className="settings-toast-banner">
          <CheckCircle2 size={18} className="text-emerald" />
          <span>Configuration saved successfully! SQLite database updated.</span>
        </div>
      )}

      {/* Main Grid: 2 Columns of Settings Cards */}
      <div className="settings-grid">
        {/* ================= CARD 1: APDCL TARIFF & FINANCIAL CALIBRATION ================= */}
        <div className="solary-card settings-card">
          <div className="card-header-row">
            <div className="flex-align gap-10">
              <div className="settings-icon-pill icon-amber">
                <IndianRupee size={20} className="text-amber" />
              </div>
              <div>
                <h3 className="card-heading">APDCL Tariff</h3>
                <span className="card-sub-timestamp">Domestic Solar Net-Metering</span>
              </div>
            </div>
            <span className="badge-highlight font-mono">LT-II Domestic</span>
          </div>

          <div className="settings-card-body">
            <div className="form-group-custom">
              <label className="settings-label">
                Displaced Slab Rate (₹ per kWh / Unit)
              </label>
              <span className="settings-hint">
                Displaces APDCL Slab 3 (&gt;240 units/month). Incorporates AERC tariff order, active FPPPA fuel charges, and electricity duty.
              </span>
              <div className="settings-input-group">
                <span className="input-affix-left">₹</span>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="25.0"
                  className="settings-input-field font-mono"
                  value={tariff}
                  onChange={(e) => setTariff(e.target.value)}
                />
                <span className="input-affix-right">/ kWh</span>
              </div>
            </div>

            {/* Live Calculation Impact Box */}
            <div className="settings-preview-box">
              <div className="flex-align gap-6">
                <Zap size={14} className="text-amber" />
                <span className="preview-label">Live Savings Projection:</span>
              </div>
              <div className="preview-metrics-row">
                <span>445 kWh monthly yield =</span>
                <strong className="text-cyan font-mono" style={{ fontSize: '15px' }}>
                  ₹ {previewSavings.toLocaleString('en-IN')} / mo
                </strong>
              </div>
            </div>

            {/* Jurisdiction Details */}
            <div className="settings-meta-subgrid">
              <div className="meta-subitem">
                <span className="meta-label">DISCOM Circle</span>
                <span className="meta-val">APDCL</span>
              </div>
              <div className="meta-subitem">
                <span className="meta-label">Electrical Sub-Division</span>
                <span className="meta-val">APDCL Domestic</span>
              </div>
              <div className="meta-subitem">
                <span className="meta-label">Metering Protocol</span>
                <span className="meta-val text-emerald">Bi-Directional 1:1</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CARD 2: HARDWARE & MODBUS RTU RS485 ================= */}
        <div className="solary-card settings-card">
          <div className="card-header-row">
            <div className="flex-align gap-10">
              <div className="settings-icon-pill icon-cyan">
                <Cpu size={20} className="text-cyan" />
              </div>
              <div>
                <h3 className="card-heading">Modbus RTU & Hardware Binding</h3>
                <span className="card-sub-timestamp">RS485 Serial Serial Bus Communication</span>
              </div>
            </div>
            <span className={`status-pill ${isSim ? 'pill-sim' : 'pill-live'}`}>
              {isSim ? 'Simulation Mode' : 'Live RS485 Bus'}
            </span>
          </div>

          <div className="settings-card-body">
            {/* Simulation Toggle */}
            <div className="form-group-custom">
              <div className="toggle-container-box">
                <div>
                  <label className="settings-label" style={{ marginBottom: 2 }}>
                    Telemetry Simulation Fallback
                  </label>
                  <p className="settings-hint" style={{ marginBottom: 0 }}>
                    Generates a realistic solar zenith curve (peaking at ~3,120 W) when direct RS485 serial is unplugged.
                  </p>
                </div>
                <label className="custom-switch">
                  <input
                    type="checkbox"
                    checked={isSim}
                    onChange={(e) => setIsSim(e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>
            </div>

            {/* Serial Port Picker */}
            <div className="form-group-custom">
              <label className="settings-label">
                Hardware Serial COM Port (USB-to-RS485)
              </label>
              <span className="settings-hint">
                Plug your USB-RS485 dongle into your PC and wire to Havells RS485 A/B terminals.
              </span>
              <select
                className="settings-select-field font-mono"
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={isSim}
              >
                <option value="">-- No Direct Serial COM Selected (Simulation) --</option>
                {portsList.map((p) => (
                  <option key={p.device} value={p.device}>
                    {p.device} • {p.description}
                  </option>
                ))}
              </select>
              {isSim && (
                <span className="field-note-text">
                  * COM port selection disabled while simulation is active.
                </span>
              )}
            </div>

            {/* Modbus RTU Bus Parameters */}
            <div className="settings-meta-subgrid">
              <div className="meta-subitem">
                <span className="meta-label">Baud Rate</span>
                <span className="meta-val font-mono">9600 bps</span>
              </div>
              <div className="meta-subitem">
                <span className="meta-label">Framing</span>
                <span className="meta-val font-mono">8-N-1</span>
              </div>
              <div className="meta-subitem">
                <span className="meta-label">Modbus Slave ID</span>
                <span className="meta-val font-mono">0x01</span>
              </div>
            </div>

            {/* CT Meter Sub-section */}
            <div className="form-group-custom" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="toggle-container-box">
                <div>
                  <label className="settings-label" style={{ marginBottom: 2 }}>
                    External Bidirectional CT Meter (PCC)
                  </label>
                  <p className="settings-hint" style={{ marginBottom: 0 }}>
                    {hasCtMeter
                      ? 'Enabled on secondary Modbus ID. Calculates hardware-measured household consumption.'
                      : 'Disabled: Operating in Inverter-Only Truth Mode without guessed household loads.'}
                  </p>
                </div>
                <label className="custom-switch">
                  <input
                    type="checkbox"
                    checked={hasCtMeter}
                    onChange={(e) => setHasCtMeter(e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              {hasCtMeter && (
                <div className="grid-two-cols-settings" style={{ marginTop: '12px' }}>
                  <div>
                    <label className="settings-label" style={{ fontSize: '11px' }}>Meter Model</label>
                    <select
                      className="settings-select-field font-mono"
                      value={meterModel}
                      onChange={(e) => setMeterModel(e.target.value)}
                    >
                      <option value="Chint DDSU666">Chint DDSU666</option>
                      <option value="Eastron SDM120">Eastron SDM120</option>
                      <option value="Acrel ACR10R">Acrel ACR10R</option>
                      <option value="Custom Modbus">Generic Modbus</option>
                    </select>
                  </div>
                  <div>
                    <label className="settings-label" style={{ fontSize: '11px' }}>Meter Slave ID</label>
                    <input
                      type="number"
                      min="1"
                      max="247"
                      className="settings-input-field font-mono"
                      value={meterSlaveId}
                      onChange={(e) => setMeterSlaveId(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= CARD 3: INVERTER IDENTITY & WI-FI DONGLE ================= */}
        <div className="solary-card settings-card">
          <div className="card-header-row">
            <div className="flex-align gap-10">
              <div className="settings-icon-pill icon-emerald">
                <ShieldCheck size={20} className="text-emerald" />
              </div>
              <div>
                <h3 className="card-heading">Havells Inverter Identity</h3>
                <span className="card-sub-timestamp">Inverter Hardware Profiles & Local IP Binding</span>
              </div>
            </div>
            <span className="badge-highlight font-mono">Enviro Pro</span>
          </div>

          <div className="settings-card-body">
            <div className="identity-rows-container">
              <div className="id-row">
                <span className="id-label">Inverter Model:</span>
                <strong className="id-value font-mono">Havells Enviro Pro GTi 3.3kW</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Inverter Serial Number (SN):</span>
                <strong className="id-value font-mono text-amber">{config?.inverter_sn || 'AFDOALB2PNAPJ78'}</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Datalogger Stick S/N:</span>
                <strong className="id-value font-mono">SRBAN7JD3S (PRO Wi-Fi)</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Assigned Inverter IP:</span>
                <strong className="id-value font-mono text-cyan">192.168.1.5</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Datalogger MAC:</span>
                <strong className="id-value font-mono">10:00:3B:83:3F:3A (Espressif)</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Firmware Build:</span>
                <strong className="id-value font-mono">3.001.02</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CARD 4: DATABASE & ENVIRONMENTAL FACTORS ================= */}
        <div className="solary-card settings-card">
          <div className="card-header-row">
            <div className="flex-align gap-10">
              <div className="settings-icon-pill icon-purple">
                <Database size={20} className="text-purple" />
              </div>
              <div>
                <h3 className="card-heading">Storage & Environmental Impact</h3>
                <span className="card-sub-timestamp">Local SQLite WAL Engine & Carbon Equivalents</span>
              </div>
            </div>
            <span className="badge-highlight font-mono text-emerald">WAL Mode</span>
          </div>

          <div className="settings-card-body">
            <div className="identity-rows-container">
              <div className="id-row">
                <span className="id-label">Storage Engine:</span>
                <strong className="id-value">SQLite 3 (Write-Ahead Logging)</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Database File:</span>
                <strong className="id-value font-mono">solar_telemetry.db</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Raw Telemetry Retention:</span>
                <strong className="id-value font-mono">60,000 Samples (~7 days @ 1 Hz)</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Historical Summaries:</span>
                <strong className="id-value text-emerald">Permanent Daily & Monthly Storage</strong>
              </div>
              <div className="id-row">
                <span className="id-label">CO₂ Emission Factor:</span>
                <strong className="id-value font-mono">0.82 kg CO₂ / kWh</strong>
              </div>
              <div className="id-row">
                <span className="id-label">Forest Tree Equivalency:</span>
                <strong className="id-value text-emerald">1 Tree per 21.77 kg CO₂ Avoided</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Actions Bar at Bottom */}
      <div className="settings-floating-bar">
        <div className="save-bar-info">
          <Info size={16} className="text-muted" />
          <span>Settings persist automatically in local SQLite database and take effect immediately without server restarts.</span>
        </div>
        <button
          className="settings-save-button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <RefreshCw size={16} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={16} /> Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}