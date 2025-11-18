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
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Image as ImageIcon, MessageSquare, Trash2, Edit2 } from "lucide-react";
// UI component imports removed as they are not yet initialized in the project.
import * as z from "zod";
import { api } from "~/trpc/react";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  categoryId: string;
  order: number;
  photos: { id: string; url: string }[];
  comments: { id: string; text: string; createdAt: string }[];
};

type Category = {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
};

const categorySchema = z.object({
  title: z.string().min(1, "Pavadinimas negali būti tuščias"),
});

export function TaskBoard() {
  const utils = api.useUtils();
  const { data: categories = [], refetch } = api.post.hello.useQuery({ text: "from tRPC" });
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  const createCategory = api.post.create.useMutation({
    onSuccess: () => {
      utils.post.hello.invalidate();
      // toast({ title: "Kategorija sukurta!" });
    }
  });

  const createDefaultCategories = api.post.create.useMutation({
    onSuccess: () => {
      utils.post.hello.invalidate();
      // toast({ title: "Sukurtos numatytosios kategorijos!" });
    }
  });

  const updateTaskOrder = api.post.create.useMutation();
  const updateTaskCategory = api.post.create.useMutation({
    onSuccess: () => utils.post.hello.invalidate(),
  });

  useEffect(() => {
    if (categories) {
      setLocalCategories(JSON.parse(JSON.stringify(categories)));
    }
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeContainer = active.data.current?.sortable.containerId;
    const overContainer = over.data.current?.sortable.containerId;
    const activeCatId = activeContainer;
    const overCatId = overContainer;

    if (activeCatId === overCatId) {
      // Reorder within the same category
      setLocalCategories((prev) => {
        const newCategories = prev.map((cat) => {
          if (cat.id === activeCatId) {
            const oldIndex = cat.tasks.findIndex((t) => t.id === activeId);
            const newIndex = cat.tasks.findIndex((t) => t.id === overId);
            const reorderedTasks = arrayMove(cat.tasks, oldIndex, newIndex);
            updateTaskOrder.mutate({ // Placeholder
              name: `reorder in ${cat.id}`,
            });
            return { ...cat, tasks: reorderedTasks };
          }
          return cat;
        });
        return newCategories;
      });
    } else {
      // Move between categories
      let activeTask: Task | undefined;
      const activeCat = localCategories.find(c => c.id === activeCatId);
      activeTask = activeCat?.tasks.find(t => t.id === activeId);

      if (activeTask) {
        updateTaskCategory.mutate({ name: `move ${activeId} to ${overCatId}` }); // Placeholder
        setLocalCategories(prev => {
          const newCategories = prev.map(cat => {
            if (cat.id === activeCatId) {
              return { ...cat, tasks: cat.tasks.filter(t => t.id !== activeId) };
            }
            if (cat.id === overCatId) {
              return { ...cat, tasks: [...cat.tasks, { ...activeTask!, categoryId: overCatId }] };
            }
            return cat;
          });
          return newCategories;
        });
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {localCategories.sort((a, b) => a.title.localeCompare(b.title)).map((category) => (
          <CategoryColumn key={category.id} category={category} />
        ))}

        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-10">
          <button className="flex items-center justify-center rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground" onClick={() => {
            const title = prompt("Naujos kategorijos pavadinimas?");
            if (title) createCategory.mutate({ name: title });
          }}>
            <Plus className="mr-2 h-4 w-4" /> Pridėti kategoriją
          </button>
        </div>
        {Array.isArray(categories) && categories.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-10">
            <button className="flex items-center justify-center rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground" onClick={() => createDefaultCategories.mutate({ name: "default" })}>
              <Plus className="mr-2 h-4 w-4" /> Sukurti pavyzdines kategorijas (placeholder)
            </button>
          </div>
        )}
      </div>
    </DndContext>
  );
}

function CategoryColumn({ category }: { category: Category }) {
  const utils = api.useUtils();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const createTask = api.post.create.useMutation({
    onSuccess: () => {
      utils.post.hello.invalidate();
      // toast({ title: "Užduotis sukurta!" });
      setIsAddingTask(false);
      setNewTaskTitle("");
    },
  });

  const onAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      createTask.mutate({ name: newTaskTitle.trim() });
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4">
      <h2 className="text-lg font-semibold">{category.title}</h2>
      <SortableContext id={category.id} items={category.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {category.tasks.sort((a, b) => a.order - b.order).map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
      {isAddingTask ? (
        <form onSubmit={onAddTask} className="flex flex-col gap-2">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Naujos užduoties pavadinimas"
            autoFocus
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">Pridėti</button>
            <button type="button" className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground" onClick={() => setIsAddingTask(false)}>Atšaukti</button>
          </div>
        </form>
      ) : (
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground" onClick={() => setIsAddingTask(true)}>
          <Plus className="mr-2 h-4 w-4" /> Pridėti užduotį
        </button>
      )}
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const utils = api.useUtils();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const deleteTask = api.post.create.useMutation({ // Placeholder
    onSuccess: () => {
      utils.post.hello.invalidate();
      // toast({ title: "Užduotis ištrinta!" });
    },
  });

  const updateTask = api.post.create.useMutation({ // Placeholder
    onSuccess: () => {
      utils.post.hello.invalidate();
      // toast({ title: "Užduotis atnaujinta!" });
    },
  });

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="font-medium">{task.title}</span>
        <div className="flex items-center">
          {/* Placeholder for Edit/Delete Dropdown */}
          <button className="h-8 w-8 p-0" onClick={() => alert('Redaguoti: ' + task.title)}>
            <Edit2 className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 p-0 text-red-500" onClick={() => deleteTask.mutate({ name: task.id })}>
            <Trash2 className="h-4 w-4" />
          </button>

          <div {...attributes} {...listeners} className="cursor-grab p-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
      {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
        {task.photos.length > 0 && (
          <div className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" />
            <span>{task.photos.length}</span>
          </div>
        )}
        {task.comments.length > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{task.comments.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
