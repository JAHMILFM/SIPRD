import { useState, useMemo, useEffect } from 'react'
import { useDatos } from '../context/DatosContext'
import { apiFetch } from '../api/cliente'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from './common/Modal'
import AvisoServidor from './common/AvisoServidor'
import { ContrastePagoPanel } from './Operaciones'

/**
 * Módulo Cobranzas — Validación de pagos.
 *
 * Incluye prevención de errores destructivos (modal obligatorio para motivo de rechazo),
 * soporte de Deshacer en validaciones (Heurística #3), y exportación a CSV (Heurística #7).
 */

const TIPO_ICON = { efectivo: '💵', transferencia: '📱', cheque: '🏦', deposito: '🏦', yape: '📱', plin: '📱' }
const TIPO_COLOR = { efectivo: '#16A34A', transferencia: '#2563EB', cheque: '#7C3AED', deposito: '#2563EB', yape: '#7C3AED', plin: '#16A34A' }

function chipTipo(tipo) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: TIPO_COLOR[tipo] + '15', color: TIPO_COLOR[tipo], borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
      <span aria-hidden="true">{TIPO_ICON[tipo]}</span> {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
    </span>
  )
}

function chipEstado(estado) {
  const map = {
    validado: ['c-gn', '✓ Validado'],
    rechazado: ['c-hi', '✕ Rechazado'],
    pendiente: ['c-md', '⏳ Pend. validación'],
  }
  const [cls, label] = map[estado] ?? ['c-lo', estado]
  return <span className={`chip ${cls}`}>{label}</span>
}

