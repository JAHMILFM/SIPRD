# Migración al modelo normalizado de 13 tablas

El backend de esta rama se alinea con `backend/app/schema_siprd_grupo.sql`.

## Prueba segura en Neon

1. Cree una rama Neon aislada llamada `siprd-normalizado` desde `production`.
2. En **Connect**, copie la cadena **Direct connection** de esa rama.
3. En Git Bash, desde la raíz del proyecto, defina variables solo para esa terminal:

```bash
export DATABASE_URL_DIRECT='postgresql://...'
export SIPRD_CONFIRMAR_RECREACION=SI
export SIPRD_RAMA_OBJETIVO=siprd-normalizado
python backend/scripts/aplicar_modelo_normalizado.py
```

El script guarda en memoria los datos compatibles del esquema anterior, elimina y recrea solamente el esquema `siprd` de la conexión indicada, y vuelve a cargar dichos datos en las 13 tablas. Está protegido para ejecutarse únicamente sobre la rama `siprd-normalizado`; nunca debe usarse sobre `production`.

4. Actualice `.env` con la cadena **pooled** de la rama nueva y ejecute:

```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```

La API utiliza estas 13 tablas: roles, usuarios, clientes, restricciones_cliente,
vehiculos, pedidos, planificaciones, rutas, paradas_ruta, incidencias, cobros,
evidencias_entrega y auditoria.
