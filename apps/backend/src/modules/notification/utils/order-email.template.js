/**
 * Simple currency formatter for email
 */
function formatCurrency(amount, currency = "VND") {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency,
    }).format(amount);
}

/**
 * Generates Order Confirmation Email HTML
 */
export function generateOrderConfirmationHtml({ order }) {
    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>${item.productName}</strong><br/>
                <small style="color: #666;">${item.variantLabel || ""}</small>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.lineTotal, order.currency || "VND")}</td>
        </tr>
    `).join("");

    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; color: #1a1a1a;">Xác nhận đơn hàng</h1>
            <p style="margin: 5px 0 0; color: #666;">Cảm ơn bạn đã mua sắm tại Retail System</p>
        </div>
        
        <div style="padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Chào <strong>${order.recipientName}</strong>,</p>
            <p>Đơn hàng của bạn đã được tiếp nhận thành công. Dưới đây là thông tin chi tiết:</p>
            
            <div style="background-color: #fff9f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;">Mã đơn hàng: <strong style="color: #d97706;">${order.orderCode}</strong></p>
                <p style="margin: 5px 0 0;">Ngày đặt: ${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
                <p style="margin: 5px 0 0;">Phương thức thanh toán: ${order.paymentMethod === "vnpay" ? "VNPAY" : "Thanh toán khi nhận hàng (COD)"}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #fcfcfc;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #eee;">Sản phẩm</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #eee;">SL</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 20px 10px 5px; text-align: right;"><strong>Tạm tính:</strong></td>
                        <td style="padding: 20px 10px 5px; text-align: right;">${formatCurrency(order.subtotal, order.currency || "VND")}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 5px 10px; text-align: right;"><strong>Phí vận chuyển:</strong></td>
                        <td style="padding: 5px 10px; text-align: right;">${formatCurrency(order.shippingFee, order.currency || "VND")}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 10px; text-align: right;"><h3 style="margin: 0;">Tổng cộng:</h3></td>
                        <td style="padding: 10px; text-align: right;"><h3 style="margin: 0; color: #1a1a1a;">${formatCurrency(order.grandTotal, order.currency || "VND")}</h3></td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Địa chỉ nhận hàng:</p>
                <p style="margin: 5px 0 0; font-weight: bold;">${order.recipientName} - ${order.phoneNumber}</p>
                <p style="margin: 5px 0 0;">${order.shippingAddressLine}</p>
            </div>
            
            <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #999;">
                <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
                <p>&copy; 2026 Retail System. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
}
