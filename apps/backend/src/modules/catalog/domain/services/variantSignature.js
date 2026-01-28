/**
 * Build stable variant signature based on option_code ordering.
 * selections: [{ option_code, value_code }]
 */
export function buildVariantSignature(selections) {
    const normalized = selections
        .map((s) => ({
            option_code: String(s.option_code ?? "").trim(),
            value_code: String(s.value_code ?? "").trim(),
        }))
        .sort((a, b) => a.option_code.localeCompare(b.option_code));

    return normalized.map((x) => `${x.option_code}:${x.value_code}`).join("|");
}
