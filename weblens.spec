# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for WebLens
Builds platform-specific executable bundles
"""

import sys
from pathlib import Path

block_cipher = None

# Determine platform-specific settings
if sys.platform == 'darwin':
    icon_file = 'assets/icon.icns'
elif sys.platform == 'win32':
    icon_file = 'assets/icon.ico'
else:
    icon_file = None

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[
        # Platform-specific chromedriver will be added during build
    ],
    datas=[
        ('backend', 'backend'),
        ('frontend/dist', 'frontend'),
    ],
    hiddenimports=[
        # Uvicorn dependencies
        'uvicorn.logging',
        'uvicorn.loops.auto',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan.on',
        
        # Selenium dependencies
        'selenium.webdriver.chrome.service',
        'selenium.webdriver.chrome.options',
        'selenium.webdriver.common.by',
        'selenium.webdriver.support',
        'selenium.webdriver.support.ui',
        'selenium.webdriver.support.expected_conditions',
        'selenium.webdriver.support.wait',
        'selenium.webdriver.chrome.webdriver',
        'selenium.webdriver.remote.webdriver',
        
        # FastAPI dependencies
        'fastapi.responses',
        'starlette.responses',
        'starlette.routing',
        
        # Pydantic
        'pydantic.json',
        'pydantic.types',

        # AI Dependencies
        'langchain',
        'langchain_google_genai',
        'google.generativeai',
        'langchain_core',
        'langchain_core.language_models.chat_models',
        
        # Additional dependencies
        'reportlab',
        'dotenv',
        'requests',
        'fastapi.staticfiles',
        'jinja2',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unnecessary packages to reduce size
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'PIL',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='weblens',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # Disable compression for faster launch
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_file,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='weblens',
)

# macOS app bundle
if sys.platform == 'darwin':
    app = BUNDLE(
        exe,
        name='WebLens.app',
        icon='assets/icon.icns',
        bundle_identifier='io.weblens.app',
        version='1.0.0',
        info_plist={
            'CFBundleName': 'WebLens',
            'CFBundleDisplayName': 'WebLens',
            'CFBundleVersion': '1.0.0',
            'CFBundleShortVersionString': '1.0.0',
            'CFBundleIdentifier': 'io.weblens.app',
            'NSHighResolutionCapable': True,
            'LSMinimumSystemVersion': '10.13.0',
            'NSHumanReadableCopyright': 'Copyright © 2024 WebLens',
        },
    )
