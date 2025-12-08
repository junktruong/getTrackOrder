// app/api/dreamship/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
    getDreamshipOrder,
    DreamshipOrder,
} from "@/lib/dreamship";

type TrackRequestOrder = {
    input: string; // raw text từ dòng UI
    id: string; // id order dreamship (vd: "322265507")
};

export type DreamshipTrackResultItem = {
    input: string;
    success: boolean;
    error?: string;
    order?: DreamshipOrder | null;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const orders = (body?.orders ?? []) as TrackRequestOrder[];

        if (!Array.isArray(orders) || orders.length === 0) {
            return NextResponse.json({ success: true, results: [] });
        }

        const results: DreamshipTrackResultItem[] = await Promise.all(
            orders.map(async (o) => {
                try {
                    const order = await getDreamshipOrder(o.id);
                    return {
                        input: o.input,
                        success: true,
                        order,
                    };
                } catch (error: any) {
                    return {
                        input: o.input,
                        success: false,
                        error: error?.message ?? "Dreamship API error",
                        order: null,
                    };
                }
            })
        );

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error("Dreamship track error", error);
        return NextResponse.json(
            { success: false, message: error?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}
