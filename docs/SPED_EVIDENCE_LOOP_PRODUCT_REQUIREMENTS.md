# SPED Evidence Loop

## Product requirements and implementation handoff

**Document status:** Build-ready MVP specification  
**Primary audience:** Product owner, designer, and implementing Codex agent  
**Initial setting:** Preschool special-education classroom  
**Source workflow:** A paper data sheet containing student-specific objectives, repeated session columns, and a shared `4/3/2/1/0/ND` support rubric

---

## 1. Product summary

SPED Evidence Loop is a private classroom data-collection application. A teacher creates student profiles and measurable goals. Classroom assistants record one rubric score for each goal during a selected session. The application organizes those observations, shows progress over time, and creates a teacher-reviewable monthly summary for parent conversations.

The application also allows a teacher to assign a teaching strategy to a goal for a defined period. Assistants see the active strategy while scoring and record whether it was used as planned. The dashboard can then describe how outcomes differed across strategy periods, while clearly avoiding unsupported claims that a strategy caused an improvement.

### Product promise

Replace repetitive paper scoring and manual month-end review with a fast, traceable workflow:

`Set up student -> define goals -> assign strategies -> record sessions -> review progress -> prepare monthly summary`

### MVP success statement

An authorized assistant can score all active goals for one student in under one minute, and a teacher can understand a month of progress without manually reviewing individual paper sheets.

---

## 2. Current workflow and problem

### Current workflow

1. The teacher creates a paper data sheet for each student.
2. The sheet lists the student's current objectives.
3. During each session, an assistant circles or marks one value from `4`, `3`, `2`, `1`, `0`, or `ND` for each objective.
4. At the end of the month, the teacher reviews the sheets manually.
5. The teacher talks through progress with the student's parents or guardians.

### Problems to solve

- Paper records take time to create, collect, organize, and interpret.
- Dates, scorer identity, and session context may not be captured consistently.
- Month-end patterns are difficult to see quickly.
- A score does not currently show which teaching strategy was active or whether it was implemented.
- It is difficult to distinguish lack of progress from inconsistent strategy use.
- Parent-facing summaries require substantial manual preparation.

---

## 3. Source scoring model

The attached sheet uses the following rubric. The MVP must preserve these categories and their meanings.

| Value | Meaning |
|---|---|
| `4` | Child performs the skill independently or when given a group direction. No adult intervention is needed. |
| `3` | Adult points, gestures, or models and verbally directs the child to perform the skill. |
| `2` | Adult provides partial physical assistance; the child completes some of the skill independently. |
| `1` | Adult provides full physical assistance to complete the skill. |
| `0` | Child does not perform the skill in that opportunity, such as refusing, walking away, ignoring the adult, or saying no. |
| `ND` | No data was collected for that goal in that session. |

### Important analytics rule

The rubric is an **ordered set of support levels**, not a precise equal-interval measurement. The dashboard must prioritize:

- Score distribution
- Median score
- Percentage of valid observations at each level
- Percentage independent (`4`)
- Percentage meeting a teacher-defined threshold
- Change over time
- Number of valid observations

The application must not silently treat `ND` as zero. `ND` is excluded from score calculations and reported separately as missing or unavailable data.

### Configurability

The default rubric is shared across the classroom. A later version may support custom rubrics, but the MVP should use one school-configurable rubric to prevent accidental inconsistency between students.

---

## 4. Product goals and non-goals

### Goals

- Make daily/session data entry faster than paper.
- Preserve each student's individualized goals.
- Show understandable progress over days, weeks, and months.
- Preserve a traceable record of who entered or changed data.
- Let teachers assign and revise strategies without rewriting old observations.
- Show whether an assigned strategy was implemented consistently.
- Help teachers prepare accurate, editable monthly summaries.
- Keep instructional decisions under educator control.

### Non-goals for the MVP

- Diagnosing students or recommending eligibility or placement
- Writing or modifying an IEP autonomously
- Predicting disability, behavior, or developmental outcomes
- Recording classroom audio or video
- Allowing parents to access the application directly
- Integrating with district student-information systems
- Claiming that a strategy caused an observed change
- Using student data to train a general-purpose AI model
- Replacing teacher review or professional judgment

---

