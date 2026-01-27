/**
 * Tạo chữ ký biến thể (variant signature) ổn định theo thứ tự option_code
 * selections: [{ option_code: "color", value_code: "black" }, ...]
 */
export function buildVariantSignature(selections) {
    const normalized = selections
        .map((s) => ({
            option_code: String(s.option_code).trim(),
            value_code: String(s.value_code).trim(),
        }))
        .sort((a, b) => a.option_code.localeCompare(b.option_code));

    return normalized.map((x) => `${x.option_code}:${x.value_code}`).join("|");
}
