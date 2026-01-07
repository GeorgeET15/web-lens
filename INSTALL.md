# Installation Guide - WebLens

WebLens is distributed as a standalone binary, requiring no external dependencies other than a Chrome/Chromium-based browser.

## Prerequisites
- **Chrome/Chromium Browser**: Ensure you have Google Chrome or a compatible browser installed in your system.

## Linux Installation
1. Download the `weblens` binary from the [Releases](https://github.com/GeorgeET15/web-lens/releases) page.
2. Grant execution permissions:
   ```bash
   chmod +x weblens
   ```
3. Run the application:
   ```bash
   ./weblens
   ```

## macOS Installation (Coming Soon)
1. Download the `WebLens.app.zip`.
2. Extract to your `Applications` folder.
3. Right-click and select **Open** (to bypass unsigned developer warning if applicable).

## Windows Installation (Coming Soon)
1. Download `weblens.exe`.
2. Double-click to run.

## Data Directory
WebLens stores test flows, assets, and execution reports in:
- **Linux**: `~/.local/share/weblens`
- **macOS**: `~/Library/Application Support/WebLens`
- **Windows**: `%APPDATA%\WebLens`

## Troubleshooting
If the backend fails to start, check the logs in the `logs/` subdirectory of the data directory listed above.
