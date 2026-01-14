import express from 'express';
import { r2Client, bucketName, publicDomain } from './r2Client.js';
import { 
  ListObjectsV2Command, 
  PutObjectCommand, 
  CopyObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
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
  try {
    const { ruta } = req.params;
    const prefix = ruta ? `${ruta}/` : '';
    
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    
    const response = await r2Client.send(command);
    const files = response.Contents || [];
    
    const data = files.map(f => ({ 
      name: f.Key.split('/').pop(), 
      path: f.Key,
      size: f.Size,
      lastModified: f.LastModified,
      url: publicDomain ? `${publicDomain}/${f.Key}` : null
    }));
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener/descargar un archivo específico
app.get('/archivo/:ruta(*)', async (req, res) => {
  try {
    const { ruta } = req.params;
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: ruta,
    });
    
    const response = await r2Client.send(command);
    
    // Configurar headers para la descarga
    res.setHeader('Content-Type', response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', response.ContentLength);
    
    // Enviar el stream del archivo
    response.Body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subir archivo a un curso/ruta
app.post('/recursos/:ruta(*)', upload.single('archivo'), async (req, res) => {
  try {
    const { ruta } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No se envió archivo' });
    
    const sanitized = file.originalname
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-');
    const fullPath = ruta ? `${ruta}/${sanitized}` : sanitized;
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fullPath,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    
    await r2Client.send(command);
    
    res.json({ 
      mensaje: 'Archivo subido correctamente', 
      data: { 
        name: fullPath,
        url: publicDomain ? `${publicDomain}/${fullPath}` : null
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    try {
      const archivoPath = path.join(carpetaAbsoluta, archivo);
      const buffer = fs.readFileSync(archivoPath);
      const destPath = `${curso}/${archivo}`;
      
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: destPath,
        Body: buffer,
        ContentType: 'application/octet-stream',
      });
      
      await r2Client.send(command);
      resultados.push({ 
        archivo, 
        data: { 
          name: destPath,
          url: publicDomain ? `${publicDomain}/${destPath}` : null
        }, 
        error: null 
      });
    } catch (err) {
      resultados.push({ archivo, data: null, error: err.message });
    }
  }
  res.json({ mensaje: 'Carga masiva finalizada', resultados });
});

// Renombrar un archivo en un curso
app.patch('/recursos/renombrar', express.json(), async (req, res) => {
  try {
    const { curso, nombreActual, nombreNuevo } = req.body;
    if (!curso || !nombreActual || !nombreNuevo) {
      return res.status(400).json({ error: 'Faltan parámetros: curso, nombreActual y nombreNuevo son requeridos' });
    }
    const srcPath = `${curso}/${nombreActual}`;
    const destPath = `${curso}/${nombreNuevo}`;
    
    // Copiar el archivo al nuevo nombre
    const copyCommand = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${srcPath}`,
      Key: destPath,
    });
    await r2Client.send(copyCommand);
    
    // Eliminar el archivo original
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: srcPath,
    });
    await r2Client.send(deleteCommand);
    
    res.json({ 
      mensaje: 'Archivo renombrado correctamente', 
      data: { 
        name: destPath,
        url: publicDomain ? `${publicDomain}/${destPath}` : null
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un archivo en un curso
app.delete('/recursos/eliminar', express.json(), async (req, res) => {
  try {
    const { curso, nombreArchivo } = req.body;
    if (!curso || !nombreArchivo) {
      return res.status(400).json({ error: 'Faltan parámetros: curso y nombreArchivo son requeridos' });
    }
    const filePath = `${curso}/${nombreArchivo}`;
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    });
    
    await r2Client.send(command);
    res.json({ mensaje: 'Archivo eliminado correctamente', data: { name: filePath } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}`);
  console.log(`Conectado a Cloudflare R2 bucket: ${bucketName}`);
});