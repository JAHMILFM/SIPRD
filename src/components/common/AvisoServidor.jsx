import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/cliente'

export default function AvisoServidor() {
  const [version,setVersion]=useState(null)
  useEffect(()=>{let activo=true;apiFetch('/salud').then(r=>{if(activo)setVersion(r.version)}).catch(()=>{});return ()=>{activo=false}},[])
  const partes=(version || '').split('.').map(Number)
  const anterior=version && (partes[0]<0 || (partes[0]===0 && (partes[1]<3 || (partes[1]===3 && partes[2]<3))))
  if(!anterior)return null
  return <div role="alert" className="card" style={{padding:'14px 18px',marginBottom:14,borderColor:'#fbbf24',fontSize:13,lineHeight:1.6}}><strong>El servidor abierto todavía usa la versión {version}.</strong><p>Para habilitar los permisos del Jefe y cargar sus cobranzas, ejecuta iniciar_sistema.bat y actualiza con Ctrl+F5. Si el iniciador no puede cerrar el servidor anterior, cierra su terminal y vuelve a ejecutarlo.</p></div>
}
