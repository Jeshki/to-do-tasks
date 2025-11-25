import { act, fireEvent, render, screen } from "@testing-library/react";
import { TaskBoard } from "../post";

const createCategoryMock = vi.fn();
const updateTaskPositionMock = vi.fn();
let capturedOnDragEnd: ((e: any) => void) | null = null;

const mockCategories = [
  {
    id: "c1",
    title: "Pirmas",
    color: "#fff",
    order: 0,
    tasks: [
      { id: "t1", title: "Task 1", description: null, completed: false, categoryId: "c1", order: 0, photos: [], comments: [] },
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

// Minimalūs mock'ai dnd ir CategoryColumn, kad testas būtų lengvas
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
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
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
  CategoryColumn: ({ category }: { category: { id: string; title: string; tasks: unknown[] } }) => (
    <div data-testid="category-column">{category.title}</div>
  ),
}));

vi.mock("~/uploadthing/react", () => ({
  api: {
    useUtils: () => ({ board: { getBoard: { invalidate: vi.fn() } } }),
    board: {
      getBoard: { useQuery: () => ({ data: mockCategories }) },
      createCategory: { useMutation: () => ({ mutate: createCategoryMock }) },
      updateTaskPosition: { useMutation: () => ({ mutate: updateTaskPositionMock }) },
    },
  },
}));

describe("TaskBoard", () => {
  beforeEach(() => {
    createCategoryMock.mockReset();
    updateTaskPositionMock.mockReset();
    capturedOnDragEnd = null;
  });

  it("renderina gautas kategorijas", () => {
    render(<TaskBoard />);
    const columns = screen.getAllByTestId("category-column");
    expect(columns).toHaveLength(2);
    expect(columns[0]).toHaveTextContent("Pirmas");
    expect(columns[1]).toHaveTextContent("Antras");
  });

  it("sukuria naują stulpelį iš prompt reikšmės", () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("  Nauja kolona  ");
    render(<TaskBoard />);

    fireEvent.click(screen.getByText(/Pridėti stulpelį/i));
    expect(createCategoryMock).toHaveBeenCalledWith({ title: "Nauja kolona" });

    promptSpy.mockRestore();
  });

  it("drag and drop tarp kategorijų kviečia updateTaskPosition", () => {
    render(<TaskBoard />);
    expect(capturedOnDragEnd).toBeInstanceOf(Function);
    // Palaukiame, kol localCategories bus užpildyti ir kolonų atvaizdavimas įvyks
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
});
