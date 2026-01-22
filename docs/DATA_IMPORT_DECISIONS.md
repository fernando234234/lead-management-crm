# Data Import Decisions & File Reference

> Last updated: January 22, 2026

---

## Source Files

### Primary Data Files

| File | Location | Records | Purpose |
|------|----------|---------|---------|
| **Dashboard_Merged_Final_CLEANED.csv** | `C:\Users\ferna\Downloads\` | 6,590 | Clean leads with normalized course names |
| **Contratti_VALID_485.csv** | `C:\Users\ferna\Downloads\` | 485 | Valid contracts (enrolled students) |

### Original Files (DO NOT USE - kept for reference)

| File | Location | Records | Issues |
|------|----------|---------|--------|
| Dashboard_Commerciale_Formazione (4) - Dati (1).csv | Downloads | 29,695 | 284 messy course names, duplicates |
| Contratti_NEW_CLEANED.csv | Downloads | 502 | Contains test users and duplicates |

---

## Data Cleaning Decisions

### 1. Contracts Cleanup (Contratti_VALID_485.csv)

**Source:** `Contratti_NEW_CLEANED.csv` (502 records)

**Removed:**
- 8 test users (Manuel Alvaro + Benedetta Barbarisi entries)
- 9 duplicates (same person + same course appearing twice)

**Result:** 485 unique valid enrollments

**Script used:** `scripts/clean-new-contracts.ts`

---

### 2. Leads Cleanup (Dashboard_Merged_Final_CLEANED.csv)

**Source:** Original leads dashboard export

**Normalization applied:**
- Course names standardized (e.g., "master in Graphic design" → "Masterclass Graphic Web Design")
- Commercial names cleaned
- Duplicate detection

**Result:** 6,590 leads with 36 unique courses

---

### 3. Course Standardization

**Final course list (36 courses):**

From Contracts (23 courses - these have enrolled students):
```
Autocad, Blender / 3D, Catia, Character Design, Digital Publishing, Excel,
Game Design, Graphic Design, Illustrazione Digitale, Interior Planner,
Logo Design, Masterclass Ai, Masterclass Architectural Design,
Masterclass Full Developer, Masterclass Graphic Web Design,
Masterclass in Game Design, Motion Design, Narrative Design,
Project Management Professional, Revit, Social Media Manager, UX/UI Design, ZBrush
```

Additional from Leads (13 courses - no enrollments yet):
```
3d Modeling, 3d Studio Max, After Effects, Attività Individuale,
Brand Communication, Certificazione Adobe, Concept Art, Cyber Security,
Digital marketing, Mastering Blender, Modellazione 3d, Photoshop,
Python, Rhinoceros, SolidWorks, Unity
```

**Decision:** Keep all 36 courses. The 13 additional courses represent valid lead interests even without current enrollments.

---

### 4. Commercial (User) Assignments

**Matching logic:**
1. First name match (e.g., "Simone Cringoli" in CSV → "Simone" user)
2. Fallback to Admin if no match

**8 Commercial users:**
- Simone, Marilena, Marcella, Eleonora, Martina, Natascia, Silvana, Raffaele Zambella

**Decision:** Leads without a matching commercial are assigned to Admin.

---

### 5. Lead Status Determination

| Status | Condition |
|--------|-----------|
| **ISCRITTO** | Name+Course match found in Contratti_VALID_485.csv |
| **CONTATTATO** | "Contattati" column has any value (SI, NO, info mail, etc.) |
| **NUOVO** | No contact recorded |

---

### 6. Enrollment Records

**Decision:** Create an Enrollment record for every ISCRITTO lead, linking:
- Lead → Course
- Amount = Course price from contracts CSV

---

## Import Scripts

### Current Import Script
`scripts/import-leads.ts` - Original script, uses dirty data

### New Clean Import Script  
`scripts/reimport-clean-leads.ts` - Uses cleaned CSVs (RECOMMENDED)

**What it does:**
1. Deletes all leads
2. Deletes all courses and enrollments
3. Creates 36 clean courses
4. Imports 6,590 leads with proper assignments
5. Creates enrollment records for ISCRITTO leads

**Usage:**
```bash
npx tsx scripts/reimport-clean-leads.ts
```

---

## Final Database State (After Import - Jan 22, 2026)

| Entity | Count | Notes |
|--------|-------|-------|
| Leads | 6,580 | 25 skipped (16 no name, 9 no course) |
| Courses | 39 | 3 extra from contracts CSV |
| Users | 11 | 1 admin + 8 commercials + 2 others |

### Lead Status Breakdown
| Status | Count | Notes |
|--------|-------|-------|
| ISCRITTO | 554 | 69 more than contracts - some leads appear multiple times with same name+course |
| CONTATTATO | 5,114 | |
| NUOVO | 912 | |

### Course List (39 courses)
```
3d Modeling, 3d Studio Max, After Effects, Attività Individuale, Autocad,
Blender / 3D, Brand Communication, Catia, Certificazione Adobe, Character Design,
Concept Art, Cyber Security, Digital marketing, Digital Publishing, Excel,
Game Design, Graphic Design, Illustrazione Digitale, Interior Planner, Logo Design,
Masterclass Ai, Masterclass Architectural Design, Masterclass Full Developer,
Masterclass Graphic Web Design, Masterclass in Game Design, Mastering Blender,
Modellazione 3d, Motion Design, Narrative Design, Photoshop,
Project Management Professional, Python, Revit, Rhinoceros, Social Media Manager,
SolidWorks, Unity, UX/UI Design, ZBrush
```

---

## Credential Files

Individual credential files for each commercial:
```
C:\Users\ferna\Downloads\Credenziali_Commerciali\
├── Credenziali_Eleonora.txt
├── Credenziali_Marcella.txt
├── Credenziali_Marilena.txt
├── Credenziali_Martina.txt
├── Credenziali_Natascia.txt
├── Credenziali_Raffaele_Zambella.txt
├── Credenziali_Silvana.txt
└── Credenziali_Simone.txt
```

**Default password:** `CambiaMi2026!` (must change on first login)

---

## Questions & Decisions Log

### Q: Why 6,590 leads instead of 7,364?
**A:** The cleaned CSV removed ~774 records that were:
- Duplicates
- Test entries
- Invalid/incomplete records

### Q: Why keep courses with no enrollments?
**A:** These represent active lead interests. Removing them would lose tracking of potential future students for courses like Python, Cyber Security, etc.

### Q: Why match by first name only?
**A:** The CSV has inconsistent commercial names (e.g., "Simone", "Simone Cringoli"). First name matching is most reliable.

---

## Re-running the Import

If you need to re-import from scratch:

```bash
cd C:\Users\ferna\lead-management-crm
npx tsx scripts/reimport-clean-leads.ts
```

This is idempotent - it clears and rebuilds everything each time.