## 5. Users and permissions

### Teacher

Can:

- Create and archive student profiles
- Create, edit, activate, and archive goals
- Create strategy templates
- Assign strategies to goals
- Invite Teachers or Assistants
- View all classroom observations and dashboards
- Correct observations while preserving edit history
- Generate, edit, approve, and export monthly summaries
- Configure sessions and scoring thresholds
- Revoke or regenerate classroom invitations

### Classroom assistant

Can:

- Use every classroom feature available to a teacher

Cannot:

- Create, revoke, or regenerate classroom invitations

### System administrator - post-MVP

District- or school-level configuration and audit access are deferred. Platform operators create classroom workspaces, and teachers manage invitations within them.

---

## 6. Core concepts

### Student profile

Minimum required information:

- Classroom display name or alias
- Internal student identifier generated by the application
- Active/inactive status
- Optional classroom staff notes

Optional information, added only when there is a demonstrated need:

- Preferred name
- Pronouns
- Enrollment dates
- Parent-facing display name

The MVP must not require a diagnosis, date of birth, home address, medical history, or full IEP.

### Goal

A student-specific objective to be scored repeatedly.

Required fields:

- Goal title
- Full objective text
- Skill domain, such as communication, directions, or social interaction
- Active date
- Target score or success threshold, if applicable
- Expected collection frequency
- Status: draft, active, paused, archived

Optional fields:

- Examples
- Exclusions or scoring guidance
- Parent-friendly description
- End date

### Session

A dated data-collection event, such as morning centers, structured play, or an afternoon program session.

Required fields:

- Student
- Date and timestamp
- Session type
- Scorer
- Scores for active goals, including `ND` when no valid opportunity occurred

Optional fields:

- Session-level note
- Context tags

### Strategy

A structured teaching approach with explicit implementation steps.

Required fields:

- Strategy name
- Purpose
- Instructions for assistants
- Fidelity question or checklist
- Creator and creation date
- Version

Optional fields:

- Materials
- Example
- Source or citation
- Cautions

### Goal-strategy assignment

A dated assignment connecting one strategy version to one student goal.

Required fields:

- Goal
- Strategy version
- Start date
- Status: planned, active, ended
- Teacher-defined reason for trying the strategy

Optional fields:

- End date
- Planned review date
- Implementation notes
- Teacher conclusion after review

Historical observations must retain the exact strategy assignment and strategy version active at the time. Editing a strategy must create a new version rather than rewriting history.

---

## 7. Primary workflows

### Workflow A: Teacher setup

1. Teacher signs in and creates a classroom.
2. Teacher adds a student using the minimum necessary information.
3. Teacher adds the student's goals.
4. Teacher optionally adds scoring examples to clarify how the rubric applies to each goal.
5. Teacher creates or selects a strategy and assigns it to a goal.
6. Teacher previews the assistant scoring screen.
7. Teacher activates the student plan.

### Workflow B: Assistant records a session

1. Assistant signs in.
2. Assistant selects a student.
3. Assistant starts a new session or selects the current scheduled session.
4. The application shows all active goals as compact cards.
5. Each card shows:
   - Goal title
   - Short objective
   - Active strategy and concise implementation reminder
   - Large buttons for `4`, `3`, `2`, `1`, `0`, and `ND`
   - A strategy-use control
   - Optional note control
6. Assistant selects one score per goal.
7. Assistant marks strategy use as:
   - Used as planned
   - Partially used
   - Not used
   - Not applicable / no opportunity
8. Assistant reviews and submits the complete session.
9. The application records scorer identity and timestamps automatically.

### Workflow C: Teacher reviews progress

1. Teacher selects a student and date range.
2. Teacher sees an overview of all active goals.
3. Teacher opens one goal to view:
   - Score history
   - Distribution
   - Valid observation count and `ND` count
   - Strategy timeline
   - Strategy fidelity
   - Context notes
4. Teacher can filter by strategy period or session type.
5. Teacher records a professional conclusion, such as continue, modify, end, or insufficient evidence.

### Workflow D: Monthly parent summary

1. Teacher selects a student and reporting month.
2. The application calculates descriptive statistics for each goal.
3. The application creates a draft with factual statements only.
4. Teacher edits the language and adds professional interpretation.
5. Teacher approves and exports or prints the summary.
6. The approved version is stored with the underlying date range and source observations.

