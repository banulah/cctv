# RISE Village - Frontend

Intelligent Surveillance & Analytics System - React TypeScript Frontend

## Features

- 🎥 Real-time camera monitoring with HLS streaming
- 👤 AI-powered person recognition and tracking
- 🚗 Automatic License Plate Recognition (ANPR)
- 📊 Event timeline and analytics dashboard
- 🔐 Secure authentication system
- 📱 Responsive mobile-friendly design
- 🌐 IoT device management

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **React Router** for navigation
- **HLS.js** for video streaming
- **Context API** for state management

## Prerequisites

- Node.js 18+ and npm/pnpm
- Backend API running (see backend README)
- MediaMTX streaming server

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Backend API URL
VITE_BACKEND_URL=http://localhost:8000

# WebSocket URL
VITE_WS_URL=ws://localhost:8000/ws
```

## Deployment to Vercel

### Step 1: Prepare Backend

Your backend must be publicly accessible. Options:

**Option A: VPS with Public IP**
```bash
# Expose backend port 8000
sudo ufw allow 8000/tcp

# Or use nginx reverse proxy with SSL
sudo apt install nginx certbot
# Configure nginx to proxy port 8000
```

**Option B: Cloudflare Tunnel (Recommended)**
```bash
# Install cloudflared
cloudflared tunnel create rise-backend

# Route DNS
cloudflared tunnel route dns rise-backend api.yourdomain.com

# Run tunnel
cloudflared tunnel run --url http://localhost:8000 rise-backend
```

### Step 2: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables in Vercel Dashboard:**
   - Go to your project settings
   - Add environment variables:
     - `VITE_BACKEND_URL` = `https://api.yourdomain.com`
     - `VITE_WS_URL` = `wss://api.yourdomain.com/ws`

5. **Redeploy after env vars:**
   ```bash
   vercel --prod
   ```

### Step 3: Update Backend CORS

Add your Vercel domain to backend CORS allowed origins:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Authentication

Default credentials:
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Security Note:** Change default credentials in production!

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Layout.tsx    # Main layout with navigation
│   │   ├── Icons.tsx     # SVG icon components
│   │   ├── ProtectedRoute.tsx  # Auth route wrapper
│   │   ├── LiveWall/     # Camera grid components
│   │   └── Dashboard/    # Dashboard components
│   ├── pages/            # Page components
│   │   ├── Login.tsx     # Login page
│   │   ├── Dashboard.tsx # Main dashboard
│   │   ├── LiveWall.tsx  # Camera live view
│   │   ├── CameraDetail.tsx  # Single camera detail
│   │   ├── Events.tsx    # Event timeline
│   │   ├── Identities.tsx    # Identity management
│   │   └── IoTDevices.tsx    # IoT device management
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx   # Authentication context
│   ├── services/         # API services
│   │   └── api.ts        # API client
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── vercel.json           # Vercel configuration
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features in Detail

### Camera Management
- Add/edit/delete cameras
- Start/stop streams
- Toggle AI features (Recognition, ANPR)
- Dual quality streams (High: 1620p, Low: 360p)

### Live Monitoring
- Grid view with all cameras
- HLS adaptive streaming
- Auto-retry with offline detection
- Click to view full detail

### Identity Recognition
- Provisional unknown identities
- Known identity management
- ML review queue for uncertain recognitions
- Feedback system for ML training

### Events
- Real-time event feed
- Filter by type and camera
- Person recognition events
- ANPR detections
- Motion events

### IoT Integration
- Temperature sensors
- Motion detectors
- Access control
- Environmental monitoring

## Security Features

- JWT-based authentication
- Protected routes
- Automatic token refresh
- Secure HTTP headers
- Rate limiting (configured in backend)

## Troubleshooting

### Cameras Not Loading
1. Check backend is accessible
2. Verify MediaMTX is running
3. Check browser console for errors
4. Verify camera RTSP URLs are correct

### WebSocket Connection Failed
1. Ensure backend WebSocket endpoint is accessible
2. Check firewall allows WebSocket connections
3. Verify WS_URL environment variable

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

## Support

For issues and questions:
- Check backend logs for API errors
- Check browser console for frontend errors
- Verify all services are running (backend, MediaMTX, PostgreSQL)

## License

Proprietary - RISE Village Security System
