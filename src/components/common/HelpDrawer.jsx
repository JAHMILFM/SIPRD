import { useState, useEffect } from 'react'

/**
 * Panel Deslizante de Ayuda y Documentación (Heurística #10 de Nielsen)
 * Incluye visor de cumplimiento de heurísticas y leyes de UX.
 */
export default function HelpDrawer({ isOpen, onClose }) {
  const [tab, setTab] = useState('guia') // 'guia' | 'atajos' | 'heurísticas'

  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Guía de ayuda y documentación">
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="drawer-header">
          <div>
            <div className="drawer-badge">SOPORTE Y DOCUMENTACIÓN</div>
            <h2 className="drawer-title">Centro de Ayuda SIPRD</h2>
            <p className="drawer-sub">Alfa Distribuidores S.A. · Guía operativa y marco de usabilidad</p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar panel de ayuda">✕</button>
        </div>

        {/* Tabs de navegación */}
        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${tab === 'guia' ? 'active' : ''}`}
            onClick={() => setTab('guia')}
          >
            📖 Guía Operativa
          </button>
          <button
            className={`drawer-tab ${tab === 'atajos' ? 'active' : ''}`}
            onClick={() => setTab('atajos')}
          >
            ⌨️ Atajos de Teclado
          </button>
          <button
            className={`drawer-tab ${tab === 'heurísticas' ? 'active' : ''}`}
            onClick={() => setTab('heurísticas')}
          >
            🎯 Criterios UX / UI
          </button>
        </div>

        {/* Contenido */}
        <div className="drawer-body">
          {/* TAB 1: GUÍA OPERATIVA */}
          {tab === 'guia' && (
            <div className="help-section">
              <div className="help-card">
                <div className="help-card-header">
                  <span className="help-step">1</span>
                  <h4>Inicio (Dashboard Operativo)</h4>
                </div>
                <p>
                  Visualiza los indicadores clave del día (KPIs), el porcentaje de entregas completadas, la situación de cada vehículo y el flujo de actividad reciente en tiempo real.
                </p>
              </div>

              <div className="help-card">
                <div className="help-card-header">
                  <span className="help-step">2</span>
                  <h4>Algoritmo de Ruteo</h4>
                </div>
                <p>
                  Permite realizar el <strong>Tanteo de Flota</strong> evaluando escenarios con 3, 4, 5 o más camiones. El sistema alerta sobre conflictos de ventanas horarias (RF-06) y reprogramaciones automáticas (RF-03).
                  El Jefe de Distribución puede aprobar y despachar el plan oficial (RF-09).
                </p>
              </div>

              <div className="help-card">
                <div className="help-card-header">
                  <span className="help-step">3</span>
                  <h4>Gestión de Rutas en Vivo</h4>
                </div>
                <p>
                  Reordena paradas utilizando los botones ↑ y ↓ si surge algún imprevisto. Puedes bloquear temporalmente una parada o recalcular las pendientes.
                  Si cometes un error al reordenar, dispones del botón <strong>«Deshacer»</strong>.
                </p>
              </div>

              <div className="help-card">
                <div className="help-card-header">
                  <span className="help-step">4</span>
                  <h4>Validación de Cobranzas</h4>
                </div>
                <p>
                  Revisa los comprobantes de transferencias y cheques reportados por los repartidores. Al aprobar o rechazar un pago con su nota respectiva, se sincroniza el estado para liberar el avance del conductor.
                </p>
              </div>

              <div className="help-card">
                <div className="help-card-header">
                  <span className="help-step">5</span>
                  <h4>Configuración y Reglas</h4>
                </div>
                <p>
                  Administra la capacidad en toneladas y metros cúbicos de cada unidad de transporte, así como los horarios y días permitidos por cada cliente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ATAJOS DE TECLADO */}
          {tab === 'atajos' && (
            <div className="help-section">
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                Aumenta tu velocidad de trabajo y ergonomía operativa utilizando estos atajos rápidos:
              </p>

              <div className="shortcuts-table">
                <div className="shortcut-row">
                  <span className="shortcut-desc">Ir al módulo Inicio</span>
                  <div className="shortcut-keys"><kbd>Alt</kbd> + <kbd>1</kbd></div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Ir al módulo Algoritmo</span>
                  <div className="shortcut-keys"><kbd>Alt</kbd> + <kbd>2</kbd></div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Ir al módulo Rutas</span>
                  <div className="shortcut-keys"><kbd>Alt</kbd> + <kbd>3</kbd></div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Ir al módulo Cobranzas</span>
                  <div className="shortcut-keys"><kbd>Alt</kbd> + <kbd>4</kbd></div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Ir al módulo Configuración</span>
                  <div className="shortcut-keys"><kbd>Alt</kbd> + <kbd>5</kbd></div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Ir al módulo Registros</span>
                  <div className="shortcut-keys"><kbd>Alt</kbd> + <kbd>6</kbd></div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Abrir / cerrar esta Guía de Ayuda</span>
                  <div className="shortcut-keys"><kbd>?</kbd> o <kbd>Shift</kbd> + <kbd>/</kbd></div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Cerrar modales o paneles abiertos</span>
                  <div className="shortcut-keys"><kbd>Esc</kbd></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CRITERIOS Y HEURÍSTICAS */}
          {tab === 'heurísticas' && (
            <div className="help-section">
              <div className="heuristics-group">
                <h4 className="heuristics-group-title">10 Heurísticas de Jakob Nielsen</h4>
                
                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H1</span>
                  <div>
                    <b>Visibilidad del estado del sistema:</b> Sistema global de Toasts/Snackbars con progreso, estados de cálculo («Optimizando…») y barra de progreso del día.
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H2</span>
                  <div>
                    <b>Correspondencia con el mundo real:</b> Terminología logística familiar («Bultos», «Jornada», «Ventana horaria», «Paradas»).
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H3</span>
                  <div>
                    <b>Control y libertad del usuario:</b> Botón «Deshacer» (Undo) tras reordenar paradas o validar pagos; tecla `Escape` y salidas de emergencia en todos los modales.
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H4</span>
                  <div>
                    <b>Consistencia y estándares:</b> Design System centralizado con colores semánticos, botones estandarizados, chips y estilos predecibles.
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H5</span>
                  <div>
                    <b>Prevención de errores:</b> Diálogos de confirmación previa para eliminación de reglas y motivo obligatorio antes de rechazar cobros.
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H6</span>
                  <div>
                    <b>Reconocimiento antes que recuerdo:</b> Filtros con contador, búsqueda con limpieza rápida (✕), tooltips explicativos en cabeceras de tabla.
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H7</span>
                  <div>
                    <b>Flexibilidad y eficiencia de uso:</b> Atajos de teclado rápidos (`Alt+1..6`, `?`), ordenamiento por columnas y exportación de datos a CSV.
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H8</span>
                  <div>
                    <b>Diseño estético y minimalista:</b> Jerarquía visual limpia, espaciado de 8px, sin información innecesaria que compita por atención.
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H9</span>
                  <div>
                    <b>Diagnosticar y recuperarse de errores:</b> Avisos contextuales con sugerencias claras («Agrega más vehículos en el tanteo de flota o divide el pedido»).
                  </div>
                </div>

                <div className="heuristic-item">
                  <span className="heuristic-badge verified">✓ H10</span>
                  <div>
                    <b>Ayuda y documentación:</b> Este centro de soporte interactivo con guías paso a paso, glosario y tabla de atajos siempre disponible.
                  </div>
                </div>
              </div>

              <div className="heuristics-group" style={{ marginTop: 18 }}>
                <h4 className="heuristics-group-title">Leyes Psicológicas y Accesibilidad WCAG</h4>
                <div className="heuristic-item">
                  <span className="heuristic-badge psychology">Fitts</span>
                  <div><b>Ley de Fitts:</b> Botones de acción principales amplios (≥44px touch target) y ubicados en posiciones de fácil alcance.</div>
                </div>
                <div className="heuristic-item">
                  <span className="heuristic-badge psychology">Hick</span>
                  <div><b>Ley de Hick:</b> Progressive disclosure; segmentación de datos en pestañas y flujos paso a paso para reducir el tiempo de decisión.</div>
                </div>
                <div className="heuristic-item">
                  <span className="heuristic-badge psychology">Miller</span>
                  <div><b>Ley de Miller:</b> Agrupamiento de información (chunking) en bloques de $7 \pm 2$ datos en tarjetas de KPI y formularios.</div>
                </div>
                <div className="heuristic-item">
                  <span className="heuristic-badge accessibility">WCAG</span>
                  <div><b>WCAG 2.1/2.2 AA:</b> Contraste ≥ 4.5:1, dualidad icono + texto (no fiarse solo del color), estados `:focus-visible` para lectores y teclados.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="drawer-footer">
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Presiona <kbd className="mini-kbd">Esc</kbd> para cerrar
          </span>
          <button className="btn btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
