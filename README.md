# SIPRD — Sistema Inteligente de Planificación de Rutas de Distribución

**Cliente:** Alfa Distribuidores S.A.  
**Curso:** Integrador II  
**Marco de trabajo:** Kanban  
**Estado:** Desarrollo activo · Sprint 1  
**Repositorio GitHub:** [https://github.com/JAHMILFM/SIPRD.git](https://github.com/JAHMILFM/SIPRD.git)

---

## Descripción

SIPRD reemplaza el proceso manual y el uso de DispatchTrack (USD 7–8 k/año) para la planificación diaria de rutas de reparto en Alfa Distribuidores.  
Permite al asistente de Distribución generar, revisar y aprobar rutas optimizadas directamente desde el navegador, sin depender de sistemas externos de pago.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| UI | React 18 + Vite 5 |
| Estilos & Design System | CSS puro (custom properties, tokens 4px/8px, WCAG 2.1/2.2 AA, sin dependencias pesadas) |
| Lógica de planificación | `src/lib/planner.js` — heurística greedy CVRPTW + ventana horaria |
| Estado global | React Context (`AuthContext`, `AuditContext`, `ToastContext`) |
| Persistencia | In-memory + localStorage (sesión de usuario) |
| Backend | **Pendiente** — `planner.js` es reemplazable por `POST /api/planes/optimizar` |

---

## Marco y Criterios de UX / UI Implementados

El sistema fue diseñado y auditado bajo estándares de usabilidad, ergonomía cognitiva y accesibilidad universal:

### 1. Las 10 Heurísticas de Jakob Nielsen
| # | Heurística | Implementación en SIPRD | Dónde verificarlo |
|---|------------|-------------------------|-------------------|
| **H1** | **Visibilidad del estado del sistema** | Sistema global de Toasts animados con barra de progreso, estados de cálculo («Optimizando…»), indicador en vivo de sincronización en TopBar. | `ToastContext.jsx`, `TopBar.jsx`, `FleetTrial.jsx` |
| **H2** | **Correspondencia con el mundo real** | Terminología logística familiar de Alfa Distribuidores: «Bultos», «Jornada», «Ventana horaria», «Paradas», «Comprobantes». | Todo el sistema |
| **H3** | **Control y libertad del usuario** | Función **«Deshacer» (Undo)** tras reordenar paradas en vivo, desbloquear paradas, validar cobros o eliminar reglas. Cierre de todos los modales con tecla `Escape`. | `Rutas.jsx`, `Cobranzas.jsx`, `Configuracion.jsx`, `Modal.jsx` |
| **H4** | **Consistencia y estándares** | Design System centralizado con colores semánticos, variantes de botones uniformes (`btn-primary`, `btn-secondary`, `btn-danger`), inputs y modales consistentes. | `index.css`, `common/` |
| **H5** | **Prevención de errores** | Diálogo modal de confirmación destructiva antes de eliminar reglas de clientes (`ConfirmDialog`). Campo obligatorio de justificación antes de rechazar cobros. | `Configuracion.jsx`, `Cobranzas.jsx` |
| **H6** | **Reconocimiento antes que recuerdo** | Búsqueda en tiempo real con botón de limpieza rápida (✕), ordenamiento por columnas (▲/▼), contadores en pestañas y tooltips explicativos. | `OrdersPanel.jsx`, `Cobranzas.jsx`, `Registros.jsx` |
| **H7** | **Flexibilidad y eficiencia de uso** | Atajos de teclado (`Alt + 1..6`, `?`), exportación de tablas a formato CSV/Excel (rutas, flota y cobros) para usuarios avanzados. | `App.jsx`, `TruckStats.jsx`, `Cobranzas.jsx`, `Registros.jsx` |
| **H8** | **Diseño estético y minimalista** | Jerarquía visual clara, eliminación de datos redundantes, tipografía Inter con ritmos de 4px y 8px, sin sobrecarga cognitiva. | `index.css`, `Inicio.jsx` |
| **H9** | **Diagnóstico y recuperación de errores** | Validación visual inline accesible con sugerencia de solución explícita (ej. campos obligatorios en login, alertas de conflicto RF-06). | `Login.jsx`, `OrdersPanel.jsx` |
| **H10** | **Ayuda y documentación** | Centro de Ayuda deslizable (`HelpDrawer`) accesible con la tecla `?` o botón superior, con guía de módulos, tabla de atajos y matriz de usabilidad. | `common/HelpDrawer.jsx`, `TopBar.jsx` |

---

### 2. Panal de Usabilidad de Peter Morville
- **Útil:** Reemplaza licencias costosas resolviendo la optimización de capacidad y ventanas horarias.
- **Usable:** Tarea principal de despacho realizable en $\le 3$ clics con soporte de reversión inmediata.
- **Deseable:** Interfaz corporativa refinada con colores oficiales de Alfa Distribuidores, elevaciones sutiles y microanimaciones fluidas.
- **Encontrable:** Navegación lateral persistente con indicación visual de pantalla activa (`aria-current="page"`).
- **Accesible:** Cumplimiento de ratio de contraste WCAG 2.1 AA ($\ge 4.5:1$), dualidad de icono + color (apto para daltonismo) y soporte completo por teclado (`:focus-visible`).
- **Creíble:** Registro de auditoría inmutable en tiempo real con usuario, rol, fecha, hora y acción (RF-13 / RNF-09).
- **Valioso:** Ahorro directo proyectado de USD 7,000 a USD 8,000 anuales.

---

### 3. Leyes Psicológicas Aplicadas
- **Ley de Fitts:** Botones de acción principales amplios (altura $\ge 40$ px, target táctil accesible) y ubicados en posiciones de rápido alcance.
- **Ley de Hick:** Segmentación de información en pestañas progresivas (`Pedidos`, `Rutas`, `Reprogramados`, `Sin asignar`) para minimizar el tiempo de toma de decisiones.
- **Ley de Miller:** Agrupamiento de información en bloques de $7 \pm 2$ datos (ej. 6 tarjetas KPI en Inicio, paneles segmentados en Algoritmo).
- **Ley de Jakob:** Patrones de interacción estándar de la industria (pestañas superiores, botones de acción en modales a la derecha, buscador con icono y botón de borrado).
- **Efecto de Posición Serial:** Colocación de las acciones más críticas al inicio y al final de los flujos de trabajo (ej. Tanteo al inicio, Aprobación al pie).

---

## Atajos de Teclado del Sistema

| Atajo | Acción |
|-------|--------|
| `Alt + 1` | Navegar a **Inicio** |
| `Alt + 2` | Navegar a **Algoritmo de Ruteo** |
| `Alt + 3` | Navegar a **Gestión de Rutas** |
| `Alt + 4` | Navegar a **Cobranzas** |
| `Alt + 5` | Navegar a **Configuración** |
| `Alt + 6` | Navegar a **Registros de Auditoría** |
| `?` o `Shift + /` | Abrir / cerrar **Centro de Ayuda y Heurísticas** |
| `Esc` | Cerrar cualquier modal o panel lateral abierto |

---

## Módulos del sistema

| Módulo | Archivo | Descripción |
|--------|---------|-------------|
| **Inicio** | `Inicio.jsx` | Dashboard: KPIs del día, progreso de flota, actividad reciente en vivo |
| **Algoritmo** | `App.jsx + FleetTrial + OrdersPanel + RouteMap + TruckStats` | Tanteo de flota CVRPTW, generación y aprobación accesible de rutas |
| **Rutas** | `Rutas.jsx` | Gestión en vivo: reordenar paradas con **Deshacer**, bloqueos, GPS simulado |
| **Cobranzas** | `Cobranzas.jsx` | Validación de pagos con reversión, rechazo justificado y exportación a CSV |
| **Configuración** | `Configuracion.jsx` | Maestro de vehículos y reglas por cliente con confirmación destructiva |
| **Registros** | `Registros.jsx` | Log de auditoría en tiempo real con exportación CSV (RF-13 / RNF-09) |

---

## Roles y acceso (RNF-02)

| Rol | Usuario (demo) | Contraseña | Módulos |
|-----|---------------|-----------|---------|
| Jefe de Distribución | `dhuerta` | `jefe123` | **Todo** + aprobar y despachar rutas |
| Asistente de Distribución | `asistente` | `dist123` | Inicio, Algoritmo, Rutas, Cobranzas |
| Administrador TI | `admin.ti` | `ti2026` | Configuración, Registros |

---

## Estructura del proyecto

```
siprd-frontend/
├── public/
│   └── login-bg.png            # Asset de fondo para pantalla corporativa
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Modal.jsx         # Modal accesible con Escape y trampa de foco (H3)
│   │   │   ├── ConfirmDialog.jsx # Diálogo destructivo para prevención de errores (H5)
│   │   │   └── HelpDrawer.jsx    # Centro de Ayuda y matriz de heurísticas UX (H10)
│   │   ├── Cobranzas.jsx         # Validación de pagos con Undo y exportación CSV
│   │   ├── Configuracion.jsx     # Maestro vehículos + reglas cliente con ConfirmDialog
│   │   ├── FleetTrial.jsx        # Tanteo de flota (escenarios N vehículos)
│   │   ├── Inicio.jsx            # Dashboard del día con KPIs y filtros
│   │   ├── Login.jsx             # Pantalla de autenticación corporativa WCAG 2.1
│   │   ├── OrdersPanel.jsx       # Tabla con búsqueda (✕), ordenamiento y conflictos
│   │   ├── ParamsBar.jsx         # Barra de parámetros del algoritmo
│   │   ├── Registros.jsx         # Log de auditoría con exportación a CSV
│   │   ├── RouteMap.jsx          # Mapa SVG de rutas con leyenda
│   │   ├── Rutas.jsx             # Gestión en vivo con soporte de Deshacer (Undo)
│   │   ├── Sidebar.jsx           # Navegación con atajos de teclado y ayuda
│   │   ├── TopBar.jsx            # Cabecera con estado en línea y botón de ayuda
│   │   └── TruckStats.jsx        # Estadísticas de camiones con exportación CSV
│   ├── context/
│   │   ├── AuthContext.jsx       # Autenticación + roles (RNF-02)
│   │   ├── AuditContext.jsx      # Log de auditoría (RF-13 / RNF-09)
│   │   └── ToastContext.jsx      # Sistema global de notificaciones y Deshacer (H1/H3)
│   ├── data/
│   │   ├── mock.js               # Pedidos, vehículos, constantes
│   │   └── mockRutas.js          # Rutas activas, cobros, config vehículos
│   ├── lib/
│   │   └── planner.js            # Motor de optimización CVRPTW
│   ├── App.jsx                   # Enrutamiento, atajos globales y modales accesibles
│   ├── index.css                 # Design system (tokens 4px/8px, WCAG 2.1 AA, Toasts)
│   └── main.jsx                  # Punto de entrada con proveedores de contexto
├── .gitignore
├── package.json
├── README.md
└── vite.config.js
```

---

## Instalación y ejecución

```bash
# Clonar el repositorio desde GitHub
git clone https://github.com/JAHMILFM/SIPRD.git
cd siprd-frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
# → http://localhost:5173

# Compilar para producción (validación de build)
npm run build
```

---

## Modelo de ramas y Control de Versiones

Se utiliza una estrategia basada en **Conventional Commits**:

```
main              ← producción / releases estables y auditadas
develop           ← integración de features en desarrollo
feature/*         ← desarrollo de funcionalidades específicas
```

### Historial de Commits del Sprint UI/UX:
- `feat(ui-system)`: implementar tokens accesibles, sistema de botones, toasts y modales
- `feat(ux-navigation)`: incorporar atajos de teclado, navegación accesible y centro de ayuda
- `feat(login)`: rediseñar autenticación con validación WCAG y ergonomía demo
- `feat(algoritmo)`: ordenamiento de pedidos, exportación CSV y modales accesibles
- `feat(operaciones)`: control de desecho, prevención de errores y exportación de cobros
- `docs`: matriz completa de cumplimiento UI/UX y auditoría de usabilidad

---

## Equipo

| Nombre | Rol |
|--------|-----|
| Dennys Huerta | Jefe de Distribución (usuario clave) |
| Lesli Pomalaya | Asistente de Distribución (usuario principal) |
| Equipo Integrador II | Desarrollo |

---

*Alfa Distribuidores S.A. · SIPRD v0.1 · 2026*
