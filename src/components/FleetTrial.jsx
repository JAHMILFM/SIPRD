import { hhmm } from '../lib/planner'

/**
 * Tanteo de flota.
 *
 * Reproduce lo que hoy hace el asistente de distribución a mano: probar con 3,
 * 4, 5 o 6 vehículos y comparar la jornada resultante antes de decidir cuántos
 * carros salen. La diferencia es que aquí ve los escenarios lado a lado en vez
 * de recordar el anterior.
 */
export default function FleetTrial({
  escenarios,
  seleccion,
  onSeleccionar,
  onAgregar,
  onRecalcular,
  calculando,
  jornadaMax,
  totalPedidos,
}) {
  const limite = jornadaMax * 60
  const peor = Math.max(...escenarios.map((e) => e.jornadaMax))
  const viables = escenarios.filter((e) => e.sinAsignar.length === 0 && e.jornadaMax <= limite)
  const recomendado = viables.length ? viables.reduce((a, b) => (a.n <= b.n ? a : b)).n : null
  const actual = escenarios.find((e) => e.n === seleccion)

  return (
    <section className="fleet">
      <div className="fleet-h">
        <div>
          <h3>Tanteo de flota</h3>
          <p>
            Elige cuántos vehículos salen hoy. El sistema reparte los {totalPedidos} pedidos y calcula
            la jornada de cada camión para que puedas comparar antes de decidir.
          </p>
        </div>
        <div className="btns">
          <button className="btn ghost" onClick={onAgregar}>Añadir escenario</button>
          <button className="btn blue" onClick={onRecalcular} disabled={calculando}>
            {calculando ? 'Optimizando…' : '▶ Recalcular'}
          </button>
        </div>
      </div>

      <div className="scn">
        {escenarios.map((e) => {
          const excede = e.jornadaMax > limite || e.sinAsignar.length > 0
          const clases = ['s', e.n === seleccion ? 'on' : '', excede ? 'bad' : ''].filter(Boolean).join(' ')
          const color = excede ? '#DC2626' : e.n === recomendado ? '#3B82F6' : '#16A34A'
          return (
            <button
              key={e.n}
              className={clases}
              onClick={() => onSeleccionar(e.n)}
              aria-pressed={e.n === seleccion}
            >
              {excede && <span className="tag r">Saturado</span>}
              {!excede && e.n === recomendado && <span className="tag b">Recomendado</span>}

              <div className="s-n">
                <b>{e.n}</b>
                <span>{e.n === 1 ? 'vehículo' : 'vehículos'}</span>
              </div>
              <div className="m"><span>Jornada máx.</span><b>{hhmm(e.jornadaMax)}</b></div>
              <div className="m"><span>Sin asignar</span><b>{e.sinAsignar.length} pedidos</b></div>
              <div className="m"><span>Distancia</span><b>{e.kmTotal.toFixed(1)} km</b></div>
              <div className="bar">
                <i style={{ width: `${Math.min(100, (e.jornadaMax / peor) * 100)}%`, background: color }} />
              </div>
            </button>
          )
        })}

        <button className="s" style={{ opacity: 0.5, display: 'grid', placeItems: 'center' }} onClick={onAgregar}>
          <div style={{ textAlign: 'center', color: '#8792A8' }}>
            <div style={{ fontSize: 20, lineHeight: 1 }}>＋</div>
            <div style={{ fontSize: 10.5, marginTop: 5 }}>
              Probar con {Math.max(...escenarios.map((e) => e.n)) + 1}
            </div>
          </div>
        </button>
      </div>

      {actual && (
        <div className="fleet-f">
          <p>
            Escenario aplicado: <b>{actual.n} vehículos</b> · {actual.rutas.reduce((s, r) => s + r.pedidos.length, 0)} pedidos
            repartidos en <b>{actual.rutas.length} rutas</b> · balance de carga <b>{actual.balance}%</b> · jornada más corta{' '}
            <b>{hhmm(actual.jornadaMin)}</b>
          </p>
        </div>
      )}
    </section>
  )
}
