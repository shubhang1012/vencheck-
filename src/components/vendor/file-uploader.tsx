"use client";

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, formatFileSize } from "@/lib/utils";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
  documentType?: string;
}

interface FileUploaderProps {
  onFilesChange: (
    files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])
  ) => void;
  files: UploadedFile[];
  maxFiles?: number;
  accept?: string;
}

const documentTypes = [
  "GST Certificate",
  "Certificate of Incorporation",
  "Cancelled Cheque",
  "PAN Card",
  "Tax Registration",
  "Business License",
  "Other",
];

export function FileUploader({
  onFilesChange,
  files,
  maxFiles = 10,
  accept = ".pdf,.png,.jpg,.jpeg",
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = useCallback(
    (newFiles: UploadedFile[]) => {
      const allFiles = [...files, ...newFiles];
      onFilesChange(allFiles);

      newFiles.forEach((uploadFile) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 25 + 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            onFilesChange((prev: UploadedFile[]) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, progress: 100, status: "complete" as const }
                  : f
              )
            );
          } else {
            onFilesChange((prev: UploadedFile[]) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress } : f
              )
            );
          }
        }, 200);
      });
    },
    [files, onFilesChange]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const remaining = maxFiles - files.length;
      const newFiles: UploadedFile[] = Array.from(fileList)
        .slice(0, remaining)
        .map((file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          progress: 0,
          status: "uploading" as const,
          documentType: undefined,
        }));

      if (newFiles.length > 0) {
        simulateUpload(newFiles);
      }
    },
    [files.length, maxFiles, simulateUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (id: string) => {
      onFilesChange(files.filter((f) => f.id !== id));
    },
    [files, onFilesChange]
  );

  const updateDocType = useCallback(
    (id: string, type: string) => {
      onFilesChange(
        files.map((f) => (f.id === id ? { ...f, documentType: type } : f))
      );
    },
    [files, onFilesChange]
  );

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return ImageIcon;
    return FileText;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
          isDragging
            ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
            : "border-border hover:border-indigo-500/50 hover:bg-muted/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => {
            e.stopPropagation();
            handleFiles(e.target.files);
          }}
          onClick={(e) => e.stopPropagation()}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl transition-colors",
              isDragging
                ? "bg-indigo-500/10 text-indigo-500"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Upload className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium">
              <span className="text-indigo-500">Click to upload</span> or drag
              and drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, PNG, or JPG (max 10MB per file)
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {["GST Certificate", "CoI", "Cancelled Cheque", "PAN Card"].map(
              (type) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}
                </Badge>
              )
            )}
          </div>
        </div>
      </div>

      {/* File list */}
      <AnimatePresence mode="popLayout">
        {files.map((uploadFile) => {
          const Icon = getFileIcon(uploadFile.file);
          return (
            <motion.div
              key={uploadFile.id}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, x: -20 }}
              transition={{ duration: 0.2 }}
              className="group rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {uploadFile.status === "complete" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {uploadFile.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(uploadFile.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {uploadFile.status === "uploading" && (
                    <Progress
                      value={uploadFile.progress}
                      className="mt-2 h-1.5"
                      indicatorClassName="bg-indigo-500"
                    />
                  )}

                  {uploadFile.status === "complete" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {documentTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDocType(uploadFile.id, type);
                          }}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer",
                            uploadFile.documentType === type
                              ? "bg-indigo-500 text-white"
                              : "bg-muted text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-500"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
