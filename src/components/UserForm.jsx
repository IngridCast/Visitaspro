import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api.js'

// Hoja inferior (en celular) para crear o editar un usuario.
// `user` es null al crear uno nuevo.
function UserForm({ user, currentUserId, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const creating = user === null
  const isSelf = user?.id === currentUserId

  const [form, setForm] = useState({
    username: user?.username ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'user',
    active: user?.active ?? true,
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current.showModal()
  }, [])

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = {
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
        password: form.password,
      }
      const { user: saved } = creating
        ? await apiFetch('/users', { method: 'POST', body: { ...body, username: form.username } })
        : await apiFetch(`/users/${user.id}`, { method: 'PATCH', body })
      onSaved(saved)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="sheet" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <h2>{creating ? 'Nuevo usuario' : 'Editar usuario'}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="sheet-body">
          <label>
            Usuario
            <input
              value={form.username}
              onChange={set('username')}
              disabled={!creating}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              required
            />
          </label>
          <label>
            Nombre completo
            <input value={form.name} onChange={set('name')} autoComplete="off" required />
          </label>
          <label>
            Correo (opcional)
            <input
              type="email"
              inputMode="email"
              value={form.email}
              onChange={set('email')}
              autoCapitalize="none"
              autoComplete="off"
            />
          </label>
          <label>
            {creating ? 'Contraseña' : 'Nueva contraseña'}
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                minLength={8}
                required={creating}
                placeholder={creating ? 'Mínimo 8 caracteres' : 'Dejar vacío para no cambiarla'}
              />
              <button
                type="button"
                className="secondary"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          <label>
            Rol
            <select value={form.role} onChange={set('role')} disabled={isSelf}>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </label>

          {!creating && (
            <label className="switch">
              <input
                type="checkbox"
                checked={form.active}
                onChange={set('active')}
                disabled={isSelf}
              />
              <span>Usuario activo</span>
            </label>
          )}
          {isSelf && <p className="hint">No puedes cambiar tu propio rol ni desactivarte.</p>}

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="sheet-footer">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

export default UserForm
