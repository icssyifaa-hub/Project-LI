# Supabase Auth setup without email

This project does not use SMTP, invitations, email verification or email password recovery.

## Account flow

- Email is used only as the username.
- Admin creates an account.
- The system generates a temporary password and shows it once.
- Admin gives the username and temporary password privately through WhatsApp or in person.
- The user must create a new password immediately after the first login.
- If the user forgets the password, admin generates another temporary password.

## Required server secret

Keep this in `.env.local` and the production server environment:

```env
SUPABASE_SECRET_KEY=your_server_secret_key
```

The secret key is required because only the server is allowed to create Auth users and reset passwords.
Never prefix it with `NEXT_PUBLIC_`.

The 12 existing accounts were migrated to Supabase Auth and the plaintext password column was removed on June 26, 2026.
