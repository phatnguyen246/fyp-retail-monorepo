import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
    createGlobalErrorHandler,
    createValidationErrorResponse,
} from "./error-handler.js";

function createResponseMock() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
}

describe("global error handler", () => {
    it("formats ZodError responses as HTTP 422 validation errors", () => {
        let validationError;

        try {
            z.object({
                title: z.string().min(1),
            }).parse({
                title: 123,
            });
        } catch (error) {
            validationError = error;
        }

        const response = createResponseMock();
        const handler = createGlobalErrorHandler({
            logger: { error: vi.fn() },
        });

        handler(validationError, {}, response, vi.fn());

        expect(response.status).toHaveBeenCalledWith(422);
        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: "VALIDATION_ERROR",
                message: "Request validation failed",
                meta: {
                    issues: [
                        expect.objectContaining({
                            path: "title",
                        }),
                    ],
                },
            })
        );
    });

    it("builds stable issue payloads for validation responses", () => {
        const error = createValidationErrorResponse(
            new z.ZodError([
                {
                    code: "custom",
                    message: "Invalid salePrice",
                    path: ["variantAttributes", "salePrice"],
                },
            ])
        );

        expect(error).toEqual({
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            meta: {
                issues: [
                    {
                        path: "variantAttributes.salePrice",
                        message: "Invalid salePrice",
                        code: "custom",
                    },
                ],
            },
        });
    });
});
