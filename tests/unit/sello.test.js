// Pruebas unitarias: atómicas, independientes, inocuas (sin base de datos) y rápidas.
const { calcularSello, evaluarControlFrio, validarInspeccion } = require('../../src/domain/sello');

const AHORA = new Date('2026-11-16T12:00:00Z');
const REGLAS = { tempMaxC: 4, diasVigenciaInspeccion: 90, horasVigenciaControl: 24 };

function puestoBase(cambios = {}) {
  return {
    estado: 'verificado',
    licencias: [
      { tipo: 'licencia_municipal', fecha_vencimiento: '2027-06-01' },
      { tipo: 'carnet_sanidad', fecha_vencimiento: '2027-06-01' },
    ],
    ultima_inspeccion: { fecha: '2026-11-01T10:00:00Z', resultado: 'aprobado', rotulado_veraz: true },
    ultimo_control: { temperatura_c: 2.5, hora_registro: '2026-11-16T08:00:00Z' },
    ...cambios,
  };
}

describe('calcularSello', () => {
  test('verde cuando cumple licencia, carnet, inspección y cadena de frío', () => {
    expect(calcularSello(puestoBase(), AHORA, REGLAS).color).toBe('verde');
  });

  test('rojo cuando el carnet de sanidad está vencido', () => {
    const puesto = puestoBase({
      licencias: [
        { tipo: 'licencia_municipal', fecha_vencimiento: '2027-06-01' },
        { tipo: 'carnet_sanidad', fecha_vencimiento: '2026-10-01' },
      ],
    });
    const sello = calcularSello(puesto, AHORA, REGLAS);
    expect(sello.color).toBe('rojo');
    expect(sello.motivos).toContain('Sin carnet de sanidad vigente');
  });

  test('rojo cuando el puesto está suspendido', () => {
    expect(calcularSello(puestoBase({ estado: 'suspendido' }), AHORA, REGLAS).color).toBe('rojo');
  });

  test('amarillo cuando el último control de frío supera el máximo', () => {
    const sello = calcularSello(puestoBase({ ultimo_control: { temperatura_c: 7, hora_registro: '2026-11-16T09:00:00Z' } }), AHORA, REGLAS);
    expect(sello.color).toBe('amarillo');
    expect(sello.motivos).toContain('Último control de frío sobre 4 °C');
  });

  test('amarillo cuando el control de frío tiene más de 24 horas', () => {
    const sello = calcularSello(puestoBase({ ultimo_control: { temperatura_c: 2, hora_registro: '2026-11-14T08:00:00Z' } }), AHORA, REGLAS);
    expect(sello.color).toBe('amarillo');
  });

  test('amarillo cuando todavía no tiene inspección', () => {
    const sello = calcularSello(puestoBase({ estado: 'pendiente', ultima_inspeccion: null }), AHORA, REGLAS);
    expect(sello.color).toBe('amarillo');
    expect(sello.motivos).toContain('Sin inspección registrada');
  });
});

describe('evaluarControlFrio', () => {
  test('en rango a 4 °C (límite incluido)', () => {
    expect(evaluarControlFrio(4, 4)).toEqual({ enRango: true, alerta: null });
  });

  test('genera alerta a 4.5 °C', () => {
    expect(evaluarControlFrio(4.5, 4).enRango).toBe(false);
  });
});

describe('validarInspeccion', () => {
  test('no permite aprobar si la pota se vende como otro pescado', () => {
    expect(validarInspeccion({ resultado: 'aprobado', rotulado_veraz: false, higiene_ok: true })).not.toBeNull();
  });

  test('permite observar aunque el rotulado no sea veraz', () => {
    expect(validarInspeccion({ resultado: 'observado', rotulado_veraz: false, higiene_ok: true })).toBeNull();
  });
});
