import unittest
from types import SimpleNamespace
from backend.app.core.permisos import permisos_rol, permiso_peticion


class PermisosTest(unittest.TestCase):
    def test_rol_sin_permisos_explicitos_usa_defaults(self):
        self.assertIn(
            "confirmar",
            permisos_rol(
                SimpleNamespace(nombre="ASISTENTE_DISTRIBUCION", permisos=None)
            ),
        )

    def test_revocar_todos_no_restaura_defaults(self):
        self.assertEqual(
            permisos_rol(SimpleNamespace(nombre="ASISTENTE_DISTRIBUCION", permisos=[])),
            [],
        )

    def test_disponibilidad_no_elude_permiso_restricciones(self):
        self.assertEqual(
            permiso_peticion("/api/v1/clientes/1/disponibilidad", "PUT", "ASISTENTE"),
            "restricciones",
        )

    def test_exportacion_no_elude_permisos_por_reparto(self):
        self.assertEqual(
            permiso_peticion("/api/v1/cobros/exportacion.xlsx", "GET", "REPARTIDOR"),
            "cobranzas",
        )

    def test_generar_exige_planificar_aunque_se_pueda_ver_rutas(self):
        self.assertEqual(
            permiso_peticion("/api/v1/planificaciones/previsualizar", "POST", "JEFE"),
            "algoritmo",
        )

    def test_consultar_cobros_no_permite_registrar_pago(self):
        self.assertEqual(permiso_peticion('/api/v1/cobros','POST','TESORERIA'),'reparto')
    def test_consultar_pedidos_no_permite_importar(self):
        self.assertEqual(permiso_peticion('/api/v1/pedidos/importaciones','POST','TESORERIA'),'algoritmo')
    def test_consultar_rutas_no_permite_firmar_entrega(self):
        self.assertEqual(permiso_peticion('/api/v1/reparto/paradas/1/evidencias','POST','ASISTENTE'),'reparto')
