// Frontend sin frameworks: consume la API REST del mismo servidor.
const estado = { token: null, usuario: null, puestos: [] };

function leerSesion() {
  try {
    const guardada = JSON.parse(localStorage.getItem('sesion') || 'null');
    if (guardada) Object.assign(estado, guardada);
  } catch { /* sin almacenamiento disponible */ }
}
function guardarSesion() {
  try { localStorage.setItem('sesion', JSON.stringify({ token: estado.token, usuario: estado.usuario })); } catch { /* ignorar */ }
}

async function api(ruta, opciones = {}) {
  const cabeceras = opciones.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  if (estado.token) cabeceras.Authorization = `Bearer ${estado.token}`;
  const res = await fetch(`/api${ruta}`, { ...opciones, headers: { ...cabeceras, ...opciones.headers } });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
}

function mensaje(id, texto, tipo = 'ok') {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
}

function texto(valor) {
  const span = document.createElement('span');
  span.textContent = valor ?? '';
  return span.innerHTML;
}

const PRODUCTO = { pota: 'ceviche de pota', pescado: 'ceviche de pescado', mixto: 'ceviche mixto (pota y pescado)' };

function tarjetaPuesto(p) {
  const control = p.ultimo_control ? `${p.ultimo_control.temperatura_c} °C` : 'sin registro';
  return `<article class="tarjeta ${p.sello.color}">
    <h3>${texto(p.nombre_comercial)}</h3>
    <span class="sello ${p.sello.color}">Sello ${p.sello.color}</span>
    <p>${texto(p.distrito)} · ${texto(p.direccion_referencia)}<br>
       Vende: <strong>${texto(PRODUCTO[p.producto_declarado])}</strong> · ${texto(p.tipo.replace('_', ' '))}<br>
       Último control de frío: ${texto(control)}</p>
    <ul>${p.sello.motivos.map((m) => `<li>${texto(m)}</li>`).join('')}</ul>
  </article>`;
}

function llenarSelect(selector, items, valor, etiqueta) {
  document.querySelectorAll(selector).forEach((sel) => {
    sel.innerHTML = items.map((i) => `<option value="${i[valor]}">${texto(i[etiqueta])}</option>`).join('');
  });
}

async function cargarPuestos() {
  const filtros = new URLSearchParams();
  for (const [campo, id] of [['distrito', 'f-distrito'], ['sello', 'f-sello'], ['producto', 'f-producto']]) {
    const v = document.getElementById(id).value;
    if (v) filtros.set(campo, v);
  }
  const puestos = await api(`/puestos?${filtros}`);
  document.getElementById('lista-puestos').innerHTML = puestos.length
    ? puestos.map(tarjetaPuesto).join('') : '<p>No hay puestos con esos filtros.</p>';
  estado.puestos = await api('/puestos');
  llenarSelect('.sel-puestos', estado.puestos, 'id', 'nombre_comercial');
}

async function cargarDistritos() {
  const distritos = await api('/distritos');
  const filtro = document.getElementById('f-distrito');
  filtro.innerHTML = '<option value="">Todos</option>'
    + distritos.map((d) => `<option>${texto(d.nombre)}</option>`).join('');
  llenarSelect('.sel-distritos', distritos, 'id', 'nombre');
}

async function cargarPanel() {
  const conSesion = Boolean(estado.token);
  document.getElementById('form-login').classList.toggle('oculto', conSesion);
  document.getElementById('panel-sesion').classList.toggle('oculto', !conSesion);
  if (!conSesion) return;
  document.getElementById('sesion-nombre').textContent = estado.usuario.nombre;
  document.getElementById('sesion-rol').textContent = estado.usuario.rol;
  const esVendedor = estado.usuario.rol === 'vendedor';
  document.getElementById('panel-vendedor').classList.toggle('oculto', !esVendedor);
  document.getElementById('panel-inspector').classList.toggle('oculto', esVendedor);
  try {
    if (esVendedor) {
      const mios = await api('/puestos/mios');
      document.getElementById('mis-puestos').innerHTML = mios.length
        ? mios.map(tarjetaPuesto).join('') : '<p>Aún no registra puestos.</p>';
      llenarSelect('.sel-mis-puestos', mios, 'id', 'nombre_comercial');
    } else {
      const reportes = await api('/reportes');
      document.getElementById('bandeja').innerHTML = reportes.map((r) => `<div class="reporte">
        <strong>${texto(r.nombre_comercial)}</strong> (${texto(r.distrito)}) · ${texto(r.tipo.replaceAll('_', ' '))}
        · <em>${texto(r.estado)}</em><br>${texto(r.descripcion)}
        ${r.estado !== 'cerrado' ? `<br><button class="secundario" data-cerrar="${r.id}">Marcar cerrado</button>` : ''}
      </div>`).join('') || '<p>Sin reportes.</p>';
    }
  } catch (err) {
    if (/sesión/i.test(err.message)) { salir(); return; }
    throw err;
  }
}

