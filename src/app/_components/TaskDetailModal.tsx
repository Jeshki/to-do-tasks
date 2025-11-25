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
} from "lucide-react";
import type { Task } from "./post";
import { UploadButton } from "../../utils/uploadthing";
import { api } from "~/uploadthing/react";
import Image from "next/image";
import { useState } from "react";

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
          <Image
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
          title="Uždaryti"
        >
          <X className="h-6 w-6" />
        </button>

        <button
          onClick={goToPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 text-white p-3 rounded-full hover:bg-white/50 transition"
          title="Ankstesnė"
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

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(task.title);
  const [newDescription, setNewDescription] = useState(task.description ?? "");
  const [newComment, setNewComment] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const invalidate = () => utils.board.getBoard.invalidate();

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
      taskId: task.id,
      title: newTitle,
      description: newDescription,
    });
  };

  const handleCancel = () => {
    setNewTitle(task.title);
    setNewDescription(task.description ?? "");
    setIsEditing(false);
  };

  const handleCommentSubmit = () => {
    if (newComment.trim()) {
      addComment.mutate({ taskId: task.id, text: newComment.trim() });
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (confirm("Ar tikrai norite ištrinti šią nuotrauką?")) {
      deletePhoto.mutate({ photoId });
    }
  };

  const handleOpenGallery = (index: number) => setSelectedPhotoIndex(index);
  const handleCloseGallery = () => setSelectedPhotoIndex(null);

  const mapContentTypeToExt = (contentType?: string): "png" | "jpeg" | "gif" => {
    if (!contentType) return "jpeg";
    if (contentType.includes("png")) return "png";
    if (contentType.includes("gif")) return "gif";
    // ExcelJS nepalaiko webp, konvertuojame į png
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
      return {
        base64: `data:${data.contentType ?? "image/jpeg"};base64,${data.base64}`,
        ext: mapContentTypeToExt(data.contentType),
      };
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
      setExportStatus(`Atsisiunčiami paveikslai ${Math.min(i + batchSize, photos.length)}/${photos.length}`);
      const batchResults = await Promise.all(
        batch.map(async (photo) => {
          const viaProxy = await fetchImageBase64(photo.url);
          return { ...viaProxy, url: photo.url };
        }),
      );
      results.push(...batchResults);
      processed += batch.length;
      setExportStatus(`Atsisiunčiami paveikslai ${processed}/${photos.length}`);
    }
    return results;
  };

  // Eksportas: įterpia duomenis + nuotraukas į .xlsx (exceljs, klientas)
  const handleExportTaskToExcel = async () => {
    setIsExporting(true);
    setExportStatus("Ruošiame eksportą...");
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Task board";
      const safeTitle = task.title.slice(0, 40).replace(/[/\\?*:]/g, "_") || "uzduotis";

      // Lapai
      const infoSheet = workbook.addWorksheet("Informacija");
      infoSheet.addRows([
        ["Užduotis", task.title],
        ["Aprašymas", task.description ?? ""],
        ["Būsena", task.completed ? "Atlikta" : "Nebaigta"],
        ["Nuotraukų skaičius", task.photos.length],
        ["Komentarų skaičius", task.comments.length],
      ]);

      // Nuotraukos su įterpimu (per proxy, kad apeiti CORS)
      const photosSheet = workbook.addWorksheet("Nuotraukos");
      photosSheet.columns = [
        { header: "#", key: "idx", width: 6 },
        { header: "Nuotraukos URL", key: "url", width: 80 },
      ];

      const photosWithData = await fetchImagesBatched(task.photos);
      const failedPhotos = photosWithData.filter((p) => !p.base64).length;

      photosWithData.forEach((photo, idx) => {
        const row = photosSheet.addRow({ idx: idx + 1, url: photo.url });
        row.getCell("url").value = { text: photo.url, hyperlink: photo.url };
        photosSheet.getRow(row.number).height = 120;

        if (photo.base64) {
          const imageId = workbook.addImage({ base64: photo.base64, extension: photo.ext });
          photosSheet.addImage(imageId, {
            tl: { col: 2, row: row.number - 1 },
            ext: { width: 320, height: 240 },
          });
        }
      });

      // Komentarai
      const commentsSheet = workbook.addWorksheet("Komentarai");
      commentsSheet.columns = [
        { header: "#", key: "idx", width: 6 },
        { header: "Komentaras", key: "text", width: 80 },
        { header: "Data", key: "date", width: 26 },
      ];
      task.comments.forEach((comment, idx) => {
        commentsSheet.addRow({
          idx: idx + 1,
          text: comment.text,
          date: new Date(comment.createdAt).toLocaleString("lt-LT"),
        });
      });

      // Generuojame ir siunčiame failą
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
        setExportStatus(`Pabaigta su perspėjimu: ${failedPhotos} paveikslai neįterpti (CORS/fetch).`);
      } else {
        setExportStatus("Eksportas baigtas.");
      }
    } catch (error) {
      alert("Nepavyko sugeneruoti Excel su nuotraukomis. Patikrinkite konsolę.");
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
              <h2 className={`text-2xl font-bold ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
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
                    title="Eksportuoti į Excel"
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

          <div className="mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => toggleCompletion.mutate({ taskId: task.id, completed: e.target.checked })}
                disabled={toggleCompletion.isPending}
                className="h-5 w-5 text-blue-600 rounded"
              />
              <span className={`text-sm font-medium ${task.completed ? "text-green-600" : "text-gray-500"}`}>
                {task.completed ? "Atlikta" : "Nebaigta"}
              </span>
            </label>
          </div>

          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Aprašymas</h3>
            {isEditing ? (
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Pridėti išsamų aprašymą..."
                className="w-full p-2 border rounded-lg min-h-24"
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {task.description || "Aprašymas nepridėtas."}
              </p>
            )}
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5" />
              Nuotraukos ({task.photos.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {task.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative h-64 rounded-md overflow-hidden group cursor-pointer"
                  onClick={() => handleOpenGallery(index)}
                >
                  <Image
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
                    title="Ištrinti nuotrauką"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <UploadButton
                endpoint="imageUploader"
                appearance={{
                  button:
                    "bg-blue-500 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-600 transition h-10 ut-uploading:bg-gray-400 ut-uploading:hover:bg-gray-400",
                  container: "w-full flex justify-start items-center",
                  allowedContent: "text-xs text-muted-foreground ml-3",
                }}
                onClientUploadComplete={(res) => {
                  res?.forEach((file) => {
                    addPhotoToTask.mutate({
                      taskId: task.id,
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
              Komentarai ({task.comments.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {task.comments.map((comment) => (
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
                Siųsti
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedPhotoIndex !== null && task.photos.length > 0 && (
        <PhotoGalleryModal
          photos={task.photos}
          selectedIndex={selectedPhotoIndex}
          onClose={handleCloseGallery}
          setSelectedIndex={setSelectedPhotoIndex}
        />
      )}
    </>
  );
}
