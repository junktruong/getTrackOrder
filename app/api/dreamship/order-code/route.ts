// app/api/dreamship/order-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    findDreamshipOrderByReferenceId,
    DreamshipOrder,
} from "@/lib/dreamship";

type DreamshipOrderCodeRequestItem = {
    input: string;        // raw từ UI
    reference_id: string; // 114-2545030-4324234
};

type DreamshipOrderCodeResultItem = {
    input: string;
    success: boolean;
    error?: string;
    code?: string | null;   // id (order code bạn cần)
    status?: string | null; // status của đơn
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const orders = (body?.orders ?? []) as DreamshipOrderCodeRequestItem[];

        if (!Array.isArray(orders) || orders.length === 0) {
            return NextResponse.json({ success: true, results: [] });
        }

        const results: DreamshipOrderCodeResultItem[] = await Promise.all(
            orders.map(async (o) => {
                if (!o.reference_id?.trim()) {
                    return {
                        input: o.input,
                        success: false,
                        error: "Thiếu reference_id",
                        code: null,
                        status: null,
                    };
                }

                try {
                    const order = await findDreamshipOrderByReferenceId(
                        o.reference_id.trim()
                    );




                    if (!order) {
                        return {
                            input: o.input,
                            success: false,
                            error: "Order not found",
                            code: null,
                            status: null,
                        };
                    }

                    return {
                        input: o.input,
                        success: true,
                        code: order.data[0].id,
                        status: order.data[0].status ?? null,
                    };
                } catch (err: any) {
                    return {
                        input: o.input,
                        success: false,
                        error: err?.message ?? "Dreamship API error",
                        code: null,
                        status: null,
                    };
                }
            })
        );

        // console.log(results);

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Dreamship order-code error", error);
        return NextResponse.json(
            { success: false, message: error?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}
