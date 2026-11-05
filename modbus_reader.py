"""
Havells Enviro Pro Modbus RTU Reader & Solar Simulation Engine
Handles serial RS485 communication with fallback to high-fidelity physics-based solar simulation.
"""

import time
import math
import random
import struct
import threading
from datetime import datetime
import serial
import serial.tools.list_ports

from modbus_registers import *
import database

def calculate_modbus_crc(data: bytes) -> bytes:
    """Calculates 16-bit Modbus CRC"""
    crc = 0xFFFF
    for pos in data:
        crc ^= pos
        for _ in range(8):
            if (crc & 1) != 0:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return struct.pack('<H', crc)

def compute_household_flow(active_power: float) -> tuple:
    """
    Computes residential home load, grid import, and grid export based on time of day.
    """
    now = datetime.now()
    hour = now.hour + now.minute / 60.0
    
    # Residential load profile (Watts):
    # - Morning (06:00 - 09:00): ~750W
    # - Daytime (09:00 - 17:00): ~550W
    # - Evening peak (17:00 - 23:00): ~880W (lighting, entertainment, cooking, fans)
    # - Night (23:00 - 06:00): ~420W (standby, refrigerator compressor)
    if 6.0 <= hour < 9.0:
        base = 750.0
    elif 9.0 <= hour < 17.0:
        base = 550.0
    elif 17.0 <= hour < 23.0:
        base = 880.0
    else:
        base = 420.0
        
    noise = random.uniform(-25.0, 25.0)
    home_load = round(max(250.0, base + noise), 1)
    
    if active_power >= home_load:
        grid_export = round(active_power - home_load, 1)
        grid_import = 0.0
    else:
        grid_export = 0.0
        grid_import = round(home_load - active_power, 1)
        
    return home_load, grid_import, grid_export

class ModbusRTUClient:
    def __init__(self, port: str, baudrate: int = 9600, timeout: float = 1.0):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.ser = None

    def connect(self) -> bool:
        try:
            if self.ser and self.ser.is_open:
                self.ser.close()
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=self.timeout
            )
            return True
        except Exception as e:
            print(f"[ModbusRTU] Failed to open {self.port}: {e}")
            self.ser = None
            return False

    def close(self):
        if self.ser and self.ser.is_open:
            self.ser.close()
            self.ser = None

    def read_holding_registers(self, slave_id: int = 1, start_reg: int = 0, count: int = 48) -> list:
        if not self.ser or not self.ser.is_open:
            raise ConnectionError("Serial port not open")

        # Function 0x03 request packet: Slave (1) + Func (3) + Start Addr (2) + Count (2)
        request = struct.pack('>BBHH', slave_id, 0x03, start_reg, count)
        request += calculate_modbus_crc(request)

        self.ser.reset_input_buffer()
        self.ser.write(request)

        # Expected response: Slave (1) + Func (1) + Byte Count (1) + 2*count bytes + CRC (2)
        expected_len = 3 + (count * 2) + 2
        response = self.ser.read(expected_len)

        if len(response) < expected_len:
            raise TimeoutError(f"Incomplete response: got {len(response)}/{expected_len} bytes")

        # Verify CRC
        recv_crc = response[-2:]
        calc_crc = calculate_modbus_crc(response[:-2])
        if recv_crc != calc_crc:
            raise ValueError("Modbus CRC mismatch")

        # Unpack registers (16-bit big-endian unsigned integers)
        reg_bytes = response[3: 3 + (count * 2)]
        registers = struct.unpack(f'>{count}H', reg_bytes)
        return list(registers)

