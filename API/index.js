import express from 'express';
import supabase from './supabase.js';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cors from 'cors'; 
dotenv.config();

const app = express();
app.use(cors()); 
const upload = multer({ storage: multer.memoryStorage() });

// Listar archivos de una ruta
app.get('/recursos/:ruta(*)', async (req, res) => {
  const { ruta } = req.params;
  const { limit = 100, offset = 0 } = req.query;
  const { data, error } = await supabase
    .storage
    .from('recursos')
    .list(ruta, { limit: Number(limit), offset: Number(offset), sortBy: { column: 'name', order: 'asc' } });
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// Subir archivo a un curso/ruta
app.post('/recursos/:ruta(*)', upload.single('archivo'), async (req, res) => {
  const { ruta } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No se envió archivo' });
  const fullPath = ruta ? `${ruta}/${file.originalname}` : file.originalname;
  const { data, error } = await supabase
    .storage
    .from('recursos')
    .upload(fullPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });
  if (error) return res.status(500).json({ error });
  res.json({ mensaje: 'Archivo subido correctamente', data });
});

// Subir todos los archivos de una carpeta local a un curso
app.post('/recursos/subir-carpeta', express.json(), async (req, res) => {
  const { curso, carpeta } = req.body;
  if (!curso || !carpeta) {
    return res.status(400).json({ error: 'Faltan parámetros: curso y carpeta son requeridos' });
  }
  const carpetaAbsoluta = path.resolve(carpeta);
  if (!fs.existsSync(carpetaAbsoluta) || !fs.lstatSync(carpetaAbsoluta).isDirectory()) {
    return res.status(400).json({ error: 'La carpeta especificada no existe o no es un directorio' });
  }
  const archivos = fs.readdirSync(carpetaAbsoluta).filter(f => fs.lstatSync(path.join(carpetaAbsoluta, f)).isFile());
  const resultados = [];
  for (const archivo of archivos) {
    const archivoPath = path.join(carpetaAbsoluta, archivo);
    const buffer = fs.readFileSync(archivoPath);
    const { data, error } = await supabase
      .storage
      .from('recursos')
      .upload(`${curso}/${archivo}`, buffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });
    resultados.push({ archivo, data, error });
  }
  res.json({ mensaje: 'Carga masiva finalizada', resultados });
});

// Renombrar un archivo en un curso
app.patch('/recursos/renombrar', express.json(), async (req, res) => {
  const { curso, nombreActual, nombreNuevo } = req.body;
  if (!curso || !nombreActual || !nombreNuevo) {
    return res.status(400).json({ error: 'Faltan parámetros: curso, nombreActual y nombreNuevo son requeridos' });
  }
  // Descargar el archivo original
  const { data: archivo, error: errorDescarga } = await supabase
    .storage
    .from('recursos')
    .download(`${curso}/${nombreActual}`);
  if (errorDescarga || !archivo) {
    return res.status(404).json({ error: 'No se pudo descargar el archivo original', detalle: errorDescarga });
  }
  // Subir el archivo con el nuevo nombre
  const buffer = Buffer.from(await archivo.arrayBuffer());
  const { data: dataSubida, error: errorSubida } = await supabase
    .storage
    .from('recursos')
    .upload(`${curso}/${nombreNuevo}`, buffer, {
      contentType: 'application/octet-stream',
      upsert: true
    });
  if (errorSubida) {
    return res.status(500).json({ error: 'No se pudo subir el archivo con el nuevo nombre', detalle: errorSubida });
  }
  // Eliminar el archivo original
  const { error: errorEliminacion } = await supabase
    .storage
    .from('recursos')
    .remove([`${curso}/${nombreActual}`]);
  if (errorEliminacion) {
    return res.status(500).json({ error: 'Archivo renombrado, pero no se pudo eliminar el original', detalle: errorEliminacion });
  }
  res.json({ mensaje: 'Archivo renombrado correctamente', data: dataSubida });
});

// Eliminar un archivo en un curso
app.delete('/recursos/eliminar', express.json(), async (req, res) => {
  const { curso, nombreArchivo } = req.body;
  if (!curso || !nombreArchivo) {
    return res.status(400).json({ error: 'Faltan parámetros: curso y nombreArchivo son requeridos' });
  }
  const { data, error } = await supabase
    .storage
    .from('recursos')
    .remove([`${curso}/${nombreArchivo}`]);
  if (error) {
    return res.status(500).json({ error: 'No se pudo eliminar el archivo', detalle: error });
  }
  res.json({ mensaje: 'Archivo eliminado correctamente', data });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
});