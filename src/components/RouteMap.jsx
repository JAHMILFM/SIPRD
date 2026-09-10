import { hhmm } from '../lib/planner'

// Mapa esquemático. En producción se sustituye por react-leaflet + OpenStreetMap
// y las polilíneas vienen de la geometría que devuelve OSRM; la forma de los
// datos (una lista de rutas con color y paradas) no cambia.

const DEPOT = { x: 232, y: 300 }

const TRAZOS = [
  'M232 300 210 240 195 175 205 110 240 70',
  'M232 300 175 265 130 210 108 150 120 95',
  'M232 300 285 268 330 215 355 160 340 105',
  'M232 300 195 340 150 375 120 415 128 462',
  'M232 300 288 322 335 360 362 405 348 458',
  'M232 300 250 355 268 410 250 460 210 490',
  'M232 300 160 315 100 340 70 385 78 430',
]

const NODOS = [
  [[240, 70], [195, 175]],
  [[120, 95], [130, 210]],
  [[340, 105], [330, 215]],
  [[128, 462], [150, 375]],
  [[348, 458], [335, 360]],
  [[210, 490], [268, 410]],
  [[78, 430], [100, 340]],
]

const DISTRITOS = [
  ['COMAS', 150, 52], ['CARABAYLLO', 290, 52],
  ['LOS OLIVOS', 106, 150], ['SAN JUAN DE LURIGANCHO', 300, 165],
  ['LIMA', 150, 268], ['EL AGUSTINO', 300, 292],
  ['CHORRILLOS', 104, 382], ['SANTA ANITA', 300, 398],
  ['VILLA EL SALVADOR', 146, 470],
]

export default function RouteMap({ plan }) {
  return (
    <div className="card maph">
      <svg viewBox="0 0 460 520" style={{ width: '100%', display: 'block', borderRadius: 11 }} role="img"
           aria-label={`Mapa con ${plan.rutas.length} rutas planificadas desde el almacén de Lurín`}>
        <rect width="460" height="520" fill="#EEF1F5" />
        <path d="M0 0h74v520H0z" fill="#DDE6EE" />
        <path d="M74 0c14 90 6 180 22 262 14 74 2 168 12 258H74z" fill="#DDE6EE" />

        <g stroke="#E3E7EC" strokeWidth="1">
          <path d="M90 90h370M90 200h370M90 310h370M90 420h370M160 20v490M260 20v490M360 20v490" />
        </g>

        <g fill="#9AA5B4" fontSize="9" letterSpacing=".4">
          {DISTRITOS.map(([n, x, y]) => <text key={n} x={x} y={y}>{n}</text>)}
        </g>

        <g fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {plan.rutas.map((r, i) => (
            <path key={r.id} d={TRAZOS[i % TRAZOS.length]} stroke={r.color} />
          ))}
        </g>

        <g fontSize="8.5" fontWeight="700" textAnchor="middle" fill="#fff">
          {plan.rutas.map((r, i) => {
            const par = NODOS[i % NODOS.length]
            const mitad = Math.ceil(r.pedidos.length / 2)
            return par.map(([x, y], j) => (
              <g key={`${r.id}-${j}`}>
                <circle cx={x} cy={y} r="9" fill={r.color} />
                <text x={x} y={y + 3}>{j === 0 ? r.pedidos.length : mitad}</text>
              </g>
            ))
          })}
        </g>

        <circle cx={DEPOT.x} cy={DEPOT.y} r="13" fill="#0A1122" />
        <path d="M226 302l6-6 6 6v6h-4v-4h-4v4h-4z" fill="#fff" />
        <text x={DEPOT.x} y={DEPOT.y + 28} fontSize="8.5" fontWeight="600" fill="#475569" textAnchor="middle">
          ALMACÉN LURÍN
        </text>
      </svg>

      <div className="mapbtn">◈ Ver capas</div>

      <div className="legend">
        <b>Rutas del escenario</b>
        {plan.rutas.map((r) => (
          <div key={r.id}>
            <span className="sw" style={{ background: r.color }} />
            {r.id} · {r.pedidos.length} pedidos · {hhmm(r.minutos)}
          </div>
        ))}
      </div>
    </div>
  )
}
