# Payload v3 Boilerplate

A comprehensive starter template for building web applications with Payload CMS version 3 and Next.js.

## Features

- 🏗 Multi-tenant architecture with tenant isolation
- 👥 Role-based access control (RBAC)
- 📄 Dynamic page builder with custom blocks
- 📝 Rich text editing with Lexical editor
- 🖼 Media management with S3 storage integration
- 🔐 Authentication and authorization
- 🧩 Nested document support
- 🌐 Slug-based routing
- ⚙️ Customizable settings
- 🎭 Custom admin UI components and views

## Tech Stack

- [Payload CMS v3](https://payloadcms.com/) - Headless CMS
- [Next.js](https://nextjs.org/) - React Framework
- [MongoDB](https://www.mongodb.com/) - Database
- [TypeScript](https://www.typescriptlang.org/) - Type Safety
- [S3 Storage](https://aws.amazon.com/s3/) - Media Storage (optional)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (recommended package manager)
- MongoDB instance or MongoDB Atlas account

### Installation

1. Clone this repository:
   ```bash
   git clone <your-repository-url>
   cd pv3-boilerplate
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file based on the example:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update the environment variables in `.env.local`:
   ```
   PAYLOAD_SECRET=your-secure-secret-key
   MONGODB_URI=mongodb://127.0.0.1:27017/your-database-name
   SEED_DB=true  # Set to false after first run
   # Optional: Set up S3 for media storage
   # S3_BUCKET=your-bucket-name
   # S3_ACCESS_KEY_ID=your-access-key
   # S3_SECRET_ACCESS_KEY=your-secret-key
   # S3_REGION=your-region
   # S3_ENDPOINT=your-endpoint
   ```

5. Set up MongoDB:
   - Option 1: Install and run MongoDB locally ([Installation guide](https://www.mongodb.com/docs/manual/installation/))
   - Option 2: Use MongoDB Atlas ([Get started with Atlas](https://www.mongodb.com/cloud/atlas/register))
   - Make sure to update your `MONGODB_URI` in `.env.local` accordingly

6. Start the development server:
   ```bash
   pnpm dev
   ```

7. Access the application:
   - Front-end: [http://localhost:3000](http://localhost:3000)
   - Admin Panel: [http://localhost:3000/admin](http://localhost:3000/admin)

## Project Structure

```
src/
  app/              # Next.js app directory
    (app)/          # Public-facing routes and components
    (payload)/      # Admin panel routes and components
  blocks/           # Custom layout blocks for page builder
  collections/      # Payload collections
    Features/       # Feature flags management
    Media/          # Global media collection
    Pages/          # Content pages collection
    Posts/          # Blog posts collection
    Roles/          # User roles definitions
    Settings/       # Global settings collection
    TenantMedia/    # Tenant-specific media collection
    TenantRoles/    # Tenant-specific roles collection
    Tenants/        # Multi-tenant management
    Users/          # User management
  fields/           # Reusable field definitions
  migrations/       # Database migration scripts
  seed/             # Seed data for development
  utilities/        # Helper functions
  views/            # Custom admin views
```

## Multi-Tenant Architecture

This boilerplate implements a multi-tenant architecture with these key features:

- Tenant isolation for data security
- Tenant-specific roles and permissions
- Tenant-specific media collections
- Domain-based tenant identification
- Easy switching between tenants in admin UI

## Authentication and Authorization

- Super Admin role for global system management
- Tenant Admin role for tenant-level management
- Custom role creation with granular permissions
- Access control at collection and field level

## Customization

### Adding a New Collection

1. Create a new folder in `src/collections/`
2. Define collection schema in `index.ts`
3. Set up access control in `access/` folder
4. Add to collections array in `payload.config.ts`

### Creating Custom Admin Views

1. Create components in `src/views/`
2. Register in admin configuration

## Development Notes

- Enable `SEED_DB=true` only for initial setup
- Use TypeScript for type safety
- Follow the established patterns for access control
- Use the provided utilities for consistent implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details.