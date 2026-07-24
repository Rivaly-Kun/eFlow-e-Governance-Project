import { EmployeeContent } from "../Employee/EmployeeContent";

export function TeamLeaderContent({
  activeSection,
  activePage,
}: {
  activeSection?: string;
  activePage?: string;
}) {
  return (
    <EmployeeContent
      activeSection={activeSection || "tasks"}
      activePage={activePage}
    />
  );
}

export default TeamLeaderContent;
