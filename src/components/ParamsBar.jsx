import { FECHA } from '../data/mock'

export default function ParamsBar({ criterio, setCriterio, turno, setTurno, jornadaMax, setJornadaMax, onEditarReglas }) {
  return (
    <div className="card">
      <div className="params">
        <div>
          <span className="lbl">Fecha de reparto</span>
          <div className="fld">{FECHA} <span style={{ color: '#94A3B8' }}>📅</span></div>
        </div>

        <div>
          <span className="lbl">Salida del almacén</span>
          <div className="fld">08:00 <span style={{ color: '#94A3B8' }}>🕐</span></div>
        </div>

        <div>
          <span className="lbl">Jornada máxima</span>
          <div className="fld">
            <select
              value={jornadaMax}
              onChange={(e) => setJornadaMax(Number(e.target.value))}
              style={{ border: 0, font: 'inherit', background: 'none', width: '100%', cursor: 'pointer' }}
            >
              <option value={7}>7 h 00 m</option>
              <option value={8}>8 h 00 m</option>
              <option value={9}>9 h 00 m</option>
              <option value={10}>10 h 00 m</option>
            </select>
          </div>
        </div>

        <div>
          <span className="lbl">Criterio</span>
          <div className="seg">
            <button className={criterio === 'jornada' ? 'on' : ''} onClick={() => setCriterio('jornada')}>
              Balancear jornada
            </button>
            <button className={criterio === 'distancia' ? 'on' : ''} onClick={() => setCriterio('distancia')}>
              Menor distancia
            </button>
          </div>
        </div>

        <div>
          <span className="lbl">Turno</span>
          <div className="seg g">
            <button className={turno === 'dia' ? 'on' : ''} onClick={() => setTurno('dia')}>Día</button>
            <button className={turno === 'noche' ? 'on' : ''} onClick={() => setTurno('noche')}>Noche</button>
          </div>
        </div>

        <div>
          <span className="lbl">Reglas por cliente</span>
          <div className="fld">
            <span>12 activas</span>
            <button
              type="button"
              onClick={onEditarReglas}
              style={{ color: 'var(--blue)', fontWeight: 600, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
              title="Ir a configuración de reglas por cliente"
            >
              Editar
            </button>
          </div>
        </div>

        <div className="matrix">
          <b>Matriz OSRM lista</b>
          <i><span className="ok" />Calculada 08:45 a.m.</i>
        </div>
      </div>
    </div>
  )
}
