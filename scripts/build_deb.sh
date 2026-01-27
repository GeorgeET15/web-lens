#!/bin/bash
set -e

# Configuration
APP_NAME="weblens"
VERSION="1.0.0"
ARCH="amd64"
BUILD_DIR="build"
DEB_DIR="${APP_NAME}_${VERSION}_${ARCH}"
DIST_DIR="dist_deb"

echo "🔨 Starting WebLens Build Process..."

# 1. Prerequisite Check
command -v npm >/dev/null 2>&1 || { echo >&2 "❌ npm is required but not installed. Aborting."; exit 1; }
# command -v python3 >/dev/null 2>&1 || { echo >&2 "❌ python3 is required but not installed. Aborting."; exit 1; }
# command -v pyinstaller >/dev/null 2>&1 || { echo >&2 "❌ pyinstaller is required but not installed. Aborting."; exit 1; }
command -v dpkg-deb >/dev/null 2>&1 || { echo >&2 "❌ dpkg-deb is required but not installed. Aborting."; exit 1; }

PYTHON_BIN="../backend/venv/bin/python"
PIP_BIN="../backend/venv/bin/pip"
PYINSTALLER_BIN="../backend/venv/bin/pyinstaller"

# 2. Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

if [ ! -d "frontend/dist" ]; then
    echo "❌ Frontend build failed. directory frontend/dist not found."
    exit 1
fi

# 3. Bundle Backend
echo "🐍 Bundling Backend..."
cd backend
# Install dependencies if needed (assuming venv is active or deps are installed)
$PIP_BIN install -r requirements.txt
$PYINSTALLER_BIN main.py --name weblens-server --onedir --clean --noconfirm --add-data "../frontend/dist:frontend" --hidden-import=uvicorn
cd ..

if [ ! -d "backend/dist/weblens-server" ]; then
    echo "❌ Backend build failed."
    exit 1
fi

# 4. Prepare DEB Structure
echo "📂 Preparing DEB Directory Structure..."
rm -rf $DIST_DIR
mkdir -p $DIST_DIR/$DEB_DIR/DEBIAN
mkdir -p $DIST_DIR/$DEB_DIR/opt/weblens
mkdir -p $DIST_DIR/$DEB_DIR/usr/bin
mkdir -p $DIST_DIR/$DEB_DIR/usr/share/applications
mkdir -p $DIST_DIR/$DEB_DIR/usr/share/icons/hicolor/512x512/apps

# Copy Application Files
cp -r backend/dist/weblens-server/* $DIST_DIR/$DEB_DIR/opt/weblens/

# Create Launcher Script
cat <<EOF > $DIST_DIR/$DEB_DIR/usr/bin/weblens
#!/bin/bash
export WEBLENS_DATA_DIR=\$HOME/.local/share/weblens
mkdir -p \$WEBLENS_DATA_DIR
cd /opt/weblens
./weblens-server
EOF

chmod 755 $DIST_DIR/$DEB_DIR/usr/bin/weblens

# Create Desktop Entry
cat <<EOF > $DIST_DIR/$DEB_DIR/usr/share/applications/weblens.desktop
[Desktop Entry]
Name=WebLens
Comment=AI-Powered Visual Web Automation
Exec=/usr/bin/weblens
Icon=weblens
Terminal=false
Type=Application
Categories=Development;
EOF

# Create Control File
cat <<EOF > $DIST_DIR/$DEB_DIR/DEBIAN/control
Package: weblens
Version: $VERSION
Section: devel
Priority: optional
Architecture: $ARCH
Maintainer: GeorgeET15 <georgeet15@example.com>
Description: WebLens - AI-Powered Visual Web Automation
 WebLens is a zero-code platform for creating robust browser automation 
 workflows using Multimodal AI and Computer Vision.
EOF

# 5. Build DEB
echo "📦 Building .deb Package..."
dpkg-deb --build $DIST_DIR/$DEB_DIR

echo "✅ Build Complete!"
echo "📍 Output: $DIST_DIR/$DEB_DIR.deb"
