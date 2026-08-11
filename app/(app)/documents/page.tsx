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
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Avatar from "@/components/simple/Avatar";
import Button from "@/components/simple/Button";
import EmptyState from "@/components/simple/EmptyState";
import FileTypeTag from "@/components/simple/FileTypeTag";
import Modal from "@/components/simple/Modal";
import StatusBadge from "@/components/simple/StatusBadge";
import Table, { Column } from "@/components/simple/Table";
import Toast from "@/components/simple/Toast";
import { formatFileSize, formatRelativeTime, getInitials } from "@/lib/format";
import {
  getDocumentOwner,
  getDocumentSharedVia,
  mockCurrentUser,
  mockDocuments,
  type MockDocument,
} from "@/lib/mock/data";

type DocumentTableRow = MockDocument & {
  ownerName: string;
  ownerInitials: string;
  sharedVia: { kind: "direct" | "team" | "none"; label: string };
};

type UploadStage =
  | "idle"
  | "file-selected"
  | "uploading"
  | "pending"
  | "processing"
  | "ready"
  | "failed";

const FILE_TYPE_BY_EXTENSION: Record<string, MockDocument["fileType"]> = {
  pdf: "pdf",
  txt: "txt",
  docx: "docx",
  md: "md",
};

const inferFileType = (fileName: string): MockDocument["fileType"] => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return FILE_TYPE_BY_EXTENSION[ext] ?? "txt";
};

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<MockDocument[]>(() => [
    ...mockDocuments,
  ]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{
    variant: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rows: DocumentTableRow[] = useMemo(
    () =>
      documents.map((doc) => {
        const owner = getDocumentOwner(doc);
        return {
          ...doc,
          ownerName: owner.name ?? owner.email,
          ownerInitials: getInitials(owner.name ?? owner.email),
          sharedVia: getDocumentSharedVia(doc),
        };
      }),
    [documents],
  );

  const updateDocumentStatus = (
    id: string,
    status: MockDocument["status"],
    processingError: string | null = null,
  ) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status, processingError, updatedAt: new Date() }
          : d,
      ),
    );
  };

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startUpload = () => {
    if (!selectedFile) return;
    const file = selectedFile;

    setUploadStage("uploading");
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress(Math.min(progress, 100));

      if (progress >= 100) {
        clearInterval(interval);

        const newDocId = crypto.randomUUID();
        const newDoc: MockDocument = {
          id: newDocId,
          ownerId: mockCurrentUser.id,
          visibility: "private",
          title: file.name,
          originalFileName: file.name,
          fileType: inferFileType(file.name),
          storagePath: "",
          fileSizeBytes: file.size,
          status: "pending",
          processingError: null,
          embeddingModel: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setDocuments((prev) => [newDoc, ...prev]);
        setUploadStage("pending");

        setTimeout(() => {
          setUploadStage("processing");
          updateDocumentStatus(newDocId, "processing");

          setTimeout(() => {
            const failed = file.name.toLowerCase().includes("fail");
            const finalStatus = failed ? "failed" : "ready";
            const error = failed ? "Simulated processing failure." : null;
            setUploadStage(finalStatus);
            updateDocumentStatus(newDocId, finalStatus, error);
            if (failed) {
              setToast({
                variant: "error",
                message: `Failed to process ${file.name}.`,
              });
            }
          }, 1200);
        }, 800);
      }
    }, 150);
  };

  const handlePrimaryAction = () => {
    if (uploadStage === "file-selected") {
      startUpload();
    } else if (uploadStage === "ready" || uploadStage === "failed") {
      closeUploadModal();
    }
  };

  const primaryDisabled =
    uploadStage === "idle" ||
    uploadStage === "uploading" ||
    uploadStage === "pending" ||
    uploadStage === "processing";

  const primaryLabel =
    uploadStage === "uploading"
      ? "Uploading…"
      : uploadStage === "ready" || uploadStage === "failed"
        ? "Done"
        : "Upload";

  const columns: Column<DocumentTableRow>[] = [
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
      render: (v) => <StatusBadge status={v as MockDocument["status"]} />,
    },
    {
      key: "ownerName",
      label: "Owner",
      render: (_v, row) => (
        <div className="flex items-center gap-xs min-w-0">
          <Avatar size="sm" initials={row.ownerInitials} />
          <span className="type-body-sm text-primary truncate">
            {row.ownerName}
          </span>
        </div>
      ),
    },
    {
      key: "sharedVia",
      label: "Shared via",
      render: (_v, row) => {
        const Icon =
          row.sharedVia.kind === "team"
            ? Users
            : row.sharedVia.kind === "direct"
              ? UserPlus
              : Minus;
        return (
          <div className="flex items-center gap-xs text-secondary">
            <Icon className="h-md w-md shrink-0" />
            <span className="type-body-sm truncate">{row.sharedVia.label}</span>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Uploaded",
      render: (v) => (
        <span className="type-caption text-tertiary">
          {formatRelativeTime(v as Date)}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (_v, row) => {
        const canManage =
          mockCurrentUser.role === "admin" ||
          row.ownerId === mockCurrentUser.id;
        if (!canManage) return null;
        return (
          <div className="flex items-center gap-xs justify-end">
            <Button
              variant="ghost"
              size="sm"
              icon="leading"
              iconElement={<Share2 className="h-md w-md" />}
              aria-label={`Share ${row.title}`}
              onClick={() => console.log("Share (stub)", row.id)}
            />
            <Button
              variant="ghost"
              size="sm"
              icon="leading"
              iconElement={<Trash2 className="h-md w-md" />}
              aria-label={`Delete ${row.title}`}
              onClick={() => console.log("Delete (stub)", row.id)}
            />
          </div>
        );
      },
    },
  ];

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
      {documents.length === 0 ? (
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
          <Table<DocumentTableRow>
            columns={columns}
            data={rows}
            keyField="id"
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
                <FileTypeTag
                  text={inferFileType(selectedFile!.name).toUpperCase()}
                />
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

            {uploadStage === "uploading" && (
              <div className="h-2xs w-full rounded-full bg-canvas overflow-hidden">
                <div
                  className="h-full bg-accent-default transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {(uploadStage === "pending" ||
              uploadStage === "processing" ||
              uploadStage === "ready" ||
              uploadStage === "failed") && <StatusBadge status={uploadStage} />}
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-lg right-lg z-50">
          <Toast
            variant={toast.variant}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
