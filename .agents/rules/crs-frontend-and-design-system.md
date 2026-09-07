---
description: Frontend technology constraints, styling rules, typography, and "Maslahat Connect" brand design system.
---

# CRS Maslahat Frontend & Design System Guidelines

## 1. Technology Constraints
- **Language**: Strictly **JavaScript (React `.js` / `.jsx`)**. DO NOT introduce TypeScript (`.ts` / `.tsx`) files into `frontend/src`.
- **UI Framework**: React 18/19 with Tailwind CSS 3 and Shadcn/UI components located in `src/components/ui`.
- **Icons**: Exclusively use `lucide-react`. NEVER use generic AI emojis (🤖, 🧠, 💭) in UI components.
- **Testing**: All buttons, links, inputs, and key informational elements MUST include a descriptive `data-testid` attribute.

## 2. Brand Identity: "Maslahat Connect"
- **Primary Color**: Deep Teal (`#008A85`) — top navbar, primary action buttons, active tab indicators, and brand highlights.
- **Accent Color**: Warm Gold (`#F3A912`) — warning badges, notification indicators, secondary prominent buttons.
- **Background**: Light Warm Gray (`#F8FAFC`, `slate-50`) — global application background.
- **Surface**: Crisp White (`#FFFFFF`) with subtle 1px border (`border-slate-200`) and ambient shadows (`shadow-sm`).
- **Typography**:
  - Headings: **Manrope** (`font-bold`, `tracking-tight`).
  - Body & Data: **Plus Jakarta Sans**.
  - Forbidden: Generic Inter or Roboto for headers.

## 3. Layout & Visual Hierarchy
- **Top Navbar**: Fixed (`sticky top-0 z-50`) with Deep Teal background, CRS logo, search bar, notification dropdown, and user avatar.
- **Sidebar**: Collapsible navigation with left-border indicator on active state.
- **KPI Cards**: Bento-style grid with status-colored left border accent (`border-l-4`).
- **Data Table**: F-pattern left-aligned columns, multi-column sorting, and pill-shaped status badges.
- **Transitions**: Explicit transitions only (`transition-colors duration-200` or `transition-transform duration-200`). NEVER use `transition-all`.
