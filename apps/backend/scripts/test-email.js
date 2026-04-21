import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerNotificationModule } from "../src/modules/notification/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.dev") });

async function main() {
    const toEmail = process.env.SMTP_TO || "test@example.com";
    console.log("Starting email test with config:", {
        host: process.env.SMTP_HOST,
        user: process.env.SMTP_USER ? "****" : "missing",
        to: toEmail,
    });
    
    const notification = registerNotificationModule();
    
    const result = await notification.services.sendEmail({
        to: toEmail,
        subject: "Mailtrap Test - Retail System",
        html: "<h1>Hello from Mailtrap</h1><p>This is a test email sent from the Retail System backend.</p>",
        text: "Hello from Mailtrap. This is a test email sent from the Retail System backend.",
    });

    if (result.success) {
        console.log("Success! Message ID:", result.messageId);
    } else {
        console.error("Failed to send email:", result.error.message);
    }
}

main().catch(err => {
    console.error("Test script crashed:", err);
    process.exit(1);
});
