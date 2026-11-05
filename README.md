# ⚡ Havells Enviro Pro — Local Solar Telemetry & APDCL Net-Metering Hub

A modern, cloud-free local monitoring dashboard and telemetry hub for **Havells Enviro Pro GTi (3.3kW)** on-grid solar inverters.

Designed for real-time 1 Hz local RS485 Modbus RTU telemetry, high-fidelity dark matte Solary-inspired UI, persistent SQLite storage, and APDCL rooftop solar net-metering tariff analytics.

---

## 🌟 Key Features

- **100% Local & Private:** Direct serial RS485 Modbus RTU polling or Wi-Fi logger fallback with zero external cloud dependencies.
- **Dark Matte Modern Dashboard:**
  - **Overview:** 3D isometric solar array, transmission pylon & home energy cards, dual-spline generation vs. consumption chart, and real-time power cards.
  - **3D Power Flow Canvas:** Animated SVG power flows between PV array, Havells inverter, home load, and APDCL grid.
  - **Persistent History:** SQLite-backed daily and monthly generation analytics, sunshine zenith curves, multi-metric filtering, search, and CSV export.
  - **APDCL Solar Net-Metering:** Tiered LT-II billing simulation, displaced Slab 3 savings, lifetime financial returns, and CO₂ offset tracking.
  - **Interactive Settings:** In-browser RS485 COM port configuration, APDCL tariff rate updates, and physics-based solar simulation toggles.
- **FastAPI + WebSocket Gateway:** 1 Hz bi-directional live telemetry streaming.
- **Production-Ready Bundle:** Single-command startup serving the compiled React frontend directly from FastAPI on port `8080`.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLite3 (WAL mode), PySerial (Modbus RTU).
- **Frontend:** React 19, Vite, Lucide Icons, ApexCharts, Vanilla CSS with custom dark matte glassmorphism styling.
- **Protocols:** Modbus RTU over RS485 (9600-8-N-1, Slave ID 0x01).

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.10 or higher
- Node.js 18+ (only if modifying frontend code)

### 2. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Dashboard
Simply execute the Windows startup script:
```cmd
start_monitor.bat
```
Or start manually via Python:
```bash
python main.py
```
Open **[http://localhost:8080](http://localhost:8080)** in any modern browser.

### 4. (Optional) Run Frontend Dev Server
If you wish to edit React components with hot-module replacement (HMR):
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.

To compile production assets after modifying frontend code:
```bash
npm run build
```
This automatically updates `../static_dist/` served by the backend.

---

## 🔌 Hardware RS485 Connection

Wire a standard **USB-to-RS485** adapter to the communication port of the Havells Enviro Pro inverter:

| Inverter Port Pin | USB-RS485 Dongle |
| :--- | :--- |
| **RS485 A (Data +)** | **A+ / D+** |
| **RS485 B (Data -)** | **B- / D-** |
| **GND** | **GND** |

*Default serial settings:* `9600 bps`, `8 data bits`, `No parity`, `1 stop bit`, `Slave Address: 1`.

When the USB dongle is unplugged, the built-in **simulation fallback engine** automatically produces a realistic solar generation curve peaking at ~3.1 kW during peak sunshine hours.

---

## 📄 License
MIT License. Free to use and customize for residential and commercial solar installations.
