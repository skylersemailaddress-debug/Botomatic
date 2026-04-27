#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"
cat > "$HOME/.local/bin/proj_1777246116324" <<EOF
#!/usr/bin/env bash
cd "$ROOT_DIR"
npm run build && npm run start
EOF
chmod +x "$HOME/.local/bin/proj_1777246116324"
cp "$ROOT_DIR/launch/app.desktop" "$HOME/.local/share/applications/proj_1777246116324.desktop"
