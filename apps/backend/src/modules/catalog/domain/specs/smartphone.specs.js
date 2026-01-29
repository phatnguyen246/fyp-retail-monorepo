// apps/backend/src/modules/catalog/domain/specs/smartphone.specs.js

export const smartphoneSpecs = [
    { key: "brand", type: "string", label: "Brand", source: "main_specs" },
    { key: "model", type: "string", label: "Model", source: "main_specs" },
    { key: "os", type: "string", label: "Operating System", source: "main_specs" },
    { key: "screen_size_in", type: "number", label: "Screen Size", unit: "inch", source: "main_specs" },
    { key: "battery_mah", type: "number", label: "Battery", unit: "mAh", source: "main_specs" },
    {
        key: "ram_gb",
        type: "number",
        label: "RAM",
        unit: "GB",
        source: "either",
        strategy: "set",
        option_codes: ["ram", "ram_gb", "memory"],
    },
    {
        key: "storage_gb",
        type: "number",
        label: "Storage",
        unit: "GB",
        source: "either",
        strategy: "set",
        option_codes: ["storage", "storage_gb"],
    },
    { key: "cpu_brand", type: "string", label: "CPU Brand", source: "main_specs" },
    { key: "cpu_model", type: "string", label: "CPU Model", source: "main_specs" },
    { key: "camera_mp", type: "number", label: "Camera", unit: "MP", source: "main_specs" },
    { key: "has_5g", type: "boolean", label: "5G", source: "main_specs" },
];
