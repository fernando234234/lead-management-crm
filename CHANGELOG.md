# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-01-29

### Added
- **Sticky sidebar on desktop** - Sidebar now stays fixed while scrolling, with exit/compress buttons always visible at the bottom
- **Info banner in Platform Analytics** - Added informational note explaining that only campaign-associated leads are included in the analytics (147 leads without campaign attribution are not counted)
- **Platform Analytics pages** (read-only)
  - `/marketing/platforms` and `/admin/platforms`
  - Aggregates existing CampaignSpend data (no new data model)
  - Metrics: spend, leads, enrolled, CPL, conversion rate, # campaigns
  - Charts: Pie (spend distribution), Bar (leads/enrolled), Horizontal Bar (CPL)
  - Expandable cards with per-platform campaign breakdown
  - Filters: Course, Platform, Date range
- Centralized platform constants at `src/lib/platforms.ts`
  - Single source of truth for META, GOOGLE_ADS, LINKEDIN, TIKTOK
  - Helper functions: getPlatformLabel(), getPlatformColor(), getPlatformChartColor()
  - Dropdown options: PLATFORM_OPTIONS, PLATFORM_FILTER_OPTIONS
- Lead deletion with safeguards
  - `DeleteLeadModal.tsx` for single lead deletion
  - `BulkDeleteModal.tsx` for bulk deletion
  - Type-to-confirm "ELIMINA" pattern
  - Extra warnings for high-value leads
- Sidebar navigation updated with "Analisi Piattaforme" link (Wallet icon)

### Changed
- **Sidebar sticky on desktop** - Now uses `sticky top-0 h-screen` with scrollable navigation area
- **Onboarding tour steps updated** - Corrected Commercial tour (removed drag-drop reference since pipeline is read-only), added navigation step to Marketing tour
- **User management shows role-appropriate metrics** - Marketing users now show "X campagne" (campaigns created) instead of "0 lead" since they don't have assigned leads
- Lead status is now read-only and calculated automatically
  - Based on actions: contacted → target → enrolled/lost
  - Kanban boards are display-only (no drag-drop)
- All pages updated to use centralized platform constants
  - Removed local platformLabels, platformOptions, PLATFORM_COLORS definitions
  - All imports now from @/lib/platforms

### Fixed
- **Enrolled count date filter bug** - Platform Analytics now correctly filters enrolled leads by `enrolledAt` instead of `createdAt`, showing accurate iscritti counts
- **Platform Analytics field name mismatch** - Fixed interface to use `contactedLeads` and `enrolledLeads` matching the API response (was incorrectly using `contacted` and `enrolled`)
- Consistent platform label display across all pages
- Consistent platform color usage in charts and badges
