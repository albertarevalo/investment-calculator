import type { Plan, PlanSettings } from '../types';
import { calculateResults } from '../utils/calculator';
import { formatCurrency } from '../utils/calculator';
import { getCurrencySymbol } from '../hooks/useExchangeRates';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X, Wallet, TrendingDown, Calendar, Shield, BarChart3, List, Pin, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useMemo, useState } from 'react';

interface CompareModalProps {
  plans: Plan[];
  settings: PlanSettings;
  onClose: () => void;
}

export function CompareModal({ plans, settings, onClose }: CompareModalProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'charts'>('cards');
  const [sortKey, setSortKey] = useState<'runway' | 'needed' | 'burn'>('runway');
  const [baselineId, setBaselineId] = useState<string | null>(plans[0]?.id ?? null);
  const primarySymbol = getCurrencySymbol(settings?.primaryCurrency || 'USD');
  const planResults = useMemo(() => plans.map((plan) => {
    const available = plan.settings?.burnRateSettings?.startingCash ?? 0;
    return {
      plan,
      results: calculateResults(plan.expenses, plan.settings, available),
    };
  }), [plans]);

  // Prepare data for charts
  const comparisonData = planResults.map(({ plan, results }) => ({
    name: plan.name,
    'Total Needed': results.totalNeeded,
    'With Buffer': results.totalWithBuffer,
    'Monthly Burn': results.monthlyBurn,
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const sortedPlanResults = useMemo(() => {
    const keyFn: Record<typeof sortKey, (r: ReturnType<typeof calculateResults>) => number> = {
      runway: (r) => r.runwayMonths,
      needed: (r) => -r.totalNeeded,
      burn: (r) => -r.monthlyBurn,
    };
    return [...planResults].sort((a, b) => keyFn[sortKey](b.results) - keyFn[sortKey](a.results));
  }, [planResults, sortKey]);

  const baseline = sortedPlanResults.find((pr) => pr.plan.id === baselineId) || sortedPlanResults[0];

  const formatDelta = (value: number, baselineValue: number, isHigherBetter = true) => {
    if (!baseline) return null;
    const diff = value - baselineValue;
    if (diff === 0) return { text: '0%', positive: true };
    const pct = ((diff / Math.abs(baselineValue || 1)) * 100).toFixed(1);
    const positive = isHigherBetter ? diff >= 0 : diff <= 0;
    return { text: `${diff > 0 ? '+' : ''}${pct}%`, positive };
  };

  const metricTitles = {
    totalNeeded: 'Total one-time + recurring burn across the target runway months (before buffer).',
    withBuffer: 'Total Needed plus safety buffer (percentage + buffer months).',
    monthlyBurn: 'Recurring monthly burn (recurring expenses normalized to monthly).',
    runway: 'Estimated months of runway based on current available funds and monthly burn.',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Compare Plans</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-auto max-h-[calc(95vh-88px)]">
          {/* View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
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

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Sort by</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="runway">Runway</option>
                <option value="needed">Total Needed (low)</option>
                <option value="burn">Monthly Burn (low)</option>
              </select>
            </div>
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
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, minmax(240px, 1fr))` }}>
              {sortedPlanResults.map(({ plan, results }, idx) => {
                const isBaseline = plan.id === baseline?.plan.id;
                const runwayDelta = baseline ? formatDelta(results.runwayMonths, baseline.results.runwayMonths, true) : null;
                const neededDelta = baseline ? formatDelta(results.totalNeeded, baseline.results.totalNeeded, false) : null;
                const burnDelta = baseline ? formatDelta(results.monthlyBurn, baseline.results.monthlyBurn, false) : null;
                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-xl p-4 border shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-md ${isBaseline ? 'ring-2 ring-blue-200' : 'border-gray-100'}`}
                    style={{ borderTop: `4px solid ${COLORS[idx % COLORS.length]}` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                        <p className="text-xs text-gray-500">Runway: {results.runwayMonths.toFixed(1)} months</p>
                      </div>
                      <button
                        onClick={() => setBaselineId(plan.id)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border ${isBaseline ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        <Pin className="w-3 h-3" /> {isBaseline ? 'Baseline' : 'Set baseline'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1 p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1" title={metricTitles.totalNeeded}><Wallet className="w-3 h-3 text-blue-600" /> Total Needed</span>
                          {neededDelta && !isBaseline && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${neededDelta.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {neededDelta.positive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {neededDelta.text}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(results.totalNeeded, primarySymbol)}</div>
                      </div>

                      <div className="flex flex-col gap-1 p-3 rounded-lg bg-green-50">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1" title={metricTitles.withBuffer}><Shield className="w-3 h-3 text-green-600" /> With Buffer</span>
                        </div>
                        <div className="text-sm font-semibold text-green-700">{formatCurrency(results.totalWithBuffer, primarySymbol)}</div>
                      </div>

                      <div className="flex flex-col gap-1 p-3 rounded-lg bg-orange-50">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1" title={metricTitles.monthlyBurn}><TrendingDown className="w-3 h-3 text-orange-600" /> Monthly Burn</span>
                          {burnDelta && !isBaseline && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${burnDelta.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {burnDelta.positive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {burnDelta.text}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(results.monthlyBurn, primarySymbol)}</div>
                      </div>

                      <div className="flex flex-col gap-1 p-3 rounded-lg bg-purple-50">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1" title={metricTitles.runway}><Calendar className="w-3 h-3 text-purple-600" /> Runway</span>
                          {runwayDelta && !isBaseline && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${runwayDelta.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {runwayDelta.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {runwayDelta.text}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-purple-700">{results.runwayMonths.toFixed(1)} months</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500 text-center border-t border-gray-100 pt-3">
                      {plan.expenses.length} expenses ({plan.expenses.filter(e => e.type === 'one-time').length} one-time, {plan.expenses.filter(e => e.type === 'recurring').length} recurring)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
