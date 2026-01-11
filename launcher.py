#!/usr/bin/env python3
"""
WebLens Launcher
Starts backend, opens browser, manages lifecycle.
"""

import sys
import os
import time
import socket
import subprocess
import webbrowser
import signal
import requests
import argparse
from pathlib import Path
from typing import Optional

# Conditional import for backend mode
try:
    import uvicorn
    # If running from source, backend might not be in path yet
    # But in frozen mode, it is.
    if getattr(sys, 'frozen', False):
        # We need to add the backend directory to sys.path so that 
        # imports inside main.py (like 'import config') work.
        backend_path = os.path.join(sys._MEIPASS, 'backend')
        sys.path.insert(0, backend_path)
        from backend import main as backend_app
    else:
        # In dev, we might be running from root
        sys.path.append(os.path.join(os.getcwd(), 'backend'))
        from backend import main as backend_app
except ImportError as e:
    backend_app = None
    # We delay reporting this error until we know we need the backend
    # But for debugging now, let's print it to stderr if we are likely in frozen mode
    if getattr(sys, 'frozen', False):
        print(f"Checking Import Error: {e}", file=sys.stderr)
        # Also, let's print sys.path to be sure
        import sys
        print(f"Sys Path: {sys.path}", file=sys.stderr)
        try:
            print(f"MEIPASS: {sys._MEIPASS}", file=sys.stderr)
            print(f"MEIPASS Contents: {os.listdir(sys._MEIPASS)}", file=sys.stderr)
            print(f"Backend Contents: {os.listdir(os.path.join(sys._MEIPASS, 'backend'))}", file=sys.stderr)
        except Exception:
            pass

def open_browser_as_app(url: str) -> bool:
    """Attempt to open the URL in standalone app mode using Chromium-based browsers."""
    import shutil
    
    # Common Chromium-based browser executables
    browsers = [
        'google-chrome',
        'google-chrome-stable',
        'chromium',
        'chromium-browser',
        'brave-browser',
        'microsoft-edge',
        'microsoft-edge-stable'
    ]
    
    # On Windows, we might need different names or absolute paths
    if sys.platform == 'win32':
        browsers = ['chrome.exe', 'msedge.exe', 'brave.exe']
    elif sys.platform == 'darwin':
        # On macOS, we usually use 'open -a' or find the app path
        # But for simplification, we'll try standard names first
        pass

    for browser in browsers:
        path = shutil.which(browser)
        if path:
            try:
                # Launch in standalone app mode with custom branding
                # Note: Not using --user-data-dir to preserve user's existing login sessions
                subprocess.Popen([
                    path,
                    f"--app={url}",
                    "--class=WebLens",  # Custom window class (Linux)
                    "--name=WebLens",   # Custom window name
                    "--start-maximized",
                    "--window-size=1920,1080",
                    "--disable-features=MediaRouter",  # Disable cast
                    "--no-first-run",
                    "--no-default-browser-check"
                ], start_new_session=True)
                return True
            except Exception:
                continue
    return False


# Global process handle
backend_process: Optional[subprocess.Popen] = None

def check_backend_status(log_file: Optional[Path] = None) -> Optional[str]:
    """Check if backend process is dead and return recent logs if so"""
    if not backend_process:
        return None
    
    ret = backend_process.poll()
    if ret is not None:
        # Process died
        if log_file and log_file.exists():
            try:
                # Read last 10 lines of log
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    return "".join(lines[-20:])
            except Exception:
                return "Could not read log file"
        return f"Process exited with code {ret}"
    return None


def get_data_dir() -> Path:
    """Get platform-appropriate data directory."""
    if sys.platform == 'darwin':  # macOS
        return Path.home() / 'Library' / 'Application Support' / 'WebLens'
    elif sys.platform == 'win32':  # Windows
        appdata = os.getenv('APPDATA')
        if not appdata:
            raise RuntimeError("APPDATA environment variable not set")
        return Path(appdata) / 'WebLens'
    else:  # Linux
        return Path.home() / '.local' / 'share' / 'weblens'

