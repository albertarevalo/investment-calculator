import type { CalculationResult, PlanSettings } from '../types';
import { formatCurrency } from '../utils/calculator';
import { useExchangeRates, getCurrencySymbol } from '../hooks/useExchangeRates';
import { Wallet, TrendingDown, Calendar, Shield } from 'lucide-react';

interface SummaryCardsProps {
  results: CalculationResult;
  settings: PlanSettings;
}

export function SummaryCards({ results, settings }: SummaryCardsProps) {
  const { convert } = useExchangeRates(settings?.primaryCurrency || 'USD');
  const primarySymbol = getCurrencySymbol(settings?.primaryCurrency || 'USD');
  const secondarySymbol = getCurrencySymbol(settings?.secondaryCurrency || 'EUR');
  const formatRunway = (months: number) => {
    if (!Number.isFinite(months)) return '∞';
    const yrs = Math.floor(months / 12);
    const mos = Math.floor(months % 12);
    if (yrs <= 0) return `${mos} mo${mos === 1 ? '' : 's'}`;
    return mos > 0
      ? `${yrs} yr${yrs > 1 ? 's' : ''} ${mos} mo${mos === 1 ? '' : 's'}`
      : `${yrs} yr${yrs > 1 ? 's' : ''}`;
  };
  const cards = [
    {
      title: 'Total Needed',
      value: formatCurrency(results.totalNeeded, primarySymbol),
      secondaryValue: settings?.showSecondaryCurrency ? formatCurrency(convert(results.totalNeeded, settings?.primaryCurrency || 'USD', settings?.secondaryCurrency || 'EUR'), secondarySymbol) : null,
      subtitle: 'Without buffer',
      icon: Wallet,
      color: 'blue',
    },
    {
      title: 'With Buffer',
      value: formatCurrency(results.totalWithBuffer, primarySymbol),
      secondaryValue: settings?.showSecondaryCurrency ? formatCurrency(convert(results.totalWithBuffer, settings?.primaryCurrency || 'USD', settings?.secondaryCurrency || 'EUR'), secondarySymbol) : null,
      subtitle: 'Recommended amount',
      icon: Shield,
      color: 'green',
    },
    {
      title: 'Monthly Burn',
      value: formatCurrency(results.monthlyBurn, primarySymbol),
      secondaryValue: settings?.showSecondaryCurrency ? formatCurrency(convert(results.monthlyBurn, settings?.primaryCurrency || 'USD', settings?.secondaryCurrency || 'EUR'), secondarySymbol) : null,
      subtitle: 'Recurring / month',
      icon: TrendingDown,
      color: 'orange',
    },
    {
      title: 'Runway',
      value: formatRunway(results.runwayMonths),
      secondaryValue: null,
      subtitle: 'With current funds',
      icon: Calendar,
      color: 'purple',
    },
  ];

  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const colors = colorClasses[card.color];
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
                {card.secondaryValue && (
                  <p className="text-sm text-gray-500 mt-0.5">{card.secondaryValue}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-2 rounded-lg ${colors.bg}`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
