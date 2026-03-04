import type { Plan, PlanSettings } from '../types';
import { calculateResults } from '../utils/calculator';
import { formatCurrency } from '../utils/calculator';
import { getCurrencySymbol } from '../hooks/useExchangeRates';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X, Wallet, TrendingDown, Calendar, Shield, BarChart3, List } from 'lucide-react';
import { useState } from 'react';

interface CompareModalProps {
  plans: Plan[];
  settings: PlanSettings;
  onClose: () => void;
}

export function CompareModal({ plans, settings, onClose }: CompareModalProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'charts'>('charts');
  const primarySymbol = getCurrencySymbol(settings?.primaryCurrency || 'USD');
  const planResults = plans.map((plan) => ({
    plan,
    results: calculateResults(plan.expenses, plan.settings, 0),
  }));

  // Prepare data for charts
  const comparisonData = planResults.map(({ plan, results }) => ({
    name: plan.name,
    'Total Needed': results.totalNeeded,
    'With Buffer': results.totalWithBuffer,
    'Monthly Burn': results.monthlyBurn,
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Compare Plans</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
          {/* View Toggle */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setViewMode('charts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'charts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Charts View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List className="w-4 h-4" />
              Cards View
            </button>
          </div>

          {viewMode === 'charts' ? (
            <div className="space-y-6">
              {/* Bar Chart Comparison */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Investment Comparison</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${primarySymbol}${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value, primarySymbol)}
                        labelStyle={{ color: '#374151' }}
                      />
                      <Legend />
                      <Bar dataKey="Total Needed" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="With Buffer" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Burn Comparison */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">Monthly Burn Rate Comparison</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${primarySymbol}${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value, primarySymbol)} />
                      <Bar dataKey="Monthly Burn" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Table */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Plan</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Total Needed</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">With Buffer</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Monthly Burn</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600">Runway</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planResults.map(({ plan, results }, idx) => (
                        <tr key={plan.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 px-3 font-medium text-gray-900" style={{ color: COLORS[idx % COLORS.length] }}>
                            {plan.name}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-700">
                            {formatCurrency(results.totalNeeded, primarySymbol)}
                          </td>
                          <td className="text-right py-2 px-3 text-green-600 font-medium">
                            {formatCurrency(results.totalWithBuffer, primarySymbol)}
                          </td>
                          <td className="text-right py-2 px-3 text-gray-700">
                            {formatCurrency(results.monthlyBurn, primarySymbol)}
                          </td>
                          <td className="text-center py-2 px-3 text-purple-600 font-medium">
                            {plan.settings.targetRunwayMonths} mo
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, minmax(220px, 1fr))` }}>
              {planResults.map(({ plan, results }, idx) => (
                <div key={plan.id} className="bg-gray-50 rounded-lg p-4 border-t-4" style={{ borderColor: COLORS[idx % COLORS.length] }}>
                  <h3 className="font-semibold text-gray-900 mb-3 text-center">{plan.name}</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-gray-500">Total Needed</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(results.totalNeeded, primarySymbol)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-gray-500">With Buffer</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(results.totalWithBuffer, primarySymbol)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-orange-600" />
                        <span className="text-xs text-gray-500">Monthly Burn</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(results.monthlyBurn, primarySymbol)}
                      </span>
                    </div>

                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-500">Runway</span>
                        </div>
                        <span className="font-semibold text-purple-600">
                          {plan.settings.targetRunwayMonths} months
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-2 text-xs text-gray-500 text-center">
                      {plan.expenses.length} expenses ({plan.expenses.filter(e => e.type === 'one-time').length} one-time, {plan.expenses.filter(e => e.type === 'recurring').length} recurring)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
