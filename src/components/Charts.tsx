import type { Expense, CalculationResult, PlanSettings } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '../utils/calculator';
import { getCurrencySymbol } from '../hooks/useExchangeRates';
import { PieChart as PieChartIcon, TrendingUp, CreditCard } from 'lucide-react';
import { useState } from 'react';

interface ChartsProps {
  expenses: Expense[];
  results: CalculationResult;
  settings: PlanSettings;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function Charts({ expenses, results, settings }: ChartsProps) {
  const [activeChart, setActiveChart] = useState<'breakdown' | 'timeline'>('breakdown');
  const primarySymbol = getCurrencySymbol(settings.primaryCurrency);

  const expenseData = expenses.map((e) => ({
    name: e.name,
    value: e.type === 'recurring' && e.frequency === 'yearly' ? e.amount / 12 : e.amount,
    type: e.type,
    fullAmount: e.amount,
  }));

  const timelineData = Array.from({ length: Math.min(24, Math.max(6, Math.ceil(results.runwayMonths) + 3)) }, (_, monthIndex) => {
    const month = monthIndex + 1;
    const remaining = results.availableFunds - results.oneTimeTotal - results.monthlyBurn * month;
    return {
      month: `M${month}`,
      balance: Math.max(0, remaining),
    };
  });

  
  const summaryData = [
    { name: 'One-time', value: results.oneTimeTotal, color: '#F59E0B' },
    { name: 'Monthly Recurring', value: results.monthlyRecurring, color: '#3B82F6' },
    { name: 'Yearly/12', value: results.yearlyRecurring / 12, color: '#10B981' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Visualizations</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveChart('breakdown')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'breakdown'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Breakdown
          </button>
          <button
            onClick={() => setActiveChart('timeline')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeChart === 'timeline'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {activeChart === 'breakdown' && (
        <div className="space-y-6">
          {expenseData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Expense Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: { payload?: { name?: string; fullAmount?: number } }) => {
                        const fullAmount = props?.payload?.fullAmount ?? value;
                        const label = props?.payload?.name ?? name;
                        return [formatCurrency(fullAmount, primarySymbol), label];
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">Monthly Burn Breakdown</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value, primarySymbol)}`}
                  >
                    {summaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, primarySymbol)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeChart === 'timeline' && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Projected Balance (24 months)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${primarySymbol}${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, primarySymbol), 'Balance']}
                />
                <Bar dataKey="balance" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
