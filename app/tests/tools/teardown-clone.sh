#!/usr/bin/env bash
# teardown-clone.sh <out-dir>: stops the 3301 server and drops the clone recorded in <out-dir>/clone-name.txt.
set -u
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib.sh"
stop_port
clone_drop "$(cat "$1/clone-name.txt")"
