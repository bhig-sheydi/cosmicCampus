import React, { useState, useEffect } from "react";
import ColourParts from "../assets/COLOURPARTS.svg?react";

// ✅ Full list of IDs from your SVG
const svgIds = [
  "FontID1",
  "FontID0",
  "id0",
  "id1",
  "id2",
  "id3",
  "id4",
  "id5",
  "id6",
  "id7",
  "Layer_x0020_1",
  "CorelCorpID_0Corel-Layer",
  "Cloth_Logo",
  "Cross_Logo",
  "Curve_Under1",
  "Curve_Under2",
  "Under_Long",
  "Man1",
  "Man2",
  "Man3",
  "Man4",
  "Curve_E",
  "Curve_Small_O",
  "Curve_Big_O",
  "Letter_W",
  "Letter_S",
  "Letter_E",
  "Letter_R",
];

// ✅ Define gradient stop counts (based on your SVG)
const gradientStopsCount = {
  id0: 2,
  id1: 2,
  id2: 2,
  id3: 2,
  id4: 2,
  id5: 3,
  id6: 4,
  id7: 2,
};

export default function TeamWhosoeverSVG() {
  // ✅ Initialize color state
  const initialColors = svgIds.reduce((acc, id) => {
    if (id.startsWith("id")) {
      const stopCount = gradientStopsCount[id] || 2;
      acc[id] = Array.from({ length: stopCount }, (_, i) =>
        i === 0 ? "#DD8F3D" : i === stopCount - 1 ? "#F2BD6D" : "#E0A04A"
      );
    } else if (id.startsWith("Letter_")) {
      acc[id] = "#CD5443";
    } else {
      acc[id] = "#FFFFFF";
    }
    return acc;
  }, {});

  const [colors, setColors] = useState(initialColors);

  const handleColorChange = (id, value, stopIndex = null) => {
    setColors((prev) => {
      const updated = { ...prev };
      if (stopIndex !== null) {
        const newStops = [...updated[id]];
        newStops[stopIndex] = value;
        updated[id] = newStops;
      } else {
        updated[id] = value;
      }
      return updated;
    });
  };

  const gradientIds = svgIds.filter((id) => id.startsWith("id"));
  const solidIds = svgIds.filter((id) => !id.startsWith("id"));

  // 🧠 Automatically recolor letters by text content
  useEffect(() => {
    const letterColors = {
      W: colors.Letter_W,
      S: colors.Letter_S,
      E: colors.Letter_E,
      R: colors.Letter_R,
    };

    document.querySelectorAll("text").forEach((el) => {
      const letter = el.textContent.trim();
      if (letterColors[letter]) {
        el.removeAttribute("fill");
        el.style.fill = letterColors[letter];
      }
    });
  }, [colors.Letter_W, colors.Letter_S, colors.Letter_E, colors.Letter_R]);

  return (
    <div style={{ width: 600, margin: "0 auto", textAlign: "center" }}>
      {/* SVG Display */}
      <div style={{ width: "100%", height: "auto" }}>
        <ColourParts
          style={{ width: "100%", height: "100%" }}
          {...svgIds.reduce((acc, id) => {
            if (id.startsWith("id")) {
              colors[id].forEach((stopColor, i) => {
                acc[`${id}Stop${i}`] = stopColor;
              });
            } else {
              acc[id] = colors[id];
            }
            return acc;
          }, {})}
        />
      </div>

      {/* 🌈 Gradient Color Pickers */}
      <h3 style={{ marginTop: 20 }}>🌈 Gradients</h3>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "center",
        }}
      >
        {gradientIds.map((id) => (
          <div key={id}>
            <strong>{id}</strong>
            {colors[id].map((stopColor, index) => (
              <input
                key={index}
                type="color"
                value={stopColor}
                onChange={(e) =>
                  handleColorChange(id, e.target.value, index)
                }
                style={{ margin: "0 4px" }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 🎨 Solid Color Pickers */}
      <h3 style={{ marginTop: 20 }}>🎨 Solid Colors</h3>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "center",
        }}
      >
        {solidIds.map((id) => (
          <label key={id}>
            {id}:
            <input
              type="color"
              value={colors[id]}
              onChange={(e) => handleColorChange(id, e.target.value)}
              style={{ marginLeft: 8 }}
            />
          </label>
        ))}
      </div>

      {/* ✅ Dynamic CSS overrides */}
      <style>
        {Object.entries(colors)
          .map(([id, value]) => {
            if (Array.isArray(value)) {
              // Gradients
              return value
                .map(
                  (stopColor, i) =>
                    `[id^="${id}"] stop:nth-of-type(${i + 1}) { stop-color: ${stopColor} !important; }`
                )
                .join("\n");
            }

            // ✅ Handle Man1–4 groups
            if (/^Man[1-4]$/.test(id)) {
              return `
                [id^="${id}"],
                [id^="${id}"] *,
                [id^="${id}"] path,
                [id^="${id}"] rect,
                [id^="${id}"] circle,
                [id^="${id}"] polygon,
                [id^="${id}"] ellipse {
                  fill: ${value} !important;
                }
              `;
            }

            // ✅ Default for solid shapes
            return `[id^="${id}"] { fill: ${value} !important; }`;
          })
          .join("\n")}
      </style>
    </div>
  );
}
