import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from app.config import settings

class EmailService:
    """Service for sending emails via SMTP"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        html: bool = False
    ) -> bool:
        """Send an email"""
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.smtp_from
            message["To"] = ", ".join(to_emails)
            message["Subject"] = subject
            
            if html:
                part = MIMEText(body, "html")
            else:
                part = MIMEText(body, "plain")
            
            message.attach(part)
            
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=True
            )
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False
    
    async def send_activation_email(self, to_email: str, user_name: str) -> bool:
        """Send account activation email"""
        subject = "Welcome to Casino - Account Activated"
        body = f"""
        <html>
            <body>
                <h2>Welcome {user_name}!</h2>
                <p>Your casino account has been activated.</p>
                <p>You can now login and start playing.</p>
                <p>Best regards,<br>Casino Team</p>
            </body>
        </html>
        """
        return await self.send_email([to_email], subject, body, html=True)
    
    async def send_kyc_approval_email(self, to_email: str, user_name: str) -> bool:
        """Send KYC approval email"""
        subject = "KYC Verification Approved"
        body = f"""
        <html>
            <body>
                <h2>Hi {user_name},</h2>
                <p>Your KYC verification has been approved.</p>
                <p>Your account will be activated shortly.</p>
                <p>Best regards,<br>Casino Team</p>
            </body>
        </html>
        """
        return await self.send_email([to_email], subject, body, html=True)
    
    async def send_kyc_rejection_email(self, to_email: str, user_name: str, reason: str = None) -> bool:
        """Send KYC rejection email"""
        subject = "KYC Verification - Action Required"
        reason_text = f"<p>Reason: {reason}</p>" if reason else ""
        body = f"""
        <html>
            <body>
                <h2>Hi {user_name},</h2>
                <p>Unfortunately, your KYC verification could not be approved.</p>
                {reason_text}
                <p>Please resubmit your documents.</p>
                <p>Best regards,<br>Casino Team</p>
            </body>
        </html>
        """
        return await self.send_email([to_email], subject, body, html=True)

email_service = EmailService()