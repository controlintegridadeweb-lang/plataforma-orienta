import { ValidationStatus, WorkflowState } from "./types";

type OperationalEvent =
  | "formal_submit"
  | "validation_change"
  | "authorized_reopen"
  | "adjustment_request";

export function shouldReprocessFami(event: OperationalEvent): boolean {
  return (
    event === "formal_submit" ||
    event === "validation_change" ||
    event === "authorized_reopen"
  );
}

export function nextStateFromEvent(
  current: WorkflowState,
  event: OperationalEvent,
): WorkflowState {
  if (event === "formal_submit" && (current === "draft" || current === "resubmitted")) {
    return "submitted";
  }
  if (event === "validation_change" && current === "submitted") {
    return "under_review";
  }
  if (event === "adjustment_request") {
    return "complementation_requested";
  }
  if (event === "authorized_reopen" && current === "closed") {
    return "draft";
  }
  return current;
}

export function validationAffectsScoring(status: ValidationStatus): boolean {
  return (
    status === "approved" ||
    status === "invalidated" ||
    status === "adjustment_requested"
  );
}
