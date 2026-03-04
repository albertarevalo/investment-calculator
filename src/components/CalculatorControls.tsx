import type { PlanSettings } from '../types';
import { useExchangeRates, CURRENCIES, getCurrencySymbol } from '../hooks/useExchangeRates';
import { Settings2, DollarSign, Clock, Percent, Shield, Globe, Download, Upload, ArrowLeftRight } from 'lucide-react';

interface CalculatorControlsProps {
  settings: PlanSettings;
  onUpdateSettings: (settings: PlanSettings) => void;
  availableFunds: number;
  onUpdateAvailableFunds: (value: number) => void;
  onExportPlan?: () => void;
  onImportPlan?: () => void;
}

export function CalculatorControls({
  settings,
  onUpdateSettings,
  availableFunds,
  onUpdateAvailableFunds,
  onExportPlan,
  onImportPlan,
}: CalculatorControlsProps) {
  const { rates, loading, error, convert } = useExchangeRates(settings.primaryCurrency);

  const primarySymbol = getCurrencySymbol(settings.primaryCurrency);
  const secondarySymbol = getCurrencySymbol(settings.secondaryCurrency);
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Calculator Settings</h2>
        </div>
        <div className="flex gap-2">
          {onExportPlan && (
            <button
              onClick={onExportPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              title="Export plan"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          {onImportPlan && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
              <input type="file" accept=".json" className="hidden" onChange={(e) => {
                if (e.target.files?.[0] && onImportPlan) {
                  onImportPlan();
                }
              }} />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Currency Settings */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Currency Settings</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Primary Currency</label>
                <select
                  value={settings.primaryCurrency}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      primaryCurrency: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  onUpdateSettings({
                    ...settings,
                    primaryCurrency: settings.secondaryCurrency,
                    secondaryCurrency: settings.primaryCurrency,
                  });
                }}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Swap currencies"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Secondary Currency</label>
                <select
                  value={settings.secondaryCurrency}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      secondaryCurrency: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showSecondaryCurrency}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    showSecondaryCurrency: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Show amounts in both currencies</span>
            </label>

            {settings.showSecondaryCurrency && rates && (
              <p className="text-xs text-green-600">
                Exchange rate: 1 {settings.primaryCurrency} = {convert(1, settings.primaryCurrency, settings.secondaryCurrency).toFixed(4)} {settings.secondaryCurrency}
                {loading && <span className="ml-1">(updating...)</span>}
              </p>
            )}
            {error && <p className="text-xs text-red-500">Failed to load exchange rates. Using cached data.</p>}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4" />
            Available Funds
            {settings.showSecondaryCurrency && rates && availableFunds > 0 && (
              <span className="text-xs font-normal text-gray-500">
                ({secondarySymbol}{convert(availableFunds, settings.primaryCurrency, settings.secondaryCurrency).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {primarySymbol}
            </span>
            <input
              type="text"
              value={availableFunds ? availableFunds.toLocaleString('en-US') : ''}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^0-9.]/g, '');
                const numValue = parseFloat(rawValue) || 0;
                onUpdateAvailableFunds(numValue);
              }}
              placeholder="Enter your investment amount"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Target Runway</h3>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="60"
              value={settings.targetRunwayMonths}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  targetRunwayMonths: parseInt(e.target.value),
                })
              }
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-900 min-w-[4rem]">
              {settings.targetRunwayMonths} mo
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-700">Safety Buffer</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Percent className="w-3 h-3" />
                Extra Percentage ({settings.bufferPercentage}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.bufferPercentage}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    bufferPercentage: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Clock className="w-3 h-3" />
                Extra Months ({settings.bufferMonths})
              </label>
              <input
                type="range"
                min="0"
                max="24"
                value={settings.bufferMonths}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    bufferMonths: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
