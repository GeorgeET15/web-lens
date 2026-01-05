"""
WebLens Backend Configuration
Handles data directory and environment setup
"""

import os
from pathlib import Path

def get_data_dir() -> Path:
    """
    Get WebLens data directory from environment or use default.
    
    Priority:
    1. WEBLENS_DATA_DIR environment variable
    2. Platform-specific default
    """
    # Check environment variable first
    env_dir = os.getenv('WEBLENS_DATA_DIR')
    if env_dir:
        return Path(env_dir)
    
    # Platform-specific defaults
    import sys
    if sys.platform == 'darwin':  # macOS
        return Path.home() / 'Library' / 'Application Support' / 'WebLens'
    elif sys.platform == 'win32':  # Windows
        appdata = os.getenv('APPDATA')
        if not appdata:
            raise RuntimeError("APPDATA environment variable not set")
        return Path(appdata) / 'WebLens'
    else:  # Linux
        return Path.home() / '.local' / 'share' / 'weblens'

# Global data directory
DATA_DIR = get_data_dir()

# Ensure directories exist
FLOWS_DIR = DATA_DIR / 'flows'
EXECUTIONS_DIR = DATA_DIR / 'executions'
LOGS_DIR = DATA_DIR / 'logs'

for directory in [DATA_DIR, FLOWS_DIR, EXECUTIONS_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Configuration file
CONFIG_FILE = DATA_DIR / 'config.json'
ENVIRONMENTS_FILE = DATA_DIR / 'environments.json'
