"use client";
 import * as XLSX from 'xlsx';

import { X, ImageIcon, MessageSquare, CheckCircle, Save, ChevronLeft, ChevronRight, Pencil, Download } from "lucide-react";
import type { Task } from "./post";
import { UploadButton } from "../../utils/uploadthing";
import { api } from "~/uploadthing/react";
import Image from "next/image";
import { useState } from "react";

// PAGALBINIS KOMPONENTAS: Galerija visam ekranui
function PhotoGalleryModal({ photos, selectedIndex, onClose, setSelectedIndex }: {
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
                {/* Nuotraukos atvaizdavimas */}
                <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <Image 
                        src={currentPhoto.url} 
                        alt="Task photo preview" 
                        fill 
                        style={{ objectFit: 'contain' }} 
                        className="bg-black"
                    />
                </div>

                {/* Uždarymo mygtukas */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 transition z-10"
                    title="Uždaryti"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Navigacijos mygtukai */}
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

                {/* Indikatorius */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                    {selectedIndex + 1} / {total}
                </div>
            </div>
        </div>
    );
}


export function TaskDetailModal({ task, onCloseAction }: { task: Task; onCloseAction: () => void; }) {
  const utils = api.useUtils();

  // Būsena galerijos valdymui
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Redagavimo būsena
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(task.title);
  const [newDescription, setNewDescription] = useState(task.description ?? "");
  const [newComment, setNewComment] = useState("");

  const invalidate = () => utils.board.getBoard.invalidate();

  // Mutacijos
  const addPhotoToTask = api.board.addPhotoToTask.useMutation({ onSuccess: invalidate });
  const deletePhoto = api.board.deletePhotoFromTask.useMutation({ onSuccess: invalidate });
  const updateDetails = api.board.updateTaskDetails.useMutation({ onSuccess: () => { invalidate(); setIsEditing(false); } });
  const toggleCompletion = api.board.toggleTaskCompletion.useMutation({ onSuccess: invalidate });
  const addComment = api.board.addCommentToTask.useMutation({ onSuccess: () => { invalidate(); setNewComment(""); } });

  const handleSave = () => {
    updateDetails.mutate({
      taskId: task.id,
      title: newTitle,
      description: newDescription,
    });
  };

  // Atšaukti redagavimą
  const handleCancel = () => {
      // Atstatome formos laukus į originalias reikšmes
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

  const handleOpenGallery = (index: number) => {
      setSelectedPhotoIndex(index);
  }

  const handleCloseGallery = () => {
      setSelectedPhotoIndex(null);
  }

  const handleExportToExcel = (data: unknown[], fileName: string) => {
    // TODO: Implement actual Excel export functionality
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, fileName);
  };

  return (
    <>
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onCloseAction}>
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 p-6" 
                onClick={(e) => e.stopPropagation()}
            >
                
                <div className="flex justify-between items-start mb-4">
                    {/* Užduoties Pavadinimas */}
                    {isEditing ? (
                        <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="text-2xl font-bold border-b focus:outline-none w-full mr-4"
                        autoFocus
                        />
                    ) : (
                        <h2 className={`text-2xl font-bold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                        </h2>
                    )}

                    <div className="flex gap-2">
                        {isEditing ? (
                        <>
                            {/* Išsaugoti mygtukas */}
                            <button onClick={handleSave} className="text-green-600 hover:text-green-700 p-1 rounded transition" title="Išsaugoti">
                                <Save className="h-6 w-6" />
                            </button>
                            {/* Atšaukti mygtukas */}
                            <button onClick={handleCancel} className="text-red-500 hover:text-red-700 p-1 rounded transition" title="Atšaukti">
                                <X className="h-6 w-6" /> 
                            </button>
                        </>
                        ) : (
                        /* Redaguoti mygtukas (kai NE-redaguojama) */
                        <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground p-1 rounded transition" title="Redaguoti">
                            <Pencil className="h-6 w-6" /> 
                        </button>
                        )}
                        
                        {/* Uždarymo mygtukas (visada rodomas) */}
                        <button onClick={onCloseAction} className="text-muted-foreground hover:text-foreground p-1 rounded">
                        <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                
                {/* Atlikimo būsena */}
                <div className="mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => toggleCompletion.mutate({ taskId: task.id, completed: e.target.checked })}
                      disabled={toggleCompletion.isPending}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <span className={`text-sm font-medium ${task.completed ? 'text-green-600' : 'text-gray-500'}`}>
                    {task.completed ? "Atlikta" : "Nebaigta"}
                    </span>
                </label>
                </div>


                {/* Aprašymas */}
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


                {/* Nuotraukos */}
                <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <ImageIcon className="h-5 w-5" />
                    Nuotraukos ({task.photos.length})
                </h3>
                <button onClick={() => handleExportToExcel(task.photos, `task-${task.id}-photos.xlsx`)} className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 flex items-center gap-1"><Download className="h-4 w-4" /> Eksportuoti  Excel</button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {task.photos.map((photo, index) => (
                    <div 
                        key={photo.id} 
                        className="relative h-64 rounded-md overflow-hidden group cursor-pointer"
                        onClick={() => handleOpenGallery(index)} // Atidaro galeriją
                    >
                        <Image src={photo.url} alt="Task photo" fill style={{ objectFit: 'cover' }} />
                        
                        {/* Nuotraukos trynimo mygtukas */}
                        <button
                        onClick={(e) => {
                            e.stopPropagation(); // Sustabdo galerijos atidarymą
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
                            button: "bg-blue-500 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-600 transition h-10 ut-uploading:bg-gray-400 ut-uploading:hover:bg-gray-400",
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


                {/* Komentarai */}
                <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5" />
                    Komentarai ({task.comments.length})
                </h3>
                <button onClick={() => handleExportToExcel(task.comments, `task-${task.id}-comments.xlsx`)} className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 flex items-center gap-1"><Download className="h-4 w-4" /> Eksportuoti  Excel</button>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {task.comments.map(comment => (
                    <div key={comment.id} className="bg-gray-100 p-3 rounded-lg text-sm">
                        <p>{comment.text}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                        {new Date(comment.createdAt).toLocaleDateString('lt-LT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    ))}
                </div>

                {/* Pridėti komentarą forma */}
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

        {/* Galerijos atvaizdavimas (jei pasirinkta nuotrauka) */}
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