// lib/dreamship.ts
import "server-only";

export type DreamshipTracking = {
    carrier?: string;
    carrier_url?: string;
    created_at?: string;
    id?: number;
    status?: string;
    tracking_number?: string;
    tracking_url?: string;
    [key: string]: any;
};

export type DreamshipFulfillment = {
    id?: number;
    trackings?: DreamshipTracking[];
    [key: string]: any;
};

export type DreamshipOrder = {
    id: number;
    fulfillments?: DreamshipFulfillment[];
    reference_id?: string;
    status?: string;
    created_at?: string;
    [key: string]: any;
};

export async function getDreamshipOrder(
    orderId: string | number
): Promise<DreamshipOrder> {
    const baseUrl =
        process.env.DREAMSHIP_BASE_URL || "https://api.dreamship.com";
    const token = process.env.DREAMSHIP_ACCESS_TOKEN;

    if (!token) {
        throw new Error("DREAMSHIP_ACCESS_TOKEN is not set in environment");
    }

    const res = await fetch(`${baseUrl}/v1/orders/${orderId}/`, {
        method: "GET",
        headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Dreamship API error: ${res.status} ${text}`);
    }

    const data = (await res.json()) as DreamshipOrder;
    return data;
}
