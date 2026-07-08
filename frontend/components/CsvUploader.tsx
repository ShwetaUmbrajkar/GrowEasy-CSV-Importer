"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function CsvUploader({ onFileSelected }: Props) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) onFileSelected(acceptedFiles[0]);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer
        ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-slate-300 dark:border-slate-700 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="rounded-full bg-brand-50 dark:bg-brand-500/10 p-4">
          {isDragActive ? (
            <FileSpreadsheet className="h-8 w-8 text-brand-600" />
          ) : (
            <UploadCloud className="h-8 w-8 text-brand-600" />
          )}
        </div>
        <p className="text-base font-medium text-slate-800 dark:text-slate-100">
          {isDragActive ? "Drop your CSV here" : "Drag & drop your CSV file here"}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          or click to browse &middot; .csv up to 10MB &middot; any column layout works
        </p>
      </div>

      {fileRejections.length > 0 && (
        <p className="mt-2 text-sm text-red-500">
          {fileRejections[0].errors[0]?.message || "That file couldn't be accepted."}
        </p>
      )}
    </div>
  );
}
