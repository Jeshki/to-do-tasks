"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { api } from "~/uploadthing/react";
import { type Category, type Task } from "./post";
import { TaskItem } from "./TaskItem";

export function CategoryColumn({
  category,
  onTaskSelectAction,
}: {
  category: Category;
  onTaskSelectAction: (task: Task) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: category.id,
  });
  const utils = api.useUtils();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");

  const createTask = api.board.createTask.useMutation({
    onMutate: async (input) => {
      await utils.board.getBoard.cancel();
      const previous = utils.board.getBoard.getData();
      if (previous) {
        const copy = structuredClone(previous);
        const target = copy.find((c) => c.id === input.categoryId);
        if (target) {
          const optimisticTask: Category["tasks"][number] = {
            id: `temp-${Date.now()}`,
            title: input.title,
            description: null,
            completed: false,
            categoryId: input.categoryId,
            order: target.tasks.length,
            createdAt: new Date(),
            updatedAt: new Date(),
            photos: [] as Category["tasks"][number]["photos"],
            comments: [] as Category["tasks"][number]["comments"],
          };
          target.tasks.push(optimisticTask);
          utils.board.getBoard.setData(undefined, copy);
        }
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) utils.board.getBoard.setData(undefined, context.previous);
      alert(`Klaida kuriant užduotį: ${error.message}`);
    },
    onSettled: () => {
      utils.board.getBoard.invalidate();
      setIsAdding(false);
      setTitle("");
    },
  });

  const safeCreateTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!category?.id) {
      alert("Kategorija nerasta – bandykite perkrauti puslapį.");
      return;
    }
    createTask.mutate({ title: trimmed, categoryId: category.id });
  };

  // Mutacija kategorijos trynimui
  const deleteCategory = api.board.deleteCategory.useMutation({
    onSuccess: () => {
      utils.board.getBoard.invalidate();
    },
    onError: (error) => {
      alert(`Klaida trinant kategoriją: ${error.message}`);
    },
  });

  const handleDeleteCategory = () => {
    if (confirm(`Ar tikrai norite ištrinti kategoriją "${category.title}" ir visas joje esančias užduotis?`)) {
      deleteCategory.mutate({ categoryId: category.id });
    }
  };


  return (
    <div
      ref={setNodeRef}
      className="w-80 rounded-xl bg-gray-50 p-4 flex flex-col gap-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">
          {category.title} ({category.tasks.length})
        </h2>
        <button 
          onClick={handleDeleteCategory}
          className="text-gray-400 hover:text-red-500 transition"
          title="Ištrinti kategoriją"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <SortableContext items={category.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {category.tasks.map(task => (
            <TaskItem key={task.id} task={task} onTaskSelectAction={onTaskSelectAction} />
          ))}
        </div>
      </SortableContext>

      {isAdding ? (
        <div className="flex flex-col gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && safeCreateTask()}
            placeholder="Užduoties pavadinimas..."
            className="px-3 py-2 border rounded-lg"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={safeCreateTask}
              className="bg-blue-500 text-white px-3 py-1 rounded disabled:bg-gray-400"
              disabled={!title.trim() || createTask.isPending}
            >
              Pridėti
            </button>
            <button onClick={() => setIsAdding(false)} className="text-gray-500">
              Atšaukti
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)} className="text-left text-gray-500 hover:text-gray-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Pridėti užduotį
        </button>
      )}
    </div>
  );
}
