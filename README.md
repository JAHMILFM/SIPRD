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

En Windows, ejecutar `iniciar_sistema.bat` desde la carpeta del proyecto. El
lanzador usa `.venv`, instala las dependencias que falten y espera a que respondan
el motor (8001), el backend (8000) y el frontend (5173). Los procesos se ejecutan
en segundo plano y sus errores quedan en `.local/logs/`.

Requisitos: Python 3.12 o 3.13 y Node.js 18 o posterior con npm. La primera
instalación requiere internet. Sin `.env`, el backend utiliza la base SQLite de
desarrollo `backend/siprd_dev.db` y carga sus datos de demostración al arrancar.
Si ya existe `.env`, se respeta su conexión configurada; no se reemplaza por el
ejemplo de PostgreSQL para un arranque local.

Para iniciar manualmente, desde la raíz del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm.cmd ci
# Ejecutar cada servicio en una terminal diferente, siempre desde esta carpeta:
.\.venv\Scripts\python.exe -m uvicorn motor.api.main:app --host 127.0.0.1 --port 8001
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
npm.cmd run dev
```

Verificación: `http://127.0.0.1:8001/salud` comprueba el motor y
`http://127.0.0.1:8000/listo` comprueba el backend y su base de datos.
La interfaz se abre en `http://localhost:5173/`. `npm run dev` por sí solo inicia
únicamente el frontend; el inicio de sesión y las operaciones API necesitan el backend.

Comandos del frontend:

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


## Carga de datos integrada con PostgreSQL

La interfaz de Inicio, Algoritmo, Rutas, Cobranzas y Configuración obtiene su información de `GET /api/v1/datos`. Si la API no responde, muestra un error y permite reintentar. El inicio de sesión requiere autenticación real; no sustituye un rechazo del servidor por una cuenta local.

1. Crear una base PostgreSQL vacía o utilizar la configurada en `.env`. Esta instalación utiliza `siprd_grupo`.
2. Definir `DATABASE_URL=postgresql+asyncpg://USUARIO:CLAVE@127.0.0.1:5432/siprd_grupo` en `.env`. La contraseña incluida en DATABASE_URL debe corresponder a PostgreSQL; los parámetros POSTGRES separados no reemplazan esa contraseña. Codificar caracteres especiales de la contraseña para una URL.
3. Ejecutar `iniciar_sistema.bat` desde Windows. El backend crea tablas faltantes, aplica las columnas aditivas necesarias y carga la jornada simulada cuando `DATOS_DEMO=true`.
4. Abrir `http://localhost:5173/` e iniciar sesión. Si había una instancia anterior abierta, cerrarla y volver a ejecutar el iniciador. `SIPRD_API_PORT` configura tanto la API como el proxy del frontend; en este equipo se utiliza 8002 para evitar la instancia anterior de 8000.

La jornada simulada está fechada el 10/10/2026 e incorpora 24 clientes, 32 pedidos (24 en rutas y 8 pendientes), 24 reglas, 3 rutas, 9 cobros, 9 comprobantes PDF claramente identificados como simulados y 3 incidencias. Se conservan los 12 clientes/pedidos/reglas y los 7 vehículos anteriores. Los totales de esta instalación son 36 clientes, 44 pedidos, 36 reglas y 7 vehículos.

El lote utiliza códigos `DEMO-*` y UUID deterministas. Repetir el arranque no duplica la jornada ni restaura valores editados. `DATOS_DEMO=false` impide agregar el lote; no elimina lo ya cargado. Las reglas se desactivan conservando su registro. Los cambios de capacidades/conductor, reglas y contraste de cobros se guardan en la base. Las rutas confirmadas conservan su secuencia.

Las propuestas se generan y guardan como BORRADOR. Asistente y Jefe asignan repartidores desde Planificación y confirman el despacho. Solo las propuestas CONFIRMADAS aparecen en Reparto. Al confirmar, el servidor vuelve a comprobar capacidades, reglas de atención, disponibilidad y asignación; las rutas confirmadas no se editan.

Cuentas de desarrollo existentes: dhuerta / jefe123, lpomalaya / dist123, admin.ti / ti2026, elopez / rep123 y tesoreria / teso123.

Verificación de integración con PostgreSQL, con escrituras dentro de una transacción que se revierte al terminar:

```powershell
.\.venv\Scripts\python.exe -m unittest backend.tests.test_datos_integracion -v
```

El respaldo anterior a esta carga está en `.local/backups/siprd_grupo_antes_datos_20261010.backup`. El esquema original conservado en la conexión anterior permanece separado en `siprd_original_20261009`.


## Requisitos funcionales: entrega 0.3.0

Se implementaron pantallas y operaciones para 27 de los 31 RF actualizados. Esta entrega deja cuatro requisitos pendientes por decisión del usuario:

