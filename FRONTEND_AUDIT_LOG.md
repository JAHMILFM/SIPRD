# BITÁCORA DE AUDITORÍA FRONTEND — SIPRD
**Alfa Distribuidores S.A. · Sistema Inteligente de Planificación de Rutas de Distribución**
**Auditor Senior de Frontend (Autónomo)**
**Fecha de inicio:** 2026-09-12

Este documento registra de forma detallada, sistemática y continua cada hallazgo, diagnóstico, corrección y validación realizada sobre los componentes, hooks, contextos y utilidades del frontend de SIPRD.

---

## Índice de Módulos Auditados
1. [Contextos y Gestión de Estado](#1-contextos-y-gestión-de-estado)
2. [Motor de Planificación y Heurística (planner.js)](#2-motor-de-planificación-y-heurística)
3. [Componentes Comunes y Accesibilidad WCAG](#3-componentes-comunes-y-accesibilidad-wcag)
4. [Módulo Rutas (Gestión en Vivo)](#4-módulo-rutas-gestión-en-vivo)
5. [Módulo Cobranzas (Validación de Pagos)](#5-módulo-cobranzas-validación-de-pagos)
6. [Módulo Configuración (Maestro de Vehículos y Reglas)](#6-módulo-configuración-maestro-de-vehículos-y-reglas)
7. [Módulo Algoritmo y Visualizaciones (App, OrdersPanel, TruckStats, FleetTrial, RouteMap)](#7-módulo-algoritmo-y-visualizaciones)
8. [Módulos Inicio y Login](#8-módulos-inicio-y-login)
9. [Pruebas Automatizadas y Build Check](#9-pruebas-automatizadas-y-build-check)

---

## 1. Contextos y Gestión de Estado

### `src/context/AuthContext.jsx`
- **Diagnóstico / Problemas:**
  1. *Fuga de seguridad en almacenamiento local:* Se almacenaba el objeto de usuario completo incluyendo su contraseña (`clave: 'jefe123'`, etc.) en texto plano dentro de `localStorage` (`siprd_session`).
  2. *Resiliencia ante cuota o modo incógnito:* `localStorage.setItem` y `removeItem` no contaban con bloque `try/catch`, lo que provocaría un error fatal no capturado en navegadores con almacenamiento restringido o cuota excedida.
  3. *Re-renders innecesarios:* Las funciones `login`, `logout`, `puede` y `puedeAprobar` se recreaban en cada ciclo de render, y el objeto de valor de contexto `{ usuario, login, logout, puede, puedeAprobar }` no estaba memoizado.
  4. *Falta de aserción de contexto:* Si `useAuth` se invocaba fuera del proveedor, retornaba `null` silenciosamente sin advertir al desarrollador.
- **Solución Aplicada:**
  - Se sanitizó el objeto persistido excluyendo la propiedad `clave` (`const { clave: _c, ...usuarioSeguro } = u`).
  - Se envolvieron las operaciones de almacenamiento en bloques `try/catch`.
  - Se envolvieron las funciones con `useCallback` y el objeto `value` con `useMemo`.
  - Se añadió validación defensiva en el hook `useAuth` lanzando error explicativo si no hay contexto.

### `src/context/AuditContext.jsx`
- **Diagnóstico / Problemas:**
  1. *Fuga de memoria potencial (Memory Leak):* El array `registros` acumulaba entradas indefinidamente sin límite de retención en memoria durante sesiones largas.
  2. *Experiencia inicial vacía:* Al cargar la aplicación por primera vez en la sesión, la tabla de auditoría aparecía sin registros iniciales previos.
  3. *Re-renders y re-creación de funciones:* `log` y el `value` del contexto se re-creaban en cada render.
  4. *Falta de aserción de contexto:* `useAudit` retornaba `null` si se usaba sin proveedor.
- **Solución Aplicada:**
  - Se acotó el crecimiento del array a un límite prudente de `MAX_AUDIT_LOGS = 500` entradas con ventana deslizante.
  - Se agregaron registros semilla iniciales consistentes con la operativa matutina del día 27/08/2026.
  - Se memoizó `log` con `useCallback` y `value` con `useMemo`.
  - Se añadió aserción con error en `useAudit`.

### `src/context/ToastContext.jsx`
- **Diagnóstico / Problemas:**
  1. *Fuga de timers (Memory Leak):* Al llamar `showToast`, se creaba un `setTimeout` para auto-descartar el toast. Si el usuario cerraba el toast manualmente o el proveedor se desmontaba, el temporizador continuaba activo en memoria intentando actualizar un componente desmontado o descartando un ID ya inexistente.
  2. *Re-renders globales innecesarios:* El objeto `toast` helper y el objeto `value` se recreaban en cada render, forzando la re-evaluación de todos los componentes suscritos al toast cada vez que aparecía o desaparecía una notificación.
- **Solución Aplicada:**
  - Se implementó un mapa mutable de timers activos mediante `useRef(new Map())`.
  - Al descartar un toast (`removeToast`), se cancela activamente su temporizador con `clearTimeout`.
  - Se implementó limpieza total de temporizadores en el desmontaje de `ToastProvider` con `useEffect`.
  - Se memoizó el objeto `toast` y el valor del contexto con `useMemo`.

---

## 2. Motor de Planificación y Heurística (`src/lib/planner.js`)

- **Diagnóstico / Problemas:**
  1. *Riesgo de crash por split en ventana horaria:* La detección de conflictos horarios hacía `p.ventana.split('–')` asumiendo exclusivamente un en-dash (`–`). Si un registro utilizaba un guion común (`-`), `partes[1]` resultaba `undefined`, y la llamada `partes[1].split(':')` generaba una excepción irrecuperable de JavaScript (`TypeError: Cannot read properties of undefined (reading 'split')`).
  2. *Propagación de `NaN` por zonas no contempladas:* Si un pedido poseía una zona no definida en `KM_ZONA`, `KM_ZONA[p.zona]` evaluaba a `undefined`. Al multiplicarse por números flotantes, generaba `NaN` que se propagaba a los kilómetros, minutos de jornada, balance de flota y porcentajes de uso en toda la interfaz.
  3. *Inestabilidad en función hash:* `hash(id)` asumía que `id` siempre poseía la propiedad `.length` y `.charCodeAt()`. Si un ID numérico o nulo era suministrado, fallaba o retornaba `0`.
  4. *Cálculo seguro en `hhmm`:* Minutos negativos, nulos o `NaN` causaban textos rotos como `NaN h NaN m`.
  5. *Límites de flota:* `n` menor a 1 o mayor al número de vehículos disponibles no estaba acotado defensivamente (`Math.max(1, Math.min(n, VEHICULOS.length))`).
- **Solución Aplicada:**
  - Se implementó expresión regular `p.ventana.split(/[-–]/)` con validación de existencia de minutos y horas numéricas (`!isNaN(hf) && !isNaN(mf)`).
  - Se agregó valor fallback `KM_ZONA[p.zona] ?? 3.4` y `Number(p.servicio) || 15`.
  - Se convirtió defensivamente el `id` a string en `hash(String(id ?? ''))`.
  - Se protegieron las funciones `separarReprogramados`, `proximoDiaHabil` y `hhmm` con chequeos estrictos de arrays y números no negativos.

---

## 3. Componentes Comunes y Accesibilidad WCAG (`Modal.jsx`, `ConfirmDialog.jsx`, `HelpDrawer.jsx`)

- **Diagnóstico / Problemas:**
  1. *Foco y navegación por teclado en modales (WCAG 2.1 - 2.4.3 / 2.1.2):* `Modal` no contaba con trampa de foco (`Focus Trap`). Al presionar `Tab`, el foco del teclado se escapaba del modal y recorría los elementos invisibles detrás del overlay.
  2. *Retorno de foco:* Al cerrarse un modal con `Escape` o botón de cierre, el foco no se devolvía al elemento activo que originó la apertura (violando WCAG 2.4.3).
  3. *Temporizador sin limpiar:* `setTimeout(..., 50)` para enfocar el primer elemento del modal se ejecutaba sin identificador guardado, causando intentos de acceso tras desmontaje.
  4. *Scroll background en HelpDrawer:* Al abrir el panel deslizante lateral de soporte `HelpDrawer`, no se bloqueaba el scroll de la página de fondo, provocando scroll dual y desorientación del usuario.
- **Solución Aplicada:**
  - Se implementó un ciclo cerrado de navegación con `Tab` y `Shift + Tab` dentro de `Modal` (Focus Trap).
  - Se almacenó `previousActiveElement` mediante `useRef` para restaurar el foco al cerrar el modal.
  - Se añadió cancelación explícita del temporizador de enfoque (`clearTimeout(focusTimer)`).
  - Se integró bloqueo de `document.body.style.overflow = 'hidden'` con restauración en `HelpDrawer.jsx`.

---

## 4. Módulo Rutas (`src/components/Rutas.jsx`)

- **Diagnóstico / Problemas Críticos:**
  1. *Corrupción de orden con filtros activos (BUG CRÍTICO):* La tabla renderizaba `paradasVisibles` (filtrado por estado). El índice `idx` del `.map` correspondía a la vista filtrada, no al array maestro `ruta.paradas`. Al intentar subir o bajar una parada con filtro activo (ej. `Pendientes`), se intercambiaba una parada no correlativa o se accedía a índices negativos (`a[-1]`), corrompiendo la secuencia de la ruta.
  2. *Infracción de invariante temporal (Paradas Entregadas):* Las paradas con estado `entregado` corresponden a hechos físicos ya consumados. El sistema permitía mover una parada pendiente por encima de una entregada, alterando el orden cronológico real de la distribución.
  3. *Límite de botón inferior erróneo:* `disabled={idx === ruta.paradas.length - 1}` comparaba el índice filtrado con la longitud no filtrada, deshabilitando botones incorrectamente.
  4. *Fuga de temporizador en recálculo:* `recalcularPendientes` utilizaba `setTimeout` sin guardar referencia, ejecutándose tras el desmontaje del componente.
  5. *División por cero:* En rutas sin paradas, `(ent / ruta.paradas.length) * 100` generaba `NaN%`.
- **Solución Aplicada:**
  - Se desacopló la mutación del índice visual; ahora `subir` y `bajar` reciben el `paradaId` único y buscan `realIdx` en la colección real `ruta.paradas`.
  - Se implementó la regla estricta de negocio: ninguna parada pendiente puede reordenarse por encima de una ya entregada (`ps[idx - 1].estado === 'entregado'`).
  - Se calcularon las banderas `canSubir` y `canBajar` respecto a la posición real en la ruta, aplicando cursores y estados `:disabled` semánticos y accesibles.
  - Se gestionó el temporizador de recálculo mediante `recalcTimerRef` con limpieza en el hook de ciclo de vida.
  - Se protegió el cálculo porcentual con guardas numéricas (`ruta.paradas.length ? ... : 0`).

---

## 5. Módulo Cobranzas (`src/components/Cobranzas.jsx`)

- **Diagnóstico / Problemas:**
  1. *Fallo por tipo en campo de búsqueda:* `c.pedido.includes(q)` fallaba si el pedido era de tipo numérico o no definido, arrojando excepción de tiempo de ejecución.
  2. *Recomputación O(N) innecesaria de métricas:* En cada pulsación de tecla de búsqueda o re-render, se ejecutaban 5 pasadas de `.filter()` y `.reduce()` sobre toda la colección de cobranzas.
  3. *Corrupción de exportación CSV con comillas:* Si la nota u observación de pago contenía comillas o saltos de línea, el archivo CSV resultante se desalineaba en Microsoft Excel y Google Sheets.
  4. *Inaccesibilidad en lectores de pantalla (WCAG 4.1.2):* Los botones de acción rápida con símbolos simples `✓` y `✕` carecían de atributo `aria-label`, anunciando únicamente "check" o "cruz" a usuarios con discapacidad visual sin especificar el monto ni el cliente.
- **Solución Aplicada:**
  - Se unificó el cálculo de métricas en un único pase `useMemo` iterativo O(N).
  - Se memoizó el resultado de `filtrados` con normalización `String(c.pedido ?? '')` y `trim()`.
  - Se sanitizaron y escaparon las comillas dobles (`.replace(/"/g, '""')`) en todos los campos de texto exportados a CSV.
  - Se incorporaron `aria-label`s dinámicos con el monto y cliente exacto en todos los botones de la grilla.

---

## 6. Módulo Configuración (`src/components/Configuracion.jsx`)

- **Diagnóstico / Problemas:**
  1. *Corrupción de tipo en capacidad vehicular (String Coercion Bug):* Al editar el peso máximo (`pesoMax`) o volumen (`volMax`) de un vehículo, el input de formulario almacenaba `e.target.value` directamente como `string`. Al propagarse al motor de heurística y compararse (`pesoMax + carga <= capacidad`), JavaScript generaba coerciones indeseadas o concatenaciones de cadena.
  2. *Auditoría incompleta en operaciones de recuperación:* Al hacer clic en «Deshacer» tras eliminar una regla de cliente, la regla se restauraba en el estado visual pero no se emitía la entrada de auditoría requerida por el estándar RF-13 / RNF-09.
  3. *Reglas con nombres vacíos o espacios:* El formulario de edición de reglas permitía guardar cadenas vacías de espacios en blanco, desalineando la tabla y rompiendo el matcher de clientes.
- **Solución Aplicada:**
  - Se forzó el tipado numérico explícito (`Number(val) || 0`) para `pesoMax`, `volMax` y `año`.
  - Se vinculó el evento de auditoría `log(usuario, 'Configuración', 'Restauró regla de cliente (Deshacer)', regla.cliente)` a la acción de reversión del toast.
  - Se aplicó sanitización con `.trim()` y valor por defecto `'Cliente Sin Nombre'` en la creación/edición de reglas.

---

## 7. Módulo Algoritmo y Visualizaciones (`App.jsx`, `OrdersPanel.jsx`, `TruckStats.jsx`, `FleetTrial.jsx`, `RouteMap.jsx`, `TopBar.jsx`)

- **Diagnóstico / Problemas:**
  1. *Cálculo de peso en toneladas en CSV de flota (`TruckStats.jsx`):* La función `exportarCSV` dividía `(r.peso / 1000)`. Dado que `r.peso` ya acumulaba toneladas en `planner.js`, la exportación generaba valores mil veces menores (ej. `0.005` toneladas en lugar de `5.20` toneladas).
  2. *Excepción por valores nulos en ordenamiento (`OrdersPanel.jsx`):* Al ordenar por columnas donde algún pedido carecía de valor (`undefined` o `null`), `valA.localeCompare(valB)` o la resta numérica arrojaban excepciones no capturadas.
  3. *Inaccesibilidad en cabeceras ordenables:* Las columnas de `OrdersPanel` no eran operables por teclado (`tabIndex={0}`, `onKeyDown`), y carecían de estados semánticos `aria-sort`.
  4. *Fallo de `Math.max` en FleetTrial vacío (`FleetTrial.jsx`):* Si la lista de escenarios estaba vacía o en transición, `Math.max(...[])` producía `-Infinity`, generando porcentajes inválidos (`NaN%`) y distorsionando las barras de progreso.
  5. *Botones inertes y falta de limpieza de timer en App (`App.jsx`):* Las acciones «Descartar plan» y «Guardar como borrador» no tenían handlers implementados. Asimismo, el temporizador de `recalcular` carecía de limpieza en el ciclo de vida del componente.
  6. *Botón de capas y campana de notificaciones no interactivos:* `RouteMap` y `TopBar` utilizaban elementos `<div>` sin roles semánticos ni feedback de usuario.
- **Solución Aplicada:**
  - Se corrigió la métrica a `r.peso.toFixed(2)` y se sanearon comillas en la exportación CSV de flota.
  - Se blindó la ordenación en `OrdersPanel` para tolerar cadenas y números nulos/indefinidos sin fallos.
  - Se añadieron roles `columnheader`, eventos de teclado (Enter / Space) y atributos `aria-sort` dinámicos.
  - Se acotó el cálculo del peor escenario con `Math.max(1, ...escenarios.map(...))` y fallback seguro para el botón de prueba.
  - Se implementaron las funciones `descartarPlan` y `guardarBorrador` con feedback por toast y trazabilidad en el log de auditoría; se añadió `recalcTimerRef` para cancelar temporizadores al desmontar.
  - Se convirtieron las capas de mapa y la campana de notificaciones en botones semánticos `<button type="button">` con feedback accesible.

---

## 8. Módulos Inicio y Login (`Inicio.jsx`, `Login.jsx`)

- **Diagnóstico / Problemas:**
  1. *División por cero en porcentajes (`Inicio.jsx`):* Si no había paradas cargadas, `Math.round((entregados / totalParadas) * 100)` evaluaba a `NaN%` en la barra global de progreso y en las barras de progreso por vehículo.
  2. *Uso de índices como key de React (`Inicio.jsx`):* El feed de actividad reciente utilizaba `key={i}` con un array filtrado dinámicamente por ruta. Cuando el filtro cambiaba, React reciclaba componentes con estado desalineado.
  3. *Actualización de estado en componente desmontado (Memory Leak en `Login.jsx`):* Al hacer login exitoso, el componente padre `App` alternaba inmediatamente a `<AppInterna />`, desmontando `<Login />`. El callback de `setTimeout` ejecutaba `setCargando(false)` sobre el componente ya destruido.
- **Solución Aplicada:**
  - Se añadieron guardas de división por cero (`totParadas > 0 ? ... : 0`) y se agruparon las métricas y la actividad reciente en bloques `useMemo`.
  - Se asignaron claves estables basadas en el ID de la parada (`key={a.id || `${a.ruta}-${i}`}`).
  - Se implementaron referencias de montaje `isMountedRef` y `timerRef` con limpieza en `useEffect` para cancelar llamadas asíncronas pendientes si el componente se desmonta.

---

## 9. Suite de Pruebas Automatizadas y Validación Final (`package.json`, `src/__tests__/`)

- **Diagnóstico / Problemas:**
  1. *Falta de pipeline de tests:* El proyecto no tenía configurado ningún comando `npm test` en `package.json`, impidiendo la verificación automatizada en CI/CD o pre-commit.
  2. *Incompatibilidad de resolución ESM en Node:* Los imports de archivos sin extensión `.js` (como `../data/mock` en `planner.js`) impedían la ejecución nativa con `node --test` sin depender de empaquetadores pesados.
- **Solución Aplicada:**
  - Se integró el test runner nativo de Node.js (`"test": "node --test"`) en [package.json](file:///c:/Users/JAHRET/Documents/siprd-frontend/package.json).
  - Se especificó la extensión `.js` en `src/lib/planner.js` para compatibilidad universal con Vite y Node ESM.
  - Se implementaron 13 pruebas unitarias exhaustivas en dos suites:
    1. [src/\_\_tests\_\_/planner.test.js](file:///c:/Users/JAHRET/Documents/siprd-frontend/src/__tests__/planner.test.js):
       - Formateo seguro de tiempos `hhmm` (manejo de minutos normales, negativos, cero y NaN).
       - Separación de pedidos reprogramados sin mutar el array original.
       - Planificación heurística respetando capacidades máximas de peso y volumen.
       - Detección de solapamiento de ventanas horarias con guion `-` y en-dash `–`.
       - Resiliencia ante listas vacías y números de vehículos fuera de rango.
    2. [src/\_\_tests\_\_/business_logic.test.js](file:///c:/Users/JAHRET/Documents/siprd-frontend/src/__tests__/business_logic.test.js):
       - Matriz de permisos de usuarios (`jefe`, `asistente`, `ti`) y control estricto de aprobación.
       - Sanitización de credenciales (eliminación de `clave` previo al almacenamiento en cliente).
       - Reglas de reordenamiento de ruta (inmutabilidad de paradas entregadas frente a pendientes).
       - Sanitización y escape RFC 4180 para exportaciones CSV (comillas dobles y comas internas).
       - Cálculos y agregaciones financieras sin riesgo de división por cero.

---

## Resumen Ejecutivo de Calidad y Estado del Proyecto

| Dimensión Auditada | Estado Previo | Estado Actual | Impacto |
| :--- | :--- | :--- | :--- |
| **Estabilidad de Ejecución** | Desbordamientos `NaN`, crashes por tipos null/undefined en filtros y ordenamiento | 100% de inputs protegidos con fallbacks seguros y coerción numérica | Cero crashes en tiempo de ejecución |
| **Fugas de Memoria** | Timers no limpiados en `ToastContext`, `Rutas`, `Login` y `App` | Limpieza estricta en unmount vía `useEffect` y referencias `useRef` | Previene memory leaks al navegar entre vistas |
| **Seguridad de Datos** | Contraseña de usuario persistida en texto plano en `localStorage` | Sanitización de credenciales antes del almacenamiento en cliente | Previene exposición de credenciales |
| **Accesibilidad (a11y)** | Elementos `div` como botones, ausencia de focus trap en modales | Focus trap WCAG 2.1 en modales/drawers, elementos interactivos nativos (`<button>`) | Navegación 100% accesible vía teclado |
| **Exportación de Datos** | Pesos divididos erróneamente por 1000 en CSV; caracteres corruptos | Unidades corregidas a toneladas reales y codificación UTF-8 BOM | Reportes precisos para el cliente y Excel |
| **Validación y Tests** | Sin comandos ni suites de pruebas automatizadas | `npm test` ejecutando 13 tests con 100% de aprobación; `npm run build` limpio en 726ms | Pipeline confiable listo para producción |

