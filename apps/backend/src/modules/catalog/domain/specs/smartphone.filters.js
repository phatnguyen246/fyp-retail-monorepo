// apps/backend/src/modules/catalog/domain/specs/smartphone.filters.js

export const smartphoneFilters = {
    product_type: "smartphone",
    groups: [
        {
            id: "hardware",
            label: "Hardware",
            filters: [
                {
                    key: "ram_gb",
                    label: "RAM",
                    type: "number",
                    unit: "GB",
                    control: "range",
                    operators: ["eq", "gte", "lte", "between"],
                    buckets: [
                        { label: "4 GB", min: 4, max: 4 },
                        { label: "6 GB", min: 6, max: 6 },
                        { label: "8 GB", min: 8, max: 8 },
                        { label: "12 GB", min: 12, max: 12 },
                        { label: "16 GB+", min: 16 },
                    ],
                },
                {
                    key: "storage_gb",
                    label: "Storage",
                    type: "number",
                    unit: "GB",
                    control: "range",
                    operators: ["eq", "gte", "lte", "between"],
                    buckets: [
                        { label: "64 GB", min: 64, max: 64 },
                        { label: "128 GB", min: 128, max: 128 },
                        { label: "256 GB", min: 256, max: 256 },
                        { label: "512 GB", min: 512, max: 512 },
                        { label: "1 TB+", min: 1024 },
                    ],
                },
                {
                    key: "cpu_brand",
                    label: "CPU Brand",
                    type: "string",
                    control: "select",
                    operators: ["in", "eq"],
                    options: [
                        { label: "Apple", value: "apple" },
                        { label: "Qualcomm", value: "qualcomm" },
                        { label: "MediaTek", value: "mediatek" },
                        { label: "Samsung", value: "samsung" },
                    ],
                },
            ],
        },
        {
            id: "display",
            label: "Display",
            filters: [
                {
                    key: "screen_size_in",
                    label: "Screen Size",
                    type: "number",
                    unit: "inch",
                    control: "range",
                    operators: ["gte", "lte", "between"],
                    buckets: [
                        { label: "<= 6.0\"", max: 6.0 },
                        { label: "6.1-6.6\"", min: 6.1, max: 6.6 },
                        { label: ">= 6.7\"", min: 6.7 },
                    ],
                },
            ],
        },
        {
            id: "battery",
            label: "Battery",
            filters: [
                {
                    key: "battery_mah",
                    label: "Battery Capacity",
                    type: "number",
                    unit: "mAh",
                    control: "range",
                    operators: ["gte", "lte", "between"],
                    buckets: [
                        { label: "< 4000", max: 3999 },
                        { label: "4000-4999", min: 4000, max: 4999 },
                        { label: ">= 5000", min: 5000 },
                    ],
                },
            ],
        },
        {
            id: "camera",
            label: "Camera",
            filters: [
                {
                    key: "camera_mp",
                    label: "Main Camera",
                    type: "number",
                    unit: "MP",
                    control: "range",
                    operators: ["gte", "lte", "between"],
                    buckets: [
                        { label: "< 48 MP", max: 47 },
                        { label: "48-64 MP", min: 48, max: 64 },
                        { label: ">= 108 MP", min: 108 },
                    ],
                },
            ],
        },
        {
            id: "connectivity",
            label: "Connectivity",
            filters: [
                {
                    key: "has_5g",
                    label: "5G",
                    type: "boolean",
                    control: "toggle",
                    operators: ["eq"],
                    options: [
                        { label: "Yes", value: true },
                        { label: "No", value: false },
                    ],
                },
            ],
        },
        {
            id: "os",
            label: "Operating System",
            filters: [
                {
                    key: "os",
                    label: "OS",
                    type: "string",
                    control: "select",
                    operators: ["in", "eq"],
                    options: [
                        { label: "Android", value: "android" },
                        { label: "iOS", value: "ios" },
                    ],
                },
            ],
        },
        {
            id: "pricing",
            label: "Pricing",
            filters: [
                {
                    key: "price",
                    label: "Price",
                    type: "number",
                    unit: "VND",
                    control: "range",
                    operators: ["gte", "lte", "between", "eq"],
                    buckets: [
                        { label: "< 10m", max: 10000000 },
                        { label: "10m - 20m", min: 10000000, max: 20000000 },
                        { label: "> 20m", min: 20000000 },
                    ],
                },
            ],
        },
    ],
};
