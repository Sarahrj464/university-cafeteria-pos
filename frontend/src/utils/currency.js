let activeCurrency = 'PKR';
let activeCurrencyLocale = 'en-PK';

const CONVERSION_RATES = {
  PKR: 1,
  USD: 0.0034,
  EUR: 0.0031,
};

export function setCurrencyCode(code) {
  activeCurrency = typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : 'PKR';
}

export function setCurrencyLocale(locale) {
  activeCurrencyLocale = typeof locale === 'string' && locale.trim() ? locale.trim() : 'en-PK';
}

export function formatCurrency(amount) {
  const value = Number(amount || 0);
  const rate = CONVERSION_RATES[activeCurrency] ?? 1;
  const convertedValue = value * rate;
  const fractionDigits = activeCurrency === 'PKR' ? 0 : 2;

  return new Intl.NumberFormat(activeCurrencyLocale, {
    style: 'currency',
    currency: activeCurrency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(convertedValue);
}
