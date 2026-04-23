# ADR-002: MongoDB + Mongoose for Backend Data Layer

## Status

Accepted

## Date

2025-11-15

## Context

The BeMore platform captures multi-step application forms from six different user types (developer, landowner, investor, student, professional, aspiring), each with varying form fields and data shapes. The backend also stores analytics events, email logs, poll responses, site settings, page views, and tracking events.

Key data characteristics considered:

- Application `formData` varies significantly by `userType` — developers submit project details and funding requirements, while students submit accommodation needs. A rigid relational schema would require either a wide table with many nullable columns or a complex EAV pattern.
- The platform is event-driven: analytics events, page views, and tracking events are append-heavy with time-based TTL expiry (1-year and 24-month retention).
- The team needed rapid prototyping capability for the summit deadline, with schema changes happening frequently during development.
- Read patterns are mostly by single document (refNumber lookup) or aggregation pipelines (analytics dashboards), not complex multi-table joins.
- Data volume is moderate (hundreds to low thousands of applications, not millions of rows).

Alternatives considered:

- **PostgreSQL + Prisma**: Strong typing, relational integrity, mature ecosystem. Used in other BTS projects (KZN, DigitalEccommerBTS). However, the polymorphic `formData` would require JSONB columns, reducing the benefit of a relational schema.
- **PostgreSQL + Drizzle**: Similar trade-offs as Prisma, with less mature tooling.
- **SQLite**: Too limited for production deployment on Railway with multiple dynos.

## Decision

Use MongoDB as the primary database with Mongoose as the ODM (Object Document Modeling) layer. MongoDB Atlas for production hosting, Railway MongoDB for staging.

Key factors in the decision:

1. **Schema flexibility**: The `formData` field uses Mongoose's `Mixed` type, allowing each user type to store different data shapes without schema migrations. This was critical for rapid iteration during pre-summit development.
2. **Aggregation pipelines**: MongoDB's aggregation framework maps directly to the analytics dashboard needs — grouping by date, status, tags, engagement source, and user type with timezone-aware date formatting (`$dateToString` with `Africa/Johannesburg`).
3. **TTL indexes**: Native TTL index support for automatic data expiry (POPIA compliance: 24-month retention for applications, 1-year for tracking data) without requiring scheduled cleanup jobs.
4. **Pre-save hooks**: Mongoose middleware (`pre('save')`) enables the auto-tagging engine to run transparently on every application save, without controller-level logic.
5. **Development speed**: No migration files to manage. Schema changes deploy immediately. `mongodb-memory-server` provides isolated, fast test databases.
6. **Operational simplicity**: MongoDB Atlas provides managed backups, monitoring, and scaling for a small team without a dedicated DBA.

## Consequences

### Positive

- Rapid schema iteration during development — no migration files, no `ALTER TABLE` statements.
- Natural fit for polymorphic `formData` across six user types.
- Aggregation pipelines power all analytics dashboards without requiring a separate analytics database.
- TTL indexes handle POPIA-compliant data expiry automatically.
- `mongodb-memory-server` enables fast, isolated test runs (71 tests) without external database dependencies.
- Mongoose validation and middleware (pre-save hooks) provide a clean separation of concerns.

### Negative

- No referential integrity enforcement at the database level. Relationships between Applications, EmailLogs, and PollResponses are maintained by application code.
- No transactions for multi-document operations (though the current data model rarely requires them).
- Aggregation pipeline syntax is verbose compared to SQL for complex queries.
- MongoDB Atlas costs more per GB than managed PostgreSQL for equivalent storage tiers.
- Diverges from the PostgreSQL + Prisma pattern used in other BTS projects (KZN, DigitalEccommerBTS), which may slow cross-project knowledge sharing.

### Risks

- If the platform evolves to require complex relational queries (e.g., joining applications with a future CRM contacts table, or multi-entity reporting), the lack of joins will become a pain point. MongoDB's `$lookup` is functional but less ergonomic than SQL joins.
- MongoDB Atlas free tier (M0) has limited storage and no backups. Production should use at least M10 for automated backups and monitoring.
- The staging environment uses Railway MongoDB rather than Atlas, which means staging and production databases have different operational characteristics. See ADR-008.
