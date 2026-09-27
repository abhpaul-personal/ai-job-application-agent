"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { FitAnalysis } from "@/lib/schema";

interface ChatAnalysisStatus {
  analysis: FitAnalysis | null;
  setAnalysis: (analysis: FitAnalysis | null) => void;
}

const ChatAnalysisContext = createContext<ChatAnalysisStatus | null>(null);

// The chat assistant is mounted once at the app layout (GlobalChatAssistant)
// so it's available on every page, not forked per page. Only /agent has a
// "current analysis" in scope, so it publishes it here rather than the
// assistant living inside that one page — this is the seam that keeps
// "why did this score X" working on the analysis page specifically.
export function ChatAnalysisProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState<FitAnalysis | null>(null);
  return (
    <ChatAnalysisContext.Provider value={{ analysis, setAnalysis }}>
      {children}
    </ChatAnalysisContext.Provider>
  );
}

export function useChatAnalysis(): ChatAnalysisStatus {
  const ctx = useContext(ChatAnalysisContext);
  if (!ctx) {
    throw new Error("useChatAnalysis must be used within a ChatAnalysisProvider");
  }
  return ctx;
}
