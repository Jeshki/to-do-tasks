import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskDetailModal, type Task } from "../TaskDetailModal";

vi.mock("../../../utils/uploadthing", () => ({
  // Simuliuojame UploadButton: sėkmės ir klaidos scenarijai.
  UploadButton: (props: {
    onClientUploadComplete?: (files: { url: string }[]) => void;
    onUploadError?: (err: Error) => void;
  }) => (
    <div>
      <button
        type="button"
        data-testid="upload-button-mock"
        onClick={() =>
          props.onClientUploadComplete?.([
            { url: "https://example.com/pic1.jpg" },
            { url: "https://example.com/pic2.jpg" },
          ])
        }
      >
        Mock upload
      </button>
      <button
        type="button"
        data-testid="upload-button-mock-empty"
        onClick={() => props.onClientUploadComplete?.([])}
      >
        Mock upload empty
      </button>
      <button
        type="button"
        data-testid="upload-button-mock-partial"
        onClick={() => {
          props.onClientUploadComplete?.([{ url: "https://example.com/ok.jpg" }]);
          props.onUploadError?.(new Error("partial fail"));
        }}
      >
        Mock upload partial
      </button>
      <button
        type="button"
        data-testid="upload-button-mock-error"
        onClick={() => props.onUploadError?.(new Error("mock klaida"))}
      >
        Mock upload error
      </button>
    </div>
  ),
}));

const addPhotoMock = vi.fn();
const deletePhotoMock = vi.fn();
const updateDetailsMock = vi.fn();
const toggleMock = vi.fn();
const addCommentMock = vi.fn();
const refetchMock = vi.fn();
const invalidateMock = vi.fn();

vi.mock("~/uploadthing/react", () => ({
  api: {
    useUtils: () => ({ board: { getBoard: { invalidate: invalidateMock } } }),
    board: {
      getBoard: { useQuery: () => ({ refetch: refetchMock }) },
      addPhotoToTask: { useMutation: () => ({ mutate: addPhotoMock, isPending: false }) },
      deletePhotoFromTask: { useMutation: () => ({ mutate: deletePhotoMock, isPending: false }) },
      updateTaskDetails: { useMutation: () => ({ mutate: updateDetailsMock, isPending: false }) },
      toggleTaskCompletion: { useMutation: () => ({ mutate: toggleMock, isPending: false }) },
      addCommentToTask: { useMutation: () => ({ mutate: addCommentMock, isPending: false }) },
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
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    photos: [],
    comments: [{ id: "c1", text: "kom", createdAt: new Date("2025-01-02T00:00:00Z"), taskId: "t1" }],
  };
  const taskWithPhoto: Task = {
    ...baseTask,
    photos: [{ id: "p1", url: "https://example.com/pic.jpg", categoryId: null, taskId: "t1" }],
  };

describe("TaskDetailModal", () => {
  beforeEach(() => {
    addPhotoMock.mockReset();
    deletePhotoMock.mockReset();
    updateDetailsMock.mockReset();
    toggleMock.mockReset();
    addCommentMock.mockReset();
    refetchMock.mockReset();
    invalidateMock.mockReset();
  });

  it("rodo pavadinima ir leidzia atidaryti redagavima", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    expect(screen.getByText("Test task")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Redaguoti"));
    expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
  });

  it("perjungia atlikimo busena per select", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const select = screen.getByDisplayValue("Nebaigta") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "done" } });
    await waitFor(() => {
      expect(toggleMock).toHaveBeenCalledWith({ taskId: "t1", completed: true });
    });
  });

  it("leidzia keisti data ir siuncia i updateTaskDetails", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Redaguoti"));
    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2025-02-01T10:00" } });
    fireEvent.click(screen.getByTitle("Išsaugoti"));
    await waitFor(() => {
      expect(updateDetailsMock).toHaveBeenCalledWith({
        taskId: "t1",
        title: "Test task",
        description: "desc",
        createdAt: new Date("2025-02-01T10:00").toISOString(),
      });
    });
  });

  it("refresh mygtukas atsikviecia refetch ir atnaujina pavadinima", async () => {
    refetchMock.mockResolvedValue({
      data: [{ id: "c1", title: "cat", color: "#fff", order: 0, tasks: [{ ...baseTask, title: "Refreshed" }] }],
    });
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Atnaujinti modalą"));
    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
      expect(screen.getByText("Refreshed")).toBeInTheDocument();
    });
  });

  it("pateikia komentara tik jei ne tuscias", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const input = screen.getByPlaceholderText("Parašykite komentarą...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(addCommentMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "naujas komentaras" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(addCommentMock).toHaveBeenCalledWith({ taskId: "t1", text: "naujas komentaras" });
    });
  });

  it("cancel grazina ankstesnius laukus", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Redaguoti"));
    fireEvent.change(screen.getByDisplayValue("Test task"), { target: { value: "Changed" } });
    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2025-03-01T12:00" } });
    fireEvent.click(screen.getByTitle("Atšaukti"));
    expect(screen.getByText("Test task")).toBeInTheDocument();
  });

  it("paspaudus trynimo ant nuotraukos kviecia deletePhoto", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TaskDetailModal task={taskWithPhoto} onCloseAction={vi.fn()} />);
    const deleteBtn = screen.getByTitle(/trinti nuotrauk/i);
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(deletePhotoMock).toHaveBeenCalledWith({ photoId: "p1" });
    });
    confirmSpy.mockRestore();
  });

  it("kviečia addPhotoToTask visiems sėkmingai užbaigtiems įkėlimams", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    fireEvent.click(screen.getByTestId("upload-button-mock"));

    await waitFor(() => {
      expect(addPhotoMock).toHaveBeenCalledTimes(2);
    });
    expect(addPhotoMock).toHaveBeenNthCalledWith(1, {
      taskId: "t1",
      url: "https://example.com/pic1.jpg",
    });
    expect(addPhotoMock).toHaveBeenNthCalledWith(2, {
      taskId: "t1",
      url: "https://example.com/pic2.jpg",
    });
  });

  it("rodo alert jei upload grąžina klaidą", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);

    fireEvent.click(screen.getByTestId("upload-button-mock-error"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("mock klaida"));
    });
    alertSpy.mockRestore();
  });

  it("nekviečia addPhotoToTask kai upload grąžina klaidą", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);

    fireEvent.click(screen.getByTestId("upload-button-mock-error"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(addPhotoMock).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("nekviečia addPhotoToTask kai nėra grąžintų failų", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);

    fireEvent.click(screen.getByTestId("upload-button-mock-empty"));

    // neturėtų bandyti pridėti nuotraukų, nes masyvas tuščias
    await waitFor(() => {
      expect(addPhotoMock).not.toHaveBeenCalled();
    });
  });

  it("dalinės sėkmės scenarijus: prideda sėkmingus ir rodo klaidą dėl nesėkmingo", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);

    fireEvent.click(screen.getByTestId("upload-button-mock-partial"));

    await waitFor(() => {
      expect(addPhotoMock).toHaveBeenCalledTimes(1);
    });
    expect(addPhotoMock).toHaveBeenCalledWith({
      taskId: "t1",
      url: "https://example.com/ok.jpg",
    });
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("partial fail"));
    alertSpy.mockRestore();
  });
});
