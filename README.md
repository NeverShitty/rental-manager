# ARIBIA LLC Rental Management Portal

A comprehensive property management platform for ARIBIA LLC designed to streamline property management operations with advanced technological integrations and robust API connectivity.

## Features

- Multi-user authentication with role-based access control
- Property, tenant, and maintenance management
- Financial tracking and reporting
- Integration with external services:
  - DoorLoop for property management data
  - Wave for accounting and financial records
  - HubSpot for CRM and lead tracking
  - Microsoft 365 for email and document management
  - Mercury Bank for banking operations
- Business entity management with ownership structure tracking
- Tax treatment and filing management

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn UI
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js
- **Data Fetching**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys for external services:
  - DoorLoop
  - Wave
  - HubSpot
  - Microsoft 365
  - Mercury Bank (optional)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/aribia-rental-portal.git
   cd aribia-rental-portal
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/aribia_portal
   DOORLOOP_API_KEY=your_doorloop_api_key
   WAVE_API_KEY=your_wave_api_key
   HUBSPOT_API_KEY=your_hubspot_api_key
   MS365_TENANT_ID=your_ms365_tenant_id
   MS365_CLIENT_ID=your_ms365_client_id
   MS365_CLIENT_SECRET=your_ms365_client_secret
   ```

4. Initialize the database:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## Project Structure

```
.
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   ├── pages/         # Page components
│   │   └── index.tsx      # Entry point
├── server/                # Backend Express application
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic
│   └── index.ts           # Entry point
├── shared/                # Shared code between client and server
│   └── schema.ts          # Database schema and types
└── docs/                  # Documentation
```

## API Documentation

See the [API documentation](docs/API_INTEGRATIONS.md) for details on available endpoints and integration information.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

ARIBIA LLC - [contact@aribia.com](mailto:contact@aribia.com)

Project Link: [https://github.com/your-username/aribia-rental-portal](https://github.com/your-username/aribia-rental-portal)