---

## 8. Daily scoring interface requirements

### Goal card

Each active goal is displayed as one card:

```text
Following directions

Current strategy
Show a visual cue, give the direction once, and wait 5 seconds.

How much support was needed?
[ 4 ] [ 3 ] [ 2 ] [ 1 ] [ 0 ] [ ND ]

Was the strategy used as planned?
[ Yes ] [ Partly ] [ No ] [ N/A ]

[ Add context or note ]
```

### Interaction requirements

- Score buttons must show the rubric description on tap, hover, or a persistent legend.
- The interface must be usable on a phone or tablet.
- Touch targets must be large and keyboard accessible.
- A selected value must be visually unambiguous and not depend only on color.
- Submission must warn when an active goal has no score.
- `ND` must require a reason selected from:
  - No opportunity
  - Student absent
  - Goal not observed
  - Session interrupted
  - Other
- Notes must be optional.
- The application must not default a goal to `0`.
- The application must not default strategy fidelity to “used as planned.”
- A submitted session receives a visible confirmation.

### Context tags

Optional, configurable tags:

- Student absent for part of session
- Schedule changed
- Substitute staff
- Unusually noisy environment
- Materials unavailable
- Student appeared tired or unwell
- Session interrupted
- Other

Context tags support interpretation but do not change scores automatically.

---

## 9. Strategy tracking design

### MVP model

Each goal may have no more than one active **primary strategy** at a time. This avoids ambiguous comparisons. Supporting techniques can be described inside the strategy instructions.

Every scored observation stores:

- Active strategy assignment ID
- Strategy version
- Fidelity status: full, partial, not used, or not applicable
- Optional fidelity note

### Example

**Goal:** Follow one- to two-step directions.  
**Strategy A:** Verbal direction only.  
**Strategy B:** Visual cue, one verbal direction, and five-second wait time.

Strategy A is active from October 1 through October 14. Strategy B is active beginning October 15. The dashboard shows separate descriptive summaries for the two periods. Observations where the strategy was not used are visible but are not included in a high-fidelity strategy summary by default.

### Strategy comparison requirements

For each strategy period, show:

- Date range
- Number of valid observations
- Number of `ND` entries
- Score distribution
- Median score
- Percentage independent (`4`)
- Percentage meeting the goal threshold
- Fidelity distribution
- Session types represented

The comparison panel must display “insufficient data” until the configurable minimum number of valid, high-fidelity observations is reached.

The interface must use wording such as:

> Scores were higher during the period when Strategy B was assigned and documented as used.

It must not automatically state:

> Strategy B caused the student to improve.

### Teacher decision record

At review time, the teacher can choose:

- Continue strategy
- Modify strategy
- End strategy
- Return to previous strategy
- Collect more data

The teacher may add a rationale. This decision is separate from calculated statistics.

---

## 10. Dashboard requirements

### Classroom dashboard

Show:

- Students with data entered today
- Students still missing expected sessions
- Recently submitted sessions
- Goals needing teacher review
- Strategy review dates approaching

Do not rank students against one another.

### Student dashboard

Show:

- Student display name
- Reporting period selector
- Active goals
- Latest score and date
- Valid observation count
- `ND` count
- Median score
- Percentage independent
- Percentage meeting target
- Active strategy
- Data-completeness indicator

### Goal detail dashboard

Required visualizations:

1. **Timeline:** One point per valid observation, with `ND` displayed separately rather than at zero.
2. **Rubric distribution:** Counts and percentages for `4`, `3`, `2`, `1`, and `0`.
3. **Strategy timeline:** Shaded or labeled periods showing strategy assignment changes.
4. **Fidelity summary:** Full, partial, not used, and not applicable.
5. **Observation table:** Date, session, score, strategy, fidelity, scorer, and note.

Required filters:

- Date range
- Session type
- Strategy period
- Strategy fidelity
- Scorer

### Accessibility and interpretation

- Charts must include readable tables or text alternatives.
- Color must not be the only encoding.
- Every percentage must show its denominator.
- Every summary must state the number of valid observations.
- Small sample sizes must be visible.

