import logging
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter

from .service import send_email_notification, send_sms_notification

router = APIRouter()
logger = logging.getLogger(__name__)


class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str


class SMSRequest(BaseModel):
    phone: str
    message: str


class SendOTPRequest(BaseModel):
    email: EmailStr
    otp: str


@router.post("/send-email")
async def send_email(payload: EmailRequest):
    result = await send_email_notification(payload.to_email, payload.subject, payload.body)
    return {"success": result}


@router.post("/send-sms")
async def send_sms(payload: SMSRequest):
    result = await send_sms_notification(payload.phone, payload.message)
    return {"success": result}


@router.post("/send-otp")
async def send_otp(payload: SendOTPRequest):
    """OTP delivery endpoint - can be called by Auth Service or directly"""
    result = await send_email_notification(
        payload.email,
        "Your OTP for QuickHaul Registration",
        f"Your OTP for QuickHaul registration is: {payload.otp}\n\nExpires in 10 minutes."
    )
    return {"success": result, "message": "OTP sent" if result else "OTP logged to console (dev mode)"}
