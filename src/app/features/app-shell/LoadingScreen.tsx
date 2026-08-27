import { Avatar, Loader } from "@vibe/core";
import { Workspace } from "@vibe/icons";

export function LoadingScreen() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading eFlow"
      className="flex min-h-screen w-full items-center justify-center"
      style={{ background: "var(--allgrey-background-color)", color: "var(--primary-text-color)", fontFamily: "var(--font-family)" }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <Avatar
          aria-hidden
          backgroundColor="primary"
          icon={Workspace}
          size="large"
          type="icon"
        />
        <div className="flex items-center gap-2">
          <Loader size="small" />
          <span style={{ color: "var(--secondary-text-color)", font: "var(--font-text2-normal)" }}>Loading eFlow…</span>
        </div>
      </div>
    </main>
  );
}