---

## 11. Monthly summary requirements

The monthly summary is a teacher-facing draft, not an automatically finalized parent report.

For each goal, include:

- Goal description
- Reporting dates
- Number of valid observations and `ND` entries
- Score distribution
- Median score
- Percentage scored `4`
- Percentage meeting the target
- Strategies used during the period
- Strategy-fidelity summary
- Teacher-entered interpretation
- Teacher-entered next step

Example factual draft:

> During October, 18 valid observations were recorded for following directions, with 2 sessions marked no data. The most frequent score was 3, and 6 of 18 observations were scored 4. The visual-cue strategy was documented as fully used in 11 of 14 applicable observations.

The system may create draft prose from structured statistics. It must not invent explanations for progress or regressions.

Export formats:

- Printable web view in MVP
- PDF after the web report is stable
- CSV for authorized research or analysis workflows

---

## 12. Functional requirements

### Authentication and workspace

- **FR-001:** Users must authenticate before accessing student information.
- **FR-002:** A user may access only classroom workspaces where that user has an active membership.
- **FR-003:** Teachers can create, revoke, and regenerate email-bound Teacher or Assistant invitations; assistants cannot manage invitations.
- **FR-004:** Deactivating a user must preserve historical authorship.

### Student and goal management

- **FR-010:** Classroom staff can create, edit, archive, and restore student profiles.
- **FR-011:** Classroom staff can create, edit, pause, archive, and reorder goals.
- **FR-012:** Goal changes must be versioned or recorded in an audit history.
- **FR-013:** Archived goals remain visible in historical reports.

### Session scoring

- **FR-020:** Assistants can create a session for any student in their classroom.
- **FR-021:** Each active goal accepts exactly one of `4`, `3`, `2`, `1`, `0`, or `ND` per session.
- **FR-022:** `ND` is stored separately from numeric values and requires a reason.
- **FR-023:** The active strategy and implementation reminder are visible during scoring.
- **FR-024:** Strategy fidelity is recorded separately from the outcome score.
- **FR-025:** Submission records scorer, created time, and last-edit time automatically.
- **FR-026:** Duplicate submissions for the same student, session type, date, and scorer trigger a warning.
- **FR-027:** Edits preserve the previous value, editor, timestamp, and reason.

### Strategies

- **FR-030:** Classroom staff can create and version strategy templates.
- **FR-031:** Classroom staff can assign one primary strategy to a goal for a date range.
- **FR-032:** Overlapping active primary-strategy assignments for one goal are prohibited.
- **FR-033:** Ending or modifying a strategy does not alter historical observations.
- **FR-034:** Classroom staff can record a strategy-review decision and rationale.

### Dashboards and reporting

- **FR-040:** Classroom staff can view classroom, student, and goal dashboards.
- **FR-041:** `ND` entries are excluded from numeric calculations.
- **FR-042:** Statistics display their valid observation count.
- **FR-043:** Classroom staff can filter data by date, session, strategy, fidelity, and scorer.
- **FR-044:** Classroom staff can generate an editable monthly summary.
- **FR-045:** Reports preserve the source date range and data version.

### Audit and data management

- **FR-050:** Sensitive create, view, update, export, and archive events are logged.
- **FR-051:** Classroom staff can export a student's records.
- **FR-052:** Record deletion or retention operations require active classroom membership and leave an administrative record where legally appropriate.

---

## 13. Non-functional requirements

- **NFR-001 Performance:** A scoring screen should load within two seconds under normal school connectivity.
- **NFR-002 Resilience:** Draft session data should survive an accidental refresh or brief connectivity loss.
- **NFR-003 Accessibility:** Target WCAG 2.2 AA for the application interface.
- **NFR-004 Security:** Encrypt traffic in transit and database/storage at rest.
- **NFR-005 Authorization:** Enforce access on the server for every student-scoped request; hiding controls in the interface is insufficient.
- **NFR-006 Traceability:** Every displayed statistic must be reproducible from stored observations.
- **NFR-007 Privacy:** Collect only information necessary for the defined classroom workflow.
- **NFR-008 Portability:** Teachers can export data in a documented format.
- **NFR-009 Time handling:** Store timestamps in UTC and display them in the classroom's configured timezone.
- **NFR-010 Browser support:** Support current school-managed Chrome, Edge, and Safari browsers plus tablet layouts.

