"""
Run once after `alembic upgrade head` to create the initial dentist account.

Usage:
    .venv\Scripts\python seed.py
    .venv\Scripts\python seed.py --email admin@clinic.com --password secret123 --name "Dr. Smith"
"""

import argparse
import asyncio
import sys
import os

# Load .env before importing app modules
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password


async def seed(email: str, password: str, full_name: str) -> None:
    async with AsyncSessionLocal() as db:
        # Check if a dentist already exists
        result = await db.execute(
            text("SELECT id, email FROM users WHERE role = 'dentist' LIMIT 1")
        )
        existing = result.fetchone()
        if existing:
            print(f"[skip] A dentist account already exists: {existing.email}")
            print("       Use the /users endpoint or profile page to add more accounts.")
            return

        # Check email uniqueness
        result = await db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email},
        )
        if result.fetchone():
            print(f"[error] An account with email '{email}' already exists.")
            sys.exit(1)

        password_hash = hash_password(password)
        await db.execute(
            text(
                """
                INSERT INTO users (email, password_hash, full_name, role, is_active)
                VALUES (:email, :password_hash, :full_name, 'dentist', true)
                """
            ),
            {"email": email, "password_hash": password_hash, "full_name": full_name},
        )
        await db.commit()
        print(f"[ok] Dentist account created:")
        print(f"     Name:  {full_name}")
        print(f"     Email: {email}")
        print(f"     Role:  dentist")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed initial dentist account")
    parser.add_argument("--email",    default="admin@clinic.com",  help="Login email")
    parser.add_argument("--password", default="password123",       help="Login password (min 8 chars)")
    parser.add_argument("--name",     default="Dr. Admin",         help="Full name")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("[error] Password must be at least 8 characters.")
        sys.exit(1)

    asyncio.run(seed(args.email, args.password, args.name))


if __name__ == "__main__":
    main()
