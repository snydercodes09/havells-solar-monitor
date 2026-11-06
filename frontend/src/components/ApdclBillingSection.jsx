import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  IndianRupee,
  ShieldCheck,
  TrendingDown,
  Award,
  Sun,
  CheckCircle2,
  Zap,
  Calendar,
  Layers,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Info,
  Scale,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  FileText,
  BookOpen,
  HelpCircle,
  RefreshCw,
  Check
} from 'lucide-react';

export function ApdclBillingSection({
  summary = {},
  config = {},
  meterReadings = [],
  meterSyncSummary = null,
  onAddReading = async () => {},
  onDeleteReading = async () => {},
  tariffConfig = null,
  billingReconciliation = null,
  onUpdateTariffConfig = async () => {},
  onCalculateCustomBill = async () => {}
}) {
  const [activeSubTab, setActiveSubTab] = useState('sync'); // 'sync' | 'tariff'
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [importKwh, setImportKwh] = useState('');
  const [exportKwh, setExportKwh] = useState('');
  const [source, setSource] = useState('Physical Meter LCD');
  const [billingStart, setBillingStart] = useState('');
  const [billingEnd, setBillingEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState({ type: '', message: '' });

  // Interactive Custom Bill Testing Lab State (Requirement 7)
  const [calcImportKwh, setCalcImportKwh] = useState('180');
  const [calcExportKwh, setCalcExportKwh] = useState('0');
  const [calcSanctionedKw, setCalcSanctionedKw] = useState('3.0');
  const [calcMode, setCalcMode] = useState('net_metering');
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const tariffRate = Number(config?.tariff_rate) || 8.19;
  const lifetimeKwh = Number(summary?.lifetime_kwh) || 0;
  const lifetimeEarnings = Number(summary?.lifetime_earnings) || (lifetimeKwh * tariffRate);
  const lifetimeCo2 = Number(summary?.lifetime_co2_kg) || (lifetimeKwh * 0.82);
  const treesEquiv = Number(summary?.trees_equivalent) || Math.round(lifetimeCo2 / 21.77);

  const runBillCalculation = useCallback(async (impVal, expVal, loadVal, modeVal) => {
    const imp = parseFloat(impVal !== undefined ? impVal : calcImportKwh) || 0;
    const exp = parseFloat(expVal !== undefined ? expVal : calcExportKwh) || 0;
    const load = parseFloat(loadVal !== undefined ? loadVal : calcSanctionedKw) || 3.0;
    const mode = modeVal !== undefined ? modeVal : calcMode;
    setCalcLoading(true);
    try {
      if (onCalculateCustomBill) {
        const res = await onCalculateCustomBill({
          import_kwh: imp,
          export_kwh: exp,
          sanctioned_kw: load,
          metering_mode: mode,
          self_consumed_kwh: 0
        });
        if (res) {
          setCalcResult(res);
        }
      }
    } catch (e) {
      console.error('[Bill Calculation Error]', e);
    } finally {
      setCalcLoading(false);
    }
  }, [calcImportKwh, calcExportKwh, calcSanctionedKw, calcMode, onCalculateCustomBill]);

  useEffect(() => {
    runBillCalculation('180', '0', '3.0', 'net_metering');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormFeedback({ type: '', message: '' });

    const imp = parseFloat(importKwh);
    const exp = parseFloat(exportKwh);

    if (isNaN(imp) || imp < 0) {
      setFormFeedback({ type: 'error', message: 'Cumulative Import must be a valid non-negative number.' });
      return;
    }
    if (isNaN(exp) || exp < 0) {
      setFormFeedback({ type: 'error', message: 'Cumulative Export must be a valid non-negative number.' });
      return;
    }
    if (!readingDate) {
      setFormFeedback({ type: 'error', message: 'Please select a reading date.' });
      return;
    }
    if (billingStart && billingEnd && billingEnd < billingStart) {
      setFormFeedback({ type: 'error', message: 'Billing period end date cannot be earlier than start date.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onAddReading({
        reading_date: readingDate,
        import_kwh: imp,
        export_kwh: exp,
        billing_start_date: billingStart || null,
        billing_end_date: billingEnd || null,
        source: source,
        notes: notes
      });

      if (res && res.success) {
        setFormFeedback({ type: 'success', message: 'APDCL meter reading synchronized successfully!' });
        setImportKwh('');
        setExportKwh('');
        setNotes('');
        setTimeout(() => setFormFeedback({ type: '', message: '' }), 4000);
      } else {
        setFormFeedback({ type: 'error', message: res?.error || 'Failed to record meter reading.' });
      }
    } catch (err) {
      setFormFeedback({ type: 'error', message: err.message || 'Submission error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, date) => {
    if (window.confirm(`Delete APDCL meter reading recorded on ${date}?`)) {
      await onDeleteReading(id);
    }
  };

  const reconciliation = meterSyncSummary?.reconciliation;
  const hasReconciliation = reconciliation && reconciliation.delta_import_kwh !== undefined;

  return (
    <div className="apdcl-container">
      {/* Top Banner */}
      <div className="apdcl-header-banner">
        <div>
          <h3 className="apdcl-title">APDCL Solar Net-Metering & Meter Reconciliation</h3>
          <p className="apdcl-subtitle">
            Synchronize physical bi-directional meter readings (LCD / myBijulee) with verified inverter generation for truthful billing reconciliation.
          </p>
        </div>
        <div className="apdcl-badge-top">
          <ShieldCheck size={16} className="text-emerald" />
          <span>Bi-Directional Net Metering</span>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('sync')}
          style={{
            background: activeSubTab === 'sync' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
            color: activeSubTab === 'sync' ? '#38bdf8' : '#94a3b8',
            border: activeSubTab === 'sync' ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Scale size={15} /> APDCL Meter Synchronization & Reconciliation
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('tariff')}
          style={{
            background: activeSubTab === 'tariff' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)',
            color: activeSubTab === 'tariff' ? '#34d399' : '#94a3b8',
            border: activeSubTab === 'tariff' ? '1px solid #10b981' : '1px solid rgba(148, 163, 184, 0.2)',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <IndianRupee size={15} /> APDCL Tariff Slabs & Financial Return
        </button>
      </div>

      {/* ================= SUB-TAB 1: METER SYNCHRONIZATION & RECONCILIATION ================= */}
      {activeSubTab === 'sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Row: Reading Entry Form + Reconciliation Card */}
          <div className="apdcl-sync-grid">
            {/* Form: Add APDCL Reading */}
            <div className="solary-card" style={{ padding: '1.25rem' }}>
              <div className="card-header-row" style={{ marginBottom: '1rem' }}>
                <div className="flex-align gap-8">
                  <PlusCircle size={18} className="text-cyan" />
                  <h4 className="card-heading" style={{ fontSize: '1rem' }}>Record APDCL Meter Reading</h4>
                </div>
                <span className="badge-highlight font-mono" style={{ fontSize: '0.7rem' }}>Manual Entry</span>
              </div>

              {formFeedback.message && (
                <div style={{
                  padding: '0.65rem 0.9rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: formFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: formFeedback.type === 'error' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  color: formFeedback.type === 'error' ? '#fca5a5' : '#86efac'
                }}>
                  {formFeedback.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                  <span>{formFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    Reading Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={readingDate}
                    onChange={(e) => setReadingDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div className="apdcl-form-duo">
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Cumulative Import (kWh) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 1450.5"
                      value={importKwh}
                      onChange={(e) => setImportKwh(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace'
                      }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      LCD Code 01 / Import Register
                    </span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Cumulative Export (kWh) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 320.0"
                      value={exportKwh}
                      onChange={(e) => setExportKwh(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace'
                      }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      LCD Code 02 / Export Register
                    </span>
                  </div>
                </div>

                <div className="apdcl-form-duo">
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Data Source
                    </label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="Physical Meter LCD">Physical Meter LCD</option>
                      <option value="myBijulee App">myBijulee App</option>
                      <option value="APDCL Official Bill">APDCL Official Bill</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly bill reading"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: '0.5rem',
                    background: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.65rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <PlusCircle size={16} />
                  {isSubmitting ? 'Saving...' : 'Save & Synchronize Reading'}
                </button>
              </form>
            </div>

            {/* Reconciliation Card (Phase 3 & 4) */}
            <div className="solary-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header-row" style={{ marginBottom: '1rem' }}>
                <div className="flex-align gap-8">
                  <Scale size={18} className="text-emerald" />
                  <h4 className="card-heading" style={{ fontSize: '1rem' }}>Period Energy Balance Reconciliation</h4>
                </div>
                {hasReconciliation && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    background: reconciliation.is_valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: reconciliation.is_valid ? '#34d399' : '#f87171',
                    border: reconciliation.is_valid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {reconciliation.is_valid ? 'Energy Balance Valid' : 'Inconsistency Flagged'}
                  </span>
                )}
              </div>

              {hasReconciliation ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                  {/* Period Context Subtitle */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      Reconciliation Period: <strong>{reconciliation.period_start}</strong> to <strong>{reconciliation.period_end}</strong>
                    </span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      {reconciliation.days_elapsed} days ({reconciliation.days_logged} days with solar data)
                    </span>
                  </div>

                  {/* 4 Metric Strips */}
                  <div className="apdcl-kpi-3col">
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#fcd34d', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                        Verified Solar Gen
                      </span>
                      <strong style={{ fontSize: '1.25rem', color: '#f8fafc', fontFamily: 'monospace' }}>
                        {reconciliation.solar_generated_kwh.toFixed(1)}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>kWh</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                        Havells Modbus verified
                      </span>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#fca5a5', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                        APDCL Grid Import
                      </span>
                      <strong style={{ fontSize: '1.25rem', color: '#f8fafc', fontFamily: 'monospace' }}>
                        {reconciliation.delta_import_kwh.toFixed(1)}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>kWh</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                        Δ Cumulative import
                      </span>
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#86efac', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                        APDCL Grid Export
                      </span>
                      <strong style={{ fontSize: '1.25rem', color: '#f8fafc', fontFamily: 'monospace' }}>
                        {reconciliation.delta_export_kwh.toFixed(1)}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>kWh</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                        Δ Cumulative export
                      </span>
                    </div>
                  </div>

                  {/* Calculated Estimates (Phase 4 reconciliation) */}
                  {reconciliation.is_valid ? (
                    <div style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.85rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Estimated Self-Consumption:</span>
                          <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                            ESTIMATE
                          </span>
                        </div>
                        <strong style={{ fontSize: '1.15rem', color: '#38bdf8', fontFamily: 'monospace', display: 'block', marginTop: '3px' }}>
                          {reconciliation.estimated_self_consumed_kwh?.toFixed(1)} kWh
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {reconciliation.self_consumption_ratio_pct}% of total solar generation used on-site
                        </span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Estimated Household Load:</span>
                          <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                            ESTIMATE
                          </span>
                        </div>
                        <strong style={{ fontSize: '1.15rem', color: '#f8fafc', fontFamily: 'monospace', display: 'block', marginTop: '3px' }}>
                          {reconciliation.estimated_household_consumption_kwh?.toFixed(1)} kWh
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Avg {reconciliation.daily_avg_consumption_kwh} kWh/day • Solar covered {reconciliation.solar_fraction_pct}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      color: '#fca5a5',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                        <AlertTriangle size={15} /> Energy Balance Inconsistency Detected:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                        {reconciliation.flags?.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                      <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#f87171' }}>
                        Household load cannot be reconciled while energy deltas contradict physical conservation of energy.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '8px',
                  border: '1px dashed rgba(148, 163, 184, 0.2)'
                }}>
                  <Info size={32} className="text-muted" style={{ marginBottom: '0.75rem' }} />
                  <h5 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', color: '#f8fafc' }}>
                    Awaiting APDCL Meter Readings
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', maxWidth: '380px' }}>
                    Record at least 2 manual readings across different dates using the form on the left to compute verified period energy reconciliation, self-consumption ratio, and household demand.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Table: Meter Reading Log */}
          <div className="solary-card" style={{ padding: '1.25rem' }}>
            <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
              <div className="flex-align gap-8">
                <Calendar size={18} className="text-amber" />
                <h4 className="card-heading" style={{ fontSize: '1rem' }}>Synchronized APDCL Meter History Log</h4>
              </div>
              <span className="badge-highlight font-mono" style={{ fontSize: '0.7rem' }}>
                {meterReadings.length} {meterReadings.length === 1 ? 'Reading' : 'Readings'} Stored
              </span>
            </div>

            {meterReadings.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Date</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Cumulative Import</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Cumulative Export</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Source</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Billing Period</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Notes</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meterReadings.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#f8fafc' }}>
                          {r.reading_date}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: '#fca5a5' }}>
                          {Number(r.import_kwh).toFixed(2)} kWh
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: '#86efac' }}>
                          {Number(r.export_kwh).toFixed(2)} kWh
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#38bdf8' }}>
                          {r.source || 'Manual LCD'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8' }}>
                          {r.billing_start_date && r.billing_end_date ? `${r.billing_start_date} → ${r.billing_end_date}` : '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>
                          {r.notes || '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id, r.reading_date)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                            title="Delete entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.82rem' }}>
                No APDCL meter readings have been recorded yet. Enter your first meter reading above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: APDCL TARIFF SLABS & BILL RECONCILIATION ================= */}
      {activeSubTab === 'tariff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 1. Regulatory Framework & Official Sources Banner (Requirements 1, 5 & 6) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '10px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <BookOpen size={18} className="text-cyan" />
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                    AERC Tariff Order FY 2026–27 Statutory Framework
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Tariff determination issued by Assam Electricity Regulatory Commission on Petition No. 20 of 2025 (Effective 01/04/2026).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="badge-highlight font-mono" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.7rem' }}>
                  Category: LT-II Domestic-A
                </span>
                <span className="badge-highlight font-mono" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.7rem' }}>
                  True Net Metering (&lt;=10 kWp)
                </span>
                <span className="badge-highlight font-mono" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.7rem' }}>
                  Assam Duty 5.0%
                </span>
              </div>
            </div>

            {/* Mandatory Disclaimer Separating Model Estimates from Official APDCL Bills (Requirement 5) */}
            <div style={{
              background: 'rgba(2, 132, 199, 0.1)',
              borderLeft: '4px solid #0284c7',
              padding: '0.65rem 0.85rem',
              borderRadius: '0 6px 6px 0',
              fontSize: '0.75rem',
              color: '#bae6fd',
              lineHeight: 1.5
            }}>
              <strong>STATUTORY ESTIMATE NOTICE:</strong> This billing reconciliation is an analytical calculation based on the approved AERC FY 2026–27 Tariff Schedule and your manual/check-meter readings. It is strictly an <em>estimate</em> and <strong>does not represent or substitute for the official monthly electricity bill</strong> issued by Assam Power Distribution Company Limited (APDCL) via myBijulee or physical distribution meters.
            </div>
          </div>

          {/* 2. Two-Column Grid: AERC Tariff Schedule & Verified Period Settlement */}
          <div className="apdcl-tariff-grid">
            
            {/* Card A: AERC FY 2026-27 Telescopic Slab Schedule (Requirement 1 & 4) */}
            <div className="solary-card" style={{ padding: '1.25rem' }}>
              <div className="card-header-row" style={{ marginBottom: '0.85rem' }}>
                <div className="flex-align gap-8">
                  <IndianRupee size={18} className="text-amber" />
                  <h4 className="card-heading" style={{ fontSize: '0.95rem' }}>AERC FY 2026–27 Approved Slabs</h4>
                </div>
                <span className="font-mono text-muted" style={{ fontSize: '0.7rem' }}>
                  Effective 01/04/2026
                </span>
              </div>

              {/* Slabs Table */}
              <div style={{ overflowX: 'auto', marginBottom: '0.85rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Slab Tier</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>Base Tariff</th>
                      <th style={{ padding: '0.4rem 0.5rem' }}>GoA Subsidy</th>
                      <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Effective Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>Slab 1 (0–120 units)</td>
                      <td style={{ padding: '0.5rem', color: '#94a3b8' }}>₹5.99</td>
                      <td style={{ padding: '0.5rem', color: '#10b981' }}>-₹1.74</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>₹4.25 / kWh</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>Slab 2 (121–240 units)</td>
                      <td style={{ padding: '0.5rem', color: '#94a3b8' }}>₹7.29</td>
                      <td style={{ padding: '0.5rem', color: '#10b981' }}>-₹0.99</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>₹6.30 / kWh</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>Slab 3 (241–300 units)</td>
                      <td style={{ padding: '0.5rem', color: '#94a3b8' }}>₹8.19</td>
                      <td style={{ padding: '0.5rem', color: '#10b981' }}>-₹0.99</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>₹7.20 / kWh</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>Slab 4 (301–500 units)</td>
                      <td style={{ padding: '0.5rem', color: '#94a3b8' }}>₹8.19</td>
                      <td style={{ padding: '0.5rem', color: '#10b981' }}>-₹0.79</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>₹7.40 / kWh</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f8fafc' }}>Slab 5 (&gt; 500 units)</td>
                      <td style={{ padding: '0.5rem', color: '#94a3b8' }}>₹8.19</td>
                      <td style={{ padding: '0.5rem', color: '#64748b' }}>₹0.00</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>₹8.19 / kWh</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Other Statutory Charges */}
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>Fixed / Demand Charge:</span>
                  <strong style={{ color: '#f8fafc' }}>₹70.00 / kW / month</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>FPPPA Fuel Surcharge (AERC 2024-26):</span>
                  <strong style={{ color: '#f8fafc' }}>₹0.20 / kWh</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>Assam Electricity Duty:</span>
                  <strong style={{ color: '#f8fafc' }}>5.0% on (Energy + Fixed)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(148, 163, 184, 0.15)', paddingTop: '4px', marginTop: '4px' }}>
                  <span style={{ color: '#94a3b8' }}>Surplus Solar APPC Credit Benchmark:</span>
                  <strong style={{ color: '#10b981' }}>₹3.20 / kWh (AERC APPC)</strong>
                </div>
              </div>
            </div>

            {/* Card B: Period Meter Billing Reconciliation (Requirements 2, 3, 4, 5) */}
            <div className="solary-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header-row" style={{ marginBottom: '0.85rem' }}>
                <div className="flex-align gap-8">
                  <Scale size={18} className="text-cyan" />
                  <h4 className="card-heading" style={{ fontSize: '0.95rem' }}>Period Settlement Reconciliation</h4>
                </div>
                <span className="badge-highlight font-mono" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.68rem' }}>
                  [ESTIMATE]
                </span>
              </div>

              {billingReconciliation?.has_reconciliation ? (
                (() => {
                  const s = billingReconciliation.settlement;
                  const e = billingReconciliation.energy_reconciliation;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                        Period: <strong style={{ color: '#f8fafc' }}>{e.period_start}</strong> → <strong style={{ color: '#f8fafc' }}>{e.period_end}</strong> ({e.days_elapsed} days)
                        <div style={{ marginTop: '2px', color: '#38bdf8' }}>
                          Mode: <strong>{s.metering_title || 'Net Metering (1:1 Banking)'}</strong>
                        </div>
                      </div>

                      {/* Financial Comparison Highlight */}
                      <div className="apdcl-form-duo">
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.65rem', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#fca5a5', display: 'block' }}>Bill Without Solar</span>
                          <strong style={{ fontSize: '1.15rem', color: '#f87171', fontFamily: 'monospace' }}>
                            ₹{Number(s.bill_without_solar).toFixed(2)}
                          </strong>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.65rem', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#86efac', display: 'block' }}>Estimated Net Bill</span>
                          <strong style={{ fontSize: '1.15rem', color: '#4ade80', fontFamily: 'monospace' }}>
                            ₹{Number(s.estimated_net_bill).toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      {/* Estimated Savings Pill */}
                      <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#86efac', fontWeight: 600 }}>Period Monetary Savings:</span>
                        <strong style={{ fontSize: '0.95rem', color: '#4ade80', fontFamily: 'monospace' }}>
                          ₹{Number(s.estimated_savings_inr).toFixed(2)}
                        </strong>
                      </div>

                      {/* Itemized Table */}
                      <div style={{ fontSize: '0.75rem', borderTop: '1px solid rgba(148, 163, 184, 0.15)', paddingTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#94a3b8' }}>
                          <span>Net Units Billed:</span>
                          <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{s.net_units > 0 ? `${s.net_units} kWh` : '0.00 kWh (Banked)'}</strong>
                        </div>
                        {s.banked_surplus_kwh > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#10b981' }}>
                            <span>Surplus Banked 1:1:</span>
                            <strong style={{ fontFamily: 'monospace' }}>+{s.banked_surplus_kwh} kWh (₹{s.surplus_credit_inr} APPC val)</strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#94a3b8' }}>
                          <span>Net Energy Charges:</span>
                          <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(s.net_energy_charge || 0).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#94a3b8' }}>
                          <span>Fixed Demand Charge:</span>
                          <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(s.fixed_charge || 0).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#94a3b8' }}>
                          <span>FPPPA Surcharge:</span>
                          <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(s.fpppa_charge || 0).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#94a3b8' }}>
                          <span>Assam Electricity Duty (5%):</span>
                          <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(s.electricity_duty || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '8px',
                  border: '1px dashed rgba(148, 163, 184, 0.2)'
                }}>
                  <Info size={28} className="text-muted" style={{ marginBottom: '0.5rem' }} />
                  <h5 style={{ margin: '0 0 0.3rem', fontSize: '0.9rem', color: '#f8fafc' }}>
                    Awaiting Period Reconciliation
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', maxWidth: '340px' }}>
                    Record at least 2 manual meter readings in Tab 1 across different dates. Once verified, period billing settlement will calculate here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Interactive APDCL Bill Verification & Testing Lab (Requirement 7) */}
          <div className="solary-card" style={{ padding: '1.25rem' }}>
            <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
              <div className="flex-align gap-8">
                <Calculator size={18} className="text-emerald" />
                <h4 className="card-heading" style={{ fontSize: '0.95rem' }}>
                  Interactive APDCL Bill Verification Lab
                </h4>
              </div>
              <span className="badge-highlight font-mono" style={{ fontSize: '0.68rem', color: '#38bdf8' }}>
                Verification Mode
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 0, marginBottom: '1rem', lineHeight: 1.5 }}>
              Use this lab to <strong>test and verify the billing engine against your actual APDCL bill</strong> (from myBijulee or paper). Select a benchmark preset or enter custom units from an official bill to cross-check all components (slabs, GoA subsidies, demand charges, FPPPA, and electricity duty) to the exact paisa.
            </p>

            {/* Presets */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setCalcImportKwh('180');
                  setCalcExportKwh('0');
                  setCalcSanctionedKw('3.0');
                  setCalcMode('net_metering');
                  runBillCalculation('180', '0', '3.0', 'net_metering');
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '5px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Preset 1: 180 Units (No Solar)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalcImportKwh('150');
                  setCalcExportKwh('100');
                  setCalcSanctionedKw('3.0');
                  setCalcMode('net_metering');
                  runBillCalculation('150', '100', '3.0', 'net_metering');
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '5px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Preset 2: Net Import (150 Imp / 100 Exp)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalcImportKwh('100');
                  setCalcExportKwh('180');
                  setCalcSanctionedKw('3.0');
                  setCalcMode('net_metering');
                  runBillCalculation('100', '180', '3.0', 'net_metering');
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '5px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#f59e0b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Preset 3: Net Surplus (100 Imp / 180 Exp)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalcImportKwh('350');
                  setCalcExportKwh('0');
                  setCalcSanctionedKw('3.0');
                  setCalcMode('net_metering');
                  runBillCalculation('350', '0', '3.0', 'net_metering');
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '5px',
                  background: 'rgba(148, 163, 184, 0.12)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  color: '#cbd5e1',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Preset 4: 350 Units High Load
              </button>
            </div>

            {/* Input Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                  Monthly Import (kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={calcImportKwh}
                  onChange={(e) => {
                    setCalcImportKwh(e.target.value);
                    runBillCalculation(e.target.value, calcExportKwh, calcSanctionedKw, calcMode);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '5px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                  Monthly Export (kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={calcExportKwh}
                  onChange={(e) => {
                    setCalcExportKwh(e.target.value);
                    runBillCalculation(calcImportKwh, e.target.value, calcSanctionedKw, calcMode);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '5px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                  Sanctioned Load (kW)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={calcSanctionedKw}
                  onChange={(e) => {
                    setCalcSanctionedKw(e.target.value);
                    runBillCalculation(calcImportKwh, calcExportKwh, e.target.value, calcMode);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '5px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                  Metering Arrangement
                </label>
                <select
                  value={calcMode}
                  onChange={(e) => {
                    setCalcMode(e.target.value);
                    runBillCalculation(calcImportKwh, calcExportKwh, calcSanctionedKw, e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '5px',
                    color: '#f8fafc',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="net_metering">Net Metering (1:1 Banking)</option>
                  <option value="gross_metering">Gross Metering (EXIM)</option>
                </select>
              </div>
            </div>

            {/* Test Results Output */}
            {calcResult && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                    Itemized Calculation Verification
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Payable:</span>
                    <strong style={{ fontSize: '1.1rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                      ₹{Number(calcResult.estimated_net_bill).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Slab-by-slab breakdown if available */}
                {calcResult.slab_detail?.slabs && calcResult.slab_detail.slabs.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Telescopic Energy Charge Slabs:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem' }}>
                      {calcResult.slab_detail.slabs.map((sl, idx) => (
                        <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '0.45rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem' }}>
                          <span style={{ color: '#94a3b8', display: 'block' }}>{sl.slab} ({sl.units} kWh)</span>
                          <span style={{ color: '#f8fafc', fontWeight: 600 }}>₹{sl.effective_amount.toFixed(2)}</span>
                          <span style={{ color: '#64748b', fontSize: '0.65rem', marginLeft: '4px' }}>
                            (@ ₹{sl.effective_rate}/u)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Itemized Total Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>Net Energy Charge</span>
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(calcResult.net_energy_charge || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>Fixed Charge (3kW)</span>
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(calcResult.fixed_charge || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>FPPPA Surcharge</span>
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(calcResult.fpppa_charge || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.68rem' }}>Electricity Duty (5%)</span>
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>₹{Number(calcResult.electricity_duty || 0).toFixed(2)}</strong>
                  </div>
                  {calcResult.banked_surplus_kwh > 0 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                      <span style={{ color: '#86efac', display: 'block', fontSize: '0.68rem' }}>Banked Surplus</span>
                      <strong style={{ color: '#4ade80', fontFamily: 'monospace' }}>{calcResult.banked_surplus_kwh} kWh</strong>
                    </div>
                  )}
                  {calcResult.export_credit_inr > 0 && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                      <span style={{ color: '#7dd3fc', display: 'block', fontSize: '0.68rem' }}>Export Feed-in Credit</span>
                      <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>-₹{calcResult.export_credit_inr.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
