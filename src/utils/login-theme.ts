import type { LoginWebAppStyle } from '@passflow/core';

export type CompatibleLoginWebAppStyle = Partial<LoginWebAppStyle> & {
  /** Legacy field used by themes created before text_color was introduced. */
  content_color?: string;
};

const nonEmpty = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

const getBackgroundImage = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const image = nonEmpty(value);
  return image ? `url(${image})` : 'none';
};

export const getLoginThemeCssVariables = (style: CompatibleLoginWebAppStyle): Record<string, string | null> => ({
  '--passflow-primary-color': nonEmpty(style.primary_color),
  '--passflow-text-color': nonEmpty(style.text_color) ?? nonEmpty(style.content_color),
  '--passflow-secondary-text-color': nonEmpty(style.secondary_text_color),
  '--passflow-background-color': nonEmpty(style.background_color),
  '--passflow-background-image': getBackgroundImage(style.background_image),
  '--passflow-card-color': nonEmpty(style.card_color),
  '--passflow-branding-background-color': nonEmpty(style.card_color),
  '--passflow-input-background-color': nonEmpty(style.input_background_color),
  '--passflow-input-border-color': nonEmpty(style.input_border_color),
  '--passflow-button-text-color': nonEmpty(style.button_text_color),
  '--passflow-passkey-button-text-color': nonEmpty(style.passkey_button_text_color),
  '--passflow-passkey-button-background-color': nonEmpty(style.passkey_button_background_color),
  '--passflow-divider-color': nonEmpty(style.divider_color),
  '--passflow-federated_button_background_color': nonEmpty(style.federated_button_background_color),
  '--passflow-federated_button_text_color': nonEmpty(style.federated_button_text_color),
});

export const applyLoginThemeStyles = (root: HTMLElement, style: CompatibleLoginWebAppStyle): void => {
  for (const [property, value] of Object.entries(getLoginThemeCssVariables(style))) {
    if (value === null) root.style.removeProperty(property);
    else root.style.setProperty(property, value);
  }
};
