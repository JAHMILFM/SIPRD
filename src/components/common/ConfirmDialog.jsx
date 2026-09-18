import Modal from './Modal'

/**
 * Diálogo de confirmación accesible (Cumple Heurística #5: Prevención de Errores)
 */
export default function ConfirmDialog({
  isOpen,
  title = '¿Confirmar acción?',
  message,
  consequence,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth={460}>
      <div className="confirm-dialog-content">
        <div className="confirm-icon" aria-hidden="true">
          {isDestructive ? '⚠️' : 'ℹ️'}
        </div>
        <div>
          <p className="confirm-message">{message}</p>
          {consequence && (
            <div className="confirm-consequence">
              <strong>Impacto:</strong> {consequence}
            </div>
          )}
        </div>
      </div>

      <div className="modal-ft" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
