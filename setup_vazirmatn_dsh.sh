#!/bin/bash
set -e

echo "============================================================="
echo "  DeepSeek Harness RTL & Vazirmatn Setup (macOS / Linux)     "
echo "============================================================="
echo "    Dedicated to the memory of Saber Rastikerdar             "
echo "============================================================="

# Find node
NODE_BIN="node"
if ! command -v node &> /dev/null; then
    if [ -f "$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node" ]; then
        NODE_BIN="$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node"
    else
        echo "Error: Node.js is required to run this patcher."
        exit 1
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$NODE_BIN" "$SCRIPT_DIR/patch_dsh.js"

echo ""
echo "Patch prepared. Please restart DeepSeek Harness."
