import { fireEvent, render, screen } from "@testing-library/react";
import { CategoryColumn } from "../CategoryColumn";

// Mocks
const createTaskMock = vi.fn();
const deleteCategoryMock = vi.fn();

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: vi.fn() }),
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
}));
vi.mock("../TaskItem", () => ({
  TaskItem: ({ task }: { task: any }) => <div data-testid="task-item-mock">{task.title}</div>,
}));
vi.mock("~/uploadthing/react", () => ({
  api: {
    useUtils: () => ({ board: { getBoard: { invalidate: vi.fn() } } }),
    board: {
      createTask: { useMutation: () => ({ mutate: createTaskMock, isPending: false }) },
      deleteCategory: { useMutation: () => ({ mutate: deleteCategoryMock, isPending: false }) },
    },
  },
}));

const baseCategory = {
  id: "cat1",
  title: "Mano kategorija",
  color: "#fff",
  tasks: [],
};

describe("CategoryColumn", () => {
  beforeEach(() => {
    createTaskMock.mockReset();
    deleteCategoryMock.mockReset();
  });

  it("sukuria užduotį su apkarpytu pavadinimu", () => {
    render(<CategoryColumn category={baseCategory} onTaskSelectAction={vi.fn()} />);

    fireEvent.click(screen.getByText(/Pridėti užduotį/i));
    const input = screen.getByPlaceholderText("Užduoties pavadinimas...");

    fireEvent.change(input, { target: { value: "  Nauja užduotis  " } });
    fireEvent.click(screen.getByText("Pridėti"));

    expect(createTaskMock).toHaveBeenCalledWith({ title: "Nauja užduotis", categoryId: "cat1" });
  });

  it("neleidžia kurti tuščios užduoties (mygtukas disablinamas)", () => {
    render(<CategoryColumn category={baseCategory} onTaskSelectAction={vi.fn()} />);
    fireEvent.click(screen.getByText(/Pridėti užduotį/i));
    const button = screen.getByText("Pridėti") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("trynimas kviečia mutate jei patvirtinta", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<CategoryColumn category={baseCategory} onTaskSelectAction={vi.fn()} />);
    fireEvent.click(screen.getByTitle(/Ištrinti kategoriją/i));

    expect(deleteCategoryMock).toHaveBeenCalledWith({ categoryId: "cat1" });
    confirmSpy.mockRestore();
  });
});
