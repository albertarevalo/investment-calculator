import { useState, useEffect } from 'react';

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
}

const CACHE_KEY = 'exchange-rates-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  rates: ExchangeRates;
  timestamp: number;
}

export const useExchangeRates = (baseCurrency: string = 'USD') => {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedData = JSON.parse(cached);
        const isValid = Date.now() - parsed.timestamp < CACHE_DURATION;
        const isSameBase = parsed.rates.base === baseCurrency;
        
        if (isValid && isSameBase) {
          setRates(parsed.rates);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        // Using Frankfurter API - free, no key required
        const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${baseCurrency}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates');
        }

        const data = await response.json();
        const exchangeRates: ExchangeRates = {
          base: data.base,
          rates: data.rates,
          date: data.date,
        };

        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          rates: exchangeRates,
          timestamp: Date.now(),
        }));

        setRates(exchangeRates);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch rates');
        // Fallback to cached data even if expired
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          setRates(JSON.parse(cached).rates);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [baseCurrency]);

  const convert = (amount: number, from: string, to: string): number => {
    if (!rates) return amount;
    if (from === to) return amount;
    
    // Convert to base currency first, then to target
    const toBase = from === rates.base ? 1 : 1 / (rates.rates[from] || 1);
    const fromBase = to === rates.base ? 1 : (rates.rates[to] || 1);
    
    return amount * toBase * fromBase;
  };

  return { rates, loading, error, convert };
};

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
];

export const getCurrencySymbol = (code: string): string => {
  return CURRENCIES.find(c => c.code === code)?.symbol || code;
};
