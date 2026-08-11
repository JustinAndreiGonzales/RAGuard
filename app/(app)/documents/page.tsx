"use client";

import {
  FileText,
  Minus,
  Share2,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AxiosProgressEvent } from "axios";
import ConfirmDeleteModal from "@/components/compound/ConfirmDeleteModal";
import ShareModal from "@/components/compound/ShareModal";
import { useToast } from "@/components/providers/ToastProvider";
import Avatar from "@/components/simple/Avatar";
import Button from "@/components/simple/Button";
import EmptyState from "@/components/simple/EmptyState";
import FileTypeTag from "@/components/simple/FileTypeTag";
import Modal from "@/components/simple/Modal";
import StatusBadge from "@/components/simple/StatusBadge";
import Table, { Column } from "@/components/simple/Table";
import VisibilityToggle from "@/components/simple/VisibilityToggle";
import { getErrorMessage } from "@/lib/api/errors";
import type { DocumentListItem, FileType, Visibility } from "@/lib/api/types";
import { formatFileSize, formatRelativeTime, getInitials } from "@/lib/format";
import {
  useDeleteDocumentMutation,
  useDocumentQuery,
  useDocumentsQuery,
  useUploadDocumentMutation,
} from "@/lib/hooks/useDocuments";

type UploadStage = "idle" | "file-selected" | "uploading" | "polling";

const FILE_TYPE_BY_EXTENSION: Record<string, FileType> = {
  pdf: "pdf",
  txt: "txt",
  docx: "docx",
  md: "md",
};

const inferFileType = (fileName: string): FileType => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return FILE_TYPE_BY_EXTENSION[ext] ?? "txt";
};

const DocumentsPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const me = session?.user;

  const documentsQuery = useDocumentsQuery();
  const uploadMutation = useUploadDocumentMutation();
  const deleteMutation = useDeleteDocumentMutation();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDocumentId, setUploadDocumentId] = useState<string | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState<Visibility>("private");
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPollQuery = useDocumentQuery(uploadDocumentId, {
    enabled: uploadStage === "polling",
  });

  const rows = documentsQuery.data ?? [];

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setUploadStage("file-selected");
  };

  const resetSelectedFile = () => {
    setSelectedFile(null);
    setUploadStage("idle");
    setUploadProgress(0);
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setUploadStage("idle");
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadDocumentId(null);
    setUploadVisibility("private");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    setUploadStage("uploading");
    setUploadProgress(0);

    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        visibility: me?.role === "admin" ? uploadVisibility : undefined,
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });
      setUploadDocumentId(result.documentId);
      setUploadStage("polling");
    } catch {
      setUploadStage("file-selected");
    }
  };

  const uploadTerminalStatus =
    uploadStage === "polling" &&
    (uploadPollQuery.data?.status === "ready" || uploadPollQuery.data?.status === "failed");

  const handlePrimaryAction = () => {
    if (uploadStage === "file-selected") {
      startUpload();
    } else if (uploadTerminalStatus) {
      closeUploadModal();
    }
  };

  const primaryDisabled =
    uploadStage === "idle" ||
    uploadStage === "uploading" ||
    (uploadStage === "polling" && !uploadTerminalStatus);

  const primaryLabel =
    uploadStage === "uploading"
      ? "Uploading…"
      : uploadTerminalStatus
        ? "Done"
        : "Upload";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      showToast("success", `${deleteTarget.title} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const columns: Column<DocumentListItem>[] = useMemo(
    () => [
      {
        key: "title",
        label: "Title",
        render: (_v, row) => (
          <div className="flex items-center gap-sm min-w-0">
            <FileTypeTag text={row.fileType.toUpperCase()} />
            <span className="type-body text-primary truncate">{row.title}</span>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (v) => <StatusBadge status={v as DocumentListItem["status"]} />,
      },
      {
        key: "owner",
        label: "Owner",
        render: (_v, row) => (
          <div className="flex items-center gap-xs min-w-0">
            <Avatar size="sm" initials={getInitials(row.owner)} />
            <span className="type-body-sm text-primary truncate">{row.owner}</span>
          </div>
        ),
      },
      {
        key: "sharedVia",
        label: "Shared via",
        render: (_v, row) => {
          const Icon =
            row.sharedVia === "team" ? Users : row.sharedVia === "user" ? UserPlus : Minus;
          const label =
            row.sharedVia === "team"
              ? `Team - ${row.sharedName ?? "Unknown"}`
              : row.sharedVia === "user"
                ? "Direct"
                : "—";
          return (
            <div className="flex items-center gap-xs text-secondary">
              <Icon className="h-md w-md shrink-0" />
              <span className="type-body-sm truncate">{label}</span>
            </div>
          );
        },
      },
      {
        key: "createdAt",
        label: "Uploaded",
        render: (v) => (
          <span className="type-caption text-tertiary">
            {formatRelativeTime(new Date(v as string))}
          </span>
        ),
      },
      {
        key: "id",
        label: "Actions",
        align: "right",
        render: (_v, row) => {
          const canManage = me?.role === "admin" || row.owner === me?.name;
          if (!canManage) return null;
          return (
            <div className="flex items-center gap-xs justify-end">
              <Button
                variant="ghost"
                size="sm"
                icon="leading"
                iconElement={<Share2 className="h-md w-md" />}
                aria-label={`Share ${row.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShareTarget({ id: row.id, title: row.title });
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                icon="leading"
                iconElement={<Trash2 className="h-md w-md" />}
                aria-label={`Delete ${row.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: row.id, title: row.title });
                }}
              />
            </div>
          );
        },
      },
    ],
    [me?.role, me?.name],
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  return (
    <div className="p-xl">
      {!documentsQuery.isLoading && rows.length === 0 ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <EmptyState
            icon={<FileText />}
            heading="No documents yet"
            body="Upload a document to get started."
            ctaLabel="Upload document"
            onCtaClick={() => setUploadModalOpen(true)}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-xl">
            <h1 className="type-h1 text-primary">Documents</h1>
            <Button
              variant="primary"
              icon="leading"
              iconElement={<Upload className="h-md w-md" />}
              onClick={() => setUploadModalOpen(true)}
            >
              Upload
            </Button>
          </div>
          <Table<DocumentListItem>
            columns={columns}
            data={rows}
            keyField="id"
            onRowClick={(row) => router.push(`/documents/${row.id}`)}
          />
        </>
      )}

      {uploadModalOpen && (
        <Modal
          size="md"
          title="Upload document"
          onClose={closeUploadModal}
          primaryLabel={primaryLabel}
          primaryDisabled={primaryDisabled}
          onPrimaryAction={handlePrimaryAction}
          hasSecondButton
          secondaryLabel="Cancel"
        >
          <div className="flex flex-col gap-md">
            {uploadStage === "idle" ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border border-dashed border-line rounded-lg p-2xl flex flex-col items-center gap-xs text-center cursor-pointer hover:bg-canvas"
              >
                <Upload className="h-[32px] w-[32px] text-tertiary" />
                <p className="type-body text-primary">
                  Drag a file here or click to browse
                </p>
                <p className="type-caption text-tertiary">
                  PDF, TXT, DOCX, or MD — up to 20MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx,.md"
                  hidden
                  onChange={handleInputChange}
                />
              </div>
            ) : (
              <div className="flex items-center gap-sm p-sm border border-line rounded-md">
                <FileTypeTag text={inferFileType(selectedFile!.name).toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <p className="type-body-sm text-primary truncate">
                    {selectedFile!.name}
                  </p>
                  <p className="type-caption text-tertiary">
                    {formatFileSize(selectedFile!.size)}
                  </p>
                </div>
                {uploadStage === "file-selected" && (
                  <button
                    type="button"
                    onClick={resetSelectedFile}
                    aria-label="Remove file"
                    className="shrink-0 text-tertiary hover:text-primary transition-colors"
                  >
                    <X className="h-md w-md" />
                  </button>
                )}
              </div>
            )}

            {uploadStage === "file-selected" && me?.role === "admin" && (
              <VisibilityToggle
                value={uploadVisibility}
                onChange={setUploadVisibility}
              />
            )}

            {uploadStage === "uploading" && (
              <div className="h-2xs w-full rounded-full bg-canvas overflow-hidden">
                <div
                  className="h-full bg-accent-default transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {uploadStage === "polling" && (
              <StatusBadge status={uploadPollQuery.data?.status ?? "pending"} />
            )}
          </div>
        </Modal>
      )}

      {shareTarget && (
        <ShareModal
          documentId={shareTarget.id}
          documentTitle={shareTarget.title}
          onClose={() => setShareTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemLabel={deleteTarget.title}
          consequenceText="This document and its chunks will be permanently removed."
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
