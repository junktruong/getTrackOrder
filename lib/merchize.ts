// lib/merchize.ts
import "server-only";

export type MerchizeOrderInput = {
    code: string;
    external_number: string;
    identifier?: string;
};

export type MerchizePackage = {
    _id: string;
    status: string;
    service: string;
    name: string;
    shipping_cost: number;
    created: string;
    items: {
        production_time_max: number;
        currency: string;
        quantity: number;
        ffm_discount_amount: number;
        sku: string;
        fulfillment_cost: number;
        product_type: string;
        ffm_mapped_catalog_sku: string;
        variant_title: string;
    }[];
    has_tracking: boolean;
    // cho phép thêm field khác không được document
    [key: string]: any;
};

export type MerchizeApiResponse = {
    success: boolean;
    message?: string;
    data?: MerchizePackage[];
};

export async function getMerchizeTrackings(
    orders: MerchizeOrderInput[]
): Promise<MerchizeApiResponse> {
    const baseUrl = process.env.MERCHIZE_BASE_URL;
    const token = process.env.MERCHIZE_ACCESS_TOKEN;

    if (!baseUrl) {
        throw new Error("MERCHIZE_BASE_URL is not set in environment");
    }

    if (!token) {
        throw new Error("MERCHIZE_ACCESS_TOKEN is not set in environment");
    }

    const res = await fetch(
        `${baseUrl}/order/external/orders/list-orders-tracking`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ orders }),
            cache: "no-store",
        }
    );

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Merchize API error: ${res.status} ${text}`);
    }

    const data = (await res.json()) as MerchizeApiResponse;
    return data;
}
