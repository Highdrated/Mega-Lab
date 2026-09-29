import { esc } from "../../core/dom.js";
import { C } from "../../core/theme.js";

export function wrapSvg(inner, h) { return '<svg viewBox="0 0 480 ' + h + '" width="100%" style="max-width:480px">' + inner + "</svg>"; }
export function txt(x, y, s, color, size, anchor) { return '<text x="' + x + '" y="' + y + '" fill="' + (color || C.muted) + '" font-size="' + (size || 12) + '" text-anchor="' + (anchor || "middle") + '">' + esc(s) + "</text>"; }