---

## 14. Suggested data model

```text
Workspace
  id
  name
  timezone
  created_at

User
  id
  display_name
  email

ClassroomMembership
  workspace_id
  user_id
  role                  TEACHER | ASSISTANT
  status                ACTIVE | INACTIVE
  joined_at

ClassroomInvitation
  workspace_id
  email
  role
  token_hash
  status                PENDING | ACCEPTED | REVOKED
  expires_at
  invited_by_user_id

Student
  id
  workspace_id
  display_name
  external_reference    optional
  teacher_notes         optional, restricted
  status                ACTIVE | ARCHIVED
  created_at
  archived_at

Goal
  id
  student_id
  title
  objective_text
  domain
  target_score           optional
  expected_frequency     optional
  status
  active_from
  active_to              optional
  version

Strategy
  id
  workspace_id
  name
  purpose
  instructions
  fidelity_prompt
  source_reference       optional
  version
  status

GoalStrategyAssignment
  id
  goal_id
  strategy_id
  strategy_version
  starts_on
  ends_on                optional
  reason
  planned_review_on      optional
  status

Session
  id
  student_id
  session_type
  occurred_at
  recorded_by_user_id
  context_tags           optional
  note                   optional
  status                 DRAFT | SUBMITTED
  submitted_at           optional

Observation
  id
  session_id
  goal_id
  goal_version
  score                  0 | 1 | 2 | 3 | 4 | null
  no_data_reason         optional; required when score is null
  strategy_assignment_id optional
  strategy_version       optional
  fidelity_status        FULL | PARTIAL | NOT_USED | NOT_APPLICABLE | null
  note                   optional
  created_at
  updated_at

StrategyReview
  id
  goal_strategy_assignment_id
  reviewed_by_user_id
  decision
  rationale              optional
  reviewed_at

MonthlyReport
  id
  student_id
  period_start
  period_end
  source_snapshot
  draft_content
  approved_content       optional
  approved_by_user_id    optional
  approved_at            optional

AuditEvent
  id
  workspace_id
  actor_user_id
  action
  entity_type
  entity_id
  before_state           optional
  after_state            optional
  occurred_at
```

### Data-model constraints

- Store `ND` as `score = null` plus `no_data_reason`, never as numeric zero.
- Snapshot goal and strategy versions on historical records.
- Prohibit overlapping active primary strategies for the same goal.
- Do not hard-delete users referenced by observations.
- Scope every table and query to the owning workspace, directly or through a validated relationship.

---

## 15. Suggested application routes

```text
/sign-in
/join/:token
/classrooms
/classrooms/:classroomId/dashboard
/classrooms/:classroomId/staff
/classrooms/:classroomId/students/new
/classrooms/:classroomId/students/:studentId
/classrooms/:classroomId/students/:studentId/goals/new
/classrooms/:classroomId/students/:studentId/sessions/new
/classrooms/:classroomId/students/:studentId/goals/:goalId
/classrooms/:classroomId/students/:studentId/reports
/strategies/new
/team
/settings
```

Suggested API surface:

```text
POST   /api/students
PATCH  /api/students/:studentId
POST   /api/students/:studentId/goals
PATCH  /api/goals/:goalId
GET    /api/strategies
POST   /api/strategies
POST   /api/goals/:goalId/strategy-assignments
POST   /api/students/:studentId/sessions
PATCH  /api/sessions/:sessionId
POST   /api/sessions/:sessionId/submit
GET    /api/goals/:goalId/progress
POST   /api/strategy-assignments/:assignmentId/reviews
POST   /api/students/:studentId/monthly-reports
PATCH  /api/monthly-reports/:reportId
```

---

## 16. Analytics definitions

For a selected goal and period:

```text
valid_observations = observations where score is 0 through 4
no_data_count = observations where score is null
score_distribution[n] = count(valid_observations where score = n)
median_score = median(valid_observations.score)
independence_rate = count(score = 4) / valid_observation_count
target_rate = count(score >= configured_target) / valid_observation_count
full_fidelity_rate = count(fidelity = FULL) / count(applicable strategy observations)
```

