import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskDetailModal, type Task } from "../TaskDetailModal";

const addPhotoMock = vi.fn();
const deletePhotoMock = vi.fn();
const updateDetailsMock = vi.fn();
const toggleMock = vi.fn();
const addCommentMock = vi.fn();
const refetchMock = vi.fn();
const invalidateMock = vi.fn();

const createImageFile = (name: string) =>
  new File(["file"], name, { type: "image/jpeg" });

const setupFetchResponses = (
  responses: Array<{ ok: boolean; url?: string; text?: string }>,
) => {
  let call = 0;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const current = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (current.ok) {
      return {
        ok: true,
        json: async () => ({ url: current.url ?? "https://example.com/file.jpg" }),
        text: async () => "",
      } as Response;
    }
    return {
      ok: false,
      text: async () => current.text ?? "Upload failed",
    } as Response;
  });
};

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
  const otherTask: Task = {
    ...baseTask,
    id: "t2",
    title: "Kita užduotis",
    description: "kitas aprašymas",
    photos: [],
    comments: [],
    createdAt: new Date("2025-02-02T00:00:00Z"),
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

  it("rodo pavadinimą ir leidžia atidaryti redagavimą", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    expect(screen.getByText("Test task")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Redaguoti"));
    expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
  });

  it("perjungia atlikimo būseną per select", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const select = screen.getByDisplayValue("Nebaigta") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "done" } });
    await waitFor(() => {
      expect(toggleMock).toHaveBeenCalledWith({ taskId: "t1", completed: true });
    });
  });

  it("leidžia keisti datą ir siunčia į updateTaskDetails", async () => {
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

  it("refresh mygtukas atsikviečia refetch ir atnaujina pavadinimą", async () => {
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

  it("pateikia komentarą tik jei ne tuščias", async () => {
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

  it("persijungus į kitą užduotį atnaujina laukus ir uždaro galeriją", async () => {
    const { rerender } = render(<TaskDetailModal task={taskWithPhoto} onCloseAction={vi.fn()} />);

    fireEvent.click(screen.getByTitle("Redaguoti"));
    fireEvent.change(screen.getByDisplayValue("Test task"), { target: { value: "Pakeistas" } });

    fireEvent.click(screen.getByAltText("Užduoties nuotrauka"));
    expect(screen.getByText("1 / 1")).toBeInTheDocument();

    rerender(<TaskDetailModal task={otherTask} onCloseAction={vi.fn()} />);

    expect(screen.getByDisplayValue("Kita užduotis")).toBeInTheDocument();
    const photoHeaders = screen.getAllByText((_, el) => Boolean(el?.textContent && el.textContent.includes("Nuotraukos (0)")));
    expect(photoHeaders.length).toBeGreaterThan(0);
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  it("cancel grąžina ankstesnius laukus", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Redaguoti"));
    fireEvent.change(screen.getByDisplayValue("Test task"), { target: { value: "Changed" } });
    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2025-03-01T12:00" } });
    fireEvent.click(screen.getByTitle("Atšaukti"));
    expect(screen.getByText("Test task")).toBeInTheDocument();
  });

  it("paspaudus trynimo ant nuotraukos kviečia deletePhoto", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TaskDetailModal task={taskWithPhoto} onCloseAction={vi.fn()} />);
    const deleteBtn = screen.getByTitle(/trinti nuotrauką/i);
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(deletePhotoMock).toHaveBeenCalledWith({ photoId: "p1" });
    });
    confirmSpy.mockRestore();
  });

  it("kviečia addPhotoToTask visiems sėkmingai užbaigtiems įkėlimams", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const fetchSpy = setupFetchResponses([
      { ok: true, url: "https://example.com/pic1.jpg" },
      { ok: true, url: "https://example.com/pic2.jpg" },
    ]);
    const input = screen.getByTestId("task-photo-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createImageFile("pic1.jpg"), createImageFile("pic2.jpg")] },
    });

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
    fetchSpy.mockRestore();
  });

  it("rodo alert jei upload grąžina klaidą", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const fetchSpy = setupFetchResponses([{ ok: false, text: "mock klaida" }]);
    const input = screen.getByTestId("task-photo-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createImageFile("bad.jpg")] } });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("mock klaida"));
    });
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("nekviečia addPhotoToTask kai upload grąžina klaidą", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const fetchSpy = setupFetchResponses([{ ok: false, text: "mock klaida" }]);
    const input = screen.getByTestId("task-photo-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [createImageFile("bad.jpg")] } });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
    expect(addPhotoMock).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("nekviečia addPhotoToTask kai nėra grąžintų failų", async () => {
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const input = screen.getByTestId("task-photo-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });

    // neturėtų bandyti pridėti nuotraukų, nes masyvas tuščias
    await waitFor(() => {
      expect(addPhotoMock).not.toHaveBeenCalled();
    });
  });

  it("dalinės sėkmės scenarijus: prideda sėkmingus ir rodo klaidą dėl nesėkmingo", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<TaskDetailModal task={baseTask} onCloseAction={vi.fn()} />);
    const fetchSpy = setupFetchResponses([
      { ok: true, url: "https://example.com/ok.jpg" },
      { ok: false, text: "partial fail" },
    ]);
    const input = screen.getByTestId("task-photo-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [createImageFile("ok.jpg"), createImageFile("bad.jpg")] },
    });

    await waitFor(() => {
      expect(addPhotoMock).toHaveBeenCalledTimes(1);
    });
    expect(addPhotoMock).toHaveBeenCalledWith({
      taskId: "t1",
      url: "https://example.com/ok.jpg",
    });
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("partial fail"));
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
