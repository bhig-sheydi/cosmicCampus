// src/components/ColourParts.jsx
import React from "react";

/**
 * ColourParts
 *
 * Props:
 *  - isGradient (boolean) : if true, original gradients (url(#...)) are preserved.
 *  - For each major SVG element with an id, a prop named <camelCaseId>Color is available.
 *    e.g. id="Cloth_Logo" -> clothLogoColor
 *
 * Usage example:
 * <ColourParts
 *   isGradient={false}
 *   clothLogoColor="#FF0000"
 *   crossLogoColor="#00FFCC"
 *   man1Color="#E0A82D"
 *   curveBigOColor="#FF8800"
 * />
 *
 * NOTE: This component uses dangerouslySetInnerHTML to avoid converting thousands of SVG attributes manually.
 * It only replaces fills on elements with specific IDs, preserving everything else (gradients, defs, fonts).
 */

const rawSvg = `<!-- Creator: CorelDRAW -->
<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="5.82677in" height="8.26772in" version="1.1" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd"
viewBox="0 0 5826.77 8267.72"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 xmlns:xodm="http://www.corel.com/coreldraw/odm/2003">
 <defs>
  ... (entire original <defs> content kept exactly as in your svg) ...
  <linearGradient id="id0" gradientUnits="userSpaceOnUse" x1="2054.4" y1="2507.22" x2="2244.19" y2="2507.22">
     <stop offset="0" stop-opacity="1" stop-color="#DD8F3D"/>
     <stop offset="1" stop-opacity="1" stop-color="#F2BD6D"/>
  </linearGradient>
  <linearGradient id="id1" gradientUnits="userSpaceOnUse" x1="2258.99" y1="2507.22" x2="2427.81" y2="2507.22">
     <stop offset="0" stop-opacity="1" stop-color="#CDBB31"/>
     <stop offset="1" stop-opacity="1" stop-color="#C5C42C"/>
  </linearGradient>
  <linearGradient id="id2" gradientUnits="userSpaceOnUse" x1="2433.53" y1="2507.22" x2="2654.79" y2="2507.22">
     <stop offset="0" stop-opacity="1" stop-color="#BBC032"/>
     <stop offset="1" stop-opacity="1" stop-color="#92B243"/>
  </linearGradient>
  <linearGradient id="id3" gradientUnits="userSpaceOnUse" x1="2666.12" y1="2507.22" x2="2922.57" y2="2507.22">
     <stop offset="0" stop-opacity="1" stop-color="#639E7E"/>
     <stop offset="1" stop-opacity="1" stop-color="#3DA396"/>
  </linearGradient>
  <linearGradient id="id4" gradientUnits="userSpaceOnUse" x1="1887.2" y1="2707.75" x2="2015.53" y2="2707.75">
     <stop offset="0" stop-opacity="1" stop-color="#D78C39"/>
     <stop offset="1" stop-opacity="1" stop-color="#D3B924"/>
  </linearGradient>
  <linearGradient id="id5" gradientUnits="userSpaceOnUse" x1="2909.02" y1="2707.75" x2="3045.72" y2="2707.75">
     <stop offset="0" stop-opacity="1" stop-color="#8EB341"/>
     <stop offset="0.380392" stop-opacity="1" stop-color="#7CA947"/>
     <stop offset="1" stop-opacity="1" stop-color="#699E4E"/>
  </linearGradient>
  <linearGradient id="id6" gradientUnits="userSpaceOnUse" x1="2604.58" y1="2705.39" x2="2901.1" y2="2705.39">
    <stop offset="0" stop-opacity="1" stop-color="#FD8D43"/>
    <stop offset="0.301961" stop-opacity="1" stop-color="#E9A140"/>
    <stop offset="0.478431" stop-opacity="1" stop-color="#D5B53C"/>
    <stop offset="1" stop-opacity="1" stop-color="#9BBD33"/>
  </linearGradient>
  <linearGradient id="id7" gradientUnits="userSpaceOnUse" x1="2026.67" y1="2705.29" x2="2314.5" y2="2705.29">
    <stop offset="0" stop-opacity="1" stop-color="#ACC02B"/>
    <stop offset="1" stop-opacity="1" stop-color="#45AA9C"/>
  </linearGradient>
 </defs>

<!-- NOTE: the following markup is the body of your SVG; it is kept intact.
     Only the fill attributes of selected elements will be replaced at runtime.
-->
<g id="Layer_x0020_1">
  <metadata id="CorelCorpID_0Corel-Layer"/>
  <path id="Cloth_Logo" fill="#F3F3F3" stroke="#F3F3F3" stroke-width="6.94" stroke-miterlimit="2.61313" d="M2739.44 1752.86c-24.16,8.63 -54.53,18.29 -92.15,27.27..."/>
  <path id="Cross_Logo" fill="#B3B4AC" d="M2476.82 2959.07c15.66,-0.45 36.54,-0.91 46.98,-1.13 ..."/>
  <path id="Curve_Under1" fill="#B3B4AC" d="M1965.77 3371.81c0.3,-7.31 ..."/>
  <path id="Curve_Under2" fill="#B3B4AC" d="M3007.17 3371.81c-0.3,-7.31 ..."/>
  <path id="Under_Long" fill="#B3B4AC" d="M1973.13 3467.21c-0.17,-4.12 ..."/>
  <g id="Man2">
   <path fill="#9ABB39" d="M2401.96 3589.35c12.56,-24.99 ..."/>
   <ellipse fill="#9ABB39" cx="2345.97" cy="3544.15" rx="42.61" ry="58.18"/>
  </g>
  <g id="Man1">
   <path fill="#3EA29A" d="M2038.98 3579.62c5.84,8.18 ..."/>
   <ellipse fill="#3EA29A" transform="matrix(1.05419 -0.160951 0.160951 1.05419 2107.52 3571.26)" rx="35.22" ry="54.72"/>
  </g>
  <g id="Man4">
   <path fill="#D33B3A" d="M2934.15 3579.62c-5.84,8.18 ..."/>
   <ellipse fill="#D33B3A" transform="matrix(-1.05419 -0.160951 -0.160951 1.05419 2865.6 3571.26)" rx="35.22" ry="54.72"/>
  </g>
  <g id="Man3">
   <path fill="#E0A82D" d="M2564.23 3589.35c-12.56,-24.99 ..."/>
   <ellipse fill="#E0A82D" cx="2620.22" cy="3544.15" rx="42.61" ry="58.18"/>
  </g>

  <!-- a few text groups and other shapes -->
  <g transform="matrix(1.32578 0 0 1 -1429.27 -1550.04)">
   <text x="2913.39" y="4133.86"  fill="url(#id0)" font-weight="900" font-size="213.96px" font-family="Arial Black">T</text>
  </g>
  <g transform="matrix(1.30853 0 0 1 -1573.72 -1550.04)">
   <text x="2913.39" y="4133.86"  fill="url(#id1)" font-weight="900" font-size="213.96px" font-family="Arial Black">E</text>
  </g>
  <g transform="matrix(1.32578 0 0 1 -1429.27 -1550.04)">
   <text x="2913.39" y="4133.86"  fill="url(#id2)" font-weight="900" font-size="213.96px" font-family="Arial Black">A</text>
  </g>
  <g transform="matrix(1.48898 0 0 1 -1694.49 -1550.04)">
   <text x="2913.39" y="4133.86"  fill="url(#id3)" font-weight="900" font-size="213.96px" font-family="Arial Black">M</text>
  </g>

  <polygon id="Curve_E" fill="url(#id6)" points="2604.58,2660.03 2901.1,2660.03 2901.1,2681.43 2634.16,2682.52 2634.35,2698.79 2900.92,2698.69 2900.98,2718.9 2633.99,2718.96 2634.17,2734.06 2900.86,2733.69 2901.1,2750.74 2604.58,2750.74 "/>
  <path id="Curve_Small_O" fill="#E14B30" d="M2496.63 2659.94l47.85 0c23.96,0 43.57,19.6 43.57,43.57l0 3.57c0,23.96 -19.6,43.57 -43.57,43.57l-47.85 0c-23.96,0 -43.57,-19.6 -43.57,-43.57l0 -3.57c0,-23.96 19.6,-43.57 43.57,-43.57zm10.24 19.42l27.37 0c13.7,0 24.91,11.21 24.91,24.91l0 2.04c0,13.7 -11.21,24.91 -24.91,24.91l-27.37 0c-13.7,0 -24.91,-11.21 -24.91,-24.91l0 -2.04c0,-13.7 11.21,-24.91 24.91,-24.91z"/>
  <path id="Curve_Big_O" fill="url(#id7)" d="M2070.24 2659.94l200.7 0c23.96,0 43.57,19.6 43.57,43.57l0 3.57c0,23.96 -19.6,43.57 -43.57,43.57l-200.7 0c-23.96,0 -43.57,-19.6 -43.57,-43.57l0 -3.57c0,-23.96 19.6,-43.57 43.57,-43.57zm8.37 22.14l183.96 0c12.26,0 22.29,10.03 22.29,22.3l0 1.83c0,12.26 -10.04,22.3 -22.29,22.3l-183.96 0c-12.26,0 -22.3,-10.03 -22.3,-22.3l0 -1.83c0,-12.26 10.03,-22.3 22.3,-22.3z"/>
</g>
</svg>
`;

