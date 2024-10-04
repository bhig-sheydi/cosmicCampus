import React from "react";

// Example conversion rates (replace with your actual rates)
const conversionRate = 1500; // 1 USD to NGN

const PriceConverter = ({ priceInDollars, currency }) => {
  const priceInNaira = priceInDollars * conversionRate;

  // Create number formatters for USD and NGN
  const formatCurrency = (value, currencyCode) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div>
      {currency === "USD" || currency === "ALL" ? (
        <span>{formatCurrency(priceInDollars, 'USD')}</span>
      ) : null}
      {currency === "NGN" || currency === "ALL" ? (
        <span className="ml-2">{formatCurrency(priceInNaira, 'NGN')}</span>
      ) : null}
    </div>
  );
};

export default PriceConverter;
