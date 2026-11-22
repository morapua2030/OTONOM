/**
 * Official OTONOM artwork in the admin (brand guardian: the locked Hybrid 03 files, byte-for-byte, never redrawn,
 * recoloured or mirrored).
 * - AdminLogo: Payload's sign-in page (`/admin/login`) — the full lockup on a light surface (primary_light.svg).
 * - AdminIcon: the small mark in the top bar's breadcrumb — the derived toggle icon (toggle_icon.svg).
 */
export function AdminLogo() {
  return <img className="otn-login-logo" src="/brand/otonom/assets/svg/primary_light.svg" alt="OTONOM IoT Solutions" width={820} height={217} />;
}

export function AdminIcon() {
  return <img className="otn-header-icon" src="/brand/otonom/assets/svg/toggle_icon.svg" alt="OTONOM" width={200} height={160} />;
}
