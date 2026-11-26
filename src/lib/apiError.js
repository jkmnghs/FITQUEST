/**
 * A user-facing message for a failed /api/* response.
 *
 * Our routes answer with { error: 'text' }, but an upstream Anthropic failure
 * is passed through as { type: 'error', error: { type, message } }. Callers
 * used to read `data.error` as text, so an Anthropic rejection showed as
 * "[object Object]" or a bare "API error 400" and the real cause was lost.
 */
export async function apiErrorMessage(res, fallback = 'Request failed') {
  const data = await res.json().catch(() => ({}));
  const err = data?.error;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err.message === 'string' && err.message) return `${fallback}: ${err.message}`;
  if (res.status === 401) return 'Session expired — please sign in again.';
  return `${fallback} (${res.status}). Try again.`;
}
