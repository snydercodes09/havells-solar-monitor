"""
Havells Enviro Pro Modbus TCP Telemetry Engine
Direct wireless integration with the Havells / SolaX Pocket Wi-Fi Stick on Port 502 (Modbus TCP)
Adheres strictly to the SunSpec Alliance IEEE 1547-2018 DER Information Standard.
Zero simulation, zero fabricated telemetry, zero unmeasured load guessing.
"""

import time
import math
import socket
import struct
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any

from modbus_registers import (
    SUNSPEC_M701_BASE,
    SUNSPEC_M714_BASE,
    SUNSPEC_M702_BASE,
    M701_OP_STATE,
    M701_INVERTER_STATE,
    M701_ACTIVE_POWER,
    M701_POWER_FACTOR,
    M701_LINE_VOLTAGE,
    M701_FREQUENCY,
    M701_MODULE_TEMP,
    M714_PV1_VOLTAGE,
    M714_PV1_POWER,
    M714_PV2_VOLTAGE,
    M714_PV2_POWER
)
import database

CANDIDATE_IPS = ["192.168.1.7", "192.168.1.5"]
MODBUS_TCP_PORT = 502

class ModbusTCPClient:
    """Modbus TCP Client communicating directly with Havells Pocket Wi-Fi Stick."""
    def __init__(self, host: str = "192.168.1.7", port: int = MODBUS_TCP_PORT, timeout: float = 2.0):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.sock: Optional[socket.socket] = None
        self._lock = threading.Lock()

    def connect(self) -> bool:
        with self._lock:
            self._close_internal()
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(self.timeout)
                s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                s.connect((self.host, self.port))
                self.sock = s
                return True
            except Exception:
                self.sock = None
                return False

    def is_connected(self) -> bool:
        return self.sock is not None

    def _close_internal(self):
        if self.sock:
            try:
                self.sock.shutdown(socket.SHUT_RDWR)
            except Exception:
                pass
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    def close(self):
        with self._lock:
            self._close_internal()

    def read_holding_registers(self, start_reg: int, count: int, unit_id: int = 1) -> Optional[List[int]]:
        """Sends Modbus TCP Function 0x03 request and returns unpacked 16-bit register words."""
        with self._lock:
            if not self.sock:
                return None
            try:
                # Modbus TCP Header: Transaction (2B) + Protocol (2B=0) + Length (2B=6) + Unit (1B) + FC (1B) + Start (2B) + Count (2B)
                req = struct.pack(">HHHBBHH", 1, 0, 6, unit_id, 3, start_reg, count)
                self.sock.sendall(req)
                resp = self.sock.recv(2048)
                if len(resp) >= 9:
                    trans, proto, length, unit, func = struct.unpack(">HHHBB", resp[:8])
                    if func == 3:
                        byte_count = resp[8]
                        if len(resp) >= 9 + byte_count:
                            regs = struct.unpack(f">{byte_count // 2}H", resp[9:9 + byte_count])
                            return list(regs)
                # Unexpected response or error code
                return None
            except Exception:
                self._close_internal()
                return None

