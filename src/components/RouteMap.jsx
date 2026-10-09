import React, { useMemo, useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { hhmm } from '../lib/planner'
import { useToast } from '../context/ToastContext'

// Almacén Lurín (Depósito Central Alfa Distribuidores)
const DEPOT_COORDS = [-12.2748, -76.8711]

// Geocodificación referencial calibrada por distrito en Lima Metropolitana
const COORDENADAS_DISTRITOS = {
  'Carabayllo': [-11.8687, -77.0311],
  'Comas': [-11.9328, -77.0544],
  'Magdalena del Mar': [-12.0911, -77.0694],
  'San Juan de Lurigancho': [-12.0033, -76.9989],
  'Jesús María': [-12.0744, -77.0478],
  'Chorrillos': [-12.1814, -77.0194],
  'Villa El Salvador': [-12.2114, -76.9389],
  'Lurín': [-12.2748, -76.8711],
  'Lima Cercado': [-12.0464, -77.0428],
  'Lima': [-12.0464, -77.0428],
  'Callao': [-12.0564, -77.1350],
  'Los Olivos': [-11.9789, -77.0683],
  'San Martín de Porres': [-11.9989, -77.0850],
  'Independencia': [-11.9933, -77.0533],
  'Ate': [-12.0289, -76.9189],
  'Santa Anita': [-12.0433, -76.9689],
  'Villa María del Triunfo': [-12.1611, -76.9289],
  'Breña': [-12.0583, -77.0517],
  'Lince': [-12.0833, -77.0333],
  'El Agustino': [-12.0514, -77.0014],
  'San Miguel': [-12.0764, -77.0864],
  'Surco': [-12.1400, -76.9950],
  'Santiago de Surco': [-12.1400, -76.9950],
  'San Borja': [-12.0990, -77.0010],
  'Miraflores': [-12.1210, -77.0290],
  'San Isidro': [-12.0970, -77.0350],
}

function hashString(val) {
  const str = String(val ?? '')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function detectarDistrito(p) {
  if (p.dist && COORDENADAS_DISTRITOS[p.dist]) return p.dist
  if (p.distrito && COORDENADAS_DISTRITOS[p.distrito]) return p.distrito

  const texto = `${p.dir || ''} ${p.direccion || ''} ${p.cliente || ''}`.toLowerCase()

  if (texto.includes('los olivos')) return 'Los Olivos'
  if (texto.includes('callao')) return 'Callao'
  if (texto.includes('sjl') || texto.includes('san juan de lurigancho')) return 'San Juan de Lurigancho'
  if (texto.includes('ves') || texto.includes('villa el salvador')) return 'Villa El Salvador'
  if (texto.includes('vmt') || texto.includes('villa maría') || texto.includes('villa maria')) return 'Villa María del Triunfo'
  if (texto.includes('comas')) return 'Comas'
  if (texto.includes('carabayllo')) return 'Carabayllo'
  if (texto.includes('independencia')) return 'Independencia'
  if (texto.includes('san martín') || texto.includes('san martin') || texto.includes('smp')) return 'San Martín de Porres'
  if (texto.includes('magdalena')) return 'Magdalena del Mar'
  if (texto.includes('chorrillos')) return 'Chorrillos'
  if (texto.includes('santa anita')) return 'Santa Anita'
  if (texto.includes('ate')) return 'Ate'
  if (texto.includes('breña')) return 'Breña'
  if (texto.includes('lince')) return 'Lince'
  if (texto.includes('jesús maría') || texto.includes('jesus maria')) return 'Jesús María'
  if (texto.includes('san miguel')) return 'San Miguel'
  if (texto.includes('el agustino')) return 'El Agustino'
  if (texto.includes('surco')) return 'Surco'
  if (texto.includes('miraflores')) return 'Miraflores'
  if (texto.includes('san isidro')) return 'San Isidro'
  if (texto.includes('lurín') || texto.includes('lurin')) return 'Lurín'

  return 'Lima Cercado'
}

function obtenerCoordenadas(p, index = 0) {
  const latNum = Number(p.lat)
  const lonNum = Number(p.lon)
  if (Number.isFinite(latNum) && Number.isFinite(lonNum) && Math.abs(latNum) > 1 && Math.abs(lonNum) > 1) {
    return [latNum, lonNum]
  }

  const distrito = detectarDistrito(p)
  const base = COORDENADAS_DISTRITOS[distrito] || COORDENADAS_DISTRITOS['Lima Cercado']

  // Jitter determinista seguro basado en hash de id / orden para dispersión realista
  const seed = hashString(p.id || p.id_parada || p.pedido_id || p.cliente || index)
  const jitterLat = ((seed % 17) - 8) * 0.0025
  const jitterLon = (((seed >> 3) % 17) - 8) * 0.0025

  const latFinal = Number((base[0] + jitterLat).toFixed(6))
  const lonFinal = Number((base[1] + jitterLon).toFixed(6))

  if (!Number.isFinite(latFinal) || !Number.isFinite(lonFinal)) {
    return [-12.0464, -77.0428]
  }

  return [latFinal, lonFinal]
}

// Icono personalizado para el almacén central
const iconoAlmacen = L.divIcon({
  className: 'custom-depot-marker',
  html: `
    <div style="
      background: #0f172a;
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      border: 2.5px solid #ffffff;
    ">🏭</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18]
})

// Creador de iconos numerados por vehículo y parada
function crearIconoParada(numero, color) {
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background: ${color};
        color: #ffffff;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 11px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
        transition: transform 0.2s;
      ">
        ${numero}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  })
}

// Componente para reenfocar mapa al cambiar selección
function ControlEnfoque({ centro, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(centro, zoom)
  }, [centro, zoom, map])
  return null
}

export default function RouteMap({ plan }) {
  const { toast } = useToast()
  const [rutaFiltrada, setRutaFiltrada] = useState(null)
  const [vistaSatelital, setVistaSatelital] = useState(false)
  const [enfoque, setEnfoque] = useState({ centro: [-12.1200, -77.0100], zoom: 11 })

  const rutasProcesadas = useMemo(() => {
    if (!plan || !Array.isArray(plan.rutas)) return []
    return plan.rutas.map((r, rIdx) => {
      const paradasCoords = (r.pedidos || r.paradas || [])
        .map((p, pIdx) => {
          const coords = obtenerCoordenadas(p, pIdx)
          return {
            ...p,
            secuencia: p.secuencia || p.orden || pIdx + 1,
            coords
          }
        })
        .filter(p => Array.isArray(p.coords) && Number.isFinite(p.coords[0]) && Number.isFinite(p.coords[1]))

      // Ruta completa: Sale de Lurín, recorre paradas y retorna a Lurín
      const polylineCoords = [
        DEPOT_COORDS,
        ...paradasCoords.map(p => p.coords),
        DEPOT_COORDS
      ].filter(c => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))

      return {
        ...r,
        paradasCoords,
        polylineCoords
      }
    })
  }, [plan])

  const rutasVisibles = useMemo(() => {
    if (!rutaFiltrada) return rutasProcesadas
    return rutasProcesadas.filter(r => r.id === rutaFiltrada)
  }, [rutasProcesadas, rutaFiltrada])

  const centrarAlmacen = () => {
    setEnfoque({ centro: DEPOT_COORDS, zoom: 13 })
    toast.info('Mapa enfocado en Almacén Lurín.')
  }

  const centrarLima = () => {
    setEnfoque({ centro: [-12.1200, -77.0100], zoom: 11 })
    toast.info('Vista general de Lima Metropolitana.')
  }

  return (
    <div className="card maph" style={{ position: 'relative', overflow: 'hidden', minHeight: 460 }}>
      {/* Barra superior de controles del mapa */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        padding: '8px 14px',
        borderRadius: 10,
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        fontSize: 12,
        fontWeight: 500,
        color: '#1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block',
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: '#16a34a',
            boxShadow: '0 0 6px #16a34a'
          }} />
          <span><strong>Monitoreo en Tiempo Real</strong> · {plan.rutas?.length || 0} Rutas activas</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm btn-subtle"
            style={{ fontSize: 11, padding: '4px 9px' }}
            onClick={centrarLima}
          >
            🗺️ Todo Lima
          </button>
          <button
            type="button"
            className="btn btn-sm btn-subtle"
            style={{ fontSize: 11, padding: '4px 9px' }}
            onClick={centrarAlmacen}
          >
            🏭 Almacén
          </button>
          <button
            type="button"
            className="btn btn-sm btn-subtle"
            style={{ fontSize: 11, padding: '4px 9px' }}
            onClick={() => setVistaSatelital(!vistaSatelital)}
          >
            {vistaSatelital ? '🗺️ Mapa' : '🛰️ Satélite'}
          </button>
        </div>
      </div>

      {/* Mapa interactivo Leaflet real */}
      <MapContainer
        center={enfoque.centro}
        zoom={enfoque.zoom}
        style={{ width: '100%', height: '460px', borderRadius: 11 }}
        scrollWheelZoom={true}
      >
        <ControlEnfoque centro={enfoque.centro} zoom={enfoque.zoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            vistaSatelital
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        {/* Marcador del Almacén Lurín */}
        <Marker position={DEPOT_COORDS} icon={iconoAlmacen}>
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>🏭 Almacén Central Lurín</strong>
              <div style={{ color: '#64748b', marginTop: 4 }}>Punto de partida y retorno de la flota</div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>Horario de salida: 07:30</div>
            </div>
          </Popup>
        </Marker>

        {/* Trazado y paradas de cada ruta */}
        {rutasVisibles.map((r) => (
          <React.Fragment key={r.id}>
            {/* Polilínea de la ruta */}
            <Polyline
              positions={r.polylineCoords}
              pathOptions={{
                color: r.color,
                weight: rutaFiltrada === r.id ? 5 : 3.5,
                opacity: 0.88,
                dashArray: rutaFiltrada === r.id ? null : '6, 6'
              }}
            />

            {/* Paradas de la ruta */}
            {r.paradasCoords.map((p) => (
              <Marker
                key={`${r.id}-${p.id}-${p.secuencia}`}
                position={p.coords}
                icon={crearIconoParada(p.secuencia, r.color)}
              >
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 190, lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        background: r.color,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4
                      }}>
                        {r.id} · Parada #{p.secuencia}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {p.id}
                      </span>
                    </div>

                    <strong style={{ fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 4 }}>
                      {p.cliente}
                    </strong>

                    <div style={{ color: '#475569', fontSize: 11 }}>
                      📍 {p.dir || p.direccion || 'Lima'} ({p.dist || p.distrito || 'Metropolitana'})
                    </div>

                    <div style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px solid #e2e8f0',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 4,
                      fontSize: 11
                    }}>
                      <div>⚖️ <strong>{p.peso || p.peso_kg || 0} kg</strong></div>
                      <div>📦 <strong>{p.vol || p.volumen_m3 || 0} m³</strong></div>
                      <div>💰 <strong>S/ {p.importe || p.importe_total || 0}</strong></div>
                      <div>⏱️ <strong>{p.ventana || 'Todo el día'}</strong></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Leyenda interactiva de rutas y filtrado */}
      <div className="legend" style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        borderRadius: 10,
        boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        maxHeight: 180,
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <b style={{ fontSize: 11, color: '#334155' }}>Filtrar Rutas del Escenario</b>
          {rutaFiltrada && (
            <button
              type="button"
              onClick={() => setRutaFiltrada(null)}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 10.5, cursor: 'pointer', fontWeight: 600 }}
            >
              Ver todas
            </button>
          )}
        </div>

        {rutasProcesadas.map((r) => {
          const seleccionada = rutaFiltrada === r.id
          return (
            <div
              key={r.id}
              onClick={() => setRutaFiltrada(seleccionada ? null : r.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px',
                borderRadius: 6,
                cursor: 'pointer',
                background: seleccionada ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                fontWeight: seleccionada ? 700 : 500,
                fontSize: 11,
                color: '#1e293b',
                transition: 'background 0.15s'
              }}
            >
              <span className="sw" style={{ background: r.color, width: 12, height: 12, borderRadius: 3 }} />
              <span>{r.id} ({r.vehiculo?.placa || `V${r.id_vehiculo || ''}`})</span>
              <span style={{ color: '#64748b', fontSize: 10 }}>· {r.pedidos?.length || 0} paradas · {hhmm(r.minutos || 0)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
