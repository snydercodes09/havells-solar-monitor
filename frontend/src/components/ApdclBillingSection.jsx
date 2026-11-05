import React from 'react';
import { IndianRupee, ShieldCheck, TrendingDown, Award, Sun, CheckCircle2 } from 'lucide-react';

export function ApdclBillingSection({ summary = {}, config = {} }) {
  const tariffRate = Number(config.tariff_rate) || 7.65;
  const monthKwh = Number(summary?.month_kwh) || 445.0;
  const monthEarnings = Math.round(monthKwh * tariffRate);
  const billWithoutSolar = Math.round(monthKwh * 8.65); // Includes fixed charges & electricity duty
  const billWithSolar = Math.max(380, billWithoutSolar - monthEarnings); // APDCL minimum fixed charge/meter rent

  const lifetimeKwh = Number(summary?.lifetime_kwh) || 4835;
  const lifetimeEarnings = Number(summary?.lifetime_earnings) || 36980;
  const lifetimeCo2 = Number(summary?.lifetime_co2_kg) || 3964;
  const treesEquiv = Number(summary?.trees_equivalent) || 182;

  return (
    <div className="apdcl-container">
      {/* Top Banner */}
      <div className="apdcl-header-banner">
        <div>
          <h3 className="apdcl-title">APDCL Solar Net-Metering</h3>
          <p className="apdcl-subtitle">
            AERC Approved LT-II Domestic Rooftop Solar Tariff Schedule • Bi-Directional Net Metering
          </p>
        </div>
        <div className="apdcl-badge-top">
          <ShieldCheck size={16} className="text-emerald" />
          <span>Active 1:1 Net Metering</span>
        </div>
      </div>

      <div className="apdcl-grid">
        {/* Card 1: APDCL Tariff Slabs */}
        <div className="slab-card">
          <div className="slab-header">
            <div className="flex-align gap-8">
              <IndianRupee className="text-amber" size={18} />
              <span className="card-heading">APDCL Domestic Tariff Slabs</span>
            </div>
            <span className="apdcl-circle-pill">APDCL LT-II</span>
          </div>

          <div className="slab-item">
            <div>
              <strong>Slab 1: 0 – 120 Units/Mo</strong>
              <div className="sub-desc">Lifeline residential allowance</div>
            </div>
            <span className="slab-rate">₹ 5.30 / unit</span>
          </div>

          <div className="slab-item">
            <div>
              <strong>Slab 2: 121 – 240 Units/Mo</strong>
              <div className="sub-desc">Standard household tier</div>
            </div>
            <span className="slab-rate">₹ 6.60 / unit</span>
          </div>

          <div className="slab-item highlight-slab">
            <div>
              <strong className="text-emerald">Slab 3: Above 240 Units/Mo</strong>
              <div className="sub-desc">Primary tier displaced by your Rooftop Solar!</div>
            </div>
            <span className="slab-rate text-emerald font-extrabold">₹ {tariffRate.toFixed(2)} / unit</span>
          </div>

          <div className="slab-note">
            * Rate incorporates basic AERC tariff order, active FPPPA (Fuel Price Adjustment), and electricity duty under APDCL.
          </div>
        </div>

        {/* Card 2: Monthly Net-Metering Impact */}
        <div className="slab-card">
          <div className="slab-header">
            <div className="flex-align gap-8">
              <TrendingDown className="text-emerald" size={18} />
              <span className="card-heading">Monthly Net-Metering Impact</span>
            </div>
            <span className="badge-highlight">1:1 Offset</span>
          </div>

          <div className="slab-item">
            <span>Expected Monthly Solar Yield:</span>
            <strong>{monthKwh.toFixed(1)} kWh / mo</strong>
          </div>

          <div className="slab-item">
            <span>APDCL Bill Without Solar:</span>
            <span className="text-rose font-bold">₹ {billWithoutSolar.toLocaleString('en-IN')} / mo</span>
          </div>

          <div className="slab-item">
            <span>Estimated APDCL Bill With Solar:</span>
            <span className="text-emerald font-bold" style={{ fontSize: '15px' }}>
              ₹ {billWithSolar.toLocaleString('en-IN')} / mo
            </span>
          </div>

          <div className="slab-item total-row">
            <span>Monthly Cash Saved in Pocket:</span>
            <strong className="text-emerald font-extrabold" style={{ fontSize: '18px' }}>
              ₹ {monthEarnings.toLocaleString('en-IN')} / mo
            </strong>
          </div>
        </div>

        {/* Card 3: Cumulative Returns & ROI */}
        <div className="slab-card">
          <div className="slab-header">
            <div className="flex-align gap-8">
              <Award className="text-purple" size={18} />
              <span className="card-heading">Lifetime Returns under APDCL</span>
            </div>
            <span className="text-purple font-bold">Cumulative</span>
          </div>

          <div className="slab-item">
            <span>Total Units Generated:</span>
            <strong>{lifetimeKwh.toLocaleString('en-IN')} kWh</strong>
          </div>

          <div className="slab-item">
            <span>Total APDCL Bill Offset:</span>
            <strong className="text-cyan font-bold" style={{ fontSize: '16px' }}>
              ₹ {Math.round(lifetimeEarnings).toLocaleString('en-IN')}
            </strong>
          </div>

          <div className="slab-item">
            <span>Clean Energy Equivalent:</span>
            <span>{lifetimeCo2.toLocaleString('en-IN')} kg CO₂ avoided</span>
          </div>

          <div className="slab-item">
            <span>Forest Equivalent:</span>
            <span className="text-emerald">🌲 {treesEquiv} Trees Planted</span>
          </div>

          <div className="slab-item total-row">
            <span>Rooftop Capital Payback:</span>
            <strong className="text-amber">~34% of 3.3kW Plant Cost Recovered</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
