// Maestro de Usuarios y Roles (siprd.usuarios y siprd.roles) — Exactamente 1 usuario por rol
export const USUARIOS = [
  {
    id: '1', id_usuario: 1, id_rol: 1,
    usuario: 'dhuerta', correo: 'dhuerta@alfadistribuidores.com', clave: 'jefe123',
    nombres: 'Dennys', apellidos: 'Huerta', nombre: 'Dennys Huerta', iniciales: 'DH',
    titulo: 'Jefe de Distribución', rol: 'jefe', rol_db: 'JEFE', activo: true,
  },
  {
    id: '2', id_usuario: 2, id_rol: 2,
    usuario: 'lpomalaya', correo: 'lpomalaya@alfadistribuidores.com', clave: 'dist123',
    nombres: 'Lesli', apellidos: 'Pomalaya', nombre: 'Lesli Pomalaya', iniciales: 'LP',
    titulo: 'Asistente de Distribución', rol: 'asistente', rol_db: 'ASISTENTE', activo: true,
  },
  {
    id: '3', id_usuario: 3, id_rol: 3,
    usuario: 'admin.ti', correo: 'admin.ti@alfadistribuidores.com', clave: 'ti2026',
    nombres: 'Administrador', apellidos: 'TI', nombre: 'Área de TI', iniciales: 'TI',
    titulo: 'Administrador TI', rol: 'administrador', rol_db: 'ADMINISTRADOR', activo: true,
  },
  {
    id: '4', id_usuario: 4, id_rol: 4,
    usuario: 'elopez', correo: 'elopez@alfadistribuidores.com', clave: 'rep123',
    nombres: 'Elías', apellidos: 'López', nombre: 'Elías López', iniciales: 'EL',
    titulo: 'Conductor y Repartidor', rol: 'repartidor', rol_db: 'REPARTIDOR', activo: true,
  },
  {
    id: '5', id_usuario: 5, id_rol: 5,
    usuario: 'tesoreria', correo: 'tesoreria@alfadistribuidores.com', clave: 'teso123',
    nombres: 'Mariana', apellidos: 'Vásquez', nombre: 'Mariana Vásquez', iniciales: 'MV',
    titulo: 'Finanzas y Tesorería', rol: 'tesoreria', rol_db: 'TESORERIA', activo: true,
  },
]

