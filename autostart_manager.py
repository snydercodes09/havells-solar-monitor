"""
Havells Enviro Pro — Windows Auto-Startup Manager
Configures optional automatic execution of the solar monitor when Windows starts.
Interacts with the user's Windows Startup directory (%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup).
"""

import os
import subprocess
from typing import Dict, Any

SHORTCUT_NAME = "HavellsSolarMonitor.lnk"

def get_startup_dir() -> str:
    """Returns the absolute path to the current user's Windows Startup folder."""
    appdata = os.getenv("APPDATA")
    if not appdata:
        raise RuntimeError("APPDATA environment variable is not defined.")
    return os.path.join(appdata, r"Microsoft\Windows\Start Menu\Programs\Startup")

def get_shortcut_path() -> str:
    """Returns the full path to the HavellsSolarMonitor.lnk shortcut in Startup folder."""
    return os.path.join(get_startup_dir(), SHORTCUT_NAME)

def is_autostart_enabled() -> bool:
    """Checks whether the autostart shortcut exists in the Windows Startup folder."""
    return os.path.exists(get_shortcut_path())

def get_autostart_status() -> Dict[str, Any]:
    """Returns detailed status of the Windows auto-start configuration."""
    enabled = is_autostart_enabled()
    mode = "disabled"
    shortcut_path = get_shortcut_path()
    
    if enabled:
        mode = "minimized"  # default
        # Probe target to determine if silent mode is configured
        try:
            ps_probe = f'(New-Object -ComObject WScript.Shell).CreateShortcut("{shortcut_path}").TargetPath'
            res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_probe], capture_output=True, text=True)
            target = res.stdout.strip().lower()
            if "wscript" in target:
                mode = "silent"
        except Exception:
            pass
            
    return {
        "enabled": enabled,
        "mode": mode,
        "shortcut_path": shortcut_path if enabled else None
    }

def set_autostart(enable: bool, mode: str = "minimized") -> bool:
    """
    Enables or disables auto-startup for the solar monitor.
    Modes:
      - 'minimized': Runs start_monitor.bat with minimized window (WindowStyle = 7).
      - 'silent': Runs start_background.vbs via wscript with hidden window.
      - 'standard': Runs start_monitor.bat with normal window (WindowStyle = 1).
    """
    shortcut_path = get_shortcut_path()
    
    if not enable:
        if os.path.exists(shortcut_path):
            try:
                os.remove(shortcut_path)
            except Exception as e:
                print(f"[Autostart] Error deleting shortcut: {e}")
                return False
        return True

    # Enable autostart
    base_dir = os.path.abspath(os.path.dirname(__file__))
    
    if mode == "silent":
        vbs_path = os.path.join(base_dir, "start_background.vbs")
        ps_cmd = (
            f'$ws = New-Object -ComObject WScript.Shell; '
            f'$s = $ws.CreateShortcut("{shortcut_path}"); '
            f'$s.TargetPath = "wscript.exe"; '
            f'$s.Arguments = \'`"{vbs_path}`"\'; '
            f'$s.WorkingDirectory = "{base_dir}"; '
            f'$s.Description = "Havells Solar Monitor (Silent Background)"; '
            f'$s.Save()'
        )
    else:
        bat_path = os.path.join(base_dir, "start_monitor.bat")
        window_style = 7 if mode == "minimized" else 1
        ps_cmd = (
            f'$ws = New-Object -ComObject WScript.Shell; '
            f'$s = $ws.CreateShortcut("{shortcut_path}"); '
            f'$s.TargetPath = "{bat_path}"; '
            f'$s.WorkingDirectory = "{base_dir}"; '
            f'$s.WindowStyle = {window_style}; '
            f'$s.Description = "Havells Solar Monitor ({mode.capitalize()})"; '
            f'$s.Save()'
        )

    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd],
            check=True,
            capture_output=True
        )
        return os.path.exists(shortcut_path)
    except Exception as e:
        print(f"[Autostart] Error creating shortcut: {e}")
        return False
