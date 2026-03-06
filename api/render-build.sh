#!/usr/bin/env bash
# This script installs Tesseract OCR on Render's native Python environment
# It runs during the build step before pip install

echo "--- INSTALLING TESSERACT OCR ---"
apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-spa libgl1-mesa-glx libglib2.0-0
echo "--- INSTALLATION COMPLETE ---"
