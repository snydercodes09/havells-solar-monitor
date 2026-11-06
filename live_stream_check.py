import socket
import struct
import time

ip = "192.168.1.7"
port = 502

def poll():
    s = socket.socket()
    s.settimeout(2.0)
    try:
        s.connect((ip, port))
        
        # Read Model 701 (AC Live)
        req_ac = struct.pack(">HHHBBHH", 1, 0, 6, 1, 3, 40070, 45)
        s.sendall(req_ac)
        resp_ac = s.recv(1024)
        
        # Read Model 714 (DC Live)
        req_dc = struct.pack(">HHHBBHH", 2, 0, 6, 1, 3, 40296, 40)
        s.sendall(req_dc)
        resp_dc = s.recv(1024)
        s.close()
        
        ac_regs = struct.unpack(f">{resp_ac[8]//2}H", resp_ac[9:9+resp_ac[8]])
        dc_regs = struct.unpack(f">{resp_dc[8]//2}H", resp_dc[9:9+resp_dc[8]])
        
        grid_v = round(ac_regs[16] * 0.1, 1)
        grid_f = round(ac_regs[18] * 0.01, 2)
        p_ac = ac_regs[10]
        temp = ac_regs[37]
        state = ac_regs[4]
        
        pv1_v = round(dc_regs[31] * 0.1, 1)
        pv1_w = dc_regs[32]
        pv1_i = round(pv1_w / pv1_v, 2) if pv1_v > 0 else 0.0
        eff = round((p_ac / pv1_w) * 100, 1) if pv1_w > 0 else 0.0
        
        return {
            "time": time.strftime("%H:%M:%S"),
            "state": state,
            "p_ac": p_ac,
            "grid_v": grid_v,
            "grid_f": grid_f,
            "pv1_v": pv1_v,
            "pv1_w": pv1_w,
            "pv1_i": pv1_i,
            "eff": eff,
            "temp": temp
        }
    except Exception as e:
        s.close()
        return {"error": str(e)}

print("Sampling 5 live frames from Havells Wi-Fi Stick (192.168.1.7:502):")
print(f"{'Time':8} | {'State':5} | {'Solar PV1':21} | {'Inverter AC':14} | {'Grid PCC':18} | {'Eff':5} | {'Temp':4}")
print("-" * 88)
for _ in range(5):
    d = poll()
    if "error" not in d:
        print(f"{d['time']:8} | State {d['state']} | {d['pv1_v']}V · {d['pv1_i']}A · {d['pv1_w']}W | {d['p_ac']} W AC       | {d['grid_v']}V · {d['grid_f']}Hz | {d['eff']}% | {d['temp']}C")
    else:
        print(f"Error: {d['error']}")
    time.sleep(1.0)