function salir() {
  estado.token = null;
  estado.usuario = null;
  guardarSesion();
  cargarPanel();
}

function datosForm(form) {
  const datos = Object.fromEntries(new FormData(form));
  form.querySelectorAll('input[type=checkbox]').forEach((c) => { datos[c.name] = c.checked; });
  return datos;
}

function alEnviar(id, msgId, accion) {
  document.getElementById(id).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const texto = await accion(e.target);
      mensaje(msgId, texto, 'ok');
      e.target.reset();
      await Promise.all([cargarPuestos(), cargarPanel()]);
    } catch (err) {
      mensaje(msgId, err.message, 'error');
    }
  });
}

document.querySelectorAll('.tab').forEach((boton) => boton.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('activa', b === boton));
  document.querySelectorAll('.vista').forEach((v) => v.classList.toggle('oculto', v.id !== boton.dataset.tab));
}));
['f-distrito', 'f-sello', 'f-producto'].forEach((id) => document.getElementById(id).addEventListener('change', cargarPuestos));
document.getElementById('btn-salir').addEventListener('click', salir);
document.getElementById('bandeja').addEventListener('click', async (e) => {
  const id = e.target.dataset.cerrar;
  if (!id) return;
  await api(`/reportes/${id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'cerrado' }) });
  cargarPanel();
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const { token, usuario } = await api('/auth/login', { method: 'POST', body: JSON.stringify(datosForm(e.target)) });
    Object.assign(estado, { token, usuario });
    guardarSesion();
    mensaje('msg-login', '');
    await cargarPanel();
  } catch (err) {
    mensaje('msg-login', err.message, 'error');
  }
});

alEnviar('form-reporte', 'msg-reporte', async (form) => {
  await api('/reportes', { method: 'POST', body: JSON.stringify(datosForm(form)) });
  return 'Gracias, el reporte fue enviado al inspector municipal.';
});
alEnviar('form-puesto', 'msg-vendedor', async (form) => {
  await api('/puestos', { method: 'POST', body: JSON.stringify(datosForm(form)) });
  return 'Puesto registrado. Queda pendiente hasta la inspección.';
});
alEnviar('form-licencia', 'msg-vendedor', async (form) => {
  const datos = new FormData(form);
  const puesto = datos.get('puesto');
  datos.delete('puesto');
  if (!datos.get('archivo')?.size) datos.delete('archivo');
  await api(`/puestos/${puesto}/licencias`, { method: 'POST', body: datos });
  return 'Documento registrado.';
});
alEnviar('form-control', 'msg-vendedor', async (form) => {
  const { puesto, ...datos } = datosForm(form);
  const res = await api(`/puestos/${puesto}/controles-frio`, { method: 'POST', body: JSON.stringify(datos) });
  return res.alerta ? `Registrado con ALERTA: ${res.alerta}` : 'Control registrado dentro del rango.';
});
alEnviar('form-inspeccion', 'msg-inspector', async (form) => {
  const { puesto, ...datos } = datosForm(form);
  await api(`/puestos/${puesto}/inspecciones`, { method: 'POST', body: JSON.stringify(datos) });
  return 'Inspección guardada y estado del puesto actualizado.';
});

leerSesion();
Promise.all([cargarDistritos(), cargarPuestos(), cargarPanel()]).catch((err) => console.error(err));
