// Brand-only chart color utilities.
// Families allowed: "forest" and "orange".

const FIXED_SHADE_SCALES = {
  // Darkest -> lightest (hand-picked, hue-stable)
  orange: [
    "#B85400",
    "#E76F00",
    "#F2994A",
    "#F7A968",
    "#FABE8A",
    "#FDD3AC",
  ],
  // Darkest -> lightest (hand-picked, hue-stable)
  forest: [
    "#1B4332",
    "#2D6A4F",
    "#40916C",
    "#52B788",
    "#74C69D",
    "#95D5B2",
  ],
};

/**
 * Returns an array of hex shades from darkest -> lightest.
 * IMPORTANT: For hue stability, this is a fixed, hand-picked array.
 * @param {"forest"|"orange"} familyName
 * @param {number} count
 * @returns {string[]}
 */
export function getShadeScale(familyName, count) {
  const safeCount = Math.max(1, Number(count) || 1);

  const shades = FIXED_SHADE_SCALES[familyName];
  if (!shades) {
    throw new Error(`getShadeScale: unsupported family "${familyName}"`);
  }

  // If count <= 6: return the first `count` shades (do not skip the darkest).
  if (safeCount <= shades.length) {
    return shades.slice(0, safeCount);
  }

  // If count > 6: cycle through the fixed shades.
  return Array.from({ length: safeCount }, (_, i) => shades[i % shades.length]);
}


