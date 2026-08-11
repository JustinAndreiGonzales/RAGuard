"use client";

import { TriangleAlert } from "lucide-react";
import Modal from "../simple/Modal";

type ConfirmDeleteModalProps = {
  itemLabel: string;
  consequenceText: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

const ConfirmDeleteModal = ({
  itemLabel,
  consequenceText,
  onClose,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteModalProps) => {
  return (
    <Modal
      size="sm"
      title={`Delete ${itemLabel}?`}
      onClose={onClose}
      primaryLabel={isLoading ? "Deleting…" : "Delete"}
      primaryVariant="danger"
      primaryDisabled={isLoading}
      onPrimaryAction={onConfirm}
      hasSecondButton
      secondaryLabel="Cancel"
    >
      <div className="flex items-start gap-sm">
        <TriangleAlert className="h-[20px] w-[20px] shrink-0 text-danger-default" />
        <p className="type-body text-secondary">{consequenceText}</p>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
