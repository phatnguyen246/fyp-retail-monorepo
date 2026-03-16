function assertOrderReaderMethod(orderReader, methodName) {
    if (typeof orderReader?.[methodName] !== "function") {
        throw new Error(`Ordering cart adapter requires orderReader.${methodName}`);
    }
}

export function createOrderingCartAdapter({ orderReader } = {}) {
    return {
        readCheckoutItems(...args) {
            assertOrderReaderMethod(orderReader, "readCheckoutItems");

            return orderReader.readCheckoutItems(...args);
        },

        removeCheckedOutItems(...args) {
            assertOrderReaderMethod(orderReader, "removeCheckedOutItems");

            return orderReader.removeCheckedOutItems(...args);
        },
    };
}
