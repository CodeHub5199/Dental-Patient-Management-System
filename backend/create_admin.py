"""
One-time script to create the first dentist account.
Run from the backend/ directory:
    .venv\Scripts\python create_admin.py
"""

import asyncio
import sys

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings
from app.core.security import hash_password


async def main():
    print("=== DPMS First Admin Setup ===\n")

    full_name = input("Full name: ").strip()
    email = input("Email: ").strip().lower()
    password = input("Password (min 8 chars): ").strip()

    if len(password) < 8:
        print("Error: password must be at least 8 characters.")
        sys.exit(1)

    engine = create_async_engine(settings.database_url, echo=False)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        # Check if email already exists
        result = await session.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email},
        )
        if result.fetchone():
            print(f"\nError: a user with email '{email}' already exists.")
            await engine.dispose()
            sys.exit(1)

        password_hash = hash_password(password)

        await session.execute(
            text("""
                INSERT INTO users (email, password_hash, full_name, role, is_active)
                VALUES (:email, :password_hash, :full_name, 'dentist', true)
            """),
            {"email": email, "password_hash": password_hash, "full_name": full_name},
        )
        await session.commit()

    await engine.dispose()
    print(f"\nDentist account created successfully.")
    print(f"  Name:  {full_name}")
    print(f"  Email: {email}")
    print(f"  Role:  dentist")
    print("\nYou can now log in at the DPMS frontend.")


if __name__ == "__main__":
    asyncio.run(main())
