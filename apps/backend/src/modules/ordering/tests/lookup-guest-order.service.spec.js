import { ObjectId } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import { createLookupGuestOrderService } from "../services/lookup-guest-order.service.js";
import { createOrder } from "../models/index.js";
import { createOrderingValidation } from "../validation/index.js";

function createGuestOrderFixture() {
    return createOrder({
        _id: new ObjectId("65f000000000000000000730"),
        orderCode: "ORD-20260316-181818",
        accountId: null,
        recipientName: "Guest Customer",
        email: "guest@example.com",
        phoneNumber: "0900000000",
        shippingAddressLine: "123 Test Street",
        paymentMethod: "cod",
        paymentStatus: "pending",
        orderStatus: "pending",
        stockCommitStatus: "committed",
        items: [],
        subtotal: 0,
        discountTotal: 0,
        shippingFee: 0,
        grandTotal: 0,
        statusLogs: [],
        createdAt: new Date("2026-03-16T00:00:00.000Z"),
        updatedAt: new Date("2026-03-16T00:00:00.000Z"),
    });
}

describe("lookup guest order service", () => {
    it("returns guest order detail by orderCode", async () => {
        const orderRepository = {
            findOrderByFilter: vi.fn().mockResolvedValue(createGuestOrderFixture()),
        };
        const service = createLookupGuestOrderService({
            orderRepository,
            validation: createOrderingValidation(),
        });

        const result = await service({
            input: {
                orderCode: "ORD-20260316-181818",
            },
            requester: {
                role: "guest",
            },
        });

        expect(orderRepository.findOrderByFilter).toHaveBeenCalledWith({
            filter: {
                accountId: null,
                orderCode: "ORD-20260316-181818",
            },
        });
        expect(result).toMatchObject({
            id: "65f000000000000000000730",
            accountId: null,
            orderCode: "ORD-20260316-181818",
            phoneNumber: "0900000000",
        });
    });

    it("rejects admin requester on guest lookup route", async () => {
        const service = createLookupGuestOrderService({
            orderRepository: {
                findOrderByFilter: vi.fn(),
            },
            validation: createOrderingValidation(),
        });

        await expect(
            service({
                input: {
                    orderCode: "ORD-20260316-181818",
                },
                requester: {
                    role: "admin",
                    accountId: "acc_admin_1",
                },
            })
        ).rejects.toMatchObject({
            code: "ORDER_FORBIDDEN",
            httpStatus: 403,
        });
    });
});