Requirements:

- Do not calculate a rate when the denominator is zero.
- Display numerator and denominator with every rate.
- Treat means as optional secondary information, not the primary progress claim.
- Keep observations visible when strategy fidelity is low, but exclude them from “used as planned” strategy summaries.
- Do not run significance tests or causal models in the MVP.

---

## 17. Privacy, safety, and governance

Before using real student data, the product owner must work with the school or district to determine authorization, consent, contractual, retention, and security requirements. Requirements vary by school, jurisdiction, and deployment model.

MVP safeguards:

- Develop and demonstrate with synthetic students first.
- Require authenticated staff accounts.
- Minimize personally identifiable information.
- Apply role-based and student-level access checks server-side.
- Prohibit advertising and unrelated commercial use of student information.
- Do not use student records to train general-purpose models.
- Define retention and deletion procedures before a live pilot.
- Log access, exports, and edits.
- Provide a method to correct records without hiding history.
- Use vetted infrastructure and document every subprocesser before deployment.
- Keep AI or third-party model calls disabled for real student records until the school has reviewed the data flow and contracts.

This document is a product specification, not legal advice.

---

## 18. AI scope

No generative AI is required for the first usable release. The core value comes from structured data capture, strategy history, analytics, and reporting.

After the core workflow is validated, AI may be added to:

- Draft a factual monthly narrative from calculated statistics
- Rewrite teacher-approved text into parent-friendly language
- Help a teacher turn an objective into a concise goal title
- Retrieve an existing, teacher-approved strategy from a controlled library

AI output requirements:

- Generated text must be labeled as a draft.
- The teacher must approve it before export.
- Every numeric statement must come from deterministic application calculations.
- The model must receive only the minimum necessary information.
- The model must not diagnose, modify an IEP, infer causes, or invent observations.
- Prompt, model, source-record IDs, output, edits, and approval must be logged.

---

## 19. MVP implementation plan

### Milestone 0: Product validation

- Observe the existing paper workflow.
- Confirm whether one column represents a day, session, or observation opportunity.
- Confirm how many sessions are typically recorded per student per day.
- Confirm whether the rubric is identical for every classroom and goal.
- Confirm who is allowed to view, correct, and export records.
- Create synthetic sample data covering at least three students and five goals.

**Exit criterion:** The teacher validates a clickable or paper prototype of the scoring workflow.

### Milestone 1: Local application foundation

Recommended stack:

- Next.js and TypeScript
- PostgreSQL
- Prisma or Drizzle ORM
- Zod validation
- Accessible component library and Tailwind CSS
- Vitest for unit/integration tests
- Playwright for end-to-end tests

Build:

- Application shell
- Local development environment
- Database migrations
- Authentication abstraction
- Seed data
- Test framework

**Exit criterion:** A developer can start the application, sign in as a seeded teacher or assistant, and run all tests.

### Milestone 2: Student, goal, and team setup

Build:

- Student list and profile
- Goal creation and status management
- Teacher/assistant roles
- Classroom memberships and invitation management
- Default rubric display
- Audit events for configuration changes

**Exit criterion:** A teacher can configure a student and goals and assign an assistant.

### Milestone 3: Session data collection

Build:

- Mobile-first scoring screen
- `4/3/2/1/0/ND` input
- `ND` reasons
- Draft persistence
- Submission and duplicate warning
- Edit history
- Session list

**Exit criterion:** An assistant can score all active goals and submit a complete session in under one minute during usability testing.

### Milestone 4: Dashboard and reports

Build:

- Student overview
- Goal timeline and distribution
- Observation table and filters
- Monthly structured summary
- Printable report

**Exit criterion:** All displayed statistics match independently calculated test fixtures, and the teacher can prepare a monthly review without reading every individual entry.

### Milestone 5: Strategy tracking

Build:

- Strategy library
- Strategy versioning
- Dated goal-strategy assignment
- Fidelity entry
- Strategy timeline and descriptive comparison
- Teacher review decision

**Exit criterion:** Historical observations retain the correct strategy version, and comparison summaries never mix `ND` or low-fidelity observations into high-fidelity results.

### Milestone 6: Pilot hardening

Build and verify:

