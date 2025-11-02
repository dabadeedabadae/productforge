// admin-frontend/src/app/admin/chat/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/Button";

type ChatSession = {
  id: number;
  title: string;
  updatedAt: string;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // загрузка сессий
  const loadSessions = async () => {
    const data = await api.get("/ai/chat/sessions");
    setSessions(data);
    if (data.length && !activeId) {
      setActiveId(data[0].id);
    }
  };

  // загрузка сообщений выбранной сессии
  const loadMessages = async (id: number) => {
    const data = await api.get(`/ai/chat/sessions/${id}`);
    setMessages(data.messages);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
    }
  }, [activeId]);

  const handleNewChat = async () => {
    const chat = await api.post("/ai/chat/sessions", { title: "new chat" });
    await loadSessions();
    setActiveId(chat.id);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!activeId || !input.trim()) return;
    setSending(true);
    // сначала показываем своё сообщение
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const text = input;
    setInput("");

    try {
      const res = await api.post(`/ai/chat/sessions/${activeId}/messages`, {
        content: text,
      });
      // res — это ассистент
      const assistant: ChatMessage = {
        id: res.id ?? Date.now() + 1,
        role: "assistant",
        content: res.content,
        createdAt: res.createdAt ?? new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistant]);
      // обновить список чатов (updatedAt)
      loadSessions();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* sidebar */}
      <div className="w-64 border-r bg-slate-50 flex flex-col">
        <div className="p-3 flex justify-between items-center">
          <div className="font-semibold">Chats</div>
          <Button size="sm" onClick={handleNewChat}>
            +
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`w-full text-left px-3 py-2 hover:bg-slate-200 ${
                activeId === s.id ? "bg-slate-200" : ""
              }`}
            >
              <div className="text-sm font-medium truncate">{s.title}</div>
              <div className="text-xs text-slate-500">
                {new Date(s.updatedAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* chat area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b px-4 py-3 flex justify-between items-center">
          <div className="font-semibold">AI chat</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[70%] rounded px-3 py-2 ${
                m.role === "user"
                  ? "ml-auto bg-blue-500 text-white"
                  : "bg-slate-200"
              }`}
            >
              {m.content}
            </div>
          ))}
          {!messages.length && (
            <div className="text-slate-400 text-sm">Начни диалог…</div>
          )}
        </div>
        <div className="border-t px-4 py-3 flex gap-3">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Опиши, что нужно сгенерировать..."
          />
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
