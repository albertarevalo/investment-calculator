# PawsMatch Investment Calculator

A responsive React-based investment calculator for managing expenses and calculating runway for pet-related businesses and projects.

![PawsMatch Logo](https://nbsxlhidzrtafcgvzkvf.supabase.co/storage/v1/object/public/pawsmatch-bucket/images/logo.png)

**Live Demo**: https://investment-calculator-three-omega.vercel.app/

## Features

- **Runway Calculator**: Calculate how long your investment will last or how much you need for a specific timeframe
- **Expense Management**: Track one-time and recurring expenses (monthly/yearly)
- **Multi-Plan Support**: Create, compare, and manage multiple budget plans
- **Safety Buffer**: Add buffer percentages and extra months for financial safety
- **Dual Currency Support**: Primary and secondary currency with live exchange rates
- **Data Import/Export**: Export and import plans as JSON files
- **Visual Charts**: Interactive charts for expense breakdown and projections
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### SaaS Startup Tools

- **MRR/ARR Projector**: Project Monthly/Annual Recurring Revenue based on growth rate, churn rate, and ARPU
  - Track customer growth and churn
  - See projected MRR/ARR over time
  - Calculate net revenue impact
  
- **Burn Rate Analyzer**: Analyze cash burn rate and runway
  - Track monthly burn vs revenue
  - Calculate runway until cash runs out
  - See cash out date prediction
  - Visual status indicators (healthy/warning/critical)

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

1. **Runway Calculator**: Add expenses, set runway, see required investment
2. **MRR/ARR Projector**: Track SaaS metrics, growth, and revenue projections
3. **Burn Rate Analyzer**: Monitor cash burn, runway, and cash out dates
4. **Multi-Plan**: Create and compare different scenarios
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
