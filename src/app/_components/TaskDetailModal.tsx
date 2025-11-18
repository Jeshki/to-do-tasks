"use client";

import { X, ImageIcon } from "lucide-react";
import type { Task } from "./post";
import { UploadButton } from "~/utils/uploadthing";
import { api } from "~/styles/uploadthing/react";
import Image from "next/image";

export function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void; }) {
  const utils = api.useUtils();

  const addPhotoToTask = api.board.addPhotoToTask.useMutation({
    onSuccess: () => {
      utils.board.getBoard.invalidate();
    },
    onError: (error) => {
      alert(`Error adding photo: ${error.message}`);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold">{task.title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-muted-foreground">{task.description ?? "No description."}</p>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos ({task.photos.length})
          </h3>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {task.photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-md overflow-hidden">
                <Image src={photo.url} alt="Task photo" fill style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
            <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                    if (res?.[0]) {
                        addPhotoToTask.mutate({
                            taskId: task.id,
                            url: res[0].url,
                        });
                    }
                }}
                onUploadError={(error: Error) => {
                    alert(`ERROR! ${error.message}`);
                }}
            />
        </div>
      </div>
    </div>
  );
}
