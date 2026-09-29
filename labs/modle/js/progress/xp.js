export const XP_PER_SOLVE = 10;

export const levelOf = (xp) => Math.floor(xp / 100) + 1;

export const ranks = [
  [1, "Novice"], [3, "Loop Runner"], [5, "Bit Wizard"], [8, "Range Rider"],
  [12, "Modulo Master"], [16, "Grid Sage"], [22, "Array Architect"], [30, "Compiler Whisperer"]
];

export function rankOf(lvl) {
  let r = ranks[0][1];
  ranks.forEach(x => { if (lvl >= x[0]) r = x[1]; });
  return r;
}

export const comboMult = (streak) => streak >= 10 ? 3 : streak >= 5 ? 2 : 1;

export const gainFor = (streak) => XP_PER_SOLVE * comboMult(streak);
