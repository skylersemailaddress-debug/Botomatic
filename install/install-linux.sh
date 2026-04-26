#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOME_BIN="$HOME/.local/bin"
HOME_APPS="$HOME/.local/share/applications"
LAUNCHER="$HOME_BIN/botomatic"
DESKTOP_FILE="$HOME_APPS/botomatic.desktop"

detect_env() {
  if [[ -f /etc/os-release ]] && grep -qi chromeos /etc/os-release; then
    echo "Chromebook/Linux environment detected."
  elif [[ -e /dev/.cros_milestone ]]; then
    echo "Chromebook/Linux environment detected."
  else
    echo "Linux environment detected."
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

detect_env
require_cmd node
require_cmd npm
require_cmd git

mkdir -p "$HOME_BIN" "$HOME_APPS"

if [[ ! -f "$ROOT_DIR/package.json" ]]; then
  echo "Botomatic repo root not found at $ROOT_DIR"
  exit 1
fi

cd "$ROOT_DIR"
npm install

cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
cd "$ROOT_DIR"
npm run start:easy
EOF
chmod +x "$LAUNCHER"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Botomatic
Comment=Chat-first commercial builder control plane
Exec=$LAUNCHER
Icon=applications-development
Terminal=true
Categories=Development;
EOF

chmod +x "$DESKTOP_FILE"

"$ROOT_DIR/install/doctor.sh"

echo
echo "Botomatic installed."
echo "Launch with: $LAUNCHER"
echo "Desktop entry installed at: $DESKTOP_FILE"