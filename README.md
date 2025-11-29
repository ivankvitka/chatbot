# Chatbot - Damba Screenshot & WhatsApp Integration

An automated screenshot service that captures screenshots from Damba platform and sends them to WhatsApp groups on schedule or when triggered by specific messages.

## Features

- 📸 **Damba Integration**: Authenticate and capture screenshots from Damba platform
- 📱 **WhatsApp Integration**: Send screenshots directly to WhatsApp groups
- ⏰ **Scheduled Screenshots**: Automatically send screenshots at configurable intervals (1, 5, 10, 15, 30, or 60 minutes)
- 💬 **Message-Triggered Screenshots**: React to specific keywords in group messages and send screenshots immediately
- ⚙️ **Group Settings**: Configure individual settings for each WhatsApp group
- 🎨 **Modern UI**: React-based frontend with responsive design
- 🏗️ **NestJS Backend**: Robust API built with NestJS framework

## Tech Stack

### Backend

- **NestJS**: Node.js framework for building scalable server-side applications
- **PostgreSQL**: Primary database for application state and group settings
- **Prisma**: ORM for type-safe database operations
- **whatsapp-web.js**: WhatsApp Web API integration
- **@nestjs/schedule**: Task scheduling for automated screenshot sending
- **TypeScript**: Strongly typed programming language

### Frontend

- **React**: JavaScript library for building user interfaces
- **Vite**: Fast build tool and development server
- **Zustand**: State management for frontend
- **Axios**: HTTP client for API requests
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Strongly typed programming language

## Project Structure

```
chatbot/
├── backend/
│   ├── docker-compose.yml     # Docker services configuration
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── damba/             # Damba integration module
│   │   │   ├── dto/           # Data transfer objects
│   │   │   ├── guards/        # Authentication guards
│   │   │   ├── interfaces/   # TypeScript interfaces
│   │   │   ├── damba.controller.ts    # Damba API endpoints
│   │   │   ├── damba.service.ts        # Damba service
│   │   │   └── zone.service.ts         # Zone management service
│   │   ├── whatsapp/          # WhatsApp integration module
│   │   │   ├── dto/           # Data transfer objects
│   │   │   ├── alert-monitor.service.ts      # Message monitoring
│   │   │   ├── group-settings.service.ts     # Group settings management
│   │   │   ├── screenshot-scheduler.service.ts  # Scheduled screenshot sending
│   │   │   ├── whatsapp.service.ts            # WhatsApp client service
│   │   │   └── whatsapp.controller.ts         # WhatsApp API endpoints
│   │   ├── prisma/            # Database service
│   │   └── app.module.ts      # Main application module
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/        # React components
    │   │   ├── AuthStatusButton.tsx      # Authentication status button
    │   │   ├── DambaAuthModal.tsx        # Damba authentication
    │   │   ├── GroupSettingsModal.tsx    # Group settings configuration
    │   │   ├── Header.tsx                # Application header
    │   │   ├── ScreenshotModal.tsx       # Screenshot viewer
    │   │   ├── WhatsAppAuthModal.tsx     # WhatsApp QR authentication
    │   │   ├── WhatsAppGroupsList.tsx    # Groups list with settings
    │   │   └── ZonesManagementModal.tsx  # Zones management
    │   ├── services/          # API services
    │   │   ├── base.api.ts    # Base API configuration
    │   │   ├── damba.api.ts   # Damba API client
    │   │   └── whatsapp.api.ts # WhatsApp API client
    │   ├── stores/            # Zustand state management
    │   │   ├── damba.store.ts  # Damba state
    │   │   └── whatsapp.store.ts # WhatsApp state
    │   └── pages/
    │       └── Dashboard.tsx   # Main dashboard page
    └── package.json
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Docker and Docker Compose (recommended for database)
- WhatsApp account for testing

**Alternative**: PostgreSQL database (if not using Docker)

### Docker Setup (Recommended)

1. **Navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Start the database service:**

   ```bash
   docker-compose up -d postgres
   ```

   This will start PostgreSQL database on port 5432.

3. **Verify the database is running:**

   ```bash
   docker-compose ps
   ```

### Install Dependencies

**Quick Setup (Recommended):**

Use the provided installation script to install all dependencies at once:

```bash
# Make script executable (first time only)
chmod +x install.sh

