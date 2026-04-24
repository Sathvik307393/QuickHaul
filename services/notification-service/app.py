from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import logging
import smtplib
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys
from pathlib import Path
import asyncio
import socket

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from shared.config import settings

app = FastAPI(title="Notification Service", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
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

async def send_email_via_smtp(to_email: str, subject: str, body: str) -> dict:
    """Send email via SMTP with synchronous fallback for reliability"""
    if not settings.smtp_enabled:
        logger.info(f"SMTP Disabled. Simulation email to {to_email}")
        return {
            "success": True, 
            "message": "Email simulation mode active (SMTP disabled)",
            "simulated": True
        }

    # Note: Local SMTP servers (port 1025) don't require credentials
    # Only check credentials if using an external SMTP service
    if settings.smtp_port != 1025 and (not settings.smtp_username or not settings.smtp_password):
        return {
            "success": False,
            "error": "SMTP credentials not configured",
            "message": "Email not sent - SMTP credentials missing in .env"
        }
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{settings.smtp_from_name} <{settings.smtp_from_email or settings.smtp_username}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        if body.strip().startswith("<!DOCTYPE html>") or body.strip().startswith("<html>"):
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))

        # Use SSL SMTP for port 465 (more reliable than STARTTLS for port 587)
        if settings.smtp_use_tls and settings.smtp_port == 465:
            # Port 465: Use SMTP_SSL
            with smtplib.SMTP_SSL(
                host=settings.smtp_host, 
                port=settings.smtp_port, 
                timeout=30
            ) as server:
                if settings.smtp_username:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(msg)
        else:
            # Port 587: Use SMTP with STARTTLS
            with smtplib.SMTP(
                host=settings.smtp_host, 
                port=settings.smtp_port, 
                timeout=30
            ) as server:
                if settings.smtp_use_starttls:
                    server.starttls()
                
                if settings.smtp_username:
                    server.login(settings.smtp_username, settings.smtp_password)
                
                server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return {"success": True, "message": "Email sent successfully"}
        
    except socket.timeout:
        error_msg = "Connection timeout - SMTP server took too long to respond (check firewall/network)"
        logger.error(f"SMTP Timeout Error for {to_email}: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "message": f"Email sending failed: Network timeout. Please check your firewall or try again later."
        }
    except smtplib.SMTPAuthenticationError:
        error_msg = "SMTP Authentication failed - check username/password"
        logger.error(f"SMTP Auth Error for {to_email}: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "message": f"Email sending failed: Invalid SMTP credentials"
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"SMTP Error for {to_email}: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "message": f"Email sending failed: {error_msg}"
        }

@app.post("/send-email")
async def send_email(payload: EmailRequest):
    """Send email notification"""
    logger.info(f"Received request to send email to {payload.to_email}")
    result = await send_email_via_smtp(payload.to_email, payload.subject, payload.body)
    logger.info(f"Email send result for {payload.to_email}: {result}")
    return result

@app.post("/send-sms")
async def send_sms(payload: SMSRequest):
    """Send SMS notification (placeholder for Twilio integration)"""
    logger.info(f"\n[SMS] To: {payload.phone}\nMessage: {payload.message}\n")
    return {"success": True, "message": "SMS logged (SMS provider not configured)"}

@app.post("/send-otp")
async def send_otp(payload: SendOTPRequest):
    """OTP delivery endpoint - sends email with OTP"""
    subject = "Your OTP for QuickHaul Registration"
    body = f"""Hello,

Your OTP for QuickHaul registration is: {payload.otp}

This OTP is valid for 10 minutes.
Please enter this code to complete your registration/login.

If you didn't request this OTP, please ignore this email.

Thank you,
QuickHaul Team
"""
    
    result = await send_email_via_smtp(payload.email, subject, body)
    
    # Always log to console for debugging
    logger.info(f"\n{'='*50}")
    logger.info(f"[OTP EMAIL] To: {payload.email}")
    logger.info(f"[OTP CODE] {payload.otp}")
    logger.info(f"{'='*50}\n")
    
    return result

@app.get("/health")
async def health():
    """Health check endpoint"""
    # Local SMTP (port 1025) doesn't need credentials, external services do
    smtp_configured = settings.smtp_enabled and (
        settings.smtp_port == 1025 or (settings.smtp_username and settings.smtp_password)
    )
    return {
        "status": "healthy",
        "service": "notification",
        "smtp_configured": smtp_configured,
        "smtp_host": settings.smtp_host if settings.smtp_enabled else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004, reload=True)
