import { hhmm } from '../lib/planner'

/**
 * Carga y jornada por camión.
 *
 * Es el panel que pidió el cliente en la reunión: número de paradas y horas
 * estimadas por vehículo, para detectar de un vistazo cuál está saturado y cuál
 * tiene holgura antes de enviar el plan.
 */
export default function TruckStats({ plan, jornadaMax }) {
  const limite = jornadaMax * 60
  const rutas = plan.rutas

  const total = rutas.reduce((s, r) => s + r.pedidos.length, 0)
  const promedio = rutas.length ? rutas.reduce((s, r) => s + r.minutos, 0) / rutas.length : 0

  const holgada = rutas.reduce((a, b) => (a && a.minutos < b.minutos ? a : b), null)
  const cargada = rutas.reduce((a, b) => (a && a.minutos > b.minutos ? a : b), null)
  const sugerencia =
    holgada && cargada && cargada.minutos - holgada.minutos > 90
      ? `${holgada.id} tiene ${hhmm(limite - holgada.minutos)} libres. Puedes moverle paradas desde ${cargada.id} antes de enviar.`
      : 'La carga está pareja entre los camiones del escenario.'

  const barra = (usado, max, tono) => {
    const pct = Math.min(100, (usado / max) * 100)
    const color = pct >= 92 ? '#DC2626' : pct >= 80 ? '#F59E0B' : pct < 45 ? '#94A3B8' : tono
    return (
      <>
        <span className="mini"><i style={{ width: `${pct}%`, background: color }} /></span>
        {usado.toFixed(1)} · {Math.round(pct)}%
      </>
    )
  }

  return (
    <div className="card stats">
      <div className="ch">
        <div>
          <h3>Carga y jornada por camión</h3>
          <p>Revisa que ningún camión pase de {jornadaMax} horas ni supere su capacidad antes de enviar el plan.</p>
        </div>
        <div className="btns">
          <button className="btn out">⇩ Exportar tabla</button>
        </div>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>VEHÍCULO</th><th>CONDUCTOR</th>
              <th className="num">PARADAS</th><th className="num">DISTANCIA</th><th>JORNADA ESTIMADA</th>
              <th>PESO USADO (t)</th><th>VOLUMEN USADO (m³)</th><th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {rutas.map((r) => {
              const pctPeso = (r.peso / r.vehiculo.pesoMax) * 100
              const excede = r.minutos > limite
              const holgado = r.minutos < limite * 0.75
              const estado = excede
                ? <span className="chip c-hi">Excede jornada</span>
                : pctPeso >= 92
                ? <span className="chip c-md">Al límite de peso</span>
                : holgado
                ? <span className="chip c-md">Con holgura</span>
                : <span className="chip c-gn">Óptimo</span>

              return (
                <tr key={r.id}>
                  <td className="veh">
                    <b><span className="rt" style={{ background: r.color }}>{r.id}</span> {r.vehiculo.placa}</b>
                    <i>{r.vehiculo.marca} · {r.vehiculo.pesoMax} t / {r.vehiculo.volMax} m³</i>
                  </td>
                  <td>{r.vehiculo.conductor}</td>
                  <td className="num">{r.pedidos.length}</td>
                  <td className="num">{r.km.toFixed(1)} km</td>
                  <td>
                    <span className={`jor ${excede ? 'over' : holgado ? 'low' : ''}`}>{hhmm(r.minutos)}</span>
                  </td>
                  <td>{barra(r.peso, r.vehiculo.pesoMax, '#16A34A')}</td>
                  <td>{barra(r.vol, r.vehiculo.volMax, '#2563EB')}</td>
                  <td>{estado}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="foot">
        <span>
          {rutas.length} rutas · {total} paradas · {plan.kmTotal.toFixed(1)} km · jornada promedio {hhmm(promedio)}
        </span>
        <span style={{ color: '#B45309' }}>{sugerencia}</span>
      </div>
    </div>
  )
}
