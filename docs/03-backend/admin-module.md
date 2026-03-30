# Backend Admin Module

## Scope
Implemented in `controllers/admin.controller.js` and `routes/admin.routes.js`.

## Responsibilities
- Department list retrieval
- Staff creation (multi-role)
- Doctor and patient listing for dashboards
- Email availability checks
- Controlled deletion operations

## Endpoints
- `GET /api/admin/departments`
- `GET /api/admin/doctors`
- `GET /api/admin/patients`
- `GET /api/admin/staff-email-availability`
- `POST /api/admin/create-staff`
- `POST /api/admin/create-doctor` (alias)
- `DELETE /api/admin/doctors/:doctorId`
- `DELETE /api/admin/patients/:patientId`

## HLD
```mermaid
flowchart LR
  AdminRequest --> RoleValidation
  RoleValidation --> DataOperation
  DataOperation --> Response
```

## LLD Highlights
- Allowed roles constrained by `ALLOWED_STAFF_ROLES`.
- Admin hospital context may be derived from `triveda_auth` cookie.
- Doctor role requires `specialization` and `departmentId`.
- Temporary password auto-generated and returned for first login.
- Delete guards prevent removing doctors/patients with active historical appointment references.

## Important Fields
- `HospitalStaff.role`
- `HospitalStaff.hospitalId`
- `DoctorProfile.departmentId`
- `Appointment` count checks on delete
