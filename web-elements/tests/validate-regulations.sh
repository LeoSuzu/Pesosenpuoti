#!/usr/bin/env sh
set -eu

html=web-elements/vesille-lahto/saannosto-vesille.html
css=web-elements/vesille-lahto/saannosto-vesille.css

rg -q 'class="vesille-saannosto"' "$html"
test "$(rg -c '<article' "$html")" -eq 4
rg -q 'href="#ota-yhteytta"' "$html"
rg -q '@media \(max-width: 700px\)' "$css"