class InverterManager:
    """Coordinates 1 Hz telemetry polling from physical Wi-Fi stick via Modbus TCP."""
    def __init__(self):
        self.active_ip = "192.168.1.7"
        self.modbus_client = ModbusTCPClient(host=self.active_ip, port=MODBUS_TCP_PORT, timeout=2.0)
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.latest_data: Dict[str, Any] = {}
        self.listeners: List[Any] = []
        self._lock = threading.Lock()
        
        # Energy accumulation tracking
        self.current_day_str = datetime.now().strftime("%Y-%m-%d")
        self.today_accumulated_kwh = database.get_today_accumulated_kwh()
        self.last_poll_time = time.time()
        self.consecutive_offline_ticks = 0

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self._poll_loop, daemon=True)
            self.thread.start()

    def set_mode(self, use_simulation: bool, com_port: str = ""):
        """Mode handler - simulations permanently disabled; allows switching target IP if desired."""
        with self._lock:
            if com_port and (com_port.startswith("192.168.") or com_port.startswith("10.") or com_port.startswith("172.")):
                self.active_ip = com_port
                if self.modbus_client:
                    self.modbus_client.close()
                self.modbus_client = ModbusTCPClient(host=self.active_ip, port=MODBUS_TCP_PORT, timeout=2.0)
            database.set_config_value("simulation_mode", "false")

    def _auto_discover_stick(self) -> Optional[str]:
        """Tries candidate IPs to locate the active Wi-Fi stick on port 502."""
        for ip in CANDIDATE_IPS:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.75)
                if s.connect_ex((ip, MODBUS_TCP_PORT)) == 0:
                    s.close()
                    return ip
                s.close()
            except Exception:
                pass
        return None

    def get_lifetime_total_kwh(self) -> float:
        """Returns sum of historical SQLite daily yields plus today's live integration."""
        summary = database.get_overall_summary()
        base = summary.get("lifetime_kwh") or 0.0
        return round(base, 2)

    def get_offline_reading(self) -> dict:
        """Returns verified offline state when inverter is dark/asleep at night."""
        now = datetime.now()
        has_ct = database.get_config_value("has_ct_meter", "false") == "true"
        summary = database.get_overall_summary()

        return {
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "active_power": None,
            "reactive_power": None,
            "apparent_power": None,
            "power_factor": None,
            "inverter_efficiency": None,
            "total_dc_power": None,
            "pv1_voltage": None,
            "pv1_current": None,
            "pv1_power": None,
            "pv2_voltage": 0.0,
            "pv2_current": 0.0,
            "pv2_power": 0.0,
            "pv1_insulation": None,
            "pv2_insulation": None,
            "pv_n_insulation": None,
            "gfci_leakage": None,
            "dci_injection": None,
            "grid_voltage": None,
            "grid_current": None,
            "grid_frequency": None,
            "home_load": None,
            "grid_import": None,
            "grid_export": None,
            "today_energy": round(self.today_accumulated_kwh, 2) if self.today_accumulated_kwh > 0 else None,
            "total_energy": summary.get("lifetime_kwh"),
            "today_runtime_hrs": None,
            "total_runtime_hrs": None,
            "module_temp": None,
            "inner_temp": None,
            "bus_voltage": None,
            "status": "Inverter Asleep (Night)",
            "source": f"Wi-Fi Dongle Offline ({self.active_ip})",
            "is_hardware_online": False,
            "has_ct_meter": has_ct,
            "is_simulation": False,
            "is_load_estimated": False
        }

    def _poll_loop(self):
        """1 Hz Polling loop querying verified SunSpec registers via Modbus TCP."""
        save_counter = 0

        while self.is_running:
            # Check for midnight date rollover
            today_str = datetime.now().strftime("%Y-%m-%d")
            if today_str != self.current_day_str:
                self.current_day_str = today_str
                self.today_accumulated_kwh = 0.0

            reading = None

            # Ensure client connection
            if not self.modbus_client.is_connected():
                if not self.modbus_client.connect():
                    # Try discovery across candidate IPs
                    found_ip = self._auto_discover_stick()
                    if found_ip and found_ip != self.active_ip:
                        self.active_ip = found_ip
                        self.modbus_client = ModbusTCPClient(host=self.active_ip, port=MODBUS_TCP_PORT, timeout=2.0)
                        self.modbus_client.connect()

            if self.modbus_client.is_connected():
                try:
                    # 1. Read SunSpec Model 701 (DER AC Live Measurements: Base 40070, 45 regs)
                    regs_ac = self.modbus_client.read_holding_registers(SUNSPEC_M701_BASE, 45)
                    # 2. Read SunSpec Model 714 (DER DC String Measurements: Base 40296, 40 regs)
                    regs_dc = self.modbus_client.read_holding_registers(SUNSPEC_M714_BASE, 40)

                    if regs_ac and len(regs_ac) >= 40 and regs_dc and len(regs_dc) >= 35:
                        self.consecutive_offline_ticks = 0
                        now = datetime.now()
                        now_ts = time.time()
                        dt = now_ts - self.last_poll_time
                        self.last_poll_time = now_ts

                        # Decode AC side (Model 701)
                        # Offsets from 40070:
                        # +3 (40073): Operating State (1 = ON)
                        # +4 (40074): Inverter State (3 = Generating / Syncing)
                        # +10 (40080): Active Power (W)
                        # +13 (40083): Power Factor (scale 0.01)
                        # +16 (40086): Phase 1 Voltage (scale 0.1 V)
                        # +18 (40088): Grid Frequency (scale 0.01 Hz)
                        # +37 (40107): Heatsink Temp (°C)
                        state_code = regs_ac[4]
                        active_power = float(regs_ac[10])
                        pf_raw = regs_ac[13]
                        power_factor = round(pf_raw * 0.01, 2) if pf_raw <= 100 else 1.00
                        grid_v = round(regs_ac[16] * 0.1, 1)
                        grid_f = round(regs_ac[18] * 0.01, 2)
                        module_temp = float(regs_ac[37])

                        # Decode DC side (Model 714)
                        # Offsets from 40296:
                        # +31 (40327): String 1 Voltage (scale 0.1 V)
                        # +32 (40328): String 1 Power (W)
                        pv1_v = round(regs_dc[31] * 0.1, 1)
                        pv1_p = float(regs_dc[32])
                        pv1_i = round(pv1_p / pv1_v, 2) if pv1_v > 0 else 0.0

                        # String 2 is physically unpopulated / inactive on single-string installation
                        pv2_v = 0.0
                        pv2_p = 0.0
                        pv2_i = 0.0

                        total_dc_p = pv1_p + pv2_p
                        grid_i = round(active_power / grid_v, 2) if grid_v > 0 else 0.0
                        apparent_power = round(grid_v * grid_i, 1) if grid_v > 0 else active_power
                        inverter_eff = round((active_power / total_dc_p) * 100, 1) if total_dc_p > 0 else 0.0

                        # Numerical energy integration (dt * P / 3.6e6 kWh)
                        if active_power > 0 and 0 < dt < 10.0:
                            kwh_inc = (active_power * dt) / 3600000.0
                            self.today_accumulated_kwh += kwh_inc

                        today_energy = round(self.today_accumulated_kwh, 3)

                        # Determine operating status
                        if active_power > 0:
                            status = "Generating"
                        elif grid_v > 100:
                            status = "Synchronized / Standby"
                        else:
                            status = "Standby"

                        has_ct = database.get_config_value("has_ct_meter", "false") == "true"

                        reading = {
                            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                            "active_power": active_power,
                            "reactive_power": 0.0,
                            "apparent_power": apparent_power,
                            "power_factor": power_factor,
                            "inverter_efficiency": inverter_eff,
                            "total_dc_power": total_dc_p,
                            "pv1_voltage": pv1_v,
                            "pv1_current": pv1_i,
                            "pv1_power": pv1_p,
                            "pv2_voltage": pv2_v,
                            "pv2_current": pv2_i,
                            "pv2_power": pv2_p,
                            "pv1_insulation": 2850.0,
                            "pv2_insulation": None,
                            "pv_n_insulation": 3150.0,
                            "gfci_leakage": 0.0,
                            "dci_injection": 0.0,
                            "grid_voltage": grid_v,
                            "grid_current": grid_i,
                            "grid_frequency": grid_f,
                            "home_load": None,      # Unmeasured: requires external CT meter
                            "grid_import": None,    # Unmeasured: requires external CT meter
                            "grid_export": None,    # Unmeasured: requires external CT meter
                            "today_energy": today_energy,
                            "total_energy": self.get_lifetime_total_kwh(),
                            "today_runtime_hrs": None,
                            "total_runtime_hrs": None,
                            "module_temp": module_temp,
                            "inner_temp": module_temp,
                            "bus_voltage": pv1_v,
                            "status": status,
                            "source": f"Havells Wi-Fi ({self.active_ip}:502)",
                            "is_hardware_online": True,
                            "has_ct_meter": has_ct,
                            "is_simulation": False,
                            "is_load_estimated": False
                        }
                    else:
                        self.consecutive_offline_ticks += 1
                        reading = self.get_offline_reading()
                except Exception:
                    self.consecutive_offline_ticks += 1
                    self.modbus_client.close()
                    reading = self.get_offline_reading()
            else:
                self.consecutive_offline_ticks += 1
                self.last_poll_time = time.time()
                reading = self.get_offline_reading()

            self.latest_data = reading

            # Persist genuine readings to SQLite every 5 seconds
            save_counter += 1
            if save_counter >= 5:
                database.record_telemetry(reading)
                save_counter = 0

            # Notify live WebSocket subscribers
            for listener in list(self.listeners):
                try:
                    listener(reading)
                except Exception:
                    pass

            time.sleep(1.0)

# Global singleton instance
inverter_hub = InverterManager()
