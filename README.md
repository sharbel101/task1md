# Developer Application Portal

A Next.js application for managing developer applications and evaluations.

## Features

- User authentication with role-based access (Developer/Evaluator)
- Developer application submission with file uploads
- Application evaluation system
- Real-time updates using Supabase
- Email notifications for application status

## Development

### Prerequisites

- Node.js (>=18.17.0)
- npm or yarn
- Supabase account
- SMTP server for email notifications

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create .env.local with the following variables:
   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Email Configuration
   SMTP_HOST=your-smtp-host
   SMTP_PORT=your-smtp-port
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   SMTP_FROM=your-sender-email
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## License

MIT
