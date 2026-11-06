"""
SQLite Database Engine for Local Solar Telemetry & Persistent Historical Analytics
Configured specifically for APDCL Solar Net-Metering Tariffs (LT-II Domestic).
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "solar_telemetry.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.row_factory = sqlite3.Row
    return conn

# AERC FY 2026-27 Domestic-A Slab Constants (Petition No. 20 of 2025, Effective 01/04/2026)
AERC_DOMESTIC_A_SLABS = [
    {"limit": 120.0, "base_rate": 5.99, "subsidy": 1.74, "effective_rate": 4.25, "label": "0-120 units"},
    {"limit": 120.0, "base_rate": 7.29, "subsidy": 0.99, "effective_rate": 6.30, "label": "121-240 units"},
    {"limit": 60.0,  "base_rate": 8.19, "subsidy": 0.99, "effective_rate": 7.20, "label": "241-300 units"},
    {"limit": 200.0, "base_rate": 8.19, "subsidy": 0.79, "effective_rate": 7.40, "label": "301-500 units"},
    {"limit": float('inf'), "base_rate": 8.19, "subsidy": 0.00, "effective_rate": 8.19, "label": "> 500 units"}
]

def calculate_apdcl_lt2_bill(units_kwh: float,
                             sanctioned_kw: float = 3.0,
                             fixed_rate_per_kw: float = 70.0,
                             fpppa_per_unit: float = 0.20,
                             electricity_duty_pct: float = 5.0) -> dict:
    """
    Computes verified APDCL LT-II (Domestic-A) electricity bill under the AERC Tariff Order FY 2026-27
    (Petition No. 20 of 2025, Effective April 1, 2026).
    Includes:
    - 5 telescopic slab tiers with base AERC energy rates
    - Govt. of Assam targeted consumer subsidies
    - Net effective energy charge
    - Fixed demand charge: ₹70.00 per kW sanctioned load per month
    - FPPPA surcharge: ₹0.20 per unit (AERC FPPPA Regulations, 2024 / staggered surcharge order)
    - Assam Electricity Duty: 5.0% on (Net Energy Charge + Fixed Charge) under Assam Electricity Duty Act
    """
    units = max(0.0, float(units_kwh))
    rem = units
    slab_breakdowns = []
    total_base_energy = 0.0
    total_subsidy = 0.0
    total_net_energy = 0.0

    for slab in AERC_DOMESTIC_A_SLABS:
        u = min(rem, slab["limit"])
        rem = max(0.0, rem - u)
        base_amt = round(u * slab["base_rate"], 2)
        sub_amt = round(u * slab["subsidy"], 2)
        net_amt = round(u * slab["effective_rate"], 2)

        total_base_energy += base_amt
        total_subsidy += sub_amt
        total_net_energy += net_amt

        slab_breakdowns.append({
            "slab": slab["label"],
            "units": round(u, 2),
            "base_rate": slab["base_rate"],
            "base_amount": base_amt,
            "subsidy_rate": slab["subsidy"],
            "subsidy_amount": sub_amt,
            "effective_rate": slab["effective_rate"],
            "effective_amount": net_amt
        })
        if rem <= 0:
            break

    fixed_charge = round(sanctioned_kw * fixed_rate_per_kw, 2)
    fpppa_charge = round(units * fpppa_per_unit, 2)
    duty_base = round(total_net_energy + fixed_charge, 2)
    electricity_duty = round(duty_base * (electricity_duty_pct / 100.0), 2)
    total_bill = round(total_net_energy + fixed_charge + fpppa_charge + electricity_duty, 2)

    return {
        "units_kwh": round(units, 2),
        "slabs": slab_breakdowns,
        "base_energy_charge": round(total_base_energy, 2),
        "govt_subsidy": round(total_subsidy, 2),
        "net_energy_charge": round(total_net_energy, 2),
        "fixed_charge": fixed_charge,
        "fpppa_charge": fpppa_charge,
        "electricity_duty": electricity_duty,
        "electricity_duty_pct": electricity_duty_pct,
        "total_bill": total_bill
    }

def calculate_apdcl_net_meter_settlement(import_kwh: float, export_kwh: float,
                                         sanctioned_kw: float = 3.0,
                                         metering_mode: str = "net_metering",
                                         export_settlement_rate: float = 3.20,
                                         self_consumed_solar_kwh: float = 0.0) -> dict:
    """
    Computes verified period APDCL billing settlement under AERC Regulations:
    
    1. Net Metering (Residential <= 10 kWp - AERC Grid Interactive Solar PV Systems Regulations):
       - Net Units = Import - Export (1:1 physical unit netting)
       - If Net Units > 0 (Net Import): Only Net Units are billed telescopically across slabs + fixed + FPPPA + duty.
       - If Net Units <= 0 (Net Export/Surplus): Billed units = 0. Fixed charge (₹70/kW) + 5% duty still applies.
         Surplus units are banked 1:1 into next month within the Financial Year (April-March).
         At FY-end (March 31), accumulated surplus is settled at AERC APPC benchmark (₹3.20/kWh).
    
    2. Gross Metering / EXIM (Net Billing):
       - Gross Import billed at full retail domestic tariff (all slabs, fixed charge, FPPPA, duty).
       - Gross Export receives feed-in credit at APPC benchmark (₹3.20/kWh).
       - Net Payable = max(0, Gross Retail Bill - Export Monetary Credit).
    
    3. Counterfactual Baseline:
       - Total household consumption without solar = Import + Self-Consumed Solar.
       - Baseline bill computed to calculate true monetary return / savings.
    
    Strictly classified as an ESTIMATE separate from official APDCL bills.
    """
    imp = max(0.0, float(import_kwh))
    exp = max(0.0, float(export_kwh))
    
    tariff_cfg = get_tariff_config()
    s_kw = float(sanctioned_kw or tariff_cfg.get("sanctioned_load_kw", 3.0))
    fixed_rate = float(tariff_cfg.get("fixed_charge_per_kw", 70.0))
    fpppa_rate = float(tariff_cfg.get("fpppa_rate", 0.20))
    duty_pct = float(tariff_cfg.get("electricity_duty_pct", 5.0))
    settle_rate = float(export_settlement_rate or tariff_cfg.get("export_settlement_rate", 3.20))
    
    net_units = round(imp - exp, 2)
    fixed_charge = round(s_kw * fixed_rate, 2)
    duty_on_fixed = round(fixed_charge * (duty_pct / 100.0), 2)
    
    # Baseline comparison: Without solar, household imports all consumption
    hypothetical_load = round(imp + max(0.0, float(self_consumed_solar_kwh)), 2)
    without_solar_calc = calculate_apdcl_lt2_bill(
        hypothetical_load, s_kw, fixed_rate, fpppa_rate, duty_pct
    )
    bill_without_solar = without_solar_calc["total_bill"]
    
    if metering_mode == "gross_metering":
        # Gross Metering (EXIM): Gross import billed at full retail, export credited at feed-in
        import_bill = calculate_apdcl_lt2_bill(imp, s_kw, fixed_rate, fpppa_rate, duty_pct)
        export_credit = round(exp * settle_rate, 2)
        net_payable = round(max(0.0, import_bill["total_bill"] - export_credit), 2)
        estimated_savings = round(max(0.0, bill_without_solar - net_payable), 2)
        
        return {
            "metering_mode": "gross_metering",
            "metering_title": "Gross Metering (EXIM / Net Billing)",
            "import_kwh": imp,
            "export_kwh": exp,
            "net_units": net_units,
            "import_bill": import_bill,
            "base_energy_charge": import_bill["base_energy_charge"],
            "govt_subsidy": import_bill["govt_subsidy"],
            "net_energy_charge": import_bill["net_energy_charge"],
            "fixed_charge": fixed_charge,
            "fpppa_charge": import_bill["fpppa_charge"],
            "electricity_duty": import_bill["electricity_duty"],
            "export_credit_inr": export_credit,
            "export_settlement_rate": settle_rate,
            "banked_surplus_kwh": 0.0,
            "surplus_credit_inr": 0.0,
            "estimated_net_bill": net_payable,
            "bill_without_solar": bill_without_solar,
            "estimated_savings_inr": estimated_savings,
            "hypothetical_load_kwh": hypothetical_load,
            "is_estimate": True,
            "tariff_order_ref": tariff_cfg.get("tariff_order_ref"),
            "tariff_effective_date": tariff_cfg.get("tariff_effective_date"),
            "regulations_ref": tariff_cfg.get("regulations_ref"),
            "duty_act_ref": tariff_cfg.get("duty_act_ref"),
            "disclaimer": "EXIM calculation based on AERC approved feed-in tariff. Actual APDCL bill may include taxes and adjustments."
        }
    
    # Standard: Net Metering (1:1 Energy Banking with APPC Surplus Settlement)
    if net_units > 0:
        # Net Import: Telescopic slabs applied on net billed units
        billed_calc = calculate_apdcl_lt2_bill(net_units, s_kw, fixed_rate, fpppa_rate, duty_pct)
        estimated_bill = billed_calc["total_bill"]
        banked_surplus = 0.0
        surplus_credit = 0.0
        slab_detail = billed_calc
    else:
        # Net Export / Surplus: No energy charge, only fixed demand charge + duty on fixed
        estimated_bill = round(fixed_charge + duty_on_fixed, 2)
        banked_surplus = round(abs(net_units), 2)
        surplus_credit = round(banked_surplus * settle_rate, 2)
        slab_detail = {
            "units_kwh": 0.0,
            "slabs": [],
            "base_energy_charge": 0.0,
            "govt_subsidy": 0.0,
            "net_energy_charge": 0.0,
            "fixed_charge": fixed_charge,
            "fpppa_charge": 0.0,
            "electricity_duty": duty_on_fixed,
            "electricity_duty_pct": duty_pct,
            "total_bill": estimated_bill
        }

    estimated_savings = round(max(0.0, bill_without_solar - estimated_bill + surplus_credit), 2)

    return {
        "metering_mode": "net_metering",
        "metering_title": "Net Metering (1:1 Energy Banking)",
        "import_kwh": imp,
        "export_kwh": exp,
        "net_units": net_units,
        "is_net_import": net_units > 0,
        "is_net_surplus": net_units <= 0,
        "slab_detail": slab_detail,
        "base_energy_charge": slab_detail["base_energy_charge"],
        "govt_subsidy": slab_detail["govt_subsidy"],
        "net_energy_charge": slab_detail["net_energy_charge"],
        "fixed_charge": fixed_charge,
        "fpppa_charge": slab_detail["fpppa_charge"],
        "electricity_duty": slab_detail["electricity_duty"],
        "banked_surplus_kwh": banked_surplus,
        "export_settlement_rate": settle_rate,
        "surplus_credit_inr": surplus_credit,
        "estimated_net_bill": estimated_bill,
        "bill_without_solar": bill_without_solar,
        "estimated_savings_inr": estimated_savings,
        "hypothetical_load_kwh": hypothetical_load,
        "is_estimate": True,
        "tariff_order_ref": tariff_cfg.get("tariff_order_ref"),
        "tariff_effective_date": tariff_cfg.get("tariff_effective_date"),
        "regulations_ref": tariff_cfg.get("regulations_ref"),
        "duty_act_ref": tariff_cfg.get("duty_act_ref"),
        "disclaimer": "Calculated under AERC Net-Metering Regulations (1:1 Banking). Official APDCL bills may reflect meter reading cycles, billing adjustments, and applicable government duties."
    }

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Telemetry readings table (raw samples)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        active_power REAL,       -- Watts
        pv1_voltage REAL,        -- Volts
        pv1_current REAL,        -- Amps
        pv1_power REAL,          -- Watts
        pv2_voltage REAL,        -- Volts
        pv2_current REAL,        -- Amps
        pv2_power REAL,          -- Watts
        grid_voltage REAL,       -- Volts (Phase 1)
        grid_current REAL,       -- Amps
        grid_frequency REAL,     -- Hz
        today_energy REAL,       -- kWh
        total_energy REAL,       -- kWh
        module_temp REAL,        -- °C
        inner_temp REAL,         -- °C
        bus_voltage REAL,        -- Volts
        status TEXT,             -- 'Normal', 'Standby', 'Fault'
        reactive_power REAL,
        power_factor REAL,
        apparent_power REAL,
        total_dc_power REAL,
        pv1_insulation REAL,
        pv2_insulation REAL,
        pv_n_insulation REAL,
        gfci_leakage REAL,
        dci_injection REAL,
        today_runtime_hrs REAL,
        total_runtime_hrs REAL,
        inverter_efficiency REAL,
        home_load REAL,
        grid_import REAL,
        grid_export REAL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(timestamp);")
    
    # 2. Daily summary table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_summary (
        date TEXT PRIMARY KEY,       -- YYYY-MM-DD
        energy_kwh REAL,             -- Total kWh produced
        peak_power REAL,             -- Max Watts
        sunlight_hours REAL,         -- Hours active
        co2_saved_kg REAL,           -- kg of CO2 avoided
        earnings_inr REAL,           -- Rupee value based on APDCL
        apdcl_slab_offset TEXT       -- Slab Tier offset (e.g. 'Slab 3: >240 Units @ ₹7.65')
    );
    """)
    
    # 3. System Configuration table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)
    
    # 4. APDCL Meter Readings table (Manual sync from LCD / myBijulee)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS apdcl_meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_date TEXT NOT NULL,         -- YYYY-MM-DD
        billing_start_date TEXT,           -- YYYY-MM-DD (optional)
        billing_end_date TEXT,             -- YYYY-MM-DD (optional)
        import_kwh REAL NOT NULL,          -- Cumulative Grid Import (kWh)
        export_kwh REAL NOT NULL,          -- Cumulative Grid Export (kWh)
        source TEXT DEFAULT 'Manual LCD',   -- 'Physical Meter LCD', 'myBijulee', 'Official Bill'
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_meter_reading_date ON apdcl_meter_readings(reading_date);")
    
    # APDCL Tariff & Hardware defaults
    default_configs = {
        "tariff_rate": "7.65",                 # Highest APDCL displaced tier rate
        "apdcl_circle": "APDCL",
        "apdcl_subdivision": "APDCL Domestic",
        "apdcl_tariff_category": "LT-II Domestic (Net Metered)",
        "co2_factor": "0.82",                  # kg CO2 per kWh
        "inverter_model": "Havells Enviro Pro GTi",
        "inverter_sn": "AFDOALB2PNAPJ78",
        "rated_capacity_w": "3300",            # 3.3 kW system
        "simulation_mode": "false",            # Honest zero state when hardware offline
        "selected_com_port": "",
        "baud_rate": "9600",
        "slave_id": "1",
        "has_ct_meter": "false",               # Default false: Inverter-Only mode without external CT meter
        "meter_model": "None",
        "meter_slave_id": "2",
        "metering_mode": "net_metering",       # 'net_metering' (1:1 energy banking) or 'gross_metering' (EXIM)
        "sanctioned_load_kw": "3.0",           # Sanctioned connected load (kW)
        "fixed_charge_per_kw": "70.0",         # Fixed charge per kW per month (AERC FY 2026-27)
        "fpppa_rate": "0.20",                  # FPPPA adjustment (₹/kWh, AERC 2024-26 order)
        "electricity_duty_pct": "5.0",         # Assam Electricity Duty (5.0% on Energy + Fixed)
        "export_settlement_rate": "3.20",      # AERC APPC benchmark surplus export rate (₹/kWh)
        "tariff_rate": "8.19",                 # APDCL peak slab tariff
        "tariff_order_ref": "AERC Tariff Order on APDCL Petition No. 20 of 2025 (FY 2026-27)",
        "tariff_effective_date": "2026-04-01",
        "consumer_category": "LT-II: Domestic-A (> 0.5 kW to < 5 kW)"
    }
    
    for k, v in default_configs.items():
        cursor.execute("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)", (k, v))
        
    # Also ensure updated AERC FY 2026-27 values are populated if older values were present
    cursor.execute("""
    UPDATE config SET value = 'AERC Tariff Order on APDCL Petition No. 20 of 2025 (FY 2026-27)'
    WHERE key = 'tariff_order_ref';
    """)
    cursor.execute("""
    UPDATE config SET value = '2026-04-01'
    WHERE key = 'tariff_effective_date' AND value LIKE '%2024%';
    """)
    cursor.execute("""
    UPDATE config SET value = '70.0'
    WHERE key = 'fixed_charge_per_kw' AND value = '75.0';
    """)
    cursor.execute("""
    UPDATE config SET value = '0.20'
    WHERE key = 'fpppa_rate' AND value = '0.30';
    """)

    # Always ensure simulation mode is false by default so real hardware data is captured
    cursor.execute("""
    UPDATE config SET value = 'false'
    WHERE key = 'simulation_mode';
    """)

    # Clean up legacy fake simulation rows for today if energy was hardcoded 14.85
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("""
    UPDATE daily_summary
    SET energy_kwh = 0.0, peak_power = 0.0, earnings_inr = 0.0, co2_saved_kg = 0.0, sunlight_hours = 0.0
    WHERE date = ? AND (energy_kwh = 14.85 OR peak_power = 0.0);
    """, (today_str,))
        
    conn.commit()
    conn.close()

