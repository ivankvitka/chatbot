# Chatbot - Screenshot & WhatsApp Integration

A chatbot application that can authenticate users, take screenshots from websites, and send them to WhatsApp groups.

## Features

- 🔐 **Authentication**: JWT-based user authentication with bearer tokens
- 📸 **Screenshot Capture**: Take screenshots from any website using Puppeteer
- 📱 **WhatsApp Integration**: Send screenshots directly to WhatsApp groups
- 🎨 **Modern UI**: React-based frontend with responsive design
- 🏗️ **NestJS Backend**: Robust API built with NestJS framework

## Tech Stack

### Backend

- **NestJS**: Node.js framework for building scalable server-side applications
- **PostgreSQL**: Primary database for user data and application state
- **Prisma**: ORM for type-safe database operations
- **Puppeteer**: Headless Chrome browser for screenshot capture
- **whatsapp-web.js**: WhatsApp Web API integration
- **JWT**: JSON Web Tokens for authentication
- **TypeScript**: Strongly typed programming language

### Frontend

- **React**: JavaScript library for building user interfaces
- **Vite**: Fast build tool and development server
- **Axios**: HTTP client for API requests
- **TypeScript**: Strongly typed programming language

## Project Structure

```
chatbot/
├── docker-compose.yml          # Docker services configuration
├── docker-compose.override.yml # Development overrides
├── docker.env                  # Docker environment variables
├── Makefile                    # Development workflow automation
├── .dockerignore              # Docker ignore file
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── init.sql          # Database initialization
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── prisma/            # Database service
│   │   ├── screenshot/        # Screenshot capture module
│   │   ├── whatsapp/          # WhatsApp integration module
│   │   ├── common/            # Shared utilities and DTOs
│   │   └── app.module.ts      # Main application module
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   │   ├── auth/       # Authentication components
    │   │   ├── screenshot/ # Screenshot components
    │   │   └── whatsapp/   # WhatsApp components
    │   ├── services/       # API services
    │   └── App.tsx         # Main React app
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

1. **Start the database services:**

   ```bash
   docker-compose up -d postgres pgadmin
   ```

   This will start:

   - PostgreSQL database on port 5432
   - pgAdmin web interface on port 8080

2. **Verify the database is running:**

   ```bash
   docker-compose ps
   ```

3. **Access pgAdmin (optional):**

   Open http://localhost:8080 and login with:

   - Email: `admin@chatbot.com`
   - Password: `admin123`

### Quick Setup with Makefile (Recommended)

For easier development workflow, use the provided Makefile:

```bash
# Complete setup (Docker + dependencies)
make setup

# Start development servers
make dev

# Other useful commands
make help          # Show all available commands
make db-up         # Start database only
make db-down       # Stop database
make db-logs       # View database logs
make reset         # Reset everything (WARNING: deletes data)
```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up the database:

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

4. Create environment file:

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration, including:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/chatbot_db?schema=public"
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

5. Start the development server:
   ```bash
   npm run start:dev
   ```

The backend will be running on `http://localhost:3000`.

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be running on `http://localhost:5173`.

## Usage

### Authentication

1. Register a new account or login with existing credentials
2. JWT tokens are automatically stored in localStorage

### Taking Screenshots

1. Navigate to the "Screenshot" tab
2. Configure screenshot options (URL, dimensions, etc.)
3. Click "Capture Screenshot" to take a screenshot
4. Download the captured screenshot

### WhatsApp Integration

1. Navigate to the "WhatsApp" tab
2. Authenticate with WhatsApp by scanning the QR code
3. Select a WhatsApp group
4. Use "Capture & Send Screenshot" to automatically capture and send screenshots

## API Endpoints

### Authentication

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile

### Screenshots

- `POST /screenshot/capture` - Capture screenshot
- `GET /screenshot/download` - Download screenshot
- `GET /screenshot/view` - View screenshot

### WhatsApp

- `GET /whatsapp/status` - Check WhatsApp connection status
- `GET /whatsapp/qr` - Get QR code for authentication
- `GET /whatsapp/groups` - Get user's WhatsApp groups
- `POST /whatsapp/send-screenshot` - Send screenshot to group
- `POST /whatsapp/capture-and-send` - Capture and send screenshot

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
# Start database services
docker-compose up -d

# Stop database services
docker-compose down

# View service logs
docker-compose logs postgres
docker-compose logs pgadmin

# Restart services
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

## Security Notes

- Change the JWT secret in production
- Use HTTPS in production
- Validate and sanitize all user inputs
- Store sensitive data securely
- Implement rate limiting for API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
