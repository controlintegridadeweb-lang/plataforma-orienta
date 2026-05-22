import { WorkflowState } from "./types";

const transitions: Record<WorkflowState, WorkflowState[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "draft"],
  under_review: ["complementation_requested", "consolidated"],
  complementation_requested: ["resubmitted"],
  resubmitted: ["under_review"],
  consolidated: ["closed"],
  closed: ["draft"],
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return transitions[from].includes(to);
}
