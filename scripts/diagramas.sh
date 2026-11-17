#!/usr/bin/env bash
# Regenera los PNG de docs/diagramas a partir de los .mmd (Mermaid) y del generador de casos de uso.
# Requiere: npm i -g @mermaid-js/mermaid-cli   (o usa npx, que lo descarga la primera vez)
set -euo pipefail
cd "$(dirname "$0")/../docs/diagramas"
MMDC="$(command -v mmdc || echo 'npx -y @mermaid-js/mermaid-cli')"
for f in er logica fisica-azure; do $MMDC -i $f.mmd -o $f.png -c cfg.json -w 1400 -s 2 -b white -q; echo "ok $f"; done
$MMDC -i ramas.mmd -o ramas.png -c cfg-git.json -w 1400 -s 2 -b white -q; echo "ok ramas"
python3 gen_casos_uso.py && node ../../scripts/svg2png.js casos-uso.svg casos-uso.png 1500 1000 && echo "ok casos-uso"
(cd ../scrum && python3 burndown.py) && echo "ok burndown"
