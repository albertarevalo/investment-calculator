# PawsMatch Investment Calculator

A responsive React-based investment calculator for managing expenses and calculating runway for pet-related businesses and projects.

![PawsMatch Logo](https://nbsxlhidzrtafcgvzkvf.supabase.co/storage/v1/object/public/pawsmatch-bucket/images/logo.png)

## Features

- **Expense Management**: Track one-time and recurring expenses (monthly/yearly)
- **Runway Calculator**: Calculate how long your investment will last or how much you need for a specific timeframe
- **Multi-Plan Support**: Create, compare, and manage multiple budget plans
- **Safety Buffer**: Add buffer percentages and extra months for financial safety
- **Dual Currency Support**: Primary and secondary currency with live exchange rates
- **Data Import/Export**: Export and import plans as JSON files
- **Visual Charts**: Interactive charts for expense breakdown and projections
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Storage**: LocalStorage

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/investment-calculator.git
cd investment-calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## Usage

1. **Add Expenses**: Click "Add Expense" to add one-time or recurring expenses
2. **Set Runway**: Adjust the target runway months to see required investment
3. **Add Buffer**: Enable safety buffer for extra financial security
4. **Compare Plans**: Create multiple plans and compare them side-by-side
5. **Export/Import**: Save plans as JSON files and import them later

## Currency Support

The calculator supports 19 currencies with live exchange rates from the Frankfurter API:
- USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, SGD, HKD
- PHP, INR, KRW, MXN, BRL, IDR, MYR, THB, VND

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## License

MIT

## Author

PawsMatch Team
