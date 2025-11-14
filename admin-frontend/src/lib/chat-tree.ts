import api from "./api";

export type Section = { key: string; title: string; markdown: string; [k: string]: any };
export type DocJson = { version: string; meta: Record<string, any>; sections: Section[] };

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatNodeDTO = {
  id: string;
  parentId?: string | null;
  path: string;
  depth: number;
  siblingIndex: number;
  label?: string | null;
  promptText: string;
  model?: string | null;
  preset?: string | null;
  responseMd?: string | null;
  responseJson?: DocJson | null;
  meta?: Record<string, any> | null;
  createdAt: string;
};

export type ChatTreeResponse = {
  session: {
    id: string;
    title: string;
    rootNodeId?: string | null;
    currentNodeId?: string | null;
  };
  nodes: ChatNodeDTO[];
};

export type ChatNodeDetail = ChatNodeDTO;

export type MergeOperationDTO = {
  id: string;
  sessionId: string;
  targetNodeId: string;
  baseNodeId: string;
  leftNodeId: string;
  rightNodeId: string;
  strategy: string;
  sectionsMap: Record<string, string>;
  conflicts?: string[] | null;
  createdAt: string;
};

export async function fetchChatSessions(): Promise<ChatSessionSummary[]> {
  return api.get(`/chat/sessions`);
}

export async function fetchChatTree(sessionId: string): Promise<ChatTreeResponse> {
  return api.get(`/chat/sessions/${sessionId}/tree`);
}

export async function fetchChatNode(sessionId: string, nodeId: string): Promise<ChatNodeDetail> {
  return api.get(`/chat/sessions/${sessionId}/nodes/${nodeId}`);
}

export async function fetchMergeOperations(sessionId: string): Promise<MergeOperationDTO[]> {
  return api.get(`/chat/sessions/${sessionId}/merges`);
}

export async function createChatNode(
  sessionId: string,
  payload: {
    parentId?: string;
    promptText: string;
    label?: string;
    model?: string;
    preset?: string;
  }
) {
  return api.post(`/chat/sessions/${sessionId}/nodes`, payload);
}

export async function checkoutChatNode(sessionId: string, nodeId: string) {
  return api.post(`/chat/sessions/${sessionId}/nodes/${nodeId}/checkout`, {});
}

export async function diffChatNodes(
  sessionId: string,
  leftNodeId: string,
  rightNodeId: string
): Promise<{ sections: Array<{ key: string; status: string; patches?: any }> }> {
  return api.get(`/chat/sessions/${sessionId}/diff?left=${leftNodeId}&right=${rightNodeId}`);
}
