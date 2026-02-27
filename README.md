# Records App

Next.js 15.5.9 + React 19 + JavaScript + Tailwind + MongoDB/Mongoose app with JWT auth.

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill:
   - `MONGODB_URI`
   - `JWT_SECRET`
3. Install deps:
   - `npm install`
4. Run:
   - `npm run dev`

## Default admin

- Username: `admin`
- Password: `Admin@123`
- First login forces password reset.

## Implemented features

- JWT auth with httpOnly cookie
- First-login password reset
- Admin can add users (user/admin role)
- Admin can configure input fields and types: `string`, `number`, `boolean`, `date`
- Record entry form generated from admin schema
- Date fields use date picker
- Other field types use text input
- Users can download their own Excel
- Admin can download:
  - own Excel
  - consolidated Excel
  - filtered consolidated Excel (user/date filters)
- Admin consolidated records view
