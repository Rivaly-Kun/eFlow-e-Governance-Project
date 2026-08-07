import * as Icons from "lucide-react";
import { CallModal } from "../../../components/ui/CallModal";
import { ActiveChatPanel } from "./ActiveChatPanel";
import { ChatChannelList } from "./ChatChannelList";
import { ChatDrawerProvider, useChatDrawer } from "./ChatDrawerContext";
import { ChatReactionsModal } from "./ChatReactionsModal";

export interface ChatListDrawerProps {
  userId?: string;
  userName?: string;
  userOrgId?: string;
}

function ChatDrawerRoot() {
  const {
    open, setOpen, activeChannelId, buttonRef, panelRef, panelPos, panelSize,
    isFullscreen, startResize, unreadTotal, outgoingCall, setOutgoingCall,
  } = useChatDrawer();

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
      >
        <Icons.MessageCircle size={17} />
        {unreadTotal > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
            {unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={
            isFullscreen
              ? {
                  position: "fixed",
                  inset: 0,
                  width: "100vw",
                  height: "100vh",
                  zIndex: 9999,
                  borderRadius: 0,
                }
              : {
                  position: "fixed",
                  left: panelPos?.x ?? 80,
                  top: panelPos?.y ?? 80,
                  width: panelSize.w,
                  height: panelSize.h,
                  zIndex: 9999,
                  minWidth: 280,
                  minHeight: 320,
                }
          }
          className="bg-white border border-neutral-200 shadow-2xl overflow-hidden flex flex-col rounded-xl"
        >

          {!activeChannelId ? <ChatChannelList /> : <ActiveChatPanel />}
          {/* Resize Handle Ball */}
          {!isFullscreen && (
            <div
              onMouseDown={startResize}
              className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-neutral-300 hover:bg-blue-400 cursor-nwse-resize flex items-center justify-center transition-colors shadow z-50 select-none"
              title="Drag to resize"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="6" cy="6" r="1.2" fill="white" opacity="0.9" />
                <circle cx="3" cy="6" r="1.2" fill="white" opacity="0.6" />
                <circle cx="6" cy="3" r="1.2" fill="white" opacity="0.6" />
              </svg>
            </div>
          )}
        </div>
      )}
      {outgoingCall && (
        <CallModal call={outgoingCall} isCaller onClose={() => setOutgoingCall(null)} />
      )}


      <ChatReactionsModal />
    </div>
  );
}

export function ChatListDrawer(props: ChatListDrawerProps) {
  if (!props.userId) return null;
  return (
    <ChatDrawerProvider {...props}>
      <ChatDrawerRoot />
    </ChatDrawerProvider>
  );
}

export default ChatListDrawer;
