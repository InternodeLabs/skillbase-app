/** Temporary static unlock for private skill share links. Not for Share UI. */
export const PRIVATE_SHARE_CODE = "123456789";

export function matchesPrivateShareCode(
  value: string | string[] | null | undefined,
): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === PRIVATE_SHARE_CODE;
}
