// Validaciones simples de entrada. Si algo falla se responde 400 con el detalle.
class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.status = 400;
  }
}

function requerido(cuerpo, campos) {
  const faltan = campos.filter((c) => cuerpo[c] === undefined || cuerpo[c] === null || cuerpo[c] === '');
  if (faltan.length) throw new ErrorValidacion(`Faltan campos: ${faltan.join(', ')}`);
}

function enLista(valor, lista, campo) {
  if (!lista.includes(valor)) throw new ErrorValidacion(`${campo} debe ser uno de: ${lista.join(', ')}`);
}

function numero(valor, campo) {
  const n = Number(valor);
  if (Number.isNaN(n)) throw new ErrorValidacion(`${campo} debe ser numérico`);
  return n;
}

function booleano(valor, campo) {
  if (valor === true || valor === 'true') return true;
  if (valor === false || valor === 'false') return false;
  throw new ErrorValidacion(`${campo} debe ser verdadero o falso`);
}

function entero(valor, campo) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorValidacion(`${campo} inválido`);
  return n;
}

module.exports = { ErrorValidacion, requerido, enLista, numero, booleano, entero };
