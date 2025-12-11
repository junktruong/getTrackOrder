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

export type MerchizeOrderDetailPackage = {
    _id: string;
    code: string;
    order_status: string;
    external_number: string;
    identifier: string;
    shipping_cost: number;
    created: string;
    shipment_statuses: any[];
    invoice: any;
    fulfillment_cost: any;
    items: [any];
    fulfill_manually: boolean;
    // cho phép thêm field khác không được document

};
export type MerchizeApiResponseHistory = {
    _id?: string | null;
    time?: string | null;
    location?: string | null;
    message?: string | null;
}



export type MerchizeApiResponse = {
    success: boolean;
    message?: string;
    data?: any[];
};

export async function getMerchizeTrackings(
    orders: MerchizeOrderInput[],
): Promise<MerchizeApiResponse> {
    const baseUrl = process.env.MERCHIZE_BASE_URL;
    const token = process.env.MERCHIZE_ACCESS_TOKEN;

    if (!baseUrl) {
        throw new Error("MERCHIZE_BASE_URL is not set in environment");
    }

    if (!token) {
        throw new Error("MERCHIZE_ACCESS_TOKEN is not set in environment");
    }

    console.log("extermal : ", orders);
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

    console.log(data);

    return data;
}

export async function getOrderDetails(
    orders: MerchizeOrderInput[],
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
        `${baseUrl}/order/external/orders/list-orders-detail`,
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
    // console.log(data);

    return data;
}


export async function getHistoryOrder(orderCode: string, idTrack: string | null): Promise<MerchizeApiResponseHistory> {
    const baseUrl = process.env.MERCHIZE_BASE_URL;
    const token = process.env.MERCHIZE_ACCESS_TOKEN;

    if (!baseUrl) {
        throw new Error("MERCHIZE_BASE_URL is not set in environment");
    }

    if (!token) {
        throw new Error("MERCHIZE_ACCESS_TOKEN is not set in environment");
    }


    const res = await fetch(
        `${baseUrl}/order/orders/search/v3?code=${orderCode}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        }
    );

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Merchize API error: ${res.status} ${text}`);
    }


    const dataOrder = (await res.json()) as MerchizeApiResponse;

    const id = (dataOrder.data as any).orders[0]._id



    // console.log(data);

    const resHis = await fetch(
        `${baseUrl}/order/orders/${id}/fulfillments/${idTrack}/shipment-status`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        }
    );
    const data = (await resHis.json()) as MerchizeApiResponse;

    // console.log(data.success);

    if ((data as any).success) {
        const histories = (data.data as any).histories;




        if (histories.length > 0) {
            console.log("ok");

            const latestHistory = histories.reduce((latest: any, item: any) => {
                return new Date(item.time) > new Date(latest.time) ? item : latest;
            }, histories[0]);



            return { ...latestHistory, _id: id };

        }

        return {
            _id: id,
            time: "Chưa có",
            location: "Chưa có",
            message: "Chưa có"
        }
    }


    return {
        _id: id,
        time: "Khác US",
        location: "Khác US",
        message: "Khác US"
    }
}