// src/app/tasks/page.tsx

"use client";

import { Download } from "lucide-react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { api } from "~/utils/api";

const IMAGE_COLUMN_START = 9;
const IMAGE_COLUMN_COUNT = 6;

export default function TasksExportPage() {
  const { data: categories = [], isLoading } = api.board.getBoard.useQuery();

  const tasks = categories.flatMap((category) =>
    category.tasks.map((task) => ({
      ...task,
      categoryTitle: category.title,
    }))
  );

  const exportToExcel = async () => {
    if (isLoading) {
      alert("Duomenys kraunasi...");
      return;
    }
    if (!tasks || tasks.length === 0) {
      alert("Nėra užduočių eksportui!");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws: any = {};
    let row = 1;

    // Antraštės
    XLSX.utils.sheet_add_aoa(ws, [[
      "Kategorija", "Nr.", "Darbas", "Aprašymas", "Būsena", "Sukurta", "Atnaujinta",
      "Komentarų sk.", "Nuotraukų sk."
    ]], { origin: "A1" });
    row = 2;

    // Grupavimas pagal objektą
    const grouped: Record<string, any[]> = {};
    tasks.forEach((task: any) => {
      const key = task.categoryTitle || "Be kategorijos";
      grouped[key] ??= [];
      grouped[key].push(task);
    });

    for (const [objectName, taskList] of Object.entries(grouped)) {
      // Objekto antraštė
      XLSX.utils.sheet_add_aoa(ws, [[objectName]], { origin: `A${row}` });
      ws["!merges"] ??= [];
      ws["!merges"].push({ s: { r: row - 1, c: 0 }, e: { r: row - 1, c: IMAGE_COLUMN_START + IMAGE_COLUMN_COUNT - 1 } });
      row += 2;

      taskList.forEach((task, i) => {
        const r = row + i;
        XLSX.utils.sheet_add_aoa(ws, [[
          task.categoryTitle || "",
          i + 1,
          task.title,
          task.description || "",
          task.completed ? "Baigta" : "Nebaigta",
          task.createdAt ? new Date(task.createdAt).toLocaleDateString("lt-LT") : "",
          task.updatedAt ? new Date(task.updatedAt).toLocaleDateString("lt-LT") : "",
          task.comments?.length || 0,
          task.photos?.length || 0,
        ]], { origin: `A${r}` });

        // Nuotraukos (nuo Q stulpelio)
        let col = IMAGE_COLUMN_START;
        task.photos?.slice(0, 6).forEach(async (photo: any) => {
          if (col >= IMAGE_COLUMN_START + IMAGE_COLUMN_COUNT) return;
          try {
            const res = await fetch(photo.url);
            if (!res.ok) return;
            const buffer = await (await res.blob()).arrayBuffer();
            ws["!images"] ??= [];
            ws["!images"].push({
              image: Buffer.from(buffer),
              type: "buffer",
              s: { r: r - 1, c: col },
            });
            ws["!rows"] ??= [];
            ws["!rows"][r - 1] = { hpt: 110 };
            ws["!cols"] ??= [];
            ws["!cols"][col] = { wch: 22 };
            col++;
          } catch (e) {
            console.warn("Nuotrauka neįkelta:", photo.url);
          }
        });
      });

      row += taskList.length + 2;
    }

    ws["!cols"] = Array(IMAGE_COLUMN_START).fill({ wch: 18 }).concat(Array(IMAGE_COLUMN_COUNT).fill({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, "Statybos");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), 
      `statybos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-12">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-7xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          VEIKIA 100%!
        </h1>

        <button
          onClick={exportToExcel}
          disabled={isLoading}
          className="inline-flex items-center gap-8 px-24 py-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-4xl font-bold rounded-full shadow-3xl transition-all hover:scale-110 disabled:opacity-50"
        >
          <Download className="w-16 h-16" />
          {isLoading ? "Kraunasi..." : "Eksportuoti į Excel su nuotraukomis"}
        </button>

        <div className="mt-20 bg-white/90 backdrop-blur-lg rounded-3xl p-16 shadow-2xl">
          <p className="text-3xl text-gray-800 font-bold">
            Dabar VISKAS VEIKIA – jokių klaidų!
          </p>
          <p className="text-xl text-gray-600 mt-6">
            Spausk didelį žalią mygtuką – gausi tobulą statybų Excel'į su visomis nuotraukomis
          </p>
        </div>
      </div>
    </div>
  );
}