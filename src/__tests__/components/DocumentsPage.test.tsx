import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DocumentsPage from '@/app/dashboard/documents/page';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

global.fetch = jest.fn();

describe('Documents Page', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSession as jest.Mock).mockReturnValue({ data: mockSession });
  });

  it('should render documents list', async () => {
    const mockDocuments = [
      {
        _id: 'doc1',
        originalName: 'test.pdf',
        filename: 'test.pdf',
        fileSize: 1024,
        status: { stage: 'completed', progress: 100, message: 'Complete' },
        createdAt: new Date().toISOString(),
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, documents: mockDocuments }),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });

  it('should filter documents by search term', async () => {
    const mockDocuments = [
      {
        _id: 'doc1',
        originalName: 'invoice.pdf',
        filename: 'invoice.pdf',
        fileSize: 1024,
        status: { stage: 'completed', progress: 100, message: 'Complete' },
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'doc2',
        originalName: 'contract.pdf',
        filename: 'contract.pdf',
        fileSize: 2048,
        status: { stage: 'completed', progress: 100, message: 'Complete' },
        createdAt: new Date().toISOString(),
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, documents: mockDocuments }),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search documents...');
    fireEvent.change(searchInput, { target: { value: 'invoice' } });

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<DocumentsPage />);

    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('should handle empty documents list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, documents: [] }),
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No documents yet/i)).toBeInTheDocument();
    });
  });
});
