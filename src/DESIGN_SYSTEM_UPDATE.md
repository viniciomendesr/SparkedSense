# Design System Update - Sparked Sense

## Summary
Updated the Sparked Sense design system with JetBrains Mono font and new blue primary color scheme.

---

## Typography Changes

### Font Family
- **Previous**: Space Grotesk (headings/body), IBM Plex Mono (code)
- **Current**: JetBrains Mono (all elements)

All text elements now use JetBrains Mono monospace font:
- Headings (h1-h6)
- Body text (p, spans)
- Buttons
- Form inputs (input, textarea, select)
- Code elements

---

## Color Changes

### Primary Color
- **Previous**: `#40BD9F` (teal/green)
- **Current**: `#97AAF7` (blue)

### Updated Color Tokens
```css
--primary: #97AAF7
--ring: #97AAF7
--success: #97AAF7
--chart-1: #97AAF7
```

### New Hover/Active States
All within the blue tone family:
```css
--primary-hover: #7B91F5   /* Darker blue for hover */
--primary-active: #6A80E8  /* Even darker for active/pressed */
--chart-3: #B8C5F9         /* Lighter blue for charts */
```

---

## Interactive States

### Buttons
- **Hover**: Transitions to `#7B91F5` (darker blue)
- **Active**: Transitions to `#6A80E8` (darkest blue) with slight downward translation (1px)
- **Disabled**: Maintains opacity at 50%

### Links and Text
- **Hover**: Primary text color shifts to hover blue tone
- **Focus**: Ring color uses primary blue

### Borders
- **Hover**: Border elements transition to hover blue

---

## Files Updated

### Core Design System
- `/styles/globals.css` - Font imports, color tokens, typography, hover states

### Components
- `/components/header.tsx` - Removed hardcoded hover colors
- `/components/sensor-card.tsx` - Removed hardcoded hover colors
- `/components/register-sensor-dialog.tsx` - Removed hardcoded hover colors

### Pages
- `/pages/home.tsx` - Removed hardcoded hover colors
- `/pages/dashboard.tsx` - Removed hardcoded hover colors
- `/pages/sensor-detail.tsx` - Removed hardcoded hover colors
- `/pages/audit.tsx` - Removed hardcoded hover colors

---

## Design Principles Maintained

✅ **Dark mode first** - All colors optimized for dark background (#0C0E12)
✅ **High contrast** - Primary blue (#97AAF7) provides excellent readability on dark surfaces
✅ **Accessible interactions** - Clear visual feedback with hover/active states
✅ **Minimalist Web3 aesthetic** - Clean, technical, data-oriented design
✅ **Consistent spacing** - No changes to layout grid or spacing system

---

## Color Accessibility

The new blue primary color (#97AAF7) maintains:
- **WCAG AA compliance** on dark backgrounds
- **Clear visual hierarchy** with distinct hover/active states
- **Consistent tone family** for cohesive user experience

---

## Usage Guidelines

### Using Primary Color
```tsx
// Buttons - hover states are automatic
<Button className="bg-primary text-primary-foreground">
  Click Me
</Button>

// Text with hover
<span className="text-primary hover:text-primary-hover">
  Link Text
</span>

// Borders
<div className="border-primary hover:border-primary-hover">
  Content
</div>
```

### Chart Colors
Use the updated chart color palette:
1. `var(--chart-1)` - Primary blue (#97AAF7)
2. `var(--chart-2)` - Secondary blue (#8ABEE3)
3. `var(--chart-3)` - Light blue (#B8C5F9)
4. `var(--chart-4)` - Warning gold (#D1A04D)
5. `var(--chart-5)` - Error red (#E35B5B)
