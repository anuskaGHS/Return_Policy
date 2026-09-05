/**
 * Indian Rupee and numeric formatters using en-IN locale conventions.
 */

export const formatINR = (amount, decimals = 0) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(amount);
};

export const formatCompactINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  const abs = Math.abs(amount);
  if (abs >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return formatINR(amount, 0);
};

export const formatPct = (val, decimals = 1) => {
  if (val === undefined || val === null || isNaN(val)) return "0%";
  return `${Number(val).toFixed(decimals)}%`;
};
