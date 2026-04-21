/**
 * SendEmailService
 * Application service that orchestrates email sending.
 */
export function createSendEmailService({ emailGateway }) {
    return async function sendEmail({ to, subject, html, text }) {
        if (!to || !subject) {
            throw new Error("Recipient and subject are required for sending email.");
        }

        // Potential for future expansion: 
        // - Template rendering
        // - Queueing
        // - Logging to database
        
        return emailGateway.sendEmail({
            to,
            subject,
            html,
            text,
        });
    };
}
