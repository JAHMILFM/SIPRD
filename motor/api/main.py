from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from motor.motor.modelos import InstanciaVRP, SolucionVRP, Punto, VehiculoVRP
from motor.motor.planificador import optimizar_vrp
from motor.motor.evaluador import evaluar_rutas_manuales
from motor.motor.replanificador import replanificar_operacion

app = FastAPI(title="SIPRD Motor de Optimización", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/salud")
async def salud():
    return {"estado": "OK", "servicio": "SIPRD Motor VRP", "version": "0.5.0"}

@app.post("/api/planes/optimizar", response_model=SolucionVRP)
async def endpoint_optimizar(
    instancia: InstanciaVRP,
    metodo: str = Query("hibrido", regex="^(hibrido|ortools|base)$")
):
    """Genera propuesta de rutas optimizadas cumpliendo capacidad y ventanas."""
    return optimizar_vrp(instancia, metodo=metodo.upper())

class EvaluarRequest(BaseModel):
    deposito: Punto
    rutas: List[Dict[str, Any]]
    vehiculos: List[VehiculoVRP]
    pedidos: List[Punto]

@app.post("/api/planes/evaluar")
async def endpoint_evaluar(req: EvaluarRequest):
    """Evalúa rutas fijas/manuales y devuelve métricas e infracciones."""
    return evaluar_rutas_manuales(
        deposito=req.deposito,
        rutas_manuales=req.rutas,
        vehiculos=req.vehiculos,
        pedidos_todos=req.pedidos
    )

class ReplanificarRequest(BaseModel):
    deposito: Punto
    pedidos_pendientes: List[Punto]
    vehiculos_activos: List[VehiculoVRP]
    hora_actual: str = "12:00"
    fecha: str = "27/08/2026"

@app.post("/api/planes/replanificar", response_model=SolucionVRP)
async def endpoint_replanificar(req: ReplanificarRequest):
    """Replanifica pedidos pendientes en respuesta a incidentes."""
    return replanificar_operacion(
        deposito=req.deposito,
        pedidos_pendientes=req.pedidos_pendientes,
        vehiculos_activos=req.vehiculos_activos,
        hora_actual=req.hora_actual,
        fecha=req.fecha
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("motor.api.main:app", host="127.0.0.1", port=8001, reload=True)
