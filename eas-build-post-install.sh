#!/usr/bin/env bash

set -e

echo "=========================================="
echo "EAS Build: Running patch-package..."
echo "=========================================="

npx patch-package

echo "=========================================="
echo "Patches applied successfully!"
echo "=========================================="