export default function Cobranzas() {
  const { cobros: COBROS_INICIAL, recargar } = useDatos()
  const { usuario } = useAuth()
  const puedeValidar = usuario.rol === 'tesoreria'
  const { toast }   = useToast()

  const [cobros, setCobros]         = useState(COBROS_INICIAL)
  useEffect(() => { setCobros(COBROS_INICIAL) }, [COBROS_INICIAL])
  const [filtro, setFiltro]         = useState('todos')
  const [modalDetalle, setModalDetalle] = useState(null)
  const [busca, setBusca]           = useState('')

  // Métricas calculadas
  const { pendientes, validados, rechazados, montoVal, montoPend } = useMemo(() => {
    let p = 0, v = 0, r = 0, mV = 0, mP = 0
    for (const c of cobros) {
      if (c.estado === 'pendiente') { p++; mP += c.monto }
      else if (c.estado === 'validado') { v++; mV += c.monto }
      else if (c.estado === 'rechazado') { r++ }
    }
    return { pendientes: p, validados: v, rechazados: r, montoVal: mV, montoPend: mP }
  }, [cobros])

  const filtrados = useMemo(() => {
    return cobros.filter(c => {
      if (filtro !== 'todos' && c.estado !== filtro) return false
      if (busca) {
        const q = busca.toLowerCase().trim()
        const matchCli = (c.cliente ?? '').toLowerCase().includes(q)
        const matchCon = (c.conductor ?? '').toLowerCase().includes(q)
        const matchPed = String(c.pedido ?? '').includes(q)
        return matchCli || matchCon || matchPed
      }
      return true
    })
  }, [cobros, filtro, busca])

  const validar = (id) => setModalDetalle(id)
  const iniciarRechazo = (id) => setModalDetalle(id)

  const verComprobante = async (id) => {
    try {
      const response = await apiFetch(`/cobros/${id}/comprobante/archivo`)
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = `comprobante-${id}.${({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' })[response.headers.get('Content-Type')?.split(';')[0]] || 'bin'}`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) { toast.error(err.message) }
  }

  // ── Exportación a CSV (Heurística #7) ──────────────────────────
  const exportarCobrosCSV = () => {
    try {
      const headers = ['Pedido', 'Ruta', 'Repartidor', 'Cliente', 'Monto_PEN', 'Tipo', 'Hora_Reporte', 'Estado', 'Nota']
      const rows = filtrados.map(c => [
        `"#${c.pedido}"`,
        `"${c.ruta}"`,
        `"${String(c.conductor ?? '').replace(/"/g, '""')}"`,
        `"${String(c.cliente ?? '').replace(/"/g, '""')}"`,
        c.monto,
        c.tipo,
        `"${c.hora ?? ''}"`,
        c.estado,
        `"${String(c.nota || '').replace(/"/g, '""')}"`
      ])

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `conciliacion_cobranzas_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Conciliación exportada con éxito (${filtrados.length} registros).`)
    } catch {
      toast.error('No se pudo exportar la tabla de cobranzas.')
    }
  }

  const exportarExcel = async () => {
    try {
      const response = await apiFetch('/cobros/exportacion.xlsx')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = 'arqueo_cobros_siprd.xlsx'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Arqueo exportado en Excel.')
    } catch (err) { toast.error(err.message) }
  }

  const cobroSeleccionado = modalDetalle ? cobros.find(c => c.id === modalDetalle) : null


  return (
    <>
      <AvisoServidor />
      {/* Modal de Detalle de Cobro */}
      {cobroSeleccionado && (
        <Modal
          isOpen={true}
          onClose={() => setModalDetalle(null)}
          title={`Detalle de Cobro · Pedido #${cobroSeleccionado.pedido}`}
          subtitle="Verificación de pago para habilitar continuación de ruta"
          maxWidth={500}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #f1f4f8' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>CLIENTE</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{cobroSeleccionado.cliente}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #f1f4f8' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>REPARTIDOR</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{cobroSeleccionado.conductor}</div>
              <span className="rt" style={{ background: cobroSeleccionado.color, marginTop: 4 }}>{cobroSeleccionado.ruta}</span>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #f1f4f8' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>MONTO</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>S/ {cobroSeleccionado.monto.toLocaleString('es-PE')}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #f1f4f8' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>TIPO Y HORA</div>
              <div>{chipTipo(cobroSeleccionado.tipo)}</div><div style={{fontSize:11,color:'#64748b',marginTop:4}}>Operación: {cobroSeleccionado.numero_operacion || 'Arqueo de efectivo'}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{cobroSeleccionado.hora}</div>
            </div>
          </div>

          {/* Comprobante */}
          {cobroSeleccionado.tipo !== 'efectivo' && (
            <div style={{ borderRadius: 8, border: '1px dashed #cbd5e1', padding: '16px', textAlign: 'center', background: '#fbfcfd' }}>
              {cobroSeleccionado.comprobante ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🧾</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Comprobante digital adjuntado</div>
                  <button className="btn out" onClick={() => verComprobante(cobroSeleccionado.id)}>Descargar comprobante</button>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>{cobroSeleccionado.nota || 'Revisa el sustento antes del contraste'}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>⏳</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#b45309' }}>Comprobante pendiente de carga</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>El repartidor aún no ha transmitido la captura</div>
                </div>
              )}
            </div>
          )}

          {cobroSeleccionado.tipo === 'efectivo' && (
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#15803d', border: '1px solid #bbf7d0' }}>
              💵 <strong>Pago en efectivo recibido por el repartidor.</strong> Adjunta su sustento y registra la referencia del arqueo de caja para contrastarlo.
            </div>
          )}

          {<ContrastePagoPanel key={cobroSeleccionado.id} id={cobroSeleccionado.id} />}
          <div className="modal-ft"><button className="btn out" onClick={() => setModalDetalle(null)}>Cerrar</button></div>
        </Modal>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* KPIs de Cobranza */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
          {[
            { label: 'Pend. validación', n: pendientes, c: '#b45309', bg: '#fef3c7', ico: '⏳' },
            { label: 'Validados', n: validados, c: '#16A34A', bg: '#dcfce7', ico: '✓' },
            { label: 'Rechazados', n: rechazados, c: '#b91c1c', bg: '#fee2e2', ico: '✕' },
            { label: 'Monto validado', n: `S/ ${montoVal.toLocaleString('es-PE')}`, c: '#2563EB', bg: '#dbeafe', ico: '💰' },
            { label: 'Monto pendiente', n: `S/ ${montoPend.toLocaleString('es-PE')}`, c: '#b45309', bg: '#fef3c7', ico: '⏳' },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: k.c, letterSpacing: -0.5 }}>{k.n}</div>
                </div>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: k.bg, display: 'grid', placeItems: 'center', fontSize: 16 }}>{k.ico}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cola de cobros */}
        <div className="card">
          <div className="ch">
            <div>
              <h3>Cola de validación de cobros</h3>
              <p>Revisa los comprobantes, registra observaciones y valida los cobros reportados.</p>
            </div>
            <div className="btns">
              {pendientes > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, color: '#92400e', fontWeight: 600 }}>
                  ⚑ {pendientes} pago{pendientes > 1 ? 's' : ''} por revisar
                </div>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={exportarCobrosCSV}
                title="Descargar reporte de cobros en formato CSV"
              >
                <span>📥</span>
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  exportarExcel()
                }}
                title="Descargar libro Excel oficial para arqueo de caja (openpyxl)"
              >
                <span>📊</span>
                <span>Exportar Excel (Arqueo)</span>
              </button>
            </div>
          </div>

          {/* Filtros + búsqueda accesible */}
          <div style={{ padding: '10px 16px', display: 'flex', gap: 10, borderBottom: '1px solid #e6e9ef', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="tabs" style={{ padding: 0, border: 0, marginRight: 4 }}>
              {[['todos', 'Todos'], ['pendiente', 'Pendientes'], ['validado', 'Validados'], ['rechazado', 'Rechazados']].map(([k, l]) => (
                <button
                  key={k}
                  className={filtro === k ? 'on' : ''}
                  onClick={() => setFiltro(k)}
                  style={{
                    border: 0,
                    borderBottom: `2px solid ${filtro === k ? 'var(--blue)' : 'transparent'}`,
                    background: 'none',
                    padding: '7px 12px',
                    fontFamily: 'inherit',
                    fontSize: 12.5,
                    color: filtro === k ? 'var(--blue)' : '#64748b',
                    fontWeight: filtro === k ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {l}
                  <span className={`cnt${k === 'pendiente' ? ' warn' : k === 'rechazado' ? ' dang' : ''}`} style={{ marginLeft: 6 }}>
                    {cobros.filter(c => k === 'todos' ? true : c.estado === k).length}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por cliente, repartidor o pedido…"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 32px 7px 12px', fontSize: 12, fontFamily: 'inherit' }}
                aria-label="Buscar cobros"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: '#64748b', fontSize: 13 }}
                  aria-label="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Cobros */}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>RUTA</th>
                  <th>REPARTIDOR</th>
                  <th>CLIENTE</th>
                  <th className="num">MONTO</th>
                  <th>TIPO</th>
                  <th>HORA</th>
                  <th>COMP.</th>
                  <th>ESTADO</th>
                  <th style={{ width: 140, textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} style={{ background: c.estado === 'pendiente' ? '#fffef5' : undefined }}>
                    <td><span className="rt" style={{ background: c.color }}>{c.ruta}</span></td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{c.conductor}</td>
                    <td className="cli"><b>{c.cliente}</b><i>#{c.pedido}</i></td>
                    <td className="num" style={{ fontWeight: 800, fontSize: 13.5 }}>S/ {c.monto.toLocaleString('es-PE')}</td>
                    <td>{chipTipo(c.tipo)}</td>
                    <td style={{ color: '#64748b', fontSize: 11.5 }}>{c.hora}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.tipo !== 'efectivo' ? (
                        c.comprobante ? <span title="Comprobante adjuntado" style={{ fontSize: 16 }}>🧾</span> : <span title="Sin imagen" style={{ fontSize: 16, opacity: 0.35 }}>🧾</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>N/A</span>
                      )}
                    </td>
                    <td>{chipEstado(c.estado)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setModalDetalle(c.id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          title="Ver detalle de cobro"
                          aria-label={`Ver detalle de cobro de ${c.cliente}`}
                        >
                          Ver
                        </button>
                        {c.estado === 'pendiente' && puedeValidar && (
                          <>
                            <button
                              type="button"
                              onClick={() => validar(c.id, '')}
                              className="btn btn-success"
                              style={{ padding: '4px 10px', fontSize: 11 }}
                              title="Aprobar pago"
                              aria-label={`Aprobar pago de S/ ${c.monto.toLocaleString('es-PE')} de ${c.cliente}`}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => iniciarRechazo(c.id)}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              title="Rechazar pago con motivo"
                              aria-label={`Rechazar pago de S/ ${c.monto.toLocaleString('es-PE')} de ${c.cliente}`}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty">
                      <b>{cobros.length ? 'Sin cobros en este filtro' : 'El servidor no devolvió cobranzas'}</b>
                      <p style={{ marginTop: 4, color: '#64748b' }}>{cobros.length ? 'No hay registros que coincidan con la búsqueda o el estado seleccionado.' : 'Actualiza los datos. Si el servidor está desactualizado, reinícialo para habilitar la consulta del Jefe.'}</p><button className="btn out" onClick={() => { setBusca(''); setFiltro('todos'); recargar() }}>Actualizar cobranzas</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="foot">
            <span>{filtrados.length} registros encontrados · Total mostrado: S/ {filtrados.reduce((s, c) => s + c.monto, 0).toLocaleString('es-PE')}</span>
          </div>
        </div>

      </div>
    </>
  )
}
