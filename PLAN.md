# Investment Calculator - Implementation Plan

A responsive React + TypeScript web app for calculating investment needs based on one-time and recurring expenses, with multi-plan support and safety buffer calculations.

---

## Tech Stack

| Purpose | Choice | Reason |
|---------|--------|--------|
| **Framework** | React + TypeScript | Type safety, component-based |
| **Build Tool** | Vite | Fast HMR, simple config |
| **Styling** | TailwindCSS | Utility-first, responsive |
| **Charts** | Recharts | React-native, responsive |
| **Icons** | Lucide-react | Clean, modern icons |
| **Storage** | LocalStorage | No backend needed |

---

## Core Features

### Expense Management
- Add expense: name, amount, type (one-time/recurring), recurring frequency (monthly/yearly)
- Edit/delete with inline actions
- Visual distinction between one-time vs recurring

### Calculator Modes
1. **Runway Mode**: Input available investment → see how many months it lasts
2. **Target Mode**: Input desired runway months → see total investment needed

### Projections & Charts
- Monthly burn rate breakdown
- Cumulative cash flow over time
- Expense category pie chart
- Runway timeline visualization

---

## Multi-Plan Support

- Create, name, and save multiple expense configurations
- Side-by-side comparison view (e.g., "Lean Startup" vs "Full Team")
- Duplicate existing plan as starting point
- Export/import plans as JSON (backup/sharing)

---

## Safety Buffer Settings

- **Buffer percentage**: e.g., 20% extra on top of calculated amount
- **Buffer months**: e.g., add 3 months extra to runway
- Toggle: include/exclude buffer in calculations
- Display both "minimum needed" and "recommended with buffer"

---

## Data Structure

```typescript
type Expense = {
  id: string;
  name: string;
  amount: number;
  type: 'one-time' | 'recurring';
  frequency?: 'monthly' | 'yearly'; // for recurring
}

type PlanSettings = {
  targetRunwayMonths: number;
  bufferMonths: number;
  bufferPercentage: number;
  currency: string;
}

type Plan = {
  id: string;
  name: string;
  createdAt: string;
  expenses: Expense[];
  settings: PlanSettings;
}

type AppState = {
  plans: Plan[];
  activePlanId: string;
}
```

---

## Key Calculations

```typescript
// Monthly burn rate
const monthlyBurn = monthlyRecurring + (yearlyRecurring / 12);

// Investment needed for N months
const totalNeeded = oneTimeTotal + (monthlyBurn × targetMonths);

// Runway from available funds
const runwayMonths = (availableFunds - oneTimeTotal) / monthlyBurn;
```

---

## Responsive Design

### Breakpoints
- Mobile: < 640px (single column)
- Tablet: 640px - 1024px (adjusted grids)
- Desktop: > 1024px (full layout)

### Layout Adaptations

| Desktop | Mobile |
|---------|--------|
| Side-by-side: expenses + charts | Stacked: expenses first, charts below |
| Fixed sidebar for plan list | Bottom sheet or hamburger menu for plans |
| Expansive charts | Swipeable chart tabs (burn rate / runway / breakdown) |
| Inline edit buttons | Long-press or swipe actions |

### Mobile UX Optimizations
- Touch-friendly inputs (min 44px tap targets)
- Collapsible expense categories
- Quick-add floating button
- Bottom sheet for adding/editing expenses
- Horizontal scroll for comparison view
- Number pad for amount inputs

### Key Principles
- Summary cards always visible at top (sticky)
- Charts simplify on small screens (fewer data points, larger text)
- Plan switcher becomes compact dropdown
- Save state automatically (no explicit save button needed)

---

## UI Layout

- **Header**: Summary cards (total needed, monthly burn, runway) + plan selector
- **Main**:
  - Left: Expense list with quick-add form
  - Right: Calculator controls + charts
- **Responsive**: Stacks on mobile, side-by-side on desktop

---

## Project Structure

```
src/
├── components/
│   ├── CalculatorControls.tsx
│   ├── Charts.tsx
│   ├── CompareModal.tsx
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── PlanManager.tsx
│   └── SummaryCards.tsx
├── types/
│   └── index.ts
├── utils/
│   ├── calculator.ts
│   └── storage.ts
├── App.tsx
├── index.css
├── main.tsx
└── vite-env.d.ts
```

---

## Implementation Status

- [x] Initialize Vite + React + TypeScript project
- [x] Setup TailwindCSS
- [x] Install dependencies (recharts, lucide-react)
- [x] Create type definitions
- [x] Build LocalStorage persistence layer
- [x] Create expense management components
- [x] Build calculator logic
- [x] Add charting components
- [x] Implement plan save/load/compare
- [x] Add buffer settings UI
- [x] Responsive styling pass
- [x] Run dev server and test
