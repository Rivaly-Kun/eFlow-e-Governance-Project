import * as Icons from "lucide-react";
import { useChatDrawer } from "./ChatDrawerContext";

export function ChatReactionsModal() {
  const {
    reactionsModalContent, setReactionsModalContent,
    activeReactionTab, setActiveReactionTab,
  } = useChatDrawer();
  return <>
{/* Detailed Reactions Modal */}
      {reactionsModalContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100000] p-4 animate-fade-in">
          <div className="bg-[#242526] text-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[400px] border border-neutral-800 overflow-hidden font-['Lexend:Regular',_sans-serif]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#242526]">
              <span className="text-[14px] font-bold">Message reactions</span>
              <button
                onClick={() => setReactionsModalContent(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 transition cursor-pointer"
              >
                <Icons.X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 px-4 border-b border-neutral-800 bg-[#18191a] shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveReactionTab("all")}
                className={`py-2.5 px-1 text-[12px] font-semibold border-b-2 transition-all cursor-pointer ${
                  activeReactionTab === "all"
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                All {reactionsModalContent.all.length}
              </button>
              {Object.entries(reactionsModalContent.byEmoji).map(
                ([emoji, users]) => {
                  const count = (users as string[]).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={emoji}
                      onClick={() => setActiveReactionTab(emoji)}
                      className={`py-2.5 px-1 text-[12px] font-semibold border-b-2 transition-all flex items-center gap-1 cursor-pointer ${
                        activeReactionTab === emoji
                          ? "border-blue-500 text-blue-500"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <span className="text-[14px]">{emoji}</span>
                      <span>{count}</span>
                    </button>
                  );
                },
              )}
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#242526]">
              {(activeReactionTab === "all"
                ? reactionsModalContent.all
                : reactionsModalContent.all.filter(
                    (item: any) => item.emoji === activeReactionTab,
                  )
              ).map((item: any, idx: number) => {
                const initials =
                  item.name
                    .split(" ")
                    .map((p: string) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "?";
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-750 text-neutral-200 text-[10px] font-bold flex items-center justify-center border border-neutral-700 shadow-xs">
                        {initials}
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-neutral-100">
                          {item.name}
                        </div>
                        <div className="text-[9px] text-neutral-400">
                          Click to view profile
                        </div>
                      </div>
                    </div>
                    <span className="text-[18px]">{item.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
  </>;
}
