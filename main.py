"""
FastAPI Server & WebSocket Gateway for Havells Solar Monitor
Serves the React Glassmorphism Dashboard, provides REST endpoints & live WebSockets.
"""

import os
import json
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import serial.tools.list_ports

import database
from modbus_reader import inverter_hub

# Initialize database
database.init_db()

active_connections = set()
main_loop = None

def broadcast_reading(data: dict):
    global main_loop, active_connections
    if not active_connections or not main_loop:
        return
    payload = json.dumps(data)
    for ws in list(active_connections):
        asyncio.run_coroutine_threadsafe(send_ws(ws, payload), main_loop)

async def send_ws(ws: WebSocket, payload: str):
    try:
        await ws.send_text(payload)
    except Exception:
        active_connections.discard(ws)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop
    main_loop = asyncio.get_running_loop()
    inverter_hub.listeners.append(broadcast_reading)
    inverter_hub.start()
    print("[Startup] Havells Solar Logger background thread started.")
    yield
    inverter_hub.is_running = False
    if inverter_hub.modbus_client:
        inverter_hub.modbus_client.close()
    print("[Shutdown] Havells Solar Logger stopped.")

app = FastAPI(title="Havells Solar Monitor - APDCL", version="3.0.0", lifespan=lifespan)

# --- REST ENDPOINTS ---

@app.get("/api/status")
async def get_status():
    """Returns the latest live snapshot"""
    return inverter_hub.latest_data or inverter_hub.simulator.get_reading()

@app.get("/api/history/today")
async def get_today_history():
    """Returns today's downsampled readings for line chart"""
    return database.get_today_readings()

@app.get("/api/history/daily")
async def get_daily_history(days: int = 30):
    """Returns past N days production totals with APDCL financial savings"""
    return database.get_daily_history(days=days)

@app.get("/api/history/monthly")
async def get_monthly_history():
    """Returns monthly generation and APDCL bill savings history"""
    return database.get_monthly_summary()

@app.get("/api/metrics/summary")
async def get_metrics_summary():
    """Returns lifetime totals, this month's APDCL savings, and eco metrics"""
    return database.get_overall_summary()

@app.get("/api/ports")
async def get_com_ports():
    """Lists available serial COM ports on the host system"""
    ports = list(serial.tools.list_ports.comports())
    return [
        {
            "device": p.device,
            "description": p.description,
            "hwid": p.hwid
        }
        for p in ports
    ]

@app.get("/api/config")
async def get_config():
    """Returns current system configuration & APDCL tariff parameters"""
    return {
        "tariff_rate": float(database.get_config_value("tariff_rate", "7.65")),
        "apdcl_circle": database.get_config_value("apdcl_circle", "APDCL"),
        "apdcl_subdivision": database.get_config_value("apdcl_subdivision", "APDCL Domestic"),
        "apdcl_tariff_category": database.get_config_value("apdcl_tariff_category", "LT-II Domestic (Net Metered)"),
        "co2_factor": float(database.get_config_value("co2_factor", "0.82")),
        "inverter_model": database.get_config_value("inverter_model", "Havells Enviro Pro GTi"),
        "inverter_sn": database.get_config_value("inverter_sn", "AFDOALB2PNAPJ78"),
        "rated_capacity_w": float(database.get_config_value("rated_capacity_w", "3300")),
        "simulation_mode": database.get_config_value("simulation_mode", "true") == "true",
        "selected_com_port": database.get_config_value("selected_com_port", "")
    }

@app.post("/api/config")
async def update_config(req: Request):
    """Updates user configuration settings"""
    body = await req.json()
    if "tariff_rate" in body:
        database.set_config_value("tariff_rate", str(body["tariff_rate"]))
    if "simulation_mode" in body:
        use_sim = bool(body["simulation_mode"])
        com_port = body.get("selected_com_port", database.get_config_value("selected_com_port", ""))
        inverter_hub.set_mode(use_sim, com_port)
    if "selected_com_port" in body:
        com_port = str(body["selected_com_port"])
        use_sim = database.get_config_value("simulation_mode", "true") == "true"
        inverter_hub.set_mode(use_sim, com_port)
    return {"status": "ok", "config": await get_config()}

# --- WEBSOCKET STREAMING ---

@app.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        if inverter_hub.latest_data:
            await websocket.send_text(json.dumps(inverter_hub.latest_data))
        while True:
            msg = await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.discard(websocket)
    except Exception:
        active_connections.discard(websocket)

# --- REACT FRONTEND SERVING ---

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static_dist")
ASSETS_DIR = os.path.join(DIST_DIR, "assets")

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_react_app(full_path: str):
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Havells Solar Monitor UI Building... Please wait 5 seconds and refresh.</h1>"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
