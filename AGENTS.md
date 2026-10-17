<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guide for AI Coding Agents

Instructions for any AI coding agent working in this repository. Read this file first, then open [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for the chapter that covers the area you are changing (database schema, authorization model, modules). `CLAUDE.md` imports this file. If this guide and the code disagree, the code wins: fix this guide.

## 1. Project at a Glance

- **What it is:** the web platform of the Dibujando Sonrisas Foundation (Honduras), which runs medical and dental brigades. One Next.js app contains the **public website** (`/`, `/brigadas`, `/voluntariado`, `/donar`, ...) and a **private administration panel** (`/administracion/*`) for inventory, patients, pharmacy, brigades, volunteers, donations, sales, reports and user and role management.
- **Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Supabase (PostgreSQL, Auth, Storage, Realtime), plain CSS (global tokens plus CSS Modules), Zod, Resend and React Email (e-mail), LogTape (logging) and `lucide-react`. Deployed on Netlify.
- **Language:** the interface is in Spanish (`<html lang="es">`). See [Section 5.1](#51-language).
- **There is no automated test suite.** See [Section 2](#2-commands) and [Section 10](#10-pitfalls-and-known-baseline) for how to verify a change.

## 2. Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server at `http://localhost:3000`. Needs a filled-in `.env` ([Section 5.6](#56-environment-variables)). |
| `npm run build` and `npm start` | Production build and serving it. |
| `npx tsc --noEmit` | Type check. It passes cleanly today; keep it that way. |
| `npx biome check <files>` | Check formatting, lint rules and import order of the files you changed (`--write` applies the safe fixes). The repo-wide `npm run lint` (`biome check .`) has a pre-existing backlog ([Section 10](#10-pitfalls-and-known-baseline)). |
| `npm run format` | `biome format --write .`. The tree is already formatted, so it should change nothing. |
| `npx supabase migration new <name>` | Create a timestamped migration in `supabase/migrations/`. |
| `npx supabase db push` | Apply migrations to the linked **remote** database. Never run it without explicit approval from the user. |
| `npm run offline`, `npm run offline:subir`, `npm run offline:sincronizar` | Brigade offline server and its synchronization (needs Docker). See [Section 5.7](#57-offline-mode). |

Biome is the only formatter and linter (ESLint and Prettier are not used). Never pass `--unsafe` to it ([Section 10](#10-pitfalls-and-known-baseline)).

**Pre-commit hook.** `npm install` runs the `prepare` script, which points git at `.githooks/`. Its `pre-commit` blocks the commit when `biome check --staged --error-on-warnings` reports any error or warning in the staged files, or when `tsc --noEmit` fails. Fix the reported problems; never bypass the hook with `--no-verify`.

## 3. Repository Map

### 3.1 Folder Structure

```
.
├── AGENTS.md, CLAUDE.md         Agent instructions (this file and its Claude Code companion)
├── SYSTEM_ARCHITECTURE.md       Deep technical reference: database, authorization, modules
├── README.md                    Public project README (Spanish, partly outdated)
├── netlify.toml                 Build and deploy; production runs `supabase db push` before `npm run build`
├── .env.example                 Environment variable template (real values go in the git-ignored `.env`)
├── public/                      Static assets served at `/` (logos, hero images, photos, video)
├── img/                         Legacy copy of images from the old static site; not referenced by the app
├── scripts/                     Offline-mode tooling: offline.mjs, offline.sql, offline-subida.sql
├── supabase/
│   ├── config.toml              Supabase CLI configuration
│   ├── migrations/              Timestamped SQL migrations: the source of truth for the schema
│   └── audit/                   One-off audit queries (not migrations)
├── .agents/skills/              Vendored Supabase agent skills (pinned in skills-lock.json)
├── .offline/                    Runtime state of the offline server (git-ignored)
└── src/
    ├── proxy.ts                 Next.js Proxy (formerly Middleware): session refresh and route authorization
    ├── app/                     App Router
    │   ├── layout.tsx           Root layout: fonts, global CSS, metadata
    │   ├── page.tsx             Public home page
    │   ├── sobre-nosotros/ nuestro-trabajo/ brigadas/ voluntariado/ donar/ contacto/
    │   │                        Public pages (page.tsx each; forms add an actions.ts)
    │   ├── components/          Public-site components: Header, Footer, PageHero, Combobox, ...
    │   ├── auth/                login, registro, recuperar-contrasena, crear-contrasena, sin-acceso (+ actions.ts)
    │   └── administracion/      Protected administrative panel
    │       ├── layout.tsx       Resolves the auth context and mounts PermissionsProvider
    │       ├── components/      Shared admin UI; dashboard/ widgets; navModules.tsx is the sidebar
    │       └── <module>/        One folder per module (anatomy below)
    ├── lib/
    │   ├── auth/                permissions.ts (permission catalog), session.ts (guards)
    │   ├── db/                  Service functions per domain: inventario, farmacia, pacientes, ...
    │   ├── email/               client.ts (Resend), emails.tsx (one send function per e-mail), templates/ (React Email)
    │   ├── storage/             Supabase Storage helpers (brigade photos)
    │   ├── validation/          Zod schemas and validators
    │   ├── coding/              Code and token generators
    │   ├── supabase.ts, supabase-server.ts, supabase-admin.ts    The three Supabase clients
    │   ├── cuentas.ts, notificaciones.ts, avisosCorreo.ts, realtime.ts, offline.ts, texto.ts
    │   └── database.types.ts    Generated Supabase types: never edit by hand
    └── styles/
        ├── globals.css          Design tokens and shared classes
        ├── modernizr.css        normalize.css reset (despite the name)
        ├── pages/               One *.module.css per page
        └── components/          One *.module.css per shared component
```

Anatomy of an administrative module, `src/app/administracion/<module>/`:

```
page.tsx              Server Component: requirePermission(...) + PageHeader + the client component
<Module>Client.tsx    "use client" interactive screen
actions.ts            "use server" Server Actions
components/           Module-private components (optional)
```

Module folders: `actividades-infantiles`, `ajustes` (`correos`, `offline`), `brigadas`, `buscar`, `contacto`, `donaciones`, `farmacia`, `inventario`, `no-autorizado`, `notificaciones` (actions only), `pacientes` (`nuevo`, `[id]`), `perfil`, `reportes`, `usuarios`, `ventas` and `voluntarios` (`[id]`, `especialidades`). The smallest complete example is `actividades-infantiles/` together with `src/lib/db/actividades.ts`.

### 3.2 Where to Find Things

| You need | Look at |
|---|---|
| A permission key, or which route needs which permission | `src/lib/auth/permissions.ts` (`PERMISSIONS`, `MODULE_PERMISSIONS`) |
| Sidebar entries | `src/app/administracion/components/navModules.tsx` |
| Route protection logic | `src/proxy.ts` and `src/lib/auth/session.ts` |
| Database queries of a domain | `src/lib/db/<domain>.ts` |
| Server Actions of a module | `src/app/administracion/<module>/actions.ts` |
| Tables, views, functions, triggers, RLS | `supabase/migrations/` (replay all files for the final state) and [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) chapters 2 to 6 |
| E-mail sending and templates | `src/lib/email/emails.tsx` (one `send...` function per e-mail), `client.ts` (`sendEmail`: renders the template to HTML and plain text and calls Resend) and `templates/` |
| Types of e-mail notices and their recipients | `src/lib/avisosCorreo.ts`; recipients are set in Ajustes > Correos |
| Notification bell | SQL function `notificar()`, `src/lib/notificaciones.ts`, `src/app/administracion/components/NotificacionesBtn.tsx` |
| Live updates | `src/lib/realtime.ts` (`useCambiosEnVivo`) |
| User feedback toasts | `useToast()` from `src/app/administracion/components/AdminToast.tsx` |
| Logging | `src/lib/logger.ts` (`getLogger`, `errorInfo`), configured in `src/instrumentation.ts` and `src/instrumentation-client.ts` ([Section 5.8](#58-logging-and-errors)) |
| Shared styles and design tokens | `src/styles/globals.css` |
| Offline mode | `scripts/offline.mjs`, `src/lib/offline.ts`, `src/app/administracion/ajustes/offline/` |

### 3.3 Spanish Glossary

Domain names in the code are Spanish.

| Spanish | English |
|---|---|
| `brigada`, `inscripción`, `voluntario`, `especialidad` | brigade (a medical and dental outreach day), registration or sign-up, volunteer, specialty |
| `paciente`, `consulta`, `signos vitales`, `preclínica`, `receta` | patient, consultation, vital signs, pre-clinic stage, prescription |
| `medicamento`, `insumo`, `lote`, `bodega`, `entrega` | medicine, supply, lot (batch), warehouse, delivery or dispensing |
| `perfil`, `rol`, `permiso`, `aviso`, `campana` | profile, role, permission, notice (e-mail), notification bell |
| `ropa`, `donaciones`, `ventas de apoyo`, `actividades infantiles` | clothing, donations, support sales, children's activities |
| `leer`, `crear`, `editar`, `eliminar` | read, create, edit, delete (used in RLS policy names) |
| `sin-acceso`, `no-autorizado` | no access (inactive or role-less profile), not authorized (missing permission) |
| FEFO | first-expired, first-out (pharmacy lot selection) |

## 4. Architecture in Brief

Request flow of the administrative panel:

1. **`src/proxy.ts`** runs on every non-static request. It refreshes the Supabase session cookie and, for `/administracion/*`, loads the user's role and permissions and applies `canAccessRoute()`. It redirects to `/auth/login`, `/auth/sin-acceso` or `/administracion/no-autorizado`.
2. **`administracion/layout.tsx`** calls `getAuthContext()` (memoized per request) and mounts `PermissionsProvider`.
3. **`page.tsx`** (Server Component) calls `requirePermission()` or `requireRouteAccess()`.
4. **`<Module>Client.tsx`** (Client Component) uses `usePermissions()` and `<Can>`. This only shapes the interface.
5. **`actions.ts`** (Server Actions) calls `assertPermission()`, then a service function, then `revalidatePath()`.
6. **`src/lib/db/<domain>.ts`** runs the Supabase query. PostgREST then evaluates the **RLS policies**, which call `tiene_permiso()`.

Which Supabase client to use:

| Context | Client | RLS |
|---|---|---|
| Browser components and Realtime | `supabase` from `@/lib/supabase` | Applies |
| Server Components and Server Actions | `createSupabaseServerClient()` from `@/lib/supabase-server` (cookie session of the user) | Applies |
| Privileged server-only work (creating accounts, reading e-mail recipients) | `createSupabaseAdminClient()` from `@/lib/supabase-admin` (service key) | **Bypassed**: verify the caller's permission first |

## 5. Conventions

### 5.1 Language

- **Text the user reads is Spanish:** interface copy, validation and error messages, e-mail content.
- **Code is English:** file names, functions, variables, types, props and comments, even next to Spanish code, unless the user asks otherwise. Most existing identifiers are still Spanish (tables, columns, permission keys, functions such as `registrarPaciente`); an app-wide rename is planned, so do not rename them as a side effect. Where English code reads Spanish columns, alias them at the boundary (`fullName:nombre_completo` in a select). `src/lib/email/` is the reference.
- **Documentation for agents and the architecture reference are in English.** Commit messages are in English.
- Answer the user in the language they write in.
- **Comments are rare.** Write one only for a genuinely complex flow, a surprising behaviour or a business rule the code cannot show. No file headers, no JSDoc on obvious functions, no comments that restate the code. Do not strip existing comments as a side effect of another task.

### 5.2 Files and Naming

- Components are PascalCase `.tsx` files. Non-component modules follow their neighbours (`supabase-server.ts`, `avisosCorreo.ts`).
- Routes are Spanish kebab-case folders (`actividades-infantiles`, `sobre-nosotros`).
- Use the `@/` alias (maps to `src/`) for imports across folders. Relative imports remain only in older public pages.
- Modules that must never reach the browser (secrets, the admin client, e-mail) start with `import "server-only"`.
- Use strict TypeScript and the generated `Database` types from `@/lib/database.types` (`Tables<"x">`, `TablesInsert<"x">`, `Enums<"x">`, `Constants` for enum lists). No `any`, no `as unknown as` and no `@ts-ignore`: type Supabase clients as `SupabaseClient<Database>` and let query results be inferred.
- Public pages export a `metadata` object for SEO.

### 5.3 Styling and UI

- **Plain CSS only.** No Tailwind and no CSS-in-JS. Design tokens are custom properties on `:root` in `src/styles/globals.css`; use `var(--primaryColor)` and the other tokens instead of hex literals.
- **Shared patterns live in `globals.css`**: `.btn-*`, `.card-drawn`, `.card-soft`, `.icon-circle`, `.chip`, `.form-*`, `.tone-*`, `.notice-*`. Page `*.module.css` files keep only page-specific layout. Before adding styles, check whether a global class already covers the pattern.
- **Icons: `lucide-react` only.** No hand-written inline SVG and no text glyphs such as a check mark or a cross. Brand logos that lucide does not ship live in `src/app/components/SocialIcons.tsx`. Decorative icons get `aria-hidden="true"`.
- Admin building blocks: `PageHeader`, `StatCard`, `AdminModal`, `ConfirmDialog`, `EmptyState`, `StatusBadge`, `RoleBadge` and `useToast()`. Public pages compose `Header`, `Footer` and `PageHero` from `src/app/components`.

### 5.4 Data Access, Validation and Errors

- Queries live in `src/lib/db/<domain>.ts`. Each function accepts an optional Supabase client (default: the browser client); Server Actions pass the server client. Smaller modules (contact, users, volunteers, settings, notifications) query Supabase directly from their `actions.ts`: follow the pattern of the module you edit.
- A mutating Server Action always does, in this order: `assertPermission(PERMISSIONS.X)`, obtain the authenticated client, call the service, `revalidatePath("/administracion/<module>")`. Copy `src/app/administracion/actividades-infantiles/actions.ts`.
- **Expected errors are return values, not exceptions.** Return `{ error?: string }` (type `ActionResponse`) so the message reaches the client; the official guide is `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`, and thrown messages are replaced by a generic one in production. See `ajustes/correos/actions.ts` and `usuarios/actions.ts`. Older actions still throw; do not copy them.
- Validate on the server. Reusable Zod helpers are in `src/lib/validation/validationUtils.ts` (`emailSchema`, `phoneHondurasSchema`, `dniHondurasSchema`). Client-side checks are only for usability.
- Translate known database errors into Spanish messages (unique violation `23505`, foreign key `23503`, named indexes such as `uq_inscripciones_correo`).
- Notifications and e-mail must never break the main flow: wrap them in `try`/`catch` and log (see `avisarUsuarioNuevo` in `src/lib/cuentas.ts`).
- Live updates use `useCambiosEnVivo()`. The table must belong to the `supabase_realtime` publication.
- Public forms (`/contacto`, `/voluntariado`, the brigade sign-up modal) run without a session and rely on RLS policies for `anon`.

### 5.5 Authorization Rules

- Decide access by **permission key** (`PERMISSIONS.X`, format `module.action`), **never by role name**. Roles are database rows that administrators edit at runtime in Users > Roles.
- Enforce every protected capability in three places that use the **same key**: the route (`MODULE_PERMISSIONS` plus `requirePermission()`), the action or service (`assertPermission()`) and the database (an RLS policy using `tiene_permiso()`). `<Can>` and `usePermissions()` only hide interface elements and are not security.
- `perfil.read` is implicit for every active user. The Administrator role (`es_superadmin`) holds the whole catalog automatically, including keys added later.
- Role-to-permission assignments are data in `rol_permisos`. Do not hard-code them. A migration seed affects only fresh databases.
- Removing or renaming a key silently drops it from every role (`isPermission()` filters unknown keys). Add the new key and migrate `rol_permisos` and the policies in the same change.
- The service-key client bypasses RLS. Use it only in `server-only` code, after the caller's permission has been checked.

### 5.6 Environment Variables

Names only; values are in the git-ignored `.env`. Never print, log or commit them, and never read `.env` unless the user asks.

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Supabase project URL and public anon key. |
| `SUPABASE_SECRET_KEY` | Server only | Service key: creates volunteer accounts and reads e-mail recipients. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Server only | E-mail delivery. Without them e-mail is skipped; the rest keeps working. |
| `SITE_URL` | Server only | Base URL for links in e-mails (used outside development). |
| `NEXT_PUBLIC_MODO_OFFLINE` | Browser and server | `1` on the brigade offline server. |
| `SUPABASE_DB_URL` | Netlify and offline scripts | Direct database URL for `supabase db push` and the offline sync. |

Only variables prefixed `NEXT_PUBLIC_` reach the browser. `.env.example` is the template.

### 5.7 Offline Mode

A laptop at the brigade site runs the app (`npm run offline`) against a local Supabase in Docker, with `NEXT_PUBLIC_MODO_OFFLINE=1` (`MODO_OFFLINE` in `src/lib/offline.ts`). In scope: inventory, patients, pharmacy, clothing donations, children's activities and support sales. Only one brigade is offline at a time. `scripts/offline.mjs` downloads data and uploads changes; its header documents the steps.

- Synchronization is a row-level three-way merge. **The brigade wins conflicts** and the overwritten online value is stored in `registros_offline.conflicto`.
- Uploads never block because the online data changed. Do not reintroduce "abort if online changed" checks.
- Client code is served over plain `http://<ip>` there, so avoid APIs that require a secure context (for example `crypto.randomUUID`).
- Modules in scope should keep working without internet. Do not add a hard dependency on an online-only service to them.
- Changing `registros_offline` needs a new migration.

### 5.8 Logging and Errors

- Log with LogTape through `src/lib/logger.ts`: one module-level logger per file, `const logger = getLogger("<module>")`, with `getLogger("<module>", "client")` in Client Components and `getLogger("db", "<domain>")` in `src/lib/db`. LogTape is configured once per runtime, in `src/instrumentation.ts` (server, logfmt, which also logs unhandled request errors) and in `src/instrumentation-client.ts` (browser). Do not call `configure` anywhere else; `scripts/offline.mjs` configures its own.
- **Never leave a `catch` empty**, not even with only a comment: log or rethrow. Pass errors through `errorInfo(error)`, never the raw error object.
- Messages are English, two to six words, formal, without a trailing period, and the data goes in properties: `logger.error("Brigade creation failed", { ...errorInfo(error), brigadaId })`. Levels: `error` for a failed operation, `warning` for a handled or expected failure, `info` for one event per successful mutation (with IDs and counts), `debug` for reads and diagnostics, `trace` for polling noise.
- **No sensitive data in logs:** no names, e-mails, phone numbers, DNI, addresses, medical data, free text, search terms, passwords, tokens, keys, cookies, request bodies, connection strings or Supabase `details` and `hint`. IDs, brigade codes, counts and enum values are fine. `errorInfo` also redacts e-mails and long digit runs from error messages.
- Technical `throw` messages (configuration, invariants) are in English. Messages that the user reads stay in Spanish; when one comes from a database or provider error, log that error and show a Spanish message without the technical detail.
- Offline mode: `scripts/offline.mjs` prints the operator's Spanish progress with `log()` plus a logfmt trace in English (one event per step, plus upload, download and load summaries). Never log `SUPABASE_DB_URL`, SQL text or upload payloads, which carry patient data.

## 6. Database and Migrations

- **Migrations are the source of truth** (`supabase/migrations/YYYYMMDDHHMMSS_description.sql`, created with `npx supabase migration new`). Never edit a migration that already exists on `development` or `main`; add a new one.
- **Production applies migrations automatically**: the Netlify production build runs `supabase db push` before `npm run build`. A faulty migration breaks the deploy, so keep each one small, idempotent where practical and reviewed.
- Start each migration with a header comment explaining its intent.
- **New table checklist:**
  - `ENABLE ROW LEVEL SECURITY` and `REVOKE ALL ... FROM anon` unless the table is public.
  - Policies named `"<table>: leer"`, `"<table>: crear"`, `"<table>: editar"`, `"<table>: eliminar"`, using `(SELECT public.tiene_permiso('module.action'))` so the check runs once per query.
  - Foreign keys with an explicit `ON DELETE`, and an index on each foreign key.
  - Attach `set_updated_at()` when the table has `updated_at`.
  - Add the table to the `supabase_realtime` publication if the interface listens to it.
- **Views:** `WITH (security_invoker = true)`, `REVOKE ALL ... FROM anon`, `GRANT SELECT ... TO authenticated`.
- **Functions:** use `SECURITY DEFINER` only when required, always with `SET search_path` pinned and fully qualified names, plus explicit `REVOKE ALL ... FROM PUBLIC, anon` and `GRANT EXECUTE`. Triggers that touch another module's tables run as definer, so a user needs only the permission of the table they write.
- Regenerate `src/lib/database.types.ts` with the Supabase CLI after schema changes. Never edit it by hand.
- Before writing SQL, RLS or migrations, read `.agents/skills/supabase/SKILL.md` and `.agents/skills/supabase-postgres-best-practices/SKILL.md`.
- Never run `supabase db push`, `db reset` or any destructive SQL against the remote database without explicit user approval.

## 7. Common Tasks

### 7.1 Add an Administrative Module

1. Add the permission keys to `PERMISSIONS` in `src/lib/auth/permissions.ts`, a route entry to `MODULE_PERMISSIONS`, a label to `PERMISSION_MODULES` (so it appears in the roles matrix) and, for actions other than read, create, update and delete, a label in `SPECIAL_PERMISSION_LABELS`.
2. Write a migration with the tables and RLS policies that use the same keys. Existing roles do not receive the new keys automatically (except the Administrator): grant them in Users > Roles, or insert into `rol_permisos` in the migration.
3. Add the service functions in `src/lib/db/<domain>.ts`.
4. Create `src/app/administracion/<module>/` with `page.tsx` (calls `requirePermission(PERMISSIONS.X_READ)`), `<Module>Client.tsx` and `actions.ts` ([Section 5.4](#54-data-access-validation-and-errors)).
5. Add an entry to `adminModules` in `src/app/administracion/components/navModules.tsx` with a `lucide-react` icon.
6. Reuse `src/styles/pages/admin.module.css` and the global classes; create a new `*.module.css` only for page-specific layout.
7. Update [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) ([Section 9](#9-documentation-upkeep)).

### 7.2 Add an E-mail Notice

Declare it in `AVISOS_CORREO` (`src/lib/avisosCorreo.ts`), add its icon to `src/app/administracion/ajustes/correos/CorreosPanel.tsx`, write the template in `src/lib/email/templates/` (a default-exported component wrapped in `Layout`, reusing `Details`, `ActionButton` and `NoticeFooter` from `templates/components/` and the inline styles in `templates/styles.ts`), then add a `send...` function to `src/lib/email/emails.tsx` that builds the subject and the template and calls `sendTeamNotice()`. E-mail styles are inline style objects: no CSS files and no classes beyond the responsive rule in `styles.ts`. The plain-text version is generated from the HTML, so do not write one by hand. Recipients are configured by administrators in Ajustes > Correos; no migration is needed.

### 7.3 Add a Notification Bell Type

Create a trigger that calls `public.notificar(...)` with the permission key required to see it, and add the icon for the type in `src/app/administracion/components/NotificacionesBtn.tsx`. Alerts that depend on the current state (for example minimum stock) are computed on request in `src/app/administracion/notificaciones/actions.ts` instead of being stored.

### 7.4 Change a Public Page

Edit `src/app/<route>/page.tsx` and its stylesheet `src/styles/pages/<name>.module.css`. Compose `Header`, `Footer` and `PageHero`, keep the `metadata` export and reuse the global classes.

## 8. Git Workflow

- **Branches:** create `feat/<kebab-case>`, `fix/<kebab-case>` or `refactor/<kebab-case>` from `development`.
- **Pull requests target `development`** unless the user says otherwise. `main` is the production branch and receives `development` through a pull request; the Netlify production deploy then applies migrations.
- **Commits:** Conventional Commits in English (`feat:`, `fix:`, `refactor:`, `chore:`, with an optional scope such as `feat(pacientes):`).
- **Do not add attribution.** No `Co-Authored-By` trailers and no "Generated with ..." footers in commits or pull request descriptions.
- Never commit `.env*` (except `.env.example`), `.offline/`, `.claude/` or `.impeccable/`.
- Do not force-push or rewrite shared branches.

## 9. Documentation Upkeep

[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) drifted from the code once already. When you change one of the following, update the matching chapters in the same change:

| Change | Chapters |
|---|---|
| Tables or columns | 2 (and the counts in 19) |
| Functions, triggers, views or RLS policies | 3, 4, 5, 6 (and 19) |
| Services or Server Actions | 11, 12 |
| Permissions, roles or the default matrix | 8, 13, 14, 22 |
| Routes or modules | 9, 14, 16 (and 19) |
| Authentication flow | 7, 15, 18 |
| A known issue is fixed or discovered | 20 |

Update this file when a convention changes.

## 10. Pitfalls and Known Baseline

- **Biome formats and lints; ESLint and Prettier are gone.** `biome.json` sets 2 spaces, 80 columns, double quotes, semicolons, ES5 trailing commas and LF, and excludes generated and vendored paths (for example `src/lib/database.types.ts`). The whole tree was formatted in October 2026. Change `biome.json` only when asked.
- **Never use `--unsafe`.** Its fixes are not behaviour-preserving: it once rewrote `// @ts-ignore` into `// @ts-expect-error`, which broke `tsc` because `heic2any` ships its own types. Plain `--write` (safe fixes) is fine. Review the diff either way.
- **Lint is clean; keep it that way.** `npm run lint` reports 0 errors, 0 warnings and 0 infos (October 2026), and the pre-commit hook rejects any warning in staged files. Check your own files with `npx biome check --error-on-warnings <files>`.
- **Suppressions need a reason.** Suppress only when the rule's fix would be wrong for the case, with `// biome-ignore lint/<group>/<rule>: <reason in Spanish>` placed before the node the rule reports (for some rules that is the JSX attribute, not the element). Recurring legitimate cases: a `useEffect` that resets pagination when a filter changes (the filter is the trigger), a modal backdrop that closes on click (Escape covers the keyboard), and the WAI-ARIA combobox in `Combobox.tsx`. For data loaded on mount, wrap the loader in `useCallback` and list it as a dependency instead of suppressing.
- **Lost with ESLint:** the React Compiler hook rules (`react-hooks/set-state-in-effect`) and `@next/next/no-page-custom-font` have no Biome equivalent. The `eslint-disable-next-line` comments still in `src/` do nothing; Biome suppressions are `// biome-ignore lint/<group>/<rule>: <reason>`.
- **Windows:** `.gitattributes` (`* text=auto eol=lf`) makes every checkout use LF even with `core.autocrlf=true`, matching `lineEnding: "lf"` in `biome.json`. Files checked out before it existed may still have CRLF, which `biome check` (and the pre-commit hook) flags; `biome format --write <files>` fixes them and git sees no change.
- **Verification** without tests: `npx tsc --noEmit`, `npx biome check <changed files>`, `npm run build` when you touched routing or configuration, and exercising the flow in `npm run dev`.
- **Next.js 16 differences:** the file is `src/proxy.ts`, not `middleware.ts`; `params`, `searchParams`, `cookies()` and `headers()` are asynchronous in this codebase and must be awaited. Read `node_modules/next/dist/docs/` before using a Next.js API.
- **Generated or local files:** do not edit `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo` or `src/lib/database.types.ts`. Regenerate the types with `npx supabase gen types typescript --linked > src/lib/database.types.ts` after a schema change.
- **Unused assets and legacy objects:** `img/` is not referenced by the app (`public/` is the asset root). `src/lib/db/voluntarios.ts` has no callers. The tables `user_roles`, `atenciones_pacientes` and `voluntarios` are legacy. Do not delete any of them unless asked.
- **Known issues** are listed in [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) chapter 20 (for example, the dashboard low-stock indicator always showing zero). Do not fix them as a side effect of another task.
- **Protect the managed block** at the top of this file. `next dev` re-adds it if it is missing, and it is detected by its `BEGIN` and `END` markers.
