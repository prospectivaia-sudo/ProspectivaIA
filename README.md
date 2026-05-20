# ProspectivaIA — Plataforma de Cursos para Auditores

## Configuración Rápida

### 1. Base de datos (Supabase)
1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Abre **SQL Editor** en el menú lateral
3. Haz clic en **New Query**
4. Copia y pega todo el contenido de `supabase-schema.sql`
5. Haz clic en **Run** (ejecutar)

### 2. Variables de entorno
1. En Supabase, ve a **Settings > Data API**
2. Copia tu **Project URL** y tu **anon public key**
3. Crea un archivo `.env` en la raíz del proyecto:
```
VITE_SUPABASE_URL=https://xfsbvypvafvisqouzfov.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 3. Desarrollo local
```bash
npm install
npm run dev
```

### 4. Deploy en Vercel
1. Sube este proyecto a GitHub
2. En Vercel, importa el repositorio
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático

### 5. Conectar dominio
En Vercel > Settings > Domains agrega `prospectivaia.cl`
Luego en Cloudflare agrega el registro CNAME que Vercel te indique.

## Tecnologías
- **Frontend:** React + Vite
- **Backend:** Supabase (PostgreSQL + Auth + API)
- **Hosting:** Vercel
- **DNS/CDN:** Cloudflare
