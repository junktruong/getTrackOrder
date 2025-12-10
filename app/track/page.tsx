// app/track/page.tsx
"use client";

import React, { useState } from "react";

type Platform = "auto" | "printway" | "merchize" | "dreamship";

type Row = {
    id: number;
    raw: string; // đúng y dòng input
    platform: Platform;
    status: "idle" | "loading" | "done" | "error";
    result?: string; // tracking number
    carrier?: string; // hãng vận chuyển
    time?: string; // thời gian (từ Merchize)
    address?: string; // địa chỉ (từ Merchize)
    statusOrder?: string; // trạng thái đơn (từ Merchize)
    error?: string;
};

type MerchizePackageLight = {
    _id?: string;
    status?: string;
    service?: string;
    name?: string;
    created?: string;

    has_tracking?: boolean;

    tracking_company?: string;
    tracking_number?: string;
    tracking_url?: string;

    shipping_cost?: number;
    items?: { quantity?: number; variant_title?: string }[];

    [key: string]: any;
};

type MerchizeTrackResultItem = {
    input: string;
    success: boolean;
    error?: string;
    pkg?: MerchizePackageLight | null;
    time?: string | null;
    address?: string | null;
    statusOrder?: string | null;
};

// Dreamship types light cho UI
type DreamshipTrackingLight = {
    carrier?: string;
    tracking_number?: string;
    tracking_url?: string;
    status?: string;
    created_at?: string;
    [key: string]: any;
};

type DreamshipFulfillmentLight = {
    id?: number;
    trackings?: DreamshipTrackingLight[];
    [key: string]: any;
};

type DreamshipOrderLight = {
    id: number;
    fulfillments?: DreamshipFulfillmentLight[];
    [key: string]: any;
};

type DreamshipTrackResultItem = {
    input: string;
    success: boolean;
    error?: string;
    order?: DreamshipOrderLight | null;
};

const detectPlatformFromText = (text: string): Platform => {
    const raw = text.trim();

    if (!raw) return "auto";

    // Merchize: bắt đầu bằng R, có chữ + số, thường có dấu gạch
    if (/^R[A-Z0-9-]+$/i.test(raw)) {
        return "merchize";
    }

    // Printway: bắt đầu bằng P (thường là PW) + chuỗi chữ/số
    if (/^P[A-Z0-9]+$/i.test(raw)) {
        return "printway";
    }

    // Dreamship: chỉ có số
    if (/^\d+$/.test(raw)) {
        return "dreamship";
    }

    return "auto";
};

// Merchize: chỉ trả về mã tracking, rỗng nếu không có
const formatMerchizeResult = (pkg: MerchizePackageLight): string => {
    if (!pkg.has_tracking) {
        return "";
    }

    const number = pkg.tracking_number?.trim() || "";

    if (!number) return "";

    return number;
};

