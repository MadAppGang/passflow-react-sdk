import { applyLoginThemeStyles, getLoginThemeCssVariables } from '../login-theme';

describe('login theme compatibility', () => {
  it('maps legacy content_color without manufacturing missing values', () => {
    const variables = getLoginThemeCssVariables({
      primary_color: '#0C59DD',
      content_color: '#1E1E1E',
      background_color: '#FFFFFF',
      card_color: '#F8F9FB',
      logo_url: '',
    });

    expect(variables['--passflow-primary-color']).toBe('#0C59DD');
    expect(variables['--passflow-text-color']).toBe('#1E1E1E');
    expect(variables['--passflow-background-color']).toBe('#FFFFFF');
    expect(variables['--passflow-branding-background-color']).toBe('#F8F9FB');
    expect(variables['--passflow-button-text-color']).toBeNull();
    expect(variables['--passflow-passkey-button-background-color']).toBeNull();
    expect(variables['--passflow-federated_button_background_color']).toBeNull();
  });

  it('clears an explicitly empty background image without inventing one when the field is missing', () => {
    expect(getLoginThemeCssVariables({ background_image: '' })['--passflow-background-image']).toBe('none');
    expect(getLoginThemeCssVariables({ background_image: ' hero.png ' })['--passflow-background-image']).toBe('url(hero.png)');
    expect(getLoginThemeCssVariables({})['--passflow-background-image']).toBeNull();
  });

  it('removes missing inline values so stylesheet defaults remain active', () => {
    const root = document.createElement('div');
    root.style.setProperty('--passflow-button-text-color', 'undefined');
    root.style.setProperty('--passflow-passkey-button-background-color', 'undefined');

    applyLoginThemeStyles(root, {
      primary_color: '#0C59DD',
      content_color: '#1E1E1E',
    });

    expect(root.style.getPropertyValue('--passflow-primary-color')).toBe('#0C59DD');
    expect(root.style.getPropertyValue('--passflow-text-color')).toBe('#1E1E1E');
    expect(root.style.getPropertyValue('--passflow-button-text-color')).toBe('');
    expect(root.style.getPropertyValue('--passflow-passkey-button-background-color')).toBe('');
  });
});
