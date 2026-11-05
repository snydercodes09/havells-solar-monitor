"""
Havells Enviro Pro / GTI Solar Inverter Modbus Register Map
Based on official Modbus RTU specification (Function 0x03 - Read Holding Registers)
"""

# Scaling Units
TWO_DEC_UNIT = 0.01       # Multiply by 0.01 (divide by 100)
ONE_DEC_UNIT = 0.1        # Multiply by 0.1 (divide by 10)
NO_DEC_UNIT = 1.0         # 1:1 scale
MULTIPLY_TEN_UNIT = 10.0  # Multiply by 10

# Register Addresses (16-bit unless noted)
HAVELLS_PV_1_VOLTAGE = 0x0006   # Scale 0.1 V
HAVELLS_PV_1_CURRENT = 0x0007   # Scale 0.01 A
HAVELLS_PV_2_VOLTAGE = 0x0008   # Scale 0.1 V
HAVELLS_PV_2_CURRENT = 0x0009   # Scale 0.01 A
HAVELLS_PV_1_POWER = 0x000A     # Scale 10 W
HAVELLS_PV_2_POWER = 0x000B     # Scale 10 W

# Output Grid Registers
HAVELLS_SYSTEM_ACTIVE_POWER = 0x000C   # Scale 10 W
HAVELLS_SYSTEM_REACTIVE_POWER = 0x000D # Scale 0.01 kVAR
HAVELLS_GRID_FREQUENCY = 0x000E        # Scale 0.01 Hz
HAVELLS_PHASE_1_VOLTAGE = 0x000F       # Scale 0.1 V
HAVELLS_PHASE_1_CURRENT = 0x0010       # Scale 0.01 A
HAVELLS_PHASE_2_VOLTAGE = 0x0011       # Scale 0.1 V
HAVELLS_PHASE_2_CURRENT = 0x0012       # Scale 0.01 A
HAVELLS_PHASE_3_VOLTAGE = 0x0013       # Scale 0.1 V
HAVELLS_PHASE_3_CURRENT = 0x0014       # Scale 0.01 A

# Energy & Runtime Registers
HAVELLS_TOTAL_ENERGY_PRODUCTION = 0x0015  # 32-bit DWORD (High word 0x15, Low word 0x16), Scale 1 kWh
HAVELLS_TOTAL_GENERATION_TIME = 0x0017    # 32-bit DWORD (High word 0x17, Low word 0x18), Scale 1 Hour
HAVELLS_TODAY_PRODUCTION = 0x0019         # Scale 0.01 kWh
HAVELLS_TODAY_GENERATION_TIME = 0x001A    # Scale 1 Hour

# Inverter Internal Telemetry
HAVELLS_INVERTER_MODULE_TEMP = 0x001B     # Signed 16-bit, Scale 1 °C
HAVELLS_INVERTER_INNER_TEMP = 0x001C      # Signed 16-bit, Scale 1 °C
HAVELLS_INVERTER_BUS_VOLTAGE = 0x001D     # Scale 1 V
HAVELLS_PV1_VOLTAGE_SECONDARY = 0x001E    # Scale 0.1 V
HAVELLS_PV2_VOLTAGE_SECONDARY = 0x001F    # Scale 0.1 V
HAVELLS_PV1_INSULATION_P_TO_GND = 0x0024  # Scale 1 kOhm
HAVELLS_PV2_INSULATION_P_TO_GND = 0x0025  # Scale 1 kOhm
HAVELLS_INSULATION_PV_N_TO_GND = 0x0026   # Scale 1 kOhm
HAVELLS_GFCI_VALUE = 0x002A               # Scale 1 mA
HAVELLS_DCI_OF_R = 0x002B                 # Scale 1 mA
HAVELLS_DCI_OF_S = 0x002C                 # Scale 1 mA
HAVELLS_DCI_OF_T = 0x002D                 # Scale 1 mA

TOTAL_REGISTER_COUNT = 48

def to_signed_16(val: int) -> int:
    """Converts raw 16-bit unsigned integer to signed integer via two's complement."""
    val = val & 0xFFFF
    return val - 0x10000 if val > 0x7FFF else val

def combine_u32(high: int, low: int, word_swap: bool = False) -> int:
    """Combines two 16-bit Modbus words into a 32-bit unsigned integer."""
    if word_swap:
        return (((low & 0xFFFF) << 16) | (high & 0xFFFF)) & 0xFFFFFFFF
    return (((high & 0xFFFF) << 16) | (low & 0xFFFF)) & 0xFFFFFFFF
