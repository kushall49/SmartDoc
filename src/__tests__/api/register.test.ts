import { NextRequest } from 'next/server';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/models/User');
jest.mock('bcryptjs');

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedPassword',
    };

    (UserModel.findOne as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    (UserModel.create as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('john@example.com');
    expect(data.user.name).toBe('John Doe');
  });

  it('should reject duplicate email registration', async () => {
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      email: 'existing@example.com',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'existing@example.com',
        password: 'password123',
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('already exists');
  });

  it('should validate email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should validate password length', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short',
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('8 characters');
  });

  it('should validate name length', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'A',
        email: 'john@example.com',
        password: 'password123',
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
