// Maestro de Usuarios y Roles (siprd.usuarios y siprd.roles)
export const USUARIOS = [
  {
    id: 'u1', id_usuario: 1, id_rol: 1,
    usuario: 'dhuerta', correo: 'dhuerta@alfadistribuidores.com', clave: 'jefe123',
    nombres: 'Dennys', apellidos: 'Huerta', nombre: 'Dennys Huerta', iniciales: 'DH',
    titulo: 'Jefe de Distribución', rol: 'jefe', rol_db: 'JEFE_DISTRIBUCION', activo: true,
  },
  {
    id: 'u2', id_usuario: 2, id_rol: 2,
    usuario: 'asistente', correo: 'lpomalaya@alfadistribuidores.com', clave: 'dist123',
    nombres: 'Lesli', apellidos: 'Pomalaya', nombre: 'Lesli Pomalaya', iniciales: 'LP',
    titulo: 'Asistente de Distribución', rol: 'asistente', rol_db: 'ASISTENTE_DISTRIBUCION', activo: true,
  },
  {
    id: 'u3', id_usuario: 3, id_rol: 3,
    usuario: 'admin.ti', correo: 'admin.ti@alfadistribuidores.com', clave: 'ti2026',
    nombres: 'Administrador', apellidos: 'TI', nombre: 'Área de TI', iniciales: 'TI',
    titulo: 'Administrador TI', rol: 'ti', rol_db: 'ADMINISTRADOR_TI', activo: true,
  },
]
