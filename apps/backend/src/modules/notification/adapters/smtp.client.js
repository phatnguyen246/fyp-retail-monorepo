import nodemailer from "nodemailer";
import dns from "node:dns";

function lookupIpv4(hostname, options, callback) {
    dns.lookup(
        hostname,
        {
            ...options,
            family: 4,
            all: false,
        },
        callback
    );
}

/**
 * Creates a shared Nodemailer transporter using environment variables.
 */
export function createSmtpClient({
    host = process.env.SMTP_HOST,
    port = parseInt(process.env.SMTP_PORT || "2525", 10),
    user = process.env.SMTP_USER,
    pass = process.env.SMTP_PASS,
    connectionTimeout = parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || "20000", 10),
    greetingTimeout = parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || "15000", 10),
} = {}) {
    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        family: 4,
        lookup: lookupIpv4,
        connectionTimeout,
        greetingTimeout,
        auth: {
            user,
            pass,
        },
    });
}
