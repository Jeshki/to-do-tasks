// src/app/_components/TaskDetailModal.tsx
"use client";
import ExcelJS from "exceljs";

import {
  X,
  ImageIcon,
  MessageSquare,
  CheckCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Download,
  RefreshCcw,
} from "lucide-react";
import type { Task } from "./post";
import { UploadButton } from "../../utils/uploadthing";
import { api } from "~/uploadthing/react";
import NextImage from "next/image";
import { useEffect, useState } from "react";

const formatDateTimeLocal = (value: Date | string | null | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  const tzOffsetMinutes = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

// Pagalbinis komponentas: viso ekrano galerija
function PhotoGalleryModal({
  photos,
  selectedIndex,
  onClose,
  setSelectedIndex,
}: {
  photos: { id: string; url: string }[];
  selectedIndex: number;
  onClose: () => void;
  setSelectedIndex: (index: number) => void;
}) {
  const total = photos.length;
  const currentPhoto = photos[selectedIndex];

  const goToNext = () => setSelectedIndex((selectedIndex + 1) % total);
  const goToPrev = () => setSelectedIndex((selectedIndex - 1 + total) % total);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full rounded-lg overflow-hidden">
          <NextImage
            src={currentPhoto.url}
            alt="Task photo preview"
            fill
            sizes="100vw"
            style={{ objectFit: "contain" }}
            className="bg-black"
          />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 transition z-10"
          title="U┼Šdaryti"
        >
          <X className="h-6 w-6" />
        </button>

        <button
          onClick={goToPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-3 rounded-full hover:bg-white/50 transition"
          title="Ankstesn─Ś"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-3 rounded-full hover:bg-white/50 transition"
          title="Kita"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
          {selectedIndex + 1} / {total}
        </div>
      </div>
    </div>
  );
}

export function TaskDetailModal({
  task,
  onCloseAction,
}: {
  task: Task;
  onCloseAction: () => void;
}) {
  const utils = api.useUtils();
  const [currentTask, setCurrentTask] = useState(task);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTask.title);
  const [newDescription, setNewDescription] = useState(currentTask.description ?? "");
  const [newDate, setNewDate] = useState(formatDateTimeLocal(currentTask.createdAt));
  const [newComment, setNewComment] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Sync local state when a different task is opened.
  useEffect(() => {
    setCurrentTask(task);
    setNewTitle(task.title);
    setNewDescription(task.description ?? "");
    setNewDate(formatDateTimeLocal(task.createdAt));
    setSelectedPhotoIndex(null);
  }, [task]);

  const invalidate = () => utils.board.getBoard.invalidate();
  const { refetch: refetchBoard } = api.board.getBoard.useQuery(undefined, { enabled: false });

  const IMAGE_TARGET_WIDTH = 192; // ~2" at 96 DPI
  const IMAGE_TARGET_HEIGHT = 256; // ~2.67" at 96 DPI
  const IMAGE_QUALITY = 0.7; // lossy compression to shrink export

  const addPhotoToTask = api.board.addPhotoToTask.useMutation({ onSuccess: invalidate });
  const deletePhoto = api.board.deletePhotoFromTask.useMutation({ onSuccess: invalidate });
  const updateDetails = api.board.updateTaskDetails.useMutation({
    onSuccess: () => {
      invalidate();
      setIsEditing(false);
    },
  });
  const toggleCompletion = api.board.toggleTaskCompletion.useMutation({ onSuccess: invalidate });
  const addComment = api.board.addCommentToTask.useMutation({
    onSuccess: () => {
      invalidate();
      setNewComment("");
    },
  });

  const handleSave = () => {
    updateDetails.mutate({
      taskId: currentTask.id,
      title: newTitle,
      description: newDescription,
      createdAt: newDate ? new Date(newDate).toISOString() : undefined,
    });
  };

  const handleCancel = () => {
    setNewTitle(currentTask.title);
    setNewDescription(currentTask.description ?? "");
    setNewDate(formatDateTimeLocal(currentTask.createdAt));
    setIsEditing(false);
  };

  const handleCommentSubmit = () => {
    if (newComment.trim()) {
      addComment.mutate({ taskId: currentTask.id, text: newComment.trim() });
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm("Ar tikrai norite i┼Ītrinti ┼Īi─ģ nuotrauk─ģ?")) {
      deletePhoto.mutate({ photoId });
    }
  };

  const handleOpenGallery = (index: number) => setSelectedPhotoIndex(index);
  const handleCloseGallery = () => setSelectedPhotoIndex(null);

  const handleRefresh = async () => {
    setExportStatus("Atnaujinama...");
    await invalidate();
    const res = await refetchBoard();
    const updated = res.data
      ?.flatMap((c) => c.tasks)
      .find((t) => t.id === currentTask.id);
    if (updated) {
      // Normalizuojame, kad Photo.taskId būtų string, nes API gali grąžinti null
      const normalized = {
        ...updated,
        photos: updated.photos.map((p) => ({ ...p, taskId: p.taskId ?? currentTask.id })),
      } as Task;
      setCurrentTask(normalized);
      setNewTitle(normalized.title);
      setNewDescription(normalized.description ?? "");
      setNewDate(formatDateTimeLocal(normalized.createdAt));
      setExportStatus("Atnaujinta");
    } else {
      setExportStatus("Nepavyko atnaujinti");
    }
    setTimeout(() => setExportStatus(null), 2000);
  };

  const loadImageFromDataUrl = (dataUrl: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

  const compressImageDataUrl = async (dataUrl: string) => {
    try {
      const img = await loadImageFromDataUrl(dataUrl);
      const ratio = Math.min(IMAGE_TARGET_WIDTH / img.width, IMAGE_TARGET_HEIGHT / img.height, 1);
      const targetW = Math.max(1, Math.round(img.width * ratio));
      const targetH = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, targetW, targetH);
      return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
    } catch (error) {
      console.warn("Nepavyko dekompresuoti (suspausti) paveikslo, naudojame original┼│", error);
      return dataUrl;
    }
  };

  const mapContentTypeToExt = (contentType?: string): "png" | "jpeg" | "gif" => {
    if (!contentType) return "jpeg";
    if (contentType.includes("png")) return "png";
    if (contentType.includes("gif")) return "gif";
    // ExcelJS nepalaiko webp, konvertuojame ─» png
    return "jpeg";
  };

  const fetchImageBase64 = async (url: string) => {
    try {
      const res = await fetch("/api/image-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Proxy fetch failed");
      const data = (await res.json()) as { base64: string; contentType?: string };
      const rawDataUrl = `data:${data.contentType ?? "image/jpeg"};base64,${data.base64}`;
      const compressed = await compressImageDataUrl(rawDataUrl);
      return { base64: compressed, ext: "jpeg" as const };
    } catch (error) {
      console.error("Nepavyko gauti paveikslo per proxy", error);
      return { base64: null as string | null, ext: "jpeg" as const };
    }
  };

  const fetchImagesBatched = async (photos: Task["photos"], batchSize = 3) => {
    const results: { base64: string | null; ext: "jpeg" | "png" | "gif"; url: string }[] = [];
    let processed = 0;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      setExportStatus(`Atsisiun─Źiami paveikslai ${Math.min(i + batchSize, photos.length)}/${photos.length}`);
      const batchResults = await Promise.all(
        batch.map(async (photo) => {
          const viaProxy = await fetchImageBase64(photo.url);
          return { ...viaProxy, url: photo.url };
        }),
      );
      results.push(...batchResults);
      processed += batch.length;
      setExportStatus(`Atsisiun─Źiami paveikslai ${processed}/${photos.length}`);
    }
    return results;
  };

  // Eksportas: ─»terpia duomenis + nuotraukas ─» .xlsx (exceljs, klientas)
  const handleExportTaskToExcel = async () => {
    setIsExporting(true);
    setExportStatus("Ruosiamas eksportas...");
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Task board";
      const safeTitle = currentTask.title.slice(0, 40).replace(/[\\/\\?*:]/g, "_") || "uzduotis";

      // Lapai
      const infoSheet = workbook.addWorksheet("Informacija");
      infoSheet.addRows([
        ["Uzdutis", currentTask.title],
        ["Aprasymas", currentTask.description ?? ""],
        ["Busena", currentTask.completed ? "Atlikta" : "Nebaigta"],
        ["Nuotrauku skaicius", currentTask.photos.length],
        ["Komentaru skaicius", currentTask.comments.length],
      ]);

      // Nuotraukos su suspaudimu (per proxy + canvas) ir papildoma info
      const photosSheet = workbook.addWorksheet("Nuotraukos");
      photosSheet.columns = [
        { header: "Nr.", key: "idx", width: 6 },
        { header: "Defekto pavadinimas", key: "defect", width: 45 },
        { header: "Fotofiksacija (hyperlink)", key: "link", width: 55 },
        { header: 'Nuotrauka 2"x2.67"', key: "frame", width: 40 },
        { header: "Pastaba", key: "note", width: 55 },
      ];

      const photosWithData = await fetchImagesBatched(currentTask.photos);
      const failedPhotos = photosWithData.filter((p) => !p.base64).length;

      photosWithData.forEach((photo, idx) => {
        const row = photosSheet.addRow({
          idx: idx + 1,
          defect: currentTask.title,
          link: `Foto ${idx + 1}`,
          frame: "",
          note: "Pastabos irasomos ranka Excelyje",
        });
        const linkCell = row.getCell("link");
        linkCell.value = { text: `Foto ${idx + 1}`, hyperlink: photo.url };
        linkCell.font = { color: { argb: "FF1D4ED8" }, underline: true };
        photosSheet.getRow(row.number).height = 200;

        if (photo.base64) {
          const imageId = workbook.addImage({ base64: photo.base64, extension: photo.ext });
          photosSheet.addImage(imageId, {
            // place image into the photo column (0-based col index = 3)
            tl: { col: 3, row: row.number - 1 },
            // target ~2"x2.67" (96 DPI => ~192x256 px)
            ext: { width: 192, height: 256 },
          });
        }
      });

      photosSheet.addRow({
        idx: "",
        defect: "",
        link: 'Nuotrauka ifitinta i remeli standartiniu dydziu 2"x2.67"',
        frame: "",
        note: "Pastabos irasomos ranka Excelyje",
      });
      photosSheet.addRow({
        idx: "",
        defect: "",
        link: "Foto automatiskai suspaustos eksportuojant (~70% kokybe, apie 192x256 px).",
        frame: "",
        note: "",
      });
      photosSheet.getRow(1).font = { bold: true };
      photosSheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", wrapText: true };
        });
      });

      // Komentarai tiesiogiai po nuotraukomis tame pa─Źiame lape
      const commentsStart = (photosSheet.lastRow?.number ?? 1) + 2;
      const commentsHeader = photosSheet.getCell(`A${commentsStart}`);
      commentsHeader.value = "Komentarai";
      commentsHeader.font = { bold: true };
      photosSheet.mergeCells(`A${commentsStart}:E${commentsStart}`);
      currentTask.comments.forEach((comment, idx) => {
        photosSheet.addRow({
          idx: idx + 1,
          defect: "",
          link: "",
          frame: new Date(comment.createdAt).toLocaleString("lt-LT"),
          note: comment.text,
        });
      });

      // Komentarai
      const commentsSheet = workbook.addWorksheet("Komentarai");
      commentsSheet.columns = [
        { header: "#", key: "idx", width: 6 },
        { header: "Komentaras", key: "text", width: 80 },
        { header: "Data", key: "date", width: 26 },
      ];
      currentTask.comments.forEach((comment, idx) => {
        commentsSheet.addRow({
          idx: idx + 1,
          text: comment.text,
          date: new Date(comment.createdAt).toLocaleString("lt-LT"),
        });
      });

      // Generuojame ir siunciame faila
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle}-eksportas.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      if (failedPhotos > 0) {
        setExportStatus(`Pabaigta su perspejimu: ${failedPhotos} paveikslai neiterpti (CORS/fetch).`);
      } else {
        setExportStatus("Eksportas baigtas.");
      }
    } catch (error) {
      alert("Nepavyko sugeneruoti Excel su nuotraukomis. Patikrinkite console.");
      console.error(error);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(null), 4000);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={onCloseAction}
      >
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-4">
            {isEditing ? (
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-2xl font-bold border-b focus:outline-none w-full mr-4"
                autoFocus
              />
            ) : (
              <h2 className={`text-2xl font-bold ${currentTask.completed ? "line-through text-muted-foreground" : ""}`}>
                {currentTask.title}
              </h2>
            )}

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="text-green-600 hover:text-green-700 p-1 rounded transition"
                    title="Išsaugoti"
                  >
                    <Save className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="text-red-500 hover:text-red-700 p-1 rounded transition"
                    title="Atšaukti"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleExportTaskToExcel}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eksportuoti ─» Excel"
                    disabled={isExporting}
                  >
                    <Download className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded transition"
                    title="Redaguoti"
                  >
                    <Pencil className="h-6 w-6" />
                  </button>
                </div>
              )}

              <button
                onClick={handleRefresh}
                className="text-blue-500 hover:text-blue-700 p-1 rounded transition"
                title="Atnaujinti modalą"
                disabled={isExporting}
              >
                <RefreshCcw className="h-6 w-6" />
              </button>
              <button
                onClick={onCloseAction}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {exportStatus && (
            <div className="mb-4 text-sm text-muted-foreground">
              {exportStatus}
            </div>
          )}

          <div className="mb-4 flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Busena:</span>
              <select
                value={currentTask.completed ? "done" : "open"}
                onChange={(e) => toggleCompletion.mutate({ taskId: currentTask.id, completed: e.target.value === "done" })}
                disabled={toggleCompletion.isPending}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="open">Nebaigta</option>
                <option value="done">U┼Šbaigta</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap">Data:</span>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                disabled={!isEditing}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Apra┼Īymas</h3>
            {isEditing ? (
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Parašykite komentarą..."
                className="w-full p-2 border rounded-lg min-h-24"
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {currentTask.description || "Apra┼Īymas neprid─Śtas."}
              </p>
            )}
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5" />
              Nuotraukos ({currentTask.photos.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentTask.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative h-64 rounded-md overflow-hidden group cursor-pointer"
                  onClick={() => handleOpenGallery(index)}
                >
                  <NextImage
                    src={photo.url}
                    alt="Task photo"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    style={{ objectFit: "cover" }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="I┼Ītrinti nuotrauk─ģ"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <UploadButton
                endpoint="imageUploader"
                content={{
                  button({ ready }) {
                    return ready ? "Pasirinkti nuotraukas" : "Ruošiamasi...";
                  },
                  allowedContent() {
                    return "Leidžiama: iki 1GB vienam failui, iki 900 nuotraukų, jpg/png/gif";
                  },
                }}
                appearance={{
                  button:
                    "bg-blue-500 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-600 transition h-10 ut-uploading:bg-gray-400 ut-uploading:hover:bg-gray-400",
                  container: "w-full flex justify-start items-center",
                  allowedContent: "text-xs text-muted-foreground ml-3",
                }}
                onClientUploadComplete={(res) => {
                  res?.forEach((file) => {
                    addPhotoToTask.mutate({
                      taskId: currentTask.id,
                      url: file.url,
                    });
                  });
                }}
                onUploadError={(error: Error) => {
                  alert(`KLAIDA! ${error.message}`);
                }}
              />
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <MessageSquare className="h-5 w-5" />
              Komentarai ({currentTask.comments.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {currentTask.comments.map((comment) => (
                <div key={comment.id} className="bg-gray-100 p-3 rounded-lg text-sm">
                  <p>{comment.text}</p>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {new Date(comment.createdAt).toLocaleDateString("lt-LT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
                placeholder="Parašykite komentarą..."
                className="flex-grow p-2 border rounded-lg"
                disabled={addComment.isPending}
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || addComment.isPending}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
              >
                Si┼│sti
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedPhotoIndex !== null && currentTask.photos.length > 0 && (
        <PhotoGalleryModal
          photos={currentTask.photos}
          selectedIndex={selectedPhotoIndex}
          onClose={handleCloseGallery}
          setSelectedIndex={setSelectedPhotoIndex}
        />
      )}
    </>
  );
}




