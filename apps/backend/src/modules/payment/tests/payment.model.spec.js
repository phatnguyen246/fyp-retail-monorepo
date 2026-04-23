import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { createPayment } from "../models/index.js";

describe("payment model", () => {
    it("creates a valid payment document", () => {
        const payment = createPayment({
            _id: new ObjectId("65f000000000000000000801"),
            paymentCode: "PAY-20260316-000001",
            orderId: new ObjectId("65f000000000000000000802"),
            orderCode: "ORD-20260316-000001",
            paymentMethod: "vnpay",
            provider: "vnpay",
            amount: 19990000,
            currency: "VND",
            status: "pending",
            providerTxnRef: "PAY-20260316-000001",
            orderInfo: "Order payment ORD 20260316 000001",
            createdAt: new Date("2026-03-16T00:00:00.000Z"),
            updatedAt: new Date("2026-03-16T00:00:00.000Z"),
        });

        expect(payment).toMatchObject({
            paymentCode: "PAY-20260316-000001",
            orderCode: "ORD-20260316-000001",
            paymentMethod: "vnpay",
            provider: "vnpay",
            amount: 19990000,
            status: "pending",
            providerTxnRef: "PAY-20260316-000001",
        });
    });

    it("rejects unsupported payment statuses", () => {
        expect(() =>
            createPayment({
                paymentCode: "PAY-20260316-000002",
                orderId: new ObjectId("65f000000000000000000803"),
                orderCode: "ORD-20260316-000002",
                paymentMethod: "cod",
                provider: "internal",
                amount: 100000,
                currency: "VND",
                status: "unknown",
            })
        ).toThrow("Payment requires status to be one of");
    });
});
