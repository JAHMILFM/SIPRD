import unittest
from datetime import date, time
from types import SimpleNamespace
from motor.motor.modelos import Punto, VehiculoVRP, InstanciaVRP
from motor.motor.zonas import optimizar_zonas, zona_de
from motor.motor.hibrido.evaluacion import evaluar_ruta
from backend.app.core.planificacion import intervalos


class JornadaTest(unittest.TestCase):
    def setUp(self):
        self.deposito = Punto(id="d", lat=-12.2748, lon=-76.8711)
        self.v = VehiculoVRP(
            id="v", placa="FIC", capacidad_peso_kg=1500, capacidad_volumen_m3=8
        )

    def test_seis_vehiculos_zonas_72_sin_duplicados(self):
        ps = []
        for nombre, n, lat, lon in [
            ("N", 24, -11.98, -77.06),
            ("S", 24, -12.18, -76.97),
            ("E", 12, -12.05, -76.92),
            ("C", 12, -12.08, -77.04),
        ]:
            ps += [
                Punto(
                    id=f"{nombre}{i}",
                    lat=lat + i * 0.0001,
                    lon=lon,
                    peso_kg=120,
                    volumen_m3=0.35,
                    intervalos_recepcion=[[480, 900]],
                )
                for i in range(n)
            ]
        dist = [
            [0 if i == j else 40 if not i or not j else 1 for j in range(73)]
            for i in range(73)
        ]
        tiempos = [
            [0 if i == j else 80 if not i or not j else 5 for j in range(73)]
            for i in range(73)
        ]
        sol = optimizar_zonas(
            InstanciaVRP(
                fecha="2026-10-10",
                deposito=self.deposito,
                pedidos=ps,
                vehiculos=[self.v.model_copy(update={"id": str(i)}) for i in range(6)],
                matriz_distancias=dist,
                matriz_tiempos=tiempos,
            )
        )
        ids = [p.pedido_id for r in sol.rutas for p in r.paradas]
        self.assertEqual(72, len(ids))
        self.assertEqual(72, len(set(ids)))
        self.assertFalse(sol.no_asignados)
        self.assertEqual(
            ["CENTRO", "ESTE", "NORTE", "NORTE", "SUR", "SUR"],
            sorted(r.zona_operativa for r in sol.rutas),
        )
        self.assertTrue(
            all(
                r.duracion_total_min <= 480 and r.peso_total_kg <= 1500
                for r in sol.rutas
            )
        )
        for r in sol.rutas:
            self.assertTrue(
                all(zona_de(p.lat, p.lon) == r.zona_operativa for p in r.paradas)
            )

    def test_exceso_peso_y_volumen_rechazado(self):
        p = Punto(id="imposible", lat=-12.08, lon=-77.04, peso_kg=1600, volumen_m3=9)
        sol = optimizar_zonas(
            InstanciaVRP(
                fecha="2026-10-10",
                deposito=self.deposito,
                pedidos=[p],
                vehiculos=[self.v],
            )
        )
        self.assertFalse(sol.rutas)
        self.assertEqual(1, len(sol.no_asignados))

    def test_regreso_fuera_de_jornada_rechazado(self):
        p = Punto(id="p", lat=-12.08, lon=-77.04)
        ev = evaluar_ruta(
            self.deposito, [p], self.v, [[0, 1], [1, 0]], [[0, 240], [240, 0]]
        )
        self.assertTrue(any("jornada" in x for x in ev["infracciones"]))

    def test_servicio_completo_dentro_de_intervalo(self):
        p = Punto(id="p", lat=-12.08, lon=-77.04, intervalos_recepcion=[[480, 490]])
        ev = evaluar_ruta(
            self.deposito, [p], self.v, [[0, 1], [1, 0]], [[0, 30], [30, 0]]
        )
        self.assertTrue(ev["infracciones"])

    def test_falta_coordenadas_no_tiene_zona(self):
        self.assertIsNone(zona_de(None, -77))
        self.assertIsNone(zona_de(-12, None))
        self.assertIsNone(zona_de(0, 0))

    def test_exclusion_horaria_y_dia_no_disponible(self):
        def r(tipo, dia=None, a=None, b=None):
            return SimpleNamespace(
                tipo_restriccion=tipo,
                dia_semana=dia,
                fecha_especifica=None,
                hora_inicio=a,
                hora_fin=b,
                activo=True,
            )

        rs = [
            r("VENTANA_HORARIA", a=time(8), b=time(15)),
            r("NO_RECIBE", a=time(12), b=time(13)),
        ]
        self.assertEqual([[480, 720], [780, 900]], intervalos(rs, date(2026, 10, 10)))
        self.assertEqual([], intervalos([r("NO_RECIBE", dia=6)], date(2026, 10, 10)))


if __name__ == "__main__":
    unittest.main()