def get_log_dir() -> Path:
    """Get platform-appropriate log directory."""
    if sys.platform == 'darwin':  # macOS
        return Path.home() / 'Library' / 'Logs' / 'WebLens'
    else:
        return get_data_dir() / 'logs'

def get_backend_dir() -> Path:
    """Get backend code directory (bundled with executable)."""
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        base_path = Path(sys._MEIPASS)
    else:
        # Running as script
        base_path = Path(__file__).parent
    return base_path / 'backend'

def find_available_port(start: int = 8000, end: int = 8010) -> Optional[int]:
    """Find first available port in range."""
    for port in range(start, end + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    return None

def wait_for_backend(port: int, timeout: int = 20, log_file: Optional[Path] = None) -> tuple[bool, Optional[str]]:
    """Wait for backend to respond to health check."""
    url = f"http://127.0.0.1:{port}/api/health"
    start = time.time()
    
    while time.time() - start < timeout:
        # Check if backend died efficiently
        failure = check_backend_status(log_file)
        if failure:
            return False, failure

        try:
            response = requests.get(url, timeout=1)
            if response.status_code == 200:
                return True, None
        except requests.exceptions.RequestException:
            pass
        time.sleep(0.1)
    
    return False, "Timed out waiting for health check"

def run_backend_worker(port: int, data_dir: Path):
    """Run the uvicorn server (worker mode)."""
    print(f"DEBUG: Worker starting on port {port}...")
    # Set environment variables
    os.environ['WEBLENS_DATA_DIR'] = str(data_dir)
    
    # Run uvicorn programmatically
    # We must use the app object directly
    if not backend_app:
        print("Error: Backend dependencies not found in worker process.", file=sys.stderr)
        sys.exit(1)
        
    print(f"DEBUG: Starting uvicorn with app={backend_app.app}")
    uvicorn.run(
        backend_app.app,
        host="127.0.0.1",
        port=port,
        log_level="info"
    )

def start_backend(port: int, data_dir: Path, log_dir: Path) -> subprocess.Popen:
    """Start backend subprocess."""
    backend_dir = get_backend_dir()
    
    # Prepare environment
    env = os.environ.copy()
    env['WEBLENS_DATA_DIR'] = str(data_dir)
    env['PYTHONUNBUFFERED'] = '1'
    
    if getattr(sys, 'frozen', False):
        # FROZEN MODE: Spawn ourselves with --backend flag
        cmd = [sys.executable, "--backend", "--port", str(port)]
        cwd = os.path.dirname(sys.executable) # Run from executable dir
    else:
        # SOURCE MODE: Run standard uvicorn command via python
        # We use the venv python if available, or sys.executable
        cmd = [
            sys.executable,
            "-m", "uvicorn",
            "main:app",
            "--host", "127.0.0.1",
            "--port", str(port),
            "--log-level", "info"
        ]
        cwd = backend_dir

    # Open log file
    log_file = log_dir / "weblens.log"
    # Rotate log if too large (simple check)
    if log_file.exists() and log_file.stat().st_size > 10 * 1024 * 1024:
        try:
            log_file.unlink()
        except Exception:
            pass
            
    try:
        log_fp = open(log_file, "a")
    except Exception as e:
        print(f"Failed to open log file: {e}", file=sys.stderr)
        log_fp = subprocess.DEVNULL

    # Start process
    return subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        stdout=log_fp,
        stderr=subprocess.STDOUT, # Merge stderr into stdout
        # Hide console window on Windows
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0,
        # Don't close fds so the child can write to the file
        close_fds=False if sys.platform == 'win32' else True 
    )

