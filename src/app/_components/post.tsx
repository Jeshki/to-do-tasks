"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
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
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const dragPointerRef = useRef<{ id: string; offsetY: number } | null>(null);
  const { data: categoriesData } = api.board.getBoard.useQuery();
  const createCategory = api.board.createCategory.useMutation({
    onMutate: async (input) => {
      await utils.board.getBoard.cancel();
      const previous = utils.board.getBoard.getData();
      const tempId = `temp-${Date.now()}`;
      const optimistic: Category = {
        id: tempId,
        title: input.title,
        color: "#94a3b8",
        order: previous?.length ?? localCategories.length,
        tasks: [],
      };
      const next = previous ? [...previous, optimistic] : [...localCategories, optimistic];
      utils.board.getBoard.setData(undefined, next);
      setLocalCategories(next);
      return { previous, tempId };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        utils.board.getBoard.setData(undefined, context.previous);
        setLocalCategories(context.previous as Category[]);
      }
    },
    onSuccess: (created, _input, context) => {
      if (!created) {
        return;
      }
      const normalized: Category = {
        ...(created as Category),
        tasks: (created as Category).tasks ?? [],
      };
      utils.board.getBoard.setData(undefined, (prev) => {
        if (!prev) return [normalized];
        const replaced = prev.map((cat) => (cat.id === context?.tempId ? normalized : cat));
        const has = replaced.some((cat) => cat.id === normalized.id);
        return has ? replaced : [...replaced, normalized];
      });
      setLocalCategories((prev) => {
        if (!prev.length) return [normalized];
        const replaced = prev.map((cat) => (cat.id === context?.tempId ? normalized : cat));
        const has = replaced.some((cat) => cat.id === normalized.id);
        return has ? replaced : [...replaced, normalized];
      });
    },
    onSettled: () => utils.board.getBoard.invalidate(),
  });
  const updateTaskPosition = api.board.updateTaskPosition.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }
    (window as any).__e2eCreateCategory = (title: string) => {
      const trimmed = title?.trim();
      if (!trimmed) return;
      createCategory.mutate({ title: trimmed });
    };
    return () => {
      (window as any).__e2eCreateCategory = null;
    };
  }, [createCategory]);

  useEffect(() => {
    if (categoriesData) {
      setLocalCategories((prev) => {
        const optimistic = prev.filter((cat) => cat.id.startsWith("temp-"));
        if (optimistic.length === 0) {
          return categoriesData as Category[];
        }
        const incoming = categoriesData as Category[];
        const incomingIds = new Set(incoming.map((cat) => cat.id));
        const mergedOptimistic = optimistic.filter((cat) => !incomingIds.has(cat.id));
        return [...incoming, ...mergedOptimistic];
      });
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

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active?.id ?? "");
    if (!activeId) {
      dragPointerRef.current = null;
      return;
    }
    const activeElement = document.querySelector<HTMLElement>(
      `[data-testid="task-item"][data-task-id="${activeId}"]`,
    );
    const rect = activeElement?.getBoundingClientRect();
    const activator = event.activatorEvent;
    if (rect && activator && "clientY" in activator) {
      const clientY = (activator as MouseEvent).clientY;
      dragPointerRef.current = { id: activeId, offsetY: clientY - rect.top };
    } else {
      dragPointerRef.current = null;
    }
  };

  const handleAddColumn = () => {
    let title: string | undefined;
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      const e2eTitle = (window as any).__e2eCategoryTitle;
      if (typeof e2eTitle === "string" && e2eTitle.trim()) {
        title = e2eTitle.trim();
        (window as any).__e2eCategoryTitle = null;
      }
    }
    if (!title) {
      const input = window.prompt("Pridėti stulpelį");
      title = input?.trim();
    }
    if (!title) return;
    createCategory.mutate({ title });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active?.id || !over?.id) return;
    const taskId = String(active.id);
    const overId = String(over.id);

    const sourceCategory = localCategories.find((c) => c.tasks.some((t) => t.id === taskId));
    const targetCategory =
      localCategories.find((c) => c.id === overId) ??
      localCategories.find((c) => c.tasks.some((t) => t.id === overId));
    if (!sourceCategory || !targetCategory) return;

    const sourceIdx = sourceCategory.tasks.findIndex((t) => t.id === taskId);
    const task = sourceCategory.tasks[sourceIdx];
    if (!task) return;

    const targetIdx = targetCategory.tasks.findIndex((t) => t.id === overId);
    let insertIndex = targetIdx >= 0 ? targetIdx : targetCategory.tasks.length;
    const isSameCategory = sourceCategory.id === targetCategory.id;
    const overIsColumn = targetCategory.id === overId;
    const overIsActive = overId === taskId;

    if (isSameCategory && (overIsColumn || overIsActive)) {
      const columnElement = document.querySelector<HTMLElement>(
        `[data-testid="category-column"][data-category-id="${targetCategory.id}"]`,
      );
      const taskNodes = columnElement?.querySelectorAll<HTMLElement>('[data-testid="task-item"]');
      const activeElement = columnElement?.querySelector<HTMLElement>(
        `[data-testid="task-item"][data-task-id="${taskId}"]`,
      );
      const translatedRect = active.rect.current.translated;
      const initialRect = active.rect.current.initial;
      const activeRectFromDom = activeElement?.getBoundingClientRect();
      const pointerOffset =
        dragPointerRef.current?.id === taskId ? dragPointerRef.current.offsetY : null;
      const pointerY =
        initialRect && pointerOffset !== null ? initialRect.top + pointerOffset + event.delta.y : null;
      const referenceY =
        pointerY ??
        (activeRectFromDom
          ? activeRectFromDom.top + activeRectFromDom.height / 2
          : translatedRect
            ? translatedRect.top + translatedRect.height / 2
            : initialRect
              ? initialRect.top + event.delta.y + initialRect.height / 2
              : null);
      if (taskNodes?.length && referenceY !== null) {
        const siblings = Array.from(taskNodes).filter(
          (node) => node.getAttribute("data-task-id") !== taskId,
        );
        const nextIndex = siblings.filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.top + rect.height / 2 < referenceY;
        }).length;
        insertIndex = nextIndex;
      } else {
        insertIndex = sourceIdx;
      }
    } else if (!isSameCategory && overIsColumn) {
      insertIndex = 0;
    }
    // Paprastas perskirstymas: pašaliname iš šaltinio ir įdedame į tikslo pradžią.
    const nextCategories = localCategories.map((c) => ({
      ...c,
      tasks: [...c.tasks],
    }));
    const source = nextCategories.find((c) => c.id === sourceCategory.id)!;
    const target = nextCategories.find((c) => c.id === targetCategory.id)!;
    source.tasks.splice(sourceIdx, 1);
    target.tasks.splice(insertIndex, 0, { ...task, categoryId: target.id });

    setLocalCategories(nextCategories);
    updateTaskPosition.mutate({ taskId, newCategoryId: target.id, newOrder: insertIndex });
    dragPointerRef.current = null;
  };

  const handleTaskSelect = (task: Task) => setSelectedTask(task);
  const handleCloseModal = () => setSelectedTask(null);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Lenta</h2>
        <button
          onClick={handleAddColumn}
          data-testid="add-category"
          className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600">
          Pridėti stulpelį</button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          dragPointerRef.current = null;
        }}
      >
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
