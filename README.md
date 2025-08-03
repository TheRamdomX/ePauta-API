# ePauta

**ePauta** es una plataforma web para almacenar y compartir pautas y evaluaciones de la Facultad de Ingeniería de la Universidad Diego Portales. El proyecto está compuesto por tres partes principales: el sitio web público, una API de administración y un frontend de gestión para administradores.

---

## Componentes del Proyecto

### 1. [epauta](https://epauta.vercel.app)
- **¿Qué es?**  
  Es el sitio web público donde estudiantes y usuarios pueden buscar, visualizar y descargar material académico.
- **Tecnologías:**  
  - [Astro](https://astro.build/) (framework web moderno)
  - [Vercel](https://vercel.com/) (hosting)
  - [Supabase Storage](https://supabase.com/) (almacenamiento de archivos)
- **Ubicación:**  
  Carpeta [`epauta`](epauta/)

### 2. API
- **¿Qué es?**  
  Es una API RESTful que administra los archivos y recursos de la plataforma, permitiendo listar, subir, eliminar y renombrar archivos en Supabase Storage.
- **Tecnologías:**  
  - [Node.js](https://nodejs.org/)
  - [Express](https://expressjs.com/)
  - [Supabase JS](https://supabase.com/docs/reference/javascript/introduction)
  - [Multer](https://github.com/expressjs/multer) (subida de archivos)
  - [CORS](https://github.com/expressjs/cors)
  - [dotenv](https://github.com/motdotla/dotenv)
- **Ubicación:**  
  Carpeta [`API`](API/)

### 3. Front
- **¿Qué es?**  
  Es una interfaz web privada para administradores, que permite gestionar los archivos de cada curso de forma visual y sencilla, sin usar la consola.
- **Tecnologías:**  
  - [React](https://react.dev/)
  - [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- **Ubicación:**  
  Carpeta [`front`](front/)

---

## ¿Cómo funciona todo en conjunto?

1. **Usuarios** acceden a [epauta.vercel.app](https://epauta.vercel.app) para buscar y descargar material académico. El sitio obtiene la lista de archivos desde Supabase Storage usando el SDK de Supabase.
2. **Administradores** usan el frontend de gestión (Front) para subir, eliminar o renombrar archivos de cada curso.  
3. El **frontend de administración** se comunica con la **API** (Node.js/Express), que a su vez realiza las operaciones sobre Supabase Storage.
4. **Supabase Storage** es el repositorio central de todos los archivos, accesible tanto desde la web pública como desde la API de administración.

---

## Diagrama de flujo

```
[Administrador] --(React Front)--> [API Express] --(SDK)--> [Supabase Storage]
      ^                                                      |
      |                                                      v
[Usuario] <-------------------(Astro Web)-------------------> [Supabase Storage]
```

