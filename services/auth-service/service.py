import httpx
import logging
from .schemas import RegisterRequest, LoginRequest, AuthResponse, UserBase
from shared.config import settings
from shared.security import create_access_token

logger = logging.getLogger(__name__)

async def generate_and_send_otp(email: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.otp_service_url}/send",
            json={"email": email}
        )
        if response.status_code != 200:
            return None, False
        data = response.json()
        return data.get("otp"), data.get("email_sent", False)

async def verify_otp(email: str, otp: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.otp_service_url}/verify",
            json={"email": email, "otp": otp}
        )
        return response.status_code == 200

async def register_user(payload: RegisterRequest, db):
    user_dict = payload.dict()
    otp = user_dict.pop("otp")
    
    # Check if user exists
    existing = await db["users"].find_one({"email": payload.email})
    if existing:
        # Update existing user or return it
        pass
    else:
        await db["users"].insert_one(user_dict)
    
    token = create_access_token({"sub": payload.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserBase(**user_dict)
    }

async def login_user(payload: LoginRequest, db):
    # For now, login just verifies OTP and returns token
    is_valid = await verify_otp(payload.email, payload.otp)
    if not is_valid:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    user = await db["users"].find_one({"email": payload.email})
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
        
    token = create_access_token({"sub": payload.email})
    user["id"] = str(user.pop("_id"))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserBase(**user)
    }
