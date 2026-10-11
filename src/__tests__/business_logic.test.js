import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { RUTAS_ACTIVAS } from '../data/mockRutas.js'
import {tienePermiso,perfilSeguro} from '../lib/permisos.js'

describe('Lógica de Negocio y Seguridad de Frontend', () => {
  describe('Permisos vigentes recibidos del servidor', () => {
    it('asistente y jefe confirman cuando tienen el permiso', () => {
      for(const rol of ['asistente','jefe'])assert.equal(tienePermiso({rol,permisos:['confirmar']},'confirmar'),true)
    })
    it('revocar un permiso no conserva acceso por el nombre del rol', () => {
      assert.equal(tienePermiso({rol:'jefe',permisos:['rutas']},'confirmar'),false)
      assert.equal(tienePermiso(null,'rutas'),false)
    })
    it('el perfil persistido excluye claves y hashes', () => {
      assert.deepEqual(perfilSeguro({nombre:'Prueba',clave:'secreto',password_hash:'hash',clave_cifrada:'cifrado'}),{nombre:'Prueba'})
    })
  })

  describe('Reglas de Reordenamiento de Paradas (Rutas)', () => {
    it('no permite subir una parada pendiente por encima de una entregada', () => {
      const ruta = JSON.parse(JSON.stringify(RUTAS_ACTIVAS[0]))
      // p1-1: entregado, p1-2: entregado, p1-3: en_camino, p1-4: pendiente
      const paradaTarget = ruta.paradas.find(p => p.id === 'p1-3')
      const targetIdx = ruta.paradas.findIndex(p => p.id === 'p1-3')
      const paradaAnterior = ruta.paradas[targetIdx - 1]

      // Validar regla de negocio
      const puedeSubir = !(paradaAnterior && paradaAnterior.estado === 'entregado')
      assert.equal(puedeSubir, false, 'No se debe poder mover una parada no entregada antes de una entregada')
    })

    it('permite reordenar dos paradas con estado pendiente', () => {
      const ruta = JSON.parse(JSON.stringify(RUTAS_ACTIVAS[0]))
      const idxP5 = ruta.paradas.findIndex(p => p.id === 'p1-5')
      const idxP6 = ruta.paradas.findIndex(p => p.id === 'p1-6')

      assert.equal(ruta.paradas[idxP5].estado, 'pendiente')
      assert.equal(ruta.paradas[idxP6].estado, 'pendiente')

      // Intercambiar
      const temp = ruta.paradas[idxP5]
      ruta.paradas[idxP5] = ruta.paradas[idxP6]
      ruta.paradas[idxP6] = temp

      assert.equal(ruta.paradas[idxP5].id, 'p1-6')
      assert.equal(ruta.paradas[idxP6].id, 'p1-5')
    })
  })

  describe('Formateo y Sanitización CSV', () => {
    function escaparCSV(val) {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    it('escapa comillas dobles y preserva comas internas', () => {
      const entrada = 'BOTICAS INKAFARMA "CENTRO", LIMA'
      const escapado = escaparCSV(entrada)
      assert.equal(escapado, '"BOTICAS INKAFARMA ""CENTRO"", LIMA"')
    })

    it('maneja valores nulos, indefinidos y numéricos', () => {
      assert.equal(escaparCSV(null), '""')
      assert.equal(escaparCSV(undefined), '""')
      assert.equal(escaparCSV(1250.5), '"1250.5"')
    })
  })

  describe('Cálculo de Métricas Financieras (Cobranzas)', () => {
    it('calcula porcentaje cobrado y totales sin divisiones por cero', () => {
      const cobranzasMock = [
        { monto: 1000, estado: 'entregado', condicion: 'Contado' },
        { monto: 500, estado: 'pendiente', condicion: 'Crédito' },
        { monto: 200, estado: 'no_entregado', condicion: 'Contado' },
      ]

      const cobrado = cobranzasMock.filter(c => c.estado === 'entregado').reduce((s, c) => s + c.monto, 0)
      const total = cobranzasMock.reduce((s, c) => s + c.monto, 0)
      const pctCobrado = total > 0 ? Math.round((cobrado / total) * 100) : 0

      assert.equal(cobrado, 1000)
      assert.equal(total, 1700)
      assert.equal(pctCobrado, 59)

      // Lista vacía
      const totalVacio = 0
      const pctVacio = totalVacio > 0 ? Math.round((0 / totalVacio) * 100) : 0
      assert.equal(pctVacio, 0)
    })
  })
})
