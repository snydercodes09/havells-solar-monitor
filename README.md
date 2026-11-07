# ⚡ Havells Enviro Pro — Local Solar Telemetry & APDCL Net-Metering Hub

A modern, cloud-free local monitoring dashboard and telemetry gateway for **Havells Enviro Pro GTi (3.3 kW)** on-grid solar inverters.

Engineered for direct local telemetry (via **SunSpec Modbus TCP** over the Havells Pocket Wi-Fi stick or wired **Modbus RTU RS485**), high-fidelity dark matte Solary-inspired UI, persistent SQLite storage, and complete **APDCL rooftop solar net-metering tariff analytics**.

---

## 🌟 Key Features

### 1. 100% Local, Private & Zero Fabricated Telemetry
- **Hardware Telemetry Truth:** Strictly displays genuine hardware measurements. When the inverter is offline (e.g. nighttime deep sleep or stick disconnected), the dashboard shows an honest offline zero/standby state rather than fabricating fake generation.
- **Dual Connection Modes:**
  - **Wi-Fi Stick (Modbus TCP / Port 502):** Connects wirelessly over your local LAN directly to the Havells / SolaX Pocket Wi-Fi datalogger stick using standard **SunSpec IEEE 1547-2018 DER information models**.
  - **Wired RS485 (Modbus RTU):** Direct serial communication using a USB-to-RS485 adapter wired to the inverter's bottom communication port (`9600-8-N-1`, Slave ID `0x01`).

### 2. Inverter-Only Truth Mode & CT Meter Support
- **Inverter-Only Mode (Default):** Without an external grid CT meter installed at the PCC, the dashboard honestly labels household load and grid exchange as `"Unmeasured (No CT Meter)"` and routes inverter AC power directly to the Point of Common Coupling (PCC).
- **External CT Meter Support:** Optionally configure and poll bidirectional energy meters (Chint DDSU666, Eastron SDM120, Acrel ACR10R) on a secondary Modbus address to calculate real household consumption and grid import/export.

### 3. Dark Matte Modern Dashboard Suite
- **Overview & KPI Matrix:** Live AC power (W), daily generation (kWh), monthly total (kWh), grid AC voltage (V), grid frequency (Hz), IGBT heatsink temperature (°C), and operating state.
- **Photovoltaic Array Telemetry:** Dual MPPT tracker readings (PV1 voltage/power, with automatic single-string detection for unconnected PV2) with 3D isometric SVG panels and sunlight sheen.
- **3D Power Flow Canvas:** Interactive SVG animation (isometric & schematic views) with `ResizeObserver` HiDPI canvas scaling, dynamic power flow speeds, and operating status indicators.
- **Assam APDCL Solar Net-Metering Suite:**
  - Full Assam Electricity Regulatory Commission (AERC) LT-II domestic tariff engine:
    - Tiered Energy Charges (Slab 1: 0–120 units @ ₹5.40, Slab 2: 121–240 units @ ₹6.65, Slab 3: >240 units @ ₹7.65)
    - Fixed Demand Charges (₹75 / kW / month)
    - FPPPA Fuel Surcharges (e.g. ₹0.70 / kWh)
    - Electricity Duty (5%)
    - 1:1 Net Energy Credit Banking and monthly settlement accounting
  - **APDCL Bill Reconciliation & Verification Lab:** Interactive billing calculator with pre/post-solar comparisons, derived self-consumption calculations, daily banking ledger, and baseline callout banners.
- **Persistent History & Analytics:** SQLite WAL-backed daily and monthly generation analytics, dual-axis generation vs. APDCL savings charts, search filtering, and one-click CSV export.
- **System Diagnostics & Modbus Register Inspector:** Real-time raw register table exposing 100% of SunSpec DER holding/input registers (AC voltage, grid frequency, operating status, fault codes, temperatures, and lifetime counters).
- **Multi-Device Responsiveness:** WCAG AA-compliant dark theme design system (`App.css`/`index.css`) with collapsible slide-over drawer navigation for mobile and tablet devices.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLite 3 (WAL mode), WebSockets.
- **Protocols:** SunSpec Modbus TCP (Port 502, Models 1, 701, 702, 714) & Modbus RTU (PySerial, 9600-8-N-1).
- **Frontend:** React 19, Vite, Lucide Icons, ApexCharts (Dark Theme), Vanilla CSS tokens.
- **Architecture:** Zero-cloud, local-first streaming architecture with automated 1 Hz WebSocket broadcasts.

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10 or higher
- Node.js 18+ (only needed if building or developing frontend code)

### 2. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Dashboard
Execute the Windows startup batch script:
```cmd
start_monitor.bat
```
Or start manually with Python:
```bash
python main.py
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### 4. (Optional) Frontend Development
To edit React components with Vite Hot-Module Replacement (HMR):
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.

To compile production assets into `static_dist/` (served directly by FastAPI):
```bash
npm run build
```

---

## 📡 Hardware Connection Options

### Option A: Havells Pocket Wi-Fi Stick (Recommended & Wireless)
The Havells Enviro Pro Wi-Fi stick (`SRBAN7JD3S`, OEM SolaX Pocket Wi-Fi) listens on **Port 502 (Modbus TCP)** on your local subnet:

1. Ensure the Pocket Wi-Fi stick is connected to your local 2.4 GHz Wi-Fi network.
2. The telemetry engine automatically probes candidate IPs (e.g., `192.168.1.7`, `192.168.1.5`).
3. To test or diagnose communication directly, run the built-in probe utility:
   ```bash
   python probe_wifi_stick.py
   ```

> [!NOTE]
> **Nighttime Inverter Deep Sleep:** On-grid string inverters like the Havells Enviro Pro are energized exclusively by DC electricity from solar panels (not from the 230V AC grid), ensuring zero standby power consumption at night. When the sun sets, the inverter enters deep sleep and powers off the bottom port powering the Wi-Fi stick. The dashboard automatically detects this state and displays an honest standby status.

---

### Option B: Wired USB-to-RS485 Adapter
Wire a standard USB-to-RS485 adapter to the communication port of the Havells Enviro Pro inverter:

| Inverter Port Pin | USB-RS485 Dongle |
| :--- | :--- |
| **RS485 A (Data +)** | **A+ / D+** |
| **RS485 B (Data -)** | **B- / D-** |
| **GND** | **GND** |

*Default serial settings:* `9600 bps`, `8 data bits`, `No parity`, `1 stop bit`, `Slave Address: 1`.

---

## 📊 SunSpec Modbus Register Mapping

The telemetry engine reads standard SunSpec Information Models:

| Model | Register Range | Description / Telemetry Points |
| :--- | :--- | :--- |
| **Common Model (1)** | `40000 – 40069` | Manufacturer (`Solax Power`), Inverter Model (`X1-Mini-G4`), Serial Number |
| **DER AC Live (701)** | `40070 – 40115` | Operating State, AC Active Power (W), Grid Voltage (V), Grid Frequency (Hz), Heat Sink Temp (°C) |
| **DER Nameplate (702)** | `40116 – 40140` | Rated AC Capacity (3,300 W), Apparent Power (3,300 VA), Nominal AC Voltage (230 V) |
| **DER DC Inputs (714)** | `40141 – 40170` | PV String 1 & 2 DC Voltage (V), DC Current (A), DC Power (W) |

---

## 📄 License
MIT License. Free to use and customize for residential and commercial solar installations.
