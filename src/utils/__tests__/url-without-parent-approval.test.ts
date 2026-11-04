import { describe, expect, it } from 'vitest';
import { urlWithoutParentChallenge } from '../url-params';

describe('REQ-9 Start again URL is a lossless parent-only removal', () => {
  it.each([
    ['https://login.example/web?parent_challenge_id=old', 'https://login.example/web'],
    ['https://login.example/web?Parent_Challenge_Id=old&x=1', 'https://login.example/web?x=1'],
    ['https://login.example/web?a=1&PARENT_CHALLENGE_ID=old&z=2#section', 'https://login.example/web?a=1&z=2#section'],
    [
      'https://login.example/web?parent_challenge_id=one&parent_challenge_id=two&Parent_Challenge_Id=three',
      'https://login.example/web',
    ],
    [
      'https://login.example/web?keep=a%20b%2fc&parent_challenge_id=old&keep=x+y&empty=#anchor',
      'https://login.example/web?keep=a%20b%2fc&keep=x+y&empty=#anchor',
    ],
    ['https://login.example/web?parent_challenge_id=&x=%2F%2f', 'https://login.example/web?x=%2F%2f'],
    [
      'https://login.example/web?x=parent_challenge_id%3Dold&not_parent_challenge_id=keep',
      'https://login.example/web?x=parent_challenge_id%3Dold&not_parent_challenge_id=keep',
    ],
    ['https://login.example/web#parent_challenge_id=not-query', 'https://login.example/web#parent_challenge_id=not-query'],
  ])('cleans %s without rewriting other raw bytes', (url, expected) => {
    expect(urlWithoutParentChallenge(url)).toBe(expected);
    expect(urlWithoutParentChallenge(expected)).toBe(expected);
  });
});
