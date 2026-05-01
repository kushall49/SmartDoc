'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Image,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed';

interface UploadedFile {
  id: string;
  name: string;
  status: UploadStatus;
  progress: number;
  documentId?: string;
  jobId?: string;
  error?: string;
  processingStage?: string;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image size={20} className="text-blue-400" />;
  return <FileText size={20} className="text-indigo-400" />;
}

function StatusBadge({ status }: { status: UploadStatus }) {
  const map = {
    idle: 'bg-slate-700 text-slate-300',
    uploading: 'bg-blue-500/20 text-blue-300',
    processing: 'bg-yellow-500/20 text-yellow-300',
    ready: 'bg-green-500/20 text-green-300',
    failed: 'bg-red-500/20 text-red-300',
  };
  const labels = {
    idle: 'Pending',
    uploading: 'Uploading',
    processing: 'Processing',
    ready: 'Ready',
    failed: 'Failed',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', map[status])}>
      {labels[status]}
    </span>
  );
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const pollStatus = useCallback((documentId: string, fileId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/status`);
        const data = await res.json();
        if (!data.success) return;
        const { status } = data.data;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: status === 'ready' ? 'ready' : status === 'failed' ? 'failed' : 'processing', error: data.data.errorMessage }
              : f
          )
        );

        if (status === 'ready' || status === 'failed') {
          clearInterval(interval);
          pollingRef.current.delete(fileId);
        }
      } catch {
        // Ignore poll errors
      }
    }, 2500);

    pollingRef.current.set(fileId, interval);
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    const intervals = pollingRef.current;
    return () => intervals.forEach((i) => clearInterval(i));
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFiles((prev) => [
        ...prev,
        {
          id: fileId,
          name: file.name,
          status: 'uploading',
          progress: 0,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (!data.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: 'failed', error: data.error }
                : f
            )
          );
          return;
        }

        const { documentId, jobId } = data.data;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, documentId, jobId, status: 'processing', progress: 30 }
              : f
          )
        );

        pollStatus(documentId, fileId);
      } catch (e) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: 'failed', error: String(e) }
              : f
          )
        );
      }
    },
    [pollStatus]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach(uploadFile);
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
      },
      maxSize: 10 * 1024 * 1024,
      multiple: true,
    });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Upload Documents</h1>
        <p className="text-slate-400 mt-1 text-sm">
          PDF, DOCX, JPG, and PNG files up to 10 MB. AI processing starts automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          size={40}
          className={cn(
            'mx-auto mb-4',
            isDragActive ? 'text-indigo-400' : 'text-slate-500'
          )}
        />
        {isDragActive ? (
          <p className="text-indigo-300 font-medium">Drop files here</p>
        ) : (
          <>
            <p className="text-slate-300 font-medium">
              Drag & drop files here, or{' '}
              <span className="text-indigo-400">browse</span>
            </p>
            <p className="text-slate-500 text-sm mt-2">
              PDF, DOCX, JPG, PNG · Max 10 MB
            </p>
          </>
        )}
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {fileRejections.map(({ file, errors }) => (
            <p key={file.name} className="text-red-400 text-sm">
              {file.name}: {errors.map((e) => e.message).join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon mimeType="application/pdf" />
                  <span className="text-white text-sm font-medium truncate">
                    {file.name}
                  </span>
                </div>
                <StatusBadge status={file.status} />
              </div>

              {/* Progress bar */}
              {(file.status === 'uploading' || file.status === 'processing') && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        'bg-indigo-500 animate-pulse'
                      )}
                      style={{ width: file.status === 'uploading' ? '30%' : '70%' }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    {file.status === 'uploading'
                      ? 'Uploading…'
                      : 'AI is processing your document…'}
                  </p>
                </div>
              )}

              {file.status === 'ready' && (
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <span className="text-green-400 text-xs">Processing complete</span>
                  <div className="flex gap-2 ml-auto">
                    {file.documentId && (
                      <>
                        <Link
                          href={`/dashboard/documents/${file.documentId}`}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-lg flex items-center gap-1"
                        >
                          <Eye size={12} />
                          View
                        </Link>
                        <Link
                          href={`/dashboard/chat/${file.documentId}`}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg flex items-center gap-1"
                        >
                          <MessageSquare size={12} />
                          Chat
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}

              {file.status === 'failed' && (
                <div className="mt-2 flex items-center gap-2">
                  <XCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-red-400 text-xs truncate">
                    {file.error ?? 'Processing failed'}
                  </span>
                  <button
                    onClick={() => uploadFile(new File([], file.name))}
                    className="ml-auto text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
