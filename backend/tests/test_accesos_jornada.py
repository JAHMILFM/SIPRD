import unittest
from datetime import timedelta, date
from types import SimpleNamespace
from fastapi.security import HTTPAuthorizationCredentials
from backend.app.core.tiempo import ahora
from backend.app.core.seguridad import (
    crear_access_token,
    obtener_usuario_actual,
    decodificar_token,
)
from backend.app.core.reparto import generar_pin_diario
from backend.app.core.errores import ErrorNoAutorizado


class FakeDb:
    def __init__(self, user):
        self.user = user

    async def get(self, model, id):
        return self.user


class AccesosTest(unittest.IsolatedAsyncioTestCase):

    def test_pin_diario_tiene_cuatro_digitos(self):
        for _ in range(20):
            pin = generar_pin_diario()
            self.assertTrue(pin.isdecimal())
            self.assertEqual(4, len(pin))

    def usuario(self, version=2, hasta=None):
        return SimpleNamespace(
            id_usuario=123,
            activo=True,
            rol_rel=SimpleNamespace(activo=True),
            rol="REPARTIDOR",
            version_sesion=version,
            clave_vigente_hasta=hasta or ahora() - timedelta(seconds=1),
            id_vehiculo=1,
            fecha_reparto=date.today(),
        )

    async def test_clave_vencida_rechaza_token_firmado_vigente(self):
        token = crear_access_token({"sub": "123", "version_sesion": 2})
        with self.assertRaises(ErrorNoAutorizado):
            await obtener_usuario_actual(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
                FakeDb(self.usuario()),
            )

    async def test_version_anterior_rechazada_tras_rotacion(self):
        token = crear_access_token({"sub": "123", "version_sesion": 1})
        with self.assertRaises(ErrorNoAutorizado):
            await obtener_usuario_actual(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
                FakeDb(self.usuario(hasta=ahora() + timedelta(hours=1))),
            )

    def test_jwt_expirado_rechazado(self):
        token = crear_access_token({"sub": "123"}, timedelta(seconds=-1))
        with self.assertRaises(ErrorNoAutorizado):
            decodificar_token(token)
