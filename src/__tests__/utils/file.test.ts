import { validateFileSize, validateFileType, sanitizeFilename, formatFileSize, getFileIcon } from '@/utils/file';
import { ValidationError } from '@/lib/errors';

describe('File Utilities', () => {
  describe('validateFileSize', () => {
    it('should accept valid file sizes', () => {
      expect(() => validateFileSize(1024 * 1024)).not.toThrow(); // 1MB
      expect(() => validateFileSize(5 * 1024 * 1024)).not.toThrow(); // 5MB
    });

    it('should reject files that are too large', () => {
      expect(() => validateFileSize(20 * 1024 * 1024)).toThrow(ValidationError);
    });

    it('should reject empty files', () => {
      expect(() => validateFileSize(0)).toThrow(ValidationError);
    });
  });

  describe('validateFileType', () => {
    it('should accept allowed file types', () => {
      expect(() => validateFileType('document.pdf')).not.toThrow();
      expect(() => validateFileType('image.png')).not.toThrow();
      expect(() => validateFileType('photo.jpg')).not.toThrow();
      expect(() => validateFileType('document.docx')).not.toThrow();
    });

    it('should reject disallowed file types', () => {
      expect(() => validateFileType('script.exe')).toThrow(ValidationError);
      expect(() => validateFileType('archive.zip')).toThrow(ValidationError);
    });

    it('should reject files without extensions', () => {
      expect(() => validateFileType('noextension')).toThrow(ValidationError);
    });

    it('should validate MIME types when provided', () => {
      expect(() => validateFileType('document.pdf', 'application/pdf')).not.toThrow();
      expect(() => validateFileType('document.pdf', 'application/zip')).toThrow(ValidationError);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      const result = sanitizeFilename('my@file#name$.pdf');
      expect(result).toBe('my_file_name_.pdf');
    });

    it('should remove directory paths', () => {
      const result = sanitizeFilename('../../etc/passwd');
      expect(result).toBe('passwd');
    });

    it('should handle Windows paths', () => {
      const result = sanitizeFilename('C:\\Windows\\System32\\file.txt');
      expect(result).toBe('file.txt');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith('.pdf')).toBe(true);
    });

    it('should preserve valid filenames', () => {
      const filename = 'my-document_v2.pdf';
      const result = sanitizeFilename(filename);
      expect(result).toBe(filename);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });
  });

  describe('getFileIcon', () => {
    it('should return correct icon for PDF files', () => {
      expect(getFileIcon('document.pdf')).toBe('📄');
    });

    it('should return correct icon for image files', () => {
      expect(getFileIcon('photo.png')).toBe('🖼️');
      expect(getFileIcon('image.jpg')).toBe('🖼️');
      expect(getFileIcon('picture.jpeg')).toBe('🖼️');
    });

    it('should return correct icon for Word documents', () => {
      expect(getFileIcon('document.docx')).toBe('📝');
    });

    it('should return default icon for unknown types', () => {
      expect(getFileIcon('file.xyz')).toBe('📎');
    });

    it('should be case-insensitive', () => {
      expect(getFileIcon('document.PDF')).toBe('📄');
      expect(getFileIcon('IMAGE.PNG')).toBe('🖼️');
    });
  });
});
