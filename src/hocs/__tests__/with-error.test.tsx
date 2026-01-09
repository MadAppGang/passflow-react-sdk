import { render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassflowContext, initialState, type PassflowContextType } from '../../context/passflow-context';
import { withError } from '../with-error';

// Mock component to wrap
const MockComponent: FC<{ successAuthRedirect?: string }> = () => <div>Mock Component Content</div>;

// Mock error component
const MockErrorComponent: FC<{ goBackRedirectTo: string; error: string }> = ({ goBackRedirectTo, error }) => (
  <div data-testid="error-component">
    <p>Error: {error}</p>
    <p>Redirect to: {goBackRedirectTo}</p>
  </div>
);

describe('withError HOC', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/auth',
      },
      writable: true,
    });
  });

  const createMockContext = (overrides: Partial<PassflowContextType['state']> = {}): PassflowContextType => ({
    state: {
      ...initialState,
      ...overrides,
    },
    dispatch: vi.fn(),
    passflow: {} as any,
  });

  const createWrapper =
    (context: PassflowContextType | undefined): FC<{ children: React.ReactNode }> =>
    ({ children }) => <PassflowContext.Provider value={context}>{children}</PassflowContext.Provider>;

  describe('when context is valid', () => {
    it('renders the wrapped component when appId and url are present', () => {
      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: 'test-app',
        url: 'https://api.example.com',
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      expect(screen.getByText('Mock Component Content')).toBeInTheDocument();
    });

    it('passes props to wrapped component', () => {
      const ComponentWithProps: FC<{ successAuthRedirect?: string; customProp?: string }> = ({ customProp }) => (
        <div>{customProp}</div>
      );
      const WrappedComponent = withError(ComponentWithProps, MockErrorComponent);
      const mockContext = createMockContext({
        appId: 'test-app',
        url: 'https://api.example.com',
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent customProp="test value" />
        </PassflowContext.Provider>,
      );

      expect(screen.getByText('test value')).toBeInTheDocument();
    });
  });

  describe('when context is invalid', () => {
    it('renders error component when appId is missing', () => {
      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: undefined,
        url: 'https://api.example.com',
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      expect(screen.getByTestId('error-component')).toBeInTheDocument();
      expect(screen.getByText('Error: Missing appId or url')).toBeInTheDocument();
    });

    it('renders error component when url is missing', () => {
      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: 'test-app',
        url: undefined,
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      expect(screen.getByTestId('error-component')).toBeInTheDocument();
      expect(screen.getByText('Error: Missing appId or url')).toBeInTheDocument();
    });

    it('renders error component when both appId and url are missing', () => {
      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: undefined,
        url: undefined,
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      expect(screen.getByTestId('error-component')).toBeInTheDocument();
    });
  });

  describe('successAuthRedirect handling', () => {
    it('passes successAuthRedirect to error component', () => {
      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: undefined,
        url: undefined,
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent successAuthRedirect="/dashboard" />
        </PassflowContext.Provider>,
      );

      expect(screen.getByText('Redirect to: /dashboard')).toBeInTheDocument();
    });

    it('defaults to "/" when successAuthRedirect is not provided', () => {
      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: undefined,
        url: undefined,
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      expect(screen.getByText('Redirect to: /')).toBeInTheDocument();
    });
  });

  describe('excluded routes', () => {
    it('allows verify-challenge-otp route without context validation', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/auth/verify-challenge-otp' },
        writable: true,
      });

      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: undefined,
        url: undefined,
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      expect(screen.getByText('Mock Component Content')).toBeInTheDocument();
    });

    it('allows password/reset route without context validation', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/auth/password/reset' },
        writable: true,
      });

      const WrappedComponent = withError(MockComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: undefined,
        url: undefined,
      });

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      expect(screen.getByText('Mock Component Content')).toBeInTheDocument();
    });
  });

  describe('error boundary', () => {
    it('catches errors thrown by wrapped component', () => {
      const ThrowingComponent: FC<{ successAuthRedirect?: string }> = () => {
        throw new Error('Test error from component');
      };

      const WrappedComponent = withError(ThrowingComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: 'test-app',
        url: 'https://api.example.com',
      });

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent successAuthRedirect="/home" />
        </PassflowContext.Provider>,
      );

      console.error = originalError;

      expect(screen.getByTestId('error-component')).toBeInTheDocument();
      expect(screen.getByText('Error: Test error from component')).toBeInTheDocument();
      expect(screen.getByText('Redirect to: /home')).toBeInTheDocument();
    });

    it('uses default redirect when error occurs without successAuthRedirect', () => {
      const ThrowingComponent: FC<{ successAuthRedirect?: string }> = () => {
        throw new Error('Component error');
      };

      const WrappedComponent = withError(ThrowingComponent, MockErrorComponent);
      const mockContext = createMockContext({
        appId: 'test-app',
        url: 'https://api.example.com',
      });

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      render(
        <PassflowContext.Provider value={mockContext}>
          <WrappedComponent />
        </PassflowContext.Provider>,
      );

      console.error = originalError;

      expect(screen.getByText('Redirect to: /')).toBeInTheDocument();
    });
  });
});
