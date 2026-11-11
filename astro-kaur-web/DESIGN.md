---
name: The Astro Kaur Admin Workspace
description: A focused, two-theme workspace for managing readings and site content.
colors:
  brand-gold: "#E5B842"
  gold-ink: "#805b11"
  burgundy: "#6B3448"
  light-paper: "#FFFDF9"
  light-surface: "#FFFFFF"
  dark-canvas: "#0F172A"
  dark-surface: "#0D1829"
  ink: "#0F172A"
  muted-ink: "#46505F"
  light-text: "#FAF8F5"
  muted-light-text: "#BCC4D0"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontSize: "1.875rem / 2.25rem responsive"
    fontWeight: 400
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  admin-tab-active:
    backgroundColor: "#E5B84233"
    textColor: "#0F172A"
    rounded: "12px"
    height: "48px"
  admin-panel:
    backgroundColor: "#FFFFFF"
    rounded: "16px"
    padding: "20px 24px"
  admin-input:
    backgroundColor: "#FFFDF9"
    textColor: "#0F172A"
    rounded: "12px"
    padding: "10px 12px"
---

# Design System: The Astro Kaur Admin Workspace

## Overview

**Creative North Star: "The Calm Reading Room"**

The workspace carries the site's astrology identity into a practical tool for resolving bookings and maintaining content. Serif headings retain a personal, editorial tone; compact sans-serif controls keep frequent administrative tasks readable and efficient. Light paper and deep blue-black themes share the same structure, with gold reserved for selected navigation, focus, and important actions.

The interface favors solid surfaces, thin borders, and clear task grouping. The overview puts open work before secondary tools, while voice-call scheduling and text follow-up remain separate. The interface supports the existing saved light and dark theme preference.

**Key Characteristics:**
- Quiet, solid light and dark surfaces
- Serif page and section headings with compact sans-serif controls
- Restrained gold for active, focused, and primary states
- Task-oriented panels with responsive navigation

## Colors

The palette pairs warm paper and muted blue-black neutrals with a small gold accent and a secondary burgundy used in selected content/editor details.

### Primary
- **Astrology Gold** (`#E5B842`): Active navigation tint, keyboard focus, status emphasis, and primary editor actions.
- **Deep Gold Ink** (`#805b11`): Readable gold-family links and focus details on light surfaces; the dark theme shifts emphasis to brighter gold.

### Secondary
- **Reading Burgundy** (`#6B3448`): A restrained secondary accent in content-editor previews and reading-related details.

### Neutral
- **Warm Paper** (`#FFFDF9`): Main light workspace canvas and light-mode search fields.
- **White Surface** (`#FFFFFF`): Light-mode panels and form surfaces.
- **Midnight Slate** (`#0F172A`): Dark-mode header/canvas and primary light-mode text.
- **Night Panel** (`#0D1829`): Dark-mode dashboard and panel surfaces.
- **Soft Ivory** (`#FAF8F5`): Primary text on dark surfaces.
- **Slate Muted** (`#46505F`): Supporting text on light surfaces.
- **Moonstone Muted** (`#BCC4D0`): Supporting text on dark surfaces.

### Named Rules
**The Gold-for-State Rule.** Use gold to identify selection, keyboard focus, or a primary action; keep the base canvas and panels neutral.

## Typography

**Display Font:** Georgia (serif fallback stack from the Tailwind serif family)
**Body Font:** Arial, Helvetica, sans-serif (the global stylesheet's applied stack)
**Label/Mono Font:** Geist Mono is loaded globally but is not a defining admin text style.

**Character:** Serif headings bring the public brand into the workspace. The system sans-serif stack handles controls, labels, descriptions, and dense booking details.

### Hierarchy
- **Display** (400, 30px / 36px and 36px / 40px at wider screens): Admin page titles.
- **Headline** (400, 24px / 32px): Dashboard panel headings.
- **Title** (600, 16px / 24px): Navigation and subsection titles.
- **Body** (400, 14px / 20px): Supporting copy, booking details, and controls.
- **Label** (500, 12px / 16px): Compact form labels and metadata where needed.

### Named Rules
**The Serif-for-Structure Rule.** Reserve the serif face for page and section headings; keep operational content and controls in sans-serif.

## Layout

The admin header and content use centered max-width containers, with page-specific limits between 64rem and 80rem. The four primary destinations form a two-column grid on narrow screens and four columns from 640px upward. The overview uses a wider Needs attention column beside Upcoming calls at large widths, then stacks on smaller screens. Panels use consistent 16px gaps and 20–24px internal padding, increasing to 24px on wider layouts. Keep navigation available directly under the brand header.

## Elevation & Depth

The dashboard uses a flat-by-default treatment: solid panel fills and subtle borders establish grouping. Content editor previews and dialogs may use restrained shadows, but they are not the base dashboard treatment.

### Named Rules
**The Border-before-Shadow Rule.** Separate routine workspace regions with tonal surfaces and fine borders; reserve shadows for overlays or content-preview emphasis.

## Shapes

Rounded geometry is consistent and functional: navigation tabs and inputs use gently rounded corners (12px), panels use a more generous radius (16px), and compact utility controls may use 8px corners or full pills. Fine neutral borders define panels and fields. Keep clipping limited to contained media and overlays.

## Components

### Navigation
- **Style:** A brand header with emblem, serif name, and compact workspace label; account actions sit opposite.
- **Tabs:** Four equal destinations; two columns on mobile and four at 640px and above. Active tabs use a translucent gold fill and dark text.
- **Focus:** Visible 2px outlines with offset, using deep gold on light and bright gold on dark.

### Buttons
- **Character:** Compact utility controls with a clear, lightweight outline; gold-filled actions appear in content editing.
- **Refresh:** Rounded outline, medium-weight 14px text, and a gold border on hover. Preserve a visible keyboard outline and reduced opacity when disabled.
- **Primary editor action:** Gold fill, dark text, compact bold label, and a brighter gold hover state.

### Cards / Containers
- **Corner Style:** Gently rounded (16px) for dashboard panels.
- **Background:** White in light mode and deep blue-black in dark mode.
- **Border:** Fine navy or white with low opacity; dividers continue the same treatment inside lists.
- **Internal Padding:** 20px on narrow screens, 24px on wider screens; list rows use compact vertical spacing.
- **Shadow Strategy:** Flat in the overview and booking queues; overlay and preview shadows belong to their specific content/editor contexts.

### Inputs / Fields
- **Style:** 12px corners, fine neutral border, warm-paper light fill and deep slate dark fill; labels remain visible above fields.
- **Focus:** A 2px gold-family ring or outline, distinct in both themes.
- **Mobile:** Text fields use a minimum 16px font size to avoid browser zoom on focus.

### Booking Lists
- Rows separate with quiet dividers, place customer identity before service detail, and use gold text for the next relevant action. Keep dates and status information legible without decorative badges dominating the row.

## Do's and Don'ts

### Do:
- **Do** preserve both light and dark theme surfaces and text contrast.
- **Do** use gold for selected navigation, visible focus, and important actions.
- **Do** keep the four main destinations equally available and let the task content determine page emphasis.
- **Do** keep text-reading follow-up distinct from voice-call scheduling.
- **Do** use solid surfaces and clear borders for the core workspace.

### Don't:
- **Don't** add decorative page backgrounds to the admin workspace.
- **Don't** turn every panel or link into a gold-accented surface.
- **Don't** combine text-reading follow-up with appointment availability.
