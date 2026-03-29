# BeMore Frontend

BeMore Deal Accelerator frontend application built with Vite and TypeScript.

## Prerequisites

- Node.js 18+ 
- npm 9+

## Installation

```bash
npm install
```

## Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

The default `.env.example` configures the API URL to point to `http://localhost:5000/api`. Modify `.env` as needed for your environment.

## Development

Start the development server:

```bash
npm run dev
```

The app will open at `http://localhost:3000`. API requests to `/api` are proxied to the backend at `http://localhost:5000`.

## Production Build

Build for production:

```bash
npm run build
```

The output will be in the `dist` folder.

## Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Additional Scripts

- `npm run typecheck` — Run TypeScript type checking without building
