import type { ValidationIssue } from "../model/types";

type ModalAction = {
  label: string;
  onClick: () => void;
};

type ErrorModalProps = {
  title: string;
  issues: ValidationIssue[];
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  onClose: () => void;
};

const ErrorModal = ({
  title,
  issues,
  primaryAction,
  secondaryAction,
  onClose,
}: ErrorModalProps) => {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal>
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn small" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {issues.map((issue, index) => (
            <div key={`${issue.message}-${index}`} className="modal-issue">
              <div className="modal-issue-message">{issue.message}</div>
              {(issue.fieldPath || issue.id) && (
                <div className="modal-issue-meta">
                  {issue.fieldPath && <span>字段：{issue.fieldPath}</span>}
                  {issue.id && <span>id：{issue.id}</span>}
                </div>
              )}
              {issue.suggestion && (
                <div className="modal-issue-suggestion">{issue.suggestion}</div>
              )}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          {secondaryAction && (
            <button className="btn ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button className="btn primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
