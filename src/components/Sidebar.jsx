import { useAuth, PERMISOS } from '../context/AuthContext'

const TODOS_MODULOS = [
  { id: 'inicio',    label: 'Inicio',        shortcut: '1' },
  { id: 'algoritmo', label: 'Algoritmo',     shortcut: '2' },
  { id: 'rutas',     label: 'Rutas',         shortcut: '3' },
  { id: 'cobranzas', label: 'Cobranzas',     shortcut: '4' },
  { id: 'config',    label: 'Configuración', shortcut: '5' },
  { id: 'registros', label: 'Registros',     shortcut: '6' },
]

const ICONOS = {
  inicio:    'M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z',
  algoritmo: 'M8.5 6H15a3 3 0 010 6H9a3 3 0 000 6h6.5',
  rutas:     'M4 7h9a3 3 0 010 6H8a3 3 0 000 6h12',
  cobranzas: 'M12 7v10M14.5 9.5h-4a1.8 1.8 0 000 3.5h3a1.8 1.8 0 010 3.5h-4',
  config:    'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4',
  registros: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
}

const ROL_COLOR = { jefe: '#E1252B', asistente: '#2563EB', ti: '#9333EA' }

export default function Sidebar({ activo, onCambiar, onOpenHelp }) {
  const { usuario, logout } = useAuth()

  // Solo muestra los módulos que el rol puede ver (RNF-02)
  const modulos = TODOS_MODULOS.filter(m =>
    usuario ? (PERMISOS[usuario.rol] ?? []).includes(m.id) : false
  )

  return (
    <aside className="side" aria-label="Navegación principal">
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 3 30 29H2L16 3z" fill="#E1252B" />
          <path d="M16 12l6 12h-12l6-12z" fill="#0A1122" />
        </svg>
        <div>
          <b>ALFA</b>
          <span>DISTRIBUIDORES S.A.</span>
        </div>
      </div>

      <nav className="nav">
        {modulos.map((m) => (
          <button
            key={m.id}
            className={activo === m.id ? 'on' : ''}
            onClick={() => onCambiar(m.id)}
            aria-current={activo === m.id ? 'page' : undefined}
            title={`Ir a ${m.label} (Alt + ${m.shortcut})`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {m.id === 'cobranzas'  && <circle cx="12" cy="12" r="9" />}
              {m.id === 'algoritmo'  && <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /></>}
              {m.id === 'config'     && <circle cx="12" cy="12" r="3.5" />}
              <path d={ICONOS[m.id]} />
            </svg>
            <span>{m.label}</span>
            <span className="nav-shortcut-badge" aria-hidden="true">{m.shortcut}</span>
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <div className="opbox">
          <div className="row">
            <span>Operación del día</span>
            <span className="pill">En curso</span>
          </div>
          <small>Actualizado 08:45 a.m.</small>
        </div>

        {/* Botón de Ayuda en Sidebar (Heurística #10) */}
        <button
          type="button"
          onClick={onOpenHelp}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '7px 10px',
            borderRadius: 7,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left'
          }}
          title="Abrir Guía y Atajos de Teclado (Presiona ?)"
        >
          <span style={{ fontSize: 13 }}>❓</span>
          <span>Guía y Atajos</span>
          <kbd className="mini-kbd" style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>?</kbd>
        </button>

        {/* Usuario autenticado (RNF-02) */}
        {usuario && (
          <div className="usr">
            <div className="av" style={{ background: ROL_COLOR[usuario.rol] ?? '#0a1122' }}>
              {usuario.iniciales}
            </div>
            <div style={{ minWidth: 0 }}>
              <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {usuario.nombre}
              </b>
              <i>{usuario.titulo}</i>
            </div>
          </div>
        )}

        {/* Botón cerrar sesión */}
        <button className="logout-btn" onClick={logout} title="Cerrar sesión">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
