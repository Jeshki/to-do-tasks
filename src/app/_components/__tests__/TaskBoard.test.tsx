import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskBoard } from "../post";

const createCategoryMock = vi.fn();
const updateTaskPositionMock = vi.fn();
const invalidateMock = vi.fn();
const cancelMock = vi.fn();
const setDataMock = vi.fn();
const getDataMock = vi.fn();
let capturedOnDragEnd: ((e: any) => void) | null = null;
let createCategoryOptions: any;
let createCategoryContext: any;

const baseCategories = [
  {
    id: "c1",
    title: "Pirmas",
    color: "#fff",
    order: 0,
    tasks: [
      {
        id: "t1",
        title: "Task 1",
        description: null,
        completed: false,
        categoryId: "c1",
        order: 0,
        photos: [],
        comments: [],
      },
    ],
  },
  {
    id: "c2",
    title: "Antras",
    color: "#fff",
    order: 1,
    tasks: [],
  },
];

let queryData = structuredClone(baseCategories);
let cacheData = structuredClone(baseCategories);

const resetData = () => {
  queryData = structuredClone(baseCategories);
  cacheData = structuredClone(baseCategories);
};

setDataMock.mockImplementation((_key: unknown, updater: any) => {
  if (typeof updater === "function") {
    cacheData = updater(cacheData);
  } else {
    cacheData = updater;
  }
});

getDataMock.mockImplementation(() => cacheData);

// Minimalus mock'as dnd ir CategoryColumn, kad testas butu lengvas
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: any }) => {
    capturedOnDragEnd = onDragEnd ?? null;
    return <div>{children}</div>;
  },
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  PointerSensor: function PointerSensor() {},
  KeyboardSensor: function KeyboardSensor() {},
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
}));
vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  },
  sortableKeyboardCoordinates: vi.fn(),
}));
vi.mock("../CategoryColumn", () => ({
  CategoryColumn: ({
    category,
    onTaskSelectAction,
  }: {
    category: { id: string; title: string; tasks: { id: string; title: string }[] };
    onTaskSelectAction: (task: any) => void;
  }) => (
    <div data-testid="category-column" onClick={() => onTaskSelectAction(category.tasks[0])}>
      {category.title}
    </div>
  ),
}));
vi.mock("../TaskDetailModal", () => ({
  TaskDetailModal: ({ task, onCloseAction }: { task: any; onCloseAction: () => void }) => (
    <div data-testid="task-detail-modal">
      <span>{task.title}</span>
      <button onClick={onCloseAction}>Close</button>
    </div>
  ),
}));

vi.mock("~/uploadthing/react", () => ({
  api: {
    useUtils: () => ({
      board: {
        getBoard: {
          invalidate: invalidateMock,
          cancel: cancelMock,
          setData: setDataMock,
          getData: getDataMock,
        },
      },
    }),
    board: {
      getBoard: { useQuery: () => ({ data: queryData }) },
      createCategory: {
        useMutation: (options: any) => {
          createCategoryOptions = options;
          return {
            mutate: async (input: any) => {
              createCategoryMock(input);
              if (options?.onMutate) {
                createCategoryContext = await options.onMutate(input);
              }
            },
          };
        },
      },
      updateTaskPosition: { useMutation: () => ({ mutate: updateTaskPositionMock }) },
    },
  },
}));

