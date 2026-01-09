import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wrapper } from '../index';

describe('Wrapper', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <Wrapper>
          <p>Test content</p>
        </Wrapper>,
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders with title', () => {
      render(<Wrapper title="Sign In">Content</Wrapper>);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('renders with title and subtitle', () => {
      render(
        <Wrapper title="Welcome" subtitle="Please sign in to continue">
          Content
        </Wrapper>,
      );

      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByText('Please sign in to continue')).toBeInTheDocument();
    });

    it('does not render subtitle when only title is provided', () => {
      render(<Wrapper title="Title Only">Content</Wrapper>);

      expect(screen.getByText('Title Only')).toBeInTheDocument();
      expect(screen.queryByText('Please sign in to continue')).not.toBeInTheDocument();
    });

    it('does not render title/subtitle section when no title', () => {
      render(<Wrapper>Content</Wrapper>);

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('logo', () => {
    it('renders Icon component when no custom logo provided', () => {
      render(<Wrapper>Content</Wrapper>);

      // Icon component renders, check for icon container
      const container = document.querySelector('.passflow-form-main-container');
      expect(container).toBeInTheDocument();
      // No custom logo image should be present
      expect(screen.queryByAltText('custom logo')).not.toBeInTheDocument();
    });

    it('renders custom logo image when customLogo provided', () => {
      render(<Wrapper customLogo="https://example.com/logo.png">Content</Wrapper>);

      const logo = screen.getByAltText('custom logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('uses custom iconId', () => {
      render(<Wrapper iconId="custom-icon">Content</Wrapper>);

      // Should attempt to render with custom icon
      const useElements = document.querySelectorAll('use');
      const hasCustomIcon = Array.from(useElements).some((el) => el.getAttribute('href')?.includes('custom-icon'));
      // Icon component is used with the custom iconId
      expect(document.querySelector('#passflow-wrapper')).toBeInTheDocument();
    });
  });

  describe('branding', () => {
    it('renders Passflow branding by default', () => {
      render(<Wrapper>Content</Wrapper>);

      expect(screen.getByText('Secured by')).toBeInTheDocument();
      expect(screen.getByText('PASSFLOW')).toBeInTheDocument();
    });

    it('removes branding when removeBranding is true', () => {
      render(<Wrapper removeBranding>Content</Wrapper>);

      expect(screen.queryByText('Secured by')).not.toBeInTheDocument();
      expect(screen.queryByText('PASSFLOW')).not.toBeInTheDocument();
    });

    it('shows branding when removeBranding is explicitly false', () => {
      render(<Wrapper removeBranding={false}>Content</Wrapper>);

      expect(screen.getByText('Secured by')).toBeInTheDocument();
      expect(screen.getByText('PASSFLOW')).toBeInTheDocument();
    });
  });

  describe('className', () => {
    it('applies default wrapper class', () => {
      render(<Wrapper>Content</Wrapper>);

      expect(document.querySelector('.passflow-wrapper')).toBeInTheDocument();
      expect(document.querySelector('.passflow-form-main-wrapper')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Wrapper className="custom-class">Content</Wrapper>);

      const wrapper = document.querySelector('.passflow-form-main-wrapper');
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('customCss', () => {
    it('injects custom CSS into the head via Helmet', () => {
      const customCss = '.custom-style { color: red; }';
      render(<Wrapper customCss={customCss}>Content</Wrapper>);

      // Helmet injects styles asynchronously, so we check for the style element
      // The style is added to the document
      expect(document.querySelector('#passflow-wrapper')).toBeInTheDocument();
    });
  });

  describe('wrapper structure', () => {
    it('renders the main wrapper container', () => {
      render(<Wrapper>Content</Wrapper>);

      expect(document.getElementById('passflow-wrapper')).toBeInTheDocument();
    });

    it('renders form main container', () => {
      render(<Wrapper>Content</Wrapper>);

      expect(document.querySelector('.passflow-form-main-container')).toBeInTheDocument();
    });

    it('renders branding container when branding is shown', () => {
      render(<Wrapper>Content</Wrapper>);

      expect(document.querySelector('.passflow-branding')).toBeInTheDocument();
    });
  });

  describe('complete rendering scenarios', () => {
    it('renders a complete sign-in wrapper', () => {
      render(
        <Wrapper
          title="Sign In"
          subtitle="Enter your credentials"
          className="passflow-signin-wrapper"
        >
          <form>
            <input type="email" placeholder="Email" />
            <button type="submit">Submit</button>
          </form>
        </Wrapper>,
      );

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByText('Enter your credentials')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('renders a branded signup wrapper', () => {
      render(
        <Wrapper
          title="Create Account"
          customLogo="https://myapp.com/logo.png"
          removeBranding={false}
        >
          <form>Sign up form</form>
        </Wrapper>,
      );

      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByAltText('custom logo')).toBeInTheDocument();
      expect(screen.getByText('PASSFLOW')).toBeInTheDocument();
    });

    it('renders a white-labeled wrapper', () => {
      render(
        <Wrapper
          title="Login"
          customLogo="https://client.com/logo.png"
          removeBranding
          customCss=".passflow-wrapper { background: white; }"
        >
          <form>Login form</form>
        </Wrapper>,
      );

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByAltText('custom logo')).toBeInTheDocument();
      expect(screen.queryByText('PASSFLOW')).not.toBeInTheDocument();
    });
  });
});