# Install all dependencies (backend + frontend)
./install.sh
```

This script will:

- Install backend dependencies
- Generate Prisma client
- Install frontend dependencies

**Manual Setup:**

Alternatively, you can install dependencies manually:

1. **Backend dependencies:**

   ```bash
   cd backend
   npm install
   ```

2. **Frontend dependencies:**

   ```bash
   cd frontend
   npm install
   ```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Set up the database:

   **If using Docker** (recommended): The database is already running from the previous step.

   **If using local PostgreSQL**: Ensure PostgreSQL is running and create a database:

   ```bash
   createdb chatbot_db
   ```

   Then generate Prisma client and run migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. Create environment file (`.env`) with your configuration:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/chatbot_db?schema=public"
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   ```

4. Start the development server:
   ```bash
   npm run start:dev
   ```

The backend will be running on `http://localhost:3000`.

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be running on `http://localhost:5173`.

## Usage

### Damba Authentication

1. Click the "Damba" button in the header
2. Enter your Damba token in the modal
3. The authentication status is indicated by a green (authenticated) or red (not authenticated) dot

### WhatsApp Authentication

1. Click the "WhatsApp" button in the header
2. Scan the QR code with your WhatsApp mobile app
3. The connection status is indicated by a green dot when ready

### Configuring Group Settings

1. View your WhatsApp groups in the dashboard
2. Click the settings icon next to a group
3. Configure the following options:
   - **Enable automatic sending**: Toggle to enable/disable scheduled screenshots
   - **Interval**: Choose how often to send screenshots (1, 5, 10, 15, 30, or 60 minutes)
   - **React on message**: Enter a keyword (e.g., "небо") to trigger immediate screenshot sending when the word appears in group messages

### Automatic Screenshot Sending

- When enabled, screenshots are automatically sent to the group at the configured interval
- The interval is displayed under the group name in the groups list
- Screenshots are captured from the Damba platform

### Message-Triggered Screenshots

- When a keyword is configured in "React on message", the system monitors all messages in that group
- If a message contains the keyword, a screenshot is immediately sent to the group
- This works independently of the scheduled sending feature

## API Endpoints

### Damba

- `GET /damba/screenshot` - Get latest screenshot from Damba platform
- `POST /damba/token` - Save Damba authentication token
- `GET /damba/zones` - Get all zones
- `POST /damba/zones` - Create a new zone
- `PUT /damba/zones/:id` - Update a zone
- `DELETE /damba/zones/:id` - Delete a zone

### WhatsApp

- `GET /whatsapp/status` - Check WhatsApp connection status
- `GET /whatsapp/qr` - Get QR code for authentication
- `POST /whatsapp/logout` - Logout from WhatsApp
- `GET /whatsapp/groups` - Get user's WhatsApp groups with settings
- `POST /whatsapp/send-message` - Send message with screenshot to groups
- `GET /whatsapp/groups/:groupId/settings` - Get group settings
- `POST /whatsapp/groups/settings` - Create or update group settings
- `PUT /whatsapp/groups/:groupId/settings` - Update group settings
- `DELETE /whatsapp/groups/:groupId/settings` - Delete group settings

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm run test

# Frontend tests (when added)
cd frontend
npm run test
```

### Docker Management

```bash
# Navigate to backend directory
cd backend

# Start database service
docker-compose up -d postgres

# Stop database service
docker-compose down

# View service logs
docker-compose logs postgres

# Restart service
docker-compose restart

# Remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

### Database Management

```bash
# Generate Prisma client
cd backend
npm run db:generate

# Create and run migrations
npm run db:migrate

# Push schema changes directly to database (for development)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Running in Production Mode (Local)

For testing production builds locally, use the `start-prod.sh` script:

```bash
# Make script executable (first time only)
chmod +x start-prod.sh

# Run all services in production mode
./start-prod.sh
```

This script will:

- ✅ Start PostgreSQL database via Docker
- ✅ Build backend for production
- ✅ Build frontend for production
- ✅ Start backend in production mode (port 3000)
- ✅ Start frontend preview server (port 4173)
- ✅ Automatically cleanup all services on Ctrl+C

**Features:**

- Automatic port checking and cleanup
- Graceful shutdown of all services
- Health checks for all services
- Colored output for better readability
- Logs saved to `/tmp/backend-prod.log` and `/tmp/frontend-prod.log`

**To stop all services:**

- Press `Ctrl+C` - all services will be gracefully shut down
- The script automatically:
  - Stops all Node.js processes
  - Stops Docker containers
  - Cleans up ports

## Security Notes

- Use HTTPS in production
- Store Damba tokens securely
- Validate and sanitize all user inputs
- Implement rate limiting for API endpoints
- Keep WhatsApp session data secure

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
