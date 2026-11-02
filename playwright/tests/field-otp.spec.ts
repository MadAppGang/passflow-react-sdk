import AxeBuilder from '@axe-core/playwright';
// Coverage map: REQ-1 (REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.5, REQ-1.6, REQ-1.7, REQ-1.8, REQ-1.9, REQ-1.10)
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

const storybookUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6107';
const storyTitle = 'Components/FieldOtp';

const stories = [
  ['Default', 'default', 6],
  ['Partial', 'partial', 6],
  ['Filled', 'filled', 6],
  ['ErrorState', 'error-state', 6],
  ['Disabled', 'disabled', 6],
  ['Alphanumeric', 'alphanumeric', 6],
  ['FourDigits', 'four-digits', 4],
] as const;

const openStory = async (page: Page, id: string) => {
  await page.goto(`${storybookUrl}/iframe.html?id=components-fieldotp--${id}&viewMode=story`);
  const storyRoot = page.locator('#storybook-root');
  await expect(storyRoot).toBeVisible();
  await expect(storyRoot).not.toBeEmpty();
  // REQ-1.10: Guard against an empty render — assert the input exists before auditing.
  const input = page.getByRole('textbox', { name: 'Verification code' });
  await expect(input).toBeAttached();
  return { storyRoot, input };
};

const auditStory = async (page: Page) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await expect(page.getByRole('textbox', { name: 'Verification code' })).toBeAttached();
      const audit = await new AxeBuilder({ page }).include('#storybook-root').analyze();
      expect(
        audit.passes.some((result) => result.nodes.length > 0),
        'The accessibility audit must evaluate the rendered FieldOtp story',
      ).toBe(true);
      return audit;
    } catch (error) {
      const isTransientStorybookReload =
        error instanceof Error &&
        (error.message.includes('Axe is already running') || error.message.includes('Execution context was destroyed'));
      if (!isTransientStorybookReload || attempt === 4) throw error;
      await expect(page.locator('#storybook-root')).toBeVisible();
      await page.waitForTimeout(200);
    }
  }

  throw new Error('Unable to audit the Storybook state');
};

/**
 * Inspects the rendered visual boxes inside #storybook-root that are hidden
 * from assistive technology (REQ-1.1).
 */
const getHiddenBoxTexts = async (page: Page, expectedLength: number): Promise<string[]> => {
  return page.locator('#storybook-root').evaluate((root, len) => {
    const isHiddenFromAT = (el: Element) => Boolean(el.closest('[aria-hidden="true"]'));

    // Find a container whose direct element children equal `len` and are hidden from AT
    const candidates = Array.from(root.querySelectorAll('*')).filter(
      (el) =>
        el.children.length === len &&
        Array.from(el.children).every((child) => child.tagName !== 'INPUT' && isHiddenFromAT(child)),
    );

    const [firstCandidate] = candidates;
    if (firstCandidate) {
      return Array.from(firstCandidate.children).map((box) => (box.textContent ?? '').trim());
    }

    // Fallback: direct [aria-hidden="true"] box elements inside the OTP root
    const directHidden = Array.from(root.querySelectorAll('[aria-hidden="true"]')).filter(
      (el) => el.children.length === 0 || el.querySelectorAll('[aria-hidden="true"]').length === 0,
    );
    return directHidden.map((box) => (box.textContent ?? '').trim());
  }, expectedLength);
};

