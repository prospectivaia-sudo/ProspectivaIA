-- =====================================================================
-- PROSPECTIVA IA · SUPABASE_SETUP.sql  (blog público, versión reforzada)
-- ---------------------------------------------------------------------
-- Cómo usarlo:
--   1. Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--   2. Ve al PASO 5, reemplaza TU_CORREO@DOMINIO.CL por tu correo de
--      administrador y ejecuta solo ese bloque.
--   3. Supabase → Authentication → Sign In / Providers → desactiva
--      "Allow new users to sign up".
--
-- Es idempotente: se puede ejecutar las veces que haga falta.
--
-- Modelo de seguridad:
--   · Cualquiera (sin cuenta) puede LEER publicaciones y SUSCRIBIRSE.
--   · Solo los usuarios registrados en public.admins pueden crear,
--     editar o borrar publicaciones, ver suscriptores y subir imágenes.
--   · Tener una cuenta en Supabase Auth ya NO basta para publicar.
-- =====================================================================


-- =====================================================================
-- PASO 0 · Administradores
-- =====================================================================
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- Sin políticas a propósito: la tabla no se puede leer ni modificar desde
-- la web (anon/authenticated). Solo se administra desde el SQL Editor.
revoke all on public.admins from anon, authenticated;

-- is_admin(): true si quien hace la consulta está en public.admins.
-- SECURITY DEFINER para poder leer admins aunque el usuario no tenga acceso.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- =====================================================================
-- PASO 1 · Tabla posts
-- =====================================================================
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,
  type        text default 'Artículo',
  excerpt     text,
  content     text,
  cover_image text,
  images      jsonb,
  video_url   text,
  author      text,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Si la tabla ya existía con otra versión, agrega lo que falte.
alter table public.posts add column if not exists category    text;
alter table public.posts add column if not exists type        text default 'Artículo';
alter table public.posts add column if not exists excerpt     text;
alter table public.posts add column if not exists content     text;
alter table public.posts add column if not exists cover_image text;
alter table public.posts add column if not exists images      jsonb;
alter table public.posts add column if not exists video_url   text;
alter table public.posts add column if not exists author      text;
alter table public.posts add column if not exists created_by  uuid references auth.users(id) on delete set null;
alter table public.posts add column if not exists created_at  timestamptz not null default now();
alter table public.posts alter column created_by set default auth.uid();

-- Límites básicos (NOT VALID = no revisa filas antiguas, solo las nuevas).
alter table public.posts drop constraint if exists posts_title_len;
alter table public.posts add  constraint posts_title_len
  check (char_length(title) between 1 and 300) not valid;
alter table public.posts drop constraint if exists posts_content_len;
alter table public.posts add  constraint posts_content_len
  check (content is null or char_length(content) <= 100000) not valid;

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;


-- =====================================================================
-- PASO 2 · Tabla subscribers
-- =====================================================================
create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- Validaciones del lado del servidor (no se pueden saltar desde el navegador).
alter table public.subscribers drop constraint if exists subscribers_name_len;
alter table public.subscribers add  constraint subscribers_name_len
  check (char_length(btrim(name)) between 1 and 120) not valid;
alter table public.subscribers drop constraint if exists subscribers_email_fmt;
alter table public.subscribers add  constraint subscribers_email_fmt
  check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;

-- Evita duplicados que solo difieren en mayúsculas (Juan@x.cl vs juan@x.cl).
create unique index if not exists subscribers_email_lower_key
  on public.subscribers (lower(email));

alter table public.subscribers enable row level security;


-- =====================================================================
-- PASO 3 · Políticas RLS (se borran las antiguas y se crean de nuevo)
-- =====================================================================
-- Elimina TODAS las políticas previas de posts y subscribers, incluidas
-- las de versiones anteriores que dejaban escribir a cualquier usuario
-- autenticado.
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('posts', 'subscribers')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- posts
create policy "posts: lectura pública"
  on public.posts for select
  to anon, authenticated
  using (true);

create policy "posts: solo admin inserta"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

create policy "posts: solo admin edita"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "posts: solo admin borra"
  on public.posts for delete
  to authenticated
  using (public.is_admin());

-- subscribers
create policy "subscribers: cualquiera se suscribe"
  on public.subscribers for insert
  to anon, authenticated
  with check (true);

create policy "subscribers: solo admin lee"
  on public.subscribers for select
  to authenticated
  using (public.is_admin());

create policy "subscribers: solo admin borra"
  on public.subscribers for delete
  to authenticated
  using (public.is_admin());


-- =====================================================================
-- PASO 4 · Permisos de tabla (GRANT)
-- ---------------------------------------------------------------------
-- Esto resuelve "permission denied for table posts". Primero se quitan
-- todos los permisos y luego se dan solo los necesarios (mínimo privilegio).
-- RLS (paso 3) sigue decidiendo QUIÉN puede hacer cada acción.
-- =====================================================================
grant usage on schema public to anon, authenticated;

revoke all on public.posts       from anon, authenticated;
revoke all on public.subscribers from anon, authenticated;

grant select                 on public.posts       to anon, authenticated;
grant insert, update, delete on public.posts       to authenticated;

grant insert                 on public.subscribers to anon, authenticated;
grant select, delete         on public.subscribers to authenticated;


-- =====================================================================
-- PASO 4b · Storage: bucket "media" para imágenes
-- ---------------------------------------------------------------------
-- Público para mostrar imágenes, máx. 5 MB, solo JPG/PNG/WEBP/GIF.
-- SVG queda fuera a propósito: puede contener scripts.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Borra las políticas antiguas que se refieren al bucket media.
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%''media''%' or coalesce(with_check, '') ilike '%''media''%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Las URLs públicas funcionan sin política SELECT. Solo el admin puede
-- listar el contenido del bucket, así nadie puede recorrer los archivos.
create policy "media: admin lista"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media' and public.is_admin());

create policy "media: admin sube"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy "media: admin actualiza"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy "media: admin borra"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());


-- =====================================================================
-- PASO 5 · Registrar al administrador  ← REEMPLAZA EL CORREO
-- ---------------------------------------------------------------------
-- El usuario debe existir antes en Authentication → Users.
-- Si dejas el correo de ejemplo, el bloque no hace nada.
-- =====================================================================
insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('TU_CORREO@DOMINIO.CL')
on conflict (user_id) do nothing;

-- Comprobación: debe aparecer tu correo.
select u.email, a.created_at
from public.admins a
join auth.users u on u.id = a.user_id;


-- =====================================================================
-- PASO 6 · (Opcional) Borrar tablas del LMS anterior
-- ---------------------------------------------------------------------
-- Tienen políticas permisivas (cualquier autenticado crea cursos/módulos).
-- La app ya no las usa. Quita los "--" y ejecútalo cuando confirmes que
-- no necesitas esos datos.
-- =====================================================================
-- drop table if exists public.progress    cascade;
-- drop table if exists public.enrollments cascade;
-- drop table if exists public.modules     cascade;
-- drop table if exists public.courses     cascade;


-- =====================================================================
-- PASO 7 · Verificación rápida (solo lectura)
-- =====================================================================
-- Políticas activas:
select tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public' and tablename in ('posts', 'subscribers'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'media:%')
order by tablename, cmd;
