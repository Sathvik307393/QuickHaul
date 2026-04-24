from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: str

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    phone: str
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr
    otp: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBase

class SendOtpRequest(BaseModel):
    email: EmailStr
