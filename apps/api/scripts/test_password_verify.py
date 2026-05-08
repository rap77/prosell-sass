"""Direct password verification test bypassing all layers."""

import asyncio
import bcrypt
from sqlalchemy import select
from prosell.infrastructure.database.session import async_session_maker
from prosell.infrastructure.models.user_model import UserModel

async def test_password():
    """Test password verification directly from database."""
    async with async_session_maker() as session:
        stmt = select(UserModel).where(UserModel.email == "admin@prosell-demo.com")
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ User not found in database")
            return
        
        print(f"✅ User found: {user.email}")
        print(f"   User ID: {user.id}")
        print(f"   Status: {user.status}")
        print(f"   Email verified: {user.email_verified}")
        print(f"   Password hash: {user.password_hash}")
        print(f"   Hash length: {len(user.password_hash)}")
        print(f"   Hash prefix: {user.password_hash[:10]}...")
        print()
        
        # Test with correct password
        test_password = "Admin123!"
        print(f"Testing password: {test_password}")
        print(f"Password length: {len(test_password)}")
        print()
        
        # Test 1: Direct bcrypt check
        print("=== Test 1: Direct bcrypt.checkpw() ===")
        try:
            result = bcrypt.checkpw(
                test_password.encode('utf-8'), 
                user.password_hash.encode('utf-8')
            )
            print(f"Result: {result}")
            if result:
                print("✅ Password verification SUCCESSFUL")
            else:
                print("❌ Password verification FAILED")
        except Exception as e:
            print(f"❌ Exception: {e}")
        print()
        
        # Test 2: Check hash format
        print("=== Test 2: Hash format validation ===")
        print(f"Hash starts with $2b$: {user.password_hash.startswith('$2b$')}")
        print(f"Hash parts: {user.password_hash.split('$')}")
        print()
        
        # Test 3: Re-hash and compare
        print("=== Test 3: Re-hash password and compare ===")
        try:
            new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt(rounds=12))
            print(f"New hash: {new_hash.decode('utf-8')}")
            print(f"Old hash: {user.password_hash}")
            print(f"Hashes match: {new_hash.decode('utf-8') == user.password_hash}")
            print(f"Both verify same password: {bcrypt.checkpw(test_password.encode('utf-8'), new_hash)}")
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_password())
