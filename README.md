# Organiza — gestor personal de tareas

Aplicación web de tareas desarrollada con React y Vite. Permite crear una cuenta local de demostración, organizar actividades por estado y prioridad, y buscar en títulos y descripciones.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación quedará disponible en la dirección local que indique Vite (normalmente `http://localhost:5173`).

## Compilación y revisión

```bash
npm run lint
npm run build
npm run preview
```

## Funcionalidades

- Registro e inicio de sesión en modo demostración.
- Creación, edición, eliminación y cambio de estado de tareas.
- Título, descripción opcional, vencimiento y prioridad.
- Tablero con columnas Por hacer, En progreso y Completadas.
- Búsqueda por título o descripción y filtros por estado y prioridad.
- Progreso de tareas completadas y datos separados por cuenta del navegador.
- Diseño adaptable a móvil y escritorio.

## Componentes principales

- `src/App.jsx`: flujo de acceso y registro, estado de sesión, tablero, filtros y operaciones CRUD.
- `src/App.css`: estilos de la interfaz, el tablero y el diálogo de edición, con reglas responsivas.
- `src/index.css`: estilos globales, tipografía y foco visible.
- `src/main.jsx`: punto de entrada de React.

## Persistencia y autenticación

Esta entrega es un prototipo exclusivamente frontend: las cuentas y las tareas se almacenan en `localStorage` del navegador. La contraseña se compara mediante un hash con sal, pero esto **no equivale a autenticación segura**: no hay servidor, control de sesiones, recuperación de contraseñas ni sincronización entre dispositivos. No se deben usar contraseñas reales ni información sensible. Para producción, se requiere un backend y un proveedor de identidad o una API autenticada.

## Publicación

Es una aplicación estática compatible con GitHub Pages, Netlify o Render Static Sites:

- Comando de compilación: `npm run build`
- Directorio de publicación: `dist`
- Para una SPA, configura la reescritura de rutas a `index.html` si el proveedor lo requiere.