class SolarZenithSimulator:
    """
    Simulates authentic daytime solar irradiance curve matching Havells 3.3kW inverter.
    Generates realistic dynamic variations (cloud flutter, inverter thermal dynamics, grid wobble).
    """
    def __init__(self):
        self.cumulative_kwh_today = 14.85
        self.last_update = time.time()
        self.base_total_kwh = 4820.0

    def get_reading(self) -> dict:
        now = datetime.now()
        hour = now.hour + now.minute / 60.0 + now.second / 3600.0
        dt = time.time() - self.last_update
        self.last_update = time.time()

        # Solar zenith model: active between 6:00 (6.0) and 18:30 (18.5)
        sunrise = 6.0
        sunset = 18.5
        solar_noon = 12.5

        if sunrise <= hour <= sunset:
            # Normalized solar elevation (half-sine peak)
            elevation = math.sin((hour - sunrise) / (sunset - sunrise) * math.pi)
            elevation = max(0.0, elevation)
            
            # Peak power around 3250 W (user's Havells displayed 3120 W during afternoon)
            peak_rated = 3250.0
            theoretical_power = peak_rated * (elevation ** 1.15)
            
            # Micro cloud fluctuation (+/- 2.5%)
            flutter = random.uniform(-0.025, 0.025)
            active_power = round(max(0.0, theoretical_power * (1.0 + flutter)), 1)
            
            # String distribution: PV1 ~ 52%, PV2 ~ 48%
            pv1_power = round(active_power * 0.52, 1)
            pv2_power = round(active_power * 0.48, 1)
            
            # Operating DC string voltages (typically 260V - 310V)
            pv1_voltage = round(285.0 + (elevation * 20.0) + random.uniform(-1.5, 1.5), 1)
            pv2_voltage = round(280.0 + (elevation * 20.0) + random.uniform(-1.5, 1.5), 1)
            
            pv1_current = round(pv1_power / pv1_voltage, 2) if pv1_voltage > 0 else 0.0
            pv2_current = round(pv2_power / pv2_voltage, 2) if pv2_voltage > 0 else 0.0
            
            # Inverter operating temperatures
            inner_temp = round(34.0 + (elevation * 12.0) + random.uniform(-0.3, 0.3), 1)
            module_temp = round(38.0 + (elevation * 16.0) + random.uniform(-0.4, 0.4), 1)
            status = "Normal"
        else:
            # Night time / Standby
            active_power = 0.0
            pv1_power = 0.0
            pv2_power = 0.0
            pv1_voltage = 12.0
            pv2_voltage = 12.0
            pv1_current = 0.0
            pv2_current = 0.0
            inner_temp = 28.0
            module_temp = 29.0
            status = "Standby"

        # AC Grid side
        grid_voltage = round(231.0 + random.uniform(-2.5, 2.5), 1)
        grid_current = round(active_power / grid_voltage, 2) if grid_voltage > 0 else 0.0
        grid_frequency = round(50.0 + random.uniform(-0.08, 0.08), 2)
        bus_voltage = round((pv1_voltage + pv2_voltage) * 0.65 + 340, 1) if active_power > 0 else 30.0

        # Energy accumulation
        if active_power > 0 and dt > 0:
            kwh_increment = (active_power * dt) / (3600.0 * 1000.0)
            self.cumulative_kwh_today += kwh_increment

        total_dc_power = round(pv1_power + pv2_power, 1)

        # Reactive power, Apparent power, Power Factor, and Efficiency
        if active_power > 0:
            reactive_power = round(0.02 + random.uniform(-0.01, 0.02), 2)
            apparent_power = round(math.sqrt(active_power**2 + (reactive_power * 1000)**2), 1)
            power_factor = round(min(1.0, active_power / apparent_power), 3)
            inverter_efficiency = round(min(98.1, max(95.0, (active_power / total_dc_power) * 100)), 1)
            gfci_leakage = round(8.4 + random.uniform(-1.0, 1.2), 1)
            dci_injection = round(3.5 + random.uniform(-0.6, 0.7), 1)
        else:
            reactive_power = 0.00
            apparent_power = 0.0
            power_factor = 1.000
            inverter_efficiency = 0.0
            gfci_leakage = round(2.1 + random.uniform(-0.2, 0.2), 1)
            dci_injection = 0.0

        # Safety insulation resistance (kOhms - >1000k is safe)
        pv1_insulation = round(2840.0 + random.uniform(-30, 30), 0)
        pv2_insulation = round(2790.0 + random.uniform(-30, 30), 0)
        pv_n_insulation = round(3160.0 + random.uniform(-40, 40), 0)

        # Operating running time (Hours)
        today_runtime_hrs = round(min(12.5, max(0.0, hour - sunrise)), 1) if hour >= sunrise else 0.0
        total_runtime_hrs = round(3418.0 + (self.cumulative_kwh_today / 2.5), 1)

        home_load, grid_import, grid_export = compute_household_flow(active_power)

        return {
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "active_power": active_power,
            "reactive_power": reactive_power,
            "apparent_power": apparent_power,
            "power_factor": power_factor,
            "inverter_efficiency": inverter_efficiency,
            "total_dc_power": total_dc_power,
            "pv1_voltage": pv1_voltage,
            "pv1_current": pv1_current,
            "pv1_power": pv1_power,
            "pv2_voltage": pv2_voltage,
            "pv2_current": pv2_current,
            "pv2_power": pv2_power,
            "pv1_insulation": pv1_insulation,
            "pv2_insulation": pv2_insulation,
            "pv_n_insulation": pv_n_insulation,
            "gfci_leakage": gfci_leakage,
            "dci_injection": dci_injection,
            "grid_voltage": grid_voltage,
            "grid_current": grid_current,
            "grid_frequency": grid_frequency,
            "home_load": home_load,
            "grid_import": grid_import,
            "grid_export": grid_export,
            "today_energy": round(self.cumulative_kwh_today, 2),
            "total_energy": round(self.base_total_kwh + self.cumulative_kwh_today, 1),
            "today_runtime_hrs": today_runtime_hrs,
            "total_runtime_hrs": total_runtime_hrs,
            "module_temp": module_temp,
            "inner_temp": inner_temp,
            "bus_voltage": bus_voltage,
            "status": status,
            "source": "Simulator"
        }

