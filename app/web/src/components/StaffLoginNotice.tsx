export function StaffLoginNotice() {
  return (
    <div style={{ border: '1px solid #e0b100', background: '#fff8e1', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
      Staff accounts require two-factor authentication. Please sign in through <a href="/staff/login">/staff/login</a> (password + authenticator code),
      then you will be redirected to the admin panel.
    </div>
  );
}
