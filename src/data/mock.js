// Datos de demostración. En producción esto llega desde la fuente definida por
// Alfa (pedidos ya con dirección, coordenadas y bultos) y desde el maestro de
// vehículos con su capacidad en toneladas y m³.

export const FECHA = '27/08/2026'
export const ALMACEN = 'Almacén Lurín'

export const VEHICULOS = [
  { placa: 'BCE-869', marca: 'Hyundai', conductor: 'Elías López',     pesoMax: 12, volMax: 32 },
  { placa: 'DB8-877', marca: 'Toyota',  conductor: 'Marcos Camacho',  pesoMax: 12, volMax: 32 },
  { placa: 'AFG-747', marca: 'Suzuki',  conductor: 'Giancarlo Ruiz',  pesoMax: 8,  volMax: 21 },
  { placa: 'BHL-751', marca: 'Kia',     conductor: 'Kevin Vargas',    pesoMax: 8,  volMax: 21 },
  { placa: 'XXX-000', marca: 'Isuzu',   conductor: 'Maycol Yance',    pesoMax: 8,  volMax: 21 },
  { placa: 'BUE-734', marca: 'Hino',    conductor: 'Luis Ordoñez',    pesoMax: 8,  volMax: 21 },
  { placa: 'AFG-748', marca: 'Foton',   conductor: 'Héctor Salas',    pesoMax: 6,  volMax: 16 },
]

export const COLORES_RUTA = ['#2563EB', '#16A34A', '#DC2626', '#9333EA', '#F59E0B', '#0891B2', '#DB2777']

// zona → sirve para agrupar geográficamente antes de repartir entre vehículos
const N = 'Norte', E = 'Este', S = 'Sur', C = 'Centro'

// dia: días en que el cliente SÍ atiende (0=Dom … 6=Sáb). null = todos.
// El 27/08/2026 es jueves (4).
const T = null