describe("TaskBoard", () => {
  beforeEach(() => {
    createCategoryMock.mockReset();
    updateTaskPositionMock.mockReset();
    invalidateMock.mockReset();
    cancelMock.mockReset();
    setDataMock.mockClear();
    getDataMock.mockClear();
    capturedOnDragEnd = null;
    createCategoryOptions = null;
    createCategoryContext = null;
    resetData();
  });

  it("renderina gautas kategorijas", () => {
    render(<TaskBoard />);
    const columns = screen.getAllByTestId("category-column");
    expect(columns).toHaveLength(2);
    expect(columns[0]).toHaveTextContent("Pirmas");
    expect(columns[1]).toHaveTextContent("Antras");
  });

  it("atveria detaliu modala paspaudus uzduoti", () => {
    render(<TaskBoard />);
    fireEvent.click(screen.getAllByTestId("category-column")[0]);
    expect(screen.getByTestId("task-detail-modal")).toHaveTextContent("Task 1");
  });

  it("sukuria nauja stulpeli is prompt reiksmes", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("  Nauja kolona  ");
    render(<TaskBoard />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-category"));
    });
    expect(createCategoryMock).toHaveBeenCalledWith({ title: "Nauja kolona" });

    promptSpy.mockRestore();
  });

  it("nesukuria stulpelio kai prompt tuscias arba atsauktas", async () => {
    const promptSpy = vi.spyOn(window, "prompt");
    render(<TaskBoard />);

    promptSpy.mockReturnValue("   ");
    await act(async () => {
      fireEvent.click(screen.getByTestId("add-category"));
    });
    expect(createCategoryMock).not.toHaveBeenCalled();

    promptSpy.mockReturnValue(null);
    await act(async () => {
      fireEvent.click(screen.getByTestId("add-category"));
    });
    expect(createCategoryMock).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it("drag and drop tarp kategoriju kviecia updateTaskPosition", () => {
    render(<TaskBoard />);
    expect(capturedOnDragEnd).toBeInstanceOf(Function);
    expect(screen.getAllByTestId("category-column")).toHaveLength(2);

    act(() => {
      capturedOnDragEnd?.({
        active: { id: "t1" },
        over: { id: "c2" },
        delta: { y: 10 },
      });
    });

    expect(updateTaskPositionMock).toHaveBeenCalledWith({
      taskId: "t1",
      newCategoryId: "c2",
      newOrder: 0,
    });
  });

  it("optimistically adds category and replaces temp id on success", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Nauja kolona");
    render(<TaskBoard />);

    await waitFor(() => {
      expect(screen.getAllByTestId("category-column")).toHaveLength(2);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-category"));
    });

    expect(screen.getAllByTestId("category-column")).toHaveLength(3);
    expect(createCategoryMock).toHaveBeenCalledWith({ title: "Nauja kolona" });

    const created = {
      id: "c3",
      title: "Nauja kolona",
      color: "#94a3b8",
      order: 2,
      tasks: [],
    };

    act(() => {
      createCategoryOptions?.onSuccess?.(created, { title: "Nauja kolona" }, createCategoryContext);
    });

    expect(cacheData?.some((cat: any) => cat.id === created.id)).toBe(true);
    expect(cacheData?.some((cat: any) => cat.id === createCategoryContext?.tempId)).toBe(false);

    promptSpy.mockRestore();
  });

  it("rolls back optimistic category on error", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Bloga kolona");
    render(<TaskBoard />);

    await waitFor(() => {
      expect(screen.getAllByTestId("category-column")).toHaveLength(2);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-category"));
    });

    expect(screen.getAllByTestId("category-column")).toHaveLength(3);

    act(() => {
      createCategoryOptions?.onError?.(
        new Error("boom"),
        { title: "Bloga kolona" },
        createCategoryContext,
      );
    });

    expect(screen.getAllByTestId("category-column")).toHaveLength(2);
    expect(cacheData?.some((cat: any) => cat.id?.startsWith("temp-"))).toBe(false);

    promptSpy.mockRestore();
  });

  it("updates selected task when board data refreshes", async () => {
    const { rerender } = render(<TaskBoard />);

    await waitFor(() => {
      expect(screen.getAllByTestId("category-column")).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByTestId("category-column")[0]);
    expect(screen.getByTestId("task-detail-modal")).toHaveTextContent("Task 1");

    queryData = [
      {
        ...baseCategories[0],
        tasks: [
          {
            ...baseCategories[0].tasks[0],
            title: "Task 1 updated",
          },
        ],
      },
      { ...baseCategories[1] },
    ];

    rerender(<TaskBoard />);

    await waitFor(() => {
      expect(screen.getByTestId("task-detail-modal")).toHaveTextContent("Task 1 updated");
    });
  });
});


