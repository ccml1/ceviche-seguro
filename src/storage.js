// Almacenamiento de archivos (fotos de licencia o carnet).
// - En Azure: Blob Storage (contenedor privado), si existe AZURE_STORAGE_CONNECTION_STRING.
// - En local y en CI: carpeta ./uploads.
// Los archivos nunca se exponen públicamente: se descargan a través de la API con sesión.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');

const CARPETA_LOCAL = path.join(__dirname, '..', 'uploads');

function nombreSeguro(original) {
  const ext = path.extname(original || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}

async function contenedorAzure() {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const servicio = BlobServiceClient.fromConnectionString(config.storageConnection);
  const contenedor = servicio.getContainerClient(config.storageContainer);
  await contenedor.createIfNotExists();
  return contenedor;
}

async function guardar(archivo) {
  const nombre = nombreSeguro(archivo.originalname);
  if (config.storageConnection) {
    const contenedor = await contenedorAzure();
    await contenedor.getBlockBlobClient(nombre).uploadData(archivo.buffer, {
      blobHTTPHeaders: { blobContentType: archivo.mimetype },
    });
  } else {
    await fs.mkdir(CARPETA_LOCAL, { recursive: true });
    await fs.writeFile(path.join(CARPETA_LOCAL, nombre), archivo.buffer);
  }
  return nombre;
}

async function leer(nombre) {
  if (!/^[\w.-]+$/.test(nombre)) throw new Error('Nombre de archivo inválido');
  if (config.storageConnection) {
    const contenedor = await contenedorAzure();
    return contenedor.getBlockBlobClient(nombre).downloadToBuffer();
  }
  return fs.readFile(path.join(CARPETA_LOCAL, nombre));
}

module.exports = { guardar, leer };
