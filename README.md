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
   SEED_USERS=true  # Set to false after first run
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

### Data Seeding

On initial build, if no users are detected in the database, the system automatically initiates seeding based on the `SEED_USERS` environment variable. You'll be prompted to choose between single-tenant or multi-tenant setup:

- **Single-tenant setup**: Seeds users, user roles, and assigns roles
- **Multi-tenant setup**: Additionally seeds tenants, tenant roles, and tenant users

You can disable automatic seeding by setting `SEED_USERS=false` in your `.env.local` file.

If any part of the seeding process fails, you can manually run the specific seed commands:

```bash
# Seed all data at once
pnpm run seed -- all

# Or seed specific collections
pnpm run seed -- roles         # Create first role
pnpm run seed -- tenants       # Seed tenant data
pnpm run seed -- tenant-roles  # Seed tenant roles
pnpm run seed -- tenant-user   # Seed tenant user data
pnpm run seed -- user          # Seed user data

# Assign roles after seeding
pnpm run assign -- user        # Assign roles to users
pnpm run assign -- tenant-user # Assign tenant roles
```

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

> **Note**: The multi-tenant plugin is currently disabled in the default configuration to allow creating items in collections without requiring a tenant. You can enable it by uncommenting the `multiTenantPlugin` configuration in `payload.config.ts`.

## Authentication and Authorization

- Super Admin role for global system management
- Tenant Admin role for tenant-level management
- Custom role creation with granular permissions
- Access control at collection and field level

## Fork and Clone Setup

1. First, fork the repository by visiting [https://github.com/mjaysona/pv3-boilerplate](https://github.com/mjaysona/pv3-boilerplate) and clicking the "Fork" button in the upper right corner.

2. After forking, clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/YOUR-USERNAME/pv3-boilerplate.git
   cd pv3-boilerplate
   ```

3. Add the original repository as an upstream remote to keep your fork updated:
   ```bash
   git remote add upstream https://github.com/mjaysona/pv3-boilerplate.git
   ```

4. Verify your remotes are set up correctly:
   ```bash
   git remote -v
   ```
   You should see:
   ```
   origin    https://github.com/YOUR-USERNAME/pv3-boilerplate.git (fetch)
   origin    https://github.com/YOUR-USERNAME/pv3-boilerplate.git (push)
   upstream  https://github.com/mjaysona/pv3-boilerplate.git (fetch)
   upstream  https://github.com/mjaysona/pv3-boilerplate.git (push)
   ```

## Branch Management

To ensure your fork's branches (like `main`) are prioritized as default:

1. Set up your local branches to track your fork's remote branches:
   ```bash
   git checkout main
   git branch -u origin/main
   ```

2. When switching branches, use the following format to ensure you're using your fork's branches:
   ```bash
   git checkout origin/branch-name
   ```

## Keeping Your Fork Updated

To get updates from the original repository:

1. Fetch the upstream changes:
   ```bash
   git fetch upstream
   ```

2. Merge the changes from the upstream repository to your local branches:
   ```bash
   git checkout main
   git merge upstream/main
   ```

3. Push the merged changes to your fork:
   ```bash
   git push origin main
   git push origin dev
   ```

## Creating a Duplicate Repository

If you own this repository and want to create a duplicate that can be updated from the original (similar to a fork):

1. Create a new empty repository on GitHub (without initializing it with any files)

2. Clone your new empty repository locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/NEW-REPO-NAME.git
   cd NEW-REPO-NAME
   ```

3. Add the original repository as the "upstream" remote:
   ```bash
   git remote add upstream https://github.com/YOUR-USERNAME/pv3-boilerplate.git
   ```

4. Fetch all branches and history from the original repository:
   ```bash
   git fetch upstream
   ```

5. Pull in the content from the original repository's main branch:
   ```bash
   git pull upstream main
   ```

6. Push all the content to your new repository:
   ```bash
   git push origin main
   ```

7. Set up any additional branches you need:
   ```bash
   # For each branch you want to copy over:
   git checkout -b branch-name upstream/branch-name
   git push origin branch-name
   ```

Now you have two remotes:
- `origin` - points to your new repository
- `upstream` - points to your original repository

You can fetch updates from the original repository and merge them as needed:
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

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

- Enable `SEED_USERS=true` only for initial setup
- Use TypeScript for type safety
- Follow the established patterns for access control
- Use the provided utilities for consistent implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details.