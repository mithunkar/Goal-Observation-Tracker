"use client";

type ArchiveStudentButtonProps = {
  action: () => Promise<void>;
  studentName: string;
};

export function ArchiveStudentButton({
  action,
  studentName,
}: ArchiveStudentButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Remove ${studentName} from the active roster? Their goals and collected data will be kept.`,
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button className="danger-action" type="submit">
        Remove student
      </button>
    </form>
  );
}
