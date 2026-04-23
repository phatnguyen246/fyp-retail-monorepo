import { describe, expect, it, vi } from "vitest";
import { createMailtrapAdapter } from "../adapters/mailtrap.adapter.js";
import { createSendEmailService } from "../services/send-email.service.js";

describe("notification services", () => {
    describe("createSendEmailService", () => {
        it("throws when required fields are missing", async () => {
            const service = createSendEmailService({
                emailGateway: {
                    sendEmail: vi.fn(),
                },
            });

            await expect(
                service({
                    to: "",
                    subject: "",
                    html: "<b>hello</b>",
                })
            ).rejects.toThrow("Recipient and subject are required");
        });

        it("delegates to email gateway and returns its response", async () => {
            const emailGateway = {
                sendEmail: vi.fn().mockResolvedValue({
                    success: true,
                    messageId: "mail-1",
                }),
            };
            const service = createSendEmailService({
                emailGateway,
            });

            const result = await service({
                to: "user@example.com",
                subject: "Order confirmed",
                html: "<p>ok</p>",
            });

            expect(emailGateway.sendEmail).toHaveBeenCalledWith({
                to: "user@example.com",
                subject: "Order confirmed",
                html: "<p>ok</p>",
                text: undefined,
            });
            expect(result).toEqual({
                success: true,
                messageId: "mail-1",
            });
        });
    });

    describe("createMailtrapAdapter", () => {
        it("returns success result and logs info when SMTP send succeeds", async () => {
            const smtpClient = {
                sendMail: vi.fn().mockResolvedValue({
                    messageId: "smtp-1",
                }),
            };
            const logger = {
                info: vi.fn(),
                error: vi.fn(),
            };
            const adapter = createMailtrapAdapter({
                smtpClient,
                fromEmail: "noreply@retail.local",
                fromName: "Retail",
                logger,
            });

            const result = await adapter.sendEmail({
                to: "to@example.com",
                subject: "hello",
                html: "<p>test</p>",
            });

            expect(smtpClient.sendMail).toHaveBeenCalledWith({
                from: "\"Retail\" <noreply@retail.local>",
                to: "to@example.com",
                subject: "hello",
                text: undefined,
                html: "<p>test</p>",
            });
            expect(result).toEqual({
                success: true,
                messageId: "smtp-1",
            });
            expect(logger.info).toHaveBeenCalled();
            expect(logger.error).not.toHaveBeenCalled();
        });

        it("returns failure result with Error instance when SMTP send fails", async () => {
            const smtpClient = {
                sendMail: vi.fn().mockRejectedValue("smtp down"),
            };
            const logger = {
                info: vi.fn(),
                error: vi.fn(),
            };
            const adapter = createMailtrapAdapter({
                smtpClient,
                logger,
            });

            const result = await adapter.sendEmail({
                to: "to@example.com",
                subject: "hello",
                html: "<p>test</p>",
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
