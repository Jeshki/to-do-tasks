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
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { api } from "~/uploadthing/react";

import { TaskDetailModal } from "./TaskDetailModal";
import { CategoryColumn } from "./CategoryColumn";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  categoryId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  photos: { id: string; url: string; categoryId: string | null; taskId: string | null }[];
  comments: { id: string; text: string; createdAt: Date; taskId: string }[];
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
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    if (categories) setLocalCategories(structuredClone(categories));
  }, [categories]);

  const createCategory = api.board.createCategory.useMutation({
    onSuccess: () => {
      utils.board.getBoard.invalidate();
    },
    onError: (error) => {
      alert(`Klaida kuriant kategoriją: ${error.message}`);
    },
  });

  const moveTask = api.board.updateTaskPosition.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
    onError: (error) => {
      alert(`Klaida perkeliant užduotį: ${error.message}`);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const sourceCategory = localCategories.find((c) => c.tasks.some((t) => t.id === activeId));
    if (!sourceCategory) return;

    const overCategory = localCategories.find((c) => c.id === overId);
    const overTask = localCategories.flatMap((c) => c.tasks).find((t) => t.id === overId);

    let destCategory: Category | undefined;
    let newIndex: number;

    if (overCategory) {
      destCategory = overCategory;
      newIndex = destCategory.tasks.length;
    } else if (overTask) {
      destCategory = localCategories.find((c) => c.tasks.some((t) => t.id === overTask.id));
      if (!destCategory) return;
      const overTaskIndex = destCategory.tasks.findIndex((t) => t.id === overTask.id);

      const isBelow = delta.y > 0;
      newIndex = isBelow ? overTaskIndex + 1 : overTaskIndex;
    } else {
      return;
    }

    const sourceTaskIndex = sourceCategory.tasks.findIndex((t) => t.id === activeId);

    // Optimistic update
    setLocalCategories((prev) => {
      const newCats = structuredClone(prev);
      const sourceCat = newCats.find((c) => c.id === sourceCategory!.id)!;
      const destCat = newCats.find((c) => c.id === destCategory!.id)!;

      if (sourceCat.id === destCat.id) {
        destCat.tasks = arrayMove(destCat.tasks, sourceTaskIndex, newIndex);
      } else {
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = localCategories.flatMap((c) => c.tasks).find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8">
        {localCategories.map((category) => (
          <CategoryColumn key={category.id} category={category} onTaskSelectAction={setSelectedTask} />
        ))}
        <div>
          <button
            onClick={() => {
              const title = prompt("Naujos kategorijos pavadinimas?");
              if (title?.trim()) createCategory.mutate({ title: title.trim() });
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-500 transition"
          >
            <Plus className="h-6 w-6 text-gray-500" /> <span className="text-gray-500 ml-2">Pridėti stulpelį</span>
          </button>
        </div>
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} onCloseAction={() => setSelectedTask(null)} />}
    </DndContext>
  );
}
