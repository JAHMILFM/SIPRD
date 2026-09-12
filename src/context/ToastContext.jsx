import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id))
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Limpiar todos los timers al desmontar el proveedor
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timerId) => clearTimeout(timerId))
      timers.clear()
    }
  }, [])

  const showToast = useCallback(({
    type = 'info', // 'success' | 'error' | 'warning' | 'info'
    title,
    message,
    duration = 4000,
    action = null, // { label: string, onClick: () => void }
  }) => {
    const id = ++toastId
    const newToast = { id, type, title, message, duration, action }

    setToasts((prev) => [...prev, newToast])

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id)
      }, duration)
      timersRef.current.set(id, timer)
    }

    return id
  }, [removeToast])

  const toast = useMemo(() => ({
    success: (msg, opts = {}) => showToast({ type: 'success', message: msg, ...opts }),
    error: (msg, opts = {}) => showToast({ type: 'error', message: msg, ...opts }),
    warning: (msg, opts = {}) => showToast({ type: 'warning', message: msg, ...opts }),
    info: (msg, opts = {}) => showToast({ type: 'info', message: msg, ...opts }),
    dismiss: removeToast,
  }), [showToast, removeToast])

  const value = useMemo(
    () => ({ toast, showToast, removeToast }),
    [toast, showToast, removeToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => {
          const icon =
            t.type === 'success' ? '✓' :
            t.type === 'error' ? '✕' :
            t.type === 'warning' ? '⚠️' : 'ℹ️'

          return (
            <div key={t.id} className={`toast-item toast-${t.type}`} role="alert">
              <div className="toast-icon" aria-hidden="true">{icon}</div>
              <div className="toast-content">
                {t.title && <div className="toast-title">{t.title}</div>}
                <div className="toast-message">{t.message}</div>
              </div>
              {t.action && (
                <button
                  type="button"
                  className="toast-action-btn"
                  onClick={() => {
                    t.action.onClick?.()
                    removeToast(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast-close"
                onClick={() => removeToast(t.id)}
                aria-label="Cerrar notificación"
              >
                ×
              </button>
              {t.duration > 0 && (
                <div
                  className="toast-progress-bar"
                  style={{ animationDuration: `${t.duration}ms` }}
                />
              )}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de un ToastProvider')
  }
  return ctx
}
