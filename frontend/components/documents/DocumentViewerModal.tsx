"use client";

import { useEffect, useState } from "react";
import { Download, X, Loader2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Document } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentViewerModalProps {
  doc: Document | null;
  onClose: () => void;
}

export function DocumentViewerModal({ doc, onClose }: DocumentViewerModalProps) {
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch a fresh signed URL when the modal opens
  useEffect(() => {
    if (!doc) {
      setFreshUrl(null);
      return;
    }
    setLoading(true);
    setError(null);
    apiClient
      .get<Document>(`/documents/${doc.id}`)
      .then((res) => setFreshUrl(res.data.download_url ?? null))
      .catch(() => setError("Could not load the document. Please try again."))
      .finally(() => setLoading(false));
  }, [doc?.id]);

  const isImage = doc?.mime_type === "image/jpeg" || doc?.mime_type === "image/png";
  const isPdf = doc?.mime_type === "application/pdf";

  const handleDownload = () => {
    if (!doc) return;
    window.open(`/api/v1/documents/${doc.id}/download`, "_blank");
  };

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="min-w-0 mr-4">
            <DialogTitle className="truncate text-base">
              {doc?.file_name ?? "Document"}
            </DialogTitle>
            {doc && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {doc.uploader_name || "Unknown"} · {formatDate(doc.uploaded_at)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/20 p-2">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading document…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && freshUrl && isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={freshUrl}
              alt={doc?.file_name}
              className="max-h-full max-w-full object-contain rounded"
            />
          )}

          {!loading && !error && freshUrl && isPdf && (
            <iframe
              src={freshUrl}
              title={doc?.file_name}
              className="w-full h-full rounded"
              style={{ minHeight: "400px" }}
            />
          )}
        </div>

        {doc?.notes && (
          <div className="px-4 py-2 border-t bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> {doc.notes}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
