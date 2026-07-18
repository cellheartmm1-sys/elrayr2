export function formatCurrency(val: string | number) {
  let symbol = 'ج.م';
  if (typeof window !== 'undefined') {
    symbol = localStorage.getItem('system_currency_symbol') || 'ج.م';
  }
  return Number(val).toLocaleString('ar-EG') + ' ' + symbol;
}
