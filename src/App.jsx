import { useMemo, useState } from 'react'
import './App.css'

const USERS_KEY = 'organiza.users'
const SESSION_KEY = 'organiza.session'
const TASKS_KEY = 'organiza.tasks'
const columns = [
  { id: 'pendiente', label: 'Por hacer', color: 'violet' },
  { id: 'progreso', label: 'En progreso', color: 'blue' },
  { id: 'completada', label: 'Completadas', color: 'green' },
]
const priorities = {
  alta: { label: 'Alta', color: 'high' },
  media: { label: 'Media', color: 'medium' },
  baja: { label: 'Baja', color: 'low' },
}

function readStorage(key, fallback) {
  const value = localStorage.getItem(key)
  return value ? JSON.parse(value) : fallback
}

function tasksKey(email) {
  return `${TASKS_KEY}.${email}`
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

async function hashPassword(password, salt) {
  const value = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', value)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function Icon({ name, size = 18 }) {
  const shared = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  }
  return <svg {...shared}>{paths[name]}</svg>
}

function App() {
  const [user, setUser] = useState(() => localStorage.getItem(SESSION_KEY))
  const [tasks, setTasks] = useState(() => {
    const email = localStorage.getItem(SESSION_KEY)
    return email ? readStorage(tasksKey(email), []) : []
  })
  const [authMode, setAuthMode] = useState('login')
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')
  const [priorityFilter, setPriorityFilter] = useState('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [formError, setFormError] = useState('')
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'media',
    status: 'pendiente',
  })

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return tasks.filter((task) => {
      const matchesSearch =
        !term ||
        `${task.title} ${task.description}`.toLocaleLowerCase('es').includes(term)
      const matchesStatus =
        statusFilter === 'todas' || task.status === statusFilter
      const matchesPriority =
        priorityFilter === 'todas' || task.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tasks, search, statusFilter, priorityFilter])

  const completedCount = tasks.filter((task) => task.status === 'completada').length
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const firstName = user?.split('@')[0] || ''
  const displayName =
    user === 'demo@organiza.local'
      ? 'Invitado'
      : readStorage(USERS_KEY, []).find((account) => account.email === user)?.name ||
        firstName

  function persistTasks(nextTasks) {
    localStorage.setItem(tasksKey(user), JSON.stringify(nextTasks))
    setTasks(nextTasks)
  }

  function openCreateModal() {
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      dueDate: '',
      priority: 'media',
      status: 'pendiente',
    })
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(task) {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
    })
    setFormError('')
    setModalOpen(true)
  }

  function saveTask(event) {
    event.preventDefault()
    const title = taskForm.title.trim()
    if (!title) {
      setFormError('Escribe un título para tu tarea.')
      return
    }

    const task = {
      ...taskForm,
      title,
      description: taskForm.description.trim(),
      id: editingTask?.id || crypto.randomUUID(),
      createdAt: editingTask?.createdAt || new Date().toISOString(),
    }
    const nextTasks = editingTask
      ? tasks.map((item) => (item.id === editingTask.id ? task : item))
      : [task, ...tasks]
    persistTasks(nextTasks)
    setModalOpen(false)
  }

  function changeStatus(task, status) {
    persistTasks(
      tasks.map((item) => (item.id === task.id ? { ...item, status } : item)),
    )
  }

  function deleteTask(task) {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return
    persistTasks(tasks.filter((item) => item.id !== task.id))
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setTasks([])
    setSearch('')
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthError('')
    const email = authData.email.trim().toLowerCase()
    const password = authData.password
    if (!email || !password) {
      setAuthError('Completa el correo y la contraseña.')
      return
    }

    try {
      const users = readStorage(USERS_KEY, [])
      if (authMode === 'register') {
        if (authData.name.trim().length < 2) {
          setAuthError('Escribe tu nombre para crear la cuenta.')
          return
        }
        if (password.length < 8) {
          setAuthError('La contraseña debe tener al menos 8 caracteres.')
          return
        }
        if (users.some((account) => account.email === email)) {
          setAuthError('Ya existe una cuenta con ese correo.')
          return
        }
        const salt = crypto.randomUUID()
        users.push({
          email,
          name: authData.name.trim(),
          salt,
          passwordHash: await hashPassword(password, salt),
        })
        localStorage.setItem(USERS_KEY, JSON.stringify(users))
        setAuthMode('login')
      } else {
        const account = users.find((item) => item.email === email)
        const passwordHash = account
          ? await hashPassword(password, account.salt)
          : ''
        if (!account || account.passwordHash !== passwordHash) {
          setAuthError('Correo o contraseña incorrectos.')
          return
        }
      }

      localStorage.setItem(SESSION_KEY, email)
      setUser(email)
      setTasks(readStorage(tasksKey(email), []))
      setAuthData({ name: '', email: '', password: '' })
    } catch {
      setAuthError(
        'No fue posible completar el acceso en este navegador. Revisa el almacenamiento y vuelve a intentarlo.',
      )
    }
  }

  function enterDemo() {
    const email = 'demo@organiza.local'
    const sampleTasks = [
      {
        id: 'sample-1',
        title: 'Planear la semana',
        description: 'Definir prioridades y organizar las actividades importantes.',
        dueDate: new Date().toISOString().slice(0, 10),
        priority: 'alta',
        status: 'pendiente',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sample-2',
        title: 'Revisar material del curso',
        description: 'Leer el recurso de herramientas frontend y tomar apuntes.',
        dueDate: '',
        priority: 'media',
        status: 'progreso',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sample-3',
        title: 'Enviar propuesta de proyecto',
        description: 'Compartir el avance con el equipo de trabajo.',
        dueDate: '',
        priority: 'baja',
        status: 'completada',
        createdAt: new Date().toISOString(),
      },
    ]
    if (!localStorage.getItem(tasksKey(email))) {
      localStorage.setItem(tasksKey(email), JSON.stringify(sampleTasks))
    }
    localStorage.setItem(SESSION_KEY, email)
    setUser(email)
    setTasks(readStorage(tasksKey(email), sampleTasks))
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-intro">
          <a className="brand" href="#" aria-label="Organiza, inicio">
            <span className="brand-mark"><Icon name="check" size={19} /></span>
            <span>organiza<span className="brand-period">.</span></span>
          </a>
          <div className="auth-copy">
            <p className="eyebrow">Tu espacio, tu ritmo</p>
            <h1>Un día más claro empieza con una lista.</h1>
            <p>Reúne tus pendientes, enfócate en lo importante y celebra cada avance.</p>
            <div className="auth-note"><Icon name="sparkles" /><span>Pequeños pasos. Grandes logros.</span></div>
          </div>
          <p className="auth-footer">Organiza tus ideas. Haz que sucedan.</p>
        </section>
        <section className="auth-panel">
          <form className="auth-form" onSubmit={submitAuth}>
            <div className="mobile-brand"><span className="brand-mark"><Icon name="check" size={19} /></span> organiza<span className="brand-period">.</span></div>
            <p className="eyebrow">{authMode === 'login' ? 'Qué bueno verte' : 'Empieza hoy'}</p>
            <h2>{authMode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
            <p className="form-subtitle">
              {authMode === 'login'
                ? 'Accede a tus tareas y continúa donde te quedaste.'
                : 'Solo necesitas unos datos para comenzar.'}
            </p>
            {authMode === 'register' && (
              <label className="field">
                <span>Nombre</span>
                <input
                  autoComplete="name"
                  value={authData.name}
                  onChange={(event) => setAuthData({ ...authData, name: event.target.value })}
                  placeholder="Tu nombre"
                  required
                />
              </label>
            )}
            <label className="field">
              <span>Correo electrónico</span>
              <input
                type="email"
                autoComplete="email"
                value={authData.email}
                onChange={(event) => setAuthData({ ...authData, email: event.target.value })}
                placeholder="nombre@correo.com"
                required
              />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <input
                type="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                value={authData.password}
                onChange={(event) => setAuthData({ ...authData, password: event.target.value })}
                placeholder={authMode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                required
              />
            </label>
            {authError && <p className="inline-error" role="alert">{authError}</p>}
            <button className="button button-primary auth-submit" type="submit">
              {authMode === 'login' ? 'Entrar a mi espacio' : 'Crear cuenta'}
            </button>
            <p className="auth-switch">
              {authMode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setAuthError('')
                }}
              >
                {authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
            <div className="demo-divider"><span>o explora primero</span></div>
            <button className="button button-secondary demo-button" type="button" onClick={enterDemo}>
              Probar con datos de ejemplo
            </button>
            <p className="demo-caption">Modo demostración local. No uses contraseñas reales.</p>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Organiza, inicio">
          <span className="brand-mark"><Icon name="check" size={19} /></span>
          <span>organiza<span className="brand-period">.</span></span>
        </a>
        <div className="sidebar-label">ESPACIO DE TRABAJO</div>
        <button className="nav-item active" type="button">
          <span className="nav-dot" /> Mis tareas
        </button>
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">{firstName.slice(0, 1).toUpperCase()}</div>
            <div className="profile-details"><strong>{displayName}</strong><span>Mi espacio personal</span></div>
            <button className="icon-button logout-button" title="Cerrar sesión" aria-label="Cerrar sesión" type="button" onClick={logout}>
              <Icon name="logout" />
            </button>
          </div>
          <p className="storage-note">Los datos se guardan en este navegador.</p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <p>Mi espacio <span>/</span> <strong>Tareas</strong></p>
          <button className="button button-primary topbar-add" type="button" onClick={openCreateModal}>
            <Icon name="plus" /> Nueva tarea
          </button>
        </header>
        <div className="content">
          <section className="welcome">
            <div>
              <p className="eyebrow">PANEL DE TAREAS</p>
              <h1>Hola, {displayName} <span className="wave">✦</span></h1>
              <p className="welcome-copy">Un paso a la vez. Esto es lo que tienes en marcha.</p>
            </div>
            <div className="progress-card">
              <div className="progress-copy"><span>Progreso total</span><strong>{progress}%</strong></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <p>{completedCount} de {tasks.length} tareas completadas</p>
            </div>
          </section>

          <section className="toolbar" aria-label="Buscar y filtrar tareas">
            <label className="search-field">
              <Icon name="search" />
              <input
                type="search"
                aria-label="Buscar tareas"
                placeholder="Buscar por título o descripción..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="select-field">
              <span>Estado</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="todas">Todos</option>
                {columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
              </select>
            </label>
            <label className="select-field">
              <span>Prioridad</span>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="todas">Todas</option>
                {Object.entries(priorities).map(([id, priority]) => <option key={id} value={id}>{priority.label}</option>)}
              </select>
            </label>
          </section>

          <section className="board" aria-label="Tablero de tareas">
            {columns.map((column) => {
              const columnTasks = visibleTasks.filter((task) => task.status === column.id)
              return (
                <section className="task-column" key={column.id} aria-labelledby={`column-${column.id}`}>
                  <header className="column-heading">
                    <div className={`column-dot ${column.color}`} />
                    <h2 id={`column-${column.id}`}>{column.label}</h2>
                    <span className="task-count">{columnTasks.length}</span>
                    {column.id === 'pendiente' && (
                      <button className="icon-button column-add" type="button" onClick={openCreateModal} aria-label="Agregar tarea">
                        <Icon name="plus" size={17} />
                      </button>
                    )}
                  </header>
                  <div className="task-list">
                    {columnTasks.map((task) => (
                      <article className={`task-card ${task.status === 'completada' ? 'is-completed' : ''}`} key={task.id}>
                        <div className="task-card-top">
                          <span className={`priority-badge ${priorities[task.priority]?.color || 'medium'}`}>
                            <span /> {priorities[task.priority]?.label || 'Media'}
                          </span>
                          <div className="task-actions">
                            <button className="icon-button" type="button" title="Editar tarea" aria-label={`Editar ${task.title}`} onClick={() => openEditModal(task)}><Icon name="edit" size={16} /></button>
                            <button className="icon-button danger-action" type="button" title="Eliminar tarea" aria-label={`Eliminar ${task.title}`} onClick={() => deleteTask(task)}><Icon name="trash" size={16} /></button>
                          </div>
                        </div>
                        <h3>{task.title}</h3>
                        {task.description && <p className="task-description">{task.description}</p>}
                        <div className="task-card-footer">
                          <span className="due-date"><Icon name="calendar" size={15} />{formatDate(task.dueDate)}</span>
                          {task.status !== 'completada' ? (
                            <button
                              className="complete-button"
                              type="button"
                              onClick={() => changeStatus(task, 'completada')}
                              title="Marcar como completada"
                            >
                              <Icon name="check" size={15} />
                            </button>
                          ) : (
                            <button className="reopen-button" type="button" onClick={() => changeStatus(task, 'pendiente')}>Reabrir</button>
                          )}
                        </div>
                        <label className="status-control">
                          <span>Mover a</span>
                          <select
                            aria-label={`Cambiar estado de ${task.title}`}
                            value={task.status}
                            onChange={(event) => changeStatus(task, event.target.value)}
                          >
                            {columns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                          </select>
                        </label>
                      </article>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="column-empty">
                        <span className={`empty-mark ${column.color}`}><Icon name={column.id === 'completada' ? 'check' : 'plus'} size={17} /></span>
                        <p>{tasks.length === 0 ? 'Aquí aparecerán tus tareas.' : 'No hay tareas en esta sección.'}</p>
                      </div>
                    )}
                    {column.id === 'pendiente' && (
                      <button className="add-task-card" type="button" onClick={openCreateModal}><Icon name="plus" size={16} /> Añadir una tarea</button>
                    )}
                  </div>
                </section>
              )
            })}
          </section>
          {visibleTasks.length === 0 && tasks.length > 0 && (
            <div className="search-empty">No encontramos tareas. Prueba con otros términos o filtros.</div>
          )}
          <footer className="page-footer"><span>Hecho para avanzar, no para correr.</span><span>{visibleTasks.length} {visibleTasks.length === 1 ? 'tarea' : 'tareas'}</span></footer>
        </div>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModalOpen(false)
        }}>
          <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <header className="modal-header">
              <div><p className="eyebrow">{editingTask ? 'ACTUALIZA TU PLAN' : 'UN NUEVO COMIENZO'}</p><h2 id="modal-title">{editingTask ? 'Editar tarea' : 'Crear una tarea'}</h2></div>
              <button className="icon-button modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar"><Icon name="close" /></button>
            </header>
            <form onSubmit={saveTask}>
              <label className="field">
                <span>Título <em>*</em></span>
                <input
                  autoFocus
                  maxLength={100}
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  placeholder="¿Qué necesitas hacer?"
                  required
                />
              </label>
              <label className="field">
                <span>Descripción <small>Opcional</small></span>
                <textarea
                  rows="3"
                  maxLength={500}
                  value={taskForm.description}
                  onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                  placeholder="Agrega algunos detalles..."
                />
              </label>
              <div className="form-row">
                <label className="field">
                  <span>Fecha de vencimiento</span>
                  <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} />
                </label>
                <label className="field">
                  <span>Prioridad</span>
                  <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                    {Object.entries(priorities).map(([id, priority]) => <option key={id} value={id}>{priority.label}</option>)}
                  </select>
                </label>
              </div>
              {editingTask && (
                <label className="field">
                  <span>Estado</span>
                  <select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}>
                    {columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
                  </select>
                </label>
              )}
              {formError && <p className="inline-error" role="alert">{formError}</p>}
              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="button button-primary" type="submit">{editingTask ? 'Guardar cambios' : 'Crear tarea'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
