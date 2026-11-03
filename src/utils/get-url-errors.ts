// URLSearchParams has already decoded the value once; a second pass undoes double encoding. A literal `%` in the
// text (e.g. "100%") would make that second pass throw, so the once-decoded value is kept instead.
const decodeOnceMore = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const getUrlErrors = (subUrl?: string) => {
  const searchParams = new URLSearchParams(subUrl ? subUrl.split('?')[1] : window.location.search);
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  return { error, message: message ? decodeOnceMore(message) : null };
};
