import React, { useMemo } from 'react';
import { IndianRupee, ShieldCheck, TrendingDown, Award, Sun, CheckCircle2, Zap, FileSpreadsheet } from 'lucide-react';

function calcApdclLt2Bill(units, sanctionedKw = 3.0) {
  const u = Math.max(0, Number(units) || 0);
  const s1 = Math.min(u, 120);
  const s2 = Math.max(0, Math.min(u - 120, 120));
  const s3 = Math.max(0, u - 240);

  const r1 = 5.40;
  const r2 = 6.65;
  const r3 = 7.65;

  const energyCharge = (s1 * r1) + (s2 * r2) + (s3 * r3);
  const fixedCharge = sanctionedKw * 75.0; // ₹75/kW/month
  const fpppa = u * 0.30; // ₹0.30/kWh Fuel Price Adjustment
  const total = energyCharge + fixedCharge + fpppa;

  return {
    units: u,
    s1Units: s1,
    s1Amt: s1 * r1,
    s2Units: s2,
    s2Amt: s2 * r2,
    s3Units: s3,
    s3Amt: s3 * r3,
    energyCharge,
    fixedCharge,
    fpppa,
    total: Math.round(total)
  };
}

export function ApdclBillingSection({ summary = {}, config = {} }) {
  const tariffRate = Number(config.tariff_rate) || 7.65;
  const monthKwh = Number(summary?.month_kwh) || 445.0;
  const lifetimeKwh = Number(summary?.lifetime_kwh) || 4835;
  const lifetimeEarnings = Number(summary?.lifetime_earnings) || (lifetimeKwh * tariffRate);
  const lifetimeCo2 = Number(summary?.lifetime_co2_kg) || (lifetimeKwh * 0.82);
  const treesEquiv = Number(summary?.trees_equivalent) || Math.round(lifetimeCo2 / 21.77);

  // Baseline household consumption estimate: ~520 units/mo for standard 3.3kW domestic connection
  const estimatedBaselineLoad = Math.max(monthKwh + 75, 520);
  const netImportUnits = Math.max(0, estimatedBaselineLoad - monthKwh);

  const billWithoutSolar = useMemo(() => calcApdclLt2Bill(estimatedBaselineLoad, 3.0), [estimatedBaselineLoad]);
  const billWithSolar = useMemo(() => calcApdclLt2Bill(netImportUnits, 3.0), [netImportUnits]);
  const netMonthlySavings = Math.max(0, billWithoutSolar.total - billWithSolar.total);

  return (
    <div className="apdcl-container">
      {/* Top Banner */}
      <div className="apdcl-header-banner">
        <div>
          <h3 className="apdcl-title">APDCL Solar Net-Metering</h3>
          <p className="apdcl-subtitle">
            AERC Approved LT-II Domestic Rooftop Solar Tariff Schedule • Bi-Directional Net Metering (1:1 Energy Banking)
          </p>
        </div>
        <div className="apdcl-badge-top">
          <ShieldCheck size={16} className="text-emerald" />
          <span>Active 1:1 Net Metering</span>
        </div>
      </div>

      <div className="apdcl-grid">
        {/* Card 1: APDCL Telescopic Domestic Tariff Slabs */}
        <div className="slab-card">
          <div className="slab-header">
            <div className="flex-align gap-8">
              <IndianRupee className="text-amber" size={18} />
              <span className="card-heading">APDCL Domestic Telescopic Slabs</span>
            </div>
            <span className="apdcl-circle-pill">LT-II Domestic</span>
          </div>

          <div className="slab-item">
            <div>
              <strong>Slab 1: 0 – 120 Units/Mo</strong>
              <div className="sub-desc">Lifeline residential allowance</div>
            </div>
            <span className="slab-rate">₹ 5.40 / unit</span>
          </div>

          <div className="slab-item">
            <div>
              <strong>Slab 2: 121 – 240 Units/Mo</strong>
              <div className="sub-desc">Standard domestic band</div>
            </div>
            <span className="slab-rate">₹ 6.65 / unit</span>
          </div>

          <div className="slab-item highlight-slab">
            <div>
              <strong className="text-emerald">Slab 3: Above 240 Units/Mo</strong>
              <div className="sub-desc">Top tier displaced first by your rooftop solar!</div>
            </div>
            <span className="slab-rate text-emerald font-extrabold">₹ {tariffRate.toFixed(2)} / unit</span>
          </div>

          <div className="slab-item">
            <div>
              <strong>Fixed Demand Charge</strong>
              <div className="sub-desc">Sanctioned load connected capacity</div>
            </div>
            <span className="slab-rate">₹ 75.00 / kW / mo</span>
          </div>

          <div className="slab-item">
            <div>
              <strong>FPPPA Surcharge</strong>
              <div className="sub-desc">Fuel and Power Purchase Price Adjustment</div>
            </div>
            <span className="slab-rate">₹ 0.30 / unit</span>
          </div>

          <div className="slab-note">
            * Telescopic billing means units above 240 kWh cost ₹7.65 + ₹0.30 FPPPA. Your solar production knocks out these expensive units first.
          </div>
        </div>

        {/* Card 2: Progressive Monthly Bill Comparison */}
        <div className="slab-card">
          <div className="slab-header">
            <div className="flex-align gap-8">
              <TrendingDown className="text-emerald" size={18} />
              <span className="card-heading">Monthly Progressive Bill Offset</span>
            </div>
            <span className="badge-highlight">1:1 Net Offset</span>
          </div>

          <div className="slab-item">
            <span>Expected Monthly Solar Generation:</span>
            <strong className="text-white font-mono">{monthKwh.toFixed(1)} kWh</strong>
          </div>

          <div className="slab-item">
            <div>
              <span>APDCL Bill Without Solar ({estimatedBaselineLoad} kWh):</span>
              <div className="sub-desc font-mono" style={{ fontSize: '11px', color: '#94A3B8' }}>
                Slab 1: ₹{billWithoutSolar.s1Amt.toFixed(0)} | Slab 2: ₹{billWithoutSolar.s2Amt.toFixed(0)} | Slab 3: ₹{billWithoutSolar.s3Amt.toFixed(0)} + Demand ₹{billWithoutSolar.fixedCharge} + FPPPA ₹{billWithoutSolar.fpppa.toFixed(0)}
              </div>
            </div>
            <span className="text-rose font-bold font-mono">₹ {billWithoutSolar.total.toLocaleString('en-IN')}</span>
          </div>

          <div className="slab-item">
            <div>
              <span>APDCL Net Bill With Solar ({netImportUnits.toFixed(0)} kWh net):</span>
              <div className="sub-desc font-mono" style={{ fontSize: '11px', color: '#94A3B8' }}>
                Knocked out 100% of Slab 3 and {Math.min(120, monthKwh - 280 > 0 ? (monthKwh - 280).toFixed(0) : 0)} units of Slab 2
              </div>
            </div>
            <span className="text-emerald font-bold font-mono" style={{ fontSize: '15px' }}>
              ₹ {billWithSolar.total.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="slab-item total-row">
            <div>
              <span style={{ display: 'block', fontWeight: 600 }}>Monthly Cash Retained in Pocket:</span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Direct APDCL bill reduction</span>
            </div>
            <strong className="text-emerald font-extrabold font-mono" style={{ fontSize: '19px' }}>
              ₹ {netMonthlySavings.toLocaleString('en-IN')} / mo
            </strong>
          </div>
        </div>

        {/* Card 3: Cumulative Returns & ROI */}
        <div className="slab-card">
          <div className="slab-header">
            <div className="flex-align gap-8">
              <Award className="text-purple" size={18} />
              <span className="card-heading">Cumulative Returns & ESG Impact</span>
            </div>
            <span className="text-purple font-bold">Lifetime</span>
          </div>

          <div className="slab-item">
            <span>Total Units Generated:</span>
            <strong className="font-mono">{lifetimeKwh.toLocaleString('en-IN')} kWh</strong>
          </div>

          <div className="slab-item">
            <span>Total APDCL Bill Offset:</span>
            <strong className="text-cyan font-bold font-mono" style={{ fontSize: '16px' }}>
              ₹ {Math.round(lifetimeEarnings).toLocaleString('en-IN')}
            </strong>
          </div>

          <div className="slab-item">
            <span>Clean Energy CO₂ Avoided:</span>
            <span className="font-mono">{Math.round(lifetimeCo2).toLocaleString('en-IN')} kg</span>
          </div>

          <div className="slab-item">
            <span>Equivalent Forest Planting:</span>
            <span className="text-emerald font-bold">🌲 {treesEquiv} Trees Matured</span>
          </div>

          <div className="slab-item total-row">
            <div>
              <span style={{ display: 'block', fontWeight: 600 }}>Rooftop Capital Payback:</span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Based on ₹1.10L net plant capex</span>
            </div>
            <strong className="text-amber font-mono" style={{ fontSize: '15px' }}>
              ~{Math.min(100, Math.round((lifetimeEarnings / 110000) * 100))}% Recovered
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
