"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { api } from "~/uploadthing/react";
import { CategoryColumn } from "./CategoryColumn";
import { TaskDetailModal } from "./TaskDetailModal";

export type Comment = {
  id: string;
  text: string;
  createdAt: Date;
  taskId: string;
};

export type Photo = {
  id: string;
  url: string;
  categoryId: string | null;
  taskId: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  categoryId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  photos: Photo[];
  comments: Comment[];
};

export type Category = {
  id: string;
  title: string;
  color?: string | null;
  order: number;
  tasks: Task[];
};

export function TaskBoard() {
  const utils = api.useUtils();
  const { data: categoriesData } = api.board.getBoard.useQuery();
  const createCategory = api.board.createCategory.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });
  const updateTaskPosition = api.board.updateTaskPosition.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });

  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (categoriesData) {
      setLocalCategories(categoriesData as Category[]);
    }
  }, [categoriesData]);

  // Keep modal data fresh after board refetches or optimistic updates.
  useEffect(() => {
    if (!selectedTask) return;
    const updated = localCategories
      .flatMap((c) => c.tasks)
      .find((task) => task.id === selectedTask.id);
    if (updated && updated !== selectedTask) {
      setSelectedTask(updated);
    }
  }, [localCategories, selectedTask]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleAddColumn = () => {
    const input = window.prompt("Pridėti stulpelį");
    const title = input?.trim();
    if (!title) return;
    createCategory.mutate({ title });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;
    const taskId = String(active.id);
    const targetCategoryId = String(over.id);

    const sourceCategory = localCategories.find((c) => c.tasks.some((t) => t.id === taskId));
    const targetCategory = localCategories.find((c) => c.id === targetCategoryId);
    if (!sourceCategory || !targetCategory) return;

    const sourceIdx = sourceCategory.tasks.findIndex((t) => t.id === taskId);
    const task = sourceCategory.tasks[sourceIdx];
    if (!task) return;

    // Paprastas perskirstymas: pašaliname iš šaltinio ir įdedame į tikslą pradžioje
    const nextCategories = localCategories.map((c) => ({
      ...c,
      tasks: [...c.tasks],
    }));
    const source = nextCategories.find((c) => c.id === sourceCategory.id)!;
    const target = nextCategories.find((c) => c.id === targetCategory.id)!;
    source.tasks.splice(sourceIdx, 1);
    const newOrder = 0;
    target.tasks.splice(newOrder, 0, { ...task, categoryId: target.id });

    setLocalCategories(nextCategories);
    updateTaskPosition.mutate({ taskId, newCategoryId: target.id, newOrder });
  };

  const handleTaskSelect = (task: Task) => setSelectedTask(task);
  const handleCloseModal = () => setSelectedTask(null);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Lenta</h2>
        <button
          onClick={handleAddColumn}
          className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
        >
          Pridėti stulpelį
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 items-start overflow-x-auto">
          {localCategories?.map((cat) => (
            <CategoryColumn key={cat.id} category={cat} onTaskSelectAction={handleTaskSelect} />
          ))}
        </div>
      </DndContext>

      {selectedTask ? (
        <TaskDetailModal task={selectedTask} onCloseAction={handleCloseModal} />
      ) : null}
    </div>
  );
}
