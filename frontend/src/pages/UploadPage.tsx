import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { DocumentItem } from '../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  MessageSquare,
  Shield,
  FileCheck,
} from 'lucide-react';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit

export const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    if (selectedFile.size > MAX_SIZE_BYTES) {
      setError('File exceeds maximum upload size of 10 MB.');
      return;
    }
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const res = await api.upload<{ success: boolean; document: DocumentItem; jobId?: string }>(file);
      if (res.success && res.document) {
        setUploadedDoc(res.document);
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please check backend connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Document</h1>
        <p className="text-xs text-slate-400 mt-1">
          Ingest enterprise files for automatic text extraction, chunking, embedding, and entity intelligence.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploadedDoc ? (
        <div className="p-8 rounded-3xl bg-[#10131a] border border-[#232733] shadow-glass text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Upload & Queue Successful!</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              "{uploadedDoc.originalName}" has been saved to disk and queued for background BullMQ processing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#161922] border border-[#232733] text-left text-xs space-y-1.5 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-400">Document ID:</span>
              <span className="font-mono text-indigo-400">{uploadedDoc.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">File Size:</span>
              <span className="text-slate-200">{(uploadedDoc.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-emerald-400 font-semibold uppercase text-[10px]">Processing</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={`/documents/${uploadedDoc.id}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center justify-center space-x-2 transition-all shadow-glow"
            >
              <Eye className="w-4 h-4" />
              <span>Inspect Document</span>
            </Link>

            <Link
              to={`/chat?docId=${uploadedDoc.id}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1c2130] hover:bg-[#252c40] border border-[#2b334a] text-xs font-medium text-slate-200 flex items-center justify-center space-x-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Chat with Document</span>
            </Link>

            <button
              onClick={() => {
                setFile(null);
                setUploadedDoc(null);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-[#10131a] border border-[#232733] shadow-glass space-y-6">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#282d3d] hover:border-indigo-500/50 bg-[#12151e]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-sm font-bold text-slate-200 mb-1">
              Drag and drop your document here, or browse files
            </h3>
            <p className="text-xs text-slate-500">
              Supports PDF, DOCX, TXT, PNG, and JPEG &bull; Strict 10 MB limit
            </p>
          </div>

          {file && (
            <div className="p-4 rounded-xl bg-[#161922] border border-[#232733] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileCheck className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">{file.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB &bull; {file.type || 'document'}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Isolated tenant storage &bull; SHA-256 local verification</span>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center space-x-2 transition-all shadow-glow"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Upload & Ingest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

