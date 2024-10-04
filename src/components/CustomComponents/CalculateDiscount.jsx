import React from "react";

function calculateDiscount(originalPrice, discountPercentage) {
  if (isNaN(originalPrice) || isNaN(discountPercentage) || originalPrice <= 0 || discountPercentage < 0) {
    return { discountAmount: "Invalid input", discountedPrice: "Invalid input" };
  }

  const discountAmount = (originalPrice * discountPercentage) / 100;
  const discountedPrice = originalPrice - discountAmount;

  return {
    discountAmount: `$${discountAmount.toFixed(2)}`,
    discountedPrice: `$${discountedPrice.toFixed(2)}`,
  };
}

// DiscountText Component
export function DiscountText({ originalPrice, discountPercentage }) {
  const { discountAmount, discountedPrice } = calculateDiscount(originalPrice, discountPercentage);

  return (
    <div>
    
      <p className="text-lg font-semibold">Discounted Price: {discountedPrice}</p>
    </div>
  );
}
