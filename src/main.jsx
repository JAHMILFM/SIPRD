import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { AuditProvider } from './context/AuditContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AuditProvider>
        <App />
      </AuditProvider>
    </AuthProvider>
  </React.StrictMode>
)
