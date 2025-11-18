"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Task } from "./post";
import { api } from "~/styles/uploadthing/react";

export function TaskItem({ task, onSelectTask }: { task: Task; onSelectTask: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const utils = api.useUtils();
  const deleteTask = api.board.deleteTask.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelectTask(task)}
      className="bg-white p-4 rounded-lg shadow cursor-pointer relative group hover:shadow-md transition"
    >
      <h3 className="font-medium">{task.title}</h3>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Ištrinti?")) deleteTask.mutate({ id: task.id });
        }}
        className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>

      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 cursor-grab opacity-30 group-hover:opacity-70"
      >
        <GripVertical className="w-5 h-5" />
      </div>
    </div>
  );
}