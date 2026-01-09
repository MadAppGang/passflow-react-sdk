import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link } from '../index';

// Mock the useNavigation hook
const mockNavigate = vi.fn();
vi.mock('@/hooks', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('Link', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders correctly with children', () => {
    render(<Link to="/test">Click here</Link>);
    expect(screen.getByText('Click here')).toBeInTheDocument();
  });

  it('renders with correct href', () => {
    render(<Link to="/test">Test Link</Link>);
    const link = screen.getByText('Test Link');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('renders with href and search params', () => {
    render(<Link to="/test" search="?foo=bar">Test Link</Link>);
    const link = screen.getByText('Test Link');
    expect(link).toHaveAttribute('href', '/test?foo=bar');
  });

  it('renders with search params without question mark', () => {
    render(<Link to="/test" search="foo=bar">Test Link</Link>);
    const link = screen.getByText('Test Link');
    expect(link).toHaveAttribute('href', '/test?foo=bar');
  });

  it('handles search params that already start with question mark', () => {
    render(<Link to="/test" search="?key=value">Test Link</Link>);
    const link = screen.getByText('Test Link');
    expect(link).toHaveAttribute('href', '/test?key=value');
  });

  it('handles click events and prevents default', async () => {
    const user = userEvent.setup();

    render(<Link to="/test">Test Link</Link>);

    await user.click(screen.getByText('Test Link'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/test',
      search: undefined,
      replace: false,
    });
  });

  it('calls custom onClick handler', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Link to="/test" onClick={handleClick}>
        Test Link
      </Link>
    );

    await user.click(screen.getByText('Test Link'));

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates with replace option', async () => {
    const user = userEvent.setup();

    render(
      <Link to="/test" replace>
        Test Link
      </Link>
    );

    await user.click(screen.getByText('Test Link'));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/test',
      search: undefined,
      replace: true,
    });
  });

  it('navigates with search and replace options', async () => {
    const user = userEvent.setup();

    render(
      <Link to="/test" search="?query=value" replace>
        Test Link
      </Link>
    );

    await user.click(screen.getByText('Test Link'));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/test',
      search: '?query=value',
      replace: true,
    });
  });

  it('applies custom className', () => {
    render(
      <Link to="/test" className="custom-link-class">
        Custom Link
      </Link>
    );
    const link = screen.getByText('Custom Link');
    expect(link).toHaveClass('custom-link-class');
  });

  it('forwards additional HTML attributes', () => {
    render(
      <Link to="/test" data-testid="custom-link" aria-label="Custom Link">
        Test Link
      </Link>
    );

    const link = screen.getByTestId('custom-link');
    expect(link).toHaveAttribute('aria-label', 'Custom Link');
  });

  it('renders as an anchor tag', () => {
    render(<Link to="/test">Test Link</Link>);
    const link = screen.getByText('Test Link');
    expect(link.tagName).toBe('A');
  });

  it('handles complex paths', async () => {
    const user = userEvent.setup();

    render(<Link to="/users/123/profile">User Profile</Link>);

    await user.click(screen.getByText('User Profile'));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/users/123/profile',
      search: undefined,
      replace: false,
    });
  });

  it('handles empty search parameter', async () => {
    const user = userEvent.setup();

    render(
      <Link to="/test" search="">
        Test Link
      </Link>
    );

    await user.click(screen.getByText('Test Link'));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/test',
      search: '',
      replace: false,
    });
  });
});
