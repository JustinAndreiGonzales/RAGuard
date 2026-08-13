"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDeleteModal from "@/components/compound/ConfirmDeleteModal";
import ShareModal from "@/components/compound/ShareModal";
import { useToast } from "@/components/providers/ToastProvider";
import Button from "@/components/simple/Button";
import StatusBadge from "@/components/simple/StatusBadge";
import { getErrorMessage } from "@/lib/api/errors";
import { formatFileSize, formatRelativeTime } from "@/lib/format";
import {
  useDeleteDocumentMutation,
  useDocumentChunksQuery,
  useDocumentQuery,
} from "@/lib/hooks/useDocuments";

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-sm">
    <span className="type-label text-tertiary">{label}</span>
    <span className="type-body-sm text-primary truncate">{value}</span>
  </div>
);

const DocumentDetailPage = () => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const me = session?.user;

  const documentQuery = useDocumentQuery(id);
  const chunksQuery = useDocumentChunksQuery(id, { limit: 3, offset: 0 });
  const deleteMutation = useDeleteDocumentMutation();

  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (documentQuery.isLoading) {
    return (
      <div className="p-xl flex items-center justify-center min-h-[400px]">
        <p className="type-body text-tertiary">Loading document…</p>
      </div>
    );
  }

  if (documentQuery.isError || !documentQuery.data) {
    return (
      <div className="p-xl flex flex-col items-center justify-center min-h-[400px] gap-md">
        <p className="type-body text-secondary">
          {getErrorMessage(documentQuery.error)}
        </p>
        <Button variant="secondary" onClick={() => router.push("/documents")}>
          Back to documents
        </Button>
      </div>
    );
  }

  const data = documentQuery.data;
  const canManage = me?.role === "admin" || me?.id === data.owner.id;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast("success", `${data.title} deleted`);
      router.push("/documents");
    } catch (err) {
      showToast("error", getErrorMessage(err));
    }
  };

  const handleViewDocument = () => {
    window.open(`/api/documents/${id}/file`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-2xl flex flex-col gap-lg">
      <Button
        variant="ghost"
        size="sm"
        icon="leading"
        iconElement={<ArrowLeft className="h-md w-md" />}
        onClick={() => router.push("/documents")}
        className="w-fit"
      >
        Back to documents
      </Button>

      {data.status === "failed" && data.processingError && (
        <div className="p-md rounded-md bg-status-failed-bg text-status-failed-fg type-body-sm">
          {data.processingError}
        </div>
      )}

      <h1 className="type-h1 text-primary truncate">{data.title}</h1>

      <div className="grid grid-cols-2 gap-xl items-start">
        <div className="bg-surface rounded-lg p-lg flex flex-col gap-sm">
          <MetaRow label="Owner" value={data.owner.name ?? "Unknown"} />
          <MetaRow label="Type" value={data.fileType.toUpperCase()} />
          <MetaRow label="Size" value={formatFileSize(data.fileSizeBytes)} />
          <div className="flex items-center justify-between">
            <span className="type-label text-tertiary">Status</span>
            <StatusBadge status={data.status} />
          </div>
          <MetaRow
            label="Uploaded"
            value={formatRelativeTime(new Date(data.createdAt))}
          />
          <MetaRow label="Embedding model" value={data.embeddingModel ?? "—"} />
          <MetaRow label="Chunk count" value={String(data.chunkCount)} />

          <div className="flex gap-sm mt-md">
            <Button
              variant="secondary"
              icon="leading"
              iconElement={<ExternalLink className="h-md w-md" />}
              onClick={handleViewDocument}
            >
              View document
            </Button>
            {canManage && (
              <>
                <Button variant="secondary" onClick={() => setShareOpen(true)}>
                  Share
                </Button>
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-sm">
          {chunksQuery.isLoading ? (
            <p className="type-body-sm text-tertiary">Loading chunks…</p>
          ) : (chunksQuery.data?.chunks.length ?? 0) === 0 ? (
            <p className="type-body-sm text-tertiary">No chunks yet.</p>
          ) : (
            <>
              {chunksQuery.data!.chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="border border-line rounded-md p-sm max-h-[160px] overflow-y-auto"
                >
                  <p className="type-mono text-primary">{chunk.content}</p>
                </div>
              ))}
              {chunksQuery.data!.pagination.total >
                chunksQuery.data!.chunks.length && (
                <p className="type-label text-tertiary">
                  Showing {chunksQuery.data!.chunks.length} of{" "}
                  {chunksQuery.data!.pagination.total} chunks
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {shareOpen && (
        <ShareModal
          documentId={data.id}
          documentTitle={data.title}
          onClose={() => setShareOpen(false)}
        />
      )}

      {deleteOpen && (
        <ConfirmDeleteModal
          itemLabel={data.title}
          consequenceText="This document and its chunks will be permanently removed."
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
};

export default DocumentDetailPage;
