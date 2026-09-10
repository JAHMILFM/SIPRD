// Datos de demostración para Rutas, Cobranzas e Inicio.
// En producción estos llegan del backend (GET /api/rutas/activas, etc.)

export const FECHA = '27/08/2026'

// ──────────────────────────────────────────────────
// RUTAS EN EJECUCIÓN
// ──────────────────────────────────────────────────
export const RUTAS_ACTIVAS = [
  {
    id: 'R1',
    color: '#2563EB',
    vehiculo: { placa: 'BCE-869', marca: 'Hyundai', conductor: 'Elías López', pesoMax: 12, volMax: 32 },
    estado: 'en_ruta',
    horaInicio: '08:05',
    paradas: [
      { id: 'p1-1', orden: 1, cliente: 'BOTICAS INKAFARMA — Los Olivos', dir: 'Av. Alfredo Mendiola 3550, Los Olivos', ventana: '08:00–14:00', prioridad: 'Alta', estado: 'entregado', horaReal: '08:52', bloqueado: false, bultos: 22, monto: 2340 },
      { id: 'p1-2', orden: 2, cliente: 'RIVAS CASTRO, CARMEN', dir: 'Av. Universitaria 4520, Los Olivos', ventana: 'Todo el día', prioridad: 'Media', estado: 'entregado', horaReal: '09:28', bloqueado: false, bultos: 18, monto: 1180 },
      { id: 'p1-3', orden: 3, cliente: 'INVERSIONES PACÍFICO S.A.C.', dir: 'Av. Túpac Amaru 1234, Independencia', ventana: 'Todo el día', prioridad: 'Media', estado: 'en_camino', horaReal: null, bloqueado: false, bultos: 20, monto: 890 },
      { id: 'p1-4', orden: 4, cliente: 'QUIÑONES VALENZUELA, VIRGINIA', dir: 'Jr. Madre Selva 592, Carabayllo', ventana: '09:00–13:00', prioridad: 'Alta', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 32, monto: 1560 },
      { id: 'p1-5', orden: 5, cliente: 'MINIMARKET DON JOSÉ', dir: 'Jr. Huáscar 415, Comas', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 9, monto: 430 },
      { id: 'p1-6', orden: 6, cliente: 'DISTRIBUIDORA ANDINA S.A.C.', dir: 'Av. Túpac Amaru 890, Independencia', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 14, monto: 720 },
      { id: 'p1-7', orden: 7, cliente: 'BODEGA LA ESQUINA', dir: 'Mz. J Lote 8, San Martín de Porres', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 6, monto: 310 },
    ],
  },
  {
    id: 'R2',
    color: '#16A34A',
    vehiculo: { placa: 'DB8-877', marca: 'Toyota', conductor: 'Marcos Camacho', pesoMax: 12, volMax: 32 },
    estado: 'en_ruta',
    horaInicio: '08:10',
    paradas: [
      { id: 'p2-1', orden: 1, cliente: 'RODRIGUEZ BERNAL RAMOS S.A.C.', dir: 'Av. Sáenz Peña 1120, Callao', ventana: '08:00–12:00', prioridad: 'Alta', estado: 'entregado', horaReal: '08:55', bloqueado: false, bultos: 9, monto: 1890 },
      { id: 'p2-2', orden: 2, cliente: 'HERRERA DAMAS, ESTHER', dir: 'Av. Venezuela 2899, Lima Cercado', ventana: 'Todo el día', prioridad: 'Baja', estado: 'entregado', horaReal: '09:31', bloqueado: false, bultos: 2, monto: 340 },
      { id: 'p2-3', orden: 3, cliente: 'DDIVAS LANDEO E.I.R.L.', dir: 'Jr. Tacna 699, Magdalena del Mar', ventana: 'Todo el día', prioridad: 'Baja', estado: 'en_camino', horaReal: null, bloqueado: false, bultos: 2, monto: 560 },
      { id: 'p2-4', orden: 4, cliente: 'QUIROZ LEON CECILIO', dir: 'Jr. Puno 455, Lima Cercado', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 4, monto: 280 },
      { id: 'p2-5', orden: 5, cliente: 'BOTICA CENTRAL', dir: 'Jr. Camaná 720, Lima Cercado', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 11, monto: 670 },
      { id: 'p2-6', orden: 6, cliente: 'ABARROTES SAN MIGUEL', dir: 'Av. La Marina 2450, San Miguel', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 7, monto: 390 },
    ],
  },
  {
    id: 'R3',
    color: '#DC2626',
    vehiculo: { placa: 'AFG-747', marca: 'Suzuki', conductor: 'Giancarlo Ruiz', pesoMax: 8, volMax: 21 },
    estado: 'en_ruta',
    horaInicio: '08:00',
    paradas: [
      { id: 'p3-1', orden: 1, cliente: 'FARMA IMPERIO S.A.C.', dir: 'Av. Los Jardines Este Mz B Lote 4, SJL', ventana: '08:00–11:00', prioridad: 'Media', estado: 'entregado', horaReal: '08:48', bloqueado: false, bultos: 20, monto: 4200 },
      { id: 'p3-2', orden: 2, cliente: 'BOTICAS BIOFARMAS SALUD Y VIDA', dir: 'Av. Próceres de la Independencia 1820, SJL', ventana: '10:00–16:00', prioridad: 'Alta', estado: 'entregado', horaReal: '09:55', bloqueado: false, bultos: 14, monto: 1760 },
      { id: 'p3-3', orden: 3, cliente: 'AYCFARMA E.I.R.L.', dir: 'Av. Canto Grande 3455, SJL', ventana: 'Todo el día', prioridad: 'Media', estado: 'en_camino', horaReal: null, bloqueado: false, bultos: 11, monto: 920 },
      { id: 'p3-4', orden: 4, cliente: 'FERRETERÍA SAN FELIPE S.A.C.', dir: 'Av. Grau 902, Ate', ventana: '09:00–15:00', prioridad: 'Media', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 24, monto: 1340 },
      { id: 'p3-5', orden: 5, cliente: 'COMERCIAL H & H S.A.C.', dir: 'Jr. Los Cedros 145, Santa Anita', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 14, monto: 680 },
    ],
  },
  {
    id: 'R4',
    color: '#9333EA',
    vehiculo: { placa: 'BHL-751', marca: 'Kia', conductor: 'Kevin Vargas', pesoMax: 8, volMax: 21 },
    estado: 'en_ruta',
    horaInicio: '08:15',
    paradas: [
      { id: 'p4-1', orden: 1, cliente: 'GRUPO FAMEZA S.A.C.', dir: 'Z.I. Parque Industrial del Cono Sur, VES', ventana: '14:00–17:00', prioridad: 'Media', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 31, monto: 3800 },
      { id: 'p4-2', orden: 2, cliente: 'DISTRIB. LUZ Y COLOR S.A.C.', dir: 'Av. El Sol 1120, Villa El Salvador', ventana: '13:00–18:00', prioridad: 'Media', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 18, monto: 1100 },
      { id: 'p4-3', orden: 3, cliente: 'BULEJE MUÑOZ, CATHERINE', dir: 'Av. Defensores del Morro 2280, Chorrillos', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 6, monto: 540 },
      { id: 'p4-4', orden: 4, cliente: 'SALVADOR MAYTA, FLOR', dir: 'Mz. B Lote 3, Sector 2, VMT', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 9, monto: 670 },
      { id: 'p4-5', orden: 5, cliente: 'INVERSIONES WIDO E.I.R.L.', dir: 'Av. Pachacútec 4410, VMT', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 12, monto: 1020 },
    ],
  },
  {
    id: 'R5',
    color: '#F59E0B',
    vehiculo: { placa: 'XXX-000', marca: 'Isuzu', conductor: 'Maycol Yance', pesoMax: 8, volMax: 21 },
    estado: 'en_ruta',
    horaInicio: '08:05',
    paradas: [
      { id: 'p5-1', orden: 1, cliente: 'GAMBOA MARROQUIN, PATRICIA', dir: 'Mcdo. Pro Los Pinos 531, Chorrillos', ventana: 'Todo el día', prioridad: 'Baja', estado: 'entregado', horaReal: '09:10', bloqueado: false, bultos: 1, monto: 120 },
      { id: 'p5-2', orden: 2, cliente: 'COSQUILLO ORBEZO, ANA LUZ', dir: 'Av. Brasil 2145, Breña', ventana: 'Todo el día', prioridad: 'Baja', estado: 'entregado', horaReal: '09:48', bloqueado: false, bultos: 4, monto: 310 },
      { id: 'p5-3', orden: 3, cliente: 'LLANOS VILLEGAS, ELIZABETH', dir: 'Jr. Ica 380 Int. 15, Lima Cercado', ventana: 'Todo el día', prioridad: 'Baja', estado: 'en_camino', horaReal: null, bloqueado: false, bultos: 3, monto: 260 },
      { id: 'p5-4', orden: 4, cliente: 'DISTRIBUIDORA LIMA S.A.', dir: 'Av. Arequipa 1890, Lince', ventana: 'Todo el día', prioridad: 'Media', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 8, monto: 780 },
      { id: 'p5-5', orden: 5, cliente: 'BODEGA LA UNIÓN', dir: 'Jr. Sáenz Peña 610, Callao', ventana: 'Todo el día', prioridad: 'Baja', estado: 'pendiente', horaReal: null, bloqueado: false, bultos: 5, monto: 340 },
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
// CONFIGURACIÓN — Vehículos y reglas por cliente
// ──────────────────────────────────────────────────
export const VEHICULOS_CONFIG = [
  { id: 'v1', placa: 'BCE-869', marca: 'Hyundai', modelo: 'HD78', año: 2021, conductor: 'Elías López', pesoMax: 12, volMax: 32, activo: true },
  { id: 'v2', placa: 'DB8-877', marca: 'Toyota',  modelo: 'Dyna', año: 2020, conductor: 'Marcos Camacho', pesoMax: 12, volMax: 32, activo: true },
  { id: 'v3', placa: 'AFG-747', marca: 'Suzuki',  modelo: 'Super Carry', año: 2019, conductor: 'Giancarlo Ruiz', pesoMax: 8, volMax: 21, activo: true },
  { id: 'v4', placa: 'BHL-751', marca: 'Kia',     modelo: 'Bongo', año: 2022, conductor: 'Kevin Vargas', pesoMax: 8, volMax: 21, activo: true },
  { id: 'v5', placa: 'XXX-000', marca: 'Isuzu',   modelo: 'N-Series', año: 2018, conductor: 'Maycol Yance', pesoMax: 8, volMax: 21, activo: true },
  { id: 'v6', placa: 'BUE-734', marca: 'Hino',    modelo: '300', año: 2020, conductor: 'Luis Ordoñez', pesoMax: 8, volMax: 21, activo: false },
  { id: 'v7', placa: 'AFG-748', marca: 'Foton',   modelo: 'Aumark', año: 2017, conductor: 'Héctor Salas', pesoMax: 6, volMax: 16, activo: false },
]

const DIAS = { 0:'Dom', 1:'Lun', 2:'Mar', 3:'Mié', 4:'Jue', 5:'Vie', 6:'Sáb' }
export const DIAS_SEMANA = DIAS

export const REGLAS_CLIENTE = [
  { id: 'r1',  cliente: 'QUIÑONES VALENZUELA, VIRGINIA',     pedidoRef: '9301982', ventana: '09:00–13:00', dias: [1,3,5], zona: 'Norte' },
  { id: 'r2',  cliente: 'FARMA IMPERIO S.A.C.',               pedidoRef: '9300963', ventana: '08:00–11:00', dias: [2,4],   zona: 'Este'  },
  { id: 'r3',  cliente: 'RODRIGUEZ BERNAL RAMOS S.A.C.',      pedidoRef: '9300778', ventana: '08:00–12:00', dias: [1,2,3,4,5], zona: 'Centro' },
  { id: 'r4',  cliente: 'GRUPO FAMEZA S.A.C.',                pedidoRef: '9300891', ventana: '14:00–17:00', dias: [1,2,3,4,5], zona: 'Sur'   },
  { id: 'r5',  cliente: 'GRUPO LIVES S.A.',                   pedidoRef: '3881628', ventana: '09:00–10:00', dias: [2],     zona: 'Sur'   },
  { id: 'r6',  cliente: 'BOTICAS INKAFARMA — Los Olivos',     pedidoRef: '9303910', ventana: '08:00–14:00', dias: null,    zona: 'Norte' },
  { id: 'r7',  cliente: 'BOTICAS BIOFARMAS SALUD Y VIDA',     pedidoRef: '9301880', ventana: '10:00–16:00', dias: null,    zona: 'Este'  },
  { id: 'r8',  cliente: 'FERRETERÍA SAN FELIPE S.A.C.',       pedidoRef: '9303120', ventana: '09:00–15:00', dias: null,    zona: 'Este'  },
  { id: 'r9',  cliente: 'DISTRIB. LUZ Y COLOR S.A.C.',        pedidoRef: '9303380', ventana: '13:00–18:00', dias: [1,3,5], zona: 'Sur'   },
  { id: 'r10', cliente: 'COMERCIAL LOS ANDES E.I.R.L.',       pedidoRef: '9400137', ventana: '09:00–15:00', dias: null,    zona: 'Este'  },
  { id: 'r11', cliente: 'ABARROTES EL SOL S.A.C.',            pedidoRef: '9400248', ventana: '08:00–13:00', dias: null,    zona: 'Este'  },
  { id: 'r12', cliente: 'MINIMARKET PROGRESO',                 pedidoRef: '9400285', ventana: '08:00–13:00', dias: [1,3,5], zona: 'Este'  },
]
