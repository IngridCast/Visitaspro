import { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import { useAuth } from '../auth/useAuth.js'
import UserForm from './UserForm.jsx'

function initials(name) {
  return (name ?? '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  // undefined = formulario cerrado, null = nuevo usuario, objeto = editar
  const [editing, setEditing] = useState(undefined)

  useEffect(() => {
    apiFetch('/users')
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (saved) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === saved.id)
      const next = exists ? prev.map((u) => (u.id === saved.id ? saved : u)) : [...prev, saved]
      return next.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    })
    setEditing(undefined)
  }

  const term = search.trim().toLowerCase()
  const visible = term
    ? users.filter((u) =>
        [u.name, u.username, u.email].some((v) => v?.toLowerCase().includes(term)),
      )
    : users

  return (
    <section className="users-page">
      <div className="page-title">
        <h1>Usuarios</h1>
        {!loading && !error && <span className="count">{users.length}</span>}
      </div>

      <input
        type="search"
        className="search"
        placeholder="Buscar por nombre, usuario o correo"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="hint">Cargando…</p>}
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && visible.length === 0 && (
        <p className="hint">No se encontraron usuarios.</p>
      )}

      <ul className="user-list">
        {visible.map((u) => (
          <li key={u.id}>
            <button type="button" className="user-card" onClick={() => setEditing(u)}>
              <span className={`avatar ${u.active ? '' : 'inactive'}`}>{initials(u.name)}</span>
              <span className="user-info">
                <strong>{u.name}</strong>
                <small>
                  @{u.username}
                  {u.email && ` · ${u.email}`}
                </small>
              </span>
              <span className="badges">
                {u.role === 'admin' && <span className="badge admin">Admin</span>}
                {!u.active && <span className="badge off">Inactivo</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="fab"
        onClick={() => setEditing(null)}
        aria-label="Nuevo usuario"
      >
        +
      </button>

      {editing !== undefined && (
        <UserForm
          user={editing}
          currentUserId={currentUser.id}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}

export default UsersPage
