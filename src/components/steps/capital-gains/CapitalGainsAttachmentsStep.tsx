'use client';

import { useState, useRef, useCallback } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Paperclip, Upload, X, FileText, AlertCircle, Info } from 'lucide-react';

// HMRC Attachment Constraints
const MAX_TOTAL_SIZE_BYTES = 5 * 1024 * 1024; // 5MB total
const MAX_ATTACHMENTS = 20;
const ALLOWED_MIME_TYPES = ['application/pdf'];

// Internal type that includes size for display purposes
interface AttachmentFileWithSize {
  filename: string;
  content: string; // base64
  size: number;
  description?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CapitalGainsAttachmentsStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track file sizes separately since wizard type doesn't store size
  const [fileSizes, setFileSizes] = useState<Record<string, number>>({});

  const attachments = data.capitalGainsData?.attachments || [];

  const totalSize = attachments.reduce((sum, att) => sum + (fileSizes[att.filename] || 0), 0);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const newAttachments = [...attachments];
    const newFileSizes = { ...fileSizes };

    for (const file of Array.from(files)) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError(`Only PDF files are allowed. "${file.name}" is not a PDF.`);
        continue;
      }

      // Check attachment count
      if (newAttachments.length >= MAX_ATTACHMENTS) {
        setError(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
        break;
      }

      // Check total size
      const newTotalSize = newAttachments.reduce((sum, att) => sum + (newFileSizes[att.filename] || 0), 0) + file.size;
      if (newTotalSize > MAX_TOTAL_SIZE_BYTES) {
        setError(`Total attachment size cannot exceed 5MB. Current: ${formatFileSize(totalSize)}, Adding: ${formatFileSize(file.size)}`);
        continue;
      }

      // Read file as base64
      try {
        const base64 = await readFileAsBase64(file);
        newAttachments.push({
          filename: file.name,
          content: base64,
        });
        newFileSizes[file.name] = file.size;
      } catch (err) {
        setError(`Failed to read file "${file.name}".`);
      }
    }

    setFileSizes(newFileSizes);
    updateData({
      capitalGainsData: {
        ...data.capitalGainsData,
        attachments: newAttachments,
      },
    });
  }, [attachments, data.capitalGainsData, fileSizes, updateData]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (index: number) => {
    const removedFile = attachments[index];
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newFileSizes = { ...fileSizes };
    if (removedFile) {
      delete newFileSizes[removedFile.filename];
    }
    setFileSizes(newFileSizes);
    updateData({
      capitalGainsData: {
        ...data.capitalGainsData,
        attachments: newAttachments,
      },
    });
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleContinue = () => {
    goNext();
  };

  const handleSkip = () => {
    // Clear any attachments and continue
    updateData({
      capitalGainsData: {
        ...data.capitalGainsData,
        attachments: [],
      },
    });
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#e6fafb] rounded-lg flex items-center justify-center">
            <Paperclip className="h-5 w-5 text-[#00c4d4]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supporting Documents
          </h1>
        </div>
        <p className="text-gray-600">
          Optionally attach PDF documents to support your capital gains calculations.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">When to attach documents</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>CGT computations for complex disposals</li>
              <li>Share pooling calculations</li>
              <li>Evidence of acquisition costs</li>
              <li>Valuation reports for assets</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-[#00c4d4] bg-[#e6fafb]'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          Drag and drop PDF files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#00c4d4] hover:underline font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-sm text-gray-500">
          PDF only • Max 5MB total • Up to {MAX_ATTACHMENTS} files
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              Attached Files ({attachments.length})
            </h3>
            <span className="text-sm text-gray-500">
              {formatFileSize(totalSize)} / 5MB
            </span>
          </div>

          <div className="space-y-2">
            {attachments.map((att, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{att.filename}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(fileSizes[att.filename] || 0)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  aria-label={`Remove ${att.filename}`}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                totalSize / MAX_TOTAL_SIZE_BYTES > 0.9
                  ? 'bg-orange-500'
                  : 'bg-[#00c4d4]'
              }`}
              style={{ width: `${Math.min(100, (totalSize / MAX_TOTAL_SIZE_BYTES) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={!canGoBack}
          className="px-6"
        >
          Back
        </Button>
        <div className="flex gap-3">
          {attachments.length === 0 && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="px-6 text-gray-600"
            >
              Skip
            </Button>
          )}
          <Button
            onClick={handleContinue}
            className="px-6 bg-[#00c4d4] hover:bg-[#00b0bf] text-white"
          >
            {attachments.length > 0 ? 'Continue' : 'Continue without attachments'}
          </Button>
        </div>
      </div>
    </div>
  );
}
