# Dibujando Sonrisas 💙

_Llevando atención médica y odontológica esencial a las comunidades de Honduras que más lo necesitan, una sonrisa a la vez._

---

## 📖 Sobre la Fundación

**Dibujando Sonrisas** es una fundación cristiana dedicada a mejorar la salud y el bienestar de las familias en zonas remotas y vulnerables de Honduras.

Nuestro trabajo se centra en tres pilares fundamentales:

1. **Brigadas Médico-Odontológicas**: Consultas, extracciones, limpiezas y tratamientos para personas sin acceso a centros de salud (más de 15 brigadas realizadas).
2. **Apoyo Comunitario**: Donaciones de insumos médicos a hospitales y asilos de ancianos.
3. **Educación en Salud**: Empoderando a las comunidades mediante la prevención.

---

## 💻 Sobre este Proyecto (Web App)

Este repositorio contiene la plataforma web principal de la fundación. Ha sido migrada desde una arquitectura clásica (HTML/Vanilla JS) a una infraestructura web moderna, rápida y escalable utilizando **Next.js**, optimizada para SEO y mantenibilidad.

### Stack Tecnológico

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) / React
- **Estilos**: Vanilla CSS Modules (`.module.css`), priorizando un diseño limpio, ligero y completamente _Responsive_.
- **Base de Datos & Backend**: [Supabase](https://supabase.com/) (PostgreSQL).
- **Almacenamiento (Storage)**: Supabase Storage Bucket para la gestión dinámica de las galerías fotográficas de las brigadas.
- **Formateo de Código**: [Prettier](https://prettier.io/)

### Arquitectura y Características

- **Capa de Servicios (Service Layer)**: Todas las consultas a base de datos y almacenamiento están desacopladas de la Interfaz de Usuario (UI) dentro de `src/lib/db` y `src/lib/storage`, utilizando un patrón _Singleton_ para el cliente de Supabase.
- **Formularios Dinámicos**: Integración directa con base de datos para registrar aplicaciones de Voluntarios y Mensajes de Contacto de manera segura.
- **Carrusel Nativo**: Galería de brigadas construida a medida utilizando cálculos del DOM altamente eficientes, sin dependencias de terceros pesadas.

---

## 🛠️ Configuración Local

Si deseas correr este proyecto en tu entorno de desarrollo local, sigue estos pasos:

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/New-DS-Web.git
cd New-DS-Web
```

### 2. Instalar dependencias

Asegúrate de tener [Node.js](https://nodejs.org/) instalado.

```bash
npm install
```

### 3. Variables de Entorno

Copia `.env.example` como `.env` y llena los valores (cada variable dice de dónde sale):

```bash
cp .env.example .env
```

Quién recibe cada aviso por correo (mensajes de contacto, inscripciones de voluntarios, usuarios nuevos...) se elige en el panel, en **Ajustes → Correos** (menú del usuario), entre los usuarios registrados. Los avisos que existen están en `src/lib/avisosCorreo.ts`. Sin `RESEND_API_KEY` y `SUPABASE_SECRET_KEY` no se envían los correos, pero todo lo demás se guarda igual y los avisos siguen llegando a la campana del panel.

### Migraciones de base de datos

Los cambios a la base van en `supabase/migrations/`. El deploy de producción en Netlify los aplica solo (`supabase db push`, ver `netlify.toml`) antes de compilar; necesita la variable secreta `SUPABASE_DB_URL` en Netlify. Para aplicarlos a mano: `npx supabase db push`.

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

El servidor iniciará en `http://localhost:3000`.

### 5. Formateo de código

Para mantener el estándar de estilo del código del proyecto, utiliza Prettier antes de hacer commits:

```bash
npm run format
```

---

## 🤝 Cómo Contribuir

Si eres desarrollador y quieres sumarte a nuestra causa:

1. Haz un Fork del repositorio.
2. Crea tu rama de características (`git checkout -b feature/NuevaCaracteristica`).
3. Haz commit a tus cambios (`git commit -m 'Agrega nueva característica'`).
4. Haz push a la rama (`git push origin feature/NuevaCaracteristica`).
5. Abre un Pull Request.

---

_“No te niegues a hacer el bien a quien es debido, cuando tuvieres poder para hacerlo.”_ — **Proverbios 3:27**
