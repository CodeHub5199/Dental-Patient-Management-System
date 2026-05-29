import asyncio
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(to_email: str, to_name: str, reset_url: str) -> None:
    if not settings.sendgrid_api_key:
        logger.info("[DEV] Password reset URL for %s: %s", to_email, reset_url)
        return

    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    message = Mail(
        from_email=(settings.sendgrid_from_email, settings.sendgrid_from_name),
        to_emails=to_email,
        subject="Reset Your Password — DPMS",
        html_content=f"""
<p>Hi {to_name},</p>
<p>We received a request to reset your DPMS password. Click the button below to set a new password:</p>
<p style="margin:24px 0;">
  <a href="{reset_url}"
     style="background:#2563EB;color:white;padding:12px 24px;border-radius:6px;
            text-decoration:none;font-weight:600;display:inline-block;">
    Reset Password
  </a>
</p>
<p>This link expires in 1 hour and can only be used once.</p>
<p>If you did not request a password reset, you can safely ignore this email.</p>
        """,
    )

    def _send() -> None:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        sg.send(message)

    try:
        await asyncio.to_thread(_send)
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
