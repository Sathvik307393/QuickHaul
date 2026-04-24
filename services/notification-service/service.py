import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from shared.config import settings

logger = logging.getLogger(__name__)

import aiosmtplib


async def send_email_notification(to_email: str, subject: str, body: str) -> bool:
    if not settings.smtp_enabled:
        logger.info(f"\n[DEV MODE] Email to {to_email}:\nSubject: {subject}\nBody: {body}\n")
        return True
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        smtp_client = aiosmtplib.SMTP(
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            use_tls=settings.smtp_use_tls,
            start_tls=settings.smtp_use_starttls and not settings.smtp_use_tls
        )
        
        await smtp_client.connect()
        if settings.smtp_username:
            await smtp_client.login(settings.smtp_username, settings.smtp_password)
        
        await smtp_client.send_message(msg)
        await smtp_client.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"SMTP Error for {to_email}: {str(e)}")
        return False


async def send_sms_notification(phone: str, message: str) -> bool:
    """SMS sending - placeholder for Twilio/Plivo integration"""
    logger.info(f"\n[DEV MODE] SMS to {phone}: {message}\n")
    return True
