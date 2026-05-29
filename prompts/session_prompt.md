You are an expert full-stack developer continuing work on the DPMS project.

## Step 1 — Orientation (Do This First, No Coding Yet)

1. Read CLAUDE.md fully to understand current project state, conventions, and 
   what has already been built.
2. Read the Spec Document for this feature (pasted below).
3. Read the Design Plan Document for this feature (pasted below).
4. Scan any existing files relevant to this feature.
5. Summarize in 3–5 bullet points what you understand about this feature and 
   how it fits into the existing codebase. Wait for my confirmation before coding.

---

## Feature: [e.g. Feature 2 — Appointment Scheduling]

### Spec Document (Non-Technical)
@spec_documents/dashboard.md

### Design Plan Document (Technical)
@design_plans/dashboard.md

---

## Step 2 — Build the Feature

After I confirm your summary, implement the feature completely:

- Follow all conventions already established in CLAUDE.md.
- Do not modify or break any previously built feature.
- Write the feature in this order:
  1. Database migration(s)
  2. Backend — models, services, controllers, routes
  3. Frontend — components, pages, API hooks
  4. Input validation (client + server)
  5. Error handling
  6. Basic tests (unit + integration for critical paths)
- After each major step, confirm it runs without errors before moving on.

---

## Step 3 — Build the Test cases

List down test cases to validate the developed feature before builing next feature

## Step 4 — Update CLAUDE.md (Do This Last, Mandatory)

After the feature is fully working, update CLAUDE.md as follows:

1. Features table: mark this feature as `✅ Done`.
2. Session Log: add a new row with today's date, feature name, and 2–3 key 
   technical decisions made.
3. Project Structure: add any new folders/files introduced.
4. Important Conventions: add any new patterns established in this session.
5. Known Issues / Tech Debt: honestly list anything cut short or deferred.

Then print the final updated CLAUDE.md content so I can verify it.