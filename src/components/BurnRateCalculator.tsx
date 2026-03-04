import type { PlanSettings, Expense } from '../types';
import { useState, useMemo, useEffect } from 'react';
import { Flame, DollarSign, Calendar, AlertTriangle, TrendingDown, Clock } from 'lucide-react';

interface BurnRateCalculatorProps {
  settings: PlanSettings;
  expenses: Expense[];
  availableFunds: number;
}

interface MonthData {
  month: number;
  date: string;
  startingCash: number;
  monthlyBurn: number;
  endingCash: number;
  runwayMonths: number;
  status: 'healthy' | 'warning' | 'critical';
}

export function BurnRateCalculator({ settings, expenses, availableFunds }: BurnRateCalculatorProps) {
  const [startingCash, setStartingCash] = useState<number>(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [projectionMonths, setProjectionMonths] = useState<number>(12);

  // Calculate monthly expenses from existing expense data
  const calculatedMonthlyExpenses = useMemo(() => {
    let monthlyTotal = 0;
    expenses.forEach(expense => {
      if (expense.type === 'recurring') {
        if (expense.frequency === 'monthly') {
          monthlyTotal += expense.amount;
        } else if (expense.frequency === 'yearly') {
          monthlyTotal += expense.amount / 12;
        }
      }
    });
    return monthlyTotal;
  }, [expenses]);

  // Auto-update starting cash when available funds changes
  useEffect(() => {
    if (availableFunds > 0) {
      setStartingCash(availableFunds);
    }
  }, [availableFunds]);

  // Auto-update monthly expenses when expenses change (only if user hasn't manually entered)
  useEffect(() => {
    if (calculatedMonthlyExpenses > 0 && monthlyExpenses === 0) {
      setMonthlyExpenses(calculatedMonthlyExpenses);
    }
  }, [calculatedMonthlyExpenses]);

  const symbol = settings?.primaryCurrency === 'USD' ? '$' : 
                 settings?.primaryCurrency === 'EUR' ? '€' : 
                 settings?.primaryCurrency === 'GBP' ? '£' : '$';

  const netBurn = monthlyExpenses - monthlyRevenue;
  const isProfitable = netBurn <= 0;

  // Calculate projections
  const projections = useMemo((): MonthData[] => {
    const data: MonthData[] = [];
    let currentCash = startingCash;

    for (let month = 0; month <= projectionMonths; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      const runwayMonths = isProfitable ? Infinity : currentCash / netBurn;
      let status: 'healthy' | 'warning' | 'critical';
      
      if (isProfitable || runwayMonths > 12) {
        status = 'healthy';
      } else if (runwayMonths > 6) {
        status = 'warning';
      } else {
        status = 'critical';
      }

      data.push({
        month,
        date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        startingCash: currentCash,
        monthlyBurn: month === 0 ? 0 : netBurn,
        endingCash: currentCash - (month === 0 ? 0 : netBurn),
        runwayMonths,
        status,
      });

      if (month > 0) {
        currentCash -= netBurn;
      }
      
      // Stop if we run out of cash
      if (currentCash < 0) break;
    }

    return data;
  }, [startingCash, monthlyRevenue, monthlyExpenses, netBurn, isProfitable, projectionMonths]);

  const formatCurrency = (value: number) => {
    if (value === Infinity) return '∞';
    if (value >= 1000000) {
      return `${symbol}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${symbol}${(value / 1000).toFixed(1)}K`;
    }
    return `${symbol}${value.toFixed(0)}`;
  };

  const currentRunway = isProfitable ? Infinity : startingCash / netBurn;
  const cashOutDate = useMemo(() => {
    if (isProfitable) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + Math.floor(currentRunway));
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [isProfitable, currentRunway]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-600" />
          Burn Rate Analyzer
        </h2>
        
        {/* Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Starting Cash
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                value={startingCash || ''}
                onChange={(e) => setStartingCash(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TrendingDown className="w-4 h-4 inline mr-1" />
              Monthly Revenue
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                value={monthlyRevenue || ''}
                onChange={(e) => setMonthlyRevenue(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flame className="w-4 h-4 inline mr-1" />
              Monthly Expenses
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                value={monthlyExpenses || ''}
                onChange={(e) => setMonthlyExpenses(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Projection Months
            </label>
            <input
              type="number"
              value={projectionMonths || ''}
              onChange={(e) => setProjectionMonths(parseInt(e.target.value) || 12)}
              min={1}
              max={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Net Monthly Burn</p>
            <p className="text-xl font-bold text-gray-900">
              {isProfitable ? `+${formatCurrency(Math.abs(netBurn))}` : formatCurrency(netBurn)}
            </p>
            <p className="text-xs text-gray-500">
              {isProfitable ? '(Profitable!)' : `${formatCurrency(monthlyRevenue)} - ${formatCurrency(monthlyExpenses)}`}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Current Runway</p>
            <p className="text-xl font-bold text-gray-900">
              {isProfitable ? '∞' : `${currentRunway.toFixed(1)} months`}
            </p>
            <p className="text-xs text-gray-500">
              {isProfitable ? 'No cash out date' : `Until ${cashOutDate}`}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Burn Multiple</p>
            <p className="text-xl font-bold text-gray-900">
              {isProfitable ? 'N/A' : `${(monthlyExpenses / monthlyRevenue).toFixed(2)}x`}
            </p>
            <p className="text-xs text-gray-500">
              Expenses / Revenue
            </p>
          </div>
          <div className={`${currentRunway > 12 || isProfitable ? 'bg-green-50' : currentRunway > 6 ? 'bg-yellow-50' : 'bg-red-50'} p-4 rounded-lg`}>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-xl font-bold text-gray-900 flex items-center gap-1">
              {isProfitable ? (
                <>Healthy <Clock className="w-5 h-5 text-green-600" /></>
              ) : currentRunway > 12 ? (
                <>Healthy <Clock className="w-5 h-5 text-green-600" /></>
              ) : currentRunway > 6 ? (
                <>Warning <AlertTriangle className="w-5 h-5 text-yellow-600" /></>
              ) : (
                <>Critical <AlertTriangle className="w-5 h-5 text-red-600" /></>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {isProfitable ? 'Generating profit' : currentRunway > 12 ? '12+ months runway' : currentRunway > 6 ? '6-12 months runway' : 'Less than 6 months'}
            </p>
          </div>
        </div>

        {/* Projection Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Month</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Starting Cash</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Revenue</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Expenses</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Net Burn</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Ending Cash</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Runway</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((data) => (
                <tr 
                  key={data.month} 
                  className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                    data.status === 'critical' ? 'bg-red-50' : 
                    data.status === 'warning' ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-gray-900">{data.month === 0 ? 'Now' : data.date}</td>
                  <td className="text-right py-2 px-3 text-gray-700">{formatCurrency(data.startingCash)}</td>
                  <td className="text-right py-2 px-3 text-green-600">+{formatCurrency(monthlyRevenue)}</td>
                  <td className="text-right py-2 px-3 text-red-500">-{formatCurrency(monthlyExpenses)}</td>
                  <td className="text-right py-2 px-3 font-medium text-gray-900">
                    {data.month === 0 ? '-' : formatCurrency(data.monthlyBurn)}
                  </td>
                  <td className={`text-right py-2 px-3 font-medium ${data.endingCash < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(data.endingCash)}
                  </td>
                  <td className="text-right py-2 px-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      data.status === 'healthy' ? 'bg-green-100 text-green-800' :
                      data.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {data.runwayMonths === Infinity ? '∞' : `${data.runwayMonths.toFixed(1)} mo`}
                    </span>
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
