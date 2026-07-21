export const OAUTH_REDIRECT_COOKIE = 'ticket95_oauth_redirect';

export function getSafeRedirectPath(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/profile';
  }
  return next;
}

export function setOAuthRedirectCookie(redirectPath: string) {
  const safe = getSafeRedirectPath(redirectPath);
  document.cookie = `${OAUTH_REDIRECT_COOKIE}=${encodeURIComponent(safe)}; path=/; max-age=600; SameSite=Lax`;
}
