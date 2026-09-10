import { useState } from 'react'
import { COBROS_INICIAL } from '../data/mockRutas'
import { useAuth } from '../context/AuthContext'
import { useAudit } from '../context/AuditContext'

/**
 * Módulo Cobranzas.
 *
 * El asistente de distribución valida los pagos reportados por los repartidores.
 * Un pago no validado bloquea al conductor: no puede avanzar al siguiente punto.
 *
 * Flujo:
 *  1. Repartidor entrega y reporta pago (efectivo / transferencia / cheque)
 *  2. Si es transferencia o cheque, sube foto del comprobante desde la app
 *  3. Asistente revisa el banco y hace clic en "Validar" o "Rechazar"
 *  4. Solo entonces la app habilita el siguiente punto
 */

const TIPO_ICON = { efectivo: '💵', transferencia: '📱', cheque: '🏦' }
const TIPO_COLOR = { efectivo: '#16A34A', transferencia: '#2563EB', cheque: '#7C3AED' }

function chipTipo(tipo) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: TIPO_COLOR[tipo] + '15', color: TIPO_COLOR[tipo], borderRadius: 5, padding: '2px 7px', fontSize: 10.5, fontWeight: 600 }}>
      {TIPO_ICON[tipo]} {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
    </span>
  )
}

function chipEstado(estado) {
  const map = { validado: ['c-gn', 'Validado'], rechazado: ['c-hi', 'Rechazado'], pendiente: ['c-md', 'Pend. validación'] }
  const [cls, label] = map[estado] ?? ['c-lo', estado]
  return <span className={`chip ${cls}`}>{label}</span>
}

