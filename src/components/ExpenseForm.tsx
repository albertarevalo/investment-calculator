import { useMemo, useState } from 'react';
import type { Expense, PlanSettings } from '../types';
import { getCurrencySymbol } from '../hooks/useExchangeRates';
import { Plus, CircleDollarSign, Repeat } from 'lucide-react';

interface ExpenseFormProps {
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  settings: PlanSettings;
}

export function ExpenseForm({ onAdd, settings }: ExpenseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'one-time' | 'recurring'>('one-time');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [startMonth, setStartMonth] = useState('0');
  const [growthRate, setGrowthRate] = useState('0');

  const primarySymbol = getCurrencySymbol(settings.primaryCurrency);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: { label: string; value: number }[] = [];
    for (let i = 0; i < 25; i++) {
      const d = new Date(now);
      d.setMonth(now.getMonth() + i);
      opts.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: i,
      });
    }
    return opts;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const amountValue = parseFloat(amount) || 0;
    const startMonthValue = Math.max(0, parseInt(startMonth, 10) || 0);
    const growthValue = Math.max(0, parseFloat(growthRate || '0'));

    onAdd({
      name: name.trim(),
      amount: amountValue,
      type,
      startMonth: startMonthValue,
      frequency: type === 'recurring' ? frequency : undefined,
      growthRate: growthValue,
    });

    setName('');
    setAmount('');
    setType('one-time');
    setFrequency('monthly');
    setStartMonth('0');
    setGrowthRate('0');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Expense
      </button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('one-time')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
              type === 'one-time'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CircleDollarSign className="w-4 h-4" />
            One-time
          </button>
          <button
            type="button"
            onClick={() => setType('recurring')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
              type === 'recurring'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Repeat className="w-4 h-4" />
            Recurring
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Expense name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Office Rent"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{primarySymbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Start month</label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {type === 'recurring' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">MoM Growth %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step="0.1"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex-1 min-w-[160px]"
          >
            <Plus className="w-4 h-4" />
            Add expense
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex-1 min-w-[120px] text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
