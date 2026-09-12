import { FECHA, ALMACEN } from '../data/mock'

/**
 * TopBar con visibilidad del estado del sistema (Heurística #1)
 * y acceso directo a la Guía y Atajos (Heurística #10).
 */
export default function TopBar({ titulo, subtitulo, usuario, onOpenHelp }) {
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

        <div className="ctl" title="Fecha operativa">📅 {FECHA}</div>
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

        {/* Notificaciones */}
        <div className="bell" title="8 alertas operativas pendientes" tabIndex={0} role="button" aria-label="8 notificaciones">
          <span className="bdg">8</span>
          <span aria-hidden="true">🔔</span>
        </div>

        {/* Perfil */}
        <div className="ctl" title={`${usuario?.nombre} (${usuario?.titulo})`}>
          <span className="av" style={{ width: 24, height: 24, fontSize: 10 }}>{usuario?.iniciales}</span>
          <span style={{ fontWeight: 600 }}>{usuario?.nombre?.split(' ')[0]} {usuario?.nombre?.split(' ')[1]?.[0]}.</span>
        </div>
      </div>
    </header>
  )
}
