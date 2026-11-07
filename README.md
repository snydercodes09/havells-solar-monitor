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

## 🚀 Quick Start & Daily Use

### 1. Requirements (First Time Only)
- Python 3.10 or higher
- Install backend dependencies once:
  ```bash
  pip install -r requirements.txt
  ```

---

## 🔄 How to Run the App Every Time (Daily Routine)

You **do not** need to install Node.js, run `npm`, or build anything for everyday monitoring. The production React dashboard is pre-compiled into `static_dist/` and served directly by FastAPI.

### Option 1: One-Click Desktop Startup (Easiest)
Simply double-click the included batch script in the project folder:
```cmd
start_monitor.bat
```
This automatically:
1. Starts the FastAPI server and WebSocket telemetry stream on port `8080`.
2. Automatically opens your default web browser to **[http://localhost:8080](http://localhost:8080)**.

---

### Option 2: Command Line Startup
If you prefer running from a terminal (PowerShell, Command Prompt, or VS Code):
```bash
cd havells-solar-monitor
python main.py
```
Then open **[http://localhost:8080](http://localhost:8080)** in any browser.

---

### Option 3: Auto-Start with Windows Boot (Set & Forget)
To have the solar monitor start automatically whenever you turn on your PC:
1. Press `Win + R`, type `shell:startup`, and hit **Enter**.
2. Right-click inside the startup folder and choose **New > Shortcut**.
3. Browse to and select `start_monitor.bat` in your project folder.
4. Click **Next > Finish**. Now your monitoring server boots automatically on startup.

---

### 📱 Viewing from Phone or Tablet on Local Wi-Fi
The dashboard is fully responsive. To view it from your phone, iPad, or another computer on the same home Wi-Fi:
1. Find your PC's local IP address (e.g. run `ipconfig` in Command Prompt — typically `192.168.1.X`).
2. Open your mobile browser and navigate to:
   ```
   http://192.168.1.X:8080
   ```
   *(Replace `192.168.1.X` with your PC's actual local IPv4 address).*

---

### ☀️ What to Expect at Sunrise & Sunset
- **Daytime (Active):** Once the sun rises and solar panels energize the inverter, the Wi-Fi stick connects to your router and live 1 Hz SunSpec telemetry streams automatically.
- **Nighttime (Deep Sleep):** The inverter turns off its display and de-energizes the Wi-Fi stick to avoid drawing grid power at night. The dashboard displays an honest standby status, continues serving historical graphs and APDCL analytics from SQLite, and **automatically reconnects at sunrise without needing a server restart**.

---

### 💻 (Optional) Frontend Development
*Only required if you want to modify React UI components or styling:*
```bash
cd frontend
npm install
npm run dev     # Starts Vite dev server with HMR at http://localhost:3000
npm run build   # Compiles changes into ../static_dist/ served by FastAPI
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
