// app/page.tsx
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 md:px-8 lg:px-10">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-start md:justify-between">
          {/* Left: intro text */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              POD / Fulfillment Tools
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Xin chào, đây là bộ công cụ hỗ trợ lấy{" "}
              <span className="text-emerald-400">tracking</span> và{" "}
              <span className="text-emerald-400">order code</span> cho Print-on-Demand.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400 md:text-base">
              Mình build nhanh vài trang nội bộ để hỗ trợ xử lý đơn từ{" "}
              <span className="font-semibold text-slate-200">
                Merchize, Dreamship, Printway
              </span>
              . Bạn chỉ cần dán dữ liệu từ Google Sheet, hệ thống sẽ trả lại kết quả
              đúng thứ tự để copy ngược lại vào Sheet.
            </p>
          </div>

          {/* Right: avatar */}
          <div className="self-end md:self-start">
            <div className="h-24 w-24 overflow-hidden rounded-xl border-2 border-emerald-500 bg-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.25)] md:h-40 md:w-40">
              <Image
                src="/qr.png"
                alt="Ảnh của tôi"
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* Main content */}
        <section className="grid gap-6 md:grid-cols-3 md:items-start">
          {/* Info / About */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:col-span-1 md:p-5">
            <h2 className="text-sm font-semibold text-slate-100">Về công cụ này</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400 md:text-sm">
              Mình là một seller POD, nên mình làm sẵn vài tiện ích để:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300 md:text-sm">
              <li>• Lấy tracking theo cột mã đơn từ Google Sheet.</li>
              <li>• Tự detect nền tảng: Merchize / Printway / Dreamship.</li>
              <li>• Lấy order code / order id từ external number &amp; reference id.</li>
              <li>• Upload ảnh &amp; quản lý ảnh tải về (AMZ).</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Mục tiêu là: <span className="italic">dán một cột → nhận lại một cột</span>,
              không phải xử lý thủ công từng đơn nữa.
            </p>
          </div>

          {/* Tool: Lấy Track */}
          <Link
            href="/track"
            className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm transition hover:border-emerald-500/70 hover:bg-slate-900 md:col-span-1 md:p-5"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
              Lấy Track
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-50 md:text-lg">
              Lấy Tracking cho đơn hàng
            </h2>
            <p className="mt-2 text-xs text-slate-400 md:text-sm">
              Dán cột mã đơn / order id từ Google Sheet. Hệ thống sẽ tự nhận diện
              Merchize, Printway, Dreamship và trả về:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300 md:text-sm">
              <li>• Mã tracking.</li>
              <li>• Hãng vận chuyển.</li>
              <li>• Thời gian, địa chỉ, trạng thái đơn (Merchize).</li>
            </ul>
            <div className="mt-4 inline-flex items-center text-xs font-medium text-emerald-400 md:text-sm">
              Vào trang Lấy Track
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>

          {/* Tool: Lấy Order Code */}
          <Link
            href="/orderCode"
            className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm transition hover:border-emerald-500/70 hover:bg-slate-900 md:col-span-1 md:p-5"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-sky-300">
              Lấy Order
              <span className="h-1 w-1 rounded-full bg-sky-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-50 md:text-lg">
              Lấy Order Code / Order ID
            </h2>
            <p className="mt-2 text-xs text-slate-400 md:text-sm">
              Dán cột mã nguồn từ hệ thống của bạn:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300 md:text-sm">
              <li>• Merchize: external_number → order code.</li>
              <li>• Dreamship: reference_id → order id.</li>
              <li>• Có chế độ ưu tiên: thử Merchize trước hoặc Dreamship trước.</li>
            </ul>
            <div className="mt-4 inline-flex items-center text-xs font-medium text-sky-300 md:text-sm">
              Vào trang Lấy Order
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>

          {/* Tool: Up ảnh */}
          <Link
            href="https://truongdat.id.vn/upanh/"
            className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm transition hover:border-emerald-500/70 hover:bg-slate-900 md:col-span-1 md:p-5"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-fuchsia-300">
              Up ảnh
              <span className="h-1 w-1 rounded-full bg-fuchsia-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-50 md:text-lg">
              Upload ảnh &amp; nhận link
            </h2>
            <p className="mt-2 text-xs text-slate-400 md:text-sm">
              Kéo thả nhiều ảnh, upload nhanh, giữ nguyên chất lượng và trả link theo cấu trúc ngày/tháng/năm.
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300 md:text-sm">
              <li>• Drag &amp; drop toàn trang.</li>
              <li>• Copy tất cả link sau khi upload.</li>
              <li>• Giới hạn tổng upload lớn.</li>
            </ul>
            <div className="mt-4 inline-flex items-center text-xs font-medium text-fuchsia-300 md:text-sm">
              Vào trang Up ảnh
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>

          {/* Tool: Lấy ảnh AMZ */}
          <Link
            href="https://truongdat.id.vn/getimgamz"
            className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm transition hover:border-emerald-500/70 hover:bg-slate-900 md:col-span-1 md:p-5"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-300">
              GetImgAMZ
              <span className="h-1 w-1 rounded-full bg-amber-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-50 md:text-lg">
              Lấy ảnh AMZ &amp; gom folder
            </h2>
            <p className="mt-2 text-xs text-slate-400 md:text-sm">
              Xem ảnh đã tải về theo ngày, gom ảnh vào collection và tải xuống dưới dạng ZIP.
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300 md:text-sm">
              <li>• Tìm kiếm ảnh all-days.</li>
              <li>• Mở collection để xem ảnh bên trong.</li>
              <li>• Tải ZIP theo folder.</li>
            </ul>
            <div className="mt-4 inline-flex items-center text-xs font-medium text-amber-300 md:text-sm">
              Vào trang Lấy ảnh AMZ
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 pt-4 text-[11px] text-slate-500 md:mt-12 md:text-xs">
          <p>
            Công cụ nội bộ hỗ trợ xử lý đơn POD · Built with Next.js &amp; Tailwind CSS.
          </p>
        </footer>
      </main>
    </div>
  );
}
