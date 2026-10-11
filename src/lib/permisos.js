export const tienePermiso=(usuario, permiso)=>!!usuario && Array.isArray(usuario.permisos) && usuario.permisos.includes(permiso)
export function perfilSeguro(usuario) {
  const {clave, password, password_hash, clave_cifrada, ...perfil}=usuario
  return perfil
}
