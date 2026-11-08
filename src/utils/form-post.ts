/**
 * Execute a `form_post` answer: OIDC response_mode=form_post requires the
 * parameters to arrive as a POST body, which only a real form submission can
 * do cross-origin.
 */
export const submitFormPost = (action: string, fields: Record<string, string>): void => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
};
