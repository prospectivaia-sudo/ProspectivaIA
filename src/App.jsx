import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Icons } from './components/Icons'
import logoSrc from './assets/Logo_Prospectiva_IA_Color_tagline_.jpg'

// ── Slide Viewer ──
function SlideViewer({ slides }) {
  const [current, setCurrent] = useState(0)
  const s = slides[current]
  return (
    <div>
      <div className="slides-viewer">
        <div className="slide-title">{s.title}</div>
        <ul className="slide-bullets">
          {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
      <div className="slide-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>← Anterior</button>
        <div className="slide-dots">
          {slides.map((_, i) => <button key={i} className={`slide-dot ${i === current ? 'active' : ''}`} onClick={() => setCurrent(i)} />)}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))} disabled={current === slides.length - 1}>Siguiente →</button>
      </div>
    </div>
  )
}

// ── Quiz Viewer ──
function QuizViewer({ questions, onComplete }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const score = submitted ? questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0) : 0

  const handleSubmit = () => {
    setSubmitted(true)
    if (score >= questions.length * 0.7) onComplete?.()
  }

  if (submitted) {
    return (
      <div className="quiz-result fade-in">
        <div className="quiz-score">{score}/{questions.length}</div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          {score === questions.length ? '¡Perfecto! Dominas este tema.' : score >= questions.length * 0.7 ? '¡Bien hecho! Has aprobado.' : 'Necesitas repasar el material.'}
        </p>
        <button className="btn btn-secondary" onClick={() => { setAnswers({}); setSubmitted(false) }}>Intentar de nuevo</button>
      </div>
    )
  }

  return (
    <div>
      {questions.map((q, qi) => (
        <div key={qi} className="quiz-question">
          <h3>{qi + 1}. {q.q}</h3>
          <div className="quiz-options">
            {q.opts.map((opt, oi) => (
              <button key={oi} className={`quiz-opt ${answers[qi] === oi ? 'selected' : ''}`} onClick={() => setAnswers({ ...answers, [qi]: oi })}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-accent" onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length} style={{ marginTop: 8 }}>Enviar respuestas</button>
    </div>
  )
}

// ── Module Content ──
function ModuleContent({ mod, onComplete }) {
  if (!mod) return null
  const markDone = () => onComplete?.(mod.id)

  if (mod.type === 'video') return (
    <div className="content-area fade-in">
      <h2>{mod.title}</h2>
      <iframe className="video-embed" src={mod.url} title={mod.title} allowFullScreen />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-accent btn-sm" onClick={markDone}>{Icons.check} Marcar completado</button>
      </div>
    </div>
  )

  if (mod.type === 'slides') return (
    <div className="content-area fade-in">
      <h2>{mod.title}</h2>
      <SlideViewer slides={mod.content} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-accent btn-sm" onClick={markDone}>{Icons.check} Marcar completado</button>
      </div>
    </div>
  )

  if (mod.type === 'download') return (
    <div className="content-area fade-in">
      <h2>{mod.title}</h2>
      <div className="download-card">
        <div className="download-icon">{Icons.file}</div>
        <div className="download-info" style={{ flex: 1 }}>
          <h4>{mod.file_name}</h4>
          <p>{mod.file_size}</p>
        </div>
        <button className="btn btn-accent btn-sm" onClick={markDone}>{Icons.download} Descargar</button>
      </div>
    </div>
  )

  if (mod.type === 'quiz') return (
    <div className="content-area fade-in">
      <h2>{mod.title}</h2>
      <QuizViewer questions={mod.content} onComplete={markDone} />
    </div>
  )

  return null
}

// ── Create Course Modal ──
function CreateCourseModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'Normas de Auditoría',
    level: 'Fundamentos', duration: '',
    image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=340&fit=crop',
  })
  const set = (k, v) => setForm({ ...form, [k]: v })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <h2>Nuevo Curso</h2>
        <div className="form-group"><label>Título</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: NIA 315 — Evaluación de Riesgos" /></div>
        <div className="form-group"><label>Descripción</label><textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe el contenido del curso..." /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group"><label>Categoría</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              <option>Normas de Auditoría</option><option>Control Interno</option><option>Cumplimiento</option><option>Forense</option><option>Gestión de Riesgos</option><option>Tributario</option>
            </select>
          </div>
          <div className="form-group"><label>Nivel</label>
            <select value={form.level} onChange={e => set('level', e.target.value)}>
              <option>Fundamentos</option><option>Intermedio</option><option>Avanzado</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label>Duración estimada</label><input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="Ej: 6 horas" /></div>
        <div className="form-group"><label>URL de imagen</label><input value={form.image_url} onChange={e => set('image_url', e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-accent" onClick={() => { if (form.title && form.description) onSave(form) }} disabled={!form.title || !form.description}>Crear Curso</button>
        </div>
      </div>
    </div>
  )
}

// ── Add Module Modal ──
function AddModuleModal({ onClose, onSave }) {
  const [type, setType] = useState('video')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [contentRaw, setContentRaw] = useState('')

  const handleSave = () => {
    if (!title) return
    const mod = { title, type }
    if (type === 'video') { mod.url = url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'; mod.duration = duration || '15 min' }
    if (type === 'slides') { try { mod.content = JSON.parse(contentRaw) } catch { mod.content = [{ slide: 1, title, bullets: ['Contenido pendiente'] }] } }
    if (type === 'download') { mod.file_name = fileName || 'documento.pdf'; mod.file_size = fileSize || '1 MB' }
    if (type === 'quiz') { try { mod.content = JSON.parse(contentRaw) } catch { mod.content = [{ q: 'Pregunta de ejemplo', opts: ['A', 'B', 'C', 'D'], correct: 0 }] } }
    onSave(mod)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <h2>Agregar Módulo</h2>
        <div className="form-group"><label>Título</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Introducción al tema" /></div>
        <div className="form-group"><label>Tipo</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="video">Video</option><option value="slides">Presentación</option><option value="download">Descargable</option><option value="quiz">Evaluación</option>
          </select>
        </div>
        {type === 'video' && (<>
          <div className="form-group"><label>URL embed</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." /></div>
          <div className="form-group"><label>Duración</label><input value={duration} onChange={e => setDuration(e.target.value)} placeholder="20 min" /></div>
        </>)}
        {type === 'slides' && (
          <div className="form-group"><label>Contenido (JSON)</label><textarea value={contentRaw} onChange={e => setContentRaw(e.target.value)} placeholder={'[{"slide":1,"title":"Título","bullets":["Punto 1"]}]'} style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12 }} /></div>
        )}
        {type === 'download' && (<>
          <div className="form-group"><label>Nombre archivo</label><input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="guia.pdf" /></div>
          <div className="form-group"><label>Tamaño</label><input value={fileSize} onChange={e => setFileSize(e.target.value)} placeholder="2.5 MB" /></div>
        </>)}
        {type === 'quiz' && (
          <div className="form-group"><label>Preguntas (JSON)</label><textarea value={contentRaw} onChange={e => setContentRaw(e.target.value)} placeholder={'[{"q":"Pregunta","opts":["A","B","C","D"],"correct":0}]'} style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12 }} /></div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-accent" onClick={handleSave} disabled={!title}>Agregar</button>
        </div>
      </div>
    </div>
  )
}

// ── Auth Screen ──
const authStyles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: 'linear-gradient(145deg, #f0f4f8 0%, #e8edf3 40%, #dce4ed 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrb1: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,180,216,0.08) 0%, transparent 70%)',
    top: '-10%',
    right: '-8%',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,33,71,0.06) 0%, transparent 70%)',
    bottom: '-5%',
    left: '-5%',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#ffffff',
    borderRadius: 20,
    padding: '40px 36px 36px',
    boxShadow: '0 4px 32px rgba(0,33,71,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    position: 'relative',
    zIndex: 1,
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logo: {
    height: 56,
    width: 'auto',
    objectFit: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#0a1628',
    marginBottom: 6,
    fontFamily: "'DM Serif Display', Georgia, serif",
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7a8d',
    marginBottom: 28,
    lineHeight: 1.4,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#3a4a5c',
    marginBottom: 7,
  },
  formGroup: {
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    border: '1.5px solid #dde2e8',
    borderRadius: 10,
    fontSize: 15,
    color: '#1a2332',
    background: '#fafbfc',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputFocus: {
    borderColor: '#00b4d8',
    boxShadow: '0 0 0 3px rgba(0,180,216,0.1)',
  },
  inputWrap: {
    position: 'relative',
  },
  togglePw: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8a97a8',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  submitBtn: {
    width: '100%',
    padding: '14px 20px',
    background: '#0a1628',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
    letterSpacing: '0.01em',
    fontFamily: 'inherit',
  },
  submitBtnHover: {
    background: '#152238',
    boxShadow: '0 4px 16px rgba(10,22,40,0.18)',
  },
  switchRow: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 14,
    color: '#6b7a8d',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#002147',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
    textDecoration: 'none',
    padding: 0,
    transition: 'color 0.15s',
    fontFamily: 'inherit',
  },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 1.4,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '24px 0 20px',
    color: '#a0aab5',
    fontSize: 12,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e5e9ee',
  },
  footer: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 12,
    color: '#a0aab5',
    lineHeight: 1.5,
  },
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [btnHover, setBtnHover] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Reset animation on mode change
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [mode])

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) return setError('Completa todos los campos.')
    if (mode === 'register' && !name) return setError('Ingresa tu nombre completo.')
    if (!email.includes('@')) return setError('Ingresa un correo válido.')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')

    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        })
        if (err) throw err
        if (data.user) onLogin(data.user)
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        if (data.user) onLogin(data.user)
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err.message || 'Error al conectar.')
    }
    setLoading(false)
  }

  const inputStyle = (field) => ({
    ...authStyles.input,
    ...(focusedField === field ? authStyles.inputFocus : {}),
  })

  return (
    <div style={authStyles.wrapper}>
      <div style={authStyles.bgOrb1} />
      <div style={authStyles.bgOrb2} />
      <div style={{
        ...authStyles.card,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Logo */}
        <div style={authStyles.logoWrap}>
          <img src={logoSrc} alt="Prospectiva IA" style={authStyles.logo} />
        </div>

        {/* Heading */}
         <p style={{ ...authStyles.subtitle, marginBottom: 10, textAlign: 'center' }}}>
          {mode === 'login'
            ? 'Impulsa el valor estratégico de tu función de auditoría, cumplimiento y gestión de riesgos con inteligencia artificial aplicada.'
            : 'Regístrate para acceder al contenido.'}
        </p>
        <h2 style={{ ...authStyles.title, marginBottom: 28 }}>
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>

        {/* Error */}
        {error && <div style={authStyles.error}>{error}</div>}

        {/* Name field (register only) */}
        {mode === 'register' && (
          <div style={authStyles.formGroup}>
            <label style={authStyles.label}>Nombre completo</label>
            <input
              style={inputStyle('name')}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Juan Pérez"
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
        )}

        {/* Email */}
        <div style={authStyles.formGroup}>
          <label style={authStyles.label}>Correo electrónico</label>
          <input
            type="email"
            style={inputStyle('email')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        {/* Password */}
        <div style={authStyles.formGroup}>
          <label style={authStyles.label}>Contraseña</label>
          <div style={authStyles.inputWrap}>
            <input
              type={showPw ? 'text' : 'password'}
              style={{ ...inputStyle('password'), paddingRight: 48 }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <button
              style={authStyles.togglePw}
              onClick={() => setShowPw(!showPw)}
              type="button"
              tabIndex={-1}
            >
              {showPw ? Icons.eyeOff : Icons.eye}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          style={{
            ...authStyles.submitBtn,
            ...(btnHover && !loading ? authStyles.submitBtnHover : {}),
            ...(loading ? { opacity: 0.7, cursor: 'wait' } : {}),
          }}
          onClick={handleSubmit}
          disabled={loading}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
              Cargando...
            </span>
          ) : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </button>

        {/* Switch mode */}
        <div style={authStyles.switchRow}>
          {mode === 'login' ? (
            <>¿No tienes cuenta?{' '}
              <button style={authStyles.switchBtn} onClick={() => { setMode('register'); setError('') }}>
                Regístrate
              </button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{' '}
              <button style={authStyles.switchBtn} onClick={() => { setMode('login'); setError('') }}>
                Inicia sesión
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={authStyles.footer}>
          Anticipa · Controla · Previene
        </div>
      </div>

      {/* Spinner keyframe (injected once) */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
      `}</style>
    </div>
  )
}

// ── Helper functions ──
const getModIcon = (type) => {
  if (type === 'video') return <div className="module-icon video">{Icons.play}</div>
  if (type === 'slides') return <div className="module-icon slides">{Icons.slides}</div>
  if (type === 'download') return <div className="module-icon download">{Icons.file}</div>
  if (type === 'quiz') return <div className="module-icon quiz">{Icons.cert}</div>
  return null
}

const levelBadge = (level) => {
  if (level === 'Fundamentos') return 'badge-green'
  if (level === 'Intermedio') return 'badge-amber'
  return 'badge-neutral'
}

// ── Main App ──
export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('catalog')
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [progress, setProgress] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedModule, setSelectedModule] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [showAddModule, setShowAddModule] = useState(false)

  // Check auth on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load courses
  useEffect(() => {
    loadCourses()
  }, [])

  // Load enrollments & progress when user changes
  useEffect(() => {
    if (user) {
      loadEnrollments()
      loadProgress()
    }
  }, [user])

  const loadCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    if (data) setCourses(data)
  }

  const loadEnrollments = async () => {
    const { data } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id)
    if (data) setEnrollments(data.map(e => e.course_id))
  }

  const loadProgress = async () => {
    const { data } = await supabase.from('progress').select('module_id').eq('user_id', user.id)
    if (data) setProgress(data.map(p => p.module_id))
  }

  const loadModules = async (courseId) => {
    const { data } = await supabase.from('modules').select('*').eq('course_id', courseId).order('sort_order')
    return data || []
  }

  const handleLogin = (u) => setUser(u)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSelectedCourse(null)
    setSelectedModule(null)
    setPage('catalog')
  }

  const isEnrolled = (courseId) => enrollments.includes(courseId)

  const enroll = async (courseId) => {
    if (isEnrolled(courseId)) return
    await supabase.from('enrollments').insert({ user_id: user.id, course_id: courseId })
    setEnrollments([...enrollments, courseId])
  }

  const completeMod = async (moduleId) => {
    if (progress.includes(moduleId)) return
    await supabase.from('progress').insert({ user_id: user.id, module_id: moduleId })
    setProgress([...progress, moduleId])
  }

  const addCourse = async (form) => {
    const { data, error } = await supabase.from('courses').insert({
      title: form.title,
      description: form.description,
      category: form.category,
      level: form.level,
      duration: form.duration,
      image_url: form.image_url,
      created_by: user.id,
    }).select().single()
    if (data) {
      setCourses([data, ...courses])
      setShowCreateCourse(false)
    }
  }

  const addModule = async (mod) => {
    if (!selectedCourse) return
    const existingModules = selectedCourse.modules || []
    const { data, error } = await supabase.from('modules').insert({
      course_id: selectedCourse.id,
      title: mod.title,
      type: mod.type,
      url: mod.url || null,
      duration: mod.duration || null,
      file_name: mod.file_name || null,
      file_size: mod.file_size || null,
      content: mod.content || null,
      sort_order: existingModules.length,
    }).select().single()
    if (data) {
      const updatedModules = [...existingModules, data]
      setSelectedCourse({ ...selectedCourse, modules: updatedModules })
      setShowAddModule(false)
    }
  }

  const deleteCourse = async (courseId) => {
    await supabase.from('modules').delete().eq('course_id', courseId)
    await supabase.from('enrollments').delete().eq('course_id', courseId)
    await supabase.from('courses').delete().eq('id', courseId)
    setCourses(courses.filter(c => c.id !== courseId))
    setSelectedCourse(null)
    setSelectedModule(null)
  }

  const openCourse = async (course) => {
    const modules = await loadModules(course.id)
    setSelectedCourse({ ...course, modules })
    setSelectedModule(null)
    setPage('course-detail')
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  if (loading) return (
    <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(145deg, #f0f4f8 0%, #e8edf3 40%, #dce4ed 100%)' }}>
      <img src={logoSrc} alt="Prospectiva IA" style={{ height: 48, marginBottom: 20, opacity: 0.9 }} />
      <div style={{ color: '#6b7a8d', fontSize: 14 }}>Cargando...</div>
    </div>
  )
  if (!user) return <AuthScreen onLogin={handleLogin} />

  const categories = ['Todos', ...new Set(courses.map(c => c.category).filter(Boolean))]
  const filtered = courses.filter(c => {
    const matchSearch = (c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Todos' || c.category === filter
    return matchSearch && matchFilter
  })
  const myCourses = courses.filter(c => isEnrolled(c.id))

  const courseProgress = selectedCourse?.modules
    ? selectedCourse.modules.filter(m => progress.includes(m.id)).length / Math.max(1, selectedCourse.modules.length) * 100
    : 0

  const getModMeta = (mod) => {
    if (mod.type === 'video') return `Video · ${mod.duration || ''}`
    if (mod.type === 'slides') return `Presentación · ${mod.content?.length || 0} diapositivas`
    if (mod.type === 'download') return `Descargable · ${mod.file_size || ''}`
    if (mod.type === 'quiz') return `Evaluación · ${mod.content?.length || 0} preguntas`
    return ''
  }

  return (
    <div className="app">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-left">
          <button className="nav-brand" onClick={() => { setPage('catalog'); setSelectedCourse(null); setSelectedModule(null) }}>
            <img src={logoSrc} alt="Prospectiva IA" style={{ height: 30, width: 'auto', objectFit: 'contain' }} />
          </button>
          <div className="nav-links">
            <button className={`nav-link ${page === 'catalog' ? 'active' : ''}`} onClick={() => { setPage('catalog'); setSelectedCourse(null) }}>Catálogo</button>
            <button className={`nav-link ${page === 'my-courses' ? 'active' : ''}`} onClick={() => { setPage('my-courses'); setSelectedCourse(null) }}>Mis Cursos</button>
            <button className={`nav-link ${page === 'admin' ? 'active' : ''}`} onClick={() => { setPage('admin'); setSelectedCourse(null) }}>Administrar</button>
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-user">
            <div className="nav-avatar">{userName.charAt(0).toUpperCase()}</div>
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>{Icons.logout}</button>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="mobile-nav">
        <div className="mobile-nav-inner">
          <button className={`mobile-nav-btn ${page === 'catalog' ? 'active' : ''}`} onClick={() => { setPage('catalog'); setSelectedCourse(null) }}>{Icons.grid}<span>Catálogo</span></button>
          <button className={`mobile-nav-btn ${page === 'my-courses' ? 'active' : ''}`} onClick={() => { setPage('my-courses'); setSelectedCourse(null) }}>{Icons.book}<span>Mis Cursos</span></button>
          <button className={`mobile-nav-btn ${page === 'admin' ? 'active' : ''}`} onClick={() => { setPage('admin'); setSelectedCourse(null) }}>{Icons.edit}<span>Admin</span></button>
        </div>
      </div>

      <main className="main">
        {/* Catalog */}
        {page === 'catalog' && (
          <div className="fade-in">
            <div className="hero">
              <h1>Formación especializada<br />para auditores</h1>
              <p>Cursos interactivos sobre normas internacionales, control interno, cumplimiento y más. Avanza a tu ritmo con material actualizado.</p>
            </div>
            <div className="search-bar">
              {Icons.search}
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cursos..." />
            </div>
            <div className="filters">
              {categories.map(c => (
                <button key={c} className={`filter-chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
              ))}
            </div>
            <h3 className="section-title">{filter === 'Todos' ? 'Todos los cursos' : filter} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'var(--sans)', fontWeight: 400 }}>({filtered.length})</span></h3>
            {filtered.length === 0 ? (
              <div className="empty-state"><h3>Sin resultados</h3><p>Intenta con otra búsqueda.</p></div>
            ) : (
              <div className="courses-grid">
                {filtered.map(course => (
                  <div key={course.id} className="course-card" onClick={() => openCourse(course)}>
                    <img className="course-card-img" src={course.image_url} alt="" onError={e => { e.target.style.background = 'var(--surface-alt)' }} />
                    <div className="course-card-body">
                      <div className="course-meta">
                        <span className={`badge ${levelBadge(course.level)}`}>{course.level}</span>
                        <span className="badge badge-neutral">{course.category}</span>
                      </div>
                      <div className="course-card-title">{course.title}</div>
                      <div className="course-card-desc">{course.description}</div>
                      <div className="course-card-footer">
                        <span className="course-stat">{Icons.clock} {course.duration || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Courses */}
        {page === 'my-courses' && !selectedCourse && (
          <div className="fade-in">
            <h3 className="section-title" style={{ marginBottom: 24 }}>Mis Cursos</h3>
            {myCourses.length === 0 ? (
              <div className="empty-state">
                <h3>Aún no tienes cursos</h3>
                <p style={{ marginBottom: 20 }}>Explora el catálogo y empieza a aprender.</p>
                <button className="btn btn-accent" onClick={() => setPage('catalog')}>Ver catálogo</button>
              </div>
            ) : (
              <div className="courses-grid">
                {myCourses.map(course => (
                  <div key={course.id} className="course-card" onClick={() => openCourse(course)}>
                    <img className="course-card-img" src={course.image_url} alt="" onError={e => { e.target.style.background = 'var(--surface-alt)' }} />
                    <div className="course-card-body">
                      <div className="course-meta">
                        <span className={`badge ${levelBadge(course.level)}`}>{course.level}</span>
                      </div>
                      <div className="course-card-title">{course.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin */}
        {page === 'admin' && !selectedCourse && (
          <div className="fade-in">
            <div className="admin-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>Administrar Cursos</h3>
              <button className="btn btn-accent btn-sm" onClick={() => setShowCreateCourse(true)}>{Icons.plus} Nuevo Curso</button>
            </div>
            {courses.length === 0 ? (
              <div className="empty-state"><h3>No hay cursos</h3><p>Crea el primero.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {courses.map(course => (
                  <div key={course.id} className="module-item" style={{ cursor: 'default' }}>
                    <div style={{ flex: 1 }}>
                      <div className="module-title">{course.title}</div>
                      <div className="module-meta">{course.category} · {course.level}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => openCourse(course)}>{Icons.edit} Editar</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('¿Eliminar este curso?')) deleteCourse(course.id) }}>{Icons.trash}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Course Detail */}
        {page === 'course-detail' && selectedCourse && (
          <div className="fade-in">
            <div className="course-header">
              <img src={selectedCourse.image_url} alt="" onError={e => { e.target.style.background = 'var(--surface-alt)' }} />
              <button className="back-btn" onClick={() => { setSelectedCourse(null); setSelectedModule(null); setPage(page === 'course-detail' ? 'catalog' : page) }}>{Icons.back}</button>
              <div className="course-header-overlay">
                <h1>{selectedCourse.title}</h1>
                <p>{selectedCourse.description}</p>
              </div>
            </div>

            <div className="course-stats-bar">
              <div className="stat">{Icons.clock} {selectedCourse.duration || '—'}</div>
              <div className="stat">{Icons.book} {selectedCourse.modules?.length || 0} módulos</div>
            </div>

            {isEnrolled(selectedCourse.id) && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>Progreso</span><span style={{ fontWeight: 600 }}>{Math.round(courseProgress)}%</span>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${courseProgress}%` }} />
                </div>
              </div>
            )}

            {!isEnrolled(selectedCourse.id) && (
              <button className="btn btn-accent" onClick={() => enroll(selectedCourse.id)} style={{ marginBottom: 24, width: '100%' }}>Inscribirse en este curso</button>
            )}

            {selectedModule && <ModuleContent mod={selectedModule} onComplete={completeMod} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Contenido del curso</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModule(true)}>{Icons.plus} Módulo</button>
            </div>
            <div className="modules-list">
              {(!selectedCourse.modules || selectedCourse.modules.length === 0) && <div className="empty-state"><p>Este curso aún no tiene módulos.</p></div>}
              {selectedCourse.modules?.map(mod => (
                <div key={mod.id} className={`module-item ${selectedModule?.id === mod.id ? 'active' : ''}`}
                  onClick={() => { if (isEnrolled(selectedCourse.id)) { setSelectedModule(mod) } else { enroll(selectedCourse.id).then(() => setSelectedModule(mod)) } }}>
                  {getModIcon(mod.type)}
                  <div className="module-info">
                    <div className="module-title">{mod.title}</div>
                    <div className="module-meta">{getModMeta(mod)}</div>
                  </div>
                  <div className={`module-check ${progress.includes(mod.id) ? 'done' : ''}`}>
                    {progress.includes(mod.id) && Icons.check}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreateCourse && <CreateCourseModal onClose={() => setShowCreateCourse(false)} onSave={addCourse} />}
      {showAddModule && <AddModuleModal onClose={() => setShowAddModule(false)} onSave={addModule} />}
    </div>
  )
}
