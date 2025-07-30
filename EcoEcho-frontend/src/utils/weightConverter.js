/**
 * Helper function to convert weight to the appropriate unit.
 * If a single item is reported as having a large weight (e.g., 100kg), 
 * we assume this is in grams and convert it to kg.
 * 
 * @param {number} weight - The weight value to check/convert
 * @param {number} itemCount - Number of items
 * @returns {number} - Correctly scaled weight in kg
 */
export const normalizeWeight = (weight, itemCount) => {
  // If weight seems disproportionately large for the number of items
  // (more than 10kg per item), assume it's in grams and convert
  if (weight > itemCount * 10 && itemCount > 0) {
    console.log(`Converting weight from ${weight}g to ${weight/1000}kg`);
    return parseFloat((weight / 1000).toFixed(1));
  }
  return parseFloat((weight || 0).toFixed(1));
};
