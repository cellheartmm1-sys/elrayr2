export function formatCurrency(val: string | number) {
  let symbol = 'ج.م';
  if (typeof window !== 'undefined') {
    symbol = localStorage.getItem('system_currency_symbol') || 'ج.م';
  }
  const num = Number(val || 0);
  if (isNaN(num)) return `0 ${symbol}`;

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${formatted} ${symbol}`;
}
