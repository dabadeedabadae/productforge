import ChatTreeClient from "./ChatTreeClient";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export const revalidate = 0;

export default async function ChatTreePage({ params }: PageProps) {
  const { sessionId } = await params;
  const apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/admin";

  const res = await fetch(`${apiBase}/chat/sessions/${sessionId}/tree`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to load chat tree (${res.status})`);
  }

  const tree = await res.json();

  return <ChatTreeClient sessionId={sessionId} initialTree={tree} />;
}
