// Datos de demostración para Rutas, Cobranzas e Inicio.
// En producción estos llegan del backend (GET /api/rutas/activas, etc.)

export const FECHA = '27/08/2026'

// ──────────────────────────────────────────────────
// RUTAS EN EJECUCIÓN
// ──────────────────────────────────────────────────
export const RUTAS_ACTIVAS = [
  {
    id: 'R1',
    id_ruta: 1,
    id_vehiculo: 1,
    id_ejecucion: 1,
    fecha_ruta: '2026-08-27',
    color: '#2563EB',
    vehiculo: { id_vehiculo: 1, codigo_externo: 'VEH-001', placa: 'BCE-869', marca: 'Hyundai', modelo: 'HD78', conductor: 'Elías López', capacidad_kg: 12000, pesoMax: 12, capacidad_m3: 32, volMax: 32, estado: 'ASIGNADO', activo: true },
    estado: 'en_ruta',
    estado_db: 'EN_EJECUCION',
    distancia_total_km: 42.8,
    tiempo_estimado_min: 265,
    fitness: 115.42,
    id_usuario_aprobador: 1,
    fecha_aprobacion: '2026-08-27T07:45:00Z',
    fecha_creacion: '2026-08-27T07:30:00Z',
    horaInicio: '08:05',
    paradas: [
      { id: 'p1-1', id_parada: 101, id_ruta: 1, id_pedido: 9303910, secuencia: 1, orden: 1, cliente: 'BOTICAS INKAFARMA — Los Olivos', dir: 'Av. Alfredo Mendiola 3550, Los Olivos', ventana: '08:00–14:00', prioridad: 'Alta', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '08:52', hora_llegada_real: '2026-08-27T08:52:00Z', eta_estimada: '2026-08-27T08:50:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 5.2, tiempo_desde_anterior_min: 18, tiempo_servicio_min: 20, bultos: 22, monto: 2340 },
      { id: 'p1-2', id_parada: 102, id_ruta: 1, id_pedido: 9302311, secuencia: 2, orden: 2, cliente: 'RIVAS CASTRO, CARMEN', dir: 'Av. Universitaria 4520, Los Olivos', ventana: 'Todo el día', prioridad: 'Media', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '09:28', hora_llegada_real: '2026-08-27T09:28:00Z', eta_estimada: '2026-08-27T09:25:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.8, tiempo_desde_anterior_min: 14, tiempo_servicio_min: 18, bultos: 18, monto: 1180 },
      { id: 'p1-3', id_parada: 103, id_ruta: 1, id_pedido: 9302890, secuencia: 3, orden: 3, cliente: 'INVERSIONES PACÍFICO S.A.C.', dir: 'Av. Túpac Amaru 1234, Independencia', ventana: 'Todo el día', prioridad: 'Media', estado: 'en_camino', estado_db: 'EN_CAMINO', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T10:15:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 4.1, tiempo_desde_anterior_min: 16, tiempo_servicio_min: 15, bultos: 20, monto: 890 },
      { id: 'p1-4', id_parada: 104, id_ruta: 1, id_pedido: 9301982, secuencia: 4, orden: 4, cliente: 'QUIÑONES VALENZUELA, VIRGINIA', dir: 'Jr. Madre Selva 592, Carabayllo', ventana: '09:00–13:00', prioridad: 'Alta', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T11:05:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 6.3, tiempo_desde_anterior_min: 22, tiempo_servicio_min: 15, bultos: 32, monto: 1560 },
      { id: 'p1-5', id_parada: 105, id_ruta: 1, id_pedido: 9301307, secuencia: 5, orden: 5, cliente: 'MINIMARKET DON JOSÉ', dir: 'Jr. Huáscar 415, Comas', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T11:45:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 4.0, tiempo_desde_anterior_min: 15, tiempo_servicio_min: 18, bultos: 9, monto: 430 },
      { id: 'p1-6', id_parada: 106, id_ruta: 1, id_pedido: 9400100, secuencia: 6, orden: 6, cliente: 'DISTRIBUIDORA ANDINA S.A.C.', dir: 'Av. Túpac Amaru 890, Independencia', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T12:20:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.5, tiempo_desde_anterior_min: 14, tiempo_servicio_min: 15, bultos: 14, monto: 720 },
      { id: 'p1-7', id_parada: 107, id_ruta: 1, id_pedido: 9400137, secuencia: 7, orden: 7, cliente: 'BODEGA LA ESQUINA', dir: 'Mz. J Lote 8, San Martín de Porres', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T13:00:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 4.8, tiempo_desde_anterior_min: 18, tiempo_servicio_min: 15, bultos: 6, monto: 310 },
    ],
  },
  {
    id: 'R2',
    id_ruta: 2,
    id_vehiculo: 2,
    id_ejecucion: 1,
    fecha_ruta: '2026-08-27',
    color: '#16A34A',
    vehiculo: { id_vehiculo: 2, codigo_externo: 'VEH-002', placa: 'DB8-877', marca: 'Toyota', modelo: 'Dyna', conductor: 'Marcos Camacho', capacidad_kg: 12000, pesoMax: 12, capacidad_m3: 32, volMax: 32, estado: 'ASIGNADO', activo: true },
    estado: 'en_ruta',
    estado_db: 'EN_EJECUCION',
    distancia_total_km: 38.6,
    tiempo_estimado_min: 245,
    fitness: 102.15,
    id_usuario_aprobador: 1,
    fecha_aprobacion: '2026-08-27T07:45:00Z',
    fecha_creacion: '2026-08-27T07:30:00Z',
    horaInicio: '08:10',
    paradas: [
      { id: 'p2-1', id_parada: 201, id_ruta: 2, id_pedido: 9300778, secuencia: 1, orden: 1, cliente: 'RODRIGUEZ BERNAL RAMOS S.A.C.', dir: 'Av. Sáenz Peña 1120, Callao', ventana: '08:00–12:00', prioridad: 'Alta', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '08:55', hora_llegada_real: '2026-08-27T08:55:00Z', eta_estimada: '2026-08-27T08:50:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 6.1, tiempo_desde_anterior_min: 22, tiempo_servicio_min: 20, bultos: 9, monto: 1890 },
      { id: 'p2-2', id_parada: 202, id_ruta: 2, id_pedido: 3901336, secuencia: 2, orden: 2, cliente: 'HERRERA DAMAS, ESTHER', dir: 'Av. Venezuela 2899, Lima Cercado', ventana: 'Todo el día', prioridad: 'Baja', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '09:31', hora_llegada_real: '2026-08-27T09:31:00Z', eta_estimada: '2026-08-27T09:30:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 4.2, tiempo_desde_anterior_min: 16, tiempo_servicio_min: 15, bultos: 2, monto: 340 },
      { id: 'p2-3', id_parada: 203, id_ruta: 2, id_pedido: 9302657, secuencia: 3, orden: 3, cliente: 'DDIVAS LANDEO E.I.R.L.', dir: 'Jr. Tacna 699, Magdalena del Mar', ventana: 'Todo el día', prioridad: 'Baja', estado: 'en_camino', estado_db: 'EN_CAMINO', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T10:10:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.9, tiempo_desde_anterior_min: 15, tiempo_servicio_min: 15, bultos: 2, monto: 560 },
      { id: 'p2-4', id_parada: 204, id_ruta: 2, id_pedido: 9301455, secuencia: 4, orden: 4, cliente: 'QUIROZ LEON CECILIO', dir: 'Jr. Puno 455, Lima Cercado', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T10:55:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 5.0, tiempo_desde_anterior_min: 20, tiempo_servicio_min: 15, bultos: 4, monto: 280 },
      { id: 'p2-5', id_parada: 205, id_ruta: 2, id_pedido: 9400174, secuencia: 5, orden: 5, cliente: 'BOTICA CENTRAL', dir: 'Jr. Camaná 720, Lima Cercado', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T11:35:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 2.1, tiempo_desde_anterior_min: 10, tiempo_servicio_min: 15, bultos: 11, monto: 670 },
      { id: 'p2-6', id_parada: 206, id_ruta: 2, id_pedido: 9400211, secuencia: 6, orden: 6, cliente: 'ABARROTES SAN MIGUEL', dir: 'Av. La Marina 2450, San Miguel', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T12:15:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 6.4, tiempo_desde_anterior_min: 24, tiempo_servicio_min: 15, bultos: 7, monto: 390 },
    ],
  },
  {
    id: 'R3',
    id_ruta: 3,
    id_vehiculo: 3,
    id_ejecucion: 1,
    fecha_ruta: '2026-08-27',
    color: '#DC2626',
    vehiculo: { id_vehiculo: 3, codigo_externo: 'VEH-003', placa: 'AFG-747', marca: 'Suzuki', modelo: 'Super Carry', conductor: 'Giancarlo Ruiz', capacidad_kg: 8000, pesoMax: 8, capacidad_m3: 21, volMax: 21, estado: 'ASIGNADO', activo: true },
    estado: 'en_ruta',
    estado_db: 'EN_EJECUCION',
    distancia_total_km: 45.2,
    tiempo_estimado_min: 280,
    fitness: 132.80,
    id_usuario_aprobador: 1,
    fecha_aprobacion: '2026-08-27T07:45:00Z',
    fecha_creacion: '2026-08-27T07:30:00Z',
    horaInicio: '08:00',
    paradas: [
      { id: 'p3-1', id_parada: 301, id_ruta: 3, id_pedido: 9300963, secuencia: 1, orden: 1, cliente: 'FARMA IMPERIO S.A.C.', dir: 'Av. Los Jardines Este Mz B Lote 4, SJL', ventana: '08:00–11:00', prioridad: 'Media', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '08:48', hora_llegada_real: '2026-08-27T08:48:00Z', eta_estimada: '2026-08-27T08:45:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 8.5, tiempo_desde_anterior_min: 28, tiempo_servicio_min: 45, bultos: 20, monto: 4200 },
      { id: 'p3-2', id_parada: 302, id_ruta: 3, id_pedido: 9301880, secuencia: 2, orden: 2, cliente: 'BOTICAS BIOFARMAS SALUD Y VIDA', dir: 'Av. Próceres de la Independencia 1820, SJL', ventana: '10:00–16:00', prioridad: 'Alta', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '09:55', hora_llegada_real: '2026-08-27T09:55:00Z', eta_estimada: '2026-08-27T09:50:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 4.1, tiempo_desde_anterior_min: 15, tiempo_servicio_min: 18, bultos: 14, monto: 1760 },
      { id: 'p3-3', id_parada: 303, id_ruta: 3, id_pedido: 9302104, secuencia: 3, orden: 3, cliente: 'AYCFARMA E.I.R.L.', dir: 'Av. Canto Grande 3455, SJL', ventana: 'Todo el día', prioridad: 'Media', estado: 'en_camino', estado_db: 'EN_CAMINO', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T10:30:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.6, tiempo_desde_anterior_min: 14, tiempo_servicio_min: 15, bultos: 11, monto: 920 },
      { id: 'p3-4', id_parada: 304, id_ruta: 3, id_pedido: 9303120, secuencia: 4, orden: 4, cliente: 'FERRETERÍA SAN FELIPE S.A.C.', dir: 'Av. Grau 902, Ate', ventana: '09:00–15:00', prioridad: 'Media', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T11:20:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 7.2, tiempo_desde_anterior_min: 25, tiempo_servicio_min: 20, bultos: 24, monto: 1340 },
      { id: 'p3-5', id_parada: 305, id_ruta: 3, id_pedido: 9303244, secuencia: 5, orden: 5, cliente: 'COMERCIAL H & H S.A.C.', dir: 'Jr. Los Cedros 145, Santa Anita', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T12:05:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.4, tiempo_desde_anterior_min: 14, tiempo_servicio_min: 15, bultos: 14, monto: 680 },
    ],
  },
  {
    id: 'R4',
    id_ruta: 4,
    id_vehiculo: 4,
    id_ejecucion: 1,
    fecha_ruta: '2026-08-27',
    color: '#9333EA',
    vehiculo: { id_vehiculo: 4, codigo_externo: 'VEH-004', placa: 'BHL-751', marca: 'Kia', modelo: 'Bongo', conductor: 'Kevin Vargas', capacidad_kg: 8000, pesoMax: 8, capacidad_m3: 21, volMax: 21, estado: 'ASIGNADO', activo: true },
    estado: 'en_ruta',
    estado_db: 'EN_EJECUCION',
    distancia_total_km: 36.4,
    tiempo_estimado_min: 220,
    fitness: 98.40,
    id_usuario_aprobador: 1,
    fecha_aprobacion: '2026-08-27T07:45:00Z',
    fecha_creacion: '2026-08-27T07:30:00Z',
    horaInicio: '08:15',
    paradas: [
      { id: 'p4-1', id_parada: 401, id_ruta: 4, id_pedido: 9300891, secuencia: 1, orden: 1, cliente: 'GRUPO FAMEZA S.A.C.', dir: 'Z.I. Parque Industrial del Cono Sur, VES', ventana: '14:00–17:00', prioridad: 'Media', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T14:15:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 6.8, tiempo_desde_anterior_min: 20, tiempo_servicio_min: 15, bultos: 31, monto: 3800 },
      { id: 'p4-2', id_parada: 402, id_ruta: 4, id_pedido: 9303380, secuencia: 2, orden: 2, cliente: 'DISTRIB. LUZ Y COLOR S.A.C.', dir: 'Av. El Sol 1120, Villa El Salvador', ventana: '13:00–18:00', prioridad: 'Media', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T14:50:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.1, tiempo_desde_anterior_min: 12, tiempo_servicio_min: 18, bultos: 18, monto: 1100 },
      { id: 'p4-3', id_parada: 403, id_ruta: 4, id_pedido: 9303411, secuencia: 3, orden: 3, cliente: 'BULEJE MUÑOZ, CATHERINE', dir: 'Av. Defensores del Morro 2280, Chorrillos', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T15:30:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 4.5, tiempo_desde_anterior_min: 16, tiempo_servicio_min: 15, bultos: 6, monto: 540 },
      { id: 'p4-4', id_parada: 404, id_ruta: 4, id_pedido: 9303502, secuencia: 4, orden: 4, cliente: 'SALVADOR MAYTA, FLOR', dir: 'Mz. B Lote 3, Sector 2, VMT', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T16:05:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.8, tiempo_desde_anterior_min: 15, tiempo_servicio_min: 15, bultos: 9, monto: 670 },
      { id: 'p4-5', id_parada: 405, id_ruta: 4, id_pedido: 9303618, secuencia: 5, orden: 5, cliente: 'INVERSIONES WIDO E.I.R.L.', dir: 'Av. Pachacútec 4410, VMT', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T16:40:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 2.9, tiempo_desde_anterior_min: 12, tiempo_servicio_min: 18, bultos: 12, monto: 1020 },
    ],
  },
  {
    id: 'R5',
    id_ruta: 5,
    id_vehiculo: 5,
    id_ejecucion: 1,
    fecha_ruta: '2026-08-27',
    color: '#F59E0B',
    vehiculo: { id_vehiculo: 5, codigo_externo: 'VEH-005', placa: 'XXX-000', marca: 'Isuzu', modelo: 'N-Series', conductor: 'Maycol Yance', capacidad_kg: 8000, pesoMax: 8, capacidad_m3: 21, volMax: 21, estado: 'ASIGNADO', activo: true },
    estado: 'en_ruta',
    estado_db: 'EN_EJECUCION',
    distancia_total_km: 34.0,
    tiempo_estimado_min: 210,
    fitness: 91.30,
    id_usuario_aprobador: 1,
    fecha_aprobacion: '2026-08-27T07:45:00Z',
    fecha_creacion: '2026-08-27T07:30:00Z',
    horaInicio: '08:05',
    paradas: [
      { id: 'p5-1', id_parada: 501, id_ruta: 5, id_pedido: 9300047, secuencia: 1, orden: 1, cliente: 'GAMBOA MARROQUIN, PATRICIA', dir: 'Mcdo. Pro Los Pinos 531, Chorrillos', ventana: 'Todo el día', prioridad: 'Baja', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '09:10', hora_llegada_real: '2026-08-27T09:10:00Z', eta_estimada: '2026-08-27T09:05:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 5.1, tiempo_desde_anterior_min: 18, tiempo_servicio_min: 15, bultos: 1, monto: 120 },
      { id: 'p5-2', id_parada: 502, id_ruta: 5, id_pedido: 9303855, secuencia: 2, orden: 2, cliente: 'COSQUILLO ORBEZO, ANA LUZ', dir: 'Av. Brasil 2145, Breña', ventana: 'Todo el día', prioridad: 'Baja', estado: 'entregado', estado_db: 'ATENDIDA', horaReal: '09:48', hora_llegada_real: '2026-08-27T09:48:00Z', eta_estimada: '2026-08-27T09:45:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 6.2, tiempo_desde_anterior_min: 22, tiempo_servicio_min: 15, bultos: 4, monto: 310 },
      { id: 'p5-3', id_parada: 503, id_ruta: 5, id_pedido: 9303740, secuencia: 3, orden: 3, cliente: 'LLANOS VILLEGAS, ELIZABETH', dir: 'Jr. Ica 380 Int. 15, Lima Cercado', ventana: 'Todo el día', prioridad: 'Baja', estado: 'en_camino', estado_db: 'EN_CAMINO', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T10:20:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 3.4, tiempo_desde_anterior_min: 14, tiempo_servicio_min: 15, bultos: 3, monto: 260 },
      { id: 'p5-4', id_parada: 504, id_ruta: 5, id_pedido: 9400248, secuencia: 4, orden: 4, cliente: 'DISTRIBUIDORA LIMA S.A.', dir: 'Av. Arequipa 1890, Lince', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T11:00:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 4.1, tiempo_desde_anterior_min: 16, tiempo_servicio_min: 15, bultos: 8, monto: 780 },
      { id: 'p5-5', id_parada: 505, id_ruta: 5, id_pedido: 9400285, secuencia: 5, orden: 5, cliente: 'BODEGA LA UNIÓN', dir: 'Jr. Sáenz Peña 610, Callao', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', estado_db: 'PENDIENTE', horaReal: null, hora_llegada_real: null, eta_estimada: '2026-08-27T11:40:00Z', bloqueada_manual: false, bloqueado: false, distancia_anterior_km: 5.6, tiempo_desde_anterior_min: 20, tiempo_servicio_min: 15, bultos: 5, monto: 340 },
    ],
  },
]

// ──────────────────────────────────────────────────
// COBRANZAS
// ──────────────────────────────────────────────────
export const COBROS_INICIAL = [
  // R1 – Elías
  { id: 'c1', ruta: 'R1', color: '#2563EB', conductor: 'Elías López', pedido: '9303910', cliente: 'BOTICAS INKAFARMA — Los Olivos', monto: 2340, tipo: 'transferencia', estado: 'validado', hora: '08:54', comprobante: true, nota: 'Operación N° 0184221' },
  { id: 'c2', ruta: 'R1', color: '#2563EB', conductor: 'Elías López', pedido: '9302311', cliente: 'RIVAS CASTRO, CARMEN', monto: 1180, tipo: 'efectivo', estado: 'validado', hora: '09:30', comprobante: false, nota: '' },
  { id: 'c3', ruta: 'R1', color: '#2563EB', conductor: 'Elías López', pedido: '9302890', cliente: 'INVERSIONES PACÍFICO S.A.C.', monto: 890, tipo: 'transferencia', estado: 'pendiente', hora: '10:12', comprobante: true, nota: '' },
  // R2 – Marcos
  { id: 'c4', ruta: 'R2', color: '#16A34A', conductor: 'Marcos Camacho', pedido: '9300778', cliente: 'RODRIGUEZ BERNAL RAMOS S.A.C.', monto: 1890, tipo: 'cheque', estado: 'validado', hora: '08:57', comprobante: true, nota: 'Cheque #00834 Banco BCP' },
  { id: 'c5', ruta: 'R2', color: '#16A34A', conductor: 'Marcos Camacho', pedido: '3901336', cliente: 'HERRERA DAMAS, ESTHER', monto: 340, tipo: 'efectivo', estado: 'pendiente', hora: '09:33', comprobante: false, nota: '' },
  { id: 'c6', ruta: 'R2', color: '#16A34A', conductor: 'Marcos Camacho', pedido: '9302657', cliente: 'DDIVAS LANDEO E.I.R.L.', monto: 560, tipo: 'transferencia', estado: 'pendiente', hora: '10:05', comprobante: true, nota: '' },
  // R3 – Giancarlo
  { id: 'c7', ruta: 'R3', color: '#DC2626', conductor: 'Giancarlo Ruiz', pedido: '9300963', cliente: 'FARMA IMPERIO S.A.C.', monto: 4200, tipo: 'cheque', estado: 'validado', hora: '08:50', comprobante: true, nota: 'Cheque #11209 Banco BBVA' },
  { id: 'c8', ruta: 'R3', color: '#DC2626', conductor: 'Giancarlo Ruiz', pedido: '9301880', cliente: 'BOTICAS BIOFARMAS SALUD Y VIDA', monto: 1760, tipo: 'transferencia', estado: 'validado', hora: '09:57', comprobante: true, nota: 'Operación N° 0219847' },
  { id: 'c9', ruta: 'R3', color: '#DC2626', conductor: 'Giancarlo Ruiz', pedido: '9302104', cliente: 'AYCFARMA E.I.R.L.', monto: 920, tipo: 'efectivo', estado: 'pendiente', hora: '10:28', comprobante: false, nota: '' },
  // R5 – Maycol
  { id: 'c10', ruta: 'R5', color: '#F59E0B', conductor: 'Maycol Yance', pedido: '9300047', cliente: 'GAMBOA MARROQUIN, PATRICIA', monto: 120, tipo: 'efectivo', estado: 'rechazado', hora: '09:12', comprobante: false, nota: 'Billete falso detectado' },
  { id: 'c11', ruta: 'R5', color: '#F59E0B', conductor: 'Maycol Yance', pedido: '9303855', cliente: 'COSQUILLO ORBEZO, ANA LUZ', monto: 310, tipo: 'transferencia', estado: 'validado', hora: '09:50', comprobante: true, nota: 'Operación N° 0198443' },
  { id: 'c12', ruta: 'R5', color: '#F59E0B', conductor: 'Maycol Yance', pedido: '9303740', cliente: 'LLANOS VILLEGAS, ELIZABETH', monto: 260, tipo: 'efectivo', estado: 'pendiente', hora: '10:15', comprobante: false, nota: '' },
]

// ──────────────────────────────────────────────────
// CONFIGURACIÓN — Vehículos y reglas por cliente (Alineado con esquema siprd)
// ──────────────────────────────────────────────────
export const VEHICULOS_CONFIG = [
  { id: 'v1', id_vehiculo: 1, codigo_externo: 'VEH-001', placa: 'BCE-869', marca: 'Hyundai', modelo: 'HD78', año: 2021, conductor: 'Elías López', capacidad_kg: 12000, pesoMax: 12, capacidad_m3: 32, volMax: 32, estado: 'ASIGNADO', activo: true },
  { id: 'v2', id_vehiculo: 2, codigo_externo: 'VEH-002', placa: 'DB8-877', marca: 'Toyota',  modelo: 'Dyna', año: 2020, conductor: 'Marcos Camacho', capacidad_kg: 12000, pesoMax: 12, capacidad_m3: 32, volMax: 32, estado: 'ASIGNADO', activo: true },
  { id: 'v3', id_vehiculo: 3, codigo_externo: 'VEH-003', placa: 'AFG-747', marca: 'Suzuki',  modelo: 'Super Carry', año: 2019, conductor: 'Giancarlo Ruiz', capacidad_kg: 8000, pesoMax: 8,  capacidad_m3: 21, volMax: 21, estado: 'ASIGNADO', activo: true },
  { id: 'v4', id_vehiculo: 4, codigo_externo: 'VEH-004', placa: 'BHL-751', marca: 'Kia',     modelo: 'Bongo', año: 2022, conductor: 'Kevin Vargas', capacidad_kg: 8000, pesoMax: 8,  capacidad_m3: 21, volMax: 21, estado: 'ASIGNADO', activo: true },
  { id: 'v5', id_vehiculo: 5, codigo_externo: 'VEH-005', placa: 'XXX-000', marca: 'Isuzu',   modelo: 'N-Series', año: 2018, conductor: 'Maycol Yance', capacidad_kg: 8000, pesoMax: 8,  capacidad_m3: 21, volMax: 21, estado: 'ASIGNADO', activo: true },
  { id: 'v6', id_vehiculo: 6, codigo_externo: 'VEH-006', placa: 'BUE-734', marca: 'Hino',    modelo: '300', año: 2020, conductor: 'Luis Ordoñez', capacidad_kg: 8000, pesoMax: 8,  capacidad_m3: 21, volMax: 21, estado: 'MANTENIMIENTO', activo: false },
  { id: 'v7', id_vehiculo: 7, codigo_externo: 'VEH-007', placa: 'AFG-748', marca: 'Foton',   modelo: 'Aumark', año: 2017, conductor: 'Héctor Salas', capacidad_kg: 6000, pesoMax: 6,  capacidad_m3: 16, volMax: 16, estado: 'INACTIVO', activo: false },
]

const DIAS = { 0:'Dom', 1:'Lun', 2:'Mar', 3:'Mié', 4:'Jue', 5:'Vie', 6:'Sáb' }
export const DIAS_SEMANA = DIAS

export const REGLAS_CLIENTE = [
  { id: 'r1',  id_regla: 1,  id_cliente: 1,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '09:00:00', hora_fin: '13:00:00', es_restriccion_dura: true, activa: true, cliente: 'QUIÑONES VALENZUELA, VIRGINIA',     pedidoRef: '9301982', ventana: '09:00–13:00', dias: [1,3,5], zona: 'Norte' },
  { id: 'r2',  id_regla: 2,  id_cliente: 2,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '08:00:00', hora_fin: '11:00:00', es_restriccion_dura: true, activa: true, cliente: 'FARMA IMPERIO S.A.C.',               pedidoRef: '9300963', ventana: '08:00–11:00', dias: [2,4],   zona: 'Este'  },
  { id: 'r3',  id_regla: 3,  id_cliente: 3,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '08:00:00', hora_fin: '12:00:00', es_restriccion_dura: true, activa: true, cliente: 'RODRIGUEZ BERNAL RAMOS S.A.C.',      pedidoRef: '9300778', ventana: '08:00–12:00', dias: [1,2,3,4,5], zona: 'Centro' },
  { id: 'r4',  id_regla: 4,  id_cliente: 4,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '14:00:00', hora_fin: '17:00:00', es_restriccion_dura: true, activa: true, cliente: 'GRUPO FAMEZA S.A.C.',                pedidoRef: '9300891', ventana: '14:00–17:00', dias: [1,2,3,4,5], zona: 'Sur'   },
  { id: 'r5',  id_regla: 5,  id_cliente: 5,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '09:00:00', hora_fin: '10:00:00', es_restriccion_dura: true, activa: true, cliente: 'GRUPO LIVES S.A.',                   pedidoRef: '3881628', ventana: '09:00–10:00', dias: [2],     zona: 'Sur'   },
  { id: 'r6',  id_regla: 6,  id_cliente: 6,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '08:00:00', hora_fin: '14:00:00', es_restriccion_dura: false, activa: true, cliente: 'BOTICAS INKAFARMA — Los Olivos',     pedidoRef: '9303910', ventana: '08:00–14:00', dias: null,    zona: 'Norte' },
  { id: 'r7',  id_regla: 7,  id_cliente: 7,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '10:00:00', hora_fin: '16:00:00', es_restriccion_dura: false, activa: true, cliente: 'BOTICAS BIOFARMAS SALUD Y VIDA',     pedidoRef: '9301880', ventana: '10:00–16:00', dias: null,    zona: 'Este'  },
  { id: 'r8',  id_regla: 8,  id_cliente: 8,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '09:00:00', hora_fin: '15:00:00', es_restriccion_dura: false, activa: true, cliente: 'FERRETERÍA SAN FELIPE S.A.C.',       pedidoRef: '9303120', ventana: '09:00–15:00', dias: null,    zona: 'Este'  },
  { id: 'r9',  id_regla: 9,  id_cliente: 9,  tipo_regla: 'VENTANA_HORARIA', hora_inicio: '13:00:00', hora_fin: '18:00:00', es_restriccion_dura: true, activa: true, cliente: 'DISTRIB. LUZ Y COLOR S.A.C.',        pedidoRef: '9303380', ventana: '13:00–18:00', dias: [1,3,5], zona: 'Sur'   },
  { id: 'r10', id_regla: 10, id_cliente: 10, tipo_regla: 'VENTANA_HORARIA', hora_inicio: '09:00:00', hora_fin: '15:00:00', es_restriccion_dura: false, activa: true, cliente: 'COMERCIAL LOS ANDES E.I.R.L.',       pedidoRef: '9400137', ventana: '09:00–15:00', dias: null,    zona: 'Este'  },
  { id: 'r11', id_regla: 11, id_cliente: 11, tipo_regla: 'VENTANA_HORARIA', hora_inicio: '08:00:00', hora_fin: '13:00:00', es_restriccion_dura: false, activa: true, cliente: 'ABARROTES EL SOL S.A.C.',            pedidoRef: '9400248', ventana: '08:00–13:00', dias: null,    zona: 'Este'  },
  { id: 'r12', id_regla: 12, id_cliente: 12, tipo_regla: 'VENTANA_HORARIA', hora_inicio: '08:00:00', hora_fin: '13:00:00', es_restriccion_dura: true, activa: true, cliente: 'MINIMARKET PROGRESO',                 pedidoRef: '9400285', ventana: '08:00–13:00', dias: [1,3,5], zona: 'Este'  },
]

// ──────────────────────────────────────────────────
// CATÁLOGOS Y CONSTANTES DE BASE DE DATOS (siprd_db)
// ──────────────────────────────────────────────────
export const VEHICULO_ESTADOS = ['DISPONIBLE', 'ASIGNADO', 'MANTENIMIENTO', 'INACTIVO']
export const RUTA_ESTADOS     = ['GENERADA', 'EN_REVISION', 'APROBADA', 'PUBLICADA', 'EN_EJECUCION', 'FINALIZADA', 'CANCELADA', 'INVIABLE']
export const PARADA_ESTADOS   = ['PENDIENTE', 'CONFIRMADA', 'EN_CAMINO', 'ATENDIDA', 'NO_ATENDIDA', 'CANCELADA']
export const INCIDENCIAS_TIPOS = [
  'CLIENTE_CERRADO',
  'CLIENTE_NO_RECIBE',
  'DIRECCION_INCORRECTA',
  'PEDIDO_RECHAZADO',
  'VEHICULO_RETRASADO',
  'OTRO',
]

