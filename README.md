# SIPRD · Frontend

Sistema Inteligente de Planificación de Rutas de Distribución — Alfa Distribuidores S.A.

Prototipo funcional del módulo **Algoritmo de Ruteo**, construido a partir de lo
que el área de Distribución describió en la reunión del 05/09.

## Cómo ejecutarlo

Necesitas Node.js 18 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173

Para generar la versión de producción:

```bash
npm run build
npm run preview
```

## Qué hace el prototipo

Todo el cálculo corre en el navegador con datos de demostración. No necesita
backend ni conexión.

- **Tanteo de flota.** Elige 3, 4, 5 o 6 vehículos y compara la jornada máxima,
  los pedidos que quedan sin asignar y la distancia de cada escenario. Es el
  mismo tanteo que hoy hace el asistente a mano, pero con los escenarios lado a
  lado. Con 3 vehículos el escenario se marca saturado; el sistema recomienda la
  flota más pequeña que cumple la jornada máxima.
- **Reparto con capacidad real.** Cada vehículo tiene tope en toneladas y m³, y
  cada pedido aporta el peso y volumen de sus bultos. Un pedido no entra a un
  camión que ya no le da.
- **Reprogramación automática.** Los clientes que no atienden hoy salen del
  cálculo y aparecen en la pestaña *Reprogramados* con el día al que se mueven.
  Es el trabajo que hoy el asistente hace de memoria.
- **Pedidos no planificables.** Los que llegan sin coordenadas útiles quedan
  aparte en vez de romper el cálculo o desaparecer sin aviso.
- **Carga y jornada por camión.** Paradas, distancia, jornada estimada y uso de
  peso y volumen, con aviso cuando un camión tiene holgura para recibir paradas
  de otro.

## Estructura

```
src/
  App.jsx                 estado de la pantalla y composición
  index.css               tokens de diseño (colores, tipografía, tablas)
  data/mock.js            vehículos y pedidos de demostración
  lib/planner.js          motor de reparto: capacidad, jornada y balance
  components/
    Sidebar.jsx           navegación (Inicio, Algoritmo, Rutas, Cobranzas, Config.)
    TopBar.jsx            encabezado
    ParamsBar.jsx         parámetros del cálculo
    FleetTrial.jsx        tanteo de flota
    OrdersPanel.jsx       pestañas de pedidos, rutas, reprogramados y no planificables
    RouteMap.jsx          mapa esquemático de rutas
    TruckStats.jsx        carga y jornada por camión
```

## Cómo conectarlo al backend

`lib/planner.js` es el único punto que cambia. Hoy calcula en el navegador; en
producción se reemplaza por la llamada al servicio de optimización manteniendo
la misma forma de respuesta, sin tocar los componentes:

```js
export async function planificar(pedidos, n) {
  const r = await fetch('/api/planes/optimizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha, vehiculos: n, criterio, jornadaMax }),
  })
  return r.json()   // { n, rutas, sinAsignar, kmTotal, jornadaMax, jornadaMin, balance }
}
```

Como la optimización real puede tardar hasta 30 segundos (RNF-01), conviene que
el endpoint devuelva un identificador de trabajo y que el frontend consulte su
estado, en lugar de esperar una respuesta síncrona. El botón *Recalcular* ya
tiene el estado de progreso previsto para eso.

El mapa esquemático se sustituye por `react-leaflet` sobre OpenStreetMap,
dibujando la geometría que devuelve OSRM. La lista de rutas con color y paradas
que consume el componente no cambia.

## Alcance

Los módulos confirmados con Alfa son **Algoritmo**, **Rutas** y **Cobranzas**.
Seguimiento y Carga quedaron fuera. La integración con la App de Distribución se
simula mediante una interfaz desacoplada, sustituible por la real sin reescribir
la lógica de negocio.
