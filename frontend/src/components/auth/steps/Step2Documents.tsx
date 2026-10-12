"use client";
import { useState, useRef } from "react";
import { uploadDocument } from "@/src/lib/api/documents";

const SUGGESTIONS = [
  { icon: "restaurant_menu", label: "Menu or price list" },
  { icon: "schedule",        label: "Opening hours" },
  { icon: "quiz",            label: "FAQs" },
  { icon: "local_shipping",  label: "Delivery or shipping policy" },
  { icon: "assignment",      label: "Services or packages" },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Step2Documents({ onNext, onBack }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const addFiles = (fileList: FileList) => {
    const valid = Array.from(fileList).filter((f) =>
      ["pdf", "docx", "doc", "txt"].includes(f.name.split(".").pop().toLowerCase())
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !existing.has(f.name))];
    });
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  // Uploads every selected file for real before advancing — same backend
  // path the Documents (Knowledge Base) page uses, so a document picked here
  // is immediately available to the AI, not just decoration in this step.
  const handleContinue = async () => {
    if (files.length === 0) {
      onNext({});
      return;
    }
    setUploading(true);
    setError("");
    const results = await Promise.allSettled(files.map((f) => uploadDocument(f)));
    setUploading(false);

    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (failedCount === files.length) {
      setError("Upload failed. You can try again, or skip and add documents later from the Knowledge Base page.");
      return;
    }
    if (failedCount > 0) {
      setError(`${failedCount} file(s) failed to upload — you can re-add them later from the Knowledge Base page.`);
    }
    onNext({});
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-medium text-on-surface mb-1">
          Add your business documents
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Upload anything that describes your business — the AI reads these to answer customer questions. A single file is enough to get started.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all select-none ${
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-outline-variant/50 hover:border-primary/50 hover:bg-surface-container-low"
        }`}
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-primary/15" : "bg-primary/10"}`}>
          <span
            className="material-symbols-outlined text-primary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            upload_file
          </span>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-on-surface">
            {dragging ? "Drop to upload" : "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">PDF, DOCX, TXT · Max 10 MB per file</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20"
            >
              <span
                className="material-symbols-outlined text-primary text-[20px] shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">{f.name}</p>
                <p className="text-xs text-on-surface-variant">{formatBytes(f.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                className="p-1.5 rounded-full hover:bg-error-container/50 text-on-surface-variant/40 hover:text-error transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-on-surface-variant uppercase tracking-[0.06em]">
          What works well
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[14px]">{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Reassurance */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
          lightbulb
        </span>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          You can upload more documents anytime from the{" "}
          <span className="font-medium text-on-surface">Knowledge Base</span> page. Nothing is permanent — replace or remove files whenever your information changes.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span className="min-w-0">{error}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-outline-variant/30">
        <button
          onClick={onBack}
          disabled={uploading}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-40"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          {files.length === 0 && (
            <button
              onClick={handleContinue}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-all"
            >
              Skip for now
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={files.length === 0 || uploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : "Continue"}
            {!uploading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
