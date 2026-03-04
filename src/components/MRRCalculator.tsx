import type { PlanSettings } from '../types';
import { useState } from 'react';
import { TrendingUp, Users, DollarSign, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MRRCalculatorProps {
  settings: PlanSettings;
  onUpdateSettings: (newSettings: Partial<PlanSettings>) => void;
}

interface MonthData {
  month: number;
  date: string;
  customers: number;
  mrr: number;
  arr: number;
  newCustomers: number;
  churnedCustomers: number;
  netRevenue: number;
}

export function MRRCalculator({ settings, onUpdateSettings }: MRRCalculatorProps) {
  const mrrSettings = settings.mrrSettings;
  const [startingMRR, setStartingMRR] = useState<number>(mrrSettings?.startingMRR ?? 0);
  const [startingCustomers, setStartingCustomers] = useState<number>(mrrSettings?.startingCustomers ?? 0);
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState<number>(mrrSettings?.monthlyGrowthRate ?? 0);
  const [monthlyChurnRate, setMonthlyChurnRate] = useState<number>(mrrSettings?.monthlyChurnRate ?? 0);
  const [arpu, setArpu] = useState<number>(mrrSettings?.arpu ?? 0);
  const [projectionMonths, setProjectionMonths] = useState<number>(mrrSettings?.projectionMonths ?? 12);

  // Save settings when values change
  const updateMRRSettings = (updates: Partial<typeof mrrSettings>) => {
    onUpdateSettings({
      mrrSettings: {
        startingMRR,
        startingCustomers,
        monthlyGrowthRate,
        monthlyChurnRate,
        arpu,
        projectionMonths,
        ...mrrSettings,
        ...updates
      }
    });
  };

  const symbol = settings?.primaryCurrency === 'USD' ? '$' : 
                 settings?.primaryCurrency === 'EUR' ? '€' : 
                 settings?.primaryCurrency === 'GBP' ? '£' : '$';

  // Calculate projections
  const calculateProjections = (): MonthData[] => {
    const data: MonthData[] = [];
    let currentCustomers = startingCustomers;
    let currentMRR = startingMRR;

    for (let month = 0; month <= projectionMonths; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      if (month === 0) {
        data.push({
          month,
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          customers: currentCustomers,
          mrr: currentMRR,
          arr: currentMRR * 12,
          newCustomers: 0,
          churnedCustomers: 0,
          netRevenue: 0,
        });
        continue;
      }

      const newCustomers = Math.round(currentCustomers * (monthlyGrowthRate / 100));
      const churnedCustomers = Math.round(currentCustomers * (monthlyChurnRate / 100));
      const netNewCustomers = newCustomers - churnedCustomers;
      const netRevenue = netNewCustomers * arpu;

      currentCustomers += netNewCustomers;
      currentMRR = currentCustomers * arpu;

      data.push({
        month,
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        customers: currentCustomers,
        mrr: currentMRR,
        arr: currentMRR * 12,
        newCustomers,
        churnedCustomers,
        netRevenue,
      });
    }

    return data;
  };

  const projections = calculateProjections();
  const finalData = projections[projections.length - 1];
  const firstData = projections[0];
  const totalGrowth = ((finalData.mrr - firstData.mrr) / firstData.mrr) * 100;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${symbol}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${symbol}${(value / 1000).toFixed(1)}K`;
    }
    return `${symbol}${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          MRR/ARR Projector
        </h2>
        
        {/* Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Starting MRR
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                value={startingMRR || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setStartingMRR(val);
                  updateMRRSettings({ startingMRR: val });
                }}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Starting Customers
            </label>
            <input
              type="number"
              value={startingCustomers || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setStartingCustomers(val);
                updateMRRSettings({ startingCustomers: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ArrowUpRight className="w-4 h-4 inline mr-1" />
              Monthly Growth Rate (%)
            </label>
            <input
              type="number"
              value={monthlyGrowthRate || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setMonthlyGrowthRate(val);
                updateMRRSettings({ monthlyGrowthRate: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ArrowDownRight className="w-4 h-4 inline mr-1" />
              Monthly Churn Rate (%)
            </label>
            <input
              type="number"
              value={monthlyChurnRate || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setMonthlyChurnRate(val);
                updateMRRSettings({ monthlyChurnRate: val });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              ARPU (Average Revenue Per User)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                value={arpu || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setArpu(val);
                  updateMRRSettings({ arpu: val });
                }}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-1" />
              Projection Months
            </label>
            <input
              type="number"
              value={projectionMonths || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 12;
                setProjectionMonths(val);
                updateMRRSettings({ projectionMonths: val });
              }}
              min={1}
              max={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Current MRR</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(firstData.mrr)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Projected MRR ({projectionMonths} mo)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(finalData.mrr)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Projected ARR</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(finalData.arr)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Growth</p>
            <p className="text-xl font-bold text-gray-900">{totalGrowth.toFixed(1)}%</p>
          </div>
        </div>

        {/* Projection Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Month</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Customers</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">New</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Churned</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">MRR</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">ARR</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Net Revenue</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((data) => (
                <tr key={data.month} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-900">{data.month === 0 ? 'Now' : data.date}</td>
                  <td className="text-right py-2 px-3 text-gray-700">{data.customers.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-green-600">+{data.newCustomers.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-red-500">-{data.churnedCustomers.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 font-medium text-gray-900">{formatCurrency(data.mrr)}</td>
                  <td className="text-right py-2 px-3 font-medium text-purple-600">{formatCurrency(data.arr)}</td>
                  <td className="text-right py-2 px-3 text-gray-600">
                    {data.month === 0 ? '-' : formatCurrency(data.netRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
