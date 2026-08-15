import type { Shair } from "@/lib/queries";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function shairToCsv(rows: Shair[]): string {
  const head = ["serial", "text_urdu", "start_letter", "end_letter", "poet", "book", "page", "attack", "popularity", "source"];
  const body = rows.map(r => [
    r.serial ?? "",
    r.text_urdu.replace(/\r?\n/g, " / "),
    r.start_letter,
    r.end_letter,
    r.poet?.name_urdu ?? "",
    r.book?.title_urdu ?? "",
    r.page_number ?? "",
    r.is_attack ? "yes" : "no",
    r.popularity ?? 0,
    r.source ?? "",
  ].map(esc).join(","));
  return [head.join(","), ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  // BOM keeps Urdu readable when opened in Excel.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
