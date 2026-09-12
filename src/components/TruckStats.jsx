import { hhmm } from '../lib/planner'
import { useToast } from '../context/ToastContext'

/**
 * Carga y jornada por camión.
 *
 * Muestra la distribución de carga y horas por vehículo.
 * Incluye exportación a CSV para reportes de despacho (Heurística #7).
 */
export default function TruckStats({ plan, jornadaMax }) {
  const { toast } = useToast()
  const limite = jornadaMax * 60
  const rutas = plan.rutas

  const total = rutas.reduce((s, r) => s + r.pedidos.length, 0)
  const promedio = rutas.length ? rutas.reduce((s, r) => s + r.minutos, 0) / rutas.length : 0

  const holgada = rutas.reduce((a, b) => (a && a.minutos < b.minutos ? a : b), null)
  const cargada = rutas.reduce((a, b) => (a && a.minutos > b.minutos ? a : b), null)
  const sugerencia =
    holgada && cargada && cargada.minutos - holgada.minutos > 90
      ? `${holgada.id} tiene ${hhmm(limite - holgada.minutos)} libres. Puedes moverle paradas desde ${cargada.id} antes de enviar.`
      : 'La carga está distribuida de forma equilibrada entre los camiones del escenario.'

  const exportarCSV = () => {
    try {
      const headers = ['Ruta', 'Placa', 'Marca', 'Conductor', 'Paradas', 'Distancia_km', 'Jornada_hhmm', 'Peso_usado_t', 'Peso_max_t', 'Vol_usado_m3', 'Vol_max_m3']
      const rows = rutas.map(r => [
        r.id,
        r.vehiculo.placa,
        r.vehiculo.marca,
        `"${String(r.vehiculo.conductor || '').replace(/"/g, '""')}"`,
        r.pedidos.length,
        r.km.toFixed(1),
        `"${hhmm(r.minutos)}"`,
        r.peso.toFixed(2),
        r.vehiculo.pesoMax,
        r.vol.toFixed(2),
        r.vehiculo.volMax,
      ])

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `plan_flota_siprd_${plan.n}_vehiculos.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Reporte CSV descargado con éxito (${rutas.length} vehículos).`)
    } catch {
      toast.error('No se pudo generar la exportación en este momento.')
    }
  }

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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportarCSV}
            title="Descargar archivo CSV compatible con Excel"
          >
            <span>📥</span>
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>VEHÍCULO</th>
              <th>CONDUCTOR</th>
              <th className="num">PARADAS</th>
              <th className="num">DISTANCIA</th>
              <th>JORNADA ESTIMADA</th>
              <th>PESO USADO (t)</th>
              <th>VOLUMEN USADO (m³)</th>
              <th>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {rutas.map((r) => {
              const pctPeso = (r.peso / r.vehiculo.pesoMax) * 100
              const excede = r.minutos > limite
              const holgado = r.minutos < limite * 0.75
              const estado = excede
                ? <span className="chip c-hi">⚠️ Excede jornada</span>
                : pctPeso >= 92
                ? <span className="chip c-md">⚠️ Al límite de peso</span>
                : holgado
                ? <span className="chip c-md">ℹ️ Con holgura</span>
                : <span className="chip c-gn">✓ Óptimo</span>

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
        <span style={{ color: '#B45309', fontWeight: 500 }}>{sugerencia}</span>
      </div>
    </div>
  )
}
