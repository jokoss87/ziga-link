import { useState } from "react";
import BugReportModal from "./BugReportModal";

export default function BugReportButton({ currentPageName, userEmail, userId }) {
  const [open, setOpen] = useState(false);

  if (!userEmail) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-28 right-4 z-40 w-10 h-10 rounded-full bg-stone-700/60 hover:bg-stone-700/90 flex items-center justify-center shadow-md transition-all"
        title="Signaler un bug"
        style={{ backdropFilter: "blur(4px)" }}
      >
        <span className="text-base">🛠</span>
      </button>

      {open && (
        <BugReportModal
          currentPageName={currentPageName}
          userEmail={userEmail}
          userId={userId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}