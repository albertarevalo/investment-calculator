import { useState } from 'react';
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

  const primarySymbol = getCurrencySymbol(settings.primaryCurrency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    onAdd({
      name: name.trim(),
      amount: parseFloat(amount),
      type,
      frequency: type === 'recurring' ? frequency : undefined,
    });

    setName('');
    setAmount('');
    setType('one-time');
    setFrequency('monthly');
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
          {type === 'recurring' && (
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
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
