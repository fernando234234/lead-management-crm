# January 2026 Lead Import Analysis

> Generated: January 28, 2026

## Overview

| Metric | Count |
|--------|-------|
| DB leads (January 2026) | 854 |
| CSV leads (January 2026) | 769 |
| Matched (in both) | 614 |
| CSV-only (need import) | **155** |
| DB-only (not in CSV) | 305 |

**Why does DB have more than CSV?**
- 305 leads were added directly in the system (manual entry, API, etc.)
- The CSV is the commercial dashboard export, which may not include all sources

---

## Changes Detected in Matched Leads (135 total)

### 1. Commercial Reassignments (48)

These leads have been reassigned to different commercials in the CSV vs DB.

| Lead | DB Commercial | CSV Commercial |
|------|---------------|----------------|
| Jessica Baracca | Marcella | Natascia |
| Elena Zuccaccia | Silvana | Marcella |
| Laura Barbieri | Silvana | Marcella |
| Tanara Kobalia | Marilena | Silvana |
| ... and 44 more | | |

**Decision needed:** Should we update to CSV values? CSV may be more current.

---

### 2. Enrollment Status Changes (41)

#### DB says ENROLLED, CSV says NOT (9 leads)
These are enrolled in the database but NOT marked as enrolled in CSV.

| Lead | Course | Commercial | DB Status |
|------|--------|------------|-----------|
| Riccardo Vigni | Masterclass Graphic Web Design | Marcella | ISCRITTO |
| Maria Russo | Masterclass Graphic Web Design | Marcella | ISCRITTO |
| mara motta | Masterclass Ai | Natascia | ISCRITTO |
| Azzurra Saracino | Masterclass Graphic Web Design | Marcella | ISCRITTO |
| Martina Milano | Masterclass Graphic Web Design | Marcella | ISCRITTO |
| Clementina dellacasa | Masterclass Ai | Natascia | ISCRITTO |
| giorgia greco | Social Media Manager | Simone | ISCRITTO |
| elena villella | Masterclass Graphic Web Design | Simone | ISCRITTO |
| Carlo Colantuono | Masterclass Ai | Natascia | ISCRITTO |

**⚠️ CAUTION:** These may have been enrolled via contracts import or direct system entry. DO NOT un-enroll without verification!

#### CSV says ENROLLED, DB says NOT (32 leads)
These should be UPDATED to enrolled status with revenue.

| Lead | Course | Commercial | Revenue |
|------|--------|------------|---------|
| teresa paratore | Masterclass Ai | Natascia | €577 |
| Beatrice Dossetti | Masterclass Graphic Web Design | Marilena | €2,377 |
| Teodora Simion | Masterclass Graphic Web Design | Marilena | €2,377 |
| ursula borro | Masterclass Ai | Natascia | €577 |
| alessandra bray | Masterclass Ai | Natascia | €577 |
| Simone Colonna | Masterclass Graphic Web Design | Marcella | €2,377 |
| Miriam Focchi | Masterclass Graphic Web Design | Silvana | €2,377 |
| Federico Nacci | Masterclass Graphic Web Design | Marcella | €2,377 |
| ... and 24 more | | | |

**Note:** 2 leads (Chiara Campesan, Laura Gioia) have "no course" in CSV but are marked enrolled - needs investigation.

---

### 3. Status Updates (35)

Leads that should be updated from NUOVO to CONTATTATO:
- Alisia Albanesi, alessandra bray, antonella maxenti, nicole lomonaco, etc.

---

### 4. Revenue Updates (8)

| Lead | DB Revenue | CSV Revenue |
|------|------------|-------------|
| Beatrice Dossetti | €0 | €2,377 |
| alessandra bray | €0 | €577 |
| Elisa Eleonora Milano | €0 | €2,377 |
| roberta bonato | €0 | €577 |
| Valentina Gatti | €0 | €2,377 |
| Umberto Prevosto | €0 | €777 |
| Alice Rossi | €0 | €577 |
| francesca elia | €0 | €577 |

---

### 5. Course Changes (3)

| Lead | DB Course | CSV Course |
|------|-----------|------------|
| Alisia Albanesi | Graphic Design | Masterclass Graphic Web Design |
| Pierre Gay | Graphic Design | Masterclass Graphic Web Design |
| Umberto Prevosto | Masterclass Graphic Web Design | Graphic Design |

---

## CSV-Only Leads (155 to import)

### Course Distribution

