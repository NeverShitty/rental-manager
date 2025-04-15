# Contributing to ARIBIA Rental Portal

This document provides guidelines for contributing to the ARIBIA Rental Portal project. We appreciate your interest in making this project better!

## Getting Started

1. **Fork the Repository**: Start by forking the repository to your GitHub account.

2. **Clone the Repository**: Clone your fork to your local machine.
   ```bash
   git clone https://github.com/YOUR-USERNAME/aribia-rental-portal.git
   cd aribia-rental-portal
   ```

3. **Install Dependencies**: Set up your local development environment.
   ```bash
   npm install
   ```

4. **Create a Branch**: Always create a new branch for your work.
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Environment Setup

1. Create a `.env` file in the root directory (use `.env.example` as a template).
2. Obtain necessary API keys for development (DoorLoop, Wave, HubSpot, etc.).

### Running the Application

```bash
npm run dev
```

This will start both the frontend and backend servers.

### Code Standards

- **Linting**: Run `npm run lint` to check your code against our standards.
- **TypeScript**: All new code should be properly typed using TypeScript.
- **Component Structure**: Follow the established component patterns.
- **API Endpoints**: All API endpoints should be RESTful and well-documented.

### Database Changes

1. Update models in `shared/schema.ts`
2. Run `npm run db:push` to apply changes to the database

## Testing

- Write tests for new features.
- Run tests before submitting a pull request: `npm test`

## Submitting Changes

1. **Commit Your Changes**: Write clear, concise commit messages.
   ```bash
   git commit -m "Add feature: your feature description"
   ```

2. **Push to Your Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**: Submit a PR from your branch to the main repository.

4. **Code Review**: Participate in the code review process by responding to feedback.

## Pull Request Guidelines

- Provide a clear description of the changes.
- Reference any related issues.
- Include screenshots for UI changes.
- Ensure all tests pass.
- Update documentation if necessary.

## Issue Reporting

When reporting issues, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Environment details (browser, OS, etc.)

## Feature Requests

Feature requests are welcome! Please provide:

1. A clear description of the feature
2. The problem it solves
3. How it fits into the existing application
4. Any implementation ideas you have

## Project Structure

```
├── client/            # Frontend code
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and helpers
│   │   ├── hooks/       # React hooks
│   │   └── App.tsx      # Main application component
│   │
├── server/            # Backend code
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic
│   └── index.ts       # Server entry point
│
├── shared/            # Shared code between frontend and backend
│   └── schema.ts      # Database schema and types
│
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

## Communication

- Use GitHub Issues for bug reports and feature requests.
- For more complex discussions, contact the repository administrators.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to the ARIBIA Rental Portal project!

*Last updated: April 15, 2025*