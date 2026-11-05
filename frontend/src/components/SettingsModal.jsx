import React, { useState, useEffect } from 'react';
import { X, Sliders, CheckCircle, Usb, IndianRupee, Cpu, Info, ShieldCheck } from 'lucide-react';

export function SettingsModal({
  isOpen = false,
  onClose = () => {},
  config = {},
  availablePorts = [],
  onSave = () => {}
}) {
  const [tariff, setTariff] = useState(7.65);
  const [isSim, setIsSim] = useState(true);
  const [selectedPort, setSelectedPort] = useState('');

  // Keep internal state in sync whenever modal opens or config updates
  useEffect(() => {
    if (config) {
      setTariff(config.tariff_rate !== undefined ? config.tariff_rate : 7.65);
      setIsSim(config.simulation_mode !== undefined ? config.simulation_mode : true);
      setSelectedPort(config.selected_com_port || '');
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      tariff_rate: parseFloat(tariff) || 7.65,
      simulation_mode: Boolean(isSim),
      selected_com_port: selectedPort || ''
    });
    onClose();
  };

  const portsList = Array.isArray(availablePorts) ? availablePorts : [];

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <div className="flex-align gap-10">
            <div className="modal-icon-badge">
              <Sliders size={20} className="text-amber" />
            </div>
            <div>
              <h3 className="modal-title">System & Plant Settings</h3>
              <span className="modal-subtitle">Configure APDCL billing rates & RS485 hardware binding</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Setting 1: Electricity Tariff */}
          <div className="setting-field-card">
            <div className="field-label-row">
              <div className="flex-align gap-6">
                <IndianRupee size={15} className="text-amber" />
                <label className="field-title">APDCL Net-Metering Tariff (₹ / unit)</label>
              </div>
              <span className="badge-highlight font-mono">Slab 3 Displaced</span>
            </div>
            <p className="field-desc">
              Your solar system offsets power drawn at the highest APDCL domestic slab. If the Assam Electricity Regulatory Commission (AERC) revises domestic rates or FPPPA fuel surcharges, update the rate here to keep your savings calculations 100% accurate.
            </p>
            <div className="input-with-affix">
              <span className="affix-prefix">₹</span>
              <input
                type="number"
                step="0.05"
                min="1.0"
                max="25.0"
                className="modal-text-input font-mono"
                value={tariff}
                onChange={(e) => setTariff(e.target.value)}
              />
              <span className="affix-suffix">per kWh</span>
            </div>
          </div>

          {/* Setting 2: Telemetry Mode (Hardware vs Simulation) */}
          <div className="setting-field-card">
            <div className="field-label-row">
              <div className="flex-align gap-6">
                <Cpu size={15} className="text-cyan" />
                <label className="field-title">Telemetry Mode (Simulation vs RS485 Direct)</label>
              </div>
              <span className={`status-pill ${isSim ? 'pill-sim' : 'pill-live'}`}>
                {isSim ? 'Simulation Active' : 'Direct RS485 Active'}
              </span>
            </div>
            <p className="field-desc">
              When enabled, a high-fidelity daytime solar irradiance model calibrated for the 3.3kW Havells GTi generates live telemetry. Disable this when you plug in a physical USB-to-RS485 adapter to communicate directly over Modbus RTU at 9600 baud.
            </p>
            <div className="toggle-row-switch">
              <span className="toggle-label-text">
                {isSim ? 'Zenith Solar Curve Simulation Enabled' : 'Live Hardware Modbus RTU Enabled'}
              </span>
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

          {/* Setting 3: Hardware COM Port */}
          <div className="setting-field-card">
            <div className="field-label-row">
              <div className="flex-align gap-6">
                <Usb size={15} className="text-emerald" />
                <label className="field-title">USB-to-RS485 Adapter Serial COM Port</label>
              </div>
            </div>
            <p className="field-desc">
              Select the serial COM port assigned by Windows when your USB-to-RS485 converter (connected to the Havells inverter's RS485 A/B terminals) is plugged in.
            </p>
            <select
              className="modal-select-input font-mono"
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
              <span className="field-note">
                * Note: COM port selection is disabled while Simulation Mode is active.
              </span>
            )}
          </div>

          {/* Plant Reference Metadata */}
          <div className="plant-metadata-banner">
            <Info size={16} className="text-muted" />
            <div className="meta-text">
              <span>Plant S/N: <strong className="font-mono text-white">{config?.inverter_sn || 'AFDOALB2PNAPJ78'}</strong></span>
              <span>• Wi-Fi Stick: <strong className="font-mono text-white">SRBAN7JD3S (192.168.1.5)</strong></span>
              <span>• Grid: <strong className="text-white">APDCL</strong></span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn-save" onClick={handleSave}>
            <CheckCircle size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}