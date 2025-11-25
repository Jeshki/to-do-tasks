import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskDetailModal, type Task } from "../TaskDetailModal";

// Užmoukuojame UploadButton ir trpc hookus
vi.mock("../../utils/uploadthing", () => ({
  UploadButton: () => <div data-testid="upload-button-mock" />,
}));
const mutateMock = vi.fn();
const toggleMock = vi.fn();

vi.mock("~/uploadthing/react", () => ({
  api: {
    useUtils: () => ({ board: { getBoard: { invalidate: vi.fn() } } }),
    board: {
      addPhotoToTask: { useMutation: () => ({ mutate: mutateMock, isPending: false }) },
      deletePhotoFromTask: { useMutation: () => ({ mutate: mutateMock, isPending: false }) },
      updateTaskDetails: { useMutation: () => ({ mutate: mutateMock, isPending: false }) },
      toggleTaskCompletion: { useMutation: () => ({ mutate: toggleMock, isPending: false }) },
      addCommentToTask: { useMutation: () => ({ mutate: mutateMock, isPending: false }) },
    },
  },
}));

const baseTask: Task = {
  id: "t1",
  title: "Test task",
  description: "desc",
  completed: false,
  categoryId: "c1",
  order: 0,
  photos: [],
  comments: [],
};

describe("TaskDetailModal", () => {
  it("rodo pavadinimą ir leidžia atidaryti redagavimą", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    expect(screen.getByText("Test task")).toBeInTheDocument();
    const editBtn = screen.getByTitle("Redaguoti");
    fireEvent.click(editBtn);
    expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
  });

  it("perjungia atlikimo būseną", async () => {
    toggleMock.mockClear();
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(toggleMock).toHaveBeenCalledWith({ taskId: "t1", completed: true });
    });
  });
});