| Código | Función pendiente | Motivo de aplazamiento |
| --- | --- | --- |
| RF-INT-01 | Importación desde la base corporativa | Falta definir fuente real, estructura y conexión. La carga JSON existente no acredita esta integración. |
| RF-PLAN-03 | Cambiar manualmente pedido, vehículo o secuencia de una propuesta | Requiere un editor y validación integral de la asignación modificada. |
| RF-PLAN-05 | Reprogramar/reoptimizar con nuevas versiones | Requiere versionado y conservación de la ejecución de la versión anterior. |
| RF-COB-06 | Corregir cobros observados | Requiere el flujo de subsanación y nuevo contraste. Adjuntar antes del primer contraste no sustituye este requisito. |

Accesos de los módulos:

- Administrador: Usuarios y Auditoría.
- Jefe y Asistente: Inicio, Planificación, Rutas, Incidencias y Configuración. Jefe también consulta Auditoría.
- Repartidor: sus rutas confirmadas, evidencia fotográfica, incidencias y registro de cobros con fotografía del comprobante.
- Tesorería: bandeja de cobros, comprobantes, contraste CONFORME/OBSERVADO, motivo y referencia manual al movimiento bancario o arqueo, y Excel auténtico `.xlsx`.

El contraste bancario lo realiza Tesorería; no hay conexión automática con un banco. La evidencia de entrega y el comprobante son archivos distintos. La carga verifica tipo, firma de formato y límite de 5 MB. Las consultas/adjuntos de reparto comprueban pertenencia. Los permisos consultan el estado y rol actuales del usuario en la base de datos.

Ejecutar `iniciar_sistema.bat` y recargar el navegador con Ctrl+F5. El iniciador detecta versiones de API anteriores a 0.3.0 y solo detiene el proceso si corresponde al Python y módulo de este proyecto. Si Windows impide identificarlo, cerrar manualmente la terminal del backend anterior y ejecutar nuevamente el iniciador.

