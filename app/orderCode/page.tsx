// app/order-code/page.tsx
"use client";

import Link from "next/link";
import React, { useState } from "react";

type Provider = "merchize" | "dreamship";

type Row = {
    id: number;
    raw: string; // external_number (Merchize) hoặc reference_id (Dreamship)
    status: "idle" | "loading" | "done" | "error";
    result?: string; // order code (Merchize) hoặc order id (Dreamship)
    error?: string;
    statusCode?: string | null; // trạng thái đơn (fulfilled, paid, ...)
};

type OrderCodeResultItem = {
    input: string;
    success: boolean;
    error?: string;
    code?: string | null;
    status?: string | null;
};

export default function OrderCodePage() {
    const [rawInput, setRawInput] = useState<string>("");
    const [rows, setRows] = useState<Row[]>([]);
    const [primaryProvider, setPrimaryProvider] = useState<Provider>("merchize");

    const syncRowsFromInput = (value: string) => {
        const lines = value.split("\n");

        const next: Row[] = lines.map((line, index) => {
            const existing = rows[index];
            return {
                id: existing?.id ?? index,
                raw: line,
                status: existing?.status ?? "idle",
                result: existing?.result,
                error: existing?.error,
                statusCode: existing?.statusCode ?? "",
            };
        });

        setRows(next);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setRawInput(value);
        syncRowsFromInput(value);
    };

    const handlePrimaryProviderChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        const value = e.target.value as Provider;
        setPrimaryProvider(value);
    };

    // Gọi API order-code Merchize cho 1 nhóm dòng
    const callMerchizeOrderCodes = async (
        subset: Row[]
    ): Promise<OrderCodeResultItem[]> => {
        if (!subset.length) return [];

        try {
            const res = await fetch("/api/merchize/order-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders: subset.map((r) => ({
                        input: r.raw,
                        external_number: r.raw.trim(), // Merchize: dùng external_number
                    })),
                }),
            });

            const json = await res.json();
            return (json.results ?? []) as OrderCodeResultItem[];
        } catch (err: any) {
            const msg = err?.message ?? "Lỗi khi gọi API Merchize";
            return subset.map((r) => ({
                input: r.raw,
                success: false,
                error: msg,
                code: null,
                status: null,
            }));
        }
    };

    // Gọi API order-code Dreamship cho 1 nhóm dòng
    const callDreamshipOrderCodes = async (
        subset: Row[]
    ): Promise<OrderCodeResultItem[]> => {
        if (!subset.length) return [];

        try {
            const res = await fetch("/api/dreamship/order-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders: subset.map((r) => ({
                        input: r.raw,
                        reference_id: r.raw.trim(), // Dreamship: dùng reference_id
                    })),
                }),
            });

            const json = await res.json();
            return (json.results ?? []) as OrderCodeResultItem[];
        } catch (err: any) {
            const msg = err?.message ?? "Lỗi khi gọi API Dreamship";
            return subset.map((r) => ({
                input: r.raw,
                success: false,
                error: msg,
                code: null,
                status: null,
            }));
        }
    };

    const handleFetch = async () => {
        if (!rows.length) return;

        const currentRows = rows;

        // Map index dòng → index trong validRows
        const validRows: Row[] = [];
        const rowIndexToValidIndex: number[] = new Array(currentRows.length).fill(
            -1
        );

        currentRows.forEach((r, idx) => {
            if (r.raw.trim()) {
                rowIndexToValidIndex[idx] = validRows.length;
                validRows.push(r);
            }
        });

        if (!validRows.length) return;


        // Set loading + clear result/error
        setRows((prev) =>
            prev.map((r) =>
                r.raw.trim()
                    ? {
                        ...r,
                        status: "loading",
                        result: "",
                        error: undefined,
                        statusCode: "",
                    }
                    : r
            )
        );

        const secondaryProvider: Provider =
            primaryProvider === "merchize" ? "dreamship" : "merchize";

        let merchizeResults: OrderCodeResultItem[] | null = null;
        let dreamshipResults: OrderCodeResultItem[] | null = null;

        // Map index trong validRows -> kết quả fallback từ provider thứ 2
        const secondaryResultMap = new Map<number, OrderCodeResultItem>();

        // 1. Gọi provider ưu tiên trước cho TẤT CẢ validRows
        let firstResults: OrderCodeResultItem[] = [];

        if (primaryProvider === "merchize") {
            firstResults = await callMerchizeOrderCodes(validRows);
            merchizeResults = firstResults;
        } else {
            firstResults = await callDreamshipOrderCodes(validRows);
            dreamshipResults = firstResults;
        }

        // 2. Xác định những dòng cần fallback sang provider thứ 2
        const needSecondaryIndices: number[] = [];
        firstResults.forEach((item, idx) => {
            if (!item || !item.success || !item.code) {
                needSecondaryIndices.push(idx);
            }
        });

        // 3. Gọi provider thứ 2 cho các dòng cần fallback
        if (needSecondaryIndices.length) {
            const subsetForSecond: Row[] = needSecondaryIndices.map(
                (i) => validRows[i]
            );

            let secondResults: OrderCodeResultItem[];

            if (secondaryProvider === "merchize") {
                secondResults = await callMerchizeOrderCodes(subsetForSecond);
                merchizeResults = merchizeResults ?? [];
            } else {
                secondResults = await callDreamshipOrderCodes(subsetForSecond);
                dreamshipResults = dreamshipResults ?? [];
            }

            secondResults.forEach((res, idx) => {
                const originalValidIndex = needSecondaryIndices[idx];
                secondaryResultMap.set(originalValidIndex, res);
            });
        }

        // 4. Gộp kết quả từ 2 provider & cập nhật rows
        setRows((prev) =>
            prev.map((row, rowIndex) => {
                const validIndex = rowIndexToValidIndex[rowIndex];

                if (validIndex === -1) {
                    // Dòng trống → giữ idle
                    return {
                        ...row,
                        status: "idle",
                        result: row.result ?? "",
                        statusCode: row.statusCode ?? "",
                    };
                }

                const res1 =
                    primaryProvider === "merchize"
                        ? merchizeResults?.[validIndex]
                        : dreamshipResults?.[validIndex];

                const res2 = secondaryResultMap.get(validIndex);

                // Ưu tiên kết quả thành công từ provider 1, nếu không thì dùng provider 2
                let chosen: OrderCodeResultItem | undefined = res1;
                if (!chosen || !chosen.success || !chosen.code) {
                    if (res2 && res2.success && res2.code) {
                        chosen = res2;
                    }
                }

                if (chosen && chosen.success && chosen.code) {
                    return {
                        ...row,
                        status: "done",
                        result: chosen.code,
                        statusCode: chosen.status ?? "",
                        error: undefined,
                    };
                }

                // Không thành công ở cả 2
                const errorMsg =
                    (res2 && res2.error) ||
                    (res1 && res1.error) ||
                    "Không tìm thấy order code";

                return {
                    ...row,
                    status: "error",
                    result: "",
                    statusCode: "",
                    error: errorMsg,
                };
            })
        );
    };

    const handleCopyAll = async () => {
        const text = rows.map((r) => r.result ?? "").join("\n");
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    const totalLines = rows.length;
    const nonEmptyLines = rows.filter((r) => r.raw.trim()).length;

    const priorityLabel =
        primaryProvider === "merchize"
            ? "Merchize trước, sau đó Dreamship"
            : "Dreamship trước, sau đó Merchize";

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="w-full mx-3 px-4 py-8 md:py-10">
                {/* Header */}
                <header className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        Lấy Order Code (Merchize + Dreamship)
                    </h1>
                    <p className="mt-2 text-sm md:text-base text-slate-400">
                        Dán cột{" "}
                        <span className="font-semibold">
                            external_number (Merchize) hoặc reference_id (Dreamship)
                        </span>{" "}
                        ở bên trái.
                    </p>

                </header>

                {/* Control bar */}
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                    {/* ===== DIV CON 1: THIẾT LẬP ƯU TIÊN VÀ THÔNG TIN DÒNG (w-1/2) ===== */}
                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                        {/* Nhóm A: Chọn ưu tiên */}
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-300">
                                <span>Ưu tiên gọi trước:</span>
                                <select
                                    value={primaryProvider}
                                    onChange={handlePrimaryProviderChange}
                                    className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="merchize">
                                        Merchize trước → Dreamship sau
                                    </option>
                                    <option value="dreamship">
                                        Dreamship trước → Merchize sau
                                    </option>
                                </select>
                            </label>

                            {/* Nhóm B: Thông tin dòng */}
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
                    </div>


                    {/* ===== DIV CON 2: CÁC NÚT HÀNH ĐỘNG (w-1/2) ===== */}
                    {/* Dùng md:w-1/2 để chiếm 50% chiều rộng */}
                    <div className="w-full md:w-1/2 flex gap-3 justify-between items-center">

                        {/* Nút Lấy Order Code (Nằm bên trái của div con này) */}
                        <button
                            type="button"
                            onClick={handleFetch}
                            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-emerald-400 active:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!rows.length || !nonEmptyLines}
                        >
                            Lấy Order Code
                        </button>

                        {/* Nút Chuyển qua lấy track (Đã sửa Link) */}
                        <Link
                            href="/track"
                            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm hover:bg-emerald-400 active:bg-emerald-500"
                        >
                            Chuyển qua lấy track
                        </Link>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid gap-4 md:grid-cols-4">
                    {/* Input side */}
                    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 md:p-4 shadow-sm md:col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-medium text-slate-200">
                                1. Dán External Number / Reference ID
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
                            placeholder={`VD:\nMYSHOP-0001 (Merchize external_number)\n114-2545030-4324234 (Dreamship reference_id)\n...`}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            * Hệ thống sẽ thử Merchize và Dreamship theo thứ tự ưu tiên đã
                            chọn. Kết quả vẫn giữ đúng số dòng để paste lại vào Google Sheet.
                        </p>
                    </section>

                    {/* Result side */}
                    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 md:p-4 shadow-sm overflow-auto md:col-span-3">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-medium text-slate-200">
                                2. Order Code theo từng dòng
                            </h2>
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                                Read only
                            </span>
                        </div>

                        <div className="border border-slate-800 rounded-lg overflow-hidden">
                            <table className="min-w-full border-collapse text-xs md:text-sm">
                                <thead className="bg-slate-900/80">
                                    <tr>
                                        <th className="border-b border-slate-800 px-2 py-1 w-[3rem] text-left">
                                            #
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[40%]">
                                            Input (external / reference)
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[35%]">
                                            Order Code / Order ID
                                            <button
                                                type="button"
                                                onClick={handleCopyAll}
                                                className="text-[10px] md:text-xs px-1 py-0.5 border border-slate-600 rounded hover:bg-slate-800"
                                                disabled={!rows.length}
                                            >
                                                Copy
                                            </button>
                                        </th>
                                        <th className="border-b border-slate-800 px-2 py-1 text-left w-[6rem]">
                                            Trạng thái
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-4 text-center text-slate-500"
                                            >
                                                Chưa có dữ liệu. Dán external_number / reference_id vào
                                                ô bên trái.
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
                                                <td className="border-t border-slate-900 px-2 py-1 text-slate-400">
                                                    {index + 1}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 font-mono text-[11px] md:text-xs break-all">
                                                    {row.raw || (
                                                        <span className="text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 text-[11px] md:text-xs">
                                                    {row.status === "idle" &&
                                                        !row.result &&
                                                        row.raw.trim()
                                                        ? "Chưa lấy"
                                                        : row.status === "loading"
                                                            ? "Đang lấy..."
                                                            : row.status === "error"
                                                                ? (row.error || "Lỗi")
                                                                : row.status === "done" ? row.result : ""}
                                                </td>
                                                <td className="border-t border-slate-900 px-2 py-1 text-[11px] md:text-xs">
                                                    {row.status === "idle" && row.raw.trim()
                                                        ? "Idle"
                                                        : row.status === "idle"
                                                            ? ""
                                                            : row.status === "loading"
                                                                ? "Đang chạy"
                                                                : row.status === "done"
                                                                    ? row.statusCode || "OK"
                                                                    : "Lỗi"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                            * Merchize: dùng external_number. Dreamship: dùng reference_id. Hệ
                            thống sẽ thử lần lượt theo thứ tự ưu tiên, dòng nào không tìm
                            được ở cả 2 bên sẽ báo lỗi.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
