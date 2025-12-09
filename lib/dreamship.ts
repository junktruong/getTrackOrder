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
    reference_id?: string;
    status?: string;
    created_at?: string;
    fulfillments?: DreamshipFulfillment[];
    [key: string]: any;
};

const DREAMSHIP_BASE_URL =
    process.env.DREAMSHIP_BASE_URL || "https://api.dreamship.com";
const DREAMSHIP_TOKEN = process.env.DREAMSHIP_ACCESS_TOKEN;

if (!DREAMSHIP_TOKEN) {
    console.warn("DREAMSHIP_ACCESS_TOKEN is not set in environment");
}

export async function getDreamshipOrder(
    orderId: string | number
): Promise<DreamshipOrder> {
    if (!DREAMSHIP_TOKEN) {
        throw new Error("DREAMSHIP_ACCESS_TOKEN is not set in environment");
    }

    const res = await fetch(`${DREAMSHIP_BASE_URL}/v1/orders/${orderId}/`, {
        method: "GET",
        headers: {
            accept: "application/json",
            authorization: `Bearer ${DREAMSHIP_TOKEN}`,
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

// 🔹 HÀM MỚI: tìm đơn theo reference_id
export async function findDreamshipOrderByReferenceId(
    referenceId: string
): Promise<DreamshipOrder | null> {
    if (!DREAMSHIP_TOKEN) {
        throw new Error("DREAMSHIP_ACCESS_TOKEN is not set in environment");
    }

    const url =
        `${DREAMSHIP_BASE_URL}/v1/orders/?reference_id=` +
        encodeURIComponent(referenceId);

    const res = await fetch(url, {
        method: "GET",
        headers: {
            accept: "application/json",
            authorization: `Bearer ${DREAMSHIP_TOKEN}`,
        },
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Dreamship API error: ${res.status} ${text}`);
    }

    // const data = await res.json();

    const data = (await res.json()) as DreamshipOrder;
    return data;

}
