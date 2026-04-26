#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER="$ROOT_DIR/install/botomatic.command"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  echo "Node, npm, and Git are required."
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

open "http://localhost:3000" || true
echo "Botomatic macOS launcher created at $LAUNCHER"
echo "Run: $LAUNCHER"