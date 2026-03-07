import type { Expense, PlanSettings } from '../types';
import { formatCurrency } from '../utils/calculator';
import { useExchangeRates, getCurrencySymbol } from '../hooks/useExchangeRates';
import { Trash2, Edit2, Check, X, Repeat, CircleDollarSign } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ExpenseListProps {
  expenses: Expense[];
  onUpdate: (id: string, updates: Partial<Expense>) => void;
  onDelete: (id: string) => void;
  settings: PlanSettings;
}

export function ExpenseList({ expenses, onUpdate, onDelete, settings }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Expense>>({});
  const { convert } = useExchangeRates(settings.primaryCurrency);
  const primarySymbol = getCurrencySymbol(settings.primaryCurrency);
  const secondarySymbol = getCurrencySymbol(settings.secondaryCurrency);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: { label: string; value: number }[] = [];
    for (let i = 0; i < 25; i++) {
      const d = new Date(now);
      d.setMonth(now.getMonth() + i);
      opts.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), value: i });
    }
    return opts;
  }, []);

  const oneTimeExpenses = expenses.filter((e) => e.type === 'one-time');
  const recurringExpenses = expenses.filter((e) => e.type === 'recurring');

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditForm({ ...expense });
  };

  const saveEdit = (id: string) => {
    const normalizedStart = typeof editForm.startMonth === 'number'
      ? editForm.startMonth
      : Math.max(0, parseInt(String(editForm.startMonth ?? '0'), 10) || 0);
    onUpdate(id, { ...editForm, startMonth: normalizedStart });
    setEditingId(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const renderExpenseItem = (expense: Expense) => {
    const isEditing = editingId === expense.id;

    if (isEditing) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-blue-200">
          <div className="space-y-3">
            <input
              type="text"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Expense name"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={editForm.amount || ''}
                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Amount"
              />
              <select
                value={typeof editForm.startMonth === 'number' ? editForm.startMonth : 0}
                onChange={(e) => setEditForm({ ...editForm, startMonth: parseInt(e.target.value, 10) })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {expense.type === 'recurring' && (
                <select
                  value={editForm.frequency || 'monthly'}
                  onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value as 'monthly' | 'yearly' })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => saveEdit(expense.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${expense.type === 'one-time' ? 'bg-orange-100' : 'bg-blue-100'}`}>
            {expense.type === 'one-time' ? (
              <CircleDollarSign className="w-5 h-5 text-orange-600" />
            ) : (
              <Repeat className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{expense.name}</p>
            <p className="text-sm text-gray-500">
              {expense.type === 'recurring' && expense.frequency === 'yearly' ? 'Yearly' : expense.type === 'recurring' ? 'Monthly' : 'One-time'}
              {typeof expense.startMonth === 'number' && expense.startMonth > 0 &&
                ` · Starts ${monthOptions.find((m) => m.value === expense.startMonth)?.label || ''}`}
              {(!expense.startMonth || expense.startMonth === 0) && ' · Starts Now'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-semibold text-gray-900">
            {formatCurrency(expense.amount, primarySymbol)}
            {settings.showSecondaryCurrency && (
              <span className="text-sm text-gray-500 ml-1">
                ({formatCurrency(convert(expense.amount, settings.primaryCurrency, settings.secondaryCurrency), secondarySymbol)})
              </span>
            )}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => startEdit(expense)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(expense.id)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {oneTimeExpenses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            One-time Expenses ({oneTimeExpenses.length})
          </h3>
          <div className="space-y-2">
            {oneTimeExpenses.map((expense) => (
              <div key={expense.id}>{renderExpenseItem(expense)}</div>
            ))}
          </div>
        </div>
      )}

      {recurringExpenses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recurring Expenses ({recurringExpenses.length})
          </h3>
          <div className="space-y-2">
            {recurringExpenses.map((expense) => (
              <div key={expense.id}>{renderExpenseItem(expense)}</div>
            ))}
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No expenses yet. Add your first expense below.
        </div>
      )}
    </div>
  );
}
