# Design System Document: Tactical Utility

## 1. Overview & Creative North Star
**The Creative North Star: "The Architectural Blueprint"**

This design system rejects the ephemeral softness of modern SaaS in favor of the permanence of a jobsite. It is built to feel like a foreman’s clipboard: heavy-duty, authoritative, and structured. We are moving away from the "floating" digital trend and toward a "grounded" aesthetic. 

The system breaks the "template" look by using high-contrast structural divisions and intentional white space that mimics the layout of professional technical documents. Every element must feel like it was stamped or printed onto the interface, using a rigid 90-degree geometry that conveys reliability and structural integrity.

## 2. Colors & Surface Logic
The palette is rooted in the physical materials of the trade—weathered paper, cast iron, and deep industrial primer.

*   **Primary (#6a020a):** Our "Roofing Red." This is used exclusively for the most critical actions (Submit, Finalize, Emergency). It is a high-gravity color that demands attention.
*   **Surface (#fbf9f6):** The base paper tone. It provides a warm, non-glare background that reduces eye strain during long hours on a jobsite.
*   **Inverse Surface (#2B2B2B):** The "Tool Panel." Used for the fixed sidebar to create a mental shift between navigation (the tools) and the workspace (the paper).

### The "Strong-Line" Rule
Contrary to standard UI trends, this system **prohibits** the use of elevation or shadows to define hierarchy. Boundaries must be defined strictly through:
1.  **High-Contrast Borders:** Use `outline` (#8b716e) for 1px functional borders.
2.  **Structural Dividers:** Use `outline_variant` (#dfbfbc) at 2px thickness for section breaks.
3.  **Tonal Shifts:** A `surface_container` (#efeeeb) section should be used to denote "nested" data, like a sub-form within a work order.

### Flat Integrity
No gradients. No glassmorphism. No blurs. The UI should look like a high-resolution scan of a physical document. Surfaces are opaque and absolute.

## 3. Typography
The typography is designed to mimic the clarity of a technical manual combined with the character of a bespoke architectural firm.

*   **Display & Headlines (Space Grotesk):** This typeface provides a "technical-modern" feel. Its wide apertures and geometric construction feel engineered rather than "drawn." Use it for project titles and high-level navigation.
*   **Body & Labels (Public Sans):** A neutral, highly legible workhorse. It mimics the clean sans-serifs found on standardized government forms and industrial signage.

**Hierarchy as Authority:** 
- Use `headline-lg` for job site addresses. 
- Use `label-md` in all-caps with 0.05em letter spacing for metadata (e.g., JOB ID, DATE, STATUS) to evoke the feel of a printed invoice header.

## 4. Elevation & Structural Depth
Depth is achieved through **Physical Layering**, not light and shadow.

*   **The Blueprint Principle:** Treat the screen as a flat table. To show hierarchy, we do not lift elements "closer" to the user; instead, we "inset" them or "border" them. 
*   **Shadows:** Shadows are strictly forbidden for cards, buttons, or navigation. The only exception is a 1px "hit" of `on_surface` at 10% opacity to separate the fixed sidebar from the main scrollable area, simulating a physical fold in paper.
*   **The Inset Effect:** To show an active state (like a pressed button or an open input), shift the background from `surface` to `surface_container_high`. This mimics the physical indentation of a stamp or a pen on a pad.

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#6a020a) background, `on_primary` (#ffffff) text. 0px or 2px corner radius. No shadow.
*   **Secondary:** Solid `secondary` (#5f5e5e) background. Rectangular and heavy.
*   **States:** On hover, do not lighten; instead, add a 2px inner border of `on_primary_fixed` to make the button feel "reinforced."

### Input Fields
*   **Structure:** Rectangular boxes with a 1px `outline`. 
*   **Focus State:** The border thickens to 2px `primary`. No "glow" or outer shadow.
*   **Labels:** Use `label-md` placed directly above the input, never floating inside.

### Cards & Work Orders
*   **Style:** Cards must not have shadows. They are defined by a 1px `outline_variant` border. 
*   **Separation:** Instead of divider lines between every small item, use `surface_container` background blocks to group related data (e.g., "Materials List" is a grey block, "Labor" is a white block).

### The "Forman" Specialized Components
*   **The Weather Stripping:** A thin, full-width status bar at the top of sections using `tertiary_container` to show job-site conditions (e.g., "Weather: Clear / 72°F").
*   **The Punch-List:** A checkbox variant where the "Checked" state mimics a heavy red ink 'X' using the `primary` color, suggesting a foreman's manual mark.

## 6. Do's and Don'ts

### Do:
*   **Do** use 90-degree angles whenever possible.
*   **Do** use `12 (2.75rem)` or `16 (3.5rem)` spacing to give content "breathing room" like a professional document.
*   **Do** use bold, high-contrast labels for all data points. Every piece of data should have a clear descriptor.

### Don't:
*   **Don't** use rounded corners above 4px. It breaks the "rugged" metaphors.
*   **Don't** use icons without labels. This is a practical tool, not a lifestyle app.
*   **Don't** use subtle greys for text. If it's worth reading, use `on_surface` (#1b1c1a). If it's secondary, use `secondary` (#5f5e5e). Anything lighter will fail on a sun-drenched jobsite.