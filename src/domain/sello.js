// Reglas de negocio puras (sin base de datos): fáciles de probar con pruebas unitarias.
//
// Sello sanitario que ve el consumidor:
//   verde    -> puesto verificado, licencia y carnet vigentes, inspección aprobada reciente
//               y control de frío reciente dentro del rango
//   amarillo -> en proceso u observado: falta algún requisito, pero no hay causa de suspensión
//   rojo     -> suspendido, clausurado o sin licencia/carnet vigente

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

function licenciaVigente(licencias, tipo, ahora) {
  return licencias.some((l) => l.tipo === tipo && new Date(l.fecha_vencimiento) >= ahora);
}

function evaluarControlFrio(temperaturaC, tempMaxC) {
  const enRango = Number(temperaturaC) <= tempMaxC;
  return {
    enRango,
    alerta: enRango ? null : `Temperatura ${temperaturaC} °C por encima del máximo de ${tempMaxC} °C`,
  };
}

function calcularSello(puesto, ahora = new Date(), reglas = { tempMaxC: 4, diasVigenciaInspeccion: 90, horasVigenciaControl: 24 }) {
  const licencias = puesto.licencias || [];
  const insp = puesto.ultima_inspeccion || null;
  const ctrl = puesto.ultimo_control || null;
  const motivos = [];

  const tieneLicencia = licenciaVigente(licencias, 'licencia_municipal', ahora);
  const tieneCarnet = licenciaVigente(licencias, 'carnet_sanidad', ahora);

  // Causas de sello rojo
  if (puesto.estado === 'suspendido') motivos.push('Puesto suspendido por la municipalidad');
  if (insp && insp.resultado === 'clausurado') motivos.push('Última inspección: clausurado');
  if (!tieneLicencia) motivos.push('Sin licencia municipal vigente');
  if (!tieneCarnet) motivos.push('Sin carnet de sanidad vigente');
  if (motivos.length > 0) return { color: 'rojo', motivos };

  // Requisitos para sello verde
  if (puesto.estado !== 'verificado') motivos.push(`Estado del puesto: ${puesto.estado}`);
  if (!insp) {
    motivos.push('Sin inspección registrada');
  } else {
    if (insp.resultado !== 'aprobado') motivos.push(`Última inspección: ${insp.resultado}`);
    if (ahora - new Date(insp.fecha) > reglas.diasVigenciaInspeccion * DIA) {
      motivos.push(`Inspección con más de ${reglas.diasVigenciaInspeccion} días`);
    }
    if (insp.rotulado_veraz === false) motivos.push('Producto no rotulado con veracidad');
  }
  if (!ctrl) {
    motivos.push('Sin control de cadena de frío');
  } else {
    if (ahora - new Date(ctrl.hora_registro) > reglas.horasVigenciaControl * HORA) {
      motivos.push(`Control de frío con más de ${reglas.horasVigenciaControl} horas`);
    }
    const { enRango } = evaluarControlFrio(ctrl.temperatura_c, reglas.tempMaxC);
    if (!enRango) motivos.push(`Último control de frío sobre ${reglas.tempMaxC} °C`);
  }

  if (motivos.length > 0) return { color: 'amarillo', motivos };
  return { color: 'verde', motivos: ['Cumple licencia, carnet, inspección y cadena de frío'] };
}

// La inspección determina el nuevo estado del puesto.
// Regla del caso: si la pota se ofrece como otro pescado (rotulado no veraz), no puede aprobarse.
function validarInspeccion({ resultado, rotulado_veraz: rotuladoVeraz, higiene_ok: higieneOk }) {
  if (resultado === 'aprobado' && (rotuladoVeraz === false || higieneOk === false)) {
    return 'No se puede aprobar un puesto con rotulado no veraz o higiene deficiente';
  }
  return null;
}

const ESTADO_POR_RESULTADO = { aprobado: 'verificado', observado: 'observado', clausurado: 'suspendido' };

module.exports = { calcularSello, evaluarControlFrio, validarInspeccion, ESTADO_POR_RESULTADO };
