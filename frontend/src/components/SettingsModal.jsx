import React, { useState, useEffect } from 'react';
import { X, Sliders, CheckCircle, Usb, IndianRupee, Cpu, Info, ShieldCheck, AlertCircle } from 'lucide-react';

export function SettingsModal({
  isOpen = false,
  onClose = () => {},
  config = {},
  availablePorts = [],
  onSave = () => {}
}) {
  const [tariff, setTariff] = useState(7.65);
  const [isSim, setIsSim] = useState(false);
  const [selectedPort, setSelectedPort] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [slaveId, setSlaveId] = useState(1);
  const [ratedCapacity, setRatedCapacity] = useState(3300);
  const [hasCtMeter, setHasCtMeter] = useState(false);
  const [meterModel, setMeterModel] = useState('None');
  const [meterSlaveId, setMeterSlaveId] = useState(2);
  const [feedback, setFeedback] = useState({ tone: '', text: '' });

  // Synchronize local form state whenever modal opens or parent config updates
  useEffect(() => {
    if (config) {
      setTariff(config.tariff_rate !== undefined ? config.tariff_rate : 7.65);
      setIsSim(config.simulation_mode === true || config.simulation_mode === 'true');
      setSelectedPort(config.selected_com_port || config.modbus_port || '');
      setBaudRate(config.baud_rate !== undefined ? Number(config.baud_rate) : 9600);
      setSlaveId(config.slave_id !== undefined ? Number(config.slave_id) : 1);
      setRatedCapacity(config.rated_capacity_w !== undefined ? Number(config.rated_capacity_w) : 3300);
      setHasCtMeter(config.has_ct_meter === true || config.has_ct_meter === 'true');
      setMeterModel(config.meter_model || 'None');
      setMeterSlaveId(config.meter_slave_id !== undefined ? Number(config.meter_slave_id) : 2);
      setFeedback({ tone: '', text: '' });
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const parsedTariff = parseFloat(tariff);
    const parsedBaud = parseInt(baudRate, 10);
    const parsedSlave = parseInt(slaveId, 10);
    const parsedCapacity = parseFloat(ratedCapacity);
    const parsedMeterSlave = parseInt(meterSlaveId, 10);

    if (isNaN(parsedTariff) || parsedTariff <= 0 || parsedTariff > 50) {
      setFeedback({ tone: 'error', text: 'Tariff must be a valid number between ₹1.00 and ₹50.00' });
      return;
    }
    if (isNaN(parsedSlave) || parsedSlave < 1 || parsedSlave > 247) {
      setFeedback({ tone: 'error', text: 'Modbus Slave ID must be between 1 and 247' });
      return;
    }
    if (isNaN(parsedCapacity) || parsedCapacity < 500 || parsedCapacity > 50000) {
      setFeedback({ tone: 'error', text: 'Rated capacity must be between 500W and 50000W' });
      return;
    }

    setFeedback({ tone: 'saving', text: 'Applying configuration...' });

    try {
      const payload = {
        tariff_rate: parsedTariff,
        simulation_mode: Boolean(isSim),
        selected_com_port: selectedPort || '',
        modbus_port: selectedPort || '',
        baud_rate: parsedBaud,
        slave_id: parsedSlave,
        rated_capacity_w: parsedCapacity,
        has_ct_meter: Boolean(hasCtMeter),
        meter_model: meterModel,
        meter_slave_id: isNaN(parsedMeterSlave) ? 2 : parsedMeterSlave
      };
      
      const res = await onSave(payload);
      if (res && res.success === false) {
        setFeedback({ tone: 'error', text: res.error || 'Failed to save settings' });
      } else {
        setFeedback({ tone: 'success', text: 'Configuration applied successfully!' });
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      setFeedback({ tone: 'error', text: err.message || 'Error updating settings' });
    }
  };

  const portsList = Array.isArray(availablePorts) ? availablePorts : [];

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-container">
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
          {feedback.text && (
            <div className={`status-feedback-banner ${feedback.tone}`}>
              {feedback.tone === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span>{feedback.text}</span>
            </div>
          )}

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

          {/* Setting 3: Hardware COM Port & RS485 Bus Parameters */}
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

            <div className="grid-two-cols-settings" style={{ marginTop: '14px' }}>
              <div>
                <label className="field-sublabel" style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  Modbus Baud Rate
                </label>
                <select
                  className="modal-select-input font-mono"
                  value={baudRate}
                  onChange={(e) => setBaudRate(e.target.value)}
                  disabled={isSim}
                >
                  <option value="4800">4800 Baud</option>
                  <option value="9600">9600 Baud (Havells Default)</option>
                  <option value="19200">19200 Baud</option>
                  <option value="38400">38400 Baud</option>
                </select>
              </div>
              <div>
                <label className="field-sublabel" style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  Inverter Slave ID
                </label>
                <input
                  type="number"
                  min="1"
                  max="247"
                  className="modal-text-input font-mono"
                  value={slaveId}
                  onChange={(e) => setSlaveId(e.target.value)}
                  disabled={isSim}
                />
              </div>
            </div>
          </div>

          {/* Setting 4: External Bidirectional CT Meter (PCC) */}
          <div className="setting-field-card">
            <div className="field-label-row">
              <div className="flex-align gap-6">
                <ShieldCheck size={15} className="text-cyan" />
                <label className="field-title">External Bidirectional CT Meter (PCC)</label>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={hasCtMeter}
                  onChange={(e) => setHasCtMeter(e.target.checked)}
                />
                <span className="slider-round"></span>
              </label>
            </div>
            <p className="field-desc">
              {hasCtMeter ? (
                <>External smart meter enabled on secondary Modbus Slave ID. Reads grid import/export at PCC to compute hardware-measured home consumption.</>
              ) : (
                <>Operating in <strong>Inverter-Only Truth Mode</strong>. Displays only verified Havells inverter measurements. Household load and grid import/export are unmeasured (no fake estimates).</>
              )}
            </p>

            {hasCtMeter && (
              <div className="grid-two-cols-settings" style={{ marginTop: '14px' }}>
                <div>
                  <label className="field-sublabel" style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                    Meter Hardware Model
                  </label>
                  <select
                    className="modal-select-input font-mono"
                    value={meterModel}
                    onChange={(e) => setMeterModel(e.target.value)}
                  >
                    <option value="Chint DDSU666">Chint DDSU666 (RS485)</option>
                    <option value="Eastron SDM120">Eastron SDM120 (Modbus)</option>
                    <option value="Acrel ACR10R">Acrel ACR10R-D16TE</option>
                    <option value="Custom Modbus">Generic Modbus Bidirectional</option>
                  </select>
                </div>
                <div>
                  <label className="field-sublabel" style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                    Meter Slave ID
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="247"
                    className="modal-text-input font-mono"
                    value={meterSlaveId}
                    onChange={(e) => setMeterSlaveId(e.target.value)}
                  />
                </div>
              </div>
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
