# SIPRD: implementación de los flujos funcionales

Rama Git: `feature/rf-interfaz-original`. Base conectada: rama Neon `siprd-normalizado`, esquema `siprd`, 13 tablas. Se conserva el diseño, navegación y CSS de la interfaz original; se agregan los controles que requieren los flujos. Esta rama no está publicada en GitHub.

## Trazabilidad de los RF acordados

| RF | Implementación y comprobación |
|---|---|
| RF-RES-01 | Registrar disponibilidad del cliente en Configuración → Reglas de Clientes. Horarios, días de recepción/no recepción y excepciones por fecha. |
| RF-RES-02 | Consultar restricciones persistidas; el motor vuelve a consultarlas al calcular y validar una ruta. |
| RF-RES-03 | Actualizar la disponibilidad; el cambio del grupo de días se guarda en una transacción. |
| RF-RES-04 | Desactivar restricciones mediante eliminación lógica, conservando auditoría. |
| RF-PLAN-01 | Calcular y guardar propuestas con pedidos de PostgreSQL, coordenadas de entrega, vehículos seleccionados, capacidad y restricciones. |
| RF-PLAN-02 | Consultar propuestas, secuencia, mapa, kilómetros, horas y pedidos sin asignar. |
| RF-PLAN-03 | Guardar ajustes de orden con flechas; validar nuevamente zona, capacidades y horarios. Replanificar pendientes como una nueva versión. |
| RF-PLAN-04 | Asistente o jefe con permiso de confirmación publican la planificación revisada. Las cuentas por placa consultan las rutas confirmadas. |
| RF-COB-01 | Reparto web registra medio de pago, monto y operación asociados a la parada propia. |
| RF-COB-02 | Adjuntar comprobante de pago por separado de la fotografía de entrega. |
| RF-COB-03 | Tesorería consulta pagos y archivos autorizados; la lista de cobros se actualiza cada 5 segundos. |
| RF-COB-04 | Tesorería confirma u observa el cobro tras efectuar el contraste bancario. |
| RF-COB-05 | Registrar comentario de observación, visible para reparto; corregir y reenviar a pendiente. |
| RF-COB-06 | Cerrar solamente con entrega registrada, totalidad del importe y todos los cobros conformes. La entrega física y el cierre financiero se distinguen. |

La administración permite registrar, consultar, actualizar y desactivar usuarios. El administrador modifica permisos en Configuración → Usuarios y permisos. Los permisos se comprueban en cada petición del backend; no dependen de ocultar botones. Cobranzas es exclusivo de Tesorería: Asistente y Jefe de Distribución no ven el módulo ni pueden consultar su API. El acceso de reparto está asociado a la placa y limita las operaciones a su vehículo y jornada.

## Planificación por zonas

El archivo `motor/motor/zonas.json` contiene polígonos operativos configurables de norte, sur, este y centro. Se permiten varios vehículos por zona, sin mezclar zonas dentro de una ruta. No se asigna un pedido sin coordenadas válidas o fuera de los polígonos. La ubicación del pedido se conserva independientemente de la dirección del maestro de clientes.

Se comprueban peso, volumen, tiempo de servicio completo, intervalos de recepción y regreso al almacén dentro de la jornada. Los criterios de jornada y distancia aplican objetivos distintos a la búsqueda local. La propuesta indica los pedidos no asignados para revisión; no se garantiza que cualquier demanda entre en seis vehículos.

La demostración del 10/10/2026 contiene 72 pedidos ficticios en PostgreSQL y seis vehículos FIC-001 a FIC-006. Hay dos rutas norte, dos sur, una este y una centro. Las coordenadas se distribuyen por sectores más amplios, en lugar de agrupar todas las visitas alrededor de un centro. Las versiones posteriores mantienen las entregas completadas y recalculan las restantes. Algunas entregas ficticias aparecen completadas como resultado de la prueba de pago de extremo a extremo.

## Prueba desde la interfaz

