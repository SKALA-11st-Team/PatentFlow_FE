# PatentFlow API Integration Status

Last checked: 2026-05-25

## Summary

- Base path: `/api/v1`
- Verification mode: direct HTTP requests against a PostgreSQL-backed local BE. No FE mock was used.
- FE base handling: `VITE_API_BASE_URL` is normalized to include `/api/v1`.
- Auth: JWT bearer token and HttpOnly cookie refresh were both verified.
- Overall status: OK. 64 API requests were executed, then 2 initially failing cases were fixed/rechecked successfully.
- Removed contract: sales states are not part of the deployment API. `SOLD` and `SALES_CANDIDATE` are absent from FE/BE source enums and OpenAPI schemas; `SOLD` request bodies now return `400 INVALID_REQUEST`.
- Removed contract: lifecycle/economic valuation report content is not displayed as a score axis or merged into AI report output.

## API Matrix

| Area | Method | Path | FE usage | DB request result |
|---|---:|---|---|---|
| Auth | POST | `/auth/login` | Connected | OK |
| Auth | POST | `/auth/refresh` | Connected | OK |
| Auth | GET | `/auth/me` | Connected | OK |
| Auth | PATCH | `/auth/me` | Connected | OK |
| Auth | POST | `/auth/logout` | Connected | OK |
| Patents | GET | `/patents` | Connected | OK |
| Patents | GET | `/patents/review-targets` | BE available; FE can use `/patents` filters | OK |
| Patents | POST | `/patents` | Connected | OK |
| Patents | GET | `/patents/external-lookup` | Connected | OK |
| Patents | POST | `/patents/context-suggestions` | Connected | OK |
| Patents | GET | `/patents/{patentId}` | Connected | OK |
| Patents | PUT | `/patents/{patentId}` | Connected | OK |
| Patents | GET | `/patents/{patentId}/history` | Connected | OK |
| Patents | POST | `/patents/{patentId}/final-decision` | Connected | OK; only `MAINTAINED`/`ABANDONED` |
| Patents | PATCH | `/patents/{patentId}/final-decision` | BE available | OK |
| Patents | PATCH | `/patents/{patentId}/department` | Connected | OK |
| Patents | POST | `/patents/{patentId}/request-ai-report` | Connected | OK when status is `REVIEW_QUARTER_STARTED` |
| Patents | POST | `/patents/batch/mark-mail-ready` | Connected | OK |
| Business | GET | `/business/checklist-items` | Connected | OK |
| Business | GET | `/business/dashboard/summary` | Connected | OK |
| Business | GET | `/business/review-requests` | BE available; FE can use `/business/patents` filters | OK |
| Business | GET | `/business/patents` | Connected | OK |
| Business | GET | `/business/patents/{patentId}` | Connected | OK |
| Business | GET | `/patents/{patentId}/business-submissions` | Connected | OK |
| Business | POST | `/patents/{patentId}/business-submissions` | Connected | OK |
| Legal | GET | `/legal/dashboard/summary` | Connected | OK |
| Mailing | GET | `/mailings/department-recipient-mappings` | Connected | OK |
| Mailing | PUT | `/mailings/department-recipient-mappings/{departmentId}` | Connected | OK |
| Mailing | POST | `/mailings/send` | Connected | OK |
| Mailing | GET | `/mailings/history` | Connected | OK |
| Settings | GET | `/admin/settings/mail` | Connected | OK |
| Settings | PUT | `/admin/settings/mail` | Connected | OK |
| Settings | GET | `/settings/review-quarters` | Connected | OK |
| Settings | GET | `/settings/review-quarters/active` | Connected | OK |
| Settings | PUT | `/settings/review-quarters/{quarterKey}` | Connected | OK |
| Settings | GET | `/settings/review-schedule` | BE available | OK |
| Settings | PATCH | `/settings/review-schedule` | Connected | OK |
| Settings | POST | `/settings/review-quarters/{quarterKey}/activate` | Connected | OK |
| Settings | POST | `/settings/review-quarters/{quarterKey}/end` | Connected | OK |
| Settings | GET | `/settings/country-extensions` | Connected | OK |
| Settings | PUT | `/settings/country-extensions/{country}` | Connected | OK |
| Settings | GET | `/settings/classifications` | Connected | OK |
| Settings | POST | `/settings/classifications/{type}` | Connected | OK |
| Settings | PUT | `/settings/classifications/{type}/{value}` | Connected | OK |
| Settings | DELETE | `/settings/classifications/{type}/{value}` | Connected | OK |
| Annual fees | GET | `/annual-fees/schedule` | Connected | OK; application-date basis |
| Annual fees | PATCH | `/annual-fees/schedule/{patentId}` | Connected | OK |
| Admin users | GET | `/admin/users` | Connected | OK |
| Admin users | POST | `/admin/users` | Connected | OK |
| Admin users | PUT | `/admin/users/{userId}` | Connected | OK |
| Admin users | DELETE | `/admin/users/{userId}` | Connected | OK |
| Admin users | POST | `/admin/users/{userId}/reset-password` | Connected | OK |
| Departments | GET | `/departments` | Connected | OK |
| Admin departments | GET | `/admin/departments` | Connected | OK |
| Admin departments | POST | `/admin/departments` | Connected | OK |
| Admin departments | PUT | `/admin/departments/{departmentId}` | Connected | OK |
| Admin departments | DELETE | `/admin/departments/{departmentId}` | Connected | OK |
| Notifications | GET | `/notifications?role={role}` | Connected | OK |
| Notifications | PATCH | `/notifications/{notificationId}/read-state` | Connected | OK |

## Verification

- DB API run: local PostgreSQL on `jdbc:postgresql://localhost:5432/patentflow?currentSchema=patentflow`.
- BE: `mvn test` -> 34 tests passed.
- FE: `npm test -- --run` -> 14 tests passed.
- FE: `npm run build` -> passed, Vite chunk-size warning only.
- FE: `npm run lint` -> passed.