def show_error(message: str) -> None:
    """Show error message to user."""
    print(f"\n{'=' * 60}", file=sys.stderr)
    print(f"WebLens Error", file=sys.stderr)
    print(f"{'=' * 60}", file=sys.stderr)
    print(f"\n{message}\n", file=sys.stderr)
    print(f"{'=' * 60}\n", file=sys.stderr)

def shutdown_handler(signum, frame) -> None:
    """Handle graceful shutdown."""
    global backend_process
    
    # Writing to stdout from signal handler can cause reentrant crashes
    # Use direct write for safety
    msg = b"\nShutting down WebLens...\n"
    os.write(sys.stdout.fileno(), msg)
    
    if backend_process:
        backend_process.terminate()
        try:
            backend_process.wait(timeout=5)
            os.write(sys.stdout.fileno(), b"Backend stopped cleanly\n")
        except subprocess.TimeoutExpired:
            os.write(sys.stdout.fileno(), b"Backend did not stop, forcing...\n")
            backend_process.kill()
            backend_process.wait()
    
    os._exit(0) # Use _exit to skip cleanup handlers that might crash

def main() -> int:
    """Main launcher entry point."""
    global backend_process

    # Argument parsing
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", action="store_true", help="Run in backend worker mode")
    parser.add_argument("--port", type=int, default=8000, help="Port for backend worker")
    args = parser.parse_args()

    # Ensure data directories exist
    data_dir = get_data_dir()
    log_dir = get_log_dir()

    # MODE SWITCH: Backend Worker
    if args.backend:
        try:
            run_backend_worker(args.port, data_dir)
            return 0
        except Exception as e:
            # Write fatal errors to a panic log since stdout might be captured
            with open(log_dir / "backend_panic.log", "w") as f:
                f.write(str(e))
            return 1

    # MODE: Launcher (UI)
    
    # Register shutdown handlers
    signal.signal(signal.SIGTERM, shutdown_handler)
    signal.signal(signal.SIGINT, shutdown_handler)
    
    
    # Ensure data directories exist (Launcher check)
    data_dir = get_data_dir()
    log_dir = get_log_dir()
    
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        log_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        show_error(f"Failed to create data directories:\n{e}")
        return 1
    
    # Find available port
    port = find_available_port()
    if not port:
        show_error(
            "WebLens could not start\n\n"
            "All ports (8000-8010) are in use.\n\n"
            "Please close other applications and try again.\n\n"
            "Common culprits:\n"
            "- Other WebLens instances\n"
            "- Development servers (npm run dev, python -m http.server)\n"
            "- Docker containers"
        )
        return 1
    
    print(f"Starting WebLens on port {port}...")
    
    # Start backend
    try:
        backend_process = start_backend(port, data_dir, log_dir)
    except Exception as e:
        show_error(f"Failed to start backend:\n{e}")
        return 1
    
    # Wait for backend to be ready
    print("Waiting for backend to initialize...")
    
    # Define log location for error checking
    log_file = log_dir / "weblens.log"
    
    success, error_msg = wait_for_backend(port, log_file=log_file)
    if not success:
        show_error(
            "WebLens failed to start\n\n"
            "The backend service could not initialize.\n\n"
            f"Error details:\n{error_msg}\n\n"
            f"Check logs at:\n{log_dir}\n\n"
            "If this persists, reinstall WebLens."
        )
        if backend_process:
            backend_process.kill()
        return 1
    
    # Open browser
    url = f"http://127.0.0.1:{port}"
    print(f"Opening WebLens in app mode...")
    
    # Try App Mode first for a native feel
    if not open_browser_as_app(url):
        print(f"Falling back to standard browser tab for {url}...")
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"Could not open browser automatically: {e}", file=sys.stderr)
            print(f"Please open your browser to: {url}")
    
    print("\nWebLens is running!")
    print("Close this window or press Ctrl+C to stop.\n")
    
    # Keep launcher alive
    try:
        backend_process.wait()
    except KeyboardInterrupt:
        shutdown_handler(None, None)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
