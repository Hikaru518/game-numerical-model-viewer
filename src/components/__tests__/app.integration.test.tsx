import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import App from "../../App";

vi.mock("reactflow", async () => {
  const React = await import("react");
  const { useEffect } = React;

  let latestProps: ReactFlowProps | null = null;

  type MockNode = {
    id: string;
    position: { x: number; y: number };
    data?: { object?: { name?: string }; isPendingSource?: boolean };
  };

  type MockEdge = {
    id: string;
    type?: string;
    source?: string;
    target?: string;
    sourceHandle?: string;
    targetHandle?: string;
    data?: unknown;
    markerStart?: unknown;
    markerEnd?: unknown;
  };

  type MockReactFlowInstance = {
    fitView: () => void;
    setCenter: () => void;
    getNode: (
      id: string
    ) => { id: string; position: { x: number; y: number }; width: number; height: number } | undefined;
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
  };

  type ReactFlowProps = {
    nodes?: MockNode[];
    edges?: MockEdge[];
    edgeTypes?: Record<string, (props: Record<string, unknown>) => ReactNode>;
    onInit?: (instance: MockReactFlowInstance) => void;
    onNodeClick?: (event: unknown, node: MockNode) => void;
    onEdgeClick?: (event: unknown, edge: MockEdge) => void;
    onEdgeUpdateStart?: (...args: unknown[]) => void;
    onEdgeUpdate?: (oldEdge: MockEdge, newConnection: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => void;
    onEdgeUpdateEnd?: (...args: unknown[]) => void;
    onPaneClick?: () => void;
    onPaneContextMenu?: (event: MouseEvent) => void;
    onNodeContextMenu?: (event: MouseEvent, node: MockNode) => void;
    onConnect?: (connection: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => void;
    children?: ReactNode;
  };

  const ReactFlow = ({
    nodes = [],
    edges = [],
    edgeTypes,
    onInit,
    onNodeClick,
    onEdgeClick,
    onEdgeUpdateStart,
    onEdgeUpdate,
    onEdgeUpdateEnd,
    onPaneClick,
    onPaneContextMenu,
    onNodeContextMenu,
    onConnect,
    children,
  }: ReactFlowProps) => {
    useEffect(() => {
      latestProps = {
        nodes,
        edges,
        edgeTypes,
        onInit,
        onNodeClick,
        onEdgeClick,
        onEdgeUpdateStart,
        onEdgeUpdate,
        onEdgeUpdateEnd,
        onPaneClick,
        onPaneContextMenu,
        onNodeContextMenu,
        onConnect,
        children,
      };
    }, [
      nodes,
      edges,
      edgeTypes,
      onInit,
      onNodeClick,
      onEdgeClick,
      onEdgeUpdateStart,
      onEdgeUpdate,
      onEdgeUpdateEnd,
      onPaneClick,
      onPaneContextMenu,
      onNodeContextMenu,
      onConnect,
      children,
    ]);

    useEffect(() => {
      if (!onInit) return;
      onInit({
        fitView: vi.fn(),
        setCenter: vi.fn(),
        getNode: (id: string) => {
          const match = nodes.find((node) => node.id === id);
          if (!match) return undefined;
          return { id: match.id, position: match.position, width: 220, height: 120 };
        },
        screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      });
    }, [nodes, onInit]);

    return (
      <div
        data-testid="reactflow"
        onClick={() => onPaneClick?.()}
        onContextMenu={(event) => onPaneContextMenu?.(event.nativeEvent)}
      >
        <div data-testid="reactflow-nodes">
          {nodes.map((node) => (
            <button
              key={node.id}
              data-testid={`node-${node.id}`}
              className={node.data?.isPendingSource ? "mock-pending-source" : undefined}
              data-pending={node.data?.isPendingSource ? "true" : "false"}
              onClick={(event) => {
                event.stopPropagation();
                onNodeClick?.(event, node);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onNodeContextMenu?.(event.nativeEvent, node);
              }}
            >
              {node.data?.object?.name || node.id}
            </button>
          ))}
        </div>
        <div data-testid="reactflow-edges">
          {edges.map((edge) => (
            <div key={edge.id} data-testid={`edge-wrapper-${edge.id}`}>
              <button
                data-testid={`edge-${edge.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onEdgeClick?.(event, edge);
                }}
              >
                {edge.id}
              </button>
              {edge.type && edgeTypes?.[edge.type]
                ? (() => {
                    const EdgeComp = edgeTypes[edge.type];
                    const sourceNode = nodes.find((n) => n.id === edge.source);
                    const targetNode = nodes.find((n) => n.id === edge.target);
                    const sourceX = (sourceNode?.position.x ?? 0) + 110;
                    const sourceY = (sourceNode?.position.y ?? 0) + 60;
                    const targetX = (targetNode?.position.x ?? 0) + 110;
                    const targetY = (targetNode?.position.y ?? 0) + 60;

                    return (
                      <div data-testid={`edge-render-${edge.id}`}>
                        <EdgeComp
                          id={edge.id}
                          sourceX={sourceX}
                          sourceY={sourceY}
                          targetX={targetX}
                          targetY={targetY}
                          markerStart={edge.markerStart}
                          markerEnd={edge.markerEnd}
                          data={edge.data}
                        />
                      </div>
                    );
                  })()
                : null}
            </div>
          ))}
        </div>
        {children}
      </div>
    );
  };

  const __getLatestEdges = () => latestProps?.edges ?? [];

  const __simulateEdgeReconnect = (params: {
    edgeId: string;
    connection: {
      source?: string | null;
      target?: string | null;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    };
  }) => {
    if (!latestProps) throw new Error("ReactFlow props not captured yet");
    const edge = (latestProps.edges ?? []).find((e) => e.id === params.edgeId) ?? { id: params.edgeId };
    latestProps.onEdgeUpdateStart?.({}, edge);
    latestProps.onEdgeUpdate?.(edge, params.connection);
    latestProps.onEdgeUpdateEnd?.({}, edge);
  };

  const __simulateEdgeReconnectCancel = (edgeId: string) => {
    if (!latestProps) throw new Error("ReactFlow props not captured yet");
    const edge = (latestProps.edges ?? []).find((e) => e.id === edgeId) ?? { id: edgeId };
    latestProps.onEdgeUpdateStart?.({}, edge);
    latestProps.onEdgeUpdateEnd?.({}, edge);
  };

  const __simulateConnect = (connection: {
    source?: string | null;
    target?: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => {
    if (!latestProps) throw new Error("ReactFlow props not captured yet");
    latestProps.onConnect?.(connection);
  };

  return {
    __esModule: true,
    default: ReactFlow,
    ReactFlow,
    __getLatestEdges,
    __simulateEdgeReconnect,
    __simulateEdgeReconnectCancel,
    __simulateConnect,
    ReactFlowProvider: ({ children }: { children?: ReactNode }) => (
      <div data-testid="reactflow-provider">{children}</div>
    ),
    Background: () => <div data-testid="reactflow-background" />,
    Controls: () => <div data-testid="reactflow-controls" />,
    EdgeLabelRenderer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    MarkerType: { ArrowClosed: "arrowclosed" },
    Handle: () => <div data-testid="reactflow-handle" />,
    Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
    BaseEdge: () => <path data-testid="base-edge" />,
    getBezierPath: () => ["M0 0", 0, 0],
  };
});

const stubCryptoSequence = () => {
  let counter = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `uuid-${++counter}`,
  });
};

describe("App integration flows", () => {
  beforeEach(() => {
    stubCryptoSequence();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows empty state and triggers file dialog", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(<App />);
    expect(screen.getByText("从这里开始")).toBeInTheDocument();

    const importButtons = screen.getAllByRole("button", { name: "导入 JSON" });
    await user.click(importButtons[0]);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("creates an object and updates its name", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    const nameInput = screen.getByPlaceholderText("填写对象名称");
    await user.clear(nameInput);
    await user.type(nameInput, "角色");

    expect(screen.getByTestId("node-obj_uuid-1")).toHaveTextContent("角色");
  });

  it("creates a relationship by selecting two nodes", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));

    expect(screen.getByTestId("node-obj_uuid-1")).toHaveAttribute("data-pending", "true");
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    expect(screen.getByText("未命名关系")).toBeInTheDocument();
    expect(screen.getByTestId("edge-rel_uuid-3")).toBeInTheDocument();
  });

  it("blocks self relationship creation", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-1"));

    expect(screen.getByText("无法创建关系")).toBeInTheDocument();
    expect(screen.getByText("起点与终点不能相同")).toBeInTheDocument();
  });

  it("prevents deleting objects with relationships until removed", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    await user.click(screen.getByTestId("node-obj_uuid-1"));
    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(screen.getByText("无法删除对象")).toBeInTheDocument();
    const closeButtons = screen.getAllByRole("button", { name: "关闭" });
    await user.click(closeButtons[1]);

    await user.click(screen.getByTestId("edge-rel_uuid-3"));
    await user.click(screen.getByRole("button", { name: "删除" }));

    await user.click(screen.getByTestId("node-obj_uuid-1"));
    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(screen.queryByTestId("node-obj_uuid-1")).not.toBeInTheDocument();
  });

  it("reconnects relationship endpoints (handle change + target change) and blocks invalid reconnect", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 700, clientY: 260 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    const rf = (await import("reactflow")) as unknown as {
      __getLatestEdges: () => Array<{ id: string; source?: string; target?: string; sourceHandle?: string; targetHandle?: string }>;
      __simulateEdgeReconnect: (params: { edgeId: string; connection: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null } }) => void;
    };

    // Change source anchor from default right -> top (same objects)
    rf.__simulateEdgeReconnect({
      edgeId: "rel_uuid-4",
      connection: {
        source: "obj_uuid-1",
        target: "obj_uuid-2",
        sourceHandle: "source-top",
        targetHandle: "target-left",
      },
    });

    await waitFor(() => {
      const afterHandleChange = rf.__getLatestEdges().find((e) => e.id === "rel_uuid-4");
      expect(afterHandleChange?.sourceHandle).toBe("source-top");
      expect(afterHandleChange?.targetHandle).toBe("target-left");
    });

    // Change target object to obj_uuid-3
    rf.__simulateEdgeReconnect({
      edgeId: "rel_uuid-4",
      connection: {
        source: "obj_uuid-1",
        target: "obj_uuid-3",
        sourceHandle: "source-top",
        targetHandle: "target-left",
      },
    });

    await waitFor(() => {
      const afterTargetChange = rf.__getLatestEdges().find((e) => e.id === "rel_uuid-4");
      expect(afterTargetChange?.target).toBe("obj_uuid-3");
    });

    // Invalid: self-loop should be blocked and not change
    rf.__simulateEdgeReconnect({
      edgeId: "rel_uuid-4",
      connection: {
        source: "obj_uuid-1",
        target: "obj_uuid-1",
        sourceHandle: "source-top",
        targetHandle: "target-left",
      },
    });

    expect(await screen.findByText("无法更新关系")).toBeInTheDocument();
    expect(await screen.findByText("起点与终点不能相同")).toBeInTheDocument();

    const afterBlocked = rf.__getLatestEdges().find((e) => e.id === "rel_uuid-4");
    expect(afterBlocked?.target).toBe("obj_uuid-3");
  });

  it("does not change relationship when reconnect is cancelled (no snap target)", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    const rf = (await import("reactflow")) as unknown as {
      __getLatestEdges: () => Array<{ id: string; source?: string; target?: string; sourceHandle?: string; targetHandle?: string }>;
      __simulateEdgeReconnectCancel: (edgeId: string) => void;
    };

    const before = rf.__getLatestEdges().find((e) => e.id === "rel_uuid-3");
    expect(before?.source).toBe("obj_uuid-1");
    expect(before?.target).toBe("obj_uuid-2");
    expect(before?.sourceHandle).toBe("source-right");
    expect(before?.targetHandle).toBe("target-left");

    rf.__simulateEdgeReconnectCancel("rel_uuid-3");

    const after = rf.__getLatestEdges().find((e) => e.id === "rel_uuid-3");
    expect(after).toEqual(before);
  });

  it("blocks reconnect that would create a duplicate relationship pair (undirected)", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 700, clientY: 260 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    // rel 1: obj1 -> obj2
    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    // rel 2: obj2 -> obj3
    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-2"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-3"));

    const rf = (await import("reactflow")) as unknown as {
      __getLatestEdges: () => Array<{ id: string; source?: string; target?: string; sourceHandle?: string; targetHandle?: string }>;
      __simulateEdgeReconnect: (params: { edgeId: string; connection: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null } }) => void;
    };

    // try to reconnect rel 2 to (obj1, obj2) => duplicate (undirected) with rel 1
    rf.__simulateEdgeReconnect({
      edgeId: "rel_uuid-5",
      connection: {
        source: "obj_uuid-1",
        target: "obj_uuid-2",
        sourceHandle: "source-right",
        targetHandle: "target-left",
      },
    });

    expect(await screen.findByText("无法更新关系")).toBeInTheDocument();
    expect(await screen.findByText("同一对对象之间已存在关系")).toBeInTheDocument();

    const rel2 = rf.__getLatestEdges().find((e) => e.id === "rel_uuid-5");
    expect(rel2?.source).toBe("obj_uuid-2");
    expect(rel2?.target).toBe("obj_uuid-3");
  });

  it("deselects object when clicking on pane", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create an object
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    // Object should be selected (check side panel shows object details)
    expect(screen.getByPlaceholderText("填写对象名称")).toBeInTheDocument();

    // Click on pane (reactflow container)
    await user.click(screen.getByTestId("reactflow"));

    // Side panel should no longer show object details
    expect(screen.queryByPlaceholderText("填写对象名称")).not.toBeInTheDocument();
  });

  it("creates a relationship by dragging connection between nodes", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create two objects
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    // Simulate drag connection from obj_uuid-1 to obj_uuid-2
    const rf = (await import("reactflow")) as unknown as {
      __simulateConnect: (connection: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => void;
    };

    rf.__simulateConnect({
      source: "obj_uuid-1",
      target: "obj_uuid-2",
      sourceHandle: "source-right",
      targetHandle: "target-left",
    });

    // Relationship should be created
    expect(await screen.findByText("未命名关系")).toBeInTheDocument();
    expect(screen.getByTestId("edge-rel_uuid-3")).toBeInTheDocument();
  });

  it("blocks self connection when dragging", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create an object
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    // Try to connect object to itself
    const rf = (await import("reactflow")) as unknown as {
      __simulateConnect: (connection: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => void;
    };

    rf.__simulateConnect({
      source: "obj_uuid-1",
      target: "obj_uuid-1",
      sourceHandle: "source-right",
      targetHandle: "target-left",
    });

    // Should show error modal
    expect(await screen.findByText("无法创建关系")).toBeInTheDocument();
    expect(await screen.findByText("起点与终点不能相同")).toBeInTheDocument();
  });

  it("blocks duplicate relationship when dragging (undirected)", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create two objects
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    const rf = (await import("reactflow")) as unknown as {
      __simulateConnect: (connection: {
        source?: string | null;
        target?: string | null;
        sourceHandle?: string | null;
        targetHandle?: string | null;
      }) => void;
      __getLatestEdges: () => Array<{ id: string }>;
    };

    // Create first relationship: obj1 -> obj2
    rf.__simulateConnect({
      source: "obj_uuid-1",
      target: "obj_uuid-2",
      sourceHandle: "source-right",
      targetHandle: "target-left",
    });

    expect(await screen.findByText("未命名关系")).toBeInTheDocument();
    await waitFor(() => {
      expect(rf.__getLatestEdges().some((edge) => edge.id === "rel_uuid-3")).toBe(true);
    });

    // Close any modal
    const closeButton = screen.queryByRole("button", { name: "关闭" });
    if (closeButton) await user.click(closeButton);

    // Try to create duplicate: obj2 -> obj1 (should be blocked as undirected duplicate)
    rf.__simulateConnect({
      source: "obj_uuid-2",
      target: "obj_uuid-1",
      sourceHandle: "source-left",
      targetHandle: "target-right",
    });

    // Should show error modal for duplicate
    expect(await screen.findByText("无法创建关系")).toBeInTheDocument();
    expect(await screen.findByText("同一对对象之间已存在关系")).toBeInTheDocument();
  });

  it("adds and deletes relationship curve points (right click + context menu)", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create two objects
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    // Create relationship
    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    // Select relationship so control points (if any) are visible
    await user.click(screen.getByTestId("edge-rel_uuid-3"));

    const interactionPath = screen.getByTestId("relationship-edge-interaction-rel_uuid-3");
    fireEvent.contextMenu(interactionPath, { clientX: 400, clientY: 240 });
    await user.click(screen.getByRole("menuitem", { name: "添加控制点" }));

    const point = await screen.findByTestId("curve-point-rel_uuid-3-0");
    expect(point).toBeInTheDocument();

    fireEvent.contextMenu(point, { clientX: 410, clientY: 250 });
    await user.click(screen.getByRole("menuitem", { name: "删除控制点" }));

    await waitFor(() => {
      expect(screen.queryByTestId("curve-point-rel_uuid-3-0")).not.toBeInTheDocument();
    });
  });

  it("blocks adding more than 5 curve points", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create two objects
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    // Create relationship
    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    await user.click(screen.getByTestId("edge-rel_uuid-3"));
    const interactionPath = screen.getByTestId("relationship-edge-interaction-rel_uuid-3");

    for (let i = 0; i < 5; i += 1) {
      fireEvent.contextMenu(interactionPath, { clientX: 320 + i * 20, clientY: 200 + i * 10 });
      // menu should open each time; click to insert
      await user.click(screen.getByRole("menuitem", { name: "添加控制点" }));
    }

    await waitFor(() => {
      expect(screen.getAllByLabelText(/curve point/i)).toHaveLength(5);
    });

    fireEvent.contextMenu(interactionPath, { clientX: 520, clientY: 320 });
    await user.click(screen.getByRole("menuitem", { name: "添加控制点" }));

    expect(await screen.findByText("无法添加控制点")).toBeInTheDocument();
    expect(await screen.findByText("控制点不能超过 5 个")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/curve point/i)).toHaveLength(5);

    const dialog = screen.getByRole("dialog");
    const closeButtons = within(dialog).getAllByRole("button", { name: "关闭" });
    await user.click(closeButtons[closeButtons.length - 1]);
  });

  it("drags a curve point and commits on release", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create two objects
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    // Create relationship
    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    // Select relationship so control points are visible
    await user.click(screen.getByTestId("edge-rel_uuid-3"));

    // Insert one control point via edge context menu
    const interactionPath = screen.getByTestId("relationship-edge-interaction-rel_uuid-3");
    fireEvent.contextMenu(interactionPath, { clientX: 400, clientY: 240 });
    await user.click(screen.getByRole("menuitem", { name: "添加控制点" }));

    const point = await screen.findByTestId("curve-point-rel_uuid-3-0");
    expect(point).toHaveStyle(
      "transform: translate(-50%, -50%) translate(400px, 240px);"
    );

    // Drag: preview during move, commit on pointerup
    fireEvent.pointerDown(point, { pointerId: 1, button: 0, clientX: 400, clientY: 240 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 450, clientY: 260 });

    await waitFor(() => {
      expect(point).toHaveStyle(
        "transform: translate(-50%, -50%) translate(450px, 260px);"
      );
    });

    fireEvent.pointerUp(window, { pointerId: 1, clientX: 450, clientY: 260 });

    await waitFor(() => {
      expect(screen.getByTestId("curve-point-rel_uuid-3-0")).toHaveStyle(
        "transform: translate(-50%, -50%) translate(450px, 260px);"
      );
    });
  });
});
