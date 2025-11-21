// src/app/tasks/ExportToExcelButton.tsx

"use client";

import { Download } from "lucide-react";
import { api } from "~/utils/api"; // T3 App naudoja ~/ o ne @/
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// Paprastas mygtukas be shadcn Button – naudosim paprastą <button>
export function ExportToExcelButton() {
  const { data: tasks = [], isLoading } = api.task.getAll.useQuery();

  const exportToExcel = async () => {
    if (!tasks || tasks.length === 0) {
      alert("Nėra užduočių eksportavimui!");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws: any = {};

    const headers = [
      "ID",
      "Pavadinimas",
      "Aprašymas",
      "Kategorija",
      "Prioritetas",
      "Statusas",
      "Sukurta",
      "Terminas",
      "Baigta",
    ];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

    tasks.forEach((task: any, i: number) => {
      const rowNum = i + 2;

      const row = [
        task.id ?? "",
        task.title ?? "",
        task.description ?? "",
        task.category ?? "",
        task.priority ?? "",
        task.completed ? "Baigta" : "Nebaigta",
        task.createdAt ? new Date(task.createdAt).toLocaleDateString("lt-LT") : "",
        task.dueDate ? new Date(task.dueDate).toLocaleDateString("lt-LT") : "",
        task.completedAt ? new Date(task.completedAt).toLocaleString("lt-LT") : "",
      ];

      XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${rowNum}` });

      // Nuotraukos (jei yra attachments)
      if (task.attachments?.length > 0) {
        let col = 9;
        task.attachments.forEach(async (file: any) => {
          if (file.type?.startsWith("image/")) {
            try {
              const res = await fetch(file.url);
              const blob = await res.blob();
              const buffer = await blob.arrayBuffer();

              if (!ws["!images"]) ws["!images"] = [];
              ws["!images"].push({
                image: Buffer.from(buffer),
                type: "buffer",
                s: { r: rowNum - 1, c: col },
              });

              ws["!rows"] = ws["!rows"] || [];
              ws["!rows"][rowNum - 1] = { hpt: 90 };
              ws["!cols"] = ws["!cols"] || [];
              ws["!cols"][col] = { wch: 18 };
              col++;
            } catch (e) {
              console.warn("Nuotrauka neįkelta:", file.url);
            }
          }
        });
      }
    });

    ws["!cols"] = [
      { wch: 6 }, { wch: 35 }, { wch: 50 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Užduotys");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `uzduotys_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <button
      onClick={exportToExcel}
      disabled={isLoading || tasks.length === 0}
      className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-5 h-5" />
      Eksportuoti į Excel
    </button>
  );
}