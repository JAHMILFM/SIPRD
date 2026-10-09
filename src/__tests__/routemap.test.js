import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { RUTAS_ACTIVAS } from '../data/mockRutas.js'

// Funciones de geocodificación determinista utilizadas por RouteMap
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

describe('Geocodificación y Robustez de RouteMap (Rutas)', () => {

  it('todas las paradas de RUTAS_ACTIVAS generan coordenadas numéricas finitas válidas (cero NaN)', () => {
    for (const ruta of RUTAS_ACTIVAS) {
      assert.ok(ruta.paradas.length > 0, `Ruta ${ruta.id} debe contener paradas`)
      for (let i = 0; i < ruta.paradas.length; i++) {
        const parada = ruta.paradas[i]
        const [lat, lon] = obtenerCoordenadas(parada, i)

        assert.equal(Number.isFinite(lat), true, `Parada ${parada.id} en ${ruta.id} produjo latitud no finita: ${lat}`)
        assert.equal(Number.isFinite(lon), true, `Parada ${parada.id} en ${ruta.id} produjo longitud no finita: ${lon}`)
        assert.ok(!Number.isNaN(lat), `Parada ${parada.id} produjo NaN en latitud`)
        assert.ok(!Number.isNaN(lon), `Parada ${parada.id} produjo NaN en longitud`)

        // Coordenadas válidas en el rango de Lima Metropolitana
        assert.ok(lat < -11.5 && lat > -12.5, `Latitud fuera de rango para Lima: ${lat}`)
        assert.ok(lon < -76.5 && lon > -77.5, `Longitud fuera de rango para Lima: ${lon}`)
      }
    }
  })

  it('detecta distritos correctamente desde la dirección de la parada', () => {
    assert.equal(detectarDistrito({ dir: 'Av. Alfredo Mendiola 3550, Los Olivos' }), 'Los Olivos')
    assert.equal(detectarDistrito({ dir: 'Av. Sáenz Peña 1120, Callao' }), 'Callao')
    assert.equal(detectarDistrito({ dir: 'Av. Los Jardines Este Mz B Lote 4, SJL' }), 'San Juan de Lurigancho')
    assert.equal(detectarDistrito({ dir: 'Z.I. Parque Industrial del Cono Sur, VES' }), 'Villa El Salvador')
    assert.equal(detectarDistrito({ dir: 'Av. Brasil 2145, Breña' }), 'Breña')
    assert.equal(detectarDistrito({ dir: 'Jr. Huáscar 415, Comas' }), 'Comas')
  })

  it('maneja paradas con campos nulos o inesperados sin lanzar excepciones ni generar NaN', () => {
    const casosBorde = [
      {},
      { id: null, dir: null },
      { id: undefined, dir: undefined },
      { id: 'p99-99', dir: '' },
      { id: 12345, dir: 'Dirección sin distrito reconocido' },
      { lat: -12.05, lon: -77.04 },
    ]

    for (let i = 0; i < casosBorde.length; i++) {
      const coords = obtenerCoordenadas(casosBorde[i], i)
      assert.ok(Array.isArray(coords), 'Debe retornar un arreglo')
      assert.equal(coords.length, 2, 'Debe retornar par [lat, lon]')
      assert.equal(Number.isFinite(coords[0]), true, `caso ${i} lat no finita`)
      assert.equal(Number.isFinite(coords[1]), true, `caso ${i} lon no finita`)
      assert.ok(!Number.isNaN(coords[0]), `caso ${i} lat es NaN`)
      assert.ok(!Number.isNaN(coords[1]), `caso ${i} lon es NaN`)
    }
  })

  it('construye polilíneas completas saliendo y retornando al Almacén Lurín', () => {
    const DEPOT = [-12.2748, -76.8711]
    const ruta = RUTAS_ACTIVAS[0]
    const paradasCoords = ruta.paradas.map((p, idx) => obtenerCoordenadas(p, idx))
    const polyline = [DEPOT, ...paradasCoords, DEPOT]

    assert.equal(polyline.length, ruta.paradas.length + 2)
    assert.deepEqual(polyline[0], DEPOT)
    assert.deepEqual(polyline[polyline.length - 1], DEPOT)

    for (const pt of polyline) {
      assert.equal(Number.isFinite(pt[0]), true)
      assert.equal(Number.isFinite(pt[1]), true)
    }
  })

})
