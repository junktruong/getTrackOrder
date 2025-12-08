// app/api/merchize/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    getMerchizeTrackings,
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
};

function matchOrdersToPackages(
    orders: TrackRequestOrder[],
    packages: MerchizePackage[]
): TrackResultItem[] {
    const remaining = [...packages];

    return orders.map((order) => {
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

        return {
            input: order.input,
            success: true,
            pkg: matched,
        };
    });
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
        const results = matchOrdersToPackages(orders, packages);

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Merchize track error", error);
        return NextResponse.json(
            { success: false, message: error?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}
