# WebLens Icon Update Guide

This guide explains how to update the WebLens application icon across all platforms and components.

## Source Files to Replace

### 1. Main Icon Assets
Replace these files with your new icon:

```
assets/logo.png          # Main logo (1207x1207 or similar high-res)
frontend/public/logo-no-bg.png   # Frontend UI logo (transparent background recommended)
```

**Recommended specifications:**
- **Format**: PNG with transparent background
- **Size**: At least 1024x1024 pixels (for scaling)
- **Color**: RGB or RGBA

## Files That Reference the Icon

### Frontend (UI Components)

1. **`frontend/index.html`** (Line 8)
   ```html
   <link rel="icon" type="image/png" href="/logo-no-bg.png" />
   ```
   - This is the browser favicon

2. **`frontend/App.tsx`** (Around line 547)
   ```tsx
   <img src="/logo-no-bg.png" alt="WebLens" className="h-8 w-8" />
   ```
   - Navbar logo in the top-left corner

3. **`frontend/pages/Login.tsx`** (Around line 89)
   ```tsx
   <img src="/logo-no-bg.png" alt="WebLens" className="w-16 h-16" />
   ```
   - Login page logo

4. **`frontend/components/OnboardingModal.tsx`** (Around line 47)
   ```tsx
   <img src="/logo-no-bg.png" alt="WebLens" className="w-32 h-32" />
   ```
   - Library/Onboarding modal welcome screen

5. **`frontend/components/execution/ExecutionExplorer.tsx`** (Around line 318)
   ```tsx
   <img src="/logo-no-bg.png" alt="WebLens" className="w-32 h-32" />
   ```
   - Execution Explorer default/empty state

### Desktop Application (Linux)

6. **`weblens.spec`** (Line 16)
   ```python
   icon_file = 'assets/logo.png' if platform.system() == 'Linux' else None
   ```
   - PyInstaller configuration for the executable icon

7. **Desktop Icon** (Generated during build)
   ```
   weblens-pkg/usr/share/icons/hicolor/256x256/apps/weblens.png
   ```
   - This is auto-generated from `assets/logo.png` during the build process

## Build Process After Icon Update

### Step 1: Update Source Files
```bash
# Replace your icon files
cp /path/to/new/logo.png assets/logo.png
cp /path/to/new/logo-no-bg.png frontend/public/logo-no-bg.png
```

### Step 2: Rebuild Frontend
```bash
cd frontend
npm run build
cd ..
```

### Step 3: Rebuild Desktop Icon
The desktop icon is auto-generated during the Debian package build. The `postinst` script handles this automatically.

### Step 4: Rebuild PyInstaller Bundle
```bash
/home/georgeet15/Desktop/web-lens/venv/bin/pyinstaller weblens.spec --clean --noconfirm
```

### Step 5: Update Debian Package
```bash
# Regenerate the 256x256 desktop icon
mkdir -p weblens-pkg/usr/share/icons/hicolor/256x256/apps
python3 -c "from PIL import Image; img = Image.open('assets/logo.png'); img.resize((256, 256), Image.Resampling.LANCZOS).save('weblens-pkg/usr/share/icons/hicolor/256x256/apps/weblens.png')"

# Copy PyInstaller output to package
cp -r dist/weblens/* weblens-pkg/usr/lib/weblens/

# Build the .deb package
./build-deb.sh
```

### Step 6: Install Updated Package
```bash
sudo apt remove weblens
sudo dpkg -i weblens_1.0.0_amd64.deb
```

## Quick Update Script

For convenience, here's a complete script to update everything:

```bash
#!/bin/bash
# update-icon.sh - Update WebLens icon across all components

set -e

echo "🎨 Updating WebLens icon..."

# Step 1: Rebuild frontend
echo "📦 Building frontend..."
cd frontend && npm run build && cd ..

# Step 2: Rebuild PyInstaller bundle
echo "🔧 Building backend executable..."
/home/georgeet15/Desktop/web-lens/venv/bin/pyinstaller weblens.spec --clean --noconfirm

# Step 3: Generate desktop icon
echo "🖼️  Generating desktop icon..."
mkdir -p weblens-pkg/usr/share/icons/hicolor/256x256/apps
python3 -c "from PIL import Image; img = Image.open('assets/logo.png'); img.resize((256, 256), Image.Resampling.LANCZOS).save('weblens-pkg/usr/share/icons/hicolor/256x256/apps/weblens.png')"

# Step 4: Copy to package
echo "📋 Copying files to package..."
cp -r dist/weblens/* weblens-pkg/usr/lib/weblens/

# Step 5: Build Debian package
echo "📦 Building Debian package..."
./build-deb.sh

echo "✅ Icon update complete!"
echo "Install with: sudo dpkg -i weblens_1.0.0_amd64.deb"
```

Save this as `update-icon.sh` and make it executable:
```bash
chmod +x update-icon.sh
```

## Icon Size Reference

| Location | Size | Purpose |
|----------|------|---------|
| `assets/logo.png` | 1207x1207 | Source file for all icons |
| `frontend/public/logo-no-bg.png` | Any | UI components (scaled via CSS) |
| Desktop icon | 256x256 | Linux desktop environments |
| Favicon | 16x16, 32x32 | Browser tab (auto-scaled) |

## Troubleshooting

### Icon not updating in browser
- Clear browser cache: `Ctrl+Shift+R` (hard refresh)
- Check `frontend/dist/logo-no-bg.png` exists after build

### Desktop icon not changing
- Run: `gtk-update-icon-cache -f -t /usr/share/icons/hicolor`
- Log out and log back in
- Or reboot the system

### Icon looks blurry
- Ensure source `assets/logo.png` is high resolution (at least 1024x1024)
- Use PNG format with transparency
- Avoid JPEG (no transparency support)

## Notes

- Always use **PNG format** for transparency support
- Keep aspect ratio **1:1 (square)** for best results
- Use **transparent backgrounds** for `logo-no-bg.png`
- The desktop icon is auto-generated at **256x256** for HiDPI support
- Frontend icons are scaled via CSS, so high-res source is recommended
