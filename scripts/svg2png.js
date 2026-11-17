// Convierte un SVG a PNG con Playwright: node scripts/svg2png.js entrada.svg salida.png ancho alto
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const [i,o,w,h]=process.argv.slice(2);const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:2});
await p.setContent(`<html><body style="margin:0">${fs.readFileSync(i,'utf8')}</body></html>`);await p.screenshot({path:o,clip:{x:0,y:0,width:+w,height:+h}});await b.close();})();
