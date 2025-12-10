// app/api/merchize/order-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    getMerchizeTrackings,
    getOrderDetails,
    MerchizeOrderDetailPackage,
    MerchizeOrderInput,
    MerchizePackage,
} from "@/lib/merchize";

type OrderCodeRequestOrder = {
    input: string; // raw text từ UI
    external_number: string;
    identifier?: string;
};

type OrderCodeResultItem = {
    input: string;
    success: boolean;
    error?: string;
    code?: string | null;
    status: string | null;

};

function extractOrderCodeFromPackage(pkg: MerchizeOrderDetailPackage): string | null {
    const anyPkg: any = pkg;

    // 1. Nếu API có trả về field code thì dùng luôn
    if (typeof anyPkg.code === "string" && anyPkg.code.trim()) {
        return anyPkg.code.trim();
    }

    // 2. Fallback: lấy từ name, vd: RK-32344-92365-F1 -> RK-32344-92365
    if (typeof pkg.code === "string" && pkg.code.trim()) {
        const name = pkg.code.trim();
        const m = name.match(/^(.+)-F\d+$/i);
        if (m) return m[1];
        return name;
    }

    return null;
}

function extractOrderStatusFromPackage(pkg: MerchizeOrderDetailPackage): string | null {
    const anyPkg: any = pkg;

    // 1. Nếu API có trả về field code thì dùng luôn
    if (typeof anyPkg.order_status === "string" && anyPkg.order_status.trim()) {
        return anyPkg.order_status.trim();
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
function matchOrdersToCodes(
    orders: OrderCodeRequestOrder[],
    packages: MerchizeOrderDetailPackage[]
): OrderCodeResultItem[] {
    const remaining = [...packages];

    return orders.map((order) => {
        if (!order.external_number) {
            return {
                input: order.input,
                success: false,
                error: "Thiếu external_number",
                code: null,
                status: "lỗi",
            };
        }

        let index = -1;

        // 1. Match theo external_number nếu trong package có field này
        index = remaining.findIndex((p) => {
            const ext = (p as any).external_number;
            return (
                typeof ext === "string" &&
                ext.toUpperCase() === order.external_number.toUpperCase()
            );
        });

        // 2. Nếu không match được thì thử match bằng name chứa external_number
        if (index === -1) {
            index = remaining.findIndex((p) => {
                const name = String(p.code ?? "").toUpperCase();
                return name.includes(order.external_number.toUpperCase());
            });
        }

        if (index === -1) {
            return {
                input: order.input,
                success: false,
                error: "Không tìm thấy đơn tương ứng",
                code: null,
                status: "Lỗi",
            };
        }

        const matched = remaining.splice(index, 1)[0];
        const code = extractOrderCodeFromPackage(matched);
        const status = extractOrderStatusFromPackage(matched)

        if (!code) {
            return {
                input: order.input,
                success: false,
                error: "Không đọc được order code",
                code: null,
                status: "lỗi",
            };
        }

        return {
            input: order.input,
            success: true,
            code,
            status,
        };
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const orders = (body?.orders ?? []) as OrderCodeRequestOrder[];

        if (!Array.isArray(orders) || orders.length === 0) {
            return NextResponse.json({ success: true, results: [] });
        }

        const merchizeOrders: MerchizeOrderInput[] = orders.map((o) => ({
            code: "",
            external_number: o.external_number ?? "",
            identifier: o.identifier ?? "",
        }));

        const apiRes = await getOrderDetails(merchizeOrders);
        // console.log(apiRes);

        if (!apiRes.success) {
            const results: OrderCodeResultItem[] = orders.map((o) => ({
                input: o.input,
                success: false,
                error: apiRes.message || "Merchize API trả về lỗi",
                code: null,
                status: "lỗi",
            }));

            return NextResponse.json({ success: false, results }, { status: 200 });
        }

        const packages = apiRes.data ?? [];
        const results = matchOrdersToCodes(orders, packages);

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Merchize order-code error", error);
        return NextResponse.json(
            { success: false, message: error?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}
