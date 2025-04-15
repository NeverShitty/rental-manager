# ARIBIA LLC Rental Management Portal Architecture

## System Overview

The Rental Management Portal is a full-stack application built to manage properties, tenants, financial data, and integrations with external services. It uses a modern React frontend with a Node.js/Express backend, connecting to a PostgreSQL database.

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn UI component library
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **API Integrations**: 
  - DoorLoop (property management)
  - Wave (accounting)
  - HubSpot (CRM/leads)
  - Microsoft 365 (emails/documents)
  - Mercury Bank (financial)

## Core Architecture

The application follows a standard client-server architecture with the following key components:

### Client-Side Architecture
- React application using functional components and hooks
- Component hierarchy with UI components and page components
- State management using React Query for server state
- Authentication using session-based auth with Passport.js
- Routing with Wouter

### Server-Side Architecture
- Express server with RESTful API endpoints
- Authentication middleware using Passport.js
- Storage layer abstracting database operations
- Service layer for external API integrations
- Middleware for request validation and error handling

### Database Architecture
- PostgreSQL database with the following key tables:
  - users
  - properties
  - tenants
  - maintenanceRequests
  - transactions
  - businessAccounts
  - businessRelationships
  - businessOwners
  - businessTaxYears
  - mercuryCredentials
  - mercuryAccounts

## Component Structure

### Frontend Components
- UI Components (inputs, buttons, cards, etc.)
- Layout Components (dashboard layout, sidebar, etc.)
- Feature Components (property list, tenant management, etc.)
- Integration Components (service connectors, API forms, etc.)
- Page Components (route-level components)

### Backend Components
- Routes (API endpoints)
- Services (business logic and external API integration)
- Storage (database access)
- Auth (authentication and authorization)
- Middleware (validation, error handling, etc.)

## API Design

The backend exposes RESTful APIs that follow these patterns:
- Resource-based URLs (e.g., `/api/properties`, `/api/tenants`)
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON request and response bodies
- Authentication via session cookies
- Error responses with appropriate status codes and messages

## Data Flow

1. **User Authentication**:
   - User logs in with username/password
   - Server authenticates and establishes session
   - Client stores session cookie

2. **Data Retrieval**:
   - Client requests data via React Query
   - Server validates request and retrieves data from database or external APIs
   - Client receives data and displays it

3. **Data Mutation**:
   - Client sends data updates via React Query mutations
   - Server validates input and updates database
   - Server returns success/failure
   - Client updates UI based on response

4. **External API Integration**:
   - Client requests data from external APIs
   - Server proxies requests to external APIs using stored credentials
   - Server transforms responses to match internal data models
   - Client displays integrated data

## Deployment Architecture

The application is deployed on Replit with:
- Node.js Express server
- Vite for frontend bundling
- PostgreSQL database
- Static IP proxy for secure API connections
- Environment variables for sensitive configuration