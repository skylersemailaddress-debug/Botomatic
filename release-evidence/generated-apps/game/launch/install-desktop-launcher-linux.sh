#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$HOME/.local/bin"
LAUNCHER="$HOME/.local/bin/game-launch"
cat > "$LAUNCHER" <<EOL
#!/usr/bin/env bash
cd "$ROOT_DIR"
bash launch/launch-local.sh
EOL
chmod +x "$LAUNCHER"
echo "installed $LAUNCHER"
