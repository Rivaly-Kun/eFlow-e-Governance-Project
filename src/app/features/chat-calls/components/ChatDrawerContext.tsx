import { createContext, useContext, type ReactNode } from "react";
import { useChatDrawerController, type ChatDrawerUser } from "../hooks/useChatDrawerController";

type ChatDrawerValue = ReturnType<typeof useChatDrawerController>;
const ChatDrawerContext = createContext<ChatDrawerValue | null>(null);

export function ChatDrawerProvider({ children, ...user }: ChatDrawerUser & { children: ReactNode }) {
  const value = useChatDrawerController(user);
  return <ChatDrawerContext.Provider value={value}>{children}</ChatDrawerContext.Provider>;
}

export function useChatDrawer() {
  const value = useContext(ChatDrawerContext);
  if (!value) throw new Error("useChatDrawer must be used inside ChatDrawerProvider");
  return value;
}
