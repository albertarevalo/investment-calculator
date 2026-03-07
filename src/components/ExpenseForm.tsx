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
    <div className="bg-white p-4 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('one-time')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
              type === 'one-time'
                ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CircleDollarSign className="w-4 h-4" />
            One-time
          </button>
          <button
            type="button"
            onClick={() => setType('recurring')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
              type === 'recurring'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Repeat className="w-4 h-4" />
            Recurring
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Expense name (e.g., Office Rent)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {primarySymbol}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              min="0"
              step="0.01"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {type === 'recurring' && (
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MoM Growth %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step="0.1"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
