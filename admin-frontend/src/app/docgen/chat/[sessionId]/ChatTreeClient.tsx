"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeProps,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { AnimatePresence, motion } from "framer-motion";
import { useHotkeys } from "react-hotkeys-hook";
import ReactMarkdown from "react-markdown";
import DiffMatchPatch from "diff-match-patch";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import {
  ChatNodeDTO,
  ChatNodeDetail,
  ChatTreeResponse,
  MergeOperationDTO,
  checkoutChatNode,
  createChatNode,
  diffChatNodes,
  fetchChatNode,
  fetchChatTree,
  fetchMergeOperations,
} from "@/lib/chat-tree";
import api from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-api-error";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 130;
const X_GAP = 260;
const Y_GAP = 160;
const INITIAL_DEPTH = 2;
const CHILD_PAGE_SIZE = 20;
const dmp = new DiffMatchPatch();

const TABS = ["preview", "json", "meta", "activity"] as const;
type InspectorTab = (typeof TABS)[number];

type ChatTreeClientProps = {
  sessionId: string;
  initialTree: ChatTreeResponse;
};

type ChatNodeDataBase = {
  node: ChatNodeDTO;
  isRoot: boolean;
  isCurrent: boolean;
  hiddenChildren: number;
};

type ChatNodeData = ChatNodeDataBase & {
  onBranch: (node: ChatNodeDTO) => void;
  onCheckout: (node: ChatNodeDTO) => void;
  onDiff: (node: ChatNodeDTO) => void;
  onMerge: (node: ChatNodeDTO) => void;
  onExpandChildren: (node: ChatNodeDTO) => void;
};

type DiffSectionRow = {
  key: string;
  status: string;
};

type DiffDialogState = {
  open: boolean;
  leftId: string | null;
  rightId: string | null;
  sections: DiffSectionRow[];
  loading: boolean;
};

type MergeDialogState = {
  open: boolean;
  baseId: string | null;
  leftId: string | null;
  rightId: string | null;
  mode: "auto" | "manual";
  sectionsMap: Record<string, "left" | "right" | "merged">;
  submitting: boolean;
};

type MergeSectionRow = {
  key: string;
  title: string;
  leftMd: string;
  rightMd: string;
  baseMd: string;
};

type SectionAnchor = {
  key: string;
  title: string;
};

const requestDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ChatTreeClient({ sessionId, initialTree }: ChatTreeClientProps) {
  const [tree, setTree] = useState<ChatTreeResponse>(initialTree);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InspectorTab>("preview");
  const [nodeDetails, setNodeDetails] = useState<Record<string, ChatNodeDetail>>({});
  const [merges, setMerges] = useState<MergeOperationDTO[]>([]);
  const [expandedChildren, setExpandedChildren] = useState<Record<string, number>>({});
  const [pendingSectionsMap, setPendingSectionsMap] = useState<Record<string, "left" | "right" | "merged">>({});
  const [pendingAction, setPendingAction] = useState<null | "branch" | "checkout" | "merge">(null);

  const [diffDialog, setDiffDialog] = useState<DiffDialogState>({
    open: false,
    leftId: null,
    rightId: null,
    sections: [],
    loading: false,
  });

  const [mergeDialog, setMergeDialog] = useState<MergeDialogState>({
    open: false,
    baseId: null,
    leftId: null,
    rightId: null,
    mode: "manual",
    sectionsMap: {},
    submitting: false,
  });

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, ChatNodeDTO>();
    (tree?.nodes ?? []).forEach((node) => map.set(node.id, node));
    return map;
  }, [tree?.nodes]);

  const childMap = useMemo(() => {
    const map = new Map<string, ChatNodeDTO[]>();
    (tree?.nodes ?? []).forEach((node) => {
      if (!node.parentId) return;
      const list = map.get(node.parentId) ?? [];
      list.push(node);
      map.set(node.parentId, list);
    });
    map.forEach((children) => {
      children.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
    });
    return map;
  }, [tree?.nodes]);

  const childIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    childMap.forEach((children) => {
      children.forEach((child, index) => map.set(child.id, index));
    });
    return map;
  }, [childMap]);

  const visibleSet = useMemo(() => {
    const cache = new Map<string, boolean>();
    const visible = new Set<string>();

    const isVisible = (node: ChatNodeDTO): boolean => {
      if (cache.has(node.id)) return cache.get(node.id)!;
      if (!node.parentId) {
        cache.set(node.id, true);
        visible.add(node.id);
        return true;
      }
      const parent = nodeMap.get(node.parentId);
      if (!parent) {
        cache.set(node.id, true);
        visible.add(node.id);
        return true;
      }

      if (node.depth <= INITIAL_DEPTH) {
        cache.set(node.id, true);
        visible.add(node.id);
        return true;
      }

      const extraPages = expandedChildren[node.parentId] ?? 0;
      if (extraPages <= 0) {
        cache.set(node.id, false);
        return false;
      }

      const index = childIndexMap.get(node.id) ?? 0;
      if (index >= extraPages * CHILD_PAGE_SIZE) {
        cache.set(node.id, false);
        return false;
      }

      const parentVisible = isVisible(parent);
      cache.set(node.id, parentVisible);
      if (parentVisible) visible.add(node.id);
      return parentVisible;
    };

    (tree?.nodes ?? []).forEach((node) => {
      if (!cache.has(node.id)) {
        if (node.depth <= INITIAL_DEPTH) {
          cache.set(node.id, true);
          visible.add(node.id);
        } else {
          isVisible(node);
        }
      }
    });

    return visible;
  }, [tree?.nodes, expandedChildren, childIndexMap, nodeMap]);

  const visibleNodes = useMemo(
    () => (tree?.nodes ?? []).filter((node) => visibleSet.has(node.id)),
    [tree?.nodes, visibleSet]
  );

  const hiddenChildrenMeta = useMemo(() => {
    const meta = new Map<string, number>();
    childMap.forEach((children, parentId) => {
      const hidden = children.filter((child) => !visibleSet.has(child.id)).length;
      meta.set(parentId, hidden);
    });
    return meta;
  }, [childMap, visibleSet]);

  const flowNodesBase = useMemo(() => {
    const depthCounts = new Map<number, number>();
    const sorted = [...visibleNodes].sort((a, b) =>
      a.path.localeCompare(b.path, undefined, { numeric: true })
    );

    return sorted.map((node) => {
      const count = depthCounts.get(node.depth) ?? 0;
      depthCounts.set(node.depth, count + 1);

      const position = {
        x: node.depth * X_GAP,
        y: count * Y_GAP,
      };

      const data: ChatNodeDataBase = {
        node,
        isRoot: node.depth === 0,
        isCurrent: tree?.session?.currentNodeId === node.id,
        hiddenChildren: hiddenChildrenMeta.get(node.id) ?? 0,
      };

      return {
        id: node.id,
        type: "chatNode",
        position,
        data,
        draggable: false,
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      } satisfies Node;
    });
  }, [hiddenChildrenMeta, tree?.session?.currentNodeId, visibleNodes]);

  const flowEdges = useMemo(() => {
    return visibleNodes
      .filter((n) => n.parentId)
      .map((n) => ({
        id: `${n.parentId}-${n.id}`,
        source: n.parentId as string,
        target: n.id,
        type: "smoothstep",
      } satisfies Edge));
  }, [visibleNodes]);

  const currentNode = useMemo(
    () => (tree?.nodes ?? []).find((n) => n.id === tree?.session?.currentNodeId) ?? null,
    [tree?.nodes, tree?.session?.currentNodeId]
  );

  const rootNode = useMemo(
    () => (tree?.nodes ?? []).find((node) => !node.parentId) ?? null,
    [tree?.nodes]
  );

  const selectedNode = useMemo(
    () => (tree?.nodes ?? []).find((n) => n.id === selectedNodeId) ?? null,
    [tree?.nodes, selectedNodeId]
  );

  const currentDetail = currentNode ? nodeDetails[currentNode.id] : null;
  const selectedDetail = selectedNode ? nodeDetails[selectedNode.id] : null;

  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab("preview");
    }
  }, [selectedNodeId]);

  const ensureNodeDetail = useCallback(
    async (nodeId: string) => {
      if (nodeDetails[nodeId]) return nodeDetails[nodeId];
      const detail = await fetchChatNode(sessionId, nodeId);
      setNodeDetails((prev) => ({ ...prev, [nodeId]: detail }));
      return detail;
    },
    [nodeDetails, sessionId]
  );

  const refreshTree = useCallback(async () => {
    try {
      const next = await fetchChatTree(sessionId);
      setTree(next);
    } catch (error) {
      toastApiError(error as any, refreshTree);
    }
  }, [sessionId]);

  const refreshMerges = useCallback(async () => {
    try {
      const items = await fetchMergeOperations(sessionId);
      setMerges(items);
    } catch (error) {
      toastApiError(error as any, refreshMerges);
    }
  }, [sessionId]);

  useEffect(() => {
    refreshMerges();
  }, [refreshMerges]);

  useEffect(() => {
    if (currentNode) {
      ensureNodeDetail(currentNode.id).catch(() => undefined);
    }
  }, [currentNode, ensureNodeDetail]);

  useEffect(() => {
    if (selectedNodeId) {
      ensureNodeDetail(selectedNodeId).catch(() => undefined);
    }
  }, [selectedNodeId, ensureNodeDetail]);

  const requestWithRetry = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    let attempt = 0;
    const maxAttempts = 2;
    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error: any) {
        const status = error?.response?.status;
        const isTimeout = error?.message?.toLowerCase?.().includes("timeout");
        const retryable = (status === 408 || status === 504 || isTimeout) && attempt < maxAttempts - 1;
        if (retryable) {
          attempt += 1;
          await requestDelay(1500 * attempt);
          continue;
        }
        throw error;
      }
    }
    throw new Error("Request failed");
  }, []);

  const ensurePrompt = useCallback((defaultText = "Describe the next step") => {
    const value = window.prompt("Enter prompt for the new branch", defaultText);
    if (!value) return null;
    return value.trim();
  }, []);

  const handleBranch = useCallback(
    async (node: ChatNodeDTO) => {
      const prompt = ensurePrompt();
      if (!prompt) return;
      const payload = {
        parentId: node.id,
        promptText: prompt,
        label: prompt.slice(0, 32),
      };
      try {
        setPendingAction("branch");
        await requestWithRetry(() => createChatNode(sessionId, payload));
        toast.success("Branch created");
        await refreshTree();
        await refreshMerges();
      } catch (error) {
        toastApiError(error, () =>
          requestWithRetry(() => createChatNode(sessionId, payload)).then(() => undefined)
        );
      } finally {
        setPendingAction(null);
      }
    },
    [ensurePrompt, refreshMerges, refreshTree, requestWithRetry, sessionId]
  );

  const handleCheckout = useCallback(
    async (node: ChatNodeDTO) => {
      try {
        setPendingAction("checkout");
        await requestWithRetry(() => checkoutChatNode(sessionId, node.id));
        toast.success(`Checked out ${node.path}`);
        await refreshTree();
      } catch (error) {
        toastApiError(error, () =>
          requestWithRetry(() => checkoutChatNode(sessionId, node.id)).then(() => undefined)
        );
      } finally {
        setPendingAction(null);
      }
    },
    [refreshTree, requestWithRetry, sessionId]
  );

  const handleDiff = useCallback(
    async (node: ChatNodeDTO) => {
      if (!currentNode) {
        toast.message("No current node to diff against");
        return;
      }
      try {
        setDiffDialog({ open: true, leftId: currentNode.id, rightId: node.id, sections: [], loading: true });
        await Promise.all([ensureNodeDetail(currentNode.id), ensureNodeDetail(node.id)]);
        const diff = await requestWithRetry(() => diffChatNodes(sessionId, currentNode.id, node.id));
        setDiffDialog({
          open: true,
          leftId: currentNode.id,
          rightId: node.id,
          sections: diff.sections as DiffSectionRow[],
          loading: false,
        });
      } catch (error) {
        setDiffDialog({ open: false, leftId: null, rightId: null, sections: [], loading: false });
        toastApiError(error as any, () => handleDiff(node));
      }
    },
    [currentNode, ensureNodeDetail, requestWithRetry, sessionId]
  );

  const handleOpenMerge = useCallback(
    async (node: ChatNodeDTO) => {
      if (!currentNode) {
        toast.message("No current node selected for merge");
        return;
      }
      try {
        await Promise.all([ensureNodeDetail(currentNode.id), ensureNodeDetail(node.id)]);
        const lca = findLcaNode(currentNode, node, nodeMap);
        if (lca) {
          await ensureNodeDetail(lca.id);
        }
        setMergeDialog({
          open: true,
          baseId: lca?.id ?? currentNode.id,
          leftId: currentNode.id,
          rightId: node.id,
          mode: "manual",
          sectionsMap: {},
          submitting: false,
        });
      } catch (error) {
        toastApiError(error as any, () => handleOpenMerge(node));
      }
    },
    [currentNode, ensureNodeDetail, nodeMap]
  );

  const handleExpandChildren = useCallback((node: ChatNodeDTO) => {
    setExpandedChildren((prev) => ({
      ...prev,
      [node.id]: (prev[node.id] ?? 0) + 1,
    }));
  }, []);

  useEffect(() => {
    const enrichedNodes = flowNodesBase.map((node) => {
      const base = node.data as ChatNodeDataBase;
      const data: ChatNodeData = {
        ...base,
        onBranch: handleBranch,
        onCheckout: handleCheckout,
        onDiff: handleDiff,
        onMerge: handleOpenMerge,
        onExpandChildren: handleExpandChildren,
      };
      return {
        ...node,
        data,
        draggable: visibleNodes.length <= 150,
      } as Node;
    });

    setNodes(enrichedNodes);
    setEdges(flowEdges);
  }, [flowNodesBase, flowEdges, handleBranch, handleCheckout, handleDiff, handleOpenMerge, handleExpandChildren, setEdges, setNodes, visibleNodes.length]);

  const branchSelected = useCallback(() => {
    const target = selectedNode ?? currentNode;
    if (!target) {
      toast.message("Select a node to branch");
      return;
    }
    handleBranch(target);
  }, [currentNode, handleBranch, selectedNode]);

  const checkoutSelected = useCallback(() => {
    const target = selectedNode;
    if (!target) {
      toast.message("Select a node to checkout");
      return;
    }
    handleCheckout(target);
  }, [handleCheckout, selectedNode]);

  const diffSelected = useCallback(() => {
    const target = selectedNode;
    if (!target) {
      toast.message("Select a node to diff");
      return;
    }
    handleDiff(target);
  }, [handleDiff, selectedNode]);

  const mergeSelected = useCallback(() => {
    const target = selectedNode;
    if (!target) {
      toast.message("Select a node to merge with current");
      return;
    }
    handleOpenMerge(target);
  }, [handleOpenMerge, selectedNode]);

  const newPrompt = useCallback(() => {
    const hasRoot = Boolean(rootNode);
    const prompt = ensurePrompt(hasRoot ? "Describe the next branch" : "Describe new root branch");
    if (!prompt) return;

    const payloadBase = {
      promptText: prompt,
      label: prompt.slice(0, 32),
    };

    const makePayload = (parentId?: string) =>
      parentId ? { ...payloadBase, parentId } : payloadBase;

    const attemptCreate = (parentId?: string) =>
      requestWithRetry(() => createChatNode(sessionId, makePayload(parentId)))
        .then(() => {
          toast.success(parentId ? "Branch created" : "Root branch created");
          refreshTree();
          refreshMerges();
        })
        .catch((error) => {
          const msg = error?.response?.data?.message?.message ?? error?.message ?? "";
          if (!parentId && typeof msg === "string" && msg.includes('Root node already exists')) {
            const fallbackParent = selectedNode ?? currentNode ?? rootNode;
            if (fallbackParent) {
              requestWithRetry(() => createChatNode(sessionId, makePayload(fallbackParent.id)))
                .then(() => {
                  toast.success("Branch created");
                  refreshTree();
                  refreshMerges();
                })
                .catch((nestedError) =>
                  toastApiError(nestedError, () =>
                    requestWithRetry(() => createChatNode(sessionId, makePayload(fallbackParent.id))).then(() => undefined)
                  )
                );
              return;
            }
          }

          toastApiError(error, () =>
            requestWithRetry(() => createChatNode(sessionId, makePayload(parentId))).then(() => undefined)
          );
        });

    if (!hasRoot) {
      attemptCreate();
      return;
    }

    const parent = selectedNode ?? currentNode ?? rootNode;
    if (!parent) {
      toast.error("Нет узла для создания ветки. Выберите существующий узел.");
      return;
    }

    attemptCreate(parent.id);
  }, [
    currentNode,
    ensurePrompt,
    refreshMerges,
    refreshTree,
    requestWithRetry,
    rootNode,
    selectedNode,
    sessionId,
  ]);

  useHotkeys("b", branchSelected, [branchSelected]);
  useHotkeys("c", checkoutSelected, [checkoutSelected]);
  useHotkeys("d", diffSelected, [diffSelected]);
  useHotkeys("m", mergeSelected, [mergeSelected]);
  useHotkeys("n", newPrompt, [newPrompt]);

  const currentBreadcrumbs = useMemo(() => {
    const path = currentNode?.path;
    if (!path) return [] as { label: string; node: ChatNodeDTO }[];
    const segments = path.split(".");
    return segments.map((_, index) => {
      const joined = segments.slice(0, index + 1).join(".");
      const node = Array.from(nodeMap.values()).find((n) => n.path === joined);
      return {
        label: joined,
        node: node ?? currentNode,
      };
    });
  }, [currentNode, nodeMap]);

  const selectedSections = selectedDetail?.responseJson?.sections ?? [];
  const virtualizationEnabled = selectedSections.length > 50;
  const selectedSectionAnchors: SectionAnchor[] = useMemo(
    () => selectedSections.map((section) => ({ key: section.key, title: section.title || section.key })),
    [selectedSections]
  );

  const scrollToSection = useCallback(
    (key: string) => {
      const index = selectedSections.findIndex((section) => section.key === key);
      if (index === -1) return;
      if (virtualizationEnabled && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({ index, behavior: "smooth" });
      } else {
        const element = document.getElementById(`section-${key}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [selectedSections, virtualizationEnabled]
  );

  const mergeSectionRows = useMemo(() => {
    if (!mergeDialog.open || !mergeDialog.leftId || !mergeDialog.rightId) return [] as MergeSectionRow[];
    const left = nodeDetails[mergeDialog.leftId];
    const right = nodeDetails[mergeDialog.rightId];
    const base = mergeDialog.baseId ? nodeDetails[mergeDialog.baseId] : undefined;
    const sections = new Map<string, MergeSectionRow>();

    const collect = (detail?: ChatNodeDetail) => {
      detail?.responseJson?.sections?.forEach((section) => {
        if (!sections.has(section.key)) {
          sections.set(section.key, {
            key: section.key,
            title: section.title || section.key,
            leftMd: "",
            rightMd: "",
            baseMd: "",
          });
        }
      });
    };

    collect(base);
    collect(left);
    collect(right);

    sections.forEach((row, key) => {
      row.leftMd = left?.responseJson?.sections?.find((section) => section.key === key)?.markdown ?? "";
      row.rightMd = right?.responseJson?.sections?.find((section) => section.key === key)?.markdown ?? "";
      row.baseMd = base?.responseJson?.sections?.find((section) => section.key === key)?.markdown ?? "";
    });

    return Array.from(sections.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [mergeDialog, nodeDetails]);

  const mergeDefaults = useMemo(() => {
    if (!mergeDialog.open) return {} as Record<string, "left" | "right" | "merged">;
    return mergeSectionRows.reduce<Record<string, "left" | "right" | "merged">>((acc, row) => {
      if (mergeDialog.sectionsMap[row.key]) {
        acc[row.key] = mergeDialog.sectionsMap[row.key];
      } else if (pendingSectionsMap[row.key]) {
        acc[row.key] = pendingSectionsMap[row.key];
      } else if (!row.leftMd && row.rightMd) {
        acc[row.key] = "right";
      } else if (row.leftMd && !row.rightMd) {
        acc[row.key] = "left";
      } else if (row.leftMd === row.rightMd) {
        acc[row.key] = "left";
      } else {
        acc[row.key] = "right";
      }
      return acc;
    }, {});
  }, [mergeDialog.open, mergeDialog.sectionsMap, mergeSectionRows, pendingSectionsMap]);

  useEffect(() => {
    if (!mergeDialog.open || mergeSectionRows.length === 0) return;
    setMergeDialog((prev) => {
      const next = { ...prev.sectionsMap };
      let changed = false;
      mergeSectionRows.forEach((row) => {
        if (!next[row.key]) {
          next[row.key] = mergeDefaults[row.key];
          changed = true;
        }
      });
      return changed ? { ...prev, sectionsMap: next } : prev;
    });
  }, [mergeDefaults, mergeDialog.open, mergeSectionRows]);

  const mergeOptions = useMemo(() => {
    if (!mergeDialog.leftId || !mergeDialog.rightId) return [] as ChatNodeDTO[];
    const left = nodeMap.get(mergeDialog.leftId);
    if (!left) return [];
    const segments = left.path.split(".");
    const options: ChatNodeDTO[] = [];
    segments.forEach((_, index) => {
      const joined = segments.slice(0, index + 1).join(".");
      const node = Array.from(nodeMap.values()).find((n) => n.path === joined);
      if (node) options.push(node);
    });
    return options;
  }, [mergeDialog.leftId, mergeDialog.rightId, nodeMap]);

  const largeGraph = visibleNodes.length > 150;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {currentBreadcrumbs.map((crumb, idx) => (
              <span key={crumb.label} className="flex items-center gap-2">
                <Button
                  onClick={() => handleCheckout(crumb.node)}
                  className="bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  {crumb.label}
                </Button>
                {idx < currentBreadcrumbs.length - 1 && <span>›</span>}
              </span>
            ))}
          </div>
          <h1 className="text-xl font-semibold">{tree?.session?.title ?? "Chat session"}</h1>
          <p className="text-sm text-slate-500">
            Current: {currentNode?.path ?? "—"} · Nodes: {(tree?.nodes ?? []).length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={branchSelected}
            disabled={pendingAction === "branch"}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {pendingAction === "branch" ? "Branching…" : "Branch (B)"}
          </Button>
          <Button
            onClick={checkoutSelected}
            disabled={pendingAction === "checkout"}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {pendingAction === "checkout" ? "Checkout…" : "Checkout (C)"}
          </Button>
          <Button onClick={diffSelected} className="bg-slate-900 text-white hover:bg-slate-800">
            Diff (D)
          </Button>
          <Button onClick={mergeSelected} className="bg-slate-900 text-white hover:bg-slate-800">
            Merge (M)
          </Button>
          <Button onClick={newPrompt} className="bg-slate-900 text-white hover:bg-slate-800">
            New Prompt (N)
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            nodeTypes={{ chatNode: (props) => <ChatTreeNode {...props} /> }}
            onNodeClick={(_, node) => setSelectedNodeId(String(node.id))}
            className="bg-slate-50"
            onlyRenderVisibleElements
            nodesDraggable={!largeGraph}
            nodesConnectable={false}
            panOnScroll
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap pannable zoomable className="!bg-white/80" />
            <Controls showInteractive={false} />
            <Background gap={32} color="#ddd" />
          </ReactFlow>
        </div>

        <aside className="w-96 border-l bg-white">
          <Card className="m-4 h-[calc(100%-32px)] overflow-hidden rounded-2xl border bg-white shadow-lg">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Inspector</h2>
              <p className="text-xs text-slate-500">
                {selectedDetail ? `Selected ${selectedDetail.path}` : "Select a node"}
              </p>
              <div className="mt-3 flex gap-2">
                {TABS.map((tab) => (
                  <Button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      activeTab === tab ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <div className="h-full overflow-hidden">
              {selectedDetail ? (
                <div className="h-full overflow-auto px-4 py-3 text-sm">
                  {activeTab === "preview" && (
                    <div className="space-y-4">
                      {selectedSectionAnchors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedSectionAnchors.map((section) => (
                            <Button
                              key={section.key}
                              onClick={() => scrollToSection(section.key)}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              {section.title}
                            </Button>
                          ))}
                        </div>
                      )}
                      {virtualizationEnabled ? (
                        <Virtuoso
                          ref={virtuosoRef}
                          style={{ height: "60vh" }}
                          data={selectedSections}
                          itemContent={(index, section) => (
                            <motion.section
                              key={section.key}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              transition={{ duration: 0.16, ease: "easeOut" }}
                            >
                              <h3 className="text-sm font-semibold">{section.title || section.key}</h3>
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{section.markdown ?? ""}</ReactMarkdown>
                              </div>
                            </motion.section>
                          )}
                        />
                      ) : (
                        <div className="space-y-6">
                          {selectedSections.map((section) => (
                            <motion.section
                              key={section.key}
                              id={`section-${section.key}`}
                              className="scroll-mt-16"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              transition={{ duration: 0.16, ease: "easeOut" }}
                            >
                              <h3 className="text-sm font-semibold">{section.title || section.key}</h3>
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{section.markdown ?? ""}</ReactMarkdown>
                              </div>
                            </motion.section>
                          ))}
                        </div>
                      )}
                      {!selectedSections.length && selectedDetail.responseMd && (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{selectedDetail.responseMd}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "json" && (
                    <pre className="overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-50">
                      {selectedDetail.responseJson
                        ? JSON.stringify(selectedDetail.responseJson, null, 2)
                        : "No JSON available"}
                    </pre>
                  )}

                  {activeTab === "meta" && (
                    <div className="space-y-3">
                      <MetaRow label="Path" value={selectedDetail.path} />
                      <MetaRow
                        label="Parent"
                        value={selectedDetail.parentId ? nodeDetails[selectedDetail.parentId]?.path ?? "—" : "—"}
                      />
                      <MetaRow label="Model" value={selectedDetail.model || "—"} />
                      <MetaRow label="Preset" value={selectedDetail.preset || "—"} />
                      <MetaRow label="Created" value={new Date(selectedDetail.createdAt).toLocaleString()} />
                    </div>
                  )}

                  {activeTab === "activity" && (
                    <div className="space-y-3">
                      {merges.length === 0 ? (
                        <p className="text-xs text-slate-500">No merges yet.</p>
                      ) : (
                        <ul className="space-y-3 text-xs">
                          {merges.map((merge) => (
                            <li key={merge.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                                <span>{merge.strategy}</span>
                                <span>{new Date(merge.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="mt-2 space-y-1 text-slate-700">
                                <p>
                                  Target <span className="font-semibold">{merge.targetNodeId.slice(0, 8)}</span>
                                </p>
                                <p>
                                  Base <span className="font-medium">{merge.baseNodeId.slice(0, 8)}</span> · Left {merge.leftNodeId.slice(0, 8)} · Right {merge.rightNodeId.slice(0, 8)}
                                </p>
                                {merge.conflicts && merge.conflicts.length > 0 && (
                                  <p className="text-rose-500">Conflicts: {merge.conflicts.join(", ")}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-xs text-slate-500">
                  Select a node to inspect its details.
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <DiffDialog
        state={diffDialog}
        onClose={() => setDiffDialog({ open: false, leftId: null, rightId: null, sections: [], loading: false })}
        details={nodeDetails}
        onTakeLeft={(key) => setPendingSectionsMap((prev) => ({ ...prev, [key]: "left" }))}
        onTakeRight={(key) => setPendingSectionsMap((prev) => ({ ...prev, [key]: "right" }))}
      />

      <MergeDialog
        state={mergeDialog}
        onClose={() => setMergeDialog({ open: false, baseId: null, leftId: null, rightId: null, mode: "manual", sectionsMap: {}, submitting: false })}
        sections={mergeSectionRows}
        defaults={mergeDefaults}
        onChangeMode={(mode) => setMergeDialog((prev) => ({ ...prev, mode }))}
        onChangeBase={(baseId) => setMergeDialog((prev) => ({ ...prev, baseId }))}
        onChangeChoice={(key, choice) =>
          setMergeDialog((prev) => ({
            ...prev,
            sectionsMap: {
              ...prev.sectionsMap,
              [key]: choice,
            },
          }))
        }
        onSubmit={async () => {
          if (!mergeDialog.leftId || !mergeDialog.rightId || !mergeDialog.baseId) return;
          setMergeDialog((prev) => ({ ...prev, submitting: true }));
          try {
            const payload: any = {
              leftNodeId: mergeDialog.leftId,
              rightNodeId: mergeDialog.rightId,
              strategy: mergeDialog.mode,
            };
            if (mergeDialog.mode === "manual") {
              payload.baseNodeId = mergeDialog.baseId;
              payload.sectionsMap = mergeDialog.sectionsMap;
            }
            const result: any = await api.post(`/chat/sessions/${sessionId}/merge`, payload);
            toast.success("Merged successfully");
            setMergeDialog({
              open: false,
              baseId: null,
              leftId: null,
              rightId: null,
              mode: "manual",
              sectionsMap: {},
              submitting: false,
            });
            await refreshTree();
            await refreshMerges();
            if (result?.targetNodeId) {
              setSelectedNodeId(result.targetNodeId);
              await ensureNodeDetail(result.targetNodeId);
            }
          } catch (error) {
            toastApiError(error, () => mergeSelected());
            setMergeDialog((prev) => ({ ...prev, submitting: false }));
          }
        }}
        submitting={mergeDialog.submitting}
        lcaOptions={mergeOptions}
      />
    </div>
  );
}

function ChatTreeNode({ data, selected }: NodeProps) {
  const { node, isRoot, isCurrent, hiddenChildren, onBranch, onCheckout, onDiff, onMerge, onExpandChildren } =
    data as ChatNodeData;
  const [hovered, setHovered] = useState(false);

  const bg = isCurrent
    ? "bg-slate-900 text-white"
    : isRoot
    ? "bg-slate-400 text-white"
    : "bg-purple-100";
  const border = isCurrent ? "border-slate-900" : "border-transparent";

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={`relative h-full w-full rounded-2xl border shadow-lg transition-colors ${bg} ${border} ${selected ? "ring-2 ring-sky-500" : ""}`}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide">
          <span className="font-semibold">{node.path}</span>
          <span className="text-[10px] opacity-70">depth {node.depth}</span>
        </div>
        <div className="text-sm font-medium line-clamp-2 break-all">
          {node.label || node.promptText.slice(0, 40) || "Unnamed"}
        </div>
        <div className="text-[10px] opacity-60">
          {new Date(node.createdAt).toLocaleString()}
        </div>
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute inset-x-2 bottom-2 flex flex-wrap items-center justify-between gap-2 text-xs"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onBranch(node);
              }}
              className="bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 shadow"
            >
              Branch
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onMerge(node);
              }}
              className="bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 shadow"
            >
              Merge
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onCheckout(node);
              }}
              className="bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 shadow"
            >
              Checkout
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDiff(node);
              }}
              className="bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 shadow"
            >
              Diff
            </Button>
            {hiddenChildren > 0 && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandChildren(node);
                }}
                className="bg-slate-900 px-2 py-1 text-xs font-semibold text-white shadow"
              >
                +{Math.min(hiddenChildren, CHILD_PAGE_SIZE)} more
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase text-slate-500">{label}</div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}

type DiffDialogProps = {
  state: DiffDialogState;
  onClose: () => void;
  details: Record<string, ChatNodeDetail>;
  onTakeLeft: (key: string) => void;
  onTakeRight: (key: string) => void;
};

function DiffDialog({ state, onClose, details, onTakeLeft, onTakeRight }: DiffDialogProps) {
  const open = state.open && state.leftId && state.rightId;
  if (!open) return null;

  const left = details[state.leftId!];
  const right = details[state.rightId!];

  return (
    <Modal title="Diff" onClose={onClose}>
      {state.loading ? (
        <p className="text-sm text-slate-500">Calculating diff…</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Comparing <span className="font-semibold">{left?.path ?? state.leftId}</span> ↔{" "}
            <span className="font-semibold">{right?.path ?? state.rightId}</span>
          </div>
          <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Left</th>
                  <th className="px-3 py-2">Right</th>
                  <th className="px-3 py-2">Select</th>
                </tr>
              </thead>
              <tbody>
                {state.sections.map((section) => {
                  const leftText = left?.responseJson?.sections?.find((s) => s.key === section.key)?.markdown ?? "";
                  const rightText = right?.responseJson?.sections?.find((s) => s.key === section.key)?.markdown ?? "";
                  return (
                    <tr key={section.key} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-semibold text-slate-700">{section.key}</td>
                      <td className="px-3 py-2 text-slate-500">{section.status}</td>
                      <td className="px-3 py-2">
                        <div className="rounded bg-white p-2 font-mono text-[11px] text-slate-800">
                          {renderDiffFragments(leftText, rightText, "left")}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="rounded bg-white p-2 font-mono text-[11px] text-slate-800">
                          {renderDiffFragments(leftText, rightText, "right")}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {section.status === "changed" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => onTakeLeft(section.key)}
                              className="bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              Take Left
                            </Button>
                            <Button
                              onClick={() => onTakeRight(section.key)}
                              className="bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                            >
                              Take Right
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

type MergeDialogProps = {
  state: MergeDialogState;
  onClose: () => void;
  sections: MergeSectionRow[];
  defaults: Record<string, "left" | "right" | "merged">;
  onChangeMode: (mode: "auto" | "manual") => void;
  onChangeBase: (baseId: string | null) => void;
  onChangeChoice: (key: string, choice: "left" | "right" | "merged") => void;
  onSubmit: () => void;
  submitting: boolean;
  lcaOptions: ChatNodeDTO[];
};

function MergeDialog({
  state,
  onClose,
  sections,
  defaults,
  onChangeMode,
  onChangeBase,
  onChangeChoice,
  onSubmit,
  submitting,
  lcaOptions,
}: MergeDialogProps) {
  if (!state.open || !state.leftId || !state.rightId) return null;

  return (
    <Modal title="Merge" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 gap-3 text-xs text-slate-600 md:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase text-slate-500">Mode</div>
            <div className="mt-1 flex gap-2">
              <Button
                onClick={() => onChangeMode("auto")}
                className={`rounded-full px-3 py-1 font-medium ${
                  state.mode === "auto" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                Auto
              </Button>
              <Button
                onClick={() => onChangeMode("manual")}
                className={`rounded-full px-3 py-1 font-medium ${
                  state.mode === "manual" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                Manual
              </Button>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-slate-500">Base</div>
            <select
              value={state.baseId ?? ''}
              onChange={(event) => onChangeBase(event.target.value || null)}
              className="mt-1 w-full rounded border border-slate-200 px-3 py-1 text-sm"
            >
              {lcaOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.path}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state.mode === "manual" && (
          <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Left</th>
                  <th className="px-3 py-2">Right</th>
                  <th className="px-3 py-2">Choice</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => {
                  const choice = state.sectionsMap[section.key] ?? defaults[section.key];
                  const conflict = section.leftMd !== section.rightMd;
                  return (
                    <tr key={section.key} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-semibold text-slate-700">{section.title}</td>
                      <td className="px-3 py-2">
                        <div className="rounded bg-white p-2 font-mono text-[11px] text-slate-800">
                          {section.leftMd || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="rounded bg-white p-2 font-mono text-[11px] text-slate-800">
                          {section.rightMd || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {(["left", "right", "merged"] as const).map((option) => (
                            <Button
                              key={option}
                              onClick={() => onChangeChoice(section.key, option)}
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                choice === option ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {option.toUpperCase()}
                            </Button>
                          ))}
                          {conflict && <span className="text-[10px] uppercase text-rose-500">Conflict</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onSubmit} disabled={submitting} className="bg-slate-900 text-white">
            {submitting ? "Merging…" : "Create merged version"}
          </Button>
          <Button onClick={onClose} className="bg-white text-slate-700">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
              Close
            </button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto px-6 py-4">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function renderDiffFragments(textLeft: string, textRight: string, side: "left" | "right") {
  const diffs = dmp.diff_main(textLeft, textRight) as [number, string][];
  dmp.diff_cleanupSemantic(diffs);
  return diffs
    .filter(([op]) => (side === "left" ? op !== 1 : op !== -1))
    .map(([op, text], index) => {
      const className =
        op === 0
          ? ""
          : op === -1
          ? "bg-rose-100 text-rose-700"
          : "bg-emerald-100 text-emerald-700";
      return (
        <span key={index} className={`whitespace-pre-wrap ${className}`}>
          {text}
        </span>
      );
    });
}

function findLcaNode(left: ChatNodeDTO, right: ChatNodeDTO, nodeMap: Map<string, ChatNodeDTO>) {
  const leftSegments = left.path.split(".");
  const rightSegments = right.path.split(".");
  const length = Math.min(leftSegments.length, rightSegments.length);
  let lcaPath = leftSegments[0];
  for (let i = 0; i < length; i++) {
    if (leftSegments[i] === rightSegments[i]) {
      lcaPath = leftSegments.slice(0, i + 1).join(".");
    } else {
      break;
    }
  }
  return Array.from(nodeMap.values()).find((node) => node.path === lcaPath) ?? left;
}