class InverterManager:
    """Coordinates polling loop between physical Modbus hardware and Simulator"""
    def __init__(self):
        self.simulator = SolarZenithSimulator()
        self.modbus_client = None
        self.is_running = False
        self.thread = None
        self.latest_data = {}
        self.listeners = []
        self.force_simulation = True
        self.active_com_port = ""

    def start(self):
        self.is_running = True
        self.thread = threading.Thread(target=self._poll_loop, daemon=True)
        self.thread.start()

    def set_mode(self, use_simulation: bool, com_port: str = ""):
        self.force_simulation = use_simulation
        self.active_com_port = com_port
        database.set_config_value("simulation_mode", "true" if use_simulation else "false")
        database.set_config_value("selected_com_port", com_port)
        if not use_simulation and com_port:
            self.modbus_client = ModbusRTUClient(port=com_port)
            self.modbus_client.connect()
        else:
            if self.modbus_client:
                self.modbus_client.close()
                self.modbus_client = None

    def _poll_loop(self):
        sim_pref = database.get_config_value("simulation_mode", "true") == "true"
        saved_port = database.get_config_value("selected_com_port", "")
        self.set_mode(sim_pref, saved_port)

        save_counter = 0

        while self.is_running:
            reading = None
            # Try reading real hardware if not forced to simulate
            if not self.force_simulation and self.modbus_client and self.modbus_client.ser:
                try:
                    regs = self.modbus_client.read_holding_registers(slave_id=1, start_reg=0, count=48)
                    reading = self._parse_registers(regs)
                    reading["source"] = f"Hardware ({self.active_com_port})"
                except Exception as e:
                    # Fallback to simulation if hardware poll fails
                    reading = self.simulator.get_reading()
                    reading["source"] = f"Sim (HW Error: {str(e)[:25]})"
            else:
                reading = self.simulator.get_reading()

            self.latest_data = reading

            # Persist to DB every 5 seconds
            save_counter += 1
            if save_counter >= 5:
                database.record_telemetry(reading)
                save_counter = 0

            # Notify listeners (WebSockets)
            for listener in list(self.listeners):
                try:
                    listener(reading)
                except Exception:
                    pass

            time.sleep(1.0)

    def _parse_registers(self, regs: list) -> dict:
        """Decodes raw Modbus 16-bit register array into engineering units"""
        now = datetime.now()
        pv1_v = round(regs[HAVELLS_PV_1_VOLTAGE] * ONE_DEC_UNIT, 1)
        pv1_i = round(regs[HAVELLS_PV_1_CURRENT] * TWO_DEC_UNIT, 2)
        pv2_v = round(regs[HAVELLS_PV_2_VOLTAGE] * ONE_DEC_UNIT, 1)
        pv2_i = round(regs[HAVELLS_PV_2_CURRENT] * TWO_DEC_UNIT, 2)
        pv1_p = round(regs[HAVELLS_PV_1_POWER] * MULTIPLY_TEN_UNIT, 1)
        pv2_p = round(regs[HAVELLS_PV_2_POWER] * MULTIPLY_TEN_UNIT, 1)

        active_power = round(regs[HAVELLS_SYSTEM_ACTIVE_POWER] * MULTIPLY_TEN_UNIT, 1)
        raw_reactive = regs[HAVELLS_SYSTEM_REACTIVE_POWER]
        if raw_reactive > 32767:
            raw_reactive -= 65536
        reactive_power = round(raw_reactive * TWO_DEC_UNIT, 2)

        grid_freq = round(regs[HAVELLS_GRID_FREQUENCY] * TWO_DEC_UNIT, 2)
        grid_v = round(regs[HAVELLS_PHASE_1_VOLTAGE] * ONE_DEC_UNIT, 1)
        grid_i = round(regs[HAVELLS_PHASE_1_CURRENT] * TWO_DEC_UNIT, 2)

        apparent_power = round(grid_v * grid_i, 1)
        power_factor = round(min(1.0, active_power / apparent_power), 3) if apparent_power > 0 else 1.000

        total_dc_p = round(pv1_p + pv2_p, 1)
        eff = round((active_power / total_dc_p) * 100, 1) if total_dc_p > 0 else 0.0

        # 32-bit total energy (registers 0x15 and 0x16)
        total_energy = (regs[HAVELLS_TOTAL_ENERGY_PRODUCTION] << 16) | regs[HAVELLS_TOTAL_ENERGY_PRODUCTION + 1]
        today_energy = round(regs[HAVELLS_TODAY_PRODUCTION] * TWO_DEC_UNIT, 2)

        total_runtime_hrs = (regs[HAVELLS_TOTAL_GENERATION_TIME] << 16) | regs[HAVELLS_TOTAL_GENERATION_TIME + 1]
        today_runtime_hrs = round(regs[HAVELLS_TODAY_GENERATION_TIME] * 0.1, 1)

        module_temp = regs[HAVELLS_INVERTER_MODULE_TEMP]
        inner_temp = regs[HAVELLS_INVERTER_INNER_TEMP]
        bus_voltage = regs[HAVELLS_INVERTER_BUS_VOLTAGE]

        pv1_insulation = regs[HAVELLS_PV1_INSULATION_P_TO_GND] if len(regs) > HAVELLS_PV1_INSULATION_P_TO_GND else 2800
        pv2_insulation = regs[HAVELLS_PV2_INSULATION_P_TO_GND] if len(regs) > HAVELLS_PV2_INSULATION_P_TO_GND else 2800
        pv_n_insulation = regs[HAVELLS_INSULATION_PV_N_TO_GND] if len(regs) > HAVELLS_INSULATION_PV_N_TO_GND else 3100
        gfci_leakage = round(regs[HAVELLS_GFCI_VALUE] * 1.0, 1) if len(regs) > HAVELLS_GFCI_VALUE else 8.0
        dci_injection = round(regs[HAVELLS_DCI_OF_R] * 1.0, 1) if len(regs) > HAVELLS_DCI_OF_R else 3.0

        home_load, grid_import, grid_export = compute_household_flow(active_power)

        return {
            "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
            "active_power": active_power,
            "reactive_power": reactive_power,
            "apparent_power": apparent_power,
            "power_factor": power_factor,
            "inverter_efficiency": eff,
            "total_dc_power": total_dc_p,
            "pv1_voltage": pv1_v,
            "pv1_current": pv1_i,
            "pv1_power": pv1_p,
            "pv2_voltage": pv2_v,
            "pv2_current": pv2_i,
            "pv2_power": pv2_p,
            "pv1_insulation": pv1_insulation,
            "pv2_insulation": pv2_insulation,
            "pv_n_insulation": pv_n_insulation,
            "gfci_leakage": gfci_leakage,
            "dci_injection": dci_injection,
            "grid_voltage": grid_v,
            "grid_current": grid_i,
            "grid_frequency": grid_freq,
            "home_load": home_load,
            "grid_import": grid_import,
            "grid_export": grid_export,
            "today_energy": today_energy,
            "total_energy": float(total_energy),
            "today_runtime_hrs": today_runtime_hrs,
            "total_runtime_hrs": float(total_runtime_hrs),
            "module_temp": float(module_temp),
            "inner_temp": float(inner_temp),
            "bus_voltage": float(bus_voltage),
            "status": "Normal" if active_power > 0 else "Standby"
        }

# Global singleton instance
inverter_hub = InverterManager()
