import React, { useState } from 'react';
import ramos from './ramos.json';

const API_URL = 'http://localhost:3001';

// Función para determinar la carrera basándose en el código del ramo
function getCarrera(codigo) {
  if (!codigo) return null;
  const codigoUpper = codigo.toUpperCase();
  
  // Códigos que pertenecen a plan-comun (ciencias básicas y comunes)
  if (codigoUpper.startsWith('CBM-') || // Matemáticas básicas
      codigoUpper.startsWith('CBF-') || // Física básica
      codigoUpper.startsWith('CBQ-') || // Química básica
      codigoUpper.startsWith('CBE-') || // Estadística básica
      codigoUpper.startsWith('FIC-') || // Comunicación
      codigoUpper === 'CIT-1000' ||      // Programación (plan común)
      codigoUpper === 'CII-2750' ||      // Optimización (plan común)
      codigoUpper === 'CII-2100' ||      // Intro economía (plan común)
      codigoUpper === 'CII-1000') {      // Contabilidad (plan común)
    return 'plan-comun';
  }
  
  // Ingeniería Industrial (CII-)
  if (codigoUpper.startsWith('CII-')) {
    return 'eii';
  }
  
  // Ingeniería en Informática y Telecomunicaciones (CIT-)
  if (codigoUpper.startsWith('CIT-')) {
    return 'eit';
  }
  
  // Ingeniería en Obras Civiles (COC-)
  if (codigoUpper.startsWith('COC-')) {
    return 'eoc';
  }
  
  return null;
}

// Función para construir la ruta completa
function getRutaCompleta(codigo) {
  const carrera = getCarrera(codigo);
  if (!carrera) return codigo;
  return `${carrera}/${codigo.toUpperCase()}`;
}

