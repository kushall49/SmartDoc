import 'dotenv/config';
import { prisma } from '../src/lib/db';
import {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  registerUser,
  loginUser,
  getUserProfile,
} from '../src/services/auth.service';
import jwt from 'jsonwebtoken';

async function main() {
  console.log('===========================================================');
  console.log('--- STEP 7 VERIFICATION: NextAuth → JWT + bcrypt ---');
  console.log('===========================================================\n');

  const testEmail = `jwt_test_${Date.now()}@example.com`;
  const rawPassword = 'SecurePassword_2026!';
  let testUserId = '';

  try {
    // 1. Password hashing with bcrypt
    console.log('1. Testing bcrypt password hashing (12 rounds)...');
    const startHash = Date.now();
    const hash = await hashPassword(rawPassword);
    const hashElapsed = Date.now() - startHash;

    console.log(`   Generated bcrypt hash: ${hash.slice(0, 29)}... (cost: 12)`);
    console.log(`   Hash computation time: ${hashElapsed} ms`);

    const isMatch = await comparePassword(rawPassword, hash);
    const isWrongMatch = await comparePassword('wrong_password', hash);

    if (!isMatch || isWrongMatch) {
      throw new Error('bcrypt comparePassword failed accuracy check.');
    }
    console.log('   ✅ bcrypt hashing & comparison verified.');

    // 2. User registration in PostgreSQL
    console.log('\n2. Testing user registration in PostgreSQL (users table)...');
    const { user, token } = await registerUser({
      name: 'Auth Test User',
      email: testEmail,
      password: rawPassword,
    });
    testUserId = user.id;

    console.log(`   Registered user ID: ${user.id}`);
    console.log(`   User email: ${user.email}`);
    console.log(`   Assigned role: ${user.role}`);
    console.log(`   Initial JWT token: ${token.slice(0, 35)}...`);

    // Verify row in PostgreSQL
    const dbRow = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!dbRow || !dbRow.passwordHash.startsWith('$2')) {
      throw new Error('User was not properly written with bcrypt password_hash in PostgreSQL.');
    }
    console.log('   ✅ PostgreSQL user row verified with password_hash column.');

    // 3. User login validation
    console.log('\n3. Testing user authentication & login...');
    const loginResult = await loginUser({
      email: testEmail,
      password: rawPassword,
    });
    if (loginResult.user.id !== testUserId || !loginResult.token) {
      throw new Error('Login failed with valid credentials.');
    }
    console.log('   ✅ Successful login returns sanitized user profile & valid JWT.');

    // Wrong password test
    let failedAsExpected = false;
    try {
      await loginUser({
        email: testEmail,
        password: 'incorrectPassword!',
      });
    } catch {
      failedAsExpected = true;
    }
    if (!failedAsExpected) {
      throw new Error('Login succeeded with incorrect password!');
    }
    console.log('   ✅ Rejected login with invalid credentials.');

    // 4. JWT token verification
    console.log('\n4. Testing JWT payload claims and signature verification...');
    const decoded = verifyToken(loginResult.token);
    if (!decoded || decoded.id !== testUserId || decoded.email !== testEmail) {
      throw new Error('JWT verification returned invalid payload.');
    }
    console.log('   Decoded claims:', {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });
    console.log('   ✅ Valid JWT successfully verified.');

    // Tampered token test
    const tamperedToken = loginResult.token.slice(0, -5) + 'xxxxx';
    const tamperedDecoded = verifyToken(tamperedToken);
    if (tamperedDecoded !== null) {
      throw new Error('Tampered JWT token passed verification!');
    }
    console.log('   ✅ Tampered JWT signature correctly rejected.');

    // 5. User Profile retrieval
    console.log('\n5. Testing user profile retrieval...');
    const profile = await getUserProfile(testUserId);
    if (!profile || profile.email !== testEmail) {
      throw new Error('Failed to retrieve user profile.');
    }
    // Check that password hash is never exposed
    if ('passwordHash' in profile || 'password' in profile) {
      throw new Error('SECURITY LEAK: Password field present in profile output!');
    }
    console.log('   ✅ User profile retrieved securely without password hash.');

    // 6. Cleanup test records
    console.log('\n6. Cleaning up test user from PostgreSQL...');
    await prisma.user.delete({ where: { id: testUserId } });
    console.log('   ✅ Test user cleaned up.');

    console.log('\n===========================================================');
    console.log('🎉 STEP 7 VERIFICATION PASSED: NextAuth Dropped, JWT + bcrypt Active!');
    console.log('===========================================================');
  } catch (error) {
    console.error('\n❌ Step 7 Verification Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

