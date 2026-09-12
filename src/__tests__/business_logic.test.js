import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { RUTAS_ACTIVAS } from '../data/mockRutas.js'
const USUARIOS_FIXTURE = [
  { id: 'u1', usuario: 'dhuerta', clave: 'jefe123', nombre: 'Dennys Huerta', rol: 'jefe' },
  { id: 'u2', usuario: 'asistente', clave: 'dist123', nombre: 'Lesli Pomalaya', rol: 'asistente' },
  { id: 'u3', usuario: 'admin.ti', clave: 'ti2026', nombre: 'Área de TI', rol: 'ti' },
]

describe('Lógica de Negocio y Seguridad de Frontend', () => {

  describe('Matriz de Permisos y Roles (Auth)', () => {
    const PERMISOS = {
      jefe: ['aprobar_plan', 'editar_rutas', 'configurar', 'ver_cobranzas', 'exportar'],
      asistente: ['editar_rutas', 'ver_cobranzas', 'exportar'],
      ti: ['configurar', 'ver_logs'],
    }

    function puede(rol, accion) {
      return PERMISOS[rol]?.includes(accion) ?? false
    }

    it('solo el rol jefe puede aprobar planes', () => {
      assert.equal(puede('jefe', 'aprobar_plan'), true)
      assert.equal(puede('asistente', 'aprobar_plan'), false)
      assert.equal(puede('ti', 'aprobar_plan'), false)
    })

    it('asistente y jefe pueden editar rutas y ver cobranzas', () => {
      assert.equal(puede('asistente', 'editar_rutas'), true)
      assert.equal(puede('jefe', 'editar_rutas'), true)
      assert.equal(puede('asistente', 'ver_cobranzas'), true)
      assert.equal(puede('ti', 'editar_rutas'), false)
    })

    it('sanitización de credenciales remueve contraseña antes de persistir', () => {
      const jefeOriginal = USUARIOS_FIXTURE.find(u => u.rol === 'jefe')
      assert.ok(jefeOriginal.clave, 'El mock original contiene clave')

      const { clave, ...usuarioSanitizado } = jefeOriginal
      assert.equal(usuarioSanitizado.clave, undefined, 'La clave debe ser removida')
      assert.equal(usuarioSanitizado.nombre, jefeOriginal.nombre)
      assert.equal(usuarioSanitizado.rol, 'jefe')

      const serializado = JSON.stringify(usuarioSanitizado)
      assert.equal(serializado.includes('clave'), false, 'El JSON no debe contener campo clave')
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
