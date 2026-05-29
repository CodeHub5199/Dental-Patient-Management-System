"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, X, File as FileIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Document, DocumentType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "xray", label: "X-Ray / Radiograph" },
  { value: "photo", label: "Clinical Photo" },
  { value: "consent_form", label: "Consent Form" },
  { value: "prescription", label: "Prescription" },
  { value: "lab_report", label: "Lab Report" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onUploaded: (doc: Document) => void;
}

interface FileItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export function UploadDialog({ open, onOpenChange, patientId, onUploaded }: UploadDialogProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    const newItems: FileItem[] = accepted.map((f) => ({
      file: f,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newItems]);
    for (const rej of rejected) {
      const err = rej.errors[0];
      toast.error(
        err?.code === "file-too-large"
          ? `${rej.file.name}: exceeds 50 MB limit.`
          : `${rej.file.name}: ${err?.message ?? "rejected"}`
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
      // DICOM has no standard browser MIME; accept by extension
      "application/octet-stream": [".dcm", ".dicom"],
    },
    disabled: uploading,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!files.length || !documentType) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === "done") continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading", progress: 0 } : f))
      );

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("patient_id", patientId);
      formData.append("document_type", documentType);
      if (notes.trim()) formData.append("notes", notes.trim());

      try {
        const res = await apiClient.post<Document>("/documents/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            if (evt.total) {
              const pct = Math.round((evt.loaded * 100) / evt.total);
              setFiles((prev) =>
                prev.map((f, idx) => (idx === i ? { ...f, progress: pct } : f))
              );
            }
          },
        });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done", progress: 100 } : f))
        );
        onUploaded(res.data);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Upload failed.";
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: msg, progress: 0 } : f
          )
        );
        toast.error(`${item.file.name}: ${msg}`);
      }
    }

    setUploading(false);
    const allDone = files.every((f) => f.status === "done");
    if (allDone) {
      toast.success("All files uploaded successfully.");
      handleClose();
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setFiles([]);
    setDocumentType("");
    setNotes("");
    onOpenChange(false);
  };

  const pendingCount = files.filter((f) => f.status !== "done").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/20",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            {isDragActive ? (
              <p className="text-sm font-medium">Drop files here…</p>
            ) : (
              <>
                <p className="text-sm font-medium">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse · JPEG, PNG, PDF, DICOM · max 50 MB
                </p>
              </>
            )}
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {files.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded border text-sm",
                    item.status === "error" && "border-destructive/40 bg-destructive/5",
                    item.status === "done" && "border-green-200 bg-green-50"
                  )}
                >
                  <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                    {item.status === "uploading" && (
                      <Progress value={item.progress} className="mt-1 h-1" />
                    )}
                    {item.status === "error" && item.error && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3" />
                        {item.error}
                      </p>
                    )}
                  </div>
                  {item.status !== "uploading" && item.status !== "done" && (
                    <button
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === "done" && (
                    <span className="text-xs text-green-600 font-medium shrink-0">Done</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Document type */}
          <div className="space-y-1.5">
            <Label>Document Type <span className="text-destructive">*</span></Label>
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as DocumentType)}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a type…" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label>Notes</Label>
              <span className={cn("text-xs", notes.length > 480 ? "text-destructive" : "text-muted-foreground")}>
                {notes.length}/500
              </span>
            </div>
            <Textarea
              placeholder="e.g. Right bitewing, pre-treatment"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={2}
              disabled={uploading}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || pendingCount === 0 || !documentType}
            >
              {uploading
                ? "Uploading…"
                : `Upload ${pendingCount > 1 ? `${pendingCount} files` : "file"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
