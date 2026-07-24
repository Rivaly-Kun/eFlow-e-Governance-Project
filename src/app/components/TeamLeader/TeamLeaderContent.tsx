import { DeptHeadContent } from "../DeptHead/DeptHeadContent";

export function TeamLeaderContent({
  activeSection,
  activePage,
}: {
  activeSection?: string;
  activePage?: string;
}) {
  return (
    <DeptHeadContent
      activeSection={activeSection || "command"}
      activePage={activePage}
    />
  );
}

export default TeamLeaderContent;
