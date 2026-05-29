"use client";

import { useState } from "react";
import {
  FileText,
  ImageIcon,
  Download,
  Eye,
  Trash2,
  FileX,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { Document, DocumentType } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TYPE_LABELS: Record<DocumentType, string> = {
  xray: "X-Ray",
  photo: "Photo",
  consent_form: "Consent",
  prescription: "Prescription",
  lab_report: "Lab Report",
  other: "Other",
};

const TYPE_COLORS: Record<DocumentType, string> = {
  xray: "bg-blue-100 text-blue-700",
  photo: "bg-purple-100 text-purple-700",
  consent_form: "bg-green-100 text-green-700",
  prescription: "bg-amber-100 text-amber-700",
  lab_report: "bg-rose-100 text-rose-700",
  other: "bg-gray-100 text-gray-700",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentCardProps {
  doc: Document;
  isDentist: boolean;
  onView: (doc: Document) => void;
  onDeleted: (id: string) => void;
}

export function DocumentCard({ doc, isDentist, onView, onDeleted }: DocumentCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isImage = doc.mime_type === "image/jpeg" || doc.mime_type === "image/png";
  const isDicom = doc.mime_type === "image/dicom";

  const handleDownload = () => {
    window.open(`/api/v1/documents/${doc.id}/download`, "_blank");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/documents/${doc.id}`);
      toast.success("Document deleted.");
      onDeleted(doc.id);
    } catch {
      toast.error("Failed to delete document.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <div className="flex gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
        {/* Thumbnail / icon */}
        <div className="h-14 w-14 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {isImage && doc.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.thumbnail_url}
              alt={doc.file_name}
              className="h-full w-full object-cover"
            />
          ) : isDicom ? (
            <FileX className="h-6 w-6 text-muted-foreground" />
          ) : (
            <FileText className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                TYPE_COLORS[doc.document_type] ?? "bg-gray-100 text-gray-700"
              )}
            >
              {TYPE_LABELS[doc.document_type] ?? doc.document_type}
            </span>
            {isDicom && (
              <span className="text-xs text-muted-foreground">DICOM — click to download</span>
            )}
          </div>
          <p className="text-sm font-medium truncate" title={doc.file_name}>
            {doc.file_name}
          </p>
          {doc.notes && (
            <p className="text-xs text-muted-foreground line-clamp-1">{doc.notes}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatFileSize(doc.file_size)} · {doc.uploader_name || "Unknown"} ·{" "}
            {formatDate(doc.uploaded_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isDicom && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onView(doc)}
              title="View"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          {isDentist && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{doc.file_name}</strong> will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
