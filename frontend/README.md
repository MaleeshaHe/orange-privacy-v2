# OrangePrivacy Frontend

A modern, responsive Next.js 14 frontend application for OrangePrivacy - a facial recognition privacy tool.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **File Upload**: React Dropzone
- **Icons**: Lucide React

## Features

### Authentication
- User registration with validation
- Secure login with JWT
- Protected routes with authentication middleware
- Persistent authentication state

### Dashboard
- Overview statistics (photos, scans, matches)
- Quick action shortcuts
- Real-time scan status monitoring

### Reference Photos Management
- Drag-and-drop photo upload
- Photo gallery with grid view
- Activate/deactivate photos
- Delete photos with confirmation

### Scan Management
- Create new scans (web, social media, or combined)
- Configure confidence thresholds
- Real-time scan status updates
- View scan history with filtering

### Results Viewing
- Grid view of all scan matches
- Confidence score visualization
- Confirm/reject matches
- Source URL linking
- Image preview modals

### Profile & Settings
- Update personal information
- Change password
- Manage biometric consent
- Configure privacy mode
- Adjust default scan settings
- Notification preferences

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── photos/         # Photo management
│   │   │   ├── scans/          # Scan management
│   │   │   ├── results/        # Results viewing
│   │   │   ├── profile/        # User profile
│   │   │   └── settings/       # User settings
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home/redirect page
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Alert.tsx
│   │   └── dashboard/          # Dashboard-specific components
│   │       ├── Sidebar.tsx
│   │       └── DashboardLayout.tsx
│   ├── lib/
│   │   ├── api.ts              # API client & endpoints
│   │   └── store.ts            # Zustand state management
│   └── styles/
│       └── globals.css         # Global styles & Tailwind
├── .env.local                  # Environment variables
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:5000

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NODE_ENV=development
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser:
```
http://localhost:3000
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## API Integration

The frontend communicates with the backend through a centralized API client (`src/lib/api.ts`):

### Available API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/consent/biometric` - Give biometric consent
- `DELETE /api/auth/consent/biometric` - Revoke biometric consent
- `POST /api/auth/change-password` - Change password

#### Reference Photos
- `GET /api/ref-photos` - Get all photos
- `POST /api/ref-photos` - Upload new photo
- `DELETE /api/ref-photos/:id` - Delete photo
- `PATCH /api/ref-photos/:id/deactivate` - Deactivate photo

#### Scan Jobs
- `GET /api/scan-jobs` - Get all scans
- `GET /api/scan-jobs/:id` - Get scan details
- `POST /api/scan-jobs` - Create new scan
- `POST /api/scan-jobs/:id/cancel` - Cancel scan
- `GET /api/scan-jobs/stats` - Get scan statistics

#### Scan Results
- `GET /api/scan-results/scan/:scanId` - Get results for scan
- `GET /api/scan-results/scan/:scanId/stats` - Get result stats
- `PATCH /api/scan-results/:id/confirm` - Confirm/reject match

### Authentication Flow

The app uses JWT-based authentication:

1. User logs in → receives JWT token
2. Token stored in localStorage and Zustand store
3. Axios interceptor adds token to all requests
4. Backend validates token for protected endpoints
5. On 401 error, user is redirected to login

## UI Components

### Button
```tsx
<Button variant="primary" size="md" isLoading={false}>
  Click me
</Button>
```

Variants: `primary`, `secondary`, `danger`, `ghost`
Sizes: `sm`, `md`, `lg`

### Card
```tsx
<Card padding="md">
  <h2>Card Title</h2>
  <p>Card content</p>
</Card>
```

### Input
```tsx
<Input
  label="Email"
  type="email"
  error="Error message"
  helperText="Helper text"
/>
```

### Badge
```tsx
<Badge variant="success" size="md">
  Active
</Badge>
```

Variants: `success`, `warning`, `error`, `info`, `default`

### Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  footer={<Button>Action</Button>}
>
  Modal content
</Modal>
```

### Alert
```tsx
<Alert variant="success" onClose={handleClose}>
  Operation successful!
</Alert>
```

## State Management

The app uses Zustand for global state management with persistence:

```typescript
// Access auth state
const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore();

// Login
login(userData, jwtToken);

// Logout
logout();

// Update user
updateUser({ firstName: 'New Name' });
```

## Styling Guide

### Color Scheme

Primary color (Orange):
- `bg-orange-50` to `bg-orange-900`
- `text-orange-50` to `text-orange-900`

### Responsive Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Custom CSS Classes

Defined in `globals.css`:
- `.btn-primary` - Primary button styles
- `.btn-secondary` - Secondary button styles
- `.btn-danger` - Danger button styles
- `.input-field` - Input field styles
- `.card` - Card container styles

## TypeScript

All components are fully typed with TypeScript:

```typescript
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin';
  biometricConsentGiven: boolean;
  privacyMode: 'standard' | 'privacy';
  confidenceThreshold: number;
}
```

## Error Handling

The app includes comprehensive error handling:

1. **API Errors**: Displayed using Alert components
2. **Form Validation**: Real-time validation with react-hook-form
3. **Network Errors**: Automatic token refresh and redirect to login
4. **Loading States**: Loading indicators for async operations

## Performance Optimization

- **Code Splitting**: Automatic code splitting per route
- **Image Optimization**: Next.js Image component (when needed)
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Bundle Size**: Optimized production build (~90KB initial load)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

### Adding a New Page

1. Create page in `src/app/dashboard/your-page/page.tsx`
2. Use `DashboardLayout` wrapper
3. Add route to sidebar navigation in `Sidebar.tsx`

### Adding a New API Endpoint

1. Add endpoint function to `src/lib/api.ts`
2. Group by feature (auth, photos, scans, etc.)
3. Use consistent naming: `getAll`, `getById`, `create`, `update`, `delete`

### Creating Custom Components

1. Create in `src/components/ui/`
2. Use TypeScript interfaces for props
3. Include proper accessibility attributes
4. Add to `src/components/ui/index.ts` for easy imports

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### API Connection Issues
```bash
# Check backend is running
curl http://localhost:5000/health

# Verify .env.local settings
cat .env.local
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### TypeScript Errors
```bash
# Check types
npm run type-check

# Update TypeScript
npm install -D typescript@latest
```

## Contributing

When contributing to the frontend:

1. Follow the existing code structure
2. Use TypeScript for all new files
3. Write descriptive component and function names
4. Add proper error handling
5. Test on multiple screen sizes
6. Ensure accessibility standards

## License

This project is part of OrangePrivacy MVP.

## Support

For issues or questions:
- Check backend logs for API errors
- Review browser console for frontend errors
- Verify environment variables are correct
- Ensure backend is running and accessible
