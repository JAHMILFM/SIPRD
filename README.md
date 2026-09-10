# SIPRD — Sistema Inteligente de Planificación de Rutas de Distribución

**Cliente:** Alfa Distribuidores S.A.  
**Curso:** Integrador II  
**Marco de trabajo:** Kanban  
**Estado:** Desarrollo activo · Sprint 1

---

## Descripción

SIPRD reemplaza el proceso manual y el uso de DispatchTrack (USD 7–8 k/año) para la planificación diaria de rutas de reparto en Alfa Distribuidores.  
Permite al asistente de Distribución generar, revisar y aprobar rutas optimizadas directamente desde el navegador, sin depender de sistemas externos de pago.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| UI | React 18 + Vite 5 |
| Estilos | CSS puro (custom properties, sin frameworks) |
| Lógica de planificación | `src/lib/planner.js` — heurística greedy + ventana horaria |
| Estado | React Context (AuthContext, AuditContext) |
| Persistencia | In-memory + localStorage (sesión de usuario) |
| Backend | **Pendiente** — `planner.js` es reemplazable por `POST /api/planes/optimizar` |

---

## Módulos del sistema

| Módulo | Archivo | Descripción |
|--------|---------|-------------|
| **Inicio** | `Inicio.jsx` | Dashboard: KPIs del día, progreso de flota, actividad reciente |
| **Algoritmo** | `App.jsx + FleetTrial + OrdersPanel + RouteMap + TruckStats` | Tanteo de flota, generación y aprobación de rutas |
| **Rutas** | `Rutas.jsx` | Gestión en vivo: reordenar paradas, bloqueos, GPS simulado |
| **Cobranzas** | `Cobranzas.jsx` | Validación de pagos: efectivo, transferencia, cheque |
| **Configuración** | `Configuracion.jsx` | Maestro de vehículos y reglas por cliente |
| **Registros** | `Registros.jsx` | Log de auditoría (RF-13 / RNF-09) |

---

## Roles y acceso (RNF-02)

| Rol | Usuario (demo) | Contraseña | Módulos |
|-----|---------------|-----------|---------|
| Jefe de Distribución | `dhuerta` | `jefe123` | **Todo** + aprobar rutas |
| Asistente de Distribución | `asistente` | `dist123` | Inicio, Algoritmo, Rutas, Cobranzas |
| Administrador TI | `admin.ti` | `ti2026` | Configuración, Registros |

---

## Requerimientos implementados

### Funcionales
| RF | Estado | Dónde |
|----|--------|-------|
| RF-01 Obtención de pedidos | ✅ | `data/mock.js` · `OrdersPanel` |
| RF-02 Gestión de reglas de clientes | ✅ | `Configuracion.jsx` > Reglas |
| RF-03 Validación de días de recepción | ✅ | `planner.js → separarReprogramados()` |
| RF-04 Organización por vehículo + vehículo sugerido | ✅ | `mock.js → vehiculoSugerido` · `OrdersPanel > Rutas` |
| RF-05 Generación de rutas optimizadas | ✅ | `planner.js → planificar()` |
| RF-06 Detección de restricciones incompatibles | ✅ | `sinAsignar[].motivo` · conflictos de ventana · pestaña "Sin asignar" |
| RF-07 Visualización de planificación | ✅ | `OrdersPanel` · `RouteMap` · `TruckStats` |
| RF-08 Ajuste manual de secuencia | ✅ | `Rutas.jsx` → botones ↑↓ |
| RF-09 Aprobación de rutas (usuario + fecha + hora) | ✅ | Modal de aprobación en Algoritmo |
| RF-10 Reoptimización de pendientes | ✅ | `Rutas.jsx` → "Recalcular pendientes" |
| RF-11 Transferencia a App Distribución | ✅ (simulado) | Interfaz desacoplada en `planner.js` |
| RF-12 Recepción de estados e incidencias | ✅ (simulado) | `Rutas.jsx` · `Cobranzas.jsx` |
| RF-13 Trazabilidad de cambios | ✅ | `AuditContext` · `Registros.jsx` |