1. Iniciar FastAPI en el puerto 8000 y Vite en 5173, desde la raíz del repositorio.
2. Ingresar como `demo.asistente` o `demo.jefe`. Consultar fecha 2026-10-10, las rutas y las flechas. El orden se guarda al pulsarlas; no se pueden mover paradas atendidas, en camino o bloqueadas. Los cambios de orden dejan el antes y el después en auditoría.
3. Consultar el PIN vigente desde Inicio → Accesos de reparto → Mostrar. Asistente y Jefe de Distribución administran estos accesos; cada PIN tiene cuatro dígitos, dura hasta medianoche de Lima y permite entrar usando la placa como usuario. Renovar invalida las sesiones anteriores.
4. En una sesión de navegador separada ingresar con la placa. Abrir un pedido propio, subir la evidencia de entrega y registrar un pago con su comprobante.
5. En otra sesión ingresar como `demo.tesoreria`. Consultar el comprobante, observarlo indicando el motivo, corregirlo desde reparto y confirmarlo desde Tesorería después del contraste. El pedido solo puede cerrarse al completar el importe validado. Descargar el arqueo en Excel.
6. Ingresar como `demo.admin`; gestionar usuarios y guardar los permisos de los demás roles. Retirar un permiso debe bloquear la operación aunque exista una sesión abierta; el menú se actualiza al renovar el perfil.

Las cuentas de oficina de demostración usan `SiprdDemo2026!`. Son cuentas sintéticas para pruebas; no son las credenciales de conexión a la base. Las claves de las placas se obtienen del dashboard y no se publican en este documento.

## Ejecución y comprobaciones

En Git Bash, dentro de `C:/Users/SURICH/Documents/SIPRD`:

```bash
source .venv/Scripts/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

En una segunda terminal:

```bash
npm install
npm run dev
```

En otra terminal, con la API en 8000 y el entorno Python activado:

```bash
python -m unittest discover -s backend/tests -v
npm test
npm run build
SIPRD_TEST_API=http://127.0.0.1:8000/api/v1 python backend/scripts/verificar_demo_web.py
SIPRD_TEST_API=http://127.0.0.1:8000/api/v1 python backend/scripts/verificar_permisos_orden.py
```

Las pruebas integradas modifican datos de demostración: completan un pedido ficticio, crean una restricción que luego desactivan, rotan una clave de reparto y verifican usuarios y permisos. La prueba de permisos restaura la política anterior y el orden inicial. No ejecutarlas contra datos reales.

Para generar otra jornada ficticia: `python -m backend.scripts.preparar_demo_zonas --fecha AAAA-MM-DD`. Después calcular y confirmar la propuesta desde Algoritmo. No vuelve a abrir ni cambia coordenadas de entregas cerradas.

## Base de datos y límites operativos

Las migraciones `backend/migrations/002_reparto_zonas.sql`, `003_permisos_roles.sql` y `004_politica_roles_cobranzas_y_pin.sql` son aditivas y ya están aplicadas a la rama normalizada de este equipo. Un integrante que use otra base con el modelo de 13 tablas debe aplicarlas mediante conexión directa y configurar su `.env`; actualizar el código Git no actualiza automáticamente su base local. No ejecutar otra vez el script que recrea el esquema para instalar estas mejoras.

Los comprobantes y evidencias se guardan en `backend/uploads`; PostgreSQL conserva sus referencias. Para que reparto y Tesorería vean los mismos archivos, todos deben utilizar el mismo backend. Compartir únicamente la base Neon entre backends locales independientes no comparte fotografías. Esta carpeta debe conservarse al desplegar y no se sube a Git. Para probar desde un teléfono en la misma red, servir Vite con `npm run dev -- --host 0.0.0.0` y abrir la IP del equipo; la conexión a la API utiliza el proxy de Vite.

Tesorería hace el contraste bancario manualmente; no existe conexión automática con bancos. Las matrices y trazados usan OSRM cuando está disponible. Se informa una estimación geográfica si falla el servicio; los tiempos incluyen un margen urbano y no corresponden a tráfico medido en vivo. Los polígonos son zonas operativas, no límites oficiales de distritos. La recepción de pedidos corporativos dispone de una API de importación validada; esta demostración usa pedidos sintéticos persistidos y no conecta directamente con Tomapedidos ni con su SQL corporativo.

## Evidencia de verificación

Se verificaron 16 casos integrados de rutas, accesos, cobranzas y restricciones; cuatro comprobaciones adicionales de permisos, orden y usuarios; y el CRUD de vehículos con cambio real de capacidad y estado. También pasan las pruebas unitarias del backend, las 24 pruebas del frontend y la compilación de producción. Las pruebas antiguas del frontend que usan fixtures no sustituyen las pruebas integradas contra PostgreSQL.
