import { ALMACEN } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import { useDatos } from '../context/DatosContext'
import { useToast } from '../context/ToastContext'

/**
 * TopBar con visibilidad del estado del sistema (Heurística #1)
 * y acceso directo a la Guía y Atajos (Heurística #10).
 */
export default function TopBar({ titulo, subtitulo, usuario, onOpenHelp }) {
  const { logout } = useAuth()
  const { cobros, incidencias } = useDatos()
  const { toast } = useToast()
  const pendientes = cobros.filter(c => c.estado === 'pendiente').length
  const abiertas = incidencias.filter(i => ['ABIERTA','EN_REVISION'].includes(i.estado)).length
  const alertas = pendientes + abiertas

  const partesNombre = usuario?.nombre ? usuario.nombre.split(' ') : ['Usuario']
  const nombreCorto = partesNombre.length > 1
    ? `${partesNombre[0]} ${partesNombre[1][0]}.`
    : partesNombre[0]

  return (
    <header className="top" role="banner">
      <div>
        <h1>
          {titulo} <span className="dot" aria-hidden="true" />
        </h1>
        <p className="sub">{subtitulo}</p>
      </div>

      <div className="tools">
        {/* Estado del sistema en vivo (Heurística #1) */}
        <div className="ctl" title="Conexión en tiempo real activa">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>En línea</span>
        </div>

        <div className="ctl" title="Fecha operativa">📅 {new Date().toLocaleDateString('es-PE')}</div>
        <div className="ctl" title="Centro de distribución">📍 {ALMACEN}</div>

        {/* Botón de Ayuda y Heurísticas (Heurística #10) */}
        <button
          type="button"
          className="help-top-btn"
          onClick={onOpenHelp}
          title="Centro de ayuda y atajos (Presiona ?)"
          aria-label="Abrir centro de ayuda y atajos de teclado"
        >
          <span style={{ fontSize: 14 }}>❓</span>
          <span>Ayuda / Atajos</span>
          <kbd className="mini-kbd" style={{ marginLeft: 2 }}>?</kbd>
        </button>

        <button type="button" className="ctl" onClick={logout}>Cerrar sesión</button>

        <button type="button" className="bell" title={`${alertas} alertas operativas`} aria-label={`${alertas} alertas operativas`} onClick={() => toast.info(`${pendientes} cobros pendientes y ${abiertas} incidencias abiertas.`)}>
          {alertas > 0 && <span className="bdg">{alertas}</span>}<span aria-hidden="true">🔔</span>
        </button>
        {/* Perfil */}
        <div className="ctl" title={`${usuario?.nombre ?? 'Usuario'} (${usuario?.titulo ?? ''})`}>
          <span className="av" style={{ width: 24, height: 24, fontSize: 10 }}>{usuario?.iniciales ?? 'U'}</span>
          <span style={{ fontWeight: 600 }}>{nombreCorto}</span>
        </div>
      </div>
    </header>
  )
}
