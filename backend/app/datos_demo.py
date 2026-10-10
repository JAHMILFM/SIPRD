"""Datos sintéticos de una jornada. Se agregan una sola vez y no se sobrescriben."""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import uuid5, NAMESPACE_URL
from pathlib import Path
from sqlalchemy import select
from backend.app.core.config import settings
from backend.app.models import (Usuario, Vehiculo, Cliente, Pedido, ReglaCliente,
    Planificacion, PlanificacionVersion, Ruta, ParadaRuta, Cobro, Incidencia,
    ComprobantePago, ObservacionCobro, Auditoria)


# Nombres ficticios para los clientes de la jornada de práctica.
NOMBRES_CLIENTES = [
    'Botica Las Palmeras', 'Comercial Santa Lucía', 'Minimarket Los Cedros',
    'Farmacia Nueva Esperanza', 'Bodega Don Mateo', 'Distribuidora Sol del Norte',
    'Botica Salud Serena', 'Comercial Valle Verde', 'Minimarket La Encina',
    'Farmacia Buen Vivir', 'Bodega Los Girasoles', 'Distribuidora Costa Azul',
    'Botica Vida Plena', 'Comercial Monte Claro', 'Minimarket San Gabriel',
    'Farmacia Villa Salud', 'Bodega Doña Elena', 'Distribuidora Brisa del Sur',
    'Botica El Roble', 'Comercial Nuevo Horizonte', 'Minimarket Las Orquídeas',
    'Farmacia Camino Real', 'Bodega La Alameda', 'Distribuidora Portal del Este',
]

async def actualizar_nombres_clientes(db):
    """Reemplaza solo etiquetas genéricas del lote conocido; conserva cambios del usuario."""
    cambios = []
    for i, nombre in enumerate(NOMBRES_CLIENTES, 1):
        cliente = await db.scalar(select(Cliente).where(Cliente.codigo_externo == f'DEMO-CLI-{i:03d}'))
        if cliente and cliente.razon_social in {f'Cliente simulado {i:02d}', f'Cliente simulado {i}', f'Cliente {i}'}:
            cambios.append({'id': cliente.id, 'antes': cliente.razon_social, 'despues': nombre})
            cliente.razon_social = nombre
    await db.flush()
    return cambios


def demo_id(key):
    return str(uuid5(NAMESPACE_URL, 'siprd-demo-v1/' + key))


def comprobante_pdf(path, codigo, monto):
    text = f'DATOS SIMULADOS - SIN VALOR TRIBUTARIO | {codigo} | PEN {monto}'
    stream = f'BT /F1 13 Tf 35 760 Td ({text}) Tj ET'.encode('ascii')
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
    data=bytearray(b'%PDF-1.4\n'); offsets=[0]
    for i,obj in enumerate(objects,1):
        offsets.append(len(data)); data.extend(f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n')
    xref=len(data);data.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
    for offset in offsets[1:]:data.extend(f'{offset:010d} 00000 n \n'.encode())
    data.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode())
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():path.write_bytes(data)
    return path.stat().st_size


