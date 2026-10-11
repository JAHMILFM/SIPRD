import {useState,useEffect} from 'react'
import {apiFetch} from '../api/cliente'
import {useOperacion} from '../context/OperacionContext'
import {useToast} from '../context/ToastContext'
export default function AccesosReparto(){
  const {fecha}=useOperacion(),{toast}=useToast()
  const [filas,setFilas]=useState([]),[claves,setClaves]=useState({})
  const cargar=async()=>{try{setFilas(await apiFetch(`/accesos-reparto?fecha=${fecha}`))}catch(e){toast.error(e.message)}}
  useEffect(()=>{setClaves({});cargar()},[fecha])
  const mostrar=async(id)=>{try{const r=await apiFetch(`/accesos-reparto/${id}/clave`);setClaves(p=>({...p,[id]:r.clave}))}catch(e){toast.error(e.message)}}
  const regenerarJornada=async()=>{const primero=filas[0];if(!primero)return;try{await apiFetch(`/accesos-reparto/${primero.id}/regenerar`,{method:'POST'});setClaves({});await cargar();toast.success('PIN diario renovado para todos los repartidores; las sesiones anteriores quedan invalidadas.')}catch(e){toast.error(e.message)}}
  return <div className="card"><div className="ch"><div><h3>Accesos de reparto de la jornada</h3><p>Usuario por placa · PIN único diario de 4 dígitos para todos los repartidores, vigente hasta el final del día.</p></div><div style={{display:'flex',gap:8}}><button className="btn out" onClick={async()=>{try{await apiFetch(`/accesos-reparto/generar?fecha=${fecha}`,{method:'POST'});await cargar()}catch(e){toast.error(e.message)}}}>Actualizar accesos</button><button className="btn out" disabled={!filas.length} onClick={regenerarJornada}>Renovar PIN diario</button></div></div><div className="tw"><table><thead><tr><th>Placa / usuario</th><th>PIN diario único</th><th>Vigencia</th><th>Acciones</th></tr></thead><tbody>{filas.map(r=><tr key={r.id}><td>{r.placa} · {r.usuario}</td><td>{claves[r.id] || '••••'}</td><td>{r.vigente_hasta?new Date(r.vigente_hasta).toLocaleString('es-PE'):'Disponible el día del reparto'}</td><td><button className="btn out" onClick={()=>mostrar(r.id)}>Mostrar</button></td></tr>)}</tbody></table>{!filas.length&&<p style={{padding:16}}>No hay accesos generados para esta fecha. Se habilitan al confirmar rutas del día.</p>}</div></div>
}
