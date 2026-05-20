-- ============================================
-- SCHEMA PARA PROSPECTIVAIA
-- Ejecutar en Supabase > SQL Editor > New Query
-- ============================================

-- 1. TABLA DE CURSOS
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text default 'Normas de Auditoría',
  level text default 'Fundamentos',
  duration text,
  image_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 2. TABLA DE MÓDULOS
create table public.modules (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  type text not null check (type in ('video', 'slides', 'download', 'quiz')),
  url text,
  duration text,
  file_name text,
  file_size text,
  content jsonb,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3. TABLA DE INSCRIPCIONES
create table public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

-- 4. TABLA DE PROGRESO
create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, module_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Cursos: todos pueden leer, solo el creador puede modificar
alter table public.courses enable row level security;

create policy "Cursos visibles para todos"
  on public.courses for select
  using (true);

create policy "Usuarios autenticados crean cursos"
  on public.courses for insert
  to authenticated
  with check (true);

create policy "Creador puede actualizar curso"
  on public.courses for update
  to authenticated
  using (auth.uid() = created_by);

create policy "Creador puede eliminar curso"
  on public.courses for delete
  to authenticated
  using (auth.uid() = created_by);

-- Módulos: todos leen, autenticados crean/eliminan
alter table public.modules enable row level security;

create policy "Módulos visibles para todos"
  on public.modules for select
  using (true);

create policy "Autenticados crean módulos"
  on public.modules for insert
  to authenticated
  with check (true);

create policy "Autenticados eliminan módulos"
  on public.modules for delete
  to authenticated
  using (true);

-- Inscripciones: usuario ve las suyas, puede inscribirse
alter table public.enrollments enable row level security;

create policy "Usuario ve sus inscripciones"
  on public.enrollments for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuario se inscribe"
  on public.enrollments for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Progreso: usuario ve y registra el suyo
alter table public.progress enable row level security;

create policy "Usuario ve su progreso"
  on public.progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuario registra progreso"
  on public.progress for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================
-- DATOS INICIALES (CURSOS DE EJEMPLO)
-- ============================================

insert into public.courses (title, description, category, level, duration, image_url) values
(
  'NIA 200 — Objetivos Generales del Auditor',
  'Comprende los objetivos globales del auditor independiente y la conducción de una auditoría conforme a las Normas Internacionales de Auditoría.',
  'Normas de Auditoría',
  'Fundamentos',
  '4 horas',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=340&fit=crop'
),
(
  'Evaluación de Control Interno — COSO 2013',
  'Aprende a evaluar el sistema de control interno bajo el marco COSO, identificando componentes, principios y puntos de enfoque.',
  'Control Interno',
  'Intermedio',
  '6 horas',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop'
),
(
  'Prevención de Lavado de Activos — SARLAFT',
  'Conoce las obligaciones del auditor en la prevención y detección de lavado de activos y financiación del terrorismo.',
  'Cumplimiento',
  'Avanzado',
  '8 horas',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop'
);

-- Obtener IDs de los cursos recién creados para insertar módulos
do $$
declare
  v_nia uuid;
  v_coso uuid;
  v_sarlaft uuid;
begin
  select id into v_nia from public.courses where title like 'NIA 200%' limit 1;
  select id into v_coso from public.courses where title like '%COSO%' limit 1;
  select id into v_sarlaft from public.courses where title like '%SARLAFT%' limit 1;

  -- Módulos NIA 200
  insert into public.modules (course_id, title, type, url, duration, sort_order) values
  (v_nia, 'Introducción a la NIA 200', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '18 min', 0);

  insert into public.modules (course_id, title, type, content, sort_order) values
  (v_nia, 'Alcance y Objetivos', 'slides', '[
    {"slide":1,"title":"Alcance de la NIA 200","bullets":["Define responsabilidades generales del auditor","Marco para conducir auditorías de estados financieros","Relación con otras NIAs"]},
    {"slide":2,"title":"Objetivos del Auditor","bullets":["Obtener seguridad razonable","Emitir un informe de acuerdo con hallazgos","Comunicar según las NIAs"]},
    {"slide":3,"title":"Requisitos Éticos","bullets":["Independencia","Integridad y objetividad","Competencia profesional","Confidencialidad"]},
    {"slide":4,"title":"Escepticismo Profesional","bullets":["Actitud cuestionadora","Evaluación crítica de evidencia","Reconocer posibilidad de errores materiales"]}
  ]'::jsonb, 1);

  insert into public.modules (course_id, title, type, file_name, file_size, sort_order) values
  (v_nia, 'Material Complementario', 'download', 'NIA_200_Guia_Rapida.pdf', '2.4 MB', 2);

  insert into public.modules (course_id, title, type, content, sort_order) values
  (v_nia, 'Evaluación del Módulo', 'quiz', '[
    {"q":"¿Cuál es el objetivo principal del auditor según la NIA 200?","opts":["Detectar fraudes","Obtener seguridad razonable sobre los estados financieros","Aprobar la gestión de la empresa","Calcular impuestos"],"correct":1},
    {"q":"¿Qué implica el escepticismo profesional?","opts":["Desconfiar de todo","Actitud cuestionadora y evaluación crítica","Rechazar evidencia del cliente","Asumir que hay fraude"],"correct":1},
    {"q":"¿Cuál NO es un requisito ético del auditor?","opts":["Independencia","Confidencialidad","Maximizar honorarios","Integridad"],"correct":2}
  ]'::jsonb, 3);

  -- Módulos COSO
  insert into public.modules (course_id, title, type, url, duration, sort_order) values
  (v_coso, 'Marco COSO — Visión General', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '22 min', 0);

  insert into public.modules (course_id, title, type, content, sort_order) values
  (v_coso, 'Los 5 Componentes del COSO', 'slides', '[
    {"slide":1,"title":"Ambiente de Control","bullets":["Integridad y valores éticos","Estructura organizacional","Autoridad y responsabilidad"]},
    {"slide":2,"title":"Evaluación de Riesgos","bullets":["Identificación de riesgos","Análisis de riesgos","Gestión del cambio"]},
    {"slide":3,"title":"Actividades de Control","bullets":["Políticas y procedimientos","Controles sobre tecnología","Segregación de funciones"]},
    {"slide":4,"title":"Información y Comunicación","bullets":["Información relevante y de calidad","Comunicación interna","Comunicación externa"]},
    {"slide":5,"title":"Monitoreo","bullets":["Evaluaciones continuas","Evaluaciones separadas","Reporte de deficiencias"]}
  ]'::jsonb, 1);

  insert into public.modules (course_id, title, type, file_name, file_size, sort_order) values
  (v_coso, 'Plantilla de Evaluación COSO', 'download', 'Plantilla_COSO_2013.xlsx', '1.8 MB', 2);

  -- Módulos SARLAFT
  insert into public.modules (course_id, title, type, url, duration, sort_order) values
  (v_sarlaft, 'Fundamentos SARLAFT', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '30 min', 0);

  insert into public.modules (course_id, title, type, content, sort_order) values
  (v_sarlaft, 'Señales de Alerta', 'slides', '[
    {"slide":1,"title":"Señales en Transacciones","bullets":["Operaciones inusuales","Fraccionamiento de operaciones","Transacciones sin justificación económica"]},
    {"slide":2,"title":"Señales en Clientes","bullets":["Información inconsistente","Reticencia a proveer documentación","Cambios frecuentes de datos"]}
  ]'::jsonb, 1);

  insert into public.modules (course_id, title, type, file_name, file_size, sort_order) values
  (v_sarlaft, 'Checklist de Debida Diligencia', 'download', 'Checklist_SARLAFT.pdf', '890 KB', 2);

end $$;
