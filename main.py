"""
FastAPI Server & WebSocket Gateway for Havells Solar Monitor
Serves the React Dashboard, provides REST endpoints & live WebSockets.
"""

import os
import json
import asyncio
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import serial.tools.list_ports

import database
from modbus_reader import inverter_hub

# Initialize database schema & seeding
database.init_db()

active_connections: set[WebSocket] = set()
main_loop: Optional[asyncio.AbstractEventLoop] = None
telemetry_queue: asyncio.Queue = asyncio.Queue(maxsize=5)
broadcaster_task_handle: Optional[asyncio.Task] = None

def _enqueue_latest(data: dict):
    """Enqueues incoming telemetry from the Modbus background thread, dropping oldest if full."""
    if telemetry_queue.full():
        try:
            telemetry_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
    try:
        telemetry_queue.put_nowait(data)
    except asyncio.QueueFull:
        pass

def on_modbus_reading(data: dict):
    """Callback invoked by InverterManager background thread upon fresh telemetry sample."""
    global main_loop
    if main_loop and main_loop.is_running():
        main_loop.call_soon_threadsafe(_enqueue_latest, data)

async def ws_broadcaster_task():
    """Native coroutine consuming telemetry_queue and broadcasting to all connected WebSockets."""
    while True:
        try:
            data = await telemetry_queue.get()
            payload = json.dumps(data)
            dead_sockets = []
            
            for ws in list(active_connections):
                try:
                    await asyncio.wait_for(ws.send_text(payload), timeout=1.0)
                except Exception:
                    dead_sockets.append(ws)
                    
            for ws in dead_sockets:
                active_connections.discard(ws)
                
            telemetry_queue.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(0.05)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop, broadcaster_task_handle
    main_loop = asyncio.get_running_loop()
    
    # Run startup data retention pruning (delete raw samples older than 7 days)
    database.cleanup_old_telemetry(days=7)
    
    # Launch native queue-based broadcaster
    broadcaster_task_handle = asyncio.create_task(ws_broadcaster_task())
    
    # Wire Inverter Hub callback
    inverter_hub.listeners.append(on_modbus_reading)
    inverter_hub.start()
    print("[Startup] Havells Solar Logger & WebSocket Gateway initialized.")
    
    yield
    
    # Graceful shutdown
    inverter_hub.is_running = False
    if inverter_hub.modbus_client:
        inverter_hub.modbus_client.close()
    if broadcaster_task_handle:
        broadcaster_task_handle.cancel()
        try:
            await broadcaster_task_handle
        except asyncio.CancelledError:
            pass
    print("[Shutdown] Havells Solar Logger stopped cleanly.")

app = FastAPI(title="Havells Solar Monitor - APDCL", version="3.0.0", lifespan=lifespan)

# --- REST ENDPOINTS ---

@app.get("/api/status")
@app.get("/api/telemetry/latest")
async def get_status():
    """Returns the latest live snapshot"""
    return inverter_hub.latest_data or inverter_hub.get_offline_reading()

@app.get("/api/history/today")
@app.get("/api/telemetry/today-curve")
async def get_today_history():
    """Returns today's downsampled readings for line chart using indexed timestamp range"""
    return database.get_today_readings()

@app.get("/api/history/daily")
async def get_daily_history(days: int = 30):
    """Returns past N days production totals with APDCL financial savings"""
    return database.get_daily_history(days=days)

@app.get("/api/history/monthly")
async def get_monthly_history():
    """Returns monthly generation and APDCL bill savings history"""
    return database.get_monthly_summary()

@app.get("/api/telemetry/history")
async def get_telemetry_history(limit: int = 100):
    """Returns recent raw telemetry samples for diagnostics & log inspection"""
    return database.get_recent_telemetry(limit=limit)

@app.get("/api/metrics/summary")
@app.get("/api/analytics/summary")
async def get_metrics_summary():
    """Returns lifetime totals, this month's APDCL savings, and eco metrics dynamically from SQLite"""
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
        "selected_com_port": database.get_config_value("selected_com_port", ""),
        "modbus_port": database.get_config_value("selected_com_port", ""),
        "baud_rate": int(database.get_config_value("baud_rate", "9600")),
        "slave_id": int(database.get_config_value("slave_id", "1"))
    }

@app.post("/api/config")
async def update_config(req: Request):
    """Updates user configuration settings"""
    body = await req.json()
    if "tariff_rate" in body:
        database.set_config_value("tariff_rate", str(float(body["tariff_rate"])))
    if "rated_capacity_w" in body:
        database.set_config_value("rated_capacity_w", str(float(body["rated_capacity_w"])))
    if "baud_rate" in body:
        database.set_config_value("baud_rate", str(int(body["baud_rate"])))
    if "slave_id" in body:
        database.set_config_value("slave_id", str(int(body["slave_id"])))
        
    com_port = body.get("selected_com_port", body.get("modbus_port", None))
    use_sim = body.get("simulation_mode", None)
    
    if com_port is not None or use_sim is not None:
        curr_port = str(com_port) if com_port is not None else database.get_config_value("selected_com_port", "")
        curr_sim = bool(use_sim) if use_sim is not None else (database.get_config_value("simulation_mode", "true") == "true")
        inverter_hub.set_mode(curr_sim, curr_port)
        
    return {"status": "ok", "config": await get_config()}

# --- WEBSOCKET STREAMING ---

async def handle_websocket_client(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        if inverter_hub.latest_data:
            await websocket.send_text(json.dumps(inverter_hub.latest_data))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.discard(websocket)
    except Exception:
        active_connections.discard(websocket)

@app.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    await handle_websocket_client(websocket)

@app.websocket("/ws/telemetry")
async def websocket_telemetry_stream(websocket: WebSocket):
    await handle_websocket_client(websocket)

# --- REACT FRONTEND SERVING ---

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static_dist")
ASSETS_DIR = os.path.join(DIST_DIR, "assets")

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_react_app(full_path: str):
    # Guard against SPA catching API or WebSocket routes
    if full_path.startswith(("api/", "ws/")):
        raise HTTPException(status_code=404, detail=f"Endpoint /{full_path} not found")

    # Serve static assets (favicon.svg, icons.svg, etc.) if requested
    if full_path:
        requested_file = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)

    # Fallback to SPA index.html
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Havells Solar Monitor UI Building... Please wait 5 seconds and refresh.</h1>"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