def get_today_accumulated_kwh() -> float:
    """Returns today's genuine accumulated solar energy (kWh) from SQLite."""
    today_str = datetime.now().strftime("%Y-%m-%d")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT energy_kwh FROM daily_summary WHERE date = ?;", (today_str,))
    row = cursor.fetchone()
    conn.close()
    return float(row["energy_kwh"]) if row and row["energy_kwh"] is not None else 0.0

def cleanup_old_telemetry(days: int = 7):
    """Prunes raw 1-second/5-second telemetry rows older than N days while preserving daily_summary indefinitely."""
    conn = get_connection()
    cursor = conn.cursor()
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d 00:00:00")
    cursor.execute("DELETE FROM telemetry WHERE timestamp < ?;", (cutoff,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted > 0:
        print(f"[Database] Pruned {deleted} expired telemetry rows older than {cutoff}.")

def record_telemetry(data: dict):
    conn = get_connection()
    cursor = conn.cursor()
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    cursor.execute("""
    INSERT INTO telemetry (
        timestamp, active_power, pv1_voltage, pv1_current, pv1_power,
        pv2_voltage, pv2_current, pv2_power, grid_voltage, grid_current,
        grid_frequency, today_energy, total_energy, module_temp, inner_temp,
        bus_voltage, status, reactive_power, power_factor, apparent_power,
        total_dc_power, pv1_insulation, pv2_insulation, pv_n_insulation,
        gfci_leakage, dci_injection, today_runtime_hrs, total_runtime_hrs,
        inverter_efficiency, home_load, grid_import, grid_export
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        now_str,
        data.get("active_power"),
        data.get("pv1_voltage"),
        data.get("pv1_current"),
        data.get("pv1_power"),
        data.get("pv2_voltage"),
        data.get("pv2_current"),
        data.get("pv2_power"),
        data.get("grid_voltage"),
        data.get("grid_current"),
        data.get("grid_frequency"),
        data.get("today_energy"),
        data.get("total_energy"),
        data.get("module_temp"),
        data.get("inner_temp"),
        data.get("bus_voltage"),
        data.get("status", "Offline"),
        data.get("reactive_power"),
        data.get("power_factor"),
        data.get("apparent_power"),
        data.get("total_dc_power"),
        data.get("pv1_insulation"),
        data.get("pv2_insulation"),
        data.get("pv_n_insulation"),
        data.get("gfci_leakage"),
        data.get("dci_injection"),
        data.get("today_runtime_hrs"),
        data.get("total_runtime_hrs"),
        data.get("inverter_efficiency"),
        data.get("home_load"),
        data.get("grid_import"),
        data.get("grid_export")
    ))
    
    today_energy = data.get("today_energy")
    if today_energy is not None:
        try:
            today_kwh = float(today_energy)
            if today_kwh > 0:
                peak_power = float(data.get("active_power") or 0.0)
                co2 = round(today_kwh * 0.82, 2)
                tariff = float(get_config_value("tariff_rate") or 7.65)
                earnings = round(today_kwh * tariff, 2)
                runtime_hrs = float(data.get("today_runtime_hrs") or 0.0)
                
                cursor.execute("""
                INSERT INTO daily_summary (date, energy_kwh, peak_power, sunlight_hours, co2_saved_kg, earnings_inr, apdcl_slab_offset)
                VALUES (?, ?, ?, ?, ?, ?, 'Inverter Measured')
                ON CONFLICT(date) DO UPDATE SET
                    energy_kwh = MAX(energy_kwh, excluded.energy_kwh),
                    peak_power = MAX(peak_power, excluded.peak_power),
                    sunlight_hours = MAX(sunlight_hours, excluded.sunlight_hours),
                    co2_saved_kg = excluded.co2_saved_kg,
                    earnings_inr = excluded.earnings_inr;
                """, (today_str, today_kwh, peak_power, runtime_hrs, co2, earnings))
        except (ValueError, TypeError):
            pass
    
    conn.commit()
    conn.close()

def get_config_value(key: str, default: str = ""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM config WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default

def set_config_value(key: str, value: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def get_today_readings():
    """
    Returns today's downsampled readings using sargable range query indexed by idx_telemetry_ts.
    """
    today_start = datetime.now().strftime("%Y-%m-%d 00:00:00")
    tomorrow_start = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d 00:00:00")
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        strftime('%H:%M', timestamp) as time_slot,
        ROUND(AVG(active_power), 1) as avg_power,
        ROUND(AVG(pv1_power), 1) as avg_pv1,
        ROUND(AVG(pv2_power), 1) as avg_pv2,
        ROUND(AVG(grid_voltage), 1) as avg_voltage,
        ROUND(AVG(module_temp), 1) as avg_temp
    FROM telemetry 
    WHERE timestamp >= ? AND timestamp < ?
    GROUP BY strftime('%Y-%m-%d %H', timestamp), (cast(strftime('%M', timestamp) as integer) / 5)
    ORDER BY timestamp ASC;
    """, (today_start, tomorrow_start))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_recent_telemetry(limit: int = 100):
    """Returns the most recent raw telemetry samples for diagnostics/logs table."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM telemetry 
    ORDER BY id DESC 
    LIMIT ?;
    """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_daily_history(days: int = 30):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT date, energy_kwh, peak_power, sunlight_hours, co2_saved_kg, earnings_inr, apdcl_slab_offset
    FROM daily_summary
    ORDER BY date DESC
    LIMIT ?;
    """, (days,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    rows.reverse()
    return rows

def get_monthly_summary():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        strftime('%Y-%m', date) as month,
        ROUND(SUM(energy_kwh), 1) as monthly_kwh,
        ROUND(SUM(earnings_inr), 2) as monthly_savings,
        ROUND(MAX(peak_power), 1) as max_peak_power,
        COUNT(date) as days_recorded
    FROM daily_summary
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month DESC
    LIMIT 12;
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_overall_summary():
    """
    Computes system lifetime, monthly, and today's yield dynamically without hardcoded fallback constants.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT 
        COALESCE(SUM(energy_kwh), 0.0) as total_kwh, 
        COALESCE(SUM(earnings_inr), 0.0) as total_earnings, 
        COALESCE(SUM(co2_saved_kg), 0.0) as total_co2 
    FROM daily_summary;
    """)
    agg = cursor.fetchone()
    
    cur_month = datetime.now().strftime("%Y-%m")
    cursor.execute("""
    SELECT 
        COALESCE(SUM(energy_kwh), 0.0) as m_kwh, 
        COALESCE(SUM(earnings_inr), 0.0) as m_earnings 
    FROM daily_summary 
    WHERE date LIKE ?;
    """, (f"{cur_month}%",))
    m_agg = cursor.fetchone()
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT energy_kwh FROM daily_summary WHERE date = ?;", (today_str,))
    today_row = cursor.fetchone()
    today_kwh = float(today_row["energy_kwh"]) if today_row else 0.0
    
    cursor.execute("SELECT * FROM telemetry ORDER BY id DESC LIMIT 1;")
    latest = cursor.fetchone()
    conn.close()
    
    total_kwh = float(agg["total_kwh"])
    month_kwh = float(m_agg["m_kwh"])
    month_earnings = float(m_agg["m_earnings"])
    trees_planted = round(total_kwh * 0.82 / 21.77, 1)
    
    has_ct = get_config_value("has_ct_meter", "false") == "true"
    
    return {
        "lifetime_kwh": round(total_kwh, 2) if total_kwh > 0 else None,
        "lifetime_earnings": round(float(agg["total_earnings"]), 2) if total_kwh > 0 else None,
        "month_kwh": round(month_kwh, 1) if month_kwh > 0 else None,
        "month_earnings": round(month_earnings, 2) if month_kwh > 0 else None,
        "today_kwh": round(today_kwh, 2) if today_kwh > 0 else None,
        "lifetime_co2_kg": round(float(agg["total_co2"]), 2) if total_kwh > 0 else None,
        "trees_equivalent": trees_planted if total_kwh > 0 else None,
        "has_ct_meter": has_ct,
        "latest": dict(latest) if latest else {}
    }

def add_meter_reading(reading_date: str, import_kwh: float, export_kwh: float,
                      billing_start: str = None, billing_end: str = None,
                      source: str = "Physical Meter LCD", notes: str = "") -> dict:
    """
    Validates and persists a manual APDCL bi-directional meter reading.
    Validations:
    - import_kwh and export_kwh must be non-negative.
    - billing_end must not be before billing_start if both provided.
    - Validates date format (YYYY-MM-DD).
    """
    try:
        r_date = datetime.strptime(reading_date, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Invalid reading date '{reading_date}'. Expected format YYYY-MM-DD.")
        
    b_start = None
    b_end = None
    if billing_start:
        try:
            b_start = datetime.strptime(billing_start, "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid billing start date '{billing_start}'. Expected format YYYY-MM-DD.")
    if billing_end:
        try:
            b_end = datetime.strptime(billing_end, "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid billing end date '{billing_end}'. Expected format YYYY-MM-DD.")
            
    if b_start and b_end and b_end < b_start:
        raise ValueError("Billing end date cannot be earlier than billing start date.")

    imp = float(import_kwh)
    exp = float(export_kwh)
    if imp < 0 or exp < 0:
        raise ValueError("Meter readings cannot be negative.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO apdcl_meter_readings (
        reading_date, billing_start_date, billing_end_date,
        import_kwh, export_kwh, source, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (r_date, b_start, b_end, imp, exp, source, notes))
    
    row_id = cursor.lastrowid
    conn.commit()
    
    cursor.execute("SELECT * FROM apdcl_meter_readings WHERE id = ?;", (row_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

def get_meter_readings():
    """Returns all recorded APDCL meter readings ordered chronologically (newest first)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM apdcl_meter_readings
    ORDER BY reading_date DESC, id DESC;
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def delete_meter_reading(reading_id: int) -> bool:
    """Deletes an APDCL meter reading record by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM apdcl_meter_readings WHERE id = ?;", (reading_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_meter_sync_summary() -> dict:
    """
    Computes reconciliation metrics between verified Inverter generation and APDCL meter readings.
    Calculates estimated household consumption and self-consumption ONLY when energy balance is valid.
    Flags impossible or inconsistent readings cleanly.
    """
    readings = get_meter_readings()
    count = len(readings)
    
    if count == 0:
        return {
            "has_readings": False,
            "readings_count": 0,
            "latest": None,
            "previous": None,
            "reconciliation": None
        }
        
    latest = readings[0]
    if count == 1:
        return {
            "has_readings": True,
            "readings_count": 1,
            "latest": latest,
            "previous": None,
            "reconciliation": {
                "status": "Awaiting Second Reading",
                "message": "Enter at least 2 meter readings across different dates to calculate period consumption and grid export."
            }
        }
        
    # Chronological: previous reading is index 1
    previous = readings[1]
    
    d_latest = datetime.strptime(latest["reading_date"], "%Y-%m-%d")
    d_prev = datetime.strptime(previous["reading_date"], "%Y-%m-%d")
    
    # Ensure d_latest >= d_prev for delta calculation
    if d_latest < d_prev:
        d_latest, d_prev = d_prev, d_latest
        r_start, r_end = latest, previous
    else:
        r_start, r_end = previous, latest

    days_elapsed = max(1, (d_latest - d_prev).days)
    delta_import = round(float(r_end["import_kwh"]) - float(r_start["import_kwh"]), 2)
    delta_export = round(float(r_end["export_kwh"]) - float(r_start["export_kwh"]), 2)
    
    # Fetch verified solar generation between start date and end date
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT COALESCE(SUM(energy_kwh), 0.0) as solar_kwh, COUNT(*) as days_logged
    FROM daily_summary
    WHERE date >= ? AND date <= ?;
    """, (r_start["reading_date"], r_end["reading_date"]))
    sol_row = cursor.fetchone()
    conn.close()
    
    solar_kwh = round(float(sol_row["solar_kwh"]), 2)
    days_logged = int(sol_row["days_logged"])
    
    # Validation & Reconciliation
    flags = []
    is_valid = True
    
    if delta_import < 0:
        flags.append(f"Cumulative Import decreased by {abs(delta_import):.2f} kWh (meter change or reading typo).")
        is_valid = False
        
    if delta_export < 0:
        flags.append(f"Cumulative Export decreased by {abs(delta_export):.2f} kWh (meter change or reading typo).")
        is_valid = False
        
    if is_valid and delta_export > solar_kwh and solar_kwh > 0:
        flags.append(f"APDCL Export ({delta_export:.2f} kWh) exceeds verified inverter generation ({solar_kwh:.2f} kWh). Check entered dates or readings.")
        is_valid = False
        
    reconciliation = {
        "period_start": r_start["reading_date"],
        "period_end": r_end["reading_date"],
        "days_elapsed": days_elapsed,
        "days_logged": days_logged,
        "delta_import_kwh": delta_import,
        "delta_export_kwh": delta_export,
        "solar_generated_kwh": solar_kwh,
        "is_valid": is_valid,
        "flags": flags,
        "is_estimate": True  # Strict directive requirement: calculations are estimates
    }
    
    if is_valid:
        self_consumed = round(max(0.0, solar_kwh - delta_export), 2)
        home_consumption = round(self_consumed + delta_import, 2)
        self_consumption_pct = round((self_consumed / solar_kwh * 100), 1) if solar_kwh > 0 else 0.0
        solar_fraction_pct = round((self_consumed / home_consumption * 100), 1) if home_consumption > 0 else 0.0
        
        reconciliation.update({
            "estimated_self_consumed_kwh": self_consumed,
            "estimated_household_consumption_kwh": home_consumption,
            "self_consumption_ratio_pct": self_consumption_pct,
            "solar_fraction_pct": solar_fraction_pct,
            "daily_avg_consumption_kwh": round(home_consumption / days_elapsed, 2),
            "net_grid_import_kwh": round(max(0.0, delta_import - delta_export), 2),
            "net_grid_export_kwh": round(max(0.0, delta_export - delta_import), 2)
        })
        
    return {
        "has_readings": True,
        "readings_count": count,
        "latest": latest,
        "previous": previous,
        "reconciliation": reconciliation
    }

def get_tariff_config() -> dict:
    """Returns verified APDCL & AERC tariff parameters from SQLite config."""
    return {
        "metering_mode": get_config_value("metering_mode", "net_metering"),
        "sanctioned_load_kw": float(get_config_value("sanctioned_load_kw", "3.0")),
        "fixed_charge_per_kw": float(get_config_value("fixed_charge_per_kw", "70.0")),
        "fpppa_rate": float(get_config_value("fpppa_rate", "0.20")),
        "electricity_duty_pct": float(get_config_value("electricity_duty_pct", "5.0")),
        "export_settlement_rate": float(get_config_value("export_settlement_rate", "3.20")),
        "tariff_rate": float(get_config_value("tariff_rate", "8.19")),
        "tariff_order_ref": get_config_value("tariff_order_ref", "AERC Tariff Order on APDCL Petition No. 20 of 2025 (FY 2026-27)"),
        "tariff_effective_date": get_config_value("tariff_effective_date", "2026-04-01"),
        "regulations_ref": "AERC (Grid Interactive Solar PV Systems) Regulations, 2015 & Amendments",
        "fpppa_reg_ref": "AERC (Fuel and Power Purchase Price Adjustment Surcharge) Regulations, 2024",
        "duty_act_ref": "Assam Electricity Duty Act (5.0%)",
        "consumer_category": "LT-II: Domestic-A (> 0.5 kW to < 5 kW)",
        "slabs": [
            {"slab": "Slab 1 (0-120 units)", "base_rate": 5.99, "subsidy": 1.74, "effective_rate": 4.25},
            {"slab": "Slab 2 (121-240 units)", "base_rate": 7.29, "subsidy": 0.99, "effective_rate": 6.30},
            {"slab": "Slab 3 (241-300 units)", "base_rate": 8.19, "subsidy": 0.99, "effective_rate": 7.20},
            {"slab": "Slab 4 (301-500 units)", "base_rate": 8.19, "subsidy": 0.79, "effective_rate": 7.40},
            {"slab": "Slab 5 (> 500 units)", "base_rate": 8.19, "subsidy": 0.00, "effective_rate": 8.19}
        ]
    }

def set_tariff_config(cfg: dict) -> dict:
    """Updates verified tariff parameters in config table."""
    for k, v in cfg.items():
        if k in [
            "metering_mode", "sanctioned_load_kw", "fixed_charge_per_kw",
            "fpppa_rate", "electricity_duty_pct", "export_settlement_rate",
            "tariff_rate", "tariff_order_ref", "tariff_effective_date"
        ]:
            set_config_value(k, str(v))
    return get_tariff_config()

def get_apdcl_billing_reconciliation() -> dict:
    """
    Computes financial bill reconciliation based on verified APDCL meter readings and tariff order.
    Returns estimated net payable bill, baseline bill without solar, and net savings.
    """
    sync_summary = get_meter_sync_summary()
    tariff_cfg = get_tariff_config()
    
    if not sync_summary.get("has_readings") or not sync_summary.get("reconciliation"):
        return {
            "has_reconciliation": False,
            "tariff_config": tariff_cfg,
            "message": "Enter at least 2 APDCL meter readings to compute verified billing reconciliation."
        }
        
    rec = sync_summary["reconciliation"]
    if not rec.get("is_valid"):
        return {
            "has_reconciliation": False,
            "tariff_config": tariff_cfg,
            "energy_reconciliation": rec,
            "message": "Billing reconciliation unavailable while energy balance contains inconsistencies."
        }
        
    settlement = calculate_apdcl_net_meter_settlement(
        import_kwh=rec["delta_import_kwh"],
        export_kwh=rec["delta_export_kwh"],
        sanctioned_kw=tariff_cfg["sanctioned_load_kw"],
        metering_mode=tariff_cfg["metering_mode"],
        export_settlement_rate=tariff_cfg["export_settlement_rate"],
        self_consumed_solar_kwh=rec.get("estimated_self_consumed_kwh", 0.0)
    )
    
    return {
        "has_reconciliation": True,
        "energy_reconciliation": rec,
        "settlement": settlement,
        "tariff_config": tariff_cfg
    }