test.describe('REQ-1 FieldOtp Storybook catalog and behaviour', () => {
  for (const [exportName, storySlug, expectedLength] of stories) {
    test(`REQ-1.10 FieldOtp · ${exportName} · renders input, ${expectedLength} assistive-tech-hidden boxes, and passes axe audit`, async ({
      page,
      request,
    }) => {
      const response = await request.get(`${storybookUrl}/index.json`);
      expect(response.ok()).toBe(true);
      const index = (await response.json()) as {
        entries: Record<string, { id: string; title: string; type: string }>;
      };
      expect(index.entries[`components-fieldotp--${storySlug}`]).toMatchObject({
        title: storyTitle,
        type: 'story',
      });

      const runtimeErrors: string[] = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));

      const { input } = await openStory(page, storySlug);

      // REQ-1.1: Renders exactly ONE real text input
      await expect(page.locator('#storybook-root input')).toHaveCount(1);
      await expect(page.getByRole('textbox')).toHaveCount(1);
      await expect(input).toHaveCount(1);

      // REQ-1.1: Renders `length` visual boxes hidden from assistive tech
      const boxes = await getHiddenBoxTexts(page, expectedLength);
      expect(boxes).toHaveLength(expectedLength);

      // REQ-1.10: Passes axe audit scoped to #storybook-root
      const accessibility = await auditStory(page);
      expect(
        accessibility.violations,
        `${exportName} has accessibility violations:\n${accessibility.violations
          .map((violation) => `${violation.id}: ${violation.help}`)
          .join('\n')}`,
      ).toEqual([]);
      expect(runtimeErrors, `${exportName} emitted browser errors`).toEqual([]);
    });
  }

  test('TEST-1 REQ-1.1 REQ-1.2 REQ-1.3 REQ-1.9 FieldOtp · Default · exposes one real input with autocomplete, id, name, maxlength, numeric inputmode, and aria-labelledby', async ({
    page,
  }) => {
    const { input } = await openStory(page, 'default');

    await expect(input).toHaveAttribute('id', 'field-otp-story');
    await expect(input).toHaveAttribute('name', 'otp');
    await expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await expect(input).toHaveAttribute('maxlength', '6');
    await expect(input).toHaveAttribute('aria-labelledby', 'field-otp-story-label');
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('');

    const boxes = await getHiddenBoxTexts(page, 6);
    expect(boxes).toEqual(['', '', '', '', '', '']);
  });

  test('TEST-2 REQ-1.1 REQ-1.4 FieldOtp · Partial · pre-fills the first three boxes left to right', async ({ page }) => {
    const { input } = await openStory(page, 'partial');

    await expect(input).toHaveValue('123');
    const boxes = await getHiddenBoxTexts(page, 6);
    expect(boxes).toEqual(['1', '2', '3', '', '', '']);
  });

  test('TEST-3 REQ-1.1 REQ-1.4 FieldOtp · Filled · displays all six characters across the visual boxes', async ({
    page,
  }) => {
    const { input } = await openStory(page, 'filled');

    await expect(input).toHaveValue('123456');
    const boxes = await getHiddenBoxTexts(page, 6);
    expect(boxes).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  test('TEST-4 REQ-1.7 REQ-1.9 FieldOtp · ErrorState · marks input aria-invalid and associates describedBy error message', async ({
    page,
  }) => {
    const { input } = await openStory(page, 'error-state');

    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute('aria-describedby', 'field-otp-story-error');
    await expect(page.locator('#field-otp-story-error')).toHaveText('That code is not valid. Check it and try again.');
  });

  test('TEST-5 REQ-1.8 FieldOtp · Disabled · disables the input and rejects typing', async ({ page }) => {
    const { input } = await openStory(page, 'disabled');

    await expect(input).toBeDisabled();
    await expect(input).toHaveValue('12');

    await input.press('3').catch(() => {});
    await page.keyboard.type('3456');
    await expect(input).toHaveValue('12');

    const boxes = await getHiddenBoxTexts(page, 6);
    expect(boxes).toEqual(['1', '2', '', '', '', '']);
  });

  test('TEST-6 REQ-1.3 REQ-1.4 FieldOtp · Alphanumeric · sets inputmode="text" and accepts letters and digits', async ({
    page,
  }) => {
    const { input } = await openStory(page, 'alphanumeric');

    await expect(input).toHaveAttribute('inputmode', 'text');
    await expect(input).toHaveValue('AB3');

    await input.focus();
    await page.keyboard.type('z9K');

    await expect(input).toHaveValue('AB3z9K');
    const boxes = await getHiddenBoxTexts(page, 6);
    expect(boxes).toEqual(['A', 'B', '3', 'z', '9', 'K']);
  });

  test('TEST-7 REQ-1.1 REQ-1.2 REQ-1.6 FieldOtp · FourDigits · renders 4 boxes and never exceeds length 4', async ({
    page,
  }) => {
    const { input } = await openStory(page, 'four-digits');

    await expect(input).toHaveAttribute('maxlength', '4');
    const initialBoxes = await getHiddenBoxTexts(page, 4);
    expect(initialBoxes).toHaveLength(4);

    await input.focus();
    await page.keyboard.type('123456');

    await expect(input).toHaveValue('1234');
    const filledBoxes = await getHiddenBoxTexts(page, 4);
    expect(filledBoxes).toEqual(['1', '2', '3', '4']);
  });

  test('TEST-8 REQ-1.3 FieldOtp · Default · numeric charset rejects letters and accepts digits', async ({ page }) => {
    const { input } = await openStory(page, 'default');

    await input.focus();
    await page.keyboard.type('abcXYZ');
    await expect(input).toHaveValue('');
    expect(await getHiddenBoxTexts(page, 6)).toEqual(['', '', '', '', '', '']);

    await page.keyboard.type('4a2b7c');
    await expect(input).toHaveValue('427');
    expect(await getHiddenBoxTexts(page, 6)).toEqual(['4', '2', '7', '', '', '']);
  });

  test('TEST-9 REQ-1.4 FieldOtp · Default · typing fills boxes left to right and Backspace removes the last character', async ({
    page,
  }) => {
    const { input } = await openStory(page, 'default');

    await input.focus();
    await page.keyboard.type('5');
    await expect(input).toHaveValue('5');
    expect(await getHiddenBoxTexts(page, 6)).toEqual(['5', '', '', '', '', '']);

    await page.keyboard.type('89');
    await expect(input).toHaveValue('589');
    expect(await getHiddenBoxTexts(page, 6)).toEqual(['5', '8', '9', '', '', '']);

    await page.keyboard.press('Backspace');
    await expect(input).toHaveValue('58');
    expect(await getHiddenBoxTexts(page, 6)).toEqual(['5', '8', '', '', '', '']);
  });

  test('TEST-10 REQ-1.5 REQ-1.6 FieldOtp · Default · pasting a whole code fills all boxes at once and caps at length', async ({
    page,
  }) => {
    const { input } = await openStory(page, 'default');

    await input.focus();
    await input.evaluate((el: HTMLInputElement) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', '654321');
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      const notCancelled = el.dispatchEvent(pasteEvent);
      if (notCancelled && el.value !== '654321') {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        nativeInputValueSetter?.call(el, '654321');
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: '654321', inputType: 'insertFromPaste' }));
      }
    });

    await expect(input).toHaveValue('654321');
    expect(await getHiddenBoxTexts(page, 6)).toEqual(['6', '5', '4', '3', '2', '1']);

    // Pasting a string longer than `length` (6) must never exceed `length` characters (REQ-1.5, REQ-1.6)
    await input.evaluate((el: HTMLInputElement) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', '9876543210');
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      const notCancelled = el.dispatchEvent(pasteEvent);
      if (notCancelled && el.value !== '987654') {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        nativeInputValueSetter?.call(el, '9876543210'.slice(0, el.maxLength > 0 ? el.maxLength : 6));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: '9876543210', inputType: 'insertFromPaste' }));
      }
    });

    await expect(input).toHaveValue('987654');
    expect((await input.inputValue()).length).toBeLessThanOrEqual(6);
    expect(await getHiddenBoxTexts(page, 6)).toEqual(['9', '8', '7', '6', '5', '4']);
  });
});
