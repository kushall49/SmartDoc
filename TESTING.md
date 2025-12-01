# Testing Documentation

## Overview

SmartDocIQ has comprehensive test coverage including unit tests, integration tests, and end-to-end tests.

## Test Structure

```
src/__tests__/          # Unit and integration tests
├── api/                # API route tests
├── components/         # Component tests
├── services/           # Service layer tests
├── utils/              # Utility function tests
└── setup.ts            # Jest setup file

e2e/                    # End-to-end tests
├── fixtures/           # Test fixtures
├── auth.spec.ts        # Authentication flow tests
├── documents.spec.ts   # Document management tests
├── search-chat.spec.ts # Search and chat feature tests
└── dashboard.spec.ts   # Dashboard navigation tests
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit
```

### End-to-End Tests

```bash
# Run E2E tests
npm run e2e

# Run E2E tests with UI
npm run e2e:ui

# Run E2E tests in headed mode
npm run e2e:headed
```

### All Tests

```bash
# Run all tests (unit + e2e)
npm run test:all
```

## Test Coverage

Current test coverage includes:

- **Services**: Text processing, file utilities
- **API Routes**: Authentication, registration
- **Components**: FileUpload, Documents page
- **E2E Flows**: Auth, upload, search, chat, navigation

### Coverage Goals

- Statements: 50%+
- Branches: 50%+
- Functions: 50%+
- Lines: 50%+

## Writing Tests

### Unit Tests

Use Jest and React Testing Library for unit tests:

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Tests

Use Playwright for end-to-end tests:

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## Test Environment

### Prerequisites

Before running tests:

1. **MongoDB**: Running on `localhost:27017`
2. **Redis**: Running on `localhost:6379`
3. **Environment Variables**: Set up `.env.local` or `.env.test`
4. **Demo User**: Create a test user with credentials:
   - Email: `demo@example.com`
   - Password: `demo12345`

### Mock Data

E2E tests require fixture files in `e2e/fixtures/`:
- `test.pdf` - Sample PDF
- `test.png` - Sample image
- `test.docx` - Sample DOCX

## Continuous Integration

Tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    npm run test:unit
    npm run build
    npm run e2e
```

## Test Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Isolation**: Each test should be independent
3. **Mocking**: Mock external dependencies
4. **Cleanup**: Clean up after tests
5. **Descriptive Names**: Use clear test descriptions
6. **Fast Execution**: Keep tests fast and focused
7. **Edge Cases**: Test error conditions and edge cases

## Debugging Tests

### Jest Tests

```bash
# Run specific test file
npm run test -- path/to/test.test.ts

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Tests

```bash
# Run specific test file
npx playwright test auth.spec.ts

# Debug with Playwright Inspector
npx playwright test --debug

# Generate test code
npx playwright codegen http://localhost:3000
```

## Known Issues

1. **Authentication Tests**: Require demo user to exist in database
2. **Upload Tests**: Need fixture files in `e2e/fixtures/`
3. **Timing**: Some E2E tests may need increased timeouts
4. **API Mocks**: Unit tests mock external API calls

## Future Improvements

- [ ] Increase unit test coverage to 80%+
- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add load testing for APIs
- [ ] Add security testing
- [ ] Integrate with CI/CD pipeline
- [ ] Add test data factories
- [ ] Add accessibility testing
