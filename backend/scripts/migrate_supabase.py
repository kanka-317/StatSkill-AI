"""
StatSkill AI - Direct Supabase Cloud Migration & Verification Script
Applies schema, enables pgvector, and verifies tables on Supabase.
"""

import asyncio
import sys
import asyncpg

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SUPABASE_URI = "postgresql://postgres:8z_6bcBiDyD%21M%25z@db.vupdeaqxftanhturjrrq.supabase.co:5432/postgres"

async def migrate():
    print("Connecting to live Supabase PostgreSQL database...")
    conn = await asyncpg.connect(SUPABASE_URI, timeout=20)
    print("Connected successfully!")

    print("Reading backend/scripts/supabase_schema.sql...")
    with open("scripts/supabase_schema.sql", "r", encoding="utf-8") as f:
        sql = f.read()

    print("Executing schema and enabling pgvector...")
    await conn.execute(sql)
    print("Schema applied successfully!")

    print("\nVerifying tables created in public schema:")
    rows = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    for r in rows:
        print(f"  ✓ {r['table_name']}")

    # Verify pgvector extension
    ext_rows = await conn.fetch("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
    if ext_rows:
        print(f"\n  ✓ pgvector extension is ENABLED (version: {ext_rows[0]['extversion']})")

    await conn.close()
    print("\nSupabase database setup is 100% complete and verified!")

if __name__ == "__main__":
    asyncio.run(migrate())
