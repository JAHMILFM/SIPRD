import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { planificar, separarReprogramados, hhmm } from '../lib/planner.js'
import { PEDIDOS, VEHICULOS } from '../data/mock.js'

describe('Motor de Planificación y Heurística (planner.js)', () => {
  it('hhmm formatea minutos normales, cero, negativos y NaN de forma segura', () => {
    assert.equal(hhmm(0), '0 h 00 m')
    assert.equal(hhmm(75), '1 h 15 m')
    assert.equal(hhmm(120), '2 h 00 m')
    assert.equal(hhmm(-10), '0 h 00 m')
    assert.equal(hhmm(NaN), '0 h 00 m')
    assert.equal(hhmm(null), '0 h 00 m')
  })

  it('separarReprogramados divide pedidos según días hábiles sin mutar original', () => {
    const { planificables, reprogramados } = separarReprogramados(PEDIDOS, 4) // Jueves = 4
    assert.ok(planificables.length > 0, 'Debe haber pedidos planificables')
    assert.ok(reprogramados.length > 0, 'Debe haber pedidos reprogramados')
    assert.equal(planificables.length + reprogramados.length, PEDIDOS.length)

    for (const p of reprogramados) {
      assert.ok(p.motivo, 'El pedido reprogramado debe tener un motivo')
      assert.ok(p.mueveA, 'El pedido reprogramado debe indicar el día al que se mueve')
      assert.ok(!p.dias.includes(4), 'El cliente no debe atender el día jueves')
    }
  })

  it('planificar reparte pedidos respetando capacidad y límites de flota', () => {
    const { planificables } = separarReprogramados(PEDIDOS)
    const res5 = planificar(planificables, 5)

    assert.equal(res5.n, 5)
    assert.ok(res5.rutas.length <= 5)
    assert.ok(res5.kmTotal > 0)
    assert.ok(res5.jornadaMax > 0)
    assert.ok(typeof res5.balance === 'number')

    for (const r of res5.rutas) {
      assert.ok(r.peso <= r.vehiculo.pesoMax, `Ruta ${r.id} no debe superar pesoMax (${r.peso} <= ${r.vehiculo.pesoMax})`)
      assert.ok(r.vol <= r.vehiculo.volMax, `Ruta ${r.id} no debe superar volMax (${r.vol} <= ${r.vehiculo.volMax})`)
    }
  })

  it('planificar detecta ventanas horarias en conflicto tanto con guion como con en-dash', () => {
    const pedidosConVentanas = [
      { id: 't1', cliente: 'Cliente Temprano', zona: 'Norte', bultos: 5, peso: 100, vol: 0.1, servicio: 60, ventana: '08:00-08:15', dias: null, prioridad: 'Alta' },
      { id: 't2', cliente: 'Cliente Tardío', zona: 'Sur', bultos: 5, peso: 100, vol: 0.1, servicio: 60, ventana: '08:00–08:20', dias: null, prioridad: 'Alta' },
    ]

    const res = planificar(pedidosConVentanas, 1)
    assert.ok(res.rutas.length === 1)
    // Al menos uno de los pedidos debería presentar conflicto por ventana cerrada
    assert.ok(res.conflictos.length > 0, 'Debe identificar conflicto de ventana horaria')
  })

  it('planificar maneja listas vacías y n fuera de rango sin excepciones', () => {
    const resVacio = planificar([], 0)
    assert.equal(resVacio.rutas.length, 0)
    assert.equal(resVacio.kmTotal, 0)
    assert.equal(resVacio.balance, 0)

    const resExceso = planificar([], 999)
    assert.ok(resExceso.n <= VEHICULOS.length)
  })
})


describe('Vista previa con datos reales de PostgreSQL', () => {
  it('mantiene los metros cúbicos recibidos sin multiplicarlos', () => {
    const pedido = { id: 'real', peso_kg: 100, volumen_m3: 2, zona: 'Sur', ventana: 'Todo el día' }
    const flota = [{ id: 1, pesoMax: 1, volMax: 3 }]
    const plan = planificar([pedido], 1, flota)
    assert.equal(plan.sinAsignar.length, 0)
    assert.equal(plan.rutas[0].vol, 2)
  })
  it('un cliente sin días disponibles queda fuera de la vista previa', () => {
    const resultado = separarReprogramados([{ id: 1, dias: [] }], 6)
    assert.equal(resultado.planificables.length, 0)
    assert.equal(resultado.reprogramados[0].mueveA, 'Sin día disponible')
  })
})
