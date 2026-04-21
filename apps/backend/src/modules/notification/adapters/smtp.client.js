import nodemailer from "nodemailer";

/**
 * Creates a shared Nodemailer transporter using environment variables.
 */
export function createSmtpClient({
    host = process.env.SMTP_HOST,
    port = parseInt(process.env.SMTP_PORT || "2525", 10),
    user = process.env.SMTP_USER,
    pass = process.env.SMTP_PASS,
} = {}) {
    return nodemailer.createTransport({
        host,
        port,
        auth: {
            user,
            pass,
        },
    });
}
