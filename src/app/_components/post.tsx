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
import { api } from "~/trpc/react";
import { TaskDetailModal } from "./TaskDetailModal";

// --- TIPAI ---
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

// --- PAGRINDINIS KOMPONENTAS ---
export function TaskBoard() {
  const utils = api.useUtils();
  
  // PATAISYTA: Pašalinta numatytoji reikšmė " = []", kad nebūtų begalinio ciklo
  const { data: categories } = api.board.getBoard.useQuery();
  
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (categories) {
      setLocalCategories(JSON.parse(JSON.stringify(categories)));
    }
  }, [categories]);

  const createCategory = api.board.createCategory.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });

  const moveTaskMutation = api.board.updateTaskPosition.useMutation({
    onMutate: async (newPosition) => {
        await utils.board.getBoard.cancel();
        const previousBoard = localCategories;

        setLocalCategories((prev) => {
            const sourceCat = prev.find(c => c.id === newPosition.sourceCategoryId);
            if (!sourceCat) return prev;

            if (newPosition.sourceCategoryId === newPosition.newCategoryId) {
                const reorderedTasks = arrayMove(sourceCat.tasks, newPosition.oldOrder, newPosition.newOrder);
                return prev.map(c => c.id === newPosition.sourceCategoryId ? { ...c, tasks: reorderedTasks } : c);
            } else {
                const destCat = prev.find(c => c.id === newPosition.newCategoryId);
                if (!destCat) return prev;
                
                const taskToMove = sourceCat.tasks[newPosition.oldOrder];
                if (!taskToMove) return prev;

                const newSourceTasks = [...sourceCat.tasks];
                newSourceTasks.splice(newPosition.oldOrder, 1);

                const newDestTasks = [...destCat.tasks];
                newDestTasks.splice(newPosition.newOrder, 0, taskToMove);

                return prev.map(c => {
                    if (c.id === newPosition.sourceCategoryId) return { ...c, tasks: newSourceTasks };
                    if (c.id === newPosition.newCategoryId) return { ...c, tasks: newDestTasks };
                    return c;
                });
            }
        });

        return { previousBoard };
    },
    onError: (err, newPosition, context) => {
        if (context?.previousBoard) {
            setLocalCategories(context.previousBoard);
        }
    },
    onSettled: () => {
        utils.board.getBoard.invalidate();
    },
});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeContainerId = active.data.current?.sortable.containerId as string;
    const overContainerId = over.data.current?.sortable.containerId as string;
    
    if (!activeContainerId || !overContainerId) return;

    const oldIndex = active.data.current?.sortable.index as number;
    let newIndex: number;

    if (activeContainerId === overContainerId) {
        if (activeId === overId) return;
        const overCat = localCategories.find(c => c.id === overContainerId);
        const overIndex = overCat?.tasks.findIndex(t => t.id === overId);
        if (overIndex === -1) {
          // This can happen if you drag over the column but not a specific item
          return;
        }
        newIndex = overIndex;
    } else {
        const overCat = localCategories.find(c => c.id === overContainerId);
        const overIndex = overCat?.tasks.findIndex(t => t.id === overId);
        newIndex = overIndex !== -1 ? overIndex : (overCat?.tasks.length ?? 0);
    }

    moveTaskMutation.mutate({
        taskId: activeId,
        sourceCategoryId: activeContainerId,
        newCategoryId: overContainerId,
        oldOrder: oldIndex,
        newOrder: newIndex,
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 h-full items-start">
        {localCategories.map((category) => (
          <CategoryColumn key={category.id} category={category} onSelectTask={setSelectedTask} />
        ))}

        <div className="flex h-[100px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
          <button 
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              const title = prompt("Kategorijos pavadinimas?");
              if (title) createCategory.mutate({ name: title });
            }}
          >
            <Plus className="h-4 w-4" /> Pridėti stulpelį
          </button>
        </div>
      </div>
       {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
        />
    )}
    </DndContext>
  );
}

// --- STULPELIO KOMPONENTAS ---
function CategoryColumn({ category, onSelectTask }: { category: Category, onSelectTask: (task: Task) => void }) {
  const utils = api.useUtils();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const createTask = api.board.createTask.useMutation({
    onSuccess: () => {
      utils.board.getBoard.invalidate();
      setIsAddingTask(false);
      setNewTaskTitle("");
    },
  });

  const onAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    createTask.mutate({ 
        title: newTaskTitle.trim(),
        categoryId: category.id 
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4 min-w-[280px]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            {category.title} <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-foreground">{category.tasks.length}</span>
        </h2>
      </div>

      <SortableContext id={category.id} items={category.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 min-h-[50px]">
          {category.tasks.map((task) => (
            <TaskItem key={task.id} task={task} onSelectTask={onSelectTask} />
          ))}
        </div>
      </SortableContext>

      {isAddingTask ? (
        <form onSubmit={onAddTask} className="flex flex-col gap-2">
          <textarea
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Ką reikia padaryti?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={2}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                Pridėti
            </button>
            <button 
                type="button" 
                onClick={() => setIsAddingTask(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
            >
                Atšaukti
            </button>
          </div>
        </form>
      ) : (
        <button 
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground hover:bg-background hover:text-foreground transition-all"
        >
          <Plus className="h-4 w-4" /> Pridėti užduotį
        </button>
      )}
    </div>
  );
}

// --- KORTELĖS KOMPONENTAS ---
function TaskItem({ task, onSelectTask }: { task: Task, onSelectTask: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const utils = api.useUtils();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const deleteTask = api.board.deleteTask.useMutation({
    onSuccess: () => utils.board.getBoard.invalidate(),
  });

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        onClick={() => onSelectTask(task)}
        className="group relative flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">{task.title}</span>
        <button 
            onClick={(e) => {
                e.stopPropagation(); // Prevent modal from opening
                if (window.confirm("Ar tikrai norite ištrinti šią užduotį?")) {
                    deleteTask.mutate({ id: task.id });
                }
            }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
        >
            <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      {(task.description || task.photos.length > 0 || task.comments.length > 0) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            {task.photos.length > 0 && (
              <div className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> {task.photos.length}
              </div>
            )}
            {task.comments.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> {task.comments.length}
              </div>
            )}
          </div>
      )}
      
      <div 
        {...attributes} 
        {...listeners} 
        onClick={(e) => e.stopPropagation()} // Prevent modal from opening
        className="absolute right-1 bottom-1 cursor-grab p-1 text-muted-foreground/50 hover:text-foreground"
      >
         <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
}