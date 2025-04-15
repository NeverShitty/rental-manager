# ARIBIA Rental Portal Architecture

## System Overview

The ARIBIA Rental Management Portal is designed as a modern web application with a React frontend and Node.js backend. The architecture follows a service-oriented approach with clear separation of concerns and integration with multiple third-party services.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARIBIA Rental Portal                          │
├─────────────┬─────────────────────────────┬────────────────────┤
│             │                             │                    │
│  Property   │        Tenant               │    Admin           │
│  Manager    │        Portal               │    Dashboard       │
│  Dashboard  │                             │                    │
│             │                             │                    │
├─────────────┴─────────────────────────────┴────────────────────┤
│                                                                 │
│                       Application Core                          │
│                                                                 │
├─────────────┬─────────────────────────────┬────────────────────┤
│             │                             │                    │
│ User &      │     Property                │   Financial        │
│ Auth        │     Management              │   Management       │
│ Services    │     Services                │   Services         │
│             │                             │                    │
├─────────────┼─────────────────────────────┼────────────────────┤
│             │                             │                    │
│ Document    │     Maintenance             │   Reporting        │
│ Management  │     Management              │   Services         │
│ Services    │     Services                │                    │
│             │                             │                    │
├─────────────┴─────────────────────────────┴────────────────────┤
│                                                                 │
│                   Integration Layer                             │
│                                                                 │
├─────────┬───────────┬────────────┬───────────┬─────────────────┤
│         │           │            │           │                 │
│ DoorLoop│   Wave    │  HubSpot   │ Microsoft │   Mercury       │
│   API   │    API    │    API     │  365 API  │    Bank API     │
│         │           │            │           │                 │
└─────────┴───────────┴────────────┴───────────┴─────────────────┘
```

## Component Architecture

### Frontend

The frontend is built with React and uses the following main components:

1. **User Interface Layer**
   - Property Manager Dashboard
   - Tenant Portal
   - Admin Dashboard
   - Shared UI components (navigation, forms, tables)

2. **State Management**
   - React Query for server state
   - Context API for application state
   - Form state with React Hook Form

3. **Routing**
   - Wouter for navigation
   - Protected routes based on user roles

### Backend

The backend is built with Node.js/Express and follows this structure:

1. **API Layer**
   - RESTful endpoints
   - Request validation
   - Response formatting
   - Authentication middleware

2. **Service Layer**
   - User service
   - Property service
   - Tenant service
   - Document service
   - Financial service
   - Integration services

3. **Data Layer**
   - PostgreSQL database
   - Drizzle ORM
   - Data validation with Zod

## Integration Architecture

The system integrates with the following external services:

1. **DoorLoop API**
   - Property data synchronization
   - Tenant information
   - Lease details

2. **Wave API**
   - Financial transaction data
   - Invoice management
   - Account balances

3. **HubSpot API**
   - CRM functionality
   - Contact management
   - Lead tracking

4. **Microsoft 365 API**
   - Document storage
   - Email integration
   - Calendar functionality

5. **Mercury Bank API**
   - Financial accounts
   - Transaction data
   - Payment processing

## Data Flow

1. **User Authentication**
   - User logs in with credentials
   - System validates and issues JWT token
   - Token is used for subsequent requests

2. **Property Management**
   - Properties synchronized from DoorLoop
   - Local data enriched with custom fields
   - Changes can be pushed back to DoorLoop

3. **Financial Tracking**
   - Transactions pulled from Wave and Mercury Bank
   - Data normalized and merged
   - Reports generated from combined data

4. **Document Management**
   - Documents stored in Microsoft 365
   - Metadata stored in local database
   - Access controlled by user permissions

## Security Architecture

1. **Authentication**
   - Password hashing with bcrypt
   - JWT for session management
   - Role-based access control

2. **API Security**
   - HTTPS for all communications
   - API key storage in secure environment variables
   - Request validation

3. **Data Privacy**
   - PII encryption
   - Data access auditing
   - Compliance with privacy regulations

## Deployment Architecture

The application is deployed on Replit with the following considerations:

1. **Infrastructure**
   - Node.js runtime environment
   - PostgreSQL database
   - Static file serving

2. **Performance**
   - Server-side caching
   - Client-side query caching
   - Optimized API calls

3. **Monitoring**
   - Error tracking
   - Performance monitoring
   - Usage analytics

## Future Architectural Considerations

1. **Scalability**
   - Microservices decomposition
   - Serverless functions for specific workloads
   - Horizontal scaling

2. **Advanced Features**
   - Real-time notifications
   - Machine learning for maintenance prediction
   - Advanced reporting engine

3. **Mobile Architecture**
   - Progressive Web App (PWA)
   - Responsive design
   - Mobile-specific features

---

*Last updated: April 15, 2025*