function App() {
  const [curso, setCurso] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [nuevoNombre, setNuevoNombre] = useState({});
  const [cargando, setCargando] = useState(false);
  const [seleccionados, setSeleccionados] = useState({});
  const [mostrarLista, setMostrarLista] = useState(false);

  // Buscar nombre del curso por código
  const nombreCurso = (() => {
    const found = ramos.find(r => r.codigo && r.codigo.toLowerCase() === curso.toLowerCase());
    return found ? found.nombre : '';
  })();

  // Obtener la carrera del curso actual
  const carreraActual = getCarrera(curso);
  const rutaCompleta = getRutaCompleta(curso);

  // Consultar archivos del curso
  const consultarArchivos = async () => {
    setCargando(true);
    setArchivos([]);
    try {
      const ruta = getRutaCompleta(curso);
      const res = await fetch(`${API_URL}/recursos/${ruta}`);
      const data = await res.json();
      setArchivos(data || []);
    } catch (e) {
      alert('Error al consultar archivos');
    }
    setCargando(false); 
  };

  // Renombrar archivo individual
  const renombrarArchivo = async (nombre) => {
    const nombreNuevo = nuevoNombre[nombre];
    if (!nombreNuevo) return alert('Ingresa el nuevo nombre');
    const ruta = getRutaCompleta(curso);
    await fetch(`${API_URL}/recursos/renombrar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso: ruta, nombreActual: nombre, nombreNuevo }),
    });
    setNuevoNombre({ ...nuevoNombre, [nombre]: '' });
  };

  // Eliminar archivo
  const eliminarArchivo = async (nombre) => {
    if (!window.confirm(`¿Eliminar ${nombre}?`)) return;
    const ruta = getRutaCompleta(curso);
    await fetch(`${API_URL}/recursos/eliminar`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso: ruta, nombreArchivo: nombre }),
    });
    consultarArchivos();
  };

  // Renombrar archivos seleccionados
  const renombrarSeleccionados = async () => {
    const archivosARenombrar = archivos.filter(a => seleccionados[a.name]);
    for (const archivo of archivosARenombrar) {
      const nombreNuevo = nuevoNombre[archivo.name];
      if (nombreNuevo && nombreNuevo !== archivo.name) {
        await renombrarArchivo(archivo.name);
      }
    }
    consultarArchivos();
  };

  // Subir archivo individual
  const subirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('archivo', file);
    const ruta = getRutaCompleta(curso);
    await fetch(`${API_URL}/recursos/${ruta}`, {
      method: 'POST',
      body: formData,
    });
    consultarArchivos();
  };

  // Subir varios archivos (como carpeta)
  const subirCarpeta = async (e) => {
    const files = Array.from(e.target.files);
    const ruta = getRutaCompleta(curso);
    for (const file of files) {
      const formData = new FormData();
      formData.append('archivo', file);
      await fetch(`${API_URL}/recursos/${ruta}`, {
        method: 'POST',
        body: formData,
      });
    }
    consultarArchivos();
  };

  // Seleccionar un curso desde la lista
  const seleccionarCurso = (codigo) => {
    setCurso(codigo);
    setMostrarLista(false);
    // Consultar archivos automáticamente después de un breve delay para que se actualice el estado
    setTimeout(() => {
      const ruta = getRutaCompleta(codigo);
      setCargando(true);
      setArchivos([]);
      fetch(`${API_URL}/recursos/${ruta}`)
        .then(res => res.json())
        .then(data => setArchivos(data || []))
        .catch(() => alert('Error al consultar archivos'))
        .finally(() => setCargando(false));
    }, 100);
  };

  // Manejar selección de checkbox
  const handleCheck = (name) => {
    setSeleccionados(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Manejar Enter en input de curso
  const handleCursoKeyDown = (e) => {
    if (e.key === 'Enter') {
      consultarArchivos();
    }
  };

  // Manejar Enter en input de nuevo nombre
  const handleNuevoNombreKeyDown = (archivoName, e) => {
    if (e.key === 'Enter' && nuevoNombre[archivoName]) {
      setSeleccionados(prev => ({ ...prev, [archivoName]: true }));
    }
  };

  return (
    <div
      style={{
        maxWidth: '80vw',
        minHeight: '80vh',
        margin: 'auto',
        padding: 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2>ePauta Admin</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setMostrarLista(v => !v)}
          style={{ padding: '4px 10px', fontSize: 14 }}
        >
          {mostrarLista ? 'Ocultar cursos' : 'Ver cursos'}
        </button>
        <input
          placeholder="Código del curso"
          value={curso}
          onChange={e => setCurso(e.target.value)}
          onKeyDown={handleCursoKeyDown}
          style={{ width: 220, marginRight: 0 }}
        />
        <button onClick={consultarArchivos} disabled={!curso || cargando}>
          Consultar archivos
        </button>
      </div>
      {mostrarLista && (
        <div
          style={{
            maxHeight: 300,
            overflowY: 'auto',
            background: '#f8f8ff',
            border: '1px solid #ccc',
            borderRadius: 6,
            marginBottom: 16,
            padding: 12,
            fontSize: 15,
          }}
        >
          <b>Todos los cursos (click en código para buscar):</b>
          <ul style={{ columns: 2, margin: 0, padding: 0, listStyle: 'none' }}>
            {ramos.map(r => (
              <li key={r.codigo || r.nombre} style={{ marginBottom: 4 }}>
                {r.codigo ? (
                  <span
                    onClick={() => seleccionarCurso(r.codigo)}
                    style={{
                      fontFamily: 'monospace',
                      color: '#0066cc',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      marginRight: 4,
                    }}
                    title={`Buscar archivos de ${r.codigo}`}
                  >
                    {r.codigo}
                  </span>
                ) : null}
                <span style={{ color: '#333' }}>
                  {r.codigo ? ' — ' : ''}{r.nombre}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {curso && (
        <div style={{ marginBottom: 8, color: '#444', fontWeight: 'bold', fontSize: 18 }}>
          {nombreCurso ? `Curso: ${nombreCurso}` : 'Curso no encontrado'}
          {carreraActual && (
            <span style={{ fontSize: 14, fontWeight: 'normal', marginLeft: 12, color: '#666' }}>
              (Carrera: {carreraActual})
            </span>
          )}
        </div>
      )}
      <hr />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={renombrarSeleccionados} disabled={Object.values(seleccionados).every(v => !v)}>
          Renombrar seleccionados
        </button>
      </div>
      {cargando && <p>Cargando...</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {[...archivos]
          .sort((a, b) => {
            const aEndsWithF = a.name.toLowerCase().endsWith('f');
            const bEndsWithF = b.name.toLowerCase().endsWith('f');
            if (aEndsWithF && !bEndsWithF) return -1;
            if (!aEndsWithF && bEndsWithF) return 1;
            return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
          })
          .map(archivo => (
            <li
              key={archivo.name}
              style={{
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 4,
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e3eaff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ flex: 1 }}>{archivo.name}</span>
              <input
                placeholder="Nuevo nombre"
                value={nuevoNombre[archivo.name] || ''}
                onChange={e =>
                  setNuevoNombre({ ...nuevoNombre, [archivo.name]: e.target.value })
                }
                onKeyDown={e => handleNuevoNombreKeyDown(archivo.name, e)}
                style={{ marginLeft: 8, width: 180 }}
              />
              <input
                type="checkbox"
                checked={!!seleccionados[archivo.name]}
                onChange={() => handleCheck(archivo.name)}
                style={{ marginLeft: 8 }}
              />
              <button
                style={{ marginLeft: 8 }}
                onClick={() => eliminarArchivo(archivo.name)}
              >
                Eliminar
              </button>
            </li>
          ))}
      </ul>
      <hr />
      <div>
        <label>
          <b>Agregar archivo:</b>
          <input
            type="file"
            style={{ marginLeft: 8 }}
            onChange={subirArchivo}
          />
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>
          <b>Agregar carpeta:</b>
          <input
            type="file"
            multiple
            webkitdirectory="true"
            directory="true"
            style={{ marginLeft: 8 }}
            onChange={subirCarpeta}
          />
        </label>
      </div>
    </div>
  );
}

export default App;