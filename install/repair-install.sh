#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

rm -rf node_modules
npm install
"$ROOT_DIR/install/doctor.sh"

echo "Botomatic install repaired."