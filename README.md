# LGU District Water Billing System

Web-based billing and customer-service system for the Municipality of Bagamanoc.

## Repository layout

```text
LGUDistrictWater/
├── apps/
│   └── web/                 # Next.js application
│       ├── app/             # Route entries and API endpoints
│       ├── modules/         # Feature UI, types, and server helpers
│       ├── lib/             # Shared infrastructure and authentication
│       ├── public/          # Static files
│       └── proxy.ts         # Compatibility redirects
├── prisma/                  # Database schema and migrations
└── prisma.config.ts         # Prisma configuration
```

Route files in `apps/web/app` should stay small. Feature implementations belong in
`apps/web/modules`, grouped by business area.

## Main routes

| Area | Route |
| --- | --- |
| Public landing page | `/` |
| Billing inquiry | `/billing-inquiry` |
| Login | `/login` |
| Password recovery | `/login/forgot-password` |
| Dashboard | `/dashboard` |
| Customers | `/transactions/customers` |
| Service applications | `/transactions/service-applications` |
| Service accounts | `/transactions/service-accounts` |
| Maintenance | `/maintenance/<feature-name>` |

Maintenance routes use lowercase kebab-case. Legacy PascalCase maintenance URLs are
redirected by `apps/web/proxy.ts` so saved links continue to work.

## Code organization

- `app/api/<resource>/route.ts` owns HTTP endpoints.
- `app/<route>/page.tsx` connects a URL to a feature module.
- `modules/<feature>` owns feature-specific UI, types, and server utilities.
- `modules/transactions` owns UI shared by all transaction features.
- `modules/maintenance/<feature>` owns each maintenance screen.
- `lib` contains cross-feature infrastructure such as database and session helpers.

New route and feature folders should use lowercase kebab-case. React components and
exported TypeScript types should use PascalCase.

## Local development

From `apps/web`:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Useful checks:

```bash
npm run format:check
npm run lint
npm run build
```

Use `npm run format` after editing compressed or inconsistently formatted source.

## Environment and database

Copy the documented variables from `apps/web/.env.example` into the appropriate local
environment file. Prisma configuration and migrations are stored at the repository root.
Never commit credentials or production secrets.
