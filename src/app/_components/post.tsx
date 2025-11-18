"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Image as ImageIcon, MessageSquare, Trash2 } from "lucide-react";
import { api } from "~/styles/uploadthing/react";
import { TaskDetailModal } from "./TaskDetailModal";
import { CategoryColumn } from "./CategoryColumn";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  categoryId: string;
  order: number;
  photos: { id: string; url: string }[];
  comments: { id: string; text: string; createdAt: Date }[];
};

export type Category = {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
};

export function TaskBoard() {
  const utils = api.useUtils();
  const { data: categories } = api.board.getBoard.useQuery();
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (categories) setLocalCategories(structuredClone(categories));
  }, [categories]);

  const createCategory = api.board.createCategory.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });

  const moveTask = api.board.updateTaskPosition.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const sourceCategory = localCategories.find((c) =>
      c.tasks.some((t) => t.id === activeId),
    );
    if (!sourceCategory) return;

    const overCategory = localCategories.find((c) => c.id === overId);
    const overTask = localCategories
      .flatMap((c) => c.tasks)
      .find((t) => t.id === overId);

    let destCategory: Category | undefined;
    let newIndex: number;

    if (overCategory) {
      destCategory = overCategory;
      newIndex = destCategory.tasks.length;
    } else if (overTask) {
      destCategory = localCategories.find((c) =>
        c.tasks.some((t) => t.id === overTask.id),
      );
      if (!destCategory) return;
      newIndex = destCategory.tasks.findIndex((t) => t.id === overTask.id);
    } else {
      return;
    }

    const sourceTaskIndex = sourceCategory.tasks.findIndex(
      (t) => t.id === activeId,
    );

    // Optimistic update
    setLocalCategories((prev) => {
      const newCats = structuredClone(prev);
      const sourceCat = newCats.find((c) => c.id === sourceCategory!.id)!;
      const destCat = newCats.find((c) => c.id === destCategory!.id)!;

      if (sourceCat.id === destCat.id) {
        // Moving within the same category
        destCat.tasks = arrayMove(destCat.tasks, sourceTaskIndex, newIndex);
      } else {
        // Moving to a different category
        const [movedTask] = sourceCat.tasks.splice(sourceTaskIndex, 1);
        if (movedTask) {
          movedTask.categoryId = destCat.id;
          destCat.tasks.splice(newIndex, 0, movedTask);
        }
      }
      return newCats;
    });

    moveTask.mutate({
      taskId: activeId,
      newCategoryId: destCategory.id,
      newOrder: newIndex,
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8">
        {localCategories.map((category) => (
          <CategoryColumn key={category.id} category={category} onSelectTask={setSelectedTask} />
        ))}

        <button
          onClick={() => {
            const title = prompt("Naujos kategorijos pavadinimas?");
            if (title?.trim()) createCategory.mutate({ title: title.trim() });
          }}
          className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-500 transition"
        >
          <div className="flex items-center gap-2 text-gray-500">
            <Plus className="h-6 w-6" /> Pridėti stulpelį
          </div>
        </button>
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </DndContext>
  );
}

// CategoryColumn ir TaskItem lieka tokie patys kaip ankstesniame veikiačiame variante – jei reikia, galiu atsiųsti ir juos