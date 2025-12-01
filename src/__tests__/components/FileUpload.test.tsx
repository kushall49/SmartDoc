import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from '@/components/FileUpload';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

global.fetch = jest.fn();

describe('FileUpload Component', () => {
  const mockOnUploadComplete = jest.fn();
  const mockUserId = 'user123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload zone', () => {
    render(
      <FileUpload userId={mockUserId} onUploadComplete={mockOnUploadComplete} />
    );

    expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse files/i)).toBeInTheDocument();
  });

  it('should accept dropped files', async () => {
    render(
      <FileUpload userId={mockUserId} onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByText(/Drag & drop files here/i).parentElement;

    const dataTransfer = {
      files: [file],
      items: [
        {
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
        },
      ],
      types: ['Files'],
    };

    if (dropzone) {
      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('should upload files successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          document: { id: 'doc123' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(
      <FileUpload userId={mockUserId} onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByText(/Drag & drop files here/i).parentElement;

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/Upload 1 File/i);
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith('doc123');
    });
  });

  it('should remove files from list', async () => {
    render(
      <FileUpload userId={mockUserId} onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByText(/Drag & drop files here/i).parentElement;

    if (dropzone) {
      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  it('should respect max files limit', async () => {
    render(
      <FileUpload
        userId={mockUserId}
        onUploadComplete={mockOnUploadComplete}
        maxFiles={2}
      />
    );

    const files = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      new File(['test3'], 'test3.pdf', { type: 'application/pdf' }),
    ];

    const dropzone = screen.getByText(/Drag & drop files here/i).parentElement;

    if (dropzone) {
      const dataTransfer = {
        files,
        items: files.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
        })),
        types: ['Files'],
      };

      fireEvent.drop(dropzone, { dataTransfer });
    }

    await waitFor(() => {
      expect(screen.getByText(/Selected Files \(2\)/i)).toBeInTheDocument();
    });
  });
});