const PEDIDOS_BASE = [
  { id: '9301982', cliente: 'QUIÑONES VALENZUELA, VIRGINIA', dir: 'Jr. Madre Selva 592, Urb. Santa Isabel', dist: 'Carabayllo', zona: N, bultos: 32, peso: 520,   vol: 1.15, servicio: 15, ventana: '09:00–13:00', dias: [1,3,5], prioridad: 'Alta' },
  { id: '9301307', cliente: 'MORILLO, ALEJANDRINA',          dir: 'Av. Los Incas 570, San Juan Bautista 2da Etapa', dist: 'Comas', zona: N, bultos: 28, peso: 812, vol: 1.42, servicio: 18, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9300511', cliente: 'GRUPO PURPURA E.I.R.L.',        dir: 'Av. Guillermo de la Fuente 317 Int. A, Urb. Santa Luzmila', dist: 'Comas', zona: N, bultos: 26, peso: 324, vol: 0.96, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Media' },
  { id: '9302657', cliente: 'DDIVAS LANDEO E.I.R.L.',        dir: 'Jr. Tacna 699, Urb. Orbea', dist: 'Magdalena del Mar', zona: C, bultos: 2, peso: 519, vol: 0.01, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9300963', cliente: 'FARMA IMPERIO S.A.C.',          dir: 'Av. Los Jardines Este Mz B Lote 4', dist: 'San Juan de Lurigancho', zona: E, bultos: 20, peso: 1881, vol: 0.12, servicio: 45, ventana: '08:00–11:00', dias: [2,4], prioridad: 'Media' },
  { id: '3882660', cliente: 'FLORERIA YURI S.A.',            dir: 'Galería San Felipe Tda. 102', dist: 'Jesús María', zona: C, bultos: 1, peso: 79, vol: 0.004, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9300047', cliente: 'GAMBOA MARROQUIN, PATRICIA',    dir: 'Mcdo. Pro Los Pinos 531, Puesto 56', dist: 'Chorrillos', zona: S, bultos: 1, peso: 222, vol: 0.01, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9300891', cliente: 'GRUPO FAMEZA S.A.C.',           dir: 'Z.I. Parque Industrial del Cono Sur', dist: 'Villa El Salvador', zona: S, bultos: 31, peso: 3500, vol: 0.17, servicio: 15, ventana: '14:00–17:00', dias: [1,2,3,4,5], prioridad: 'Media' },
  { id: '3881628', cliente: 'GRUPO LIVES S.A.',              dir: 'Lote 2D 7E, Fundo Larrea Sub Lote A', dist: 'Lurín', zona: S, bultos: 8, peso: 2434, vol: 0.63, servicio: 45, ventana: '09:00–10:00', dias: [2], prioridad: 'Alta' },
  { id: '3901336', cliente: 'HERRERA DAMAS, ESTHER',         dir: 'Av. Venezuela 2899 Int. 91 y 89', dist: 'Lima Cercado', zona: C, bultos: 2, peso: 687, vol: 0.04, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9301880', cliente: 'BOTICAS BIOFARMAS SALUD Y VIDA S.A.C.', dir: 'Av. Próceres de la Independencia 1820', dist: 'San Juan de Lurigancho', zona: E, bultos: 14, peso: 640, vol: 0.55, servicio: 18, ventana: '10:00–16:00', dias: T, prioridad: 'Alta' },
  { id: '9302104', cliente: 'AYCFARMA E.I.R.L.',             dir: 'Av. Canto Grande 3455', dist: 'San Juan de Lurigancho', zona: E, bultos: 11, peso: 430, vol: 0.38, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Media' },
  { id: '9300778', cliente: 'RODRIGUEZ BERNAL RAMOS S.A.C.', dir: 'Av. Sáenz Peña 1120', dist: 'Callao', zona: C, bultos: 9, peso: 800, vol: 0.31, servicio: 20, ventana: '08:00–12:00', dias: [1,2,3,4,5], prioridad: 'Alta' },
  { id: '9301455', cliente: 'QUIROZ LEON CECILIO',           dir: 'Jr. Puno 455 Int. 2', dist: 'Lima Cercado', zona: C, bultos: 4, peso: 235, vol: 0.09, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9302311', cliente: 'RIVAS CASTRO, CARMEN',          dir: 'Av. Universitaria 4520', dist: 'Los Olivos', zona: N, bultos: 18, peso: 1620, vol: 0.72, servicio: 18, ventana: 'Todo el día', dias: T, prioridad: 'Media' },
  { id: '9300620', cliente: 'ACHA UMBO, ROCÍO',              dir: 'Mz. F Lote 12, Urb. Pro', dist: 'San Martín de Porres', zona: N, bultos: 5, peso: 381, vol: 0.14, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9301700', cliente: 'PILCO CEREZO, JHONE',           dir: 'Av. Perú 3210', dist: 'San Martín de Porres', zona: N, bultos: 7, peso: 703, vol: 0.26, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9302890', cliente: 'INVERSIONES PACÍFICO S.A.C.',   dir: 'Av. Túpac Amaru 1234', dist: 'Independencia', zona: N, bultos: 20, peso: 390, vol: 1.10, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Media' },
  { id: '9303001', cliente: 'MULTISERVICIOS JIREH E.I.R.L.', dir: 'Av. Canto Bello 780', dist: 'San Juan de Lurigancho', zona: E, bultos: 16, peso: 275, vol: 0.80, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9303120', cliente: 'FERRETERÍA SAN FELIPE S.A.C.',  dir: 'Av. Grau 902', dist: 'Ate', zona: E, bultos: 24, peso: 655, vol: 1.28, servicio: 20, ventana: '09:00–15:00', dias: T, prioridad: 'Media' },
  { id: '9303244', cliente: 'COMERCIAL H & H S.A.C.',        dir: 'Jr. Los Cedros 145', dist: 'Santa Anita', zona: E, bultos: 14, peso: 230, vol: 0.72, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9303380', cliente: 'DISTRIB. LUZ Y COLOR S.A.C.',   dir: 'Av. El Sol 1120', dist: 'Villa El Salvador', zona: S, bultos: 18, peso: 410, vol: 1.05, servicio: 18, ventana: '13:00–18:00', dias: [1,3,5], prioridad: 'Media' },
  { id: '9303411', cliente: 'BULEJE MUÑOZ, CATHERINE',       dir: 'Av. Defensores del Morro 2280', dist: 'Chorrillos', zona: S, bultos: 6, peso: 449, vol: 0.22, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9303502', cliente: 'SALVADOR MAYTA, FLOR',          dir: 'Mz. B Lote 3, Sector 2', dist: 'Villa María del Triunfo', zona: S, bultos: 9, peso: 512, vol: 0.35, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9303618', cliente: 'INVERSIONES WIDO E.I.R.L.',     dir: 'Av. Pachacútec 4410', dist: 'Villa María del Triunfo', zona: S, bultos: 12, peso: 894, vol: 0.48, servicio: 18, ventana: 'Todo el día', dias: T, prioridad: 'Media' },
  { id: '9303740', cliente: 'LLANOS VILLEGAS, ELIZABETH',    dir: 'Jr. Ica 380 Int. 15', dist: 'Lima Cercado', zona: C, bultos: 3, peso: 420, vol: 0.11, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9303855', cliente: 'COSQUILLO ORBEZO, ANA LUZ',     dir: 'Av. Brasil 2145', dist: 'Breña', zona: C, bultos: 4, peso: 268, vol: 0.16, servicio: 15, ventana: 'Todo el día', dias: T, prioridad: 'Baja' },
  { id: '9303910', cliente: 'BOTICAS INKAFARMA — Los Olivos', dir: 'Av. Alfredo Mendiola 3550', dist: 'Los Olivos', zona: N, bultos: 22, peso: 1210, vol: 0.90, servicio: 20, ventana: '08:00–14:00', dias: T, prioridad: 'Alta' },
]

// --- Pedidos generados para completar la jornada real (63 pedidos) ---------
// Los 28 de arriba son los que se revisan uno por uno; estos completan el
// volumen del día para que el tanteo de flota trabaje con carga realista.

const CLIENTES_EXTRA = [
  ['BOTICA SANTA ROSA', 'Av. Universitaria 2280', 'Los Olivos', N],
  ['MINIMARKET DON JOSÉ', 'Jr. Huáscar 415', 'Comas', N],
  ['DISTRIBUIDORA ANDINA S.A.C.', 'Av. Túpac Amaru 890', 'Independencia', N],
  ['BODEGA LA ESQUINA', 'Mz. J Lote 8, Urb. El Trébol', 'San Martín de Porres', N],
  ['FARMACIA VIDA SANA', 'Av. Carlos Izaguirre 1120', 'Los Olivos', N],
  ['COMERCIAL LOS ANDES E.I.R.L.', 'Av. Wiesse 3320', 'San Juan de Lurigancho', E],
  ['MERCADO SANTA ANITA PTO. 12', 'Av. Nicolás Ayllón 4520', 'Ate', E],
  ['BOTICA SAN PABLO', 'Av. Las Flores 780', 'San Juan de Lurigancho', E],
  ['ABARROTES EL SOL S.A.C.', 'Jr. Los Álamos 220', 'Santa Anita', E],
  ['MINIMARKET PROGRESO', 'Av. Riva Agüero 1450', 'El Agustino', E],
  ['DISTRIBUIDORA SUR S.A.C.', 'Av. Pachacútec 2210', 'Villa María del Triunfo', S],
  ['BOTICA LA MERCED', 'Av. Los Héroes 890', 'San Juan de Miraflores', S],
  ['BODEGA MI PERÚ', 'Mz. K Lote 21, Sector 3', 'Villa El Salvador', S],
  ['COMERCIAL MARINA E.I.R.L.', 'Av. Defensores del Morro 1180', 'Chorrillos', S],
  ['MINIMARKET EL PARQUE', 'Av. Alameda Sur 340', 'Chorrillos', S],
  ['BOTICA CENTRAL', 'Jr. Camaná 720', 'Lima Cercado', C],
  ['DISTRIBUIDORA LIMA S.A.', 'Av. Arequipa 1890', 'Lince', C],
  ['MINIMARKET BRASIL', 'Av. Brasil 980', 'Breña', C],
  ['ABARROTES SAN MIGUEL', 'Av. La Marina 2450', 'San Miguel', C],
  ['BODEGA LA UNIÓN', 'Jr. Sáenz Peña 610', 'Callao', C],
]

const PRIORIDADES = ['Baja', 'Baja', 'Media', 'Baja', 'Media', 'Alta']
const VENTANAS = ['Todo el día', 'Todo el día', '09:00–15:00', 'Todo el día', '08:00–13:00']

const EXTRA = []
let semilla = 7
const rnd = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648 }

for (let i = 0; i < 35; i++) {
  const [cliente, dir, distrito, zona] = CLIENTES_EXTRA[i % CLIENTES_EXTRA.length]
  const bultos = 2 + Math.floor(rnd() * 26)
  EXTRA.push({
    id: String(9400100 + i * 37),
    cliente: i >= CLIENTES_EXTRA.length ? `${cliente} — Local ${Math.floor(i / CLIENTES_EXTRA.length) + 1}` : cliente,
    dir,
    dist: distrito,
    zona,
    bultos,
    peso: Math.round(bultos * (16 + rnd() * 22)),
    vol: Number((bultos * (0.022 + rnd() * 0.02)).toFixed(2)),
    servicio: [15, 15, 15, 18, 20][Math.floor(rnd() * 5)],
    ventana: VENTANAS[Math.floor(rnd() * VENTANAS.length)],
    dias: rnd() > 0.88 ? [1, 3, 5] : null,
    prioridad: PRIORIDADES[Math.floor(rnd() * PRIORIDADES.length)],
  })
}

// RF-04: vehículo sugerido por Distribución según zona geográfica.
// El algoritmo puede reasignar si la capacidad lo requiere.
const ZONA_VEH = { Norte: 'BCE-869', Este: 'DB8-877', Sur: 'BHL-751', Centro: 'XXX-000' }
export const PEDIDOS = [...PEDIDOS_BASE, ...EXTRA].map(p => ({
  ...p,
  vehiculoSugerido: ZONA_VEH[p.zona] ?? '—',
}))

// Pedidos que llegaron sin coordenadas utilizables. En el flujo real vienen de
// Tomapedidos y necesitan corrección manual antes de poder rutearse.
export const NO_PLANIFICABLES = [
  { id: '9304011', cliente: 'MERCADO CENTRAL PTO. 44', motivo: 'Coordenadas fuera del área de reparto', detalle: 'Lat/Lng apunta a Huarochirí' },
  { id: '9304077', cliente: 'BODEGA SAN MARTÍN',       motivo: 'Sin coordenadas',                      detalle: 'Campo vacío en el pedido' },
  { id: '9304102', cliente: 'FARMACIA LA MERCED',      motivo: 'Coordenadas inválidas (0, 0)',         detalle: 'Registro por defecto no corregido' },
  { id: '9304190', cliente: 'MINIMARKET EL ROSAL',     motivo: 'Punto sin acceso vial',                detalle: 'OSRM no encuentra ruta al punto' },
]
