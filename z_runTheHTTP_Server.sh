#!/bin/bash

# Non-interactive shells (e.g. when this is launched by Run_Desktop_Site_Ubuntu.sh
# via `bash -c`) skip ~/.bashrc's nvm sourcing, so http-server wouldn't be on PATH.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

http-server
