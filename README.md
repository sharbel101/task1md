# Developer Application Portal

A Next.js application for managing developer applications and evaluations.

## Deployment on Vercel

### Prerequisites

1. A Vercel account
2. A Supabase project
3. SMTP server credentials for email notifications

### Environment Variables Setup

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following environment variables:

#### Required Environment Variables
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-dashboard

# Email Configuration (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com

# Storage Configuration (Optional - if using custom storage URL)
NEXT_PUBLIC_STORAGE_URL=https://your-project.supabase.co/storage/v1
```

### Deployment Steps

1. Fork or clone this repository
2. Push your code to GitHub
3. In Vercel:
   - Click "New Project"
   - Import your GitHub repository
   - Configure project:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: `next build`
     - Output Directory: .next
   - Add all required environment variables
   - Click "Deploy"

### Post-Deployment Setup

1. Configure Supabase:
   - Create required tables in your Supabase database
   - Set up storage buckets:
     ```sql
     -- Create storage buckets
     insert into storage.buckets (id, name, public) values
       ('profile-pictures', 'profile-pictures', true),
       ('source-code', 'source-code', true);
     
     -- Set up storage policies
     create policy "Public Access"
       on storage.objects for select
       using ( bucket_id in ('profile-pictures', 'source-code') );
     
     create policy "Authenticated Upload"
       on storage.objects for insert
       with check ( bucket_id in ('profile-pictures', 'source-code') 
                   and auth.role() = 'authenticated' );
     ```

2. Test the Application:
   - Verify authentication flow
   - Test file uploads
   - Check email notifications
   - Verify realtime updates

### Troubleshooting

1. Build Failures:
   - Check Vercel build logs
   - Verify all environment variables are set
   - Ensure Node.js version is compatible (>=18.17.0)

2. Runtime Errors:
   - Check Vercel function logs
   - Verify Supabase connection
   - Test API routes individually

3. Common Issues:
   - CORS errors: Check Supabase CORS settings
   - Auth errors: Verify Supabase URL and anon key
   - Storage errors: Check bucket permissions
   - Email errors: Verify SMTP credentials

### Security Best Practices

1. Environment Variables:
   - Never commit .env files
   - Use Vercel's environment variable encryption
   - Rotate sensitive keys regularly

2. Database Security:
   - Use Row Level Security (RLS)
   - Implement proper access policies
   - Regular security audits

3. API Security:
   - Rate limiting
   - Input validation
   - Proper error handling

### Performance Optimization

1. Build Optimization:
   - Enable Vercel's Edge Network
   - Use proper caching headers
   - Optimize images and assets

2. Runtime Optimization:
   - Implement proper loading states
   - Use efficient database queries
   - Optimize realtime subscriptions

## Development

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create .env.local:
   ```bash
   cp .env.example .env.local
   ```

3. Update .env.local with your values

4. Run development server:
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