// ── Modal de detalle ──────────────────────────────────────────
function Modal({ cobro, onClose, onValidar, onRechazar }) {
  const [nota, setNota] = useState(cobro.nota || '')
  if (!cobro) return null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(15,23,42,.25)', overflow: 'hidden' }}>
        {/* Cabecera */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e9ef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Detalle de cobro</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Pedido #{cobro.pedido}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}>×</button>
        </div>
        {/* Cuerpo */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>CLIENTE</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{cobro.cliente}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>REPARTIDOR</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{cobro.conductor}</div>
              <span className="rt" style={{ background: cobro.color, marginTop: 3 }}>{cobro.ruta}</span>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>MONTO</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>S/ {cobro.monto.toLocaleString('es-PE')}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>TIPO · HORA</div>
              <div style={{ marginBottom: 4 }}>{chipTipo(cobro.tipo)}</div>
              <div style={{ fontSize: 11.5, color: '#475569' }}>{cobro.hora}</div>
            </div>
          </div>

          {/* Comprobante */}
          {cobro.tipo !== 'efectivo' && (
            <div style={{ borderRadius: 9, border: '1px dashed #cbd5e1', padding: '14px', textAlign: 'center' }}>
              {cobro.comprobante ? (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🖼</div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a', marginBottom: 2 }}>Comprobante adjunto</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>{cobro.nota || 'Sin nota adicional'}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>⏳</div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#b45309' }}>Comprobante pendiente de envío</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>El repartidor aún no ha subido la imagen</div>
                </div>
              )}
            </div>
          )}

          {cobro.tipo === 'efectivo' && (
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 13px', fontSize: 11.5, color: '#15803d' }}>
              💵 Pago en efectivo — no se sube foto del dinero. Validar con el descuadre de caja al cierre del día.
            </div>
          )}

          {/* Nota */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Nota del validador (opcional)</label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={2}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', color: '#0f172a' }}
              placeholder="Ej: Cheque #00834 Banco BCP, Operación N° 0184221…"
            />
          </div>
        </div>
        {/* Acciones */}
        {cobro.estado === 'pendiente' && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e6e9ef', display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
            <button className="btn out" onClick={() => onRechazar(cobro.id, nota)} style={{ color: '#b91c1c', borderColor: '#fca5a5' }}>✕ Rechazar</button>
            <button className="btn green" onClick={() => onValidar(cobro.id, nota)}>✓ Validar pago</button>
          </div>
        )}
        {cobro.estado !== 'pendiente' && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e6e9ef', textAlign: 'right' }}>
            {chipEstado(cobro.estado)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function Cobranzas() {
  const { usuario }     = useAuth()
  const { log }         = useAudit()
  const [cobros, setCobros]     = useState(COBROS_INICIAL)
  const [filtro, setFiltro]     = useState('todos')  // todos | pendiente | validado | rechazado
  const [modal, setModal]       = useState(null)
  const [busca, setBusca]       = useState('')

  // métricas
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

  const validar   = (id, nota) => {
    const ahora = new Date()
    const horaV = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const cobro = cobros.find(c => c.id === id)
    setCobros(prev => prev.map(c => c.id === id ? { ...c, estado: 'validado', nota, horaValidacion: horaV } : c))
    // RF-13: registrar validación con usuario y timestamp real
    if (cobro) log(usuario, 'Cobranzas', 'Validó pago', `${cobro.cliente} · S/ ${cobro.monto.toLocaleString('es-PE')} · ${cobro.tipo}`)
    setModal(null)
  }
  const rechazar  = (id, nota) => {
    const ahora = new Date()
    const horaR = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const cobro = cobros.find(c => c.id === id)
    setCobros(prev => prev.map(c => c.id === id ? { ...c, estado: 'rechazado', nota, horaValidacion: horaR } : c))
    // RF-13: registrar rechazo con usuario y timestamp real
    if (cobro) log(usuario, 'Cobranzas', 'Rechazó pago', `${cobro.cliente} · S/ ${cobro.monto.toLocaleString('es-PE')} · ${cobro.tipo}${nota ? ' · ' + nota : ''}`)
    setModal(null)
  }

  const cobroModal = modal ? cobros.find(c => c.id === modal) : null

  return (
    <>
      {cobroModal && <Modal cobro={cobroModal} onClose={() => setModal(null)} onValidar={validar} onRechazar={rechazar} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
          {[
            { label: 'Pend. validación', n: pendientes, c: '#b45309', bg: '#fef3c7', ico: '⏳' },
            { label: 'Validados', n: validados, c: '#16A34A', bg: '#dcfce7', ico: '✓' },
            { label: 'Rechazados', n: rechazados, c: '#b91c1c', bg: '#fee2e2', ico: '✕' },
            { label: 'Monto validado', n: `S/ ${montoVal.toLocaleString('es-PE')}`, c: '#2563EB', bg: '#dbeafe', ico: '💰' },
            { label: 'Monto pendiente', n: `S/ ${montoPend.toLocaleString('es-PE')}`, c: '#b45309', bg: '#fef3c7', ico: '⏳' },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: '13px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500, marginBottom: 5 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.c, letterSpacing: -1 }}>{k.n}</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: 'grid', placeItems: 'center', fontSize: 15 }}>{k.ico}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cola de cobros */}
        <div className="card">
          <div className="ch">
            <div>
              <h3>Cola de validación</h3>
              <p>Valida los pagos reportados por los repartidores para que puedan avanzar al siguiente punto.</p>
            </div>
            {pendientes > 0 && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, color: '#92400e', fontWeight: 500 }}>
                ⚑ {pendientes} pago{pendientes > 1 ? 's' : ''} bloqueando a repartidores
              </div>
            )}
          </div>

          {/* Filtros + búsqueda */}
          <div style={{ padding: '10px 15px', display: 'flex', gap: 10, borderBottom: '1px solid #e6e9ef', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="tabs" style={{ padding: 0, border: 0, marginRight: 4 }}>
              {[['todos', 'Todos'], ['pendiente', 'Pendientes'], ['validado', 'Validados'], ['rechazado', 'Rechazados']].map(([k, l]) => (
                <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)} style={{ border: 0, borderBottom: `2px solid ${filtro === k ? 'var(--blue)' : 'transparent'}`, background: 'none', padding: '6px 11px', fontFamily: 'inherit', fontSize: 12, color: filtro === k ? 'var(--blue)' : '#64748b', fontWeight: filtro === k ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {l}
                  <span className={`cnt${k === 'pendiente' ? ' warn' : k === 'rechazado' ? ' dang' : ''}`} style={{ marginLeft: 5 }}>
                    {cobros.filter(c => k === 'todos' ? true : c.estado === k).length}
                  </span>
                </button>
              ))}
            </div>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar cliente, repartidor o pedido…"
              style={{ flex: 1, minWidth: 180, border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: '#0f172a' }}
            />
          </div>

          {/* Tabla */}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>RUTA</th><th>REPARTIDOR</th><th>CLIENTE</th>
                  <th className="num">MONTO</th><th>TIPO</th><th>HORA</th>
                  <th>COMP.</th><th>ESTADO</th><th style={{ width: 110, textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} style={{ background: c.estado === 'pendiente' ? '#fffef5' : undefined }}>
                    <td><span className="rt" style={{ background: c.color }}>{c.ruta}</span></td>
                    <td style={{ fontWeight: 500, fontSize: 11.5 }}>{c.conductor}</td>
                    <td className="cli"><b>{c.cliente}</b><i>#{c.pedido}</i></td>
                    <td className="num" style={{ fontWeight: 700, fontSize: 13 }}>S/ {c.monto.toLocaleString('es-PE')}</td>
                    <td>{chipTipo(c.tipo)}</td>
                    <td style={{ color: '#64748b', fontSize: 11.5 }}>{c.hora}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.tipo !== 'efectivo' ? (c.comprobante ? <span title="Comprobante adjunto" style={{ fontSize: 15 }}>🖼</span> : <span title="Sin comprobante" style={{ fontSize: 15, opacity: .4 }}>🖼</span>) : <span style={{ color: '#94a3b8', fontSize: 11 }}>N/A</span>}
                    </td>
                    <td>{chipEstado(c.estado)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                        <button onClick={() => setModal(c.id)} className="btn out" style={{ padding: '4px 10px', fontSize: 11 }}>Ver</button>
                        {c.estado === 'pendiente' && (
                          <button onClick={() => validar(c.id, '')} className="btn green" style={{ padding: '4px 10px', fontSize: 11 }}>✓</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={9} className="empty"><b>Sin cobros en este filtro</b></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="foot">
            <span>{filtrados.length} registros · Total: S/ {filtrados.reduce((s,c)=>s+c.monto,0).toLocaleString('es-PE')}</span>
          </div>
        </div>

      </div>
    </>
  )
}