// Dreamship: lấy tracking đầu tiên trong fulfillments -> trackings
const extractDreamshipTracking = (
    order: DreamshipOrderLight
): { carrier: string; tracking: string; status: string; date: string } => {
    const fulfillments = order.fulfillments ?? [];
    for (const f of fulfillments) {
        const trackings = f.trackings ?? [];
        if (trackings.length > 0) {
            const t = trackings[0];
            const carrier = (t.carrier ?? "").toString().toUpperCase();
            const tracking = (t.tracking_number ?? "").toString();
            const date = (t.created_at ?? "").toString();
            const dateObject = date ? new Date(date) : new Date("2222-2-2");

            // 2. Lấy ngày (date) và tháng (month), sau đó định dạng
            const day = String(dateObject.getUTCDate()).padStart(2, '0');
            const month = String(dateObject.getUTCMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0

            const newTimeFormat = `${day}-${month}`;
            const status = (t.status ?? "").toString();
            if (tracking) {
                return { carrier, tracking, date: newTimeFormat, status };
            }
        }
    }
    // Không có tracking => coi như chưa có, trả rỗng
    return { carrier: "", tracking: "", date: "", status: "" };
};

export default function TrackPage() {
    const [rawInput, setRawInput] = useState<string>("");
    const [globalPlatform, setGlobalPlatform] = useState<Platform>("auto");
    const [rows, setRows] = useState<Row[]>([]);

    const syncRowsFromInput = (value: string, platform: Platform) => {
        const lines = value.split("\n");

        const nextRows: Row[] = lines.map((line, index) => {
            const existing = rows[index];

            const linePlatform =
                platform === "auto"
                    ? detectPlatformFromText(line || existing?.raw || "")
                    : platform;

            return {
                id: existing?.id ?? index,
                raw: line,
                platform: linePlatform,
                status: existing?.status ?? "idle",
                result: existing?.result,
                carrier: existing?.carrier,
                time: existing?.time,
                address: existing?.address,
                statusOrder: existing?.statusOrder,
                error: existing?.error,
            };
        });

        setRows(nextRows);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setRawInput(value);
        syncRowsFromInput(value, globalPlatform);
    };

    const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value as Platform;
        setGlobalPlatform(value);
        syncRowsFromInput(rawInput, value);
    };

    // Nút copy toàn bộ tracking
    const handleCopyTracking = async () => {
        const text = rows.map((r) => r.result ?? "").join("\n");

        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("Failed to copy tracking list:", err);
        }
    };

    const handleFetch = async () => {
        if (!rows.length) return;

        const currentRows = rows;

        // set trạng thái ban đầu + clear kết quả cũ
        setRows((prev) =>
            prev.map((r) =>
                r.raw.trim()
                    ? {
                        ...r,
                        status: "loading",
                        error: undefined,
                        result: undefined,
                        carrier: undefined,
                        time: undefined,
                        address: undefined,
                        statusOrder: undefined,
                    }
                    : {
                        ...r,
                        status: "idle",
                        error: undefined,
                        result: undefined,
                        carrier: undefined,
                        time: undefined,
                        address: undefined,
                        statusOrder: undefined,
                    }
            )
        );

        const merchizeRows = currentRows.filter(
            (r) => r.raw.trim() && r.platform === "merchize"
        );
        const dreamshipRows = currentRows.filter(
            (r) => r.raw.trim() && r.platform === "dreamship"
        );

        let merchizeResults: MerchizeTrackResultItem[] | null = null;
        let merchizeError: string | null = null;

        let dreamshipResults: DreamshipTrackResultItem[] | null = null;
        let dreamshipError: string | null = null;

        // Call Merchize
        if (merchizeRows.length) {
            try {
                const res = await fetch("/api/merchize/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orders: merchizeRows.map((r) => ({
                            input: r.raw,
                            code: r.raw,
                            external_number: "",
                            identifier: "",
                        })),
                    }),
                });

                const json = await res.json();
                merchizeResults = (json.results ?? []) as MerchizeTrackResultItem[];
            } catch (err: any) {
                merchizeError = err?.message ?? "Lỗi khi gọi API Merchize";
            }
        }

        // Call Dreamship
        if (dreamshipRows.length) {
            try {
                const res = await fetch("/api/dreamship/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orders: dreamshipRows.map((r) => ({
                            input: r.raw,
                            id: r.raw, // dreamship order id là số dạng "322265507"
                        })),
                    }),
                });

                const json = await res.json();
                dreamshipResults = (json.results ?? []) as DreamshipTrackResultItem[];
            } catch (err: any) {
                dreamshipError = err?.message ?? "Lỗi khi gọi API Dreamship";
            }
        }

        // Cập nhật vào rows
        setRows((prev) => {
            let merchizeIndex = 0;
            let dreamshipIndex = 0;

            return prev.map((row) => {
                if (!row.raw.trim()) {
                    return { ...row, status: "idle" };
                }

                // Merchize
                if (row.platform === "merchize") {
                    if (!merchizeRows.length) {
                        return {
                            ...row,
                            status: "error",
                            error: "Chưa triển khai API cho Merchize",
                        };
                    }

                    if (merchizeError) {
                        return {
                            ...row,
                            status: "error",
                            error: merchizeError,
                        };
                    }

                    const item = merchizeResults?.[merchizeIndex++];

                    if (!item) {
                        return {
                            ...row,
                            status: "error",
                            error: "Không nhận được kết quả từ API Merchize",
                        };
                    }

                    if (!item.success || !item.pkg) {
                        return {
                            ...row,
                            status: "error",
                            error: item.error || "Không tìm thấy tracking",
                        };
                    }

                    const pkg = item.pkg;
                    const carrier =
                        pkg.has_tracking && pkg.tracking_company
                            ? pkg.tracking_company.trim()
                            : "";
                    const tracking = formatMerchizeResult(pkg);

                    const time = item.time ?? "";
                    const address = item.address ?? "";
                    const statusOrder = item.statusOrder ?? "";

                    return {
                        ...row,
                        status: "done",
                        error: undefined,
                        result: tracking,
                        carrier,
                        time,
                        address,
                        statusOrder,
                    };
                }

                // Dreamship
                if (row.platform === "dreamship") {
                    if (!dreamshipRows.length) {
                        return {
                            ...row,
                            status: "error",
                            error: "Chưa triển khai API cho Dreamship",
                        };
                    }

                    if (dreamshipError) {
                        return {
                            ...row,
                            status: "error",
                            error: dreamshipError,
                        };
                    }

                    const item = dreamshipResults?.[dreamshipIndex++];

                    if (!item) {
                        return {
                            ...row,
                            status: "error",
                            error: "Không nhận được kết quả từ API Dreamship",
                        };
                    }

                    if (!item.success || !item.order) {
                        return {
                            ...row,
                            status: "error",
                            error: item.error || "Không tìm thấy tracking",
                        };
                    }

                    const { carrier, tracking, date, status } = extractDreamshipTracking(item.order);

                    // Nếu không có tracking => rỗng nhưng vẫn "done"
                    return {
                        ...row,
                        status: "done",
                        error: undefined,
                        result: tracking || "",
                        carrier: carrier || "",
                        time: date || "",
                        statusOrder: status || ""

                    };
                }

                // Các nền tảng khác tạm thời chưa làm
                return {
                    ...row,
                    status: "error",
                    error: "Chưa triển khai API cho nền tảng này",
                };
            });
        });
    };

    const totalLines = rows.length;
    const nonEmptyLines = rows.filter((r) => r.raw.trim()).length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="max-w-6xl mx-3 px-4 py-8 md:py-10">
                {/* Header */}
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        Lấy Track PrintWay / Merchize / DreamShip
                    </h1>
                    <p className="mt-2 text-sm md:text-base text-slate-400">
                        Dán cột mã đơn / tracking từ Google Sheet vào ô bên trái. Hệ thống
                        sẽ trả kết quả tương ứng theo từng dòng ở cột bên phải.
                    </p>
                </header>

                {/* Control bar */}
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <span>Nền tảng mặc định:</span>
                            <select
                                value={globalPlatform}
                                onChange={handlePlatformChange}
                                className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="auto">Tự động</option>
                                <option value="printway">PrintWay</option>
                                <option value="merchize">Merchize</option>
                                <option value="dreamship">DreamShip</option>
                            </select>
                        </label>

                        <div className="text-xs md:text-sm text-slate-400">
                            Dòng:{" "}
                            <span className="font-semibold text-slate-200">
                                {totalLines}
                            </span>{" "}
                            · Có dữ liệu:{" "}
                            <span className="font-semibold text-emerald-400">
                                {nonEmptyLines}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleFetch}
                        className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-emerald-400 active:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!rows.length || !nonEmptyLines}
                    >
                        Lấy kết quả
                    </button>
                </div>

                {/* Main grid */}
                <div className="grid gap-4 md:grid-cols-4">
                    {/* Input side */}
                    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 md:p-4 shadow-sm md:col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-medium text-slate-200">
                                1. Dán dữ liệu từ Sheet
                            </h2>
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                Mỗi dòng 1 mã
                            </span>
                        </div>
                        <textarea
                            value={rawInput}
                            onChange={handleInputChange}
                            rows={18}
                            spellCheck={false}
                            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder={`VD:\nRQ-54278-39427\nRZ-62395-94593\nPW102035\n322799548`}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            * Dán nguyên cột như trên Google Sheet. Hệ thống sẽ giữ đúng thứ
                            tự và số dòng.
                        </p>
                    </section>

                    {/* Result side */}
                    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 md:p-4 shadow-sm overflow-auto md:col-span-3">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-medium text-slate-200">
                                2. Kết quả theo từng dòng
                            </h2>
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                Read only
                            </span>
                        </div>

                        <div className="border border-slate-800 rounded-lg overflow-hidden">
                            <table className="min-w-full border-collapse text-xs md:text-sm">
                                <thead className="bg-slate-900/80">
                                    <tr>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[3rem]">
                                            #
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[18%]">
                                            Mã / dòng input
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[6rem]">
                                            Nền tảng
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[8rem]">
                                            Hãng vận chuyển
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[9rem]">
                                            <div className="flex items-center gap-1">
                                                <span>Tracking</span>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyTracking}
                                                    className="text-[10px] md:text-xs px-1 py-0.5 border border-slate-600 rounded hover:bg-slate-800"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[9rem]">
                                            Thời gian
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[16%]">
                                            Địa chỉ
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[8rem]">
                                            Trạng thái đơn
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[5rem]">
                                            Trạng thái
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-3 py-4 text-center text-slate-500"
                                            >
                                                Chưa có dữ liệu. Dán mã đơn / tracking vào ô bên trái.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, index) => (
                                            <tr
                                                key={row.id}
                                                className={
                                                    index % 2 === 0
                                                        ? "bg-slate-950/40"
                                                        : "bg-slate-950/20"
                                                }
                                            >
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-slate-400">
                                                    {index + 1}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top font-mono text-[11px] md:text-xs break-all">
                                                    {row.raw || (
                                                        <span className="text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-[11px] md:text-xs capitalize text-slate-300">
                                                    {row.platform === "auto"
                                                        ? "Auto"
                                                        : row.platform === "printway"
                                                            ? "PrintWay"
                                                            : row.platform === "merchize"
                                                                ? "Merchize"
                                                                : "DreamShip"}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-[11px] md:text-xs">
                                                    {row.carrier || ""}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-[11px] md:text-xs">
                                                    {row.status === "idle" &&
                                                        !row.result &&
                                                        row.raw.trim()
                                                        ? "Chưa lấy"
                                                        : row.status === "loading"
                                                            ? "Đang lấy..."
                                                            : row.status === "error"
                                                                ? row.error || "Lỗi"
                                                                : row.result || ""}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-[11px] md:text-xs">
                                                    {row.time || ""}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-[11px] md:text-xs break-all">
                                                    {row.address || ""}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-[11px] md:text-xs">
                                                    {row.statusOrder || ""}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 align-top text-[11px] md:text-[11px]">
                                                    {row.status === "idle" && row.raw.trim()
                                                        ? "Idle"
                                                        : row.status === "idle"
                                                            ? ""
                                                            : row.status === "loading"
                                                                ? "Đang chạy"
                                                                : row.status === "done"
                                                                    ? "OK"
                                                                    : "Lỗi"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                            * Merchize & Dreamship đã được nối API. PrintWay tạm thời đang để
                            &quot;Chưa triển khai&quot;. Các cột Thời gian / Địa chỉ /
                            Trạng thái đơn hiện chỉ fill cho Merchize (theo dữ liệu API trả
                            về).
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
