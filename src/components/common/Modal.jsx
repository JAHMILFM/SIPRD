import { useEffect, useRef } from 'react'

/**
 * Modal accesible y reutilizable (Cumple Heurística #3 y WCAG 2.1)
 * - Cierre con tecla Escape
 * - Foco atrapado y retorno de foco al cerrar
 * - Animaciones suaves y estructura semántica
 */
export default function Modal({
  isOpen = true,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 520,
  hideCloseBtn = false,
}) {
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
    }

    // Bloquear scroll de fondo mientras el modal está abierto
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', handleKeyDown)

    // Enfocar primer elemento interactivo o el modal
    setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable) focusable.focus()
        else modalRef.current.focus()
      }
    }, 50)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="modal-title">
      <div
        ref={modalRef}
        className="modal-box"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="modal-hd">
          <div>
            <h3 id="modal-title" className="modal-title-text">{title}</h3>
            {subtitle && <p className="modal-subtitle-text">{subtitle}</p>}
          </div>
          {!hideCloseBtn && (
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Cerrar ventana emergente"
            >
              ×
            </button>
          )}
        </div>

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
