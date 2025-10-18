"""
Script to check database connection and verify test user exists.
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text
import time

import sys
sys.path.insert(0, '.')

from app.db.models import User, Project
from app.core.config import settings


async def check_auth_database():
    """Check Auth Database connection and data."""
    print("\n" + "=" * 60)
    print("🔐 CHECKING AUTH DATABASE")
    print("=" * 60)
    
    try:
        # Create engine
        engine = create_async_engine(settings.AUTH_DATABASE_URL, echo=False)
        
        # Test connection
        print("\n🔌 Testing connection...")
        start_time = time.time()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
        connection_time = time.time() - start_time
        print(f"✅ Connection successful! ({connection_time:.2f}s)")
        
        # Check users table
        SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with SessionLocal() as db:
            # Count users
            result = await db.execute(select(User))
            users = result.scalars().all()
            
            print(f"\n👥 Users in database: {len(users)}")
            for user in users:
                print(f"   - {user.email} (ID: {user.id}, Role: {user.role})")
        
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


async def check_app_database():
    """Check App Database connection and data."""
    print("\n" + "=" * 60)
    print("📊 CHECKING APP DATABASE")
    print("=" * 60)
    
    try:
        # Create engine
        engine = create_async_engine(settings.APP_DATABASE_URL, echo=False)
        
        # Test connection
        print("\n🔌 Testing connection...")
        start_time = time.time()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
        connection_time = time.time() - start_time
        print(f"✅ Connection successful! ({connection_time:.2f}s)")
        
        # Check projects table
        SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with SessionLocal() as db:
            # Count projects
            result = await db.execute(select(Project))
            projects = result.scalars().all()
            
            print(f"\n📁 Projects in database: {len(projects)}")
            for project in projects:
                print(f"   - {project.name} (ID: {project.id})")
        
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


async def main():
    """Run all checks."""
    print("\n" + "🔍" * 30)
    print("DATABASE CONNECTION CHECK")
    print("🔍" * 30)
    
    auth_ok = await check_auth_database()
    app_ok = await check_app_database()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Auth Database: {'✅ OK' if auth_ok else '❌ FAILED'}")
    print(f"App Database:  {'✅ OK' if app_ok else '❌ FAILED'}")
    print("=" * 60)
    
    if not auth_ok:
        print("\n⚠️  Auth database has issues!")
        print("Run: python backend/create_test_user.py")
    
    if not app_ok:
        print("\n⚠️  App database has issues!")
        print("Check your connection settings.")


if __name__ == "__main__":
    asyncio.run(main())
