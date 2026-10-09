import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { VEHICULOS, PEDIDOS } from '../data/mock.js'
import { VEHICULOS_CONFIG, REGLAS_CLIENTE, RUTAS_ACTIVAS, VEHICULO_ESTADOS, RUTA_ESTADOS, PARADA_ESTADOS } from '../data/mockRutas.js'
import { USUARIOS } from '../data/mockUsuarios.js'

describe('Alineación con Base de Datos PostgreSQL (siprd_db)', () => {

  describe('Maestro de Vehículos (siprd.vehiculos)', () => {
    it('todos los vehículos poseen id_vehiculo, codigo_externo, placa y capacidades en kg y m3', () => {
      assert.ok(VEHICULOS.length > 0)
      for (const v of VEHICULOS) {
        assert.ok(v.id_vehiculo > 0, `Vehículo ${v.placa} debe tener id_vehiculo`)
        assert.ok(v.codigo_externo, `Vehículo ${v.placa} debe tener codigo_externo`)
        assert.ok(v.placa, 'Vehículo debe tener placa')
        assert.equal(typeof v.capacidad_kg, 'number')
        assert.ok(v.capacidad_kg >= 0, 'capacidad_kg >= 0')
        assert.equal(typeof v.capacidad_m3, 'number')
        assert.ok(v.capacidad_m3 >= 0, 'capacidad_m3 >= 0')
        // Conversión consistente: capacidad_kg = pesoMax * 1000
        assert.equal(v.capacidad_kg, v.pesoMax * 1000)
      }
    })

    it('el estado del vehículo pertenece al catálogo formal de BD', () => {
      for (const v of VEHICULOS_CONFIG) {
        assert.ok(VEHICULO_ESTADOS.includes(v.estado), `Estado ${v.estado} no está en catálogo CHECK`)
      }
    })
  })

  describe('Pedidos y Planificación (siprd.pedidos)', () => {
    it('todos los pedidos poseen campos normalizados de BD (codigo_externo, peso_kg, volumen_m3, habilitado_despacho)', () => {
      assert.ok(PEDIDOS.length > 0)
      for (const p of PEDIDOS) {
        assert.ok(p.id_pedido > 0, 'Debe tener id_pedido numérico')
        assert.ok(p.codigo_externo, 'Debe tener codigo_externo')
        assert.equal(typeof p.peso_kg, 'number')
        assert.ok(p.peso_kg >= 0, 'peso_kg >= 0')
        assert.equal(typeof p.volumen_m3, 'number')
        assert.ok(p.volumen_m3 >= 0, 'volumen_m3 >= 0')
        assert.equal(typeof p.importe, 'number')
        assert.ok(p.importe >= 0, 'importe >= 0')
        assert.equal(p.habilitado_despacho, true)
        assert.equal(p.origen, 'TOMAPEDIDOS')
      }
    })
  })

  describe('Rutas y Paradas (siprd.rutas & siprd.paradas_ruta)', () => {
    it('rutas activas poseen id_ruta, id_vehiculo, id_ejecucion y estado_db válido', () => {
      for (const r of RUTAS_ACTIVAS) {
        assert.ok(r.id_ruta > 0)
        assert.ok(r.id_vehiculo > 0)
        assert.ok(RUTA_ESTADOS.includes(r.estado_db), `Estado ${r.estado_db} inválido en rutas`)
        assert.ok(r.distancia_total_km >= 0)
        assert.ok(r.tiempo_estimado_min >= 0)
        assert.ok(r.id_usuario_aprobador > 0, 'Ruta en ejecución debe tener aprobador según ck_ruta_aprobacion')
        assert.ok(r.fecha_aprobacion, 'Ruta en ejecución debe tener fecha_aprobacion')
      }
    })

    it('paradas de ruta poseen id_parada, id_pedido, secuencia y estado_db válido', () => {
      for (const r of RUTAS_ACTIVAS) {
        for (const p of r.paradas) {
          assert.ok(p.id_parada > 0)
          assert.ok(p.id_pedido > 0)
          assert.ok(p.secuencia > 0)
          assert.ok(PARADA_ESTADOS.includes(p.estado_db), `Estado ${p.estado_db} no coincide con CHECK paradas`)
        }
      }
    })
  })

  describe('Reglas de Cliente (siprd.reglas_cliente)', () => {
    it('las reglas cuentan con id_regla, id_cliente, tipo_regla y consistencia de ventana horaria', () => {
      for (const r of REGLAS_CLIENTE) {
        assert.ok(r.id_regla > 0)
        assert.ok(r.id_cliente > 0)
        assert.ok(['VENTANA_HORARIA', 'DIA_NO_DISPONIBLE', 'PREFERENCIA', 'PRIORIDAD', 'OTRA'].includes(r.tipo_regla))
        if (r.tipo_regla === 'VENTANA_HORARIA' && r.hora_inicio && r.hora_fin) {
          assert.ok(r.hora_inicio < r.hora_fin, 'ck_regla_ventana: hora_inicio < hora_fin')
        }
      }
    })
  })

  describe('Usuarios y Roles (siprd.usuarios)', () => {
    it('los usuarios del sistema cuentan con id_usuario, id_rol, correo institucional y nombres/apellidos', () => {
      for (const u of USUARIOS) {
        assert.ok(u.id_usuario > 0)
        assert.ok(u.id_rol > 0)
        assert.ok(u.correo.includes('@alfadistribuidores.com'))
        assert.ok(u.nombres)
        assert.ok(u.apellidos)
      }
    })
  })
})
