/**
 * @typedef {Object} SendEmailInput
 * @property {string} to - Recipient email address
 * @property {string} subject - Email subject
 * @property {string} [html] - HTML content
 * @property {string} [text] - Plain text content
 */

/**
 * EmailGateway Interface
 * Defines the contract for sending emails, allowing different implementations (SMTP, API, etc.)
 */
export function createEmailGateway() {
    return {
        /**
         * @param {SendEmailInput} input
         * @returns {Promise<{ success: boolean, messageId?: string, error?: Error }>}
         */
        async sendEmail(input) {
            throw new Error("sendEmail method not implemented");
        }
    };
}
