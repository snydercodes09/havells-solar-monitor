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

def calculate_apdcl_lt2_bill(units_kwh: float, sanctioned_kw: float = 3.0, fixed_rate_per_kw: float = 75.0, fpppa_per_unit: float = 0.30) -> dict:
    """
    Computes APDCL LT-II Domestic net-metered electricity bill using telescopic slabs:
    - Slab 1 (0–120 kWh): ₹5.40 / kWh
    - Slab 2 (121–240 kWh): ₹6.65 / kWh
    - Slab 3 (> 240 kWh): ₹7.65 / kWh
    - Fixed demand charge: ₹75.00 per kW sanctioned load
    - FPPPA (Fuel Price Adjustment): ₹0.30 / kWh
    """
    units = max(0.0, float(units_kwh))
    slab1_units = min(units, 120.0)
    slab2_units = max(0.0, min(units - 120.0, 120.0))
    slab3_units = max(0.0, units - 240.0)
    
    rate_slab1 = 5.40
    rate_slab2 = 6.65
    rate_slab3 = 7.65
    
    slab1_amt = slab1_units * rate_slab1
    slab2_amt = slab2_units * rate_slab2
    slab3_amt = slab3_units * rate_slab3
    energy_charge = slab1_amt + slab2_amt + slab3_amt
    
    fixed_charge = sanctioned_kw * fixed_rate_per_kw
    fpppa_charge = units * fpppa_per_unit
    total_bill = round(energy_charge + fixed_charge + fpppa_charge, 2)
    
    return {
        "units_kwh": round(units, 2),
        "slab1_units": round(slab1_units, 2),
        "slab1_rate": rate_slab1,
        "slab1_amount": round(slab1_amt, 2),
        "slab2_units": round(slab2_units, 2),
        "slab2_rate": rate_slab2,
        "slab2_amount": round(slab2_amt, 2),
        "slab3_units": round(slab3_units, 2),
        "slab3_rate": rate_slab3,
        "slab3_amount": round(slab3_amt, 2),
        "energy_charge": round(energy_charge, 2),
        "fixed_charge": round(fixed_charge, 2),
        "fpppa_charge": round(fpppa_charge, 2),
        "total_bill": total_bill
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
        "simulation_mode": "true",
        "selected_com_port": "",
        "baud_rate": "9600",
        "slave_id": "1"
    }
    
    for k, v in default_configs.items():
        cursor.execute("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)", (k, v))
        
    conn.commit()
    
    # Seed 30 days of realistic history if empty or < 10 days
    cursor.execute("SELECT COUNT(*) FROM daily_summary;")
    count = cursor.fetchone()[0]
    if count < 10:
        seed_sample_history(cursor)
        conn.commit()
        
    conn.close()

def seed_sample_history(cursor):
    """Seeds the past 30 days of realistic solar production data calibrated for APDCL region weather."""
    today = datetime.now()
    for i in range(30, 0, -1):
        dt = today - timedelta(days=i)
        d_str = dt.strftime("%Y-%m-%d")
        weather_factor = random.choices([1.0, 0.9, 0.75, 1.05], weights=[60, 20, 10, 10])[0]
        base_kwh = 14.5 * weather_factor
        kwh = round(base_kwh + random.uniform(-0.6, 0.8), 2)
        peak = round(min(3300.0, 3120 * weather_factor + random.uniform(-60, 80)), 1)
        hrs = round(6.2 * weather_factor + random.uniform(-0.3, 0.4), 1)
        co2 = round(kwh * 0.82, 2)
        earnings = round(kwh * 7.65, 2)
        
        cursor.execute("""
        INSERT OR REPLACE INTO daily_summary (date, energy_kwh, peak_power, sunlight_hours, co2_saved_kg, earnings_inr, apdcl_slab_offset)
        VALUES (?, ?, ?, ?, ?, ?, 'APDCL Slab 3 (>240 Units @ ₹7.65)')
        """, (d_str, kwh, peak, hrs, co2, earnings))

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
        data.get("active_power", 0.0),
        data.get("pv1_voltage", 0.0),
        data.get("pv1_current", 0.0),
        data.get("pv1_power", 0.0),
        data.get("pv2_voltage", 0.0),
        data.get("pv2_current", 0.0),
        data.get("pv2_power", 0.0),
        data.get("grid_voltage", 0.0),
        data.get("grid_current", 0.0),
        data.get("grid_frequency", 50.0),
        data.get("today_energy", 0.0),
        data.get("total_energy", 0.0),
        data.get("module_temp", 0.0),
        data.get("inner_temp", 0.0),
        data.get("bus_voltage", 0.0),
        data.get("status", "Normal"),
        data.get("reactive_power", 0.0),
        data.get("power_factor", 1.0),
        data.get("apparent_power", 0.0),
        data.get("total_dc_power", 0.0),
        data.get("pv1_insulation", 2800.0),
        data.get("pv2_insulation", 2800.0),
        data.get("pv_n_insulation", 3100.0),
        data.get("gfci_leakage", 8.0),
        data.get("dci_injection", 3.0),
        data.get("today_runtime_hrs", 0.0),
        data.get("total_runtime_hrs", 0.0),
        data.get("inverter_efficiency", 0.0),
        data.get("home_load", 0.0),
        data.get("grid_import", 0.0),
        data.get("grid_export", 0.0)
    ))
    
    today_energy = float(data.get("today_energy", 0.0))
    peak_power = float(data.get("active_power", 0.0))
    co2 = round(today_energy * 0.82, 2)
    tariff = float(get_config_value("tariff_rate") or 7.65)
    earnings = round(today_energy * tariff, 2)
    
    cursor.execute("""
    INSERT INTO daily_summary (date, energy_kwh, peak_power, sunlight_hours, co2_saved_kg, earnings_inr, apdcl_slab_offset)
    VALUES (?, ?, ?, 5.8, ?, ?, 'APDCL Slab 3 (>240 Units @ ₹7.65)')
    ON CONFLICT(date) DO UPDATE SET
        energy_kwh = MAX(energy_kwh, excluded.energy_kwh),
        peak_power = MAX(peak_power, excluded.peak_power),
        co2_saved_kg = excluded.co2_saved_kg,
        earnings_inr = excluded.earnings_inr;
    """, (today_str, today_energy, peak_power, co2, earnings))
    
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
    
    return {
        "lifetime_kwh": round(total_kwh, 2),
        "lifetime_earnings": round(float(agg["total_earnings"]), 2),
        "month_kwh": round(month_kwh, 1),
        "month_earnings": round(month_earnings, 2),
        "today_kwh": round(today_kwh, 2),
        "lifetime_co2_kg": round(float(agg["total_co2"]), 2),
        "trees_equivalent": trees_planted,
        "latest": dict(latest) if latest else {}
    }
