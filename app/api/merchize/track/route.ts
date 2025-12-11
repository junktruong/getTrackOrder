// app/api/merchize/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    getHistoryOrder,
    getMerchizeTrackings,
    getOrderDetails,
    MerchizeOrderInput,
    MerchizePackage,
} from "@/lib/merchize";

type TrackRequestOrder = {
    input: string; // raw text từ dòng UI
    code: string;
    external_number: string;
    identifier?: string;
};

type TrackResultItem = {
    input: string;
    success: boolean;
    error?: string;
    pkg?: MerchizePackage | null;
    time?: string | null;
    address?: string | null;
    statusOrder?: string | null;
};


function extractOrderIdTrackFromPackage(pkg: any): string | null {
    const anyPkg: any = pkg;

    // 1. Nếu API có trả về field code thì dùng luôn
    if (typeof anyPkg._id === "string" && anyPkg._id.trim()) {
        return anyPkg._id.trim();
    }

    // 2. Fallback: lấy từ name, vd: RK-32344-92365-F1 -> RK-32344-92365
    // if (typeof pkg.name === "string" && pkg.name.trim()) {
    //     const name = pkg.name.trim();
    //     const m = name.match(/^(.+)-F\d+$/i);
    //     if (m) return m[1];
    //     return name;
    // }

    return null;
}


async function matchOrdersToPackages(
    orders: TrackRequestOrder[],
    packages: MerchizePackage[]
): Promise<TrackResultItem[]> {
    const remaining = [...packages];

    return Promise.all(orders.map(async (order) => {
        if (!order.code && !order.external_number) {
            return {
                input: order.input,
                success: false,
                error: "Thiếu code / external_number",
                pkg: null,

            };
        }

        let index = -1;

        // Thử match theo code: name thường kiểu RX-XXXX-XXXX-F1 => startsWith(code)
        if (order.code) {
            index = remaining.findIndex(
                (p) =>
                    typeof p.name === "string" &&
                    p.name.toUpperCase().startsWith(order.code.toUpperCase())
            );
        }

        // Nếu không match theo code thì thử external_number (tạm thời dùng includes)
        if (index === -1 && order.external_number) {
            index = remaining.findIndex((p) => {
                const name = String(p.name ?? "").toUpperCase();
                return name.includes(order.external_number.toUpperCase());
            });
        }

        if (index === -1) {
            return {
                input: order.input,
                success: false,
                error: "Không tìm thấy package tương ứng",
                pkg: null,
            };
        }

        const matched = remaining.splice(index, 1)[0];

        const idOrder = order.code
        const idTrack = extractOrderIdTrackFromPackage(matched)

        const resHis = await getHistoryOrder(idOrder, idTrack);



        const time = resHis.time


        // 1. Chuyển chuỗi thời gian thành đối tượng Date

        const dateObject = time ? new Date(time) : new Date("2222-2-2");

        // 2. Lấy ngày (date) và tháng (month), sau đó định dạng
        const day = String(dateObject.getUTCDate()).padStart(2, '0');
        const month = String(dateObject.getUTCMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0

        const newTimeFormat = `${day}-${month}`;

        return {
            input: order.input,
            success: true,
            pkg: matched,
            time: newTimeFormat,
            address: resHis.location,
            statusOrder: resHis.message,

        };
    }));
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const orders = (body?.orders ?? []) as TrackRequestOrder[];

        if (!Array.isArray(orders) || orders.length === 0) {
            return NextResponse.json({ success: true, results: [] });
        }

        const merchizeOrders: MerchizeOrderInput[] = orders.map((o) => ({
            code: o.code ?? "",
            external_number: o.external_number ?? "",
            identifier: o.identifier ?? "",
        }));

        const apiRes = await getMerchizeTrackings(merchizeOrders);
        console.log(apiRes.data)

        if (!apiRes.success) {
            const results: TrackResultItem[] = orders.map((o) => ({
                input: o.input,
                success: false,
                error: apiRes.message || "Merchize API trả về lỗi",
                pkg: null,
            }));

            return NextResponse.json({ success: false, results }, { status: 200 });
        }

        const packages = apiRes.data ?? [];
        const results = await matchOrdersToPackages(orders, packages);

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Merchize track error", error);
        return NextResponse.json(
            { success: false, message: error?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}

