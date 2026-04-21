import { createSmtpClient } from "./adapters/smtp.client.js";
import { createMailtrapAdapter } from "./adapters/mailtrap.adapter.js";
import { createSendEmailService } from "./services/send-email.service.js";

/**
 * Register Notification Module
 */
export function registerNotificationModule() {
    const smtpClient = createSmtpClient();
    
    const emailGateway = createMailtrapAdapter({
        smtpClient,
    });

    const sendEmail = createSendEmailService({
        emailGateway,
    });

    return {
        adapters: {
            smtpClient,
            emailGateway,
        },
        services: {
            sendEmail,
        },
    };
}
