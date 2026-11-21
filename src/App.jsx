import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Icons } from './components/Icons'
import logoSrc from './assets/Logo_Prospectiva_IA_Color_tagline_.jpg'
import logoWhiteSrc from './assets/Logo_Prospectiva_IA_Blanco_tagline.png'

/* ──────────────────────────────────────────────────────────────
   PROSPECTIVA IA · Blog / Publicaciones
   - Lectura 100% pública (sin cuenta obligatoria)
   - Publicar / editar / eliminar requiere sesión de administrador
     (reutiliza tu cuenta Supabase existente; ya no hay registro público)
   - Seguridad: "admin" = usuario presente en la tabla public.admins,
     verificado con la función is_admin() (RPC). La base de datos (RLS)
     aplica la misma regla, así que la UI no es la única barrera.
   - Widget lateral de suscripción (nombre + correo)
   Requiere las tablas `posts` y `subscribers` y, opcionalmente, el
   bucket de Storage `media`. Ver SUPABASE_SETUP.sql.
   ────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  'Gestión de Riesgos',
  'Cumplimiento',
  'Auditoría',
  'Inteligencia Artificial',
  'Análisis de Datos',
  'Forense',
]

// ── Secciones del menú izquierdo ──
// `type` es el valor que se guarda en la columna posts.type.
// `def` se muestra al público; `items`, `not` y `ex` son la guía editorial
// (solo visible para el administrador).
const SECTIONS = [
  { key: 'ultimo', label: 'Lo último', group: null, type: null,
    def: 'Todas las publicaciones del sitio, de la más reciente a la más antigua.' },

  { key: 'articulos', label: 'Artículos', group: 'Centro de conocimiento', type: 'Artículo',
    def: 'Textos de análisis, explicación y opinión sobre la aplicación de la inteligencia artificial en auditoría, control y gestión de riesgos.',
    items: ['Análisis de un tema o problema de la profesión.', 'Explicaciones de conceptos y técnicas (por ejemplo, qué es un autoencoder y para qué sirve en auditoría).', 'Columnas de opinión y reflexiones sobre el futuro de la función.'],
    not: 'Material descargable extenso (va en Documentos) ni hechos de actualidad (van en Noticias).',
    ex: '«Hacia la auditoría predictiva: del muestreo a la revisión del 100%».' },
  { key: 'documentos', label: 'Documentos', group: 'Centro de conocimiento', type: 'Documento',
    def: 'Material de consulta en formato descargable: informes, papers, presentaciones y documentación técnica.',
    items: ['Informes, papers y whitepapers propios o de referencia.', 'Presentaciones de charlas y conferencias.', 'Documentación técnica y metodológica de los casos y herramientas.'],
    not: 'Plantillas o archivos para usar en el trabajo diario (van en Recursos).',
    ex: 'Documentación metodológica del caso de autoencoders en rendiciones de gastos (PDF).' },
  { key: 'videos', label: 'Videos', group: 'Centro de conocimiento', type: 'Video',
    def: 'Tutoriales, demostraciones y charlas para aprender viendo.',
    items: ['Tutoriales paso a paso.', 'Demostraciones de las herramientas del Laboratorio.', 'Grabaciones de charlas, webinars y entrevistas.'],
    not: 'Cursos estructurados con evaluación (van en Formación).',
    ex: 'Demostración en video del Auditor de correos.' },
  { key: 'formacion', label: 'Formación', group: 'Centro de conocimiento', type: null, soon: true,
    def: 'Programas estructurados de capacitación para auditores y equipos de riesgo y cumplimiento. Muy pronto: suscríbete para enterarte del lanzamiento.',
    items: ['Cursos y rutas de aprendizaje con módulos ordenados.', 'Talleres prácticos con datos y casos reales.', 'Información de próximas fechas, inscripción y certificación.'],
    not: 'Contenido suelto o gratuito de consulta (va en Artículos, Videos o Documentos).',
    ex: 'Curso «Analítica de datos e IA para auditores» (próximamente).' },

  { key: 'casos', label: 'Casos prácticos', group: 'Laboratorio', type: 'Caso práctico',
    def: 'Problemas reales resueltos con analítica de datos e inteligencia artificial, contados de principio a fin.',
    items: ['Contexto del problema y riesgo que se buscaba abordar.', 'Datos utilizados, técnica aplicada y cómo se implementó.', 'Resultados obtenidos, limitaciones y lecciones aprendidas.'],
    not: 'Explicaciones teóricas sin aplicación concreta (van en Artículos).',
    ex: 'Detección de anomalías en rendiciones de gastos con autoencoders; grafos para auditar el proceso de compras.' },
  { key: 'herramientas', label: 'Herramientas', group: 'Laboratorio', type: 'Herramienta',
    def: 'Aplicaciones y demos que puedes probar o descargar para ver la inteligencia artificial aplicada en acción.',
    items: ['Demos interactivas en el navegador.', 'Aplicaciones descargables, con instrucciones de uso.', 'Descripción de qué problema resuelve cada herramienta y sus límites.'],
    not: 'Plantillas, scripts o archivos de apoyo (van en Recursos).',
    ex: 'Auditor de correos, Auditor de contratos, analizador de anomalías bursátiles.' },
  { key: 'recursos', label: 'Recursos', group: 'Laboratorio', type: 'Recurso',
    def: 'Material de apoyo listo para usar en el trabajo diario: plantillas, checklists, guías rápidas y notebooks.',
    items: ['Plantillas y planillas (por ejemplo, de auditoría continua en Excel).', 'Checklists y guías rápidas.', 'Notebooks, scripts y datos de práctica.'],
    not: 'Documentos de lectura o consulta (van en Documentos).',
    ex: 'Planilla de auditoría continua de procesos de compra.' },

  { key: 'observatorio', label: 'Observatorio', group: 'Actualidad', type: 'Observatorio',
    def: 'Seguimiento sistemático y análisis propio de la regulación, los estándares y la adopción de la inteligencia artificial en auditoría y riesgos.',
    items: ['Evolución de la regulación de la IA y su impacto en auditoría y cumplimiento.', 'Marcos y estándares de referencia (por ejemplo, NIST AI RMF o ISO/IEC 42001).', 'Indicadores y estudios sobre la adopción de IA en auditoría y riesgos.'],
    not: 'Hechos puntuales sin análisis (van en Noticias).',
    ex: 'Seguimiento de la regulación de IA en Chile y Latinoamérica.' },
  { key: 'noticias', label: 'Noticias', group: 'Actualidad', type: 'Noticia',
    def: 'Hechos recientes y relevantes para la auditoría, el control y la gestión de riesgos, con un breve comentario.',
    items: ['Nuevas normas, guías o pronunciamientos de reguladores.', 'Lanzamientos de tecnologías o herramientas relevantes.', 'Eventos, conferencias y convocatorias.'],
    not: 'Análisis de fondo (van en Observatorio o Artículos).',
    ex: 'Publicación de una nueva norma de la CMF sobre gestión de riesgos.' },
  { key: 'tendencias', label: 'Tendencias', group: 'Actualidad', type: 'Tendencia',
    def: 'Hacia dónde evoluciona la disciplina y qué tecnologías la transformarán en el mediano y largo plazo.',
    items: ['Tecnologías emergentes y su posible impacto en la función de auditoría.', 'Cambios en el rol y las competencias del auditor.', 'Escenarios y prospectiva para la gestión de riesgos.'],
    not: 'Hechos de actualidad (van en Noticias) ni seguimiento sistemático (va en Observatorio).',
    ex: 'El auditor aumentado: competencias para la próxima década.' },
]
const NAV_GROUPS = [null, 'Centro de conocimiento', 'Laboratorio', 'Actualidad']
const sectionByKey = (k) => SECTIONS.find(s => s.key === k) || SECTIONS[0]
// Valores que se pueden elegir al publicar (todas las secciones que guardan publicaciones)
const POST_TYPES = SECTIONS.filter(s => s.type)
// Compatibilidad con publicaciones antiguas (antes "Formato": Artículo/Video/Imagen/Recurso)
const LEGACY_TYPES = { 'Imagen': 'Artículo' }
const postType = (p) => LEGACY_TYPES[p.type] || p.type || 'Artículo'

// ── Small inline icons (no dependemos de íconos no confirmados) ──
const I = {
  mail: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>,
  video: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  image: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>,
  doc: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.8L20 9.7l-5.1 3.8L16.4 20 12 16.5 7.6 20l1.5-6.5L4 9.7l6.1-1.9z" /></svg>,
}

const formatMeta = (f) => ({
  'Artículo': { icon: I.doc, color: '#1b6b93', bg: '#e0f2fa' },
  'Documento': { icon: I.doc, color: '#33414f', bg: '#eef1f4' },
  'Video': { icon: I.video, color: '#b3261e', bg: '#fdecec' },
  'Caso práctico': { icon: I.spark, color: '#8a4b00', bg: '#fff1e0' },
  'Herramienta': { icon: I.spark, color: '#5b3f99', bg: '#ece8f8' },
  'Recurso': { icon: I.doc, color: '#6a4ea0', bg: '#efe9f8' },
  'Observatorio': { icon: I.doc, color: '#0f6b5c', bg: '#e2f4f0' },
  'Noticia': { icon: I.calendar, color: '#2e5d8a', bg: '#e6eef7' },
  'Tendencia': { icon: I.spark, color: '#2e7d32', bg: '#e7f5e9' },
  'Imagen': { icon: I.image, color: '#2e7d32', bg: '#e7f5e9' },
}[f] || { icon: I.doc, color: '#1b6b93', bg: '#e0f2fa' })

// Íconos del menú de secciones
const NAV_ICON_PATHS = {
  ultimo: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  articulos: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
  documentos: <><path d="M4 4h10l6 6v10H4z" /><path d="M14 4v6h6" /><path d="M8 14h8M8 17h8" /></>,
  videos: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></>,
  formacion: <><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></>,
  casos: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  herramientas: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />,
  recursos: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  observatorio: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  noticias: <><path d="M4 5h13v14a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2z" /><path d="M17 9h3v9a2 2 0 0 1-2 2" /><path d="M8 9h5M8 13h5M8 17h3" /></>,
  tendencias: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
}
const NavIcon = ({ k }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{NAV_ICON_PATHS[k]}</svg>
)

// ── Helpers ──
const formatDate = (s) => {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return '' }
}

const excerptFrom = (post, n = 160) => {
  if (post.excerpt) return post.excerpt
  const t = (post.content || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n).trim() + '…' : t
}

// ── Seguridad: sólo se aceptan URLs http(s); nada de javascript:, data:, etc. ──
const isHttpUrl = (u) => {
  if (!u || typeof u !== 'string') return false
  try {
    const { protocol } = new URL(u)
    return protocol === 'https:' || protocol === 'http:'
  } catch { return false }
}
const safeUrl = (u) => (isHttpUrl(u) ? u : null)

const firstImage = (post) =>
  safeUrl(post.cover_image) || (Array.isArray(post.images) && post.images.find(isHttpUrl)) || null

// Sólo se incrustan videos de estos dominios (evita iframes de sitios arbitrarios)
const EMBED_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com']

const toEmbedUrl = (url) => {
  if (!url) return ''
  try {
    let out = url.trim()
    if (out.includes('youtube.com/watch')) {
      const v = new URL(out).searchParams.get('v')
      out = v ? `https://www.youtube.com/embed/${encodeURIComponent(v)}` : out
    } else if (out.includes('youtu.be/')) {
      const id = out.split('youtu.be/')[1].split(/[?&#/]/)[0]
      out = `https://www.youtube.com/embed/${encodeURIComponent(id)}`
    } else if (out.includes('vimeo.com/') && !out.includes('player.')) {
      const id = out.split('vimeo.com/')[1].split(/[?&#/]/)[0]
      out = `https://player.vimeo.com/video/${encodeURIComponent(id)}`
    }
    const parsed = new URL(out)
    return parsed.protocol === 'https:' && EMBED_HOSTS.includes(parsed.hostname) ? parsed.href : ''
  } catch { return '' }
}

// ── Subida de imágenes: mismos límites que el bucket `media` (ver SUPABASE_SETUP.sql) ──
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(',')
const MAX_IMAGE_MB = 5

// Sube un archivo al bucket `media` de Supabase Storage y devuelve la URL pública
const uploadFile = async (file) => {
  const ext = IMAGE_TYPES[file.type]
  if (!ext) throw new Error(`"${file.name}" no es un formato permitido. Usa JPG, PNG, WEBP o GIF.`)
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`"${file.name}" supera el máximo de ${MAX_IMAGE_MB} MB.`)
  // El nombre se genera aquí; nunca se usa el nombre original del archivo como ruta
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

// ──────────────────────────────────────────────────────────────
// Estilos locales (auto-contenidos; no dependen de App.css)
// ──────────────────────────────────────────────────────────────
const BLOG_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes pi-fade { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }

.pi-app { --navy:#0a1628; --cyan:#00b4d8; --cyan-d:#1b6b93; --ink:#0a1628; --muted:#5a6b7d; --soft:#8a97a8; --line:#e5e9ee; --bg:#f4f7fb; --serif:'DM Serif Display', Georgia, serif;
  min-height:100vh; background:var(--bg); color:var(--ink);
  font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif; }
.pi-app * { box-sizing:border-box; }
.pi-fade { animation: pi-fade .4s cubic-bezier(.22,1,.36,1) both; }

.pi-header { position:sticky; top:0; z-index:30; background:rgba(255,255,255,.92); backdrop-filter:saturate(180%) blur(10px);
  border-bottom:1px solid var(--line); }
.pi-header-inner { max-width:1280px; margin:0 auto; padding:12px 24px; min-height:68px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
.pi-brand { background:none; border:none; cursor:pointer; padding:0; display:flex; align-items:center; transition:opacity .2s; }
.pi-brand.hidden { opacity:0; pointer-events:none; }
.pi-brand img { height:30px; width:auto; object-fit:contain; }
.pi-head-actions { display:flex; align-items:center; gap:8px; }
.pi-admin-chip { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }
.pi-admin-dot { width:8px; height:8px; border-radius:50%; background:#2e7d32; }

.pi-hero { background:linear-gradient(135deg,#0a1628 0%,#1a3a5c 42%,#1b6b93 72%,#48cae4 100%); color:#fff; }
.pi-hero { overflow:hidden; }
.pi-hero-inner { max-width:1280px; margin:0 auto; padding:64px 24px 68px; position:relative; }
.pi-hero h1 { margin:0 0 32px; position:relative; z-index:1; line-height:0; }
.pi-hero h1 img { width:clamp(260px,38vw,520px); height:auto; display:block; }
.pi-hero p { font-size:clamp(17px,1.9vw,26px); font-weight:500; color:rgba(255,255,255,.92); line-height:1.45; margin:0; position:relative; z-index:1; text-wrap:balance; }
.pi-hero-eyebrow { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#9fe3f2; margin-bottom:16px; position:relative; z-index:1; }
.pi-hero-orb { position:absolute; border-radius:50%; pointer-events:none; }

.pi-layout { max-width:1280px; margin:0 auto; padding:32px 24px 64px; display:grid; grid-template-columns:220px minmax(0,1fr) 300px; gap:32px; align-items:start; }
.pi-feed-col { min-width:0; }

/* Menú de secciones (escritorio) */
.pi-nav { position:sticky; top:84px; display:flex; flex-direction:column; gap:22px; }
.pi-nav-group { display:flex; flex-direction:column; gap:2px; }
.pi-nav-title { font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); padding:0 12px 6px; margin:0; }
.pi-nav-btn { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:none; border:none; cursor:pointer; padding:10px 12px; border-radius:10px; color:#33414f; font-size:14px; font-weight:600; font-family:inherit; min-height:44px; transition:background .15s, color .15s; }
.pi-nav-btn:hover { background:#eef3f8; color:var(--ink); }
.pi-nav-btn.active { background:#e3f1f8; color:var(--cyan-d); font-weight:700; }
.pi-nav-btn span.lbl { flex:1; }
.pi-soon { font-size:10.5px; font-weight:700; color:var(--cyan-d); background:#e3f1f8; padding:2px 7px; border-radius:999px; }

/* Menú de secciones (pantallas angostas): fila deslizable */
.pi-secnav { display:none; gap:8px; overflow-x:auto; margin:0 -24px 20px; padding:2px 24px 6px; scrollbar-width:none; }
.pi-secnav::-webkit-scrollbar { display:none; }
.pi-secnav button { flex:none; padding:0 16px; min-height:40px; border-radius:999px; border:none; background:#e9eef4; color:#33414f; font-size:14px; font-weight:600; font-family:inherit; cursor:pointer; white-space:nowrap; }
.pi-secnav button.active { background:var(--navy); color:#fff; font-weight:700; }

/* Encabezado de cada sección */
.pi-sec-head { margin-bottom:22px; display:flex; flex-direction:column; gap:6px; }
.pi-sec-group { font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--cyan-d); }
.pi-sec-head h2 { font-family:var(--serif); font-weight:400; font-size:32px; line-height:1.15; margin:0; color:var(--ink); }
.pi-sec-head p { margin:0; font-size:15.5px; line-height:1.6; color:#33414f; max-width:640px; }

/* Guía editorial (solo admin) */
.pi-guide { background:#fffdf5; border:1px dashed #e0c98a; border-radius:16px; padding:18px 22px; margin-bottom:24px; display:flex; flex-direction:column; gap:10px; font-size:14px; color:#33414f; }
.pi-guide-title { font-size:11.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#8a6a10; margin:0; }
.pi-guide ul { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:6px; line-height:1.5; }
.pi-guide p { margin:0; line-height:1.5; color:var(--muted); }
.pi-guide b { color:#33414f; }

.pi-controls { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:24px; }
.pi-search { flex:1; min-width:200px; display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid var(--line); border-radius:12px; padding:0 14px; }
.pi-search input { flex:1; border:none; outline:none; padding:12px 0; font-size:15px; background:transparent; color:var(--ink); font-family:inherit; }
.pi-chips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:28px; }
.pi-chip { background:#fff; border:1.5px solid var(--line); color:var(--muted); border-radius:999px; padding:7px 15px; font-size:13px; font-weight:600; cursor:pointer; transition:.15s; }
.pi-chip:hover { border-color:var(--cyan); color:var(--cyan-d); }
.pi-chip.active { background:var(--navy); border-color:var(--navy); color:#fff; }

.pi-feed { display:flex; flex-direction:column; gap:22px; }
.pi-card { background:#fff; border:1px solid var(--line); border-radius:18px; overflow:hidden; cursor:pointer; transition:transform .18s, box-shadow .18s; display:grid; grid-template-columns:200px 1fr; }
.pi-card:hover { transform:translateY(-3px); box-shadow:0 14px 34px rgba(10,22,40,.10); }
.pi-card.no-media { grid-template-columns:1fr; }
.pi-card-media { position:relative; background:var(--navy); min-height:160px; }
.pi-card-media img { width:100%; height:100%; object-fit:cover; display:block; }
.pi-card-media .pi-play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.pi-card-media .pi-play span { width:46px; height:46px; border-radius:50%; background:rgba(255,255,255,.92); display:flex; align-items:center; justify-content:center; color:var(--navy); }
.pi-card-body { padding:22px 24px; display:flex; flex-direction:column; gap:9px; min-width:0; }
.pi-card-title { font-family:var(--serif); font-weight:400; font-size:21px; line-height:1.25; color:var(--ink); }
.pi-card-excerpt { font-size:14px; color:var(--muted); line-height:1.55; }
.pi-card-foot { display:flex; align-items:center; gap:14px; margin-top:4px; font-size:12.5px; color:var(--soft); }
.pi-card-foot .pi-dot { display:inline-flex; align-items:center; gap:5px; }
.pi-admin-row { display:flex; gap:6px; margin-top:6px; }

.pi-badge { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:999px; width:fit-content; text-transform:uppercase; letter-spacing:.03em; }
.pi-cat { display:inline-block; font-size:11.5px; font-weight:700; color:var(--cyan-d); letter-spacing:.05em; text-transform:uppercase; }

.pi-sidebar { display:flex; flex-direction:column; gap:20px; position:sticky; top:84px; }
.pi-side-card { background:#fff; border:1px solid var(--line); border-radius:18px; padding:22px; }
.pi-side-title { font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--soft); margin:0 0 14px; }

.pi-news { background:linear-gradient(150deg,#0a1628 0%,#143150 55%,#1b6b93 100%); color:#fff; border:none; position:relative; overflow:hidden; }
.pi-news h3 { font-family:var(--serif); font-weight:400; font-size:22px; margin:6px 0 8px; line-height:1.2; }
.pi-news p { font-size:13.5px; color:rgba(255,255,255,.78); line-height:1.55; margin:0 0 16px; }
.pi-news-tag { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#9fe3f2; }
.pi-news input { width:100%; padding:11px 13px; border-radius:10px; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.08); color:#fff; font-size:14px; outline:none; margin-bottom:10px; font-family:inherit; }
.pi-news input::placeholder { color:rgba(255,255,255,.55); }
.pi-news input:focus { border-color:var(--cyan); background:rgba(255,255,255,.13); }
.pi-news-btn { width:100%; padding:12px; border:none; border-radius:10px; background:linear-gradient(135deg,#00b4d8,#48cae4); color:#062330; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:.15s; }
.pi-news-btn:hover { filter:brightness(1.06); }
.pi-news-btn:disabled { opacity:.65; cursor:wait; }
.pi-news-note { font-size:11.5px; color:rgba(255,255,255,.6); margin:10px 0 0; line-height:1.5; }
.pi-news-ok { text-align:center; padding:8px 0; }

.pi-side-list { display:flex; flex-direction:column; gap:4px; }
.pi-side-list button { background:none; border:none; text-align:left; padding:8px 10px; border-radius:9px; cursor:pointer; font-size:14px; color:var(--muted); display:flex; justify-content:space-between; align-items:center; font-family:inherit; }
.pi-side-list button:hover { background:#f1f5f9; color:var(--ink); }
.pi-side-count { font-size:12px; color:var(--soft); }

.pi-about p { font-size:13.5px; color:var(--muted); line-height:1.6; margin:0; }
.pi-about .pi-tag { font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--cyan-d); margin-top:14px; display:block; }

/* Detail */
.pi-detail { background:#fff; border:1px solid var(--line); border-radius:20px; overflow:hidden; }
.pi-detail-cover { width:100%; max-height:420px; object-fit:cover; display:block; background:var(--navy); }
.pi-detail-pad { padding:34px 40px 44px; }
.pi-back { background:none; border:1px solid var(--line); border-radius:10px; padding:8px 14px; font-size:13px; font-weight:600; color:var(--muted); cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-bottom:18px; font-family:inherit; }
.pi-back:hover { border-color:var(--cyan); color:var(--cyan-d); }
.pi-detail h1 { font-family:var(--serif); font-weight:400; font-size:clamp(26px,3.6vw,38px); line-height:1.18; margin:14px 0 12px; color:var(--ink); }
.pi-detail-meta { display:flex; gap:16px; align-items:center; font-size:13px; color:var(--soft); margin-bottom:26px; flex-wrap:wrap; }
.pi-detail-content p { font-size:16.5px; line-height:1.75; color:#23303f; margin:0 0 18px; }
.pi-video-wrap { position:relative; padding-bottom:56.25%; height:0; border-radius:14px; overflow:hidden; margin:8px 0 26px; background:#000; }
.pi-video-wrap iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.pi-detail-img { width:100%; border-radius:14px; margin:8px 0 22px; display:block; }

/* Empty / loading */
.pi-empty { background:#fff; border:1px dashed var(--line); border-radius:18px; padding:54px 28px; text-align:center; }
.pi-empty h3 { font-family:var(--serif); font-weight:400; font-size:22px; margin:0 0 8px; color:var(--ink); }
.pi-empty p { color:var(--muted); font-size:14px; margin:0 auto; max-width:380px; line-height:1.55; }
.pi-spin { width:18px; height:18px; animation:spin .8s linear infinite; }

.pi-beta { background:linear-gradient(90deg,#0a1628,#1a3a5c); color:#fff; text-align:center; padding:9px 16px; font-size:13px; display:flex; align-items:center; justify-content:center; gap:8px; }
.pi-beta b { background:linear-gradient(135deg,#00b4d8,#48cae4); color:#0a1628; font-weight:700; font-size:11px; padding:2px 9px; border-radius:999px; letter-spacing:1px; text-transform:uppercase; }

@media (max-width: 1100px) {
  .pi-layout { grid-template-columns:minmax(0,1fr) 300px; }
  .pi-nav { display:none; }
  .pi-secnav { display:flex; }
}
@media (max-width: 900px) {
  .pi-layout { grid-template-columns:1fr; gap:28px; }
  .pi-hero-inner { padding:44px 22px 48px; }
  .pi-hero h1 { margin-bottom:22px; }
  .pi-sidebar { position:static; }
  .pi-card { grid-template-columns:1fr; }
  .pi-card-media { min-height:200px; }
  .pi-detail-pad { padding:26px 22px 34px; }
}
`

// ──────────────────────────────────────────────────────────────
// Newsletter / "anuncio" lateral
// ──────────────────────────────────────────────────────────────
function NewsletterCard({ onSubscribe }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | ok | dup | error
  const [msg, setMsg] = useState('')
  const [website, setWebsite] = useState('') // honeypot: invisible para personas, los bots lo llenan

  const submit = async () => {
    if (status === 'sending') return
    if (website) { setStatus('ok'); return } // bot: se simula éxito sin guardar nada
    if (!name.trim() || !email.trim()) { setStatus('error'); setMsg('Ingresa tu nombre y tu correo.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || email.trim().length > 254) { setStatus('error'); setMsg('Ingresa un correo válido.'); return }
    setStatus('sending'); setMsg('')
    const res = await onSubscribe(name.trim(), email.trim())
    setStatus(res.status)
    setMsg(res.message || '')
  }

  if (status === 'ok' || status === 'dup') {
    return (
      <div className="pi-side-card pi-news">
        <div className="pi-news-ok">
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9fe3f2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 style={{ fontSize: 19 }}>{status === 'dup' ? 'Ya estás en la lista' : '¡Listo!'}</h3>
          <p style={{ marginBottom: 0 }}>
            {status === 'dup'
              ? 'Este correo ya estaba suscrito. Te seguiremos enviando novedades.'
              : `Gracias, ${name.split(' ')[0]}. Te avisaremos cuando publiquemos algo nuevo.`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pi-side-card pi-news">
      <span className="pi-news-tag">{I.spark} Mantente al día</span>
      <h3>Recibe nuevas publicaciones</h3>
      <p>Análisis, recursos y novedades sobre auditoría, riesgo e IA aplicada, directo a tu correo.</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" maxLength={120} autoComplete="name" onKeyDown={e => e.key === 'Enter' && submit()} />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" maxLength={254} autoComplete="email" onKeyDown={e => e.key === 'Enter' && submit()} />
      <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} name="website" />
      {msg && status === 'error' && <p className="pi-news-note" style={{ color: '#ffb3ab' }}>{msg}</p>}
      <button className="pi-news-btn" onClick={submit} disabled={status === 'sending'}>
        {status === 'sending'
          ? <><svg className="pi-spin" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg> Enviando…</>
          : <>Suscribirme {I.arrow}</>}
      </button>
      <p className="pi-news-note">No compartimos tu correo. Puedes darte de baja cuando quieras.</p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Sidebar derecha (anuncio + acerca de)
// ──────────────────────────────────────────────────────────────
function Sidebar({ onSubscribe }) {
  return (
    <aside className="pi-sidebar">
      <NewsletterCard onSubscribe={onSubscribe} />

      <div className="pi-side-card pi-about">
        <p className="pi-side-title">Acerca de</p>
        <p>Prospectiva IA reúne publicaciones, recursos y experimentos sobre gestión de riesgos, cumplimiento y auditoría apoyada en inteligencia artificial.</p>
        <span className="pi-tag">Anticipa · Controla · Previene</span>
      </div>
    </aside>
  )
}

// ──────────────────────────────────────────────────────────────
// Menú de secciones (izquierda en escritorio, fila deslizable en pantallas angostas)
// ──────────────────────────────────────────────────────────────
function SectionNav({ active, onPick }) {
  return (
    <nav className="pi-nav" aria-label="Secciones">
      {NAV_GROUPS.map(g => (
        <div className="pi-nav-group" key={g || 'inicio'}>
          {g && <p className="pi-nav-title">{g}</p>}
          {SECTIONS.filter(s => s.group === g).map(s => (
            <button
              key={s.key}
              className={`pi-nav-btn ${active === s.key ? 'active' : ''}`}
              aria-current={active === s.key ? 'page' : undefined}
              onClick={() => onPick(s.key)}
            >
              <NavIcon k={s.key} />
              <span className="lbl">{s.label}</span>
              {s.soon && <span className="pi-soon">Pronto</span>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}

function SectionPills({ active, onPick }) {
  // En celular se muestran primero los diferenciadores del sitio
  const order = ['ultimo', 'casos', 'herramientas', 'articulos', 'documentos', 'videos', 'recursos', 'observatorio', 'noticias', 'tendencias', 'formacion']
  return (
    <nav className="pi-secnav" aria-label="Secciones">
      {order.map(k => {
        const s = sectionByKey(k)
        return (
          <button key={k} className={active === k ? 'active' : ''} aria-current={active === k ? 'page' : undefined} onClick={() => onPick(k)}>
            {s.label}{s.soon ? ' · Pronto' : ''}
          </button>
        )
      })}
    </nav>
  )
}

// ──────────────────────────────────────────────────────────────
// Tarjeta de publicación
// ──────────────────────────────────────────────────────────────
function PostCard({ post, isAdmin, onOpen, onEdit, onDelete }) {
  const img = firstImage(post)
  const type = postType(post)
  const isVideo = type === 'Video' || (!!post.video_url && !img)
  const fm = formatMeta(type)
  const hasMedia = !!img || isVideo
  return (
    <article className={`pi-card ${hasMedia ? '' : 'no-media'}`} onClick={() => onOpen(post)}>
      {hasMedia && (
        <div className="pi-card-media">
          {img
            ? <img src={img} alt="" onError={e => { e.target.style.display = 'none' }} />
            : <div style={{ width: '100%', height: '100%', minHeight: 160, background: 'linear-gradient(135deg,#0a1628,#1b6b93)' }} />}
          {(isVideo || post.video_url) && <div className="pi-play"><span>{I.video}</span></div>}
        </div>
      )}
      <div className="pi-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="pi-badge" style={{ background: fm.bg, color: fm.color }}>{fm.icon} {postType(post)}</span>
          {post.category && <span className="pi-cat">{post.category}</span>}
        </div>
        <h2 className="pi-card-title">{post.title}</h2>
        <p className="pi-card-excerpt">{excerptFrom(post)}</p>
        <div className="pi-card-foot">
          <span className="pi-dot">{I.calendar} {formatDate(post.created_at)}</span>
          {post.author && <span className="pi-dot">· {post.author}</span>}
        </div>
        {isAdmin && (
          <div className="pi-admin-row" onClick={e => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(post)}>{Icons.edit} Editar</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger,#b3261e)' }} onClick={() => onDelete(post)}>{Icons.trash}</button>
          </div>
        )}
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────
// Vista de detalle
// ──────────────────────────────────────────────────────────────
function PostDetail({ post, isAdmin, onBack, onEdit, onDelete }) {
  const cover = safeUrl(post.cover_image)
  const embed = toEmbedUrl(post.video_url)
  const bodyImages = Array.isArray(post.images) ? post.images.filter(u => isHttpUrl(u) && u !== cover) : []
  const fm = formatMeta(postType(post))
  const paragraphs = (post.content || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  return (
    <article className="pi-detail pi-fade">
      {cover && <img className="pi-detail-cover" src={cover} alt="" onError={e => { e.target.style.display = 'none' }} />}
      <div className="pi-detail-pad">
        <button className="pi-back" onClick={onBack}>{Icons.back} Volver</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="pi-badge" style={{ background: fm.bg, color: fm.color }}>{fm.icon} {postType(post)}</span>
          {post.category && <span className="pi-cat">{post.category}</span>}
        </div>

        <h1>{post.title}</h1>
        <div className="pi-detail-meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{I.calendar} {formatDate(post.created_at)}</span>
          {post.author && <span>· {post.author}</span>}
          {isAdmin && (
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(post)}>{Icons.edit} Editar</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger,#b3261e)' }} onClick={() => onDelete(post)}>{Icons.trash} Eliminar</button>
            </span>
          )}
        </div>

        {embed && (
          <div className="pi-video-wrap">
            <iframe
              src={embed}
              title={post.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              loading="lazy"
              allowFullScreen
            />
          </div>
        )}

        <div className="pi-detail-content">
          {paragraphs.length > 0
            ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
            : <p style={{ color: 'var(--muted)' }}>Sin contenido de texto.</p>}
        </div>

        {bodyImages.map((src, i) => (
          <img key={i} className="pi-detail-img" src={src} alt="" onError={e => { e.target.style.display = 'none' }} />
        ))}
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────
// Composer (crear / editar publicación) — sólo admin
// ──────────────────────────────────────────────────────────────
function Composer({ initial, onClose, onSave }) {
  const editing = !!initial?.id
  const [title, setTitle] = useState(initial?.title || '')
  const [category, setCategory] = useState(initial?.category || CATEGORIES[0])
  // Al crear desde una sección, la sección queda preseleccionada
  const [type, setType] = useState(initial?.id ? postType(initial) : (initial?.type || 'Artículo'))
  // Si una publicación antigua tiene una categoría que ya no está en la lista, se conserva
  const categoryOptions = CATEGORIES.includes(category) ? CATEGORIES : [...CATEGORIES, category]
  const [content, setContent] = useState(initial?.content || '')
  const [videoUrl, setVideoUrl] = useState(initial?.video_url || '')
  const [coverUrl, setCoverUrl] = useState(initial?.cover_image || '')
  const [coverFile, setCoverFile] = useState(null)
  const [bodyFiles, setBodyFiles] = useState([])
  const [bodyUrls, setBodyUrls] = useState(
    Array.isArray(initial?.images) ? initial.images.filter(u => u !== initial?.cover_image).join('\n') : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!title.trim()) { setError('La publicación necesita un título.'); return }
    if (title.trim().length > 300) { setError('El título no puede superar 300 caracteres.'); return }
    if (!coverFile && coverUrl.trim() && !isHttpUrl(coverUrl.trim())) { setError('La URL de portada debe empezar con https://'); return }
    const pastedUrls = bodyUrls.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    const badUrl = pastedUrls.find(u => !isHttpUrl(u))
    if (badUrl) { setError(`URL de imagen no válida: ${badUrl}`); return }
    if (videoUrl.trim() && !toEmbedUrl(videoUrl)) { setError('El video debe ser un enlace de YouTube o Vimeo.'); return }
    setSaving(true)
    try {
      let cover = coverUrl.trim()
      if (coverFile) cover = await uploadFile(coverFile)

      const uploaded = []
      for (const f of bodyFiles) uploaded.push(await uploadFile(f))
      const images = [...(cover ? [cover] : []), ...uploaded, ...pastedUrls]

      await onSave({
        id: initial?.id,
        title: title.trim(),
        category,
        type,
        content: content.trim(),
        video_url: videoUrl.trim() || null,
        cover_image: cover || null,
        images: images.length ? images : null,
      })
    } catch (err) {
      setError(err.message?.includes('Bucket') || err.message?.includes('bucket')
        ? 'No se pudo subir el archivo: crea un bucket público llamado "media" en Supabase Storage (ver SUPABASE_SETUP.sql), o pega una URL de imagen en su lugar.'
        : (err.message || 'No se pudo guardar la publicación.'))
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <h2>{editing ? 'Editar publicación' : 'Nueva publicación'}</h2>

        {error && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, lineHeight: 1.45 }}>{error}</div>}

        <div className="form-group"><label>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Cómo aplicar NLP a la auditoría de contratos" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Sección</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {NAV_GROUPS.filter(Boolean).map(g => (
                <optgroup key={g} label={g}>
                  {POST_TYPES.filter(s => s.group === g).map(s => <option key={s.type} value={s.type}>{s.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-group"><label>Tema</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {categoryOptions.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group"><label>Contenido</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escribe aquí. Deja una línea en blanco para separar párrafos." style={{ minHeight: 160, lineHeight: 1.6 }} />
        </div>

        <div className="form-group"><label>Video (opcional) — URL de YouTube o Vimeo</label>
          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        </div>

        <div className="form-group"><label>Imagen de portada</label>
          <input type="file" accept={IMAGE_ACCEPT} onChange={e => setCoverFile(e.target.files?.[0] || null)} />
          <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="…o pega una URL de imagen" style={{ marginTop: 8 }} />
          {(coverFile || coverUrl) && (
            <img src={coverFile ? URL.createObjectURL(coverFile) : (safeUrl(coverUrl.trim()) || '')} alt="" style={{ marginTop: 10, width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10 }} onError={e => { e.target.style.display = 'none' }} />
          )}
        </div>

        <div className="form-group"><label>Imágenes del cuerpo (opcional)</label>
          <input type="file" accept={IMAGE_ACCEPT} multiple onChange={e => setBodyFiles(Array.from(e.target.files || []))} />
          {bodyFiles.length > 0 && <p style={{ fontSize: 12, color: 'var(--text-muted,#8a97a8)', margin: '6px 0 0' }}>{bodyFiles.length} archivo(s) listo(s) para subir.</p>}
          <textarea value={bodyUrls} onChange={e => setBodyUrls(e.target.value)} placeholder="…o pega URLs de imágenes, una por línea" style={{ marginTop: 8, minHeight: 70, fontSize: 13 }} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-accent" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Login de administrador (sin registro público)
// ──────────────────────────────────────────────────────────────
function AdminLoginModal({ onClose, onLoggedIn }) {
  const [mode, setMode] = useState('login') // login | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const login = async () => {
    setError('')
    if (!email || !password) return setError('Completa correo y contraseña.')
    setLoading(true)
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) throw err
      // Tener cuenta no basta: debe estar registrada en public.admins
      const { data: admin, error: rpcErr } = await supabase.rpc('is_admin')
      if (rpcErr || admin !== true) {
        await supabase.auth.signOut()
        throw new Error(rpcErr ? 'NO_RPC' : 'NOT_ADMIN')
      }
      onLoggedIn(data.user)
    } catch (err) {
      const m = err.message
      setError(
        m === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.'
        : m === 'NOT_ADMIN' ? 'Esta cuenta no tiene permisos de administrador.'
        : m === 'NO_RPC' ? 'No se pudo verificar el acceso de administrador. Revisa que se haya ejecutado SUPABASE_SETUP.sql.'
        : (m || 'Error al conectar.')
      )
      setLoading(false)
    }
  }

  const reset = async () => {
    setError('')
    if (!email.includes('@')) return setError('Ingresa un correo válido.')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (err) throw err
      setSent(true)
    } catch (err) { setError(err.message || 'Error al enviar el correo.') }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <img src={logoSrc} alt="Prospectiva IA" style={{ height: 44, objectFit: 'contain' }} />
        </div>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: 8 }}>Correo enviado</h2>
            <p style={{ color: 'var(--text-secondary,#5a6b7d)', fontSize: 14, marginBottom: 20 }}>Te enviamos instrucciones para restablecer tu contraseña a <b>{email}</b>. Revisa también tu carpeta de spam.</p>
            <button className="btn btn-accent" style={{ width: '100%' }} onClick={onClose}>Entendido</button>
          </div>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{mode === 'login' ? 'Acceso de administrador' : 'Recuperar contraseña'}</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary,#5a6b7d)', fontSize: 14, marginBottom: 22 }}>
              {mode === 'login' ? 'Inicia sesión para crear y gestionar publicaciones.' : 'Te enviaremos un enlace para restablecerla.'}
            </p>
            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div className="form-group"><label>Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </div>
            {mode === 'login' && (
              <div className="form-group"><label>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" onKeyDown={e => e.key === 'Enter' && login()} style={{ paddingRight: 44 }} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8a97a8', display: 'flex' }}>
                    {showPw ? Icons.eyeOff : Icons.eye}
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 13 }} onClick={() => { setMode('forgot'); setError('') }}>¿Olvidaste tu contraseña?</button>
                </div>
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: 4 }}>
              {mode === 'forgot'
                ? <button className="btn btn-secondary" onClick={() => { setMode('login'); setError('') }}>← Volver</button>
                : <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>}
              <button className="btn btn-accent" onClick={mode === 'login' ? login : reset} disabled={loading}>
                {loading ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Enviar enlace'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Modal para nueva contraseña (enlaces de recuperación)
// ──────────────────────────────────────────────────────────────
function UpdatePasswordModal({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)

  const update = async () => {
    setError('')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setOk(true)
    } catch (err) { setError(err.message || 'Error al actualizar.') }
    setLoading(false)
  }

  return (
    <div className="modal-overlay">
      <div className="modal fade-in" style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <img src={logoSrc} alt="Prospectiva IA" style={{ height: 44, objectFit: 'contain' }} />
        </div>
        {ok ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: 8 }}>Contraseña actualizada</h2>
            <p style={{ color: 'var(--text-secondary,#5a6b7d)', fontSize: 14, marginBottom: 20 }}>Tu contraseña se cambió correctamente.</p>
            <button className="btn btn-accent" style={{ width: '100%' }} onClick={onDone}>Continuar</button>
          </div>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 18 }}>Nueva contraseña</h2>
            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div className="form-group"><label>Nueva contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="form-group"><label>Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite la contraseña" onKeyDown={e => e.key === 'Enter' && update()} />
            </div>
            <button className="btn btn-accent" style={{ width: '100%' }} onClick={update} disabled={loading}>{loading ? 'Actualizando…' : 'Guardar'}</button>
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)          // sesión admin (opcional)
  const [recovery, setRecovery] = useState(false)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')   // tema
  const [section, setSection] = useState('ultimo')    // sección del menú izquierdo
  const [pastHero, setPastHero] = useState(false)     // para mostrar el logo del encabezado al bajar
  const [showLogin, setShowLogin] = useState(false)
  const [composer, setComposer] = useState(null)  // null | {} (nuevo) | post (editar)
  const [isAdmin, setIsAdmin] = useState(false)   // sólo true si is_admin() lo confirma

  // Verifica en la base de datos si la sesión actual es de un administrador.
  // Una sesión sin permisos (p. ej. alguien que se registró por la API) se cierra.
  useEffect(() => {
    let cancelled = false
    if (!user) { setIsAdmin(false); return }
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return
      const ok = !error && data === true
      setIsAdmin(ok)
      if (!ok && !recovery) supabase.auth.signOut()
    })
    return () => { cancelled = true }
  }, [user, recovery])

  // Auth: detecta sesión existente y enlaces de recuperación (no obliga a nadie a iniciar sesión)
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) setRecovery(true)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { loadPosts() }, [])

  // El logo pequeño del encabezado aparece al bajar más allá del banner
  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goSection = (key) => {
    setSection(key)
    setSelected(null)
    setCategory('Todos')
    setSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goHome = () => goSection('ultimo')

  const loadPosts = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (error) {
      setLoadError(error.message)
      setPosts([])
    } else {
      setLoadError('')
      setPosts(data || [])
    }
    setLoading(false)
  }

  const subscribe = async (name, email) => {
    const { error } = await supabase.from('subscribers').insert({ name, email })
    if (error) {
      if (error.code === '23505' || /duplicate|unique/i.test(error.message)) return { status: 'dup' }
      return { status: 'error', message: 'No pudimos guardar tu suscripción. Inténtalo de nuevo.' }
    }
    return { status: 'ok' }
  }

  const savePost = async (p) => {
    const payload = {
      title: p.title, category: p.category, type: p.type, content: p.content,
      video_url: p.video_url, cover_image: p.cover_image, images: p.images,
      author: user?.user_metadata?.full_name || 'Prospectiva IA',
    }
    if (p.id) {
      const { data, error } = await supabase.from('posts').update(payload).eq('id', p.id).select().single()
      if (error) throw error
      setPosts(posts.map(x => x.id === p.id ? data : x))
      if (selected?.id === p.id) setSelected(data)
    } else {
      const { data, error } = await supabase.from('posts').insert({ ...payload, created_by: user.id }).select().single()
      if (error) throw error
      setPosts([data, ...posts])
    }
    setComposer(null)
  }

  const deletePost = async (post) => {
    if (!confirm(`¿Eliminar la publicación “${post.title}”? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) { alert('No se pudo eliminar: ' + error.message); return }
    setPosts(posts.filter(x => x.id !== post.id))
    if (selected?.id === post.id) setSelected(null)
  }

  const logout = async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false); setComposer(null) }

  // Filtrado: sección (menú) → tema (chips) → búsqueda
  const sec = sectionByKey(section)
  const inSection = sec.key === 'ultimo' ? posts : posts.filter(p => sec.type && postType(p) === sec.type)
  const filtered = inSection.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || (p.title || '').toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q)
    const matchCat = category === 'Todos' || p.category === category
    return matchSearch && matchCat
  })
  const categoryCounts = Object.entries(
    inSection.reduce((acc, p) => { if (p.category) acc[p.category] = (acc[p.category] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])
  const showBrand = !!selected || pastHero

  if (recovery) return <div className="pi-app"><style>{BLOG_CSS}</style><UpdatePasswordModal onDone={() => { setRecovery(false); window.location.hash = '' }} /></div>

  return (
    <div className="pi-app">
      <style>{BLOG_CSS}</style>

      {/* Header */}
      <header className="pi-header">
        <div className="pi-header-inner">
          {/* En la portada el logo grande está en el banner; el pequeño aparece al bajar o dentro de una publicación */}
          <button
            className={`pi-brand ${showBrand ? '' : 'hidden'}`}
            onClick={goHome}
            aria-label="Ir al inicio"
            aria-hidden={showBrand ? undefined : 'true'}
            tabIndex={showBrand ? 0 : -1}
          >
            <img src={logoSrc} alt="Prospectiva IA" />
          </button>
          <div className="pi-head-actions">
            {isAdmin ? (
              <>
                <button className="btn btn-accent btn-sm" onClick={() => setComposer(sec.type ? { type: sec.type } : {})}>{Icons.plus} Nueva publicación</button>
                <span className="pi-admin-chip"><span className="pi-admin-dot" /> Admin</span>
                <button className="btn btn-ghost btn-sm" onClick={logout}>{Icons.logout}</button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogin(true)}>Acceso</button>
            )}
          </div>
        </div>
      </header>

      {/* Beta */}
      <div className="pi-beta"><b>Beta</b> Estás viendo una versión preliminar del sitio. El contenido puede cambiar.</div>

      {/* Hero (sólo en el feed) */}
      {!selected && (
        <section className="pi-hero">
          <div className="pi-hero-inner">
            <div className="pi-hero-orb" style={{ width: 320, height: 320, right: -60, top: -80, background: 'radial-gradient(circle, rgba(72,202,228,.18), transparent 70%)' }} />
            <div className="pi-hero-orb" style={{ width: 220, height: 220, right: 120, bottom: -120, background: 'radial-gradient(circle, rgba(0,180,216,.12), transparent 70%)' }} />
            <h1><img src={logoWhiteSrc} alt="Prospectiva IA · Anticipa · Controla · Previene" /></h1>
            <p>Desarrollamos capacidades y conocimiento especializado para habilitar un aseguramiento continuo en las organizaciones con inteligencia artificial aplicada.</p>
          </div>
        </section>
      )}

      {/* Layout: menú de secciones + contenido + sidebar */}
      <div className="pi-layout">
        <SectionNav active={section} onPick={goSection} />

        <div className="pi-feed-col">
          <SectionPills active={section} onPick={goSection} />

          {selected ? (
            <PostDetail
              post={selected}
              isAdmin={isAdmin}
              onBack={() => setSelected(null)}
              onEdit={(p) => setComposer(p)}
              onDelete={deletePost}
            />
          ) : (
            <>
              <div className="pi-sec-head">
                {sec.group && <span className="pi-sec-group">{sec.group}</span>}
                <h2>{sec.label}</h2>
                <p>{sec.def}</p>
              </div>

              {/* Guía editorial: solo la ve el administrador */}
              {isAdmin && sec.items && (
                <div className="pi-guide">
                  <p className="pi-guide-title">Guía editorial · solo visible para ti</p>
                  <ul>{sec.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                  <p><b>No incluye:</b> {sec.not}</p>
                  <p><b>Ejemplo:</b> {sec.ex}</p>
                </div>
              )}

              {sec.soon ? (
                <div className="pi-empty">
                  <h3>Próximamente</h3>
                  <p>Estamos preparando los primeros programas de formación. Suscríbete en el recuadro “Recibe nuevas publicaciones” y te avisaremos cuando estén disponibles.</p>
                </div>
              ) : (
              <>
              <div className="pi-controls">
                <div className="pi-search">
                  {Icons.search}
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar publicaciones…" />
                </div>
              </div>
              {categoryCounts.length > 0 && (
              <div className="pi-chips">
                {['Todos', ...categoryCounts.map(c => c[0])].map(c => (
                  <button key={c} className={`pi-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
              )}

              {loading ? (
                <div className="pi-empty"><h3>Cargando…</h3><p>Trayendo las últimas publicaciones.</p></div>
              ) : filtered.length === 0 ? (
                <div className="pi-empty">
                  <h3>{inSection.length === 0 ? (sec.key === 'ultimo' ? 'Aún no hay publicaciones' : `Aún no hay publicaciones en ${sec.label}`) : 'Sin resultados'}</h3>
                  <p>
                    {inSection.length === 0
                      ? (isAdmin ? 'Crea la primera con el botón “Nueva publicación”.' : 'Vuelve pronto: estamos preparando este contenido.')
                      : 'Prueba con otra búsqueda o tema.'}
                  </p>
                  {loadError && isAdmin && (
                    <p style={{ marginTop: 14, fontSize: 12.5, color: '#b3261e' }}>
                      Nota técnica: no se pudo leer la tabla <code>posts</code> ({loadError}). Revisa que exista y tenga políticas de lectura pública (ver SUPABASE_SETUP.sql).
                    </p>
                  )}
                </div>
              ) : (
                <div className="pi-feed">
                  {filtered.map(p => (
                    <PostCard
                      key={p.id}
                      post={p}
                      isAdmin={isAdmin}
                      onOpen={(post) => { setSelected(post); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      onEdit={(post) => setComposer(post)}
                      onDelete={deletePost}
                    />
                  ))}
                </div>
              )}
              </>
              )}
            </>
          )}
        </div>

        <Sidebar onSubscribe={subscribe} />
      </div>

      {/* Modales */}
      {composer !== null && <Composer initial={composer} onClose={() => setComposer(null)} onSave={savePost} />}
      {showLogin && !isAdmin && <AdminLoginModal onClose={() => setShowLogin(false)} onLoggedIn={(u) => { setUser(u); setShowLogin(false) }} />}
    </div>
  )
}
