/**
 * MailtrapAdapter
 * Implementation of EmailGateway using Nodemailer and SMTP.
 */
export function createMailtrapAdapter({
    smtpClient,
    fromEmail = process.env.SMTP_FROM_EMAIL,
    fromName = process.env.SMTP_FROM_NAME,
    logger = console,
} = {}) {
    return {
        async sendEmail({ to, subject, html, text }) {
            try {
                const info = await smtpClient.sendMail({
                    from: `"${fromName}" <${fromEmail}>`,
                    to,
                    subject,
                    text,
                    html,
                });

                logger.info(`Email sent successfully: ${info.messageId}`);
                
                return {
                    success: true,
                    messageId: info.messageId,
                };
            } catch (error) {
                logger.error("Failed to send email via Mailtrap adapter:", error);
                
                return {
                    success: false,
                    error: error instanceof Error ? error : new Error(String(error)),
                };
            }
        },
    };
}
