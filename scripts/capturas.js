const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const errores = [];
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('pageerror', (e) => errores.push(e.message));
  const dir = require('path').resolve(__dirname, '../docs/capturas') + '/';
  await p.goto('' + (process.env.BASE_URL || 'http://localhost:3000') + '/');
  await p.waitForSelector('.tarjeta');
  await p.screenshot({ path: dir + 'mvp-1-consulta.png', fullPage: true });
  // vendedora: login, control de frío con alerta
  await p.click('button[data-tab=panel]');
  await p.fill('#form-login input[name=email]', 'vendedora@demo.pe');
  await p.fill('#form-login input[name=password]', 'Demo1234!');
  await p.click('#form-login button');
  await p.waitForSelector('#mis-puestos .tarjeta');
  await p.fill('#form-control input[name=temperatura_c]', '6.5');
  await p.fill('#form-control input[name=observacion]', 'Se acabó el hielo');
  await p.click('#form-control button');
  await p.waitForFunction(() => document.getElementById('msg-vendedor').textContent.includes('ALERTA'));
  await p.screenshot({ path: dir + 'mvp-2-vendedora-alerta.png', fullPage: true });
  console.log('vendedor msg:', await p.textContent('#msg-vendedor'));
  // reporte público
  await p.click('#btn-salir');
  await p.click('button[data-tab=reportar]');
  await p.selectOption('#form-reporte select[name=puesto_id]', { label: 'El Rey del Ceviche' });
  await p.fill('#form-reporte textarea', 'Pedí ceviche de pescado y me dieron pota.');
  await p.click('#form-reporte button');
  await p.waitForFunction(() => document.getElementById('msg-reporte').textContent.includes('Gracias'));
  await p.screenshot({ path: dir + 'mvp-3-reporte.png' });
  // inspector
  await p.click('button[data-tab=panel]');
  await p.fill('#form-login input[name=email]', 'inspector@demo.pe');
  await p.fill('#form-login input[name=password]', 'Demo1234!');
  await p.click('#form-login button');
  await p.waitForSelector('#bandeja .reporte');
  await p.selectOption('#form-inspeccion select[name=puesto]', { label: 'El Rey del Ceviche' });
  await p.fill('#form-inspeccion input[name=temperatura_c]', '7');
  await p.check('#form-inspeccion input[name=higiene_ok]');
  await p.selectOption('#form-inspeccion select[name=resultado]', 'aprobado');
  await p.click('#form-inspeccion button');
  await p.waitForFunction(() => document.getElementById('msg-inspector').textContent.length > 0);
  console.log('inspector msg (debe rechazar):', await p.textContent('#msg-inspector'));
  await p.screenshot({ path: dir + 'mvp-4-inspector.png', fullPage: true });
  console.log('errores consola:', errores);
  await b.close();
})();
