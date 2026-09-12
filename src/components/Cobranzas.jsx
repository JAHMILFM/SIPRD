import { useState } from 'react'
import { COBROS_INICIAL } from '../data/mockRutas'
import { useAuth } from '../context/AuthContext'
import { useAudit } from '../context/AuditContext'
import { useToast } from '../context/ToastContext'
import Modal from './common/Modal'

/**
 * Módulo Cobranzas — Validación de pagos.
 *
 * Incluye prevención de errores destructivos (modal obligatorio para motivo de rechazo),
 * soporte de Deshacer en validaciones (Heurística #3), y exportación a CSV (Heurística #7).
 */

const TIPO_ICON = { efectivo: '💵', transferencia: '📱', cheque: '🏦' }
const TIPO_COLOR = { efectivo: '#16A34A', transferencia: '#2563EB', cheque: '#7C3AED' }

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
  const { usuario } = useAuth()
  const { log }     = useAudit()
  const { toast }   = useToast()

  const [cobros, setCobros]         = useState(COBROS_INICIAL)
  const [filtro, setFiltro]         = useState('todos')
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalRechazo, setModalRechazo] = useState(null) // id del cobro a rechazar
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [busca, setBusca]           = useState('')

  // Métricas
  const pendientes  = cobros.filter(c => c.estado === 'pendiente').length
  const validados   = cobros.filter(c => c.estado === 'validado').length
  const rechazados  = cobros.filter(c => c.estado === 'rechazado').length
  const montoVal    = cobros.filter(c => c.estado === 'validado').reduce((s, c) => s + c.monto, 0)
  const montoPend   = cobros.filter(c => c.estado === 'pendiente').reduce((s, c) => s + c.monto, 0)

  const filtrados = cobros.filter(c => {
    if (filtro !== 'todos' && c.estado !== filtro) return false
    if (busca) {
      const q = busca.toLowerCase()
      return c.cliente.toLowerCase().includes(q) || c.conductor.toLowerCase().includes(q) || c.pedido.includes(q)
    }
    return true
  })

  // ── Validación con soporte de Deshacer (Heurística #3) ─────────
  const validar = (id, nota = '') => {
    const ahora = new Date()
    const horaV = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const cobroOriginal = cobros.find(c => c.id === id)

    setCobros(prev => prev.map(c => c.id === id ? { ...c, estado: 'validado', nota, horaValidacion: horaV } : c))

    if (cobroOriginal) {
      log(usuario, 'Cobranzas', 'Validó pago', `${cobroOriginal.cliente} · S/ ${cobroOriginal.monto.toLocaleString('es-PE')} · ${cobroOriginal.tipo}`)
      toast.success(`Pago de S/ ${cobroOriginal.monto.toLocaleString('es-PE')} (${cobroOriginal.cliente}) validado.`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            setCobros(prev => prev.map(c => c.id === id ? cobroOriginal : c))
            toast.info('Validación revertida a estado pendiente.')
          }
        }
      })
    }
    setModalDetalle(null)
  }

  // ── Rechazo con motivo obligatorio (Heurística #5 y #9) ───────
  const iniciarRechazo = (id) => {
    setModalRechazo(id)
    setMotivoRechazo('')
    setModalDetalle(null)
  }

  const confirmarRechazo = () => {
    if (!motivoRechazo.trim()) {
      toast.warning('Debes ingresar el motivo del rechazo para informar al transportista.')
      return
    }

    const ahora = new Date()
    const horaR = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const cobro = cobros.find(c => c.id === modalRechazo)

    setCobros(prev => prev.map(c => c.id === modalRechazo ? { ...c, estado: 'rechazado', nota: motivoRechazo.trim(), horaValidacion: horaR } : c))

    if (cobro) {
      log(usuario, 'Cobranzas', 'Rechazó pago', `${cobro.cliente} · S/ ${cobro.monto.toLocaleString('es-PE')} · Motivo: ${motivoRechazo}`)
      toast.error(`Pago de ${cobro.cliente} rechazado. Repartidor notificado.`)
    }

    setModalRechazo(null)
    setMotivoRechazo('')
  }

  // ── Exportación a CSV (Heurística #7) ──────────────────────────
  const exportarCobrosCSV = () => {
    try {
      const headers = ['Pedido', 'Ruta', 'Repartidor', 'Cliente', 'Monto_PEN', 'Tipo', 'Hora_Reporte', 'Estado', 'Nota']
      const rows = filtrados.map(c => [
        `"#${c.pedido}"`,
        c.ruta,
        `"${c.conductor}"`,
        `"${c.cliente}"`,
        c.monto,
        c.tipo,
        c.hora,
        c.estado,
        `"${c.nota || ''}"`
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

  const cobroSeleccionado = modalDetalle ? cobros.find(c => c.id === modalDetalle) : null
  const cobroARechazar = modalRechazo ? cobros.find(c => c.id === modalRechazo) : null

  return (
    <>
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
              <div>{chipTipo(cobroSeleccionado.tipo)}</div>
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
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>{cobroSeleccionado.nota || 'Verificado con banco receptor'}</div>
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
              💵 <strong>Pago en efectivo recibido por el repartidor.</strong> No requiere comprobante bancario. Se concilia contra caja al retorno del vehículo.
            </div>
          )}

          {/* Acciones */}
          <div className="modal-ft" style={{ margin: '14px -22px -20px', padding: '14px 22px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalDetalle(null)}>
              Cerrar
            </button>
            {cobroSeleccionado.estado === 'pendiente' && (
              <>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => iniciarRechazo(cobroSeleccionado.id)}
                >
                  ✕ Rechazar
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => validar(cobroSeleccionado.id)}
                >
                  ✓ Validar Pago
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Obligatorio de Motivo de Rechazo (Heurística #5 y #9) */}
      {cobroARechazar && (
        <Modal
          isOpen={true}
          onClose={() => setModalRechazo(null)}
          title="Rechazar Comprobante de Pago"
          subtitle={`Pedido #${cobroARechazar.pedido} · ${cobroARechazar.cliente}`}
          maxWidth={460}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b' }}>
              ⚠️ <strong>Esta acción bloqueará al conductor</strong> hasta que ingrese un nuevo comprobante o cobre en efectivo.
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                Motivo del rechazo (obligatorio para el transportista):
              </label>
              <textarea
                rows={3}
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                placeholder="Ej. Imagen borrosa, monto no coincide con la factura o cuenta bancaria incorrecta..."
                style={{
                  width: '100%', border: '1px solid #cbd5e1', borderRadius: 8,
                  padding: '8px 12px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical'
                }}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-ft" style={{ margin: '16px -22px -20px', padding: '14px 22px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalRechazo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={confirmarRechazo}
              disabled={!motivoRechazo.trim()}
            >
              Confirmar Rechazo
            </button>
          </div>
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
              <p>Valida los pagos reportados para que los conductores avancen en su ruta sin detención.</p>
            </div>
            <div className="btns">
              {pendientes > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, color: '#92400e', fontWeight: 600 }}>
                  ⚑ {pendientes} pago{pendientes > 1 ? 's' : ''} reteniendo salida
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
                        >
                          Ver
                        </button>
                        {c.estado === 'pendiente' && (
                          <>
                            <button
                              type="button"
                              onClick={() => validar(c.id, '')}
                              className="btn btn-success"
                              style={{ padding: '4px 10px', fontSize: 11 }}
                              title="Aprobar pago"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => iniciarRechazo(c.id)}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              title="Rechazar pago con motivo"
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
                      <b>Sin cobros en este filtro</b>
                      <p style={{ marginTop: 4, color: '#64748b' }}>No hay registros que coincidan con la búsqueda o el estado seleccionado.</p>
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