async def cargar_demo(db):
    await actualizar_nombres_clientes(db)
    await completar_cobranzas_jornada(db)
    plan_id=demo_id('plan')
    if await db.get(Planificacion,plan_id):
        await cargar_pendientes(db)
        await db.commit()
        return
    fecha=date(2026,10,10)
    jefe=(await db.execute(select(Usuario).where(Usuario.correo=='dhuerta@alfadistribuidores.com'))).scalar_one()
    repartidor=(await db.execute(select(Usuario).where(Usuario.correo=='elopez@alfadistribuidores.com'))).scalar_one()
    tesoreria=(await db.execute(select(Usuario).where(Usuario.correo=='tesoreria@alfadistribuidores.com'))).scalar_one()
    flota=(await db.execute(select(Vehiculo).where(Vehiculo.activo==True).order_by(Vehiculo.id_vehiculo).limit(3))).scalars().all()
    if len(flota)<3:
        raise RuntimeError('Se necesitan tres vehiculos activos para cargar la jornada simulada')
    clientes=[];pedidos=[]
    districts=[('Lima Cercado',-12.0464,-77.0428),('Los Olivos',-11.991,-77.073),('San Juan de Lurigancho',-12.008,-77.012),('Chorrillos',-12.168,-77.026)]
    for i in range(24):
        code=f'DEMO-CLI-{i+1:03d}'; distrito,lat,lon=districts[i%4]
        cliente=(await db.execute(select(Cliente).where(Cliente.codigo_externo==code))).scalar_one_or_none()
        if not cliente:
            cliente=Cliente(codigo_externo=code,razon_social=NOMBRES_CLIENTES[i],direccion=f'Av. de Prueba {100+i*15}',distrito=distrito,provincia='Lima',latitud=lat+(i//4)*.001,longitud=lon+(i//4)*.001,activo=True)
            db.add(cliente);await db.flush()
            db.add(ReglaCliente(id_cliente=cliente.id_cliente,tipo_regla='VENTANA_HORARIA',hora_inicio=time(8),hora_fin=time(17),activa=True,es_restriccion_dura=True,observacion='Regla simulada'))
        clientes.append(cliente)
        code=f'DEMO-PED-{i+1:03d}'
        pedido=(await db.execute(select(Pedido).where(Pedido.codigo_externo==code))).scalar_one_or_none()
        if not pedido:
            pedido=Pedido(codigo_externo=code,id_cliente=cliente.id_cliente,id_vehiculo=flota[i//8].id_vehiculo,fecha_programada=fecha,peso_kg=100+i*12,volumen_m3=Decimal('0.15')+Decimal(i)/100,importe=Decimal('150.00')+Decimal(i)*25,estado='ENTREGADO' if i%8<3 else 'EN_RUTA',origen='SIMULADO',habilitado_despacho=True)
            db.add(pedido);await db.flush()
        pedidos.append(pedido)
    db.add(Planificacion(id=plan_id,fecha=fecha.strftime('%d/%m/%Y'),creada_por=jefe.id,version_vigente=1))
    await db.flush();version_id=demo_id('version')
    db.add(PlanificacionVersion(id=version_id,planificacion_id=plan_id,numero=1,estado='CONFIRMADA',motivo='Jornada de datos simulados',metodo='SIMULADO',creada_por=jefe.id,confirmada_por=jefe.id,confirmada_en=datetime.now(timezone.utc),parametros={},resumen={'pedidos':24,'rutas':3}))
    await db.flush()
    for n,vehiculo in enumerate(flota):
        ruta=Ruta(id_vehiculo=vehiculo.id_vehiculo,version_id=version_id,fecha_ruta=fecha,estado='EN_EJECUCION',distancia_total_km=35+n*10,tiempo_estimado_min=240+n*20,id_usuario_aprobador=jefe.id_usuario,id_repartidor=repartidor.id_usuario,fecha_aprobacion=datetime.now(timezone.utc))
        db.add(ruta);await db.flush()
        for j in range(8):
            i=n*8+j;pedido=pedidos[i]
            parada=ParadaRuta(id_ruta=ruta.id_ruta,id_pedido=pedido.id_pedido,secuencia=j+1,eta_estimada=datetime.combine(fecha,time(8),tzinfo=timezone.utc)+timedelta(minutes=40*j),estado='ATENDIDA' if j<3 else ('EN_CAMINO' if j==3 else 'PENDIENTE'),tiempo_servicio_min=15,distancia_anterior_km=4,tiempo_desde_anterior_min=20)
            db.add(parada);await db.flush()
            if j<3:
                estado=['CONFORME','PENDIENTE_CONTRASTE','OBSERVADO'][j]
                cobro=Cobro(id=demo_id(f'cobro-{i}'),parada_id=parada.id_parada,pedido_id=pedido.id_pedido,metodo_pago=['EFECTIVO','TRANSFERENCIA','YAPE'][j],monto_esperado=pedido.importe,monto_cobrado=pedido.importe,numero_operacion=f'SIM-{i+1:06d}',estado=estado,registrado_por=repartidor.id_usuario,validado_por=tesoreria.id_usuario if j!=1 else None,nota='Comprobante simulado por revisar' if j==2 else 'Cobro simulado')
                db.add(cobro);await db.flush()
                clave=f'comprobantes/demo-{i}.pdf';size=comprobante_pdf(Path(settings.UPLOAD_DIR)/clave,pedido.codigo_externo,pedido.importe)
                db.add(ComprobantePago(id=demo_id(f'comp-{i}'),cobro_id=cobro.id,nombre_archivo=f'comprobante-simulado-{i}.pdf',tipo_mime='application/pdf',tamanio_bytes=size,ruta_almacenamiento=clave,version=1,vigente=True,subido_por=repartidor.id_usuario))
                if j==2:db.add(ObservacionCobro(cobro_id=cobro.id,usuario_id=tesoreria.id_usuario,motivo='SIMULADO',detalle='Número de operación pendiente de cotejo en el escenario de prueba.',resuelta=False))
            if j==7:db.add(Incidencia(id_parada=parada.id_parada,tipo='CLIENTE_CERRADO',descripcion='Incidencia simulada: cliente solicitó reprogramación.',estado='ABIERTA'))
    await cargar_pendientes(db)
    await completar_cobranzas_jornada(db)
    db.add(Auditoria(id_usuario=jefe.id_usuario,entidad='datos_demo',id_entidad=0,accion='CREAR',valor_nuevo={'lote':'siprd-demo-v1','pedidos':24,'rutas':3,'cobros':9,'incidencias':3}))
    await db.commit()

async def cargar_pendientes(db):
    for i in range(8):
        code=f'DEMO-PEND-{i+1:03d}'
        if (await db.execute(select(Pedido).where(Pedido.codigo_externo==code))).scalar_one_or_none():continue
        cliente=(await db.execute(select(Cliente).where(Cliente.codigo_externo==f'DEMO-CLI-{i+1:03d}'))).scalar_one()
        db.add(Pedido(codigo_externo=code,id_cliente=cliente.id_cliente,fecha_programada=date(2026,10,10),peso_kg=180+i*10,volumen_m3=Decimal('0.20'),importe=Decimal('200.00')+i*15,estado='PENDIENTE',origen='SIMULADO',habilitado_despacho=True))
    await db.flush()


async def completar_cobranzas_jornada(db):
    """Mejora solo etiquetas originales del lote ficticio; conserva datos personalizados."""
    cambios=[]
    for i in range(24):
        cobro=await db.get(Cobro,demo_id(f'cobro-{i}'))
        if not cobro or cobro.nota not in ['Cobro simulado','Comprobante simulado por revisar']:continue
        pedido=await db.get(Pedido,cobro.pedido_id)
        parada=await db.get(ParadaRuta,cobro.parada_id) if cobro.parada_id else None
        if not pedido or pedido.origen!='SIMULADO' or not parada or parada.id_pedido!=pedido.id_pedido:continue
        ruta=await db.get(Ruta,parada.id_ruta)
        if not ruta or ruta.id_repartidor!=cobro.registrado_por:continue
        antes=dict(nota=cobro.nota,numero_operacion=cobro.numero_operacion,fecha_registro=str(cobro.fecha_registro),estado_pedido=pedido.estado)
        notas={
            'CONFORME':'Cobro conciliado con el arqueo de caja.' if cobro.metodo_pago=='EFECTIVO' else 'Abono confirmado en la cuenta de recaudación.',
            'PENDIENTE_CONTRASTE':'Transferencia recibida; pendiente de cotejo con el movimiento bancario.',
            'OBSERVADO':'La captura no permite leer el número de operación. Se solicitó un comprobante legible.',
        }
        cobro.nota=notas.get(cobro.estado,'Cobro registrado; pendiente de revisión por Tesorería.')
        if (cobro.numero_operacion or '').startswith('SIM-'):
            cobro.numero_operacion=None if cobro.metodo_pago=='EFECTIVO' else f'261010{870000+i:06d}'
        # Horarios de la jornada en Lima (UTC-5), posteriores a la entrega.
        llegada=datetime.combine(ruta.fecha_ruta,time(8),tzinfo=timezone(timedelta(hours=-5)))+timedelta(minutes=40*(parada.secuencia-1)+(i//8)*10)
        if not parada.hora_llegada_real:parada.hora_llegada_real=llegada
        cobro.fecha_registro=llegada+timedelta(minutes=15)
        if cobro.estado in ['CONFORME','OBSERVADO'] and not cobro.fecha_validacion:
            cobro.fecha_validacion=cobro.fecha_registro+timedelta(minutes=30)
        if cobro.estado=='OBSERVADO':
            observaciones=(await db.scalars(select(ObservacionCobro).where(ObservacionCobro.cobro_id==cobro.id,ObservacionCobro.motivo=='SIMULADO'))).all()
            for obs in observaciones:
                obs.motivo='COMPROBANTE_ILEGIBLE';obs.detalle=cobro.nota
        if cobro.estado=='CONFORME' and pedido.estado=='ENTREGADO':
            conformes=(await db.scalars(select(Cobro).where(Cobro.pedido_id==pedido.id_pedido,Cobro.estado=='CONFORME'))).all()
            if sum(c.monto_cobrado for c in conformes)==pedido.importe:pedido.estado='CERRADO'
        despues=dict(nota=cobro.nota,numero_operacion=cobro.numero_operacion,fecha_registro=str(cobro.fecha_registro),estado_pedido=pedido.estado)
        cambios.append(dict(id=cobro.id,antes=antes,despues=despues))
        db.add(Auditoria(id_usuario=None,entidad='cobro',id_entidad=0,accion='ACTUALIZAR',valor_anterior=antes,valor_nuevo={'lote':'siprd-demo-v1','cobro_id':cobro.id,**despues}))
    await db.flush()
    return cambios
