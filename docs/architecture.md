# Technical Architecture

FlareLens is built on top of Cloudflare Workers, providing a highly scalable and cost-effective monitoring solution.

## Core Components

- **Backend (apps/api):** A Hono-based Cloudflare Worker that handles the API, authentication, and core logic.
- **Frontend (apps/web):** A SvelteKit application deployed as a Cloudflare Worker, providing the user interface.
- **Database (Cloudflare D1):** A distributed SQLite database used for persisting account data, rules, and anomalies.
- **Cache & Sessions (Cloudflare KV):** Used for session management, rate limiting, and caching analytics data.
- **Async Processing (Cloudflare Queues):** Handles background tasks like anomaly detection and alert dispatching.
- **Live Updates (Cloudflare Durable Objects):** Powers the live activity feed on the dashboard.
- **Shared Package (packages/shared):** Contains common types, Zod schemas, and utility functions used by both the frontend and backend.
- **Database Access Layer (packages/db):** Provides a repository pattern for interacting with the D1 database.

## Data Flow

1. **User Request:** The user interacts with the SvelteKit frontend.
2. **API Interaction:** The frontend makes requests to the backend API.
3. **Cloudflare Integration:** The backend API uses the user's Cloudflare token to fetch metrics from Cloudflare's GraphQL and REST APIs.
4. **Data Persistence:** Important data like anomaly records, baselines, and configuration are stored in the D1 database.
5. **Periodic Monitoring (Crons):** A scheduled Cloudflare Worker (Cron Trigger) periodically triggers metrics polling.
6. **Anomaly Detection (Queues):** When new metrics are polled, an `anomaly-check` message is pushed to a Cloudflare Queue. A consumer worker then analyzes the metrics against baselines.
7. **Alert Dispatching (Queues):** If an anomaly is confirmed, an `alert-dispatch` message is pushed to another queue. A consumer worker then sends the alert to configured channels such as email, Slack, or Discord.
8. **Real-time Updates:** Durable Objects ensure that the user's dashboard reflects the latest activity without manual refresh.

## Security & Privacy

- **Token Encryption:** Your Cloudflare API tokens are encrypted at rest using AES-256-GCM.
- **Tenant Isolation:** Data is strictly isolated by account ID.
- **Scoped Permissions:** FlareLens only requires read access to your Cloudflare account for monitoring. Write access is only needed if you enable automated mitigation features.
- **No Shared Keys:** Each FlareLens instance uses its own encryption keys.
