import React, { useState } from 'react';

const API_URL = 'http://localhost:3001'; // Cambia si tu API corre en otro puerto

function App() {
  const [curso, setCurso] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [nuevoNombre, setNuevoNombre] = useState({});
  const [cargando, setCargando] = useState(false);

  // Consultar archivos del curso
  const consultarArchivos = async () => {
    setCargando(true);
    setArchivos([]);
    try {
      const res = await fetch(`${API_URL}/recursos/${curso}`);
      const data = await res.json();
      setArchivos(data || []);
    } catch (e) {
      alert('Error al consultar archivos');
    }
    setCargando(false); 
  };

  // Eliminar archivo
  const eliminarArchivo = async (nombre) => {
    if (!window.confirm(`¿Eliminar ${nombre}?`)) return;
    await fetch(`${API_URL}/recursos/eliminar`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso, nombreArchivo: nombre }),
    });
    consultarArchivos();
  };

  // Renombrar archivo
  const renombrarArchivo = async (nombre) => {
    const nombreNuevo = nuevoNombre[nombre];
    if (!nombreNuevo) return alert('Ingresa el nuevo nombre');
    await fetch(`${API_URL}/recursos/renombrar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso, nombreActual: nombre, nombreNuevo }),
    });
    setNuevoNombre({ ...nuevoNombre, [nombre]: '' });
    consultarArchivos();
  };

  // Subir archivo individual
  const subirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('archivo', file);
    await fetch(`${API_URL}/recursos/${curso}`, {
      method: 'POST',
      body: formData,
    });
    consultarArchivos();
  };

  // Subir varios archivos (como carpeta)
  const subirCarpeta = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append('archivo', file);
      await fetch(`${API_URL}/recursos/${curso}`, {
        method: 'POST',
        body: formData,
      });
    }
    consultarArchivos();
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
      <h2>Gestión de Archivos por Curso</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Código del curso"
          value={curso}
          onChange={e => setCurso(e.target.value)}
          style={{ width: 220, marginRight: 0 }}
        />
        <button onClick={consultarArchivos} disabled={!curso || cargando}>
          Consultar archivos
        </button>
      </div>
      <hr />
      {cargando && <p>Cargando...</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {archivos.map(archivo => (
          <li
            key={archivo.name}
            style={{
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ flex: 1 }}>{archivo.name}</span>
            <button onClick={() => eliminarArchivo(archivo.name)}>
              Eliminar
            </button>
            <input
              placeholder="Nuevo nombre"
              value={nuevoNombre[archivo.name] || ''}
              onChange={e =>
                setNuevoNombre({ ...nuevoNombre, [archivo.name]: e.target.value })
              }
              style={{ marginLeft: 8 }}
            />
            <button onClick={() => renombrarArchivo(archivo.name)}>
              Renombrar
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
          <b>Agregar carpeta (selección múltiple):</b>
          <input
            type="file"
            multiple
            webkitdirectory="true"
            directory="true"
            style={{ marginLeft: 8 }}
            onChange={subirCarpeta}
          />
        </label>
        <div style={{ fontSize: 12, color: '#888' }}>
          (Selecciona varios archivos, se subirán uno a uno)
        </div>
      </div>
    </div>
  );
}

export default App;