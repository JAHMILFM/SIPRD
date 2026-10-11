import {createContext,useContext,useState,useEffect,useCallback,useRef} from 'react'
import {useAuth} from './AuthContext'
import {apiFetch} from '../api/cliente'
import {planUI,cobroUI} from '../lib/adaptadores'
const Context=import.meta.hot?.data.operacionContext || createContext(null)
if(import.meta.hot)import.meta.hot.data.operacionContext=Context
export const fechaLima=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export function OperacionProvider({children}) {
  const {usuario,puede}=useAuth()
  const [fecha,setFecha]=useState(fechaLima)
  const [vehiculos,setVehiculos]=useState([]),[pedidos,setPedidos]=useState([])
  const [plan,setPlan]=useState(null),[historicas,setHistoricas]=useState([]),[cobros,setCobros]=useState([])
  const [online,setOnline]=useState(false),[error,setError]=useState(''),[cargando,setCargando]=useState(false)
  const serial=useRef(0)
  const refresh=useCallback(async()=>{
    if(!usuario)return
    const id=++serial.current
    setCargando(true)
    const jobs={salud:()=>apiFetch('/salud')}
    if(puede('vehiculos'))jobs.vehiculos=()=>apiFetch('/vehiculos')
    if(puede('pedidos'))jobs.pedidos=()=>apiFetch(`/pedidos?fecha=${fecha}`)
    if(puede('algoritmo')||puede('rutas'))jobs.plan=async()=>{
      const planes=await apiFetch(`/planificaciones?fecha=${fecha}`)
      const actual=planes.find(p=>!['REPLANIFICADA','INVIABLE'].includes(p.estado))
      const datos=actual ? await apiFetch(`/planificaciones/${actual.id}`) : null
      const previas=await Promise.all(planes.filter(p=>p.id!==actual?.id && ['CONFIRMADA','REPLANIFICADA'].includes(p.estado)).map(p=>apiFetch(`/planificaciones/${p.id}`)))
      return {actual:datos,historicas:previas.flatMap(p=>p.rutas.map(r=>({...r,paradas:r.paradas.filter(s=>['ATENDIDA','EN_CAMINO'].includes(s.estado))}))).filter(r=>r.paradas.length)}
    }
    if(puede('cobranzas'))jobs.cobros=()=>apiFetch(`/cobros?fecha=${fecha}`)
    const entries=Object.entries(jobs)
    const result=await Promise.allSettled(entries.map(([,fn])=>fn()))
    if(id!==serial.current)return
    const errors=[]
    result.forEach((r,i)=>{
      const key=entries[i][0]
      if(r.status==='rejected'){errors.push(r.reason.message);if(key==='salud')setOnline(false);return}
      if(key==='salud')setOnline(true)
      if(key==='vehiculos')setVehiculos(r.value)
      if(key==='pedidos')setPedidos(r.value)
      if(key==='plan'){setPlan(r.value.actual);setHistoricas(r.value.historicas)}
      if(key==='cobros')setCobros(r.value.map(cobroUI))
    })
    setError([...new Set(errors)].join(' · '));setCargando(false)
  },[usuario,puede,fecha])
  useEffect(()=>{setPlan(null);setHistoricas([]);setCobros([]);setPedidos([]);refresh();const t=setInterval(refresh,30000);return()=>{clearInterval(t);serial.current++}},[refresh])
  useEffect(()=>{
    if(!usuario || !puede('cobranzas'))return
    let vigente=true,ocupado=false
    const cargar=async()=>{if(ocupado)return;ocupado=true;try{const datos=await apiFetch(`/cobros?fecha=${fecha}`);if(vigente)setCobros(datos.map(cobroUI))}catch{}finally{ocupado=false}}
    const timer=setInterval(cargar,5000)
    return()=>{vigente=false;clearInterval(timer)}
  },[usuario,puede,fecha])
  const rutas=plan ? planUI(plan,vehiculos,pedidos).rutas : []
  const resumen=rutas.map(r=>({...r,paradas:[...r.paradas]}))
  const vistos=new Set(resumen.flatMap(r=>r.paradas.map(s=>String(s.pedido_id))))
  for(const antigua of planUI({rutas:historicas},vehiculos,pedidos).rutas){
    let r=resumen.find(r=>r.vehiculo.id===antigua.vehiculo.id)
    if(!r){r={...antigua,paradas:[]};resumen.push(r)}
    for(const s of antigua.paradas)if(!vistos.has(String(s.pedido_id))){r.paradas.push(s);vistos.add(String(s.pedido_id))}
  }
  return <Context.Provider value={{fecha,setFecha,vehiculos,pedidos,plan,setPlan,rutas,rutasResumen:resumen,cobros,refresh,online,error,cargando}}>{children}</Context.Provider>
}
export const useOperacion=()=>useContext(Context)