### No funcionales
| RNF | Estado | Notas |
|-----|--------|-------|
| RNF-01 Rendimiento ≤ 30 s | ✅ preparado | `recalcular()` simula job async; en prod → backend |
| RNF-02 Autenticación y roles | ✅ | `AuthContext` + Login + Sidebar filtrado |
| RNF-04 Usabilidad | ✅ | Tarea principal en ≤ 3 clics |
| RNF-05 Mantenibilidad | ✅ | `planner.js` desacoplado de la UI |
| RNF-06 Integridad de datos | ✅ | Sin pedidos duplicados; `separarReprogramados` previo a asignación |
| RNF-08 Interoperabilidad | ✅ | `planner.js` sustituible por API sin tocar la UI |
| RNF-09 Auditabilidad | ✅ | `AuditContext` registra usuario, rol, fecha, hora, acción |

---

## Estructura del proyecto

```
siprd-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Cobranzas.jsx       # Módulo validación de pagos
│   │   ├── Configuracion.jsx   # Maestro vehículos + reglas cliente
│   │   ├── FleetTrial.jsx      # Tanteo de flota (escenarios N vehículos)
│   │   ├── Inicio.jsx          # Dashboard del día
│   │   ├── Login.jsx           # Pantalla de autenticación
│   │   ├── OrdersPanel.jsx     # Tabla de pedidos, rutas, reprogramados
│   │   ├── ParamsBar.jsx       # Barra de parámetros del algoritmo
│   │   ├── Registros.jsx       # Log de auditoría
│   │   ├── RouteMap.jsx        # Mapa SVG de rutas (placeholder Leaflet)
│   │   ├── Rutas.jsx           # Gestión en vivo de paradas
│   │   ├── Sidebar.jsx         # Navegación lateral + usuario autenticado
│   │   ├── TopBar.jsx          # Cabecera de módulo
│   │   └── TruckStats.jsx      # Estadísticas por camión
│   ├── context/
│   │   ├── AuthContext.jsx     # Autenticación + roles (RNF-02)
│   │   └── AuditContext.jsx    # Log de auditoría (RF-13 / RNF-09)
│   ├── data/
│   │   ├── mock.js             # Pedidos, vehículos, constantes
│   │   └── mockRutas.js        # Rutas activas, cobros, config vehículos
│   ├── lib/
│   │   └── planner.js          # Motor de optimización (reemplazable por API)
│   ├── App.jsx                 # Enrutamiento de módulos + control de acceso
│   ├── index.css               # Design system (custom properties, sin framework)
│   └── main.jsx                # Punto de entrada + proveedores de contexto
├── .gitignore
├── package.json
├── README.md
└── vite.config.js
```

---

## Instalación y ejecución

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd siprd-frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
# → http://localhost:5173

# Compilar para producción
npm run build
```

---

## Modelo de ramas (Git Flow simplificado)

```
main              ← producción / releases estables
develop           ← integración de features en desarrollo
feature/*         ← desarrollo de funcionalidades específicas
```

| Rama | Propósito |
|------|-----------|
| `main` | Código estable entregado al cliente |
| `develop` | Integración de sprints |
| `feature/backend-integration` | Conexión con API real (reemplaza `planner.js` mock) |
| `feature/auth-real` | Autenticación real (JWT, AD/LDAP de Alfa) |

### Convención de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
docs:     documentación
refactor: refactorización sin cambio de comportamiento
test:     pruebas
chore:    configuración, dependencias
```

**Ejemplo:**
```bash
git commit -m "feat(rutas): agregar recálculo automático ante incidencia — RF-10"
```

---

## Próximos pasos (Sprint 2)

- [ ] Conectar `planner.js` con backend real (`POST /api/planes/optimizar`)
- [ ] Integrar mapa real con `react-leaflet` + OSRM
- [ ] Autenticación real (JWT / Active Directory)
- [ ] WebSocket para GPS en tiempo real
- [ ] Persistencia de rutas aprobadas en base de datos
- [ ] Exportar plan a Excel / PDF para el conductor

---

## Equipo

| Nombre | Rol |
|--------|-----|
| Dennys Huerta | Jefe de Distribución (usuario clave) |
| Lesli Pomalaya | Asistente de Distribución (usuario principal) |
| Equipo Integrador II | Desarrollo |

---

*Alfa Distribuidores S.A. · SIPRD v0.1 · 2026*
