"""
Script de exportación completa de la base de datos SIPRD.
Genera volcados SQL listos para importar tanto en PostgreSQL como en SQLite.
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "siprd_dev.db"))
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports"))
os.makedirs(OUT_DIR, exist_ok=True)

def exportar_sqlite_dump():
    con = sqlite3.connect(DB_PATH)
    dump_path = os.path.join(OUT_DIR, "siprd_sqlite_dump.sql")
    with open(dump_path, "w", encoding="utf-8") as f:
        f.write(f"-- SIPRD · SQLite Database Dump\n-- Fecha: {datetime.now().isoformat()}\n\n")
        for line in con.iterdump():
            f.write(f"{line}\n")
    con.close()
    print(f"Dump SQLite generado: {dump_path}")
    return dump_path

def exportar_postgres_dump():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    dump_path = os.path.join(OUT_DIR, "siprd_postgres_dump.sql")
    
    # Obtener todas las tablas
    tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
    
    with open(dump_path, "w", encoding="utf-8") as f:
        f.write(f"-- ====================================================================\n")
        f.write(f"-- SIPRD · PostgreSQL 16+ Database Export (siprd_db)\n")
        f.write(f"-- Alfa Distribuidores S.A. — Integrador II\n")
        f.write(f"-- Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- ====================================================================\n\n")
        f.write("SET statement_timeout = 0;\n")
        f.write("SET client_encoding = 'UTF8';\n")
        f.write("SET standard_conforming_strings = on;\n\n")
        f.write("CREATE SCHEMA IF NOT EXISTS siprd;\n\n")
        
        # Orden de tablas para respetar Foreign Keys
        orden_tablas = [
            "roles", "usuarios", "vehiculos", "clientes", "reglas_cliente",
            "pedidos", "planes_planificacion", "rutas", "paradas_ruta",
            "cobros", "incidencias", "evidencias_entrega", "auditoria", "tokens_refresco"
        ]
        
        # Agregar tablas que no estén en orden_tablas al final
        for t in tables:
            if t not in orden_tablas:
                orden_tablas.append(t)
                
        for tabla in orden_tablas:
            if tabla not in tables:
                continue
            cur.execute(f"PRAGMA table_info('{tabla}')")
            cols_info = cur.fetchall()
            col_names = [c[1] for c in cols_info]
            
            cur.execute(f"SELECT * FROM '{tabla}'")
            rows = cur.fetchall()
            if not rows:
                continue
                
            f.write(f"-- Datos de la tabla siprd.{tabla} ({len(rows)} filas)\n")
            cols_str = ", ".join([f'"{c}"' for c in col_names])
            for row in rows:
                vals = []
                for val in row:
                    if val is None:
                        vals.append("NULL")
                    elif isinstance(val, (int, float)):
                        vals.append(str(val))
                    elif isinstance(val, bool):
                        vals.append("TRUE" if val else "FALSE")
                    else:
                        val_str = str(val).replace("'", "''")
                        vals.append(f"'{val_str}'")
                vals_str = ", ".join(vals)
                f.write(f"INSERT INTO siprd.{tabla} ({cols_str}) VALUES ({vals_str}) ON CONFLICT DO NOTHING;\n")
            f.write("\n")
            
        f.write("-- Fin del volcado PostgreSQL\n")
        
    con.close()
    print(f"Dump PostgreSQL generado: {dump_path}")
    return dump_path

if __name__ == "__main__":
    exportar_sqlite_dump()
    exportar_postgres_dump()
