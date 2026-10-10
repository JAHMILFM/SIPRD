"""Prueba de integración sobre PostgreSQL. Revierte las escrituras al terminar.
Ejecutar: .venv\\Scripts\\python.exe -m unittest backend.tests.test_datos_integracion -v
"""
import unittest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.main import app
from backend.app.core.db import engine, get_db
from backend.app.models import Pedido, Ruta, Cobro, Cliente, ReglaCliente, Incidencia
from backend.app.datos_demo import cargar_demo


class DatosIntegracion(unittest.TestCase):
    def test_carga_persistencia_permisos_e_idempotencia(self):
        with TestClient(app) as client:
            async def abrir():
                conn = await engine.connect()
                tx = await conn.begin()
                session = AsyncSession(bind=conn, expire_on_commit=False,
                    join_transaction_mode='create_savepoint')
                return conn, tx, session
            conn, tx, db = client.portal.call(abrir)
            async def database():
                yield db
            app.dependency_overrides[get_db] = database
            try:
                def login(user, password):
                    response=client.post('/api/v1/auth/login',json={'usuario':user,'clave':password})
                    self.assertEqual(response.status_code,200,response.text)
                    return {'Authorization':'Bearer '+response.json()['access_token']}
                jefe=login('dhuerta','jefe123')
                repartidor=login('elopez','rep123')
                tesoreria=login('tesoreria','teso123')
                response=client.get('/api/v1/datos',headers=jefe)
                self.assertEqual(response.status_code,200,response.text)
                data=response.json()
                self.assertGreaterEqual(len(data['pedidos']),44)
                self.assertGreaterEqual(len(data['rutas']),3)
                self.assertGreaterEqual(len(client.get('/api/v1/datos',headers=tesoreria).json()['cobros']),9)
                self.assertEqual(client.get('/api/v1/datos').status_code,401)
                vehicle=data['vehiculos'][0]
                edit={**vehicle,'conductor':'Conductor de integración','pesoMax':9.5}
                response=client.put('/api/v1/datos/vehiculos/'+vehicle['id'],json=edit,headers=jefe)
                self.assertEqual(response.status_code,200,response.text)
                async def descartar_cache():
                    db.expire_all()
                client.portal.call(descartar_cache)
                refreshed=client.get('/api/v1/datos',headers=jefe).json()
                persisted=next(v for v in refreshed['vehiculos'] if v['id']==vehicle['id'])
                self.assertEqual(persisted['conductor'],edit['conductor'])
                self.assertEqual(persisted['capacidad_kg'],9500)
                self.assertEqual(client.put('/api/v1/datos/vehiculos/'+vehicle['id'],json=edit,headers=repartidor).status_code,403)
                rule=data['reglas'][0]
                response=client.put('/api/v1/datos/reglas/'+rule['id'],json={**rule,'dias':[1,3,5],'ventana':'09:00–13:00'},headers=jefe)
                self.assertEqual(response.status_code,200,response.text)
                response=client.post('/api/v1/datos/reglas/'+rule['id']+'/desactivar',headers=jefe)
                self.assertEqual(response.status_code,200,response.text)
                refreshed=client.get('/api/v1/datos',headers=jefe).json()
                self.assertNotIn(rule['id'],[r['id'] for r in refreshed['reglas']])
                route=data['rutas'][0]
                payload={'paradas':[{'id':int(p['id']),'secuencia':p['secuencia'],'bloqueado':p['bloqueado']} for p in route['paradas']]}
                response=client.put('/api/v1/datos/rutas/'+route['id'],json=payload,headers=jefe)
                self.assertEqual(response.status_code,409,response.text)
                payload['paradas'][0]['secuencia']=8
                self.assertEqual(client.put('/api/v1/datos/rutas/'+route['id'],json=payload,headers=jefe).status_code,409)
                cobro=next(c for c in client.get('/api/v1/datos',headers=tesoreria).json()['cobros'] if c['estado']=='pendiente')
                response=client.post('/api/v1/cobros/'+cobro['id']+'/contraste',json={'resultado':'CONFORME','movimiento_bancario':'MOV-INTEGRACION'},headers=tesoreria)
                self.assertEqual(response.status_code,200,response.text)
                refreshed=client.get('/api/v1/datos',headers=tesoreria).json()
                self.assertEqual(next(c for c in refreshed['cobros'] if c['id']==cobro['id'])['estado'],'validado')
                response=client.get('/api/v1/cobros/'+cobro['id']+'/comprobante/archivo',headers=tesoreria)
                self.assertEqual(response.status_code,200,response.text)
                self.assertTrue(response.content.startswith(b'%PDF'))
                response=client.get('/api/v1/cobros/exportacion.xlsx',headers=tesoreria)
                self.assertEqual(response.status_code,200,response.text)
                self.assertTrue(response.content.startswith(b'PK'))
                # El conjunto completo conserva exactamente sus cantidades al repetir carga.
                async def cantidades():
                    return [await db.scalar(select(func.count()).select_from(model)) for model in [Pedido,Ruta,Cobro,Cliente,ReglaCliente,Incidencia]]
                before=client.portal.call(cantidades)
                client.portal.call(cargar_demo,db)
                after=client.portal.call(cantidades)
                self.assertEqual(before,after)
                response=client.post('/api/v1/planificaciones',headers=jefe,json={'fecha':'10/10/2026','vehiculo_ids':[vehicle['id']]})
                self.assertEqual(response.status_code,201,response.text)
                self.assertGreater(response.json()['resumen']['total_pedidos_asignados'],0)
            finally:
                app.dependency_overrides.pop(get_db,None)
                async def cerrar():
                    await db.close()
                    await tx.rollback()
                    await conn.close()
                client.portal.call(cerrar)

if __name__=='__main__':
    unittest.main()
