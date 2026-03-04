export const sanitizeMoneyInput = (value: string): string => {
  if (!value) return '';
  const sanitized = value.replace(/[^0-9.]/g, '');
  if (!sanitized) return '';

  const [wholePart, decimalPart] = sanitized.split('.');
  const formattedWhole = Number(wholePart || '0').toLocaleString('en-US');
  if (decimalPart !== undefined) {
    return `${formattedWhole}.${decimalPart.slice(0, 2)}`;
  }
  return formattedWhole;
};

export const parseMoneyInput = (value: string): number => {
  if (!value) return 0;
  const normalized = value.replace(/,/g, '');
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};