- Authorization and tenant-isolation tests
- Accessibility review
- Retention and export workflows
- Backup and restoration process
- Error monitoring without exposing student content
- School-approved deployment and privacy documentation

**Exit criterion:** The school authorizes a small, time-limited pilot with named staff, defined students, and a documented support and incident process.

---

## 20. Acceptance tests for the vertical slice

The first build is successful when all of the following are true:

1. A teacher creates a synthetic student with three goals.
2. The teacher assigns one strategy to one goal.
3. Every active teacher and assistant in the classroom sees the student.
4. The assistant records one session with scores `4`, `2`, and `ND`.
5. The `ND` entry requires a reason and is excluded from numeric summaries.
6. The assistant records whether the active strategy was used.
7. The dashboard shows two valid scores and one `ND`, not three numeric scores.
8. The teacher changes the strategy on a later date.
9. Earlier observations retain the earlier strategy and version.
10. The teacher can see score distributions for each strategy period.
11. Editing a score creates an audit event containing old and new values.
12. The teacher generates an editable monthly factual summary.
13. The assistant has the same classroom data access as a teacher but cannot manage invitations.
14. No screen ranks one student against another.

---

## 21. Testing requirements

### Unit tests

- `ND` exclusion
- Median for odd and even observation counts
- Score distribution
- Target and independence rates
- Strategy-period date boundaries
- Fidelity filters
- Permission predicates

### Integration tests

- Teacher creates student, goal, strategy, and assignment
- Assistant submits and edits a session
- Historical strategy version is retained
- Monthly report uses the correct period
- Cross-workspace access is rejected, while assistants can access every student in their classroom

### End-to-end tests

- Teacher setup journey
- Assistant mobile scoring journey
- Teacher dashboard review
- Strategy change and comparison
- Monthly report creation and approval

### Usability tests

Observe at least one teacher and two assistants using synthetic data. Measure:

- Time to complete one session
- Wrong-score corrections
- Missed goals
- Confusion between `0` and `ND`
- Confusion between outcome score and strategy fidelity
- Whether the strategy reminder is understandable during classroom work

---

## 22. Open decisions for the product owner

These decisions should be answered with the teacher before a live pilot, but they do not block a synthetic-data prototype:

1. Does one paper column represent a calendar day, a classroom session, or one observation opportunity?
2. Can a student have multiple scored sessions per day?
3. Is the `4/3/2/1/0/ND` rubric universal across the school?
4. Should assistants see historical charts, or only the scoring interface?
5. How long may an assistant edit a submitted entry?
6. Which `ND` reasons match the classroom's language?
7. What is the minimum number of observations before showing a strategy comparison?
8. Does a parent report need a district-specific format or signature?
9. What student information is genuinely required beyond a display name?
10. What is the school's required retention period and approval process?

Recommended prototype defaults:

- One or more sessions per day
- One score per active goal per session
- Universal classroom rubric
- Assistants and teachers see the same entry history and analytics
- Assistants and teachers follow the same correction policy
- Minimum 10 valid, fully implemented observations before highlighting a strategy-period comparison
- Student aliases and synthetic data until school approval

---

## 23. Instructions for the implementing Codex agent

1. Treat this document as the product specification.
2. Before coding, inspect the repository and preserve existing user changes.
3. Build only the current milestone; do not add unrelated AI, parent portals, diagnosis features, or integrations.
4. Use synthetic seed data and fictional student names.
5. Implement authorization checks server-side from the beginning.
6. Represent `ND` as null plus a reason, never as zero.
7. Preserve goal and strategy history through versioning or immutable snapshots.
8. Use deterministic functions for analytics and cover them with tests.
9. Optimize the assistant workflow for tablet and phone use.
10. After each milestone, run tests and provide the product owner with exact local startup and verification steps.

### First requested implementation

Build Milestones 1 through 3 as a functioning local vertical slice:

- Seeded teacher and assistant roles
- Synthetic student profiles
- Student-specific goals
- Default rubric
- One active strategy assignment per goal
- Mobile session-scoring interface
- `ND` reasons
- Strategy-fidelity selection
- Submitted-session review
- Basic audit history
- Automated tests for permissions and scoring data integrity

Do not add generative AI in this initial implementation.
