#!/bin/bash
# Assemble the public deploy payload for Cloudflare Pages.
#
# Cloudflare Pages direct-upload publishes every file in the output directory,
# and this repo tracks internal working material (agent plans under docs/, the
# brand register in PRODUCT.md) that has no business on a client-facing URL.
# So the deploy payload is assembled explicitly rather than pointing wrangler
# at the repo root.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

# Page + behaviour + Cloudflare header rules + crawler files
cp index.html style.css main.js wave.js _headers robots.txt sitemap.xml dist/

# Photography
if [ -d images ]; then
  cp -R images dist/images
fi
mkdir -p dist/assets/uploads dist/content
cp -R assets/uploads/images dist/assets/uploads/images
cp -R assets/uploads/icons dist/assets/uploads/icons
if [ -d assets/uploads/videos ]; then
  cp -R assets/uploads/videos dist/assets/uploads/videos
fi
cp content/site.json content/schema.js dist/content/

# Editor UI — its protected API functions remain in the repository's
# functions/ directory for Cloudflare Pages to compile.
cp -R admin dist/admin

# Only the logo SVGs the page actually references.
mkdir -p dist/web-elements
cp -R web-elements/logos dist/web-elements/logos

echo "dist/ assembled:"
find dist -type f | sort
echo
echo "total: $(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1)"
