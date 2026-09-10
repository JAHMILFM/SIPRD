import { FECHA, ALMACEN } from '../data/mock'

export default function TopBar({ titulo, subtitulo }) {
  return (
    <div className="top">
      <div>
        <h1>
          {titulo} <span className="dot" />
        </h1>
        <p className="sub">{subtitulo}</p>
      </div>
      <div className="tools">
        <div className="ctl">📅 {FECHA}</div>
        <div className="ctl">📍 {ALMACEN}</div>
        <div className="bell">
          <span className="bdg">8</span>🔔
        </div>
        <div className="ctl">
          <span className="av" style={{ width: 22, height: 22, fontSize: 9 }}>DH</span> Dennys H.
        </div>
      </div>
    </div>
  )
}