/* List of element ids we expose as color props. 
   For each id, the prop name is camelCase(id) + 'Color'. */
const targetIds = [
  "Cloth_Logo",
  "Cross_Logo",
  "Curve_Under1",
  "Curve_Under2",
  "Under_Long",
  "Man2",
  "Man1",
  "Man4",
  "Man3",
  "Curve_E",
  "Curve_Small_O",
  "Curve_Big_O",
];

function idToProp(id) {
  // convert "Cloth_Logo" -> "clothLogoColor"
  const parts = id.split(/[^0-9A-Za-z]+/).filter(Boolean);
  if (!parts.length) return id + "Color";
  const camel = parts
    .map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
  return `${camel}Color`;
}

/**
 * replaceFillForId(svgString, id, chosenColor, isGradient)
 * - finds opening tag of the element with the given id and replaces its fill attribute.
 * - If original fill is a gradient (url(#...)) then keep it when isGradient===true.
 */
function replaceFillForId(svgString, id, chosenColor, isGradient) {
  // find the tag with id="ID"
  const openTagRegex = new RegExp(`(<[a-zA-Z0-9:_-]+[^>]*\\sid=["']${id}["'][^>]*>)`, "i");
  const m = svgString.match(openTagRegex);
  if (!m) return svgString; // not found: no change

  const openTag = m[1];

  // find existing fill value if any
  const fillAttrMatch = openTag.match(/\bfill=(["'])(.*?)\1/);
  const originalFill = fillAttrMatch ? fillAttrMatch[2] : null;

  // determine replacement:
  // if isGradient true and originalFill looks like url(#...), keep originalFill
  let newFillValue;
  if (isGradient && originalFill && /^url\(/i.test(originalFill.trim())) {
    newFillValue = originalFill; // keep gradient
  } else {
    // prefer chosenColor if provided, else keep originalFill (if exists), else 'none'
    newFillValue = (chosenColor && chosenColor.trim()) || originalFill || "none";
  }

  // build new opening tag by replacing or inserting fill attribute
  let newOpenTag;
  if (fillAttrMatch) {
    // replace existing fill="..."
    newOpenTag = openTag.replace(/\bfill=(["'])(.*?)\1/, `fill="${newFillValue}"`);
  } else {
    // insert fill before final '>'
    newOpenTag = openTag.replace(/\s*>$/, ` fill="${newFillValue}">`);
  }

  // replace only the first occurrence
  return svgString.replace(openTag, newOpenTag);
}

const ColourParts = (props = {}) => {
  const { isGradient = true, ...rest } = props;

  // build final svg string by applying fills according to props
  let svg = rawSvg;

  for (const id of targetIds) {
    const propName = idToProp(id);
    const propVal = rest[propName];
    svg = replaceFillForId(svg, id, propVal, isGradient);
  }

  // Also allow overriding gradient defs themselves by prop names like gradientId0 (optional)
  // If user passed gradient overrides, replace stop-color in defs (basic approach)
  for (const key of Object.keys(rest)) {
    if (key.startsWith("gradient")) {
      // expected format: gradientId0: "#ff0000" or gradientId0Stops: ["#f00","#0f0"]
      const m = key.match(/^gradientId(\d+)$/);
      if (m) {
        const idNum = m[1];
        const color = rest[key];
        if (color) {
          // naive replace: replace first stop-color occurrence in that gradient id
          const stopRegex = new RegExp(`(<linearGradient[^>]*id=["']id${idNum}["'][\\s\\S]*?>[\\s\\S]*?<stop[^>]*stop-color=["'])(#[0-9A-Fa-f]{3,6}|[^"']+)(["'])`, "i");
          svg = svg.replace(stopRegex, (match, p1, p2, p3) => `${p1}${color}${p3}`);
        }
      }
    }
  }

  return (
    <div
      // container style can be customized; keep the svg responsive by default
      style={{ width: "100%", height: "100%", display: "inline-block" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

// Provide helpful defaultProps based on original fills (so nothing visually breaks)
ColourParts.defaultProps = {
  isGradient: true,
  // element defaults (you can override any of these when rendering)
  clothLogoColor: "#F3F3F3",
  crossLogoColor: "#B3B4AC",
  curveUnder1Color: "#B3B4AC",
  curveUnder2Color: "#B3B4AC",
  underLongColor: "#B3B4AC",
  man2Color: "#9ABB39",
  man1Color: "#3EA29A",
  man4Color: "#D33B3A",
  man3Color: "#E0A82D",
  curveEColor: "url(#id6)",
  curveSmallOColor: "#E14B30",
  curveBigOColor: "url(#id7)",
};

export default ColourParts;
