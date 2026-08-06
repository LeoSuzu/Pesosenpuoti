#!/usr/bin/env sh
set -eu

rg -q 'favicon-v2.svg' web-elements/README.md
rg -q 'saannosto-vesille.html' web-elements/README.md
