# WebLens Packaging

This directory contains packaging configuration for distributing WebLens as a local system application.

## Build Requirements

### All Platforms
- Python 3.11+
- PyInstaller: `pip install pyinstaller`
- requests: `pip install requests`

### macOS
- Xcode Command Line Tools
- Apple Developer ID certificate (for signing)
- `create-dmg`: `brew install create-dmg`

### Windows
- NSIS: Download from https://nsis.sourceforge.io/
- Code signing certificate (optional but recommended)
- `signtool` (part of Windows SDK)

### Linux
- `appimagetool`: Download from https://appimage.github.io/
- `dpkg-deb` (for .deb packages)

## Building

### macOS

```bash
# 1. Build app bundle
pyinstaller weblens.spec --clean

# 2. Sign app (requires Developer ID)
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --options runtime \
  dist/WebLens.app

# 3. Create DMG
create-dmg \
  --volname "WebLens" \
  --volicon "assets/icon.icns" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "WebLens.app" 175 120 \
  --hide-extension "WebLens.app" \
  --app-drop-link 425 120 \
  "WebLens-1.0.0-macos-$(uname -m).dmg" \
  "dist/WebLens.app"

# 4. Notarize (optional, requires Apple Developer account)
# xcrun notarytool submit WebLens-1.0.0-macos-*.dmg ...
```

### Windows

```bash
# 1. Build executable
pyinstaller weblens.spec --clean

# 2. Sign executable (optional)
# signtool sign /f certificate.pfx /p password dist\weblens.exe

# 3. Build installer with NSIS
# makensis installer.nsi

# 4. Sign installer (optional)
# signtool sign /f certificate.pfx /p password WebLens-1.0.0-windows-x64.exe
```

### Linux

```bash
# 1. Build executable
pyinstaller weblens.spec --clean --onefile

# 2. Create AppImage
./build-appimage.sh

# 3. Create .deb package
./build-deb.sh
```

## Testing

Test on clean VMs before release:
- macOS 13+ (Ventura)
- Windows 10+
- Ubuntu 22.04+

## Distribution

Upload to GitHub Releases:
```bash
gh release create v1.0.0 \
  WebLens-1.0.0-macos-arm64.dmg \
  WebLens-1.0.0-macos-x64.dmg \
  WebLens-1.0.0-windows-x64.exe \
  WebLens-1.0.0-linux-x64.AppImage \
  WebLens-1.0.0-linux-x64.deb \
  checksums.txt \
  --title "WebLens v1.0.0" \
  --notes-file RELEASE_NOTES.md
```

## Implementation Notes & Troubleshooting

### 1. Process Spawning in Frozen Environments
PyInstaller bundles the python interpreter into the executable. `sys.executable` points to the `weblens` binary, not `python`.
Passing `sys.executable` to `subprocess.Popen` with a python script (like `uvicorn main:app`) will fail because the binary expects to run `launcher.py` logic, not interpret a script.

**Solution**:
The `launcher.py` detects if it is running in frozen mode (`sys.frozen`). If so, it spawns the backend using:
```python
subprocess.Popen([sys.executable, "--backend", ...])
```
It handles the `--backend` flag to switch behavior and run `uvicorn` programmatically using `backend.main.app`.

### 2. Hidden Imports
PyInstaller misses implied dependencies, which MUST be explicitly added to `hiddenimports` in `weblens.spec`:
- **Selenium**: `selenium.webdriver.support.ui`, `selenium.webdriver.support.expected_conditions`, `selenium.webdriver.support.wait`
- **LangChain/AI**: `langchain`, `langchain_google_genai`, `google.generativeai`

### 3. Data Directories
- **Linux**: `~/.local/share/weblens`
- **macOS**: `~/Library/Application Support/WebLens`
- **Windows**: `%APPDATA%\WebLens`

Logs are found in the `logs/` subdirectory of the data folder.

## Build Commands for Other Platforms

**Note**: Ensure you use the updated `weblens.spec` which contains the necessary hidden imports.

### Windows (PowerShell)
```powershell
# Prerequisites: Python 3.12, NSIS (optional for installer)
.\backend\venv\Scripts\pip install pyinstaller
.\backend\venv\Scripts\pyinstaller weblens.spec --clean --noconfirm
# Output: dist\weblens.exe (Standalone)
```

### macOS
```bash
# Prerequisites: Python 3.12, create-dmg (brew install create-dmg)
./backend/venv/bin/pip install pyinstaller
./backend/venv/bin/pyinstaller weblens.spec --clean --noconfirm
# Output: dist/WebLens.app

# Create DMG
create-dmg \
  --volname "WebLens Installer" \
  --volicon "assets/icon.icns" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --icon "WebLens.app" 200 190 \
  --hide-extension "WebLens.app" \
  --app-drop-link 600 185 \
  "WebLens-1.0.0.dmg" \
  "dist/WebLens.app"
```

## Troubleshooting Common Errors

### "All ports are in use"
- Close other WebLens instances
- Stop development servers (npm run dev, uvicorn)
- Check for processes on ports 8000-8010

### "Backend failed to start" / "Backend dependencies not found"
- Use `check_backend_status()` in `launcher.py` to debug subprocess failures.
- Verify `weblens.spec` has all required `hiddenimports`.
- Check logs in platform-specific log directories.

### "ModuleNotFoundError"
- If seen in logs, add the missing module to `hiddenimports` in `weblens.spec` and rebuild.