Pruebas de los flujos completos, permisos y persistencia, con rollback de escrituras y adjuntos de prueba temporales:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
npm test
npm run build
```

Los ensayos de API se realizaron contra PostgreSQL y contra una instalación SQLite aislada. La aceptación visual de las nuevas pantallas debe repetirse tras reiniciar la instancia que atiende al navegador. El informe Word anterior conserva los resultados manuales históricos; no se cambió automáticamente a “cumple” por existir código nuevo.

Respaldo anterior a esta entrega: `.local/backups/siprd_antes_rf_20261010.backup`. Las migraciones agregan columnas; no eliminan tablas ni registros existentes.


### Conservación del diseño anterior

Se recuperaron las pantallas anteriores de Inicio, Algoritmo, Rutas, Cobranzas, Configuración y Registros, con sus tarjetas, tablas, mapas, pestañas, colores y barra lateral. Los formularios nuevos usan los botones y ventanas del mismo diseño.

- Configuración conserva la edición en tabla y agrega Nuevo vehículo, filtro de reglas por cliente e historial de reglas inactivas.
- Algoritmo conserva el tanteo, pedidos, mapas y carga por camión. Guardar como borrador genera una propuesta real; Propuestas guardadas abre la consulta, asignación de repartidores y aprobación. La vista previa de flota usa los datos actuales; el resultado del motor se revisa antes de confirmar.
- Rutas conserva el selector, indicadores, tabla y mapa. El repartidor abre Entrega / cobro desde cada parada para fotos, incidencias y cobros. La fecha permite consultar la jornada asignada.
- Cobranzas conserva indicadores, filtros y detalle. El contraste solicita referencia de banco/caja y observación. CSV sigue disponible y Excel usa el archivo autenticado del servidor.
- Usuarios e Incidencias son funciones nuevas que adoptan los estilos de las tarjetas y tablas existentes.

La compilación de producción, seis ensayos de integración con PostgreSQL y 26 pruebas de lógica de JavaScript pasaron. Se comprobó visualmente en el navegador el diseño recuperado y el formulario de registro de vehículo. La instancia anterior del backend que ya estaba abierta debe reiniciarse para la aceptación completa de los nuevos formularios.


### Correcciones 0.3.1: incidencias, usuarios y nombres

- Incidencias consulta la ruta con un JOIN explícito, evitando la carga diferida que causaba `MissingGreenlet` / HTTP 500. Se verificaron consulta general, filtro por ruta y actualización de estado.
- Registros muestra nombre completo, usuario de acceso, correo y rol de las cuentas existentes. El servidor une auditoría con usuarios; las filas del sistema se identifican como Sistema.
- Usuarios tiene una entrada propia en el menú del administrador (`admin.ti`), con búsqueda, filtros Activo/Inactivo, edición de datos y rol, desactivación y reactivación. Jefe y Asistente mantienen sus permisos operativos.
- Los 24 clientes del lote de práctica tienen nombres ficticios. Se actualizaron sus nombres en PostgreSQL sin crear usuarios ni modificar relaciones con pedidos, rutas y cobros. La actualización respeta nombres personalizados e incluye respaldo en `.local/backups/clientes_nombres_20261010.json`.

Verificación: compilación de producción, 26 pruebas JavaScript y siete ensayos de integración con PostgreSQL. El servidor previamente abierto respondía con versión 0.2.0; ejecutar `iniciar_sistema.bat` desde Windows para reiniciarlo con 0.3.1 y actualizar el navegador con Ctrl+F5. El entorno del agente no tiene acceso a los procesos de Windows del servidor anterior.


### Ampliación 0.3.2: funciones pendientes y accesos visibles

Esta entrega reemplaza los aplazamientos de RF-PLAN-03 y RF-COB-06 y agrega RF-PLAN-05 para reoptimización previa al inicio de la jornada. RF-INT-01 sigue pendiente de identificar la fuente corporativa y su estructura; leer los pedidos ya cargados en PostgreSQL no acredita su importación.

| Función | Acceso y ubicación |
| --- | --- |
| Usuarios | Entrada propia del menú para Jefe y Administrador. Edición de nombres, documento, correo, usuario, contraseña opcional, rol y estado; consulta de permisos por rol. Jefe administra cuentas operativas; Administración protege la cuenta administradora. Nadie puede desactivar su propia cuenta ni cambiar su propio rol. |
| Cobranzas | Visible para Jefe y Administrador: consulta, comprobantes y exportación. Tesorería conserva el contraste CONFORME/OBSERVADO, observaciones y referencia de banco/caja. |
| Incidencias | Tarjetas de estados, búsqueda por pedido/cliente/descripción, filtros, tabla y detalle con seguimiento. Conserva los componentes y estilos del diseño existente. |
| RF-PLAN-03 | Algoritmo → Propuestas guardadas → Editar asignaciones y secuencia. Cambia pedidos entre rutas, vehículos, repartidores y orden de visitas, incluyendo pedidos sin asignar. Valida toda la propuesta antes de guardarla. Solo se editan borradores. |
| RF-PLAN-05 | Propuestas guardadas → Crear versión de reoptimización. Motivo y flota, historial consultable y nueva aprobación. La versión anterior permanece hasta confirmar la nueva y luego queda SUPERADA. Una jornada iniciada bloquea la reoptimización para conservar entregas, incidencias y evidencias. La reoptimización durante ejecución requiere un desarrollo adicional. |
| RF-COB-06 | Repartidor → Rutas → Entrega / cobro → Subsanar cobro observado. Corrige importe, medio y operación, registra respuesta, adjunta un nuevo comprobante y vuelve a Tesorería. Conserva comprobantes previos y auditoría. Un contraste CONFORME resuelve las observaciones pendientes. |

Verificación de esta ampliación: diez ensayos de integración con PostgreSQL (escrituras revertidas al terminar), 26 pruebas JavaScript y compilación de producción. Se verificó visualmente el menú del Jefe y el diseño de Incidencias. Se prueban permisos del Jefe y protección de Administración, edición de propuesta y cambio de vehículo, versiones y conservación del historial, bloqueo tras iniciar la entrega y corrección de cobros con comprobante nuevo y segundo contraste.

**Activación:** ejecutar `iniciar_sistema.bat` desde Windows y actualizar el navegador con Ctrl+F5. El iniciador espera API 0.3.2 y reemplaza una instancia anterior solo tras comprobar que es el proceso de este proyecto. Si no puede identificarla, cerrar la terminal del backend anterior y ejecutar nuevamente el iniciador. La instancia anterior en 8002 no se pudo reiniciar desde el entorno aislado del agente; las pruebas usan el código actualizado con PostgreSQL. Los resultados del Word anterior siguen siendo históricos y requieren una nueva aceptación manual.


### Corrección 0.3.3: permiso del Jefe y cobranzas relacionadas

La API permite a JEFE y ADMINISTRADOR consultar y administrar las cuentas operativas. El Jefe consulta cobranzas y comprobantes; Tesorería contrasta los pagos. Una instancia 0.3.1 ya abierta sigue ejecutando los permisos anteriores: reiniciar con `iniciar_sistema.bat` y actualizar con Ctrl+F5. Usuarios y Cobranzas muestran un aviso específico cuando detectan esa versión anterior, evitando confundir un despliegue pendiente con falta de datos.

Se mejoraron los nueve cobros existentes de la jornada ficticia del 10/10/2026, ligados a pedidos, clientes con nombre, paradas y el repartidor existente. Las notas describen conciliación, cotejo bancario y comprobantes ilegibles. Los números de operaciones digitales y los horarios de Lima son coherentes con las entregas. Los pagos en efectivo no tienen un número bancario inventado. Los pedidos íntegramente conciliados quedan CERRADOS. El número de ruta procede de la parada asociada, no del ID del vehículo. Las referencias internas del lote y el origen SIMULADO se conservan para identificar los datos ficticios; los comprobantes de práctica conservan su identificación y no se presentan como documentos reales.

La actualización solo sustituye etiquetas genéricas originales, respeta notas personalizadas y es idempotente. Se aplicó a PostgreSQL con respaldo `.local/backups/cobranzas_antes_ajuste_20261010_135519.json`; no crea usuarios ni duplica cobros. El iniciador espera versión 0.3.3. El entorno aislado del agente no puede reiniciar los procesos del servidor abierto en Windows.
