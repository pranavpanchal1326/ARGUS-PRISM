import asyncio
import asyncpg
import os

async def run_migrations():
    database_url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    print(f"Connecting to database...")
    conn = await asyncpg.connect(database_url)

    schema_path = "services/api/database/schema.sql"
    with open(schema_path, "r") as f:
        schema_sql = f.read()

    print("Running schema migrations...")
    await conn.execute(schema_sql)
    await conn.close()
    print("Migrations complete!")

if __name__ == "__main__":
    asyncio.run(run_migrations())
