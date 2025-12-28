# Design Guidelines: İSGMed - Atık Yönetimi Modülü

## Design Approach
**System-Based + Custom Requirements**: This enterprise waste management system follows established design system principles (Material Design for data-heavy applications) while incorporating the specific UI patterns from the provided HTML prototype.

## Typography
- **Primary Font**: Inter (300, 400, 600, 800 weights) for all UI text
- **Monospace Font**: JetBrains Mono (400, 700) for codes, tags, and data displays
- **Hierarchy**: 
  - Large headings: 2xl-3xl, font-bold
  - Section titles: xl-2xl, font-semibold
  - Body text: sm-base, font-normal
  - Data/metrics: font-mono for numerical values

## Layout System
**Spacing**: Tailwind units of 2, 4, 6, 8 for consistent rhythm
- Cards/Containers: p-4 to p-8
- Section gaps: gap-4 to gap-8
- Margins: m-2, m-4, m-6

## Color Scheme
**Primary Theme**: Dark mode default with light mode toggle capability
- **Background**: #0f172a (slate-950)
- **Text**: #e2e8f0 (slate-200)
- **Borders**: #334155 (slate-700)
- **Cards**: #1e293b (slate-800)

**Waste Type Colors** (Critical - maintain exact scheme):
- Medical: #e11d48 (rose-600)
- Hazardous: #f59e0b (amber-500)
- Domestic: #64748b (slate-500)
- Recycle: #06b6d4 (cyan-500)

**Accent Colors**:
- Hospital 1: #3b82f6 (blue-500)
- Hospital 2: #8b5cf6 (violet-500)
- Hospital 3: #10b981 (emerald-500)

## Component Library

### Core UI Elements
**Cards**: Dark background with subtle borders, rounded corners (rounded-lg to rounded-xl), minimal shadows with glow effects on hover
**Buttons**: Full-width on mobile, size-appropriate on desktop. Primary actions use accent colors, secondary use slate-600
**Forms**: Dark inputs with slate-700 borders, focus states with accent color rings
**Icons**: Lucide React library for consistency

### Navigation
**Desktop**: Sidebar navigation with role-based menu items
**Mobile**: Bottom tab bar for field staff interface, hamburger menu for managers
**User Indicator**: Display role badge and hospital assignment prominently

### Data Displays
**Charts**: Custom donut charts for waste distribution, bar charts for comparisons, line charts for time analysis
**Tables**: Striped rows, hover states, sortable columns, compact mobile view
**KPI Cards**: Large numeric displays with trend indicators and sparklines

### Specialized Components
**QR Scanner Interface**: Full-screen camera view with overlay guides
**Tag Printer**: Preview of generated labels with barcode
**Weighing Interface**: Large numeric keypad, real-time weight display
**Risk Matrix**: 3x3 grid with color-coded cells, interactive tooltips
**Timeline View**: Horizontal scroll for hourly waste collection data

## Responsive Behavior
**Mobile-First Priority**: Field staff interface optimized for phones/tablets
- Touch-friendly targets (min 44px)
- Single column layouts
- Swipe gestures for navigation
- Bottom sheet modals

**Desktop**: Multi-column dashboards, side-by-side comparisons, detailed analytics views

## Theme Toggle
Implement light/dark mode switch accessible from all screens. Light mode inverts the color scheme while maintaining brand colors for waste types.

## Accessibility
- High contrast ratios maintained (WCAG AA)
- Keyboard navigation for all interactions
- Screen reader labels for icons and charts
- Loading states with spinners for async operations

## Animations
**Minimal & Purposeful**:
- Fade-in for page loads (0.5s ease-out)
- Subtle hover effects on interactive elements
- Loading spinners for data fetching
- Success/error state transitions

## Images
No hero images required. This is a functional enterprise application focused on data visualization and workflow efficiency. All visual elements are charts, graphs, and UI components.