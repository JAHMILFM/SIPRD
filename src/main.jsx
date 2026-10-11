import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { AuditProvider } from './context/AuditContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import { OperacionProvider } from './context/OperacionContext'
import './index.css'
import 'leaflet/dist/leaflet.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AuditProvider>
          <ToastProvider>
            <OperacionProvider><App /></OperacionProvider>
          </ToastProvider>
        </AuditProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
