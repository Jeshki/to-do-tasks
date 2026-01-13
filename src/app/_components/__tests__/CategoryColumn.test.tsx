import { act, render } from "@testing-library/react";
import { CategoryColumn } from "../CategoryColumn";

const createTaskMock = vi.fn();
const invalidateMock = vi.fn();
const cancelMock = vi.fn();
const setDataMock = vi.fn();
const getDataMock = vi.fn();
let createTaskOptions: any;
let createTaskContext: any;
let alertSpy: any;

const baseCategories = [
  {
    id: "c1",
    title: "Column 1",
    color: "#fff",
    order: 0,
    tasks: [],
  },
];

let cacheData = structuredClone(baseCategories);

const resetData = () => {
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

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: () => {} }),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("../TaskItem", () => ({
  TaskItem: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-item">{task.title}</div>
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
      createTask: {
        useMutation: (options: any) => {
          createTaskOptions = options;
          return {
            mutate: async (input: any) => {
              createTaskMock(input);
              if (options?.onMutate) {
                createTaskContext = await options.onMutate(input);
              }
            },
          };
        },
      },
      deleteCategory: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

describe("CategoryColumn", () => {
  beforeEach(() => {
    createTaskMock.mockReset();
    invalidateMock.mockReset();
    cancelMock.mockReset();
    setDataMock.mockClear();
    getDataMock.mockClear();
    createTaskOptions = null;
    createTaskContext = null;
    resetData();
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy?.mockRestore();
  });

  it("rolls back optimistic task when createTask fails", async () => {
    render(
      <CategoryColumn category={cacheData[0]} onTaskSelectAction={() => {}} />,
    );
    expect(createTaskOptions).toBeTruthy();

    const previous = structuredClone(cacheData);
    const input = { title: "New Task", categoryId: "c1" };

    await act(async () => {
      createTaskContext = await createTaskOptions?.onMutate?.(input);
    });

    expect(cacheData[0].tasks).toHaveLength(1);
    expect(cacheData[0].tasks[0].title).toBe("New Task");

    act(() => {
      createTaskOptions?.onError?.(new Error("fail"), input, createTaskContext);
    });

    expect(cacheData).toEqual(previous);
    expect(window.alert).toHaveBeenCalled();
  });
});
