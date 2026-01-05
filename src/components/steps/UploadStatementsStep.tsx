'use client';

import { useState, useRef, useCallback } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'csv' | 'pdf';
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
  transactionCount?: number;
}

const ACCEPTED_TYPES = {
  'text/csv': 'csv',
  'application/csv': 'csv',
  'text/comma-separated-values': 'csv',
  'application/vnd.ms-excel': 'csv',
  'application/pdf': 'pdf',
} as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadStatementsStep() {
  const { data, updateData, goNext, goBack } = useWizard();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; type?: 'csv' | 'pdf'; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File is too large. Maximum size is 10MB.' };
    }

    // Check file type
    const fileType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
    if (!fileType) {
      // Try extension check as fallback
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'csv') {
        return { valid: true, type: 'csv' };
      }
      if (extension === 'pdf') {
        return { valid: true, type: 'pdf' };
      }
      return { valid: false, error: 'Please upload a CSV or PDF file.' };
    }

    return { valid: true, type: fileType };
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const filesToAdd: UploadedFile[] = [];

    Array.from(newFiles).forEach((file) => {
      const validation = validateFile(file);

      if (validation.valid && validation.type) {
        filesToAdd.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          type: validation.type,
          status: 'pending',
        });
      } else {
        // Add as error file for user feedback
        filesToAdd.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          type: 'csv',
          status: 'error',
          error: validation.error,
        });
      }
    });

    setFiles((prev) => [...prev, ...filesToAdd]);
    setError(null);
  }, []);

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = async () => {
    const validFiles = files.filter((f) => f.status === 'pending');

    if (validFiles.length === 0) {
      setError('Please add at least one valid file to upload.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Update all pending files to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
      )
    );

    try {
      const formData = new FormData();
      validFiles.forEach((f) => {
        formData.append('files', f.file);
      });

      const response = await fetch('/api/statements/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process files');
      }

      // Update file statuses based on results
      setFiles((prev) =>
        prev.map((f) => {
          const fileResult = result.fileResults?.find(
            (r: { filename: string }) => r.filename === f.name
          );
          if (fileResult) {
            if (fileResult.success) {
              return {
                ...f,
                status: 'success' as const,
                transactionCount: fileResult.transactionCount,
              };
            } else {
              return {
                ...f,
                status: 'error' as const,
                error: fileResult.error,
              };
            }
          }
          return f;
        })
      );

      // If we got transactions, store them and navigate
      if (result.transactions && result.transactions.length > 0) {
        updateData({
          transactions: [...(data.transactions || []), ...result.transactions],
          connectionMethod: 'upload',
        });

        // Navigate to next step (importing/review)
        goNext();
      } else if (result.fileResults?.every((r: { success: boolean }) => r.success)) {
        setError('No transactions found in the uploaded files. Please check your files contain transaction data.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process files. Please try again.');

      // Mark all uploading files as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: 'Upload failed' }
            : f
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const validFilesCount = files.filter((f) => f.status === 'pending' || f.status === 'success').length;
  const hasErrors = files.some((f) => f.status === 'error');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Bank Statements
        </h1>
        <p className="text-gray-600">
          Upload your bank statements in CSV or PDF format. We&apos;ll automatically
          extract and categorise your transactions.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-[#00e3ec] bg-[#e6fafb]'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4',
              isDragging ? 'bg-[#00e3ec]' : 'bg-gray-200'
            )}
          >
            <Upload
              className={cn(
                'h-8 w-8',
                isDragging ? 'text-white' : 'text-gray-500'
              )}
            />
          </div>

          <p className="text-lg font-medium text-gray-900 mb-1">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              PDF
            </span>
            <span>Max 10MB</span>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-medium text-gray-900">
            Files ({files.length})
          </h3>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  file.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : file.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    file.status === 'error'
                      ? 'bg-red-100'
                      : file.status === 'success'
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  )}
                >
                  {file.type === 'csv' ? (
                    <FileSpreadsheet
                      className={cn(
                        'h-5 w-5',
                        file.status === 'error'
                          ? 'text-red-500'
                          : file.status === 'success'
                          ? 'text-green-500'
                          : 'text-gray-500'
                      )}
                    />
                  ) : (
                    <FileText
                      className={cn(
                        'h-5 w-5',
                        file.status === 'error'
                          ? 'text-red-500'
                          : file.status === 'success'
                          ? 'text-green-500'
                          : 'text-gray-500'
                      )}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {file.status === 'error' && file.error ? (
                      <span className="text-red-600">{file.error}</span>
                    ) : file.status === 'success' && file.transactionCount ? (
                      <span className="text-green-600">
                        {file.transactionCount} transactions found
                      </span>
                    ) : file.status === 'uploading' || file.status === 'processing' ? (
                      <span className="text-[#00c4d4]">Processing...</span>
                    ) : (
                      formatFileSize(file.size)
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {file.status === 'uploading' || file.status === 'processing' ? (
                    <Loader2 className="h-5 w-5 text-[#00e3ec] animate-spin" />
                  ) : file.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : file.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : null}

                  {(file.status === 'pending' || file.status === 'error') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supported Banks Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Most UK banks let you download statements as CSV files
          from your online banking. Look for &quot;Export&quot; or &quot;Download statements&quot;
          in your transaction history.
        </p>
      </div>

      {/* Process Button */}
      {files.length > 0 && (
        <div className="mt-6">
          <Button
            onClick={processFiles}
            disabled={isProcessing || validFilesCount === 0}
            className="w-full h-12 bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing files...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Process {validFilesCount} file{validFilesCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}

      <WizardNavigation
        canContinue={false}
        showBack={true}
      />
    </div>
  );
}
