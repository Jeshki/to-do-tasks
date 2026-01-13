import { fireEvent, render, screen } from "@testing-library/react";
import { TaskItem } from "../TaskItem";
import type { Task } from "../post";

const deleteTaskMock = vi.fn();

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
}));

vi.mock("~/uploadthing/react", () => ({
  api: {
    useUtils: () => ({ board: { getBoard: { invalidate: vi.fn() } } }),
    board: {
      deleteTask: { useMutation: () => ({ mutate: deleteTaskMock }) },
    },
  },
}));

const baseTask: Task = {
  id: "t1",
  title: "Task 1",
  description: null,
  completed: false,
  categoryId: "c1",
  order: 0,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
  photos: [],
  comments: [],
};

describe("TaskItem", () => {
  beforeEach(() => {
    deleteTaskMock.mockReset();
  });

  it("does not trigger task select when delete is clicked", () => {
    const onSelect = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<TaskItem task={baseTask} onTaskSelectAction={onSelect} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onSelect).not.toHaveBeenCalled();
    expect(deleteTaskMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("calls deleteTask only after confirmation", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<TaskItem task={baseTask} onTaskSelectAction={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));

    expect(deleteTaskMock).toHaveBeenCalledWith({ id: "t1" });
    confirmSpy.mockRestore();
  });

  it("renders completed styling and icon", () => {
    render(
      <TaskItem task={{ ...baseTask, completed: true }} onTaskSelectAction={vi.fn()} />,
    );

    const item = screen.getByTestId("task-item");
    expect(item.className).toContain("line-through");
    expect(item.className).toContain("opacity-50");
    expect(item.querySelector(".text-green-500")).not.toBeNull();
  });
});

