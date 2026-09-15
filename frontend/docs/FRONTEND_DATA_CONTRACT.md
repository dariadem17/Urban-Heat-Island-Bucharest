# Frontend data contract

The frontend consumes typed domain objects through `DashboardDataService`, selected by:

- `VITE_DATA_MODE=demo` (default)
- `VITE_DATA_MODE=api`
- `VITE_API_BASE_URL=/api`

React presentation components do not import mock data or make backend requests directly.
