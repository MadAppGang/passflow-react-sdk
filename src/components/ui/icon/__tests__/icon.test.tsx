import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from '../index';

describe('Icon', () => {
  describe('General icons', () => {
    it('renders general icon correctly', () => {
      render(<Icon type="general" id="logo" size="medium" />);
      const icon = screen.getByAltText('logo');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('passflow-icon');
    });

    it('renders with small size', () => {
      render(<Icon type="general" id="mail" size="small" />);
      const icon = screen.getByAltText('mail');
      expect(icon).toHaveClass('passflow-icon--small');
    });

    it('renders with medium size', () => {
      render(<Icon type="general" id="mail" size="medium" />);
      const icon = screen.getByAltText('mail');
      expect(icon).toHaveClass('passflow-icon--medium');
    });

    it('renders with big size', () => {
      render(<Icon type="general" id="mail" size="big" />);
      const icon = screen.getByAltText('mail');
      expect(icon).toHaveClass('passflow-icon--big');
    });

    it('renders with large size', () => {
      render(<Icon type="general" id="mail" size="large" />);
      const icon = screen.getByAltText('mail');
      expect(icon).toHaveClass('passflow-icon--large');
    });

    it('applies custom className', () => {
      render(<Icon type="general" id="mail" size="medium" className="custom-icon-class" />);
      const icon = screen.getByAltText('mail');
      expect(icon).toHaveClass('custom-icon-class');
    });

    it('renders warning icon', () => {
      render(<Icon type="general" id="warning" size="medium" />);
      const icon = screen.getByAltText('warning');
      expect(icon).toBeInTheDocument();
    });

    it('renders edit icon', () => {
      render(<Icon type="general" id="edit" size="medium" />);
      const icon = screen.getByAltText('edit');
      expect(icon).toBeInTheDocument();
    });

    it('renders eye-on icon', () => {
      render(<Icon type="general" id="eye-on" size="medium" />);
      const icon = screen.getByAltText('eye-on');
      expect(icon).toBeInTheDocument();
    });

    it('renders eye-off icon', () => {
      render(<Icon type="general" id="eye-off" size="medium" />);
      const icon = screen.getByAltText('eye-off');
      expect(icon).toBeInTheDocument();
    });

    it('renders search icon', () => {
      render(<Icon type="general" id="search" size="medium" />);
      const icon = screen.getByAltText('search');
      expect(icon).toBeInTheDocument();
    });

    it('renders caret-down icon', () => {
      render(<Icon type="general" id="caret-down" size="medium" />);
      const icon = screen.getByAltText('caret-down');
      expect(icon).toBeInTheDocument();
    });

    it('renders label icon', () => {
      render(<Icon type="general" id="label" size="medium" />);
      const icon = screen.getByAltText('label');
      expect(icon).toBeInTheDocument();
    });

    it('renders close icon', () => {
      render(<Icon type="general" id="close" size="medium" />);
      const icon = screen.getByAltText('close');
      expect(icon).toBeInTheDocument();
    });

    it('renders check icon', () => {
      render(<Icon type="general" id="check" size="medium" />);
      const icon = screen.getByAltText('check');
      expect(icon).toBeInTheDocument();
    });

    it('renders key icon', () => {
      render(<Icon type="general" id="key" size="medium" />);
      const icon = screen.getByAltText('key');
      expect(icon).toBeInTheDocument();
    });

    it('renders phone icon', () => {
      render(<Icon type="general" id="phone" size="medium" />);
      const icon = screen.getByAltText('phone');
      expect(icon).toBeInTheDocument();
    });

    it('renders one-password icon', () => {
      render(<Icon type="general" id="one-password" size="medium" />);
      const icon = screen.getByAltText('one-password');
      expect(icon).toBeInTheDocument();
    });

    it('renders browser-chrome icon', () => {
      render(<Icon type="general" id="browser-chrome" size="medium" />);
      const icon = screen.getByAltText('browser-chrome');
      expect(icon).toBeInTheDocument();
    });

    it('renders passkey icon', () => {
      render(<Icon type="general" id="passkey" size="medium" />);
      const icon = screen.getByAltText('passkey');
      expect(icon).toBeInTheDocument();
    });

    it('renders dots-vertical icon', () => {
      render(<Icon type="general" id="dots-vertical" size="medium" />);
      const icon = screen.getByAltText('dots-vertical');
      expect(icon).toBeInTheDocument();
    });

    it('renders trash icon', () => {
      render(<Icon type="general" id="trash" size="medium" />);
      const icon = screen.getByAltText('trash');
      expect(icon).toBeInTheDocument();
    });

    it('renders logo-red icon', () => {
      render(<Icon type="general" id="logo-red" size="medium" />);
      const icon = screen.getByAltText('logo-red');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Provider icons', () => {
    it('renders provider icon correctly', () => {
      render(<Icon type="providers" id="google" size="medium" />);
      const icon = screen.getByAltText('google');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('passflow-icon');
    });

    it('renders google provider icon', () => {
      render(<Icon type="providers" id="google" size="medium" />);
      const icon = screen.getByAltText('google');
      expect(icon).toBeInTheDocument();
    });

    it('renders github provider icon', () => {
      render(<Icon type="providers" id="github" size="medium" />);
      const icon = screen.getByAltText('github');
      expect(icon).toBeInTheDocument();
    });

    it('renders gitlab provider icon', () => {
      render(<Icon type="providers" id="gitlab" size="medium" />);
      const icon = screen.getByAltText('gitlab');
      expect(icon).toBeInTheDocument();
    });

    it('renders apple provider icon', () => {
      render(<Icon type="providers" id="apple" size="medium" />);
      const icon = screen.getByAltText('apple');
      expect(icon).toBeInTheDocument();
    });

    it('renders microsoft provider icon', () => {
      render(<Icon type="providers" id="microsoft" size="medium" />);
      const icon = screen.getByAltText('microsoft');
      expect(icon).toBeInTheDocument();
    });

    it('renders facebook provider icon', () => {
      render(<Icon type="providers" id="facebook" size="medium" />);
      const icon = screen.getByAltText('facebook');
      expect(icon).toBeInTheDocument();
    });

    it('renders twitter provider icon', () => {
      render(<Icon type="providers" id="twitter" size="medium" />);
      const icon = screen.getByAltText('twitter');
      expect(icon).toBeInTheDocument();
    });

    it('renders slack provider icon', () => {
      render(<Icon type="providers" id="slack" size="medium" />);
      const icon = screen.getByAltText('slack');
      expect(icon).toBeInTheDocument();
    });

    it('renders discord provider icon', () => {
      render(<Icon type="providers" id="discord" size="medium" />);
      const icon = screen.getByAltText('discord');
      expect(icon).toBeInTheDocument();
    });

    it('renders notion provider icon', () => {
      render(<Icon type="providers" id="notion" size="medium" />);
      const icon = screen.getByAltText('notion');
      expect(icon).toBeInTheDocument();
    });

    it('applies custom className to provider icon', () => {
      render(<Icon type="providers" id="google" size="medium" className="custom-provider-class" />);
      const icon = screen.getByAltText('google');
      expect(icon).toHaveClass('custom-provider-class');
    });

    it('renders with different sizes for provider icons', () => {
      render(<Icon type="providers" id="google" size="small" />);
      const icon = screen.getByAltText('google');
      expect(icon).toHaveClass('passflow-icon--small');
    });
  });

  describe('Flag icons', () => {
    it('renders flag icon correctly', () => {
      const { container } = render(<Icon type="flags" id="US" size="medium" />);
      const iconWrapper = container.querySelector('.passflow-icon');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('renders flag with correct class', () => {
      const { container } = render(<Icon type="flags" id="US" size="medium" />);
      const flag = container.querySelector('.passflow-flag');
      expect(flag).toBeInTheDocument();
      expect(flag).toHaveClass('us');
    });

    it('converts flag id to lowercase', () => {
      const { container } = render(<Icon type="flags" id="GB" size="medium" />);
      const flag = container.querySelector('.passflow-flag');
      expect(flag).toHaveClass('gb');
    });

    it('applies size class to flag wrapper', () => {
      const { container } = render(<Icon type="flags" id="US" size="small" />);
      const iconWrapper = container.querySelector('.passflow-icon');
      expect(iconWrapper).toHaveClass('passflow-icon--small');
    });

    it('applies custom className to flag wrapper', () => {
      const { container } = render(<Icon type="flags" id="US" size="medium" className="custom-flag-class" />);
      const iconWrapper = container.querySelector('.passflow-icon');
      expect(iconWrapper).toHaveClass('custom-flag-class');
    });

    it('sets background image style on flag', () => {
      const { container } = render(<Icon type="flags" id="US" size="medium" />);
      const flag = container.querySelector('.passflow-flag');
      expect(flag).toHaveStyle({ backgroundImage: expect.stringContaining('url(') });
    });
  });
});
