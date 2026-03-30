# Integration Flow (HLD + LLD Bridge)

## Key Integration Paths
1. Appointment diagnosis flow
2. Appointment booking and doctor assignment flow
3. Treatment planning and lifecycle feedback flow
4. Patient report OCR upload and analysis flow
5. Vaidya Assist RAG chat flow

## 1) Diagnosis + Department Suggestion
```mermaid
flowchart TD
  A[Patient enters symptoms] --> B[POST /api/appointments/diagnose]
  B --> C[Backend loads departments from DB]
  C --> D[POST AI /api/triage]
  D --> E[AI returns recommended department]
  E --> F[Backend matches department to DB record]
  F --> G[Frontend gets structured diagnosis payload]
```

Important data:
- Input: `problemDescription`, `providedSymptoms`, `providedSeverity`, `providedDuration`
- Output: `final_symptoms`, `dosha_indicator`, `recommended_department_name`, `matchedDepartment`

## 2) Appointment Booking
```mermaid
flowchart TD
  A[Patient selects department/date/slot] --> B[GET slots]
  B --> C[POST /appointments/book]
  C --> D{Doctor selected manually?}
  D -- Yes --> E[Validate selected doctor availability]
  D -- No --> F[Call AI matchmaker with patient + doctors]
  E --> G[Create appointment]
  F --> G
  G --> H[Return appointmentId]
```

Important fields:
- `appointment.patientId`, `appointment.doctorId`, `scheduledAt`, `status`, `aiSummary`

## 3) Treatment Plan + Feedback Lifecycle
```mermaid
flowchart TD
  A[Doctor saves plan] --> B[PUT /appointments/:id/plan]
  B --> C[Transaction: Appointment + TreatmentPlan + Lifecycle + Diet + Medications]
  C --> D[Patient sees active plan timeline]
  D --> E[Patient posts feedback event]
  E --> F[Lifecycle domain status updated]
  F --> G[Doctor unread alerts fetched]
```

Plan domains:
- `diet`
- `asanas`
- `medicines`

Feedback types:
- `working`
- `not_effective`
- `terminate_request`
- `stopped`

## 4) Patient Report OCR
```mermaid
flowchart TD
  A[Patient uploads report] --> B[POST /api/profile/patient/:id/reports]
  B --> C[Backend stores binary file]
  C --> D[Backend calls AI OCR analyze]
  D --> E[AI generates medical + ayurvedic summary]
  E --> F[Summary persisted in patient report]
```

## 5) Vaidya Assist (RAG)
```mermaid
flowchart TD
  A[Doctor opens assistant sheet] --> B[POST /api/appointments/vaidya-assist]
  B --> C[Backend proxy to AI /api/rag/ask]
  C --> D[RAG retrieves herb + research evidence]
  D --> E[AI response returned to doctor UI]
```
