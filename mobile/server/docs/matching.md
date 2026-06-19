# Implementation Plan - DocMaster Matching Algorithm

This plan outlines the implementation of an intelligent matching system to automatically connect users who have lost objects (documents, devices) with those who have found them.

## User Review Required

> [!IMPORTANT]
> The matching algorithm currently uses an exact match on the "fingerprint" (type + number). We propose to move to a hybrid system including fuzzy matching for cases where the number is slightly different or missing.

> [!WARNING]
> Should the matching be cross-table? (e.g., matching a registered device in `my_devices` with a public declaration in `declarations`?) We recommend YES for maximum efficiency.

## Proposed Strategy

The system will use a **Hybrid Approach** to ensure both speed and reliability:

### 1. Instant Matching (The "Alarm")
- Triggered immediately when a new declaration is created.
- Focused on **High Confidence Matches** (Fingerprint, Exact Number).
- Provides immediate feedback and notifications to users.

### 2. Background "Patrol" Job (The "Cron Job")
- A background task running every 30 minutes (MatchingWorker).
- **Purpose**: "Rescue" matches that were missed during real-time processing due to transient errors or complex similarity checks.
- **Deep Scanning**: Performs more intensive fuzzy matching across all active declarations.
- **Reliability**: Ensures that even if the server was busy or down during an instant match, the connection will eventually be made.

### 3. Duplicate Prevention
- Uses the `fingerprint` to prevent multiple identical declarations of the same type.

### 4. Scoring Algorithm
Matching will be performed by calculating a similarity score between a **LOST** declaration and a **FOUND** declaration:

| Factor | Criteria | Points |
| :--- | :--- | :--- |
| **Document Number** | Exact match (Fingerprint match) | 100 |
| **Document Number** | Partial match (last 6 digits) | 50 |
| **Owner Name** | Similarity > 0.8 (Levenshtein) | 40 |
| **Location** | Same city | 20 |
| **Object Type** | Same category | 10 |

**Match Thresholds:**
- **Score >= 80**: Match Confirmed (Auto-notify).
- **50 <= Score < 80**: Potential Match (Manual review / Suggestion).

---

## Proposed Changes

### [Backend] Logic & Services

#### [MODIFY] [declaration.service.ts](file:///home/ruxel/Docmaster/server/src/services/declaration.service.ts)
- Update `checkMatches` to include the fuzzy scoring logic.
- Integrate cross-table checks against `my_devices` and `my_documents`.

#### [MODIFY] [declaration.repository.ts](file:///home/ruxel/Docmaster/server/src/repositories/declaration.repository.ts)
- Add advanced SQL queries using PostgreSQL's `similarity()` (if `pg_trgm` extension is enabled) or `LEVENSHTEIN` distance.

#### [NEW] [matching.service.ts](file:///home/ruxel/Docmaster/server/src/services/matching.service.ts)
- Create a dedicated service to centralize matching logic and scoring calculation.

### [Database] Schema Updates

#### [NEW] [15_enable_trgm.sql](file:///home/ruxel/Docmaster/server/src/database/shema/15_enable_trgm.sql)
- Enable the `pg_trgm` extension for fast text similarity searching.

---

## Verification Plan

### Automated Tests
- Create unit tests for the `MatchingService` with various edge cases (typos in names, missing numbers).
- Integration test: create a lost document and a found document with similar info and verify notifications are sent.

### Manual Verification
- Simulate a loss declaration for an "iPhone 13" in Yaoundé.
- Create a found declaration for a "iPhone 13" in Yaoundé with a slightly different description.
- Verify that the owner receives a "Potential Match" notification.
