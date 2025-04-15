export const getUrlErrors = (subUrl?: string) => {
  const searchParams = new URLSearchParams(subUrl ? subUrl.split('?')[1] : window.location.search);
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  return { error, message: message ? decodeURIComponent(message) : null };
};