| Course | Count | Status |
|--------|-------|--------|
| Masterclass Graphic Web Design | 105 | ✅ Match |
| Masterclass Ai | 11 | ✅ Match |
| **[EMPTY]** | **8** | ⚠️ Need handling |
| Graphic Design | 8 | ✅ Match |
| Narrative Design | 5 | ✅ Match |
| Blender / 3D | 3 | ✅ Match |
| Social Media Manager | 3 | ✅ Match |
| Autocad | 2 | ✅ Match |
| Illustrazione Digitale | 2 | ✅ Match |
| **Masterclass Game Design** | **1** | ⚠️ Need mapping |
| Masterclass Full Developer | 1 | ✅ Match |
| Revit | 1 | ✅ Match |
| Masterclass Architectural Design | 1 | ✅ Match |
| SolidWorks | 1 | ✅ Match |
| Digital marketing | 1 | ✅ Match |
| UX/UI Design | 1 | ✅ Match |
| Photoshop | 1 | ✅ Match |

### Enrolled Leads in CSV-Only (9)

| Lead | Course | Commercial | Revenue |
|------|--------|------------|---------|
| raffaello di lorenzo | **[EMPTY]** | Natascia | €0 |
| Andrea Cennamo | **[EMPTY]** | Natascia | €0 |
| Debora Camporesi | **[EMPTY]** | Silvana | €0 |
| Sabatino Lara | Blender / 3D | Simone | €577 |
| Valentina Proietti | Masterclass Graphic Web Design | Marilena | €2,377 |
| Carola Grassotti | Masterclass Full Developer | Natascia | €2,377 |
| Mena Panariello | Masterclass Graphic Web Design | Silvana | €2,377 |
| Ilaria Maffi | Masterclass Ai | Natascia | €577 |
| antonella lauritano | Autocad | Simone | €577 |

**⚠️ 3 enrolled leads have no course!** These need manual investigation.

### 8 Leads with Empty Courses

| Date | Name | Commercial | Enrolled | Revenue |
|------|------|------------|----------|---------|
| 09/01/2026 | raffaello di lorenzo | Natascia | **SI** | €0 |
| 12/01/2026 | Andrea Cennamo | Natascia | **SI** | €0 |
| 15/01/2026 | Olivia Albanesi | Silvana | NO | €0 |
| 15/01/2026 | Riccardo Olgiati | Silvana | NO | €0 |
| 15/01/2026 | Fabiola De Toma | Silvana | NO | €0 |
| 15/01/2026 | Maira Pistritto | Silvana | NO | €0 |
| 15/01/2026 | Sara Ragonesi | Silvana | NO | €0 |
| 15/01/2026 | Debora Camporesi | Silvana | **SI** | €0 |

---

## Required Mappings

### Course Name Mapping

| CSV Value | DB Value |
|-----------|----------|
| Masterclass Game Design | Masterclass in Game Design |

### Commercial Mapping

All commercials match directly by first name:
- Silvana, Marcella, Marilena, Natascia, Simone, Martina ✅

---

## Recommended Actions

### Phase 1: Data Decisions (Manual)

1. **Empty course leads (8):** 
   - Option A: Skip import (require course to be filled)
   - Option B: Import without course, flag for review
   - **Recommendation:** Skip the 3 enrolled ones (need course for proper accounting), import the 5 non-enrolled as "needs info"

2. **Enrolled without course (3):**
   - These need manual investigation to find the correct course
   - Names: raffaello di lorenzo, Andrea Cennamo, Debora Camporesi

3. **DB-enrolled but CSV-not (9):**
   - Keep DB values - these may have been enrolled via contracts import
   - Don't un-enroll without verification

### Phase 2: Import New Leads (147)

After excluding the 8 empty-course leads:
- 146 leads with valid courses
- 1 lead needs course mapping (Masterclass Game Design → Masterclass in Game Design)
- 6 of these are enrolled with revenue

### Phase 3: Update Existing Leads (Optional)

Consider whether to:
- Update 32 leads to enrolled status (CSV says enrolled, DB doesn't)
- Update 48 commercial assignments
- Update 35 contact statuses
- Add revenue to 8 leads

---

## Files Reference

| Purpose | Path |
|---------|------|
| Source CSV | `C:\Users\ferna\Downloads\Dashboard_Commerciale_Formazione (4) - Dati (3).csv` |
| Analysis script 1 | `scripts/compare-existing-leads.ts` |
| Analysis script 2 | `scripts/analyze-enrollment-changes.ts` |
| This document | `docs/IMPORT_ANALYSIS_JAN2026.md` |
