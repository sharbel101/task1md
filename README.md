# Developer Application Portal

A Next.js application for managing developer applications and evaluations.

## Deployment on Vercel

### Prerequisites

1. A Vercel account
2. A Supabase project
3. SMTP server credentials for email notifications

### Environment Variables

The following environment variables must be set in your Vercel project settings:

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Email Configuration (SMTP)
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

#### Storage Configuration
```
NEXT_PUBLIC_STORAGE_URL=your-storage-url
```

### Deployment Steps

1. Fork or clone this repository
2. Connect your Vercel account to your GitHub repository
3. In the Vercel dashboard:
   - Set all required environment variables
   - Configure build settings:
     - Framework Preset: Next.js
     - Build Command: `next build`
     - Output Directory: `.next`
4. Deploy the project

### Post-Deployment Setup

1. Configure Supabase Storage:
   - Create two buckets: `profile-pictures` and `source-code`
   - Set appropriate bucket policies
   - Enable public access if needed

2. Configure Database:
   - Ensure all required tables are created
   - Set up appropriate RLS policies
   - Configure realtime subscriptions if needed

3. Test the Application:
   - Verify email notifications
   - Test file uploads
   - Check realtime updates
   - Verify authentication flow

### Troubleshooting

1. If file uploads fail:
   - Check bucket permissions in Supabase
   - Verify storage URL configuration
   - Check file size limits

2. If email notifications fail:
   - Verify SMTP credentials
   - Check email service provider limits
   - Review server logs for errors

3. If authentication fails:
   - Verify Supabase configuration
   - Check middleware settings
   - Review session handling

### Security Considerations

1. All sensitive routes are protected by middleware
2. File uploads are validated and compressed
3. Environment variables are properly secured
4. Database access is controlled by RLS policies

### Performance Optimization

1. Images are automatically compressed
2. Static assets are cached
3. Real-time updates are optimized
4. Database queries are indexed

## Development

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Run the development server:
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
