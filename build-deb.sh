#!/bin/bash
set -e

echo "Building WebLens .deb package..."

# Ensure we are in the root directory
cd "$(dirname "$0")"

# Build the package
dpkg-deb --build weblens-pkg weblens_1.0.0_amd64.deb

echo "Build complete: weblens_1.0.0_amd64.deb"
echo "To install: sudo dpkg -i weblens_1.0.0_amd64.deb"
