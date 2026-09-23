const assert = require('node:assert/strict');

function gir(concentrationPercent, volumeMlPerDay, weightKg) {
  return concentrationPercent * volumeMlPerDay * 10 / (weightKg * 1440);
}

function mixNewBag(target, stockA, stockB, finalVolume) {
  const a = finalVolume * (stockB - target) / (stockB - stockA);
  const b = finalVolume - a;
  return { a, b };
}

function mixExistingBag(existingConcentration, existingVolume, stockConcentration, target) {
  const added = existingVolume * (target - existingConcentration) / (stockConcentration - target);
  const finalVolume = existingVolume + added;
  return { added, finalVolume, finalConcentration: (existingConcentration * existingVolume + stockConcentration * added) / finalVolume };
}

const nearly = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${expected}, got ${actual}`);

// GIR regression cases
nearly(gir(10, 100, 1), 6.944444444444445);
nearly(gir(5, 120, 1.5), 2.7777777777777777);
nearly(gir(25, 48, 0.8), 10.416666666666666);

// New-bag mixer regression
{
  const x = mixNewBag(12.5, 5, 25, 100);
  nearly(x.a, 62.5);
  nearly(x.b, 37.5);
  nearly(x.a + x.b, 100);
}

// Existing-bag mixer regression
{
  const x = mixExistingBag(10, 100, 25, 12.5);
  nearly(x.added, 20);
  nearly(x.finalVolume, 120);
  nearly(x.finalConcentration, 12.5);
}


function autoPlan(targetGir, currentGir, weightKg, remainingTfi) {
  const add = Math.max(targetGir - currentGir, 0);
  if (add <= 0) return {a:"NS", b:"NS", av:0, bv:0};
  if (remainingTfi <= 0) return {a:"NS", b:"NS", av:0, bv:0};
  const req = add * weightKg * 144 / remainingTfi;
  if (req <= 5) return {a:"D5",b:"NS",av:remainingTfi*req/5,bv:remainingTfi*(5-req)/5};
  if (req <= 10) return {a:"D5",b:"D10",av:remainingTfi*(10-req)/5,bv:remainingTfi*(req-5)/5};
  if (req <= 25) return {a:"D5",b:"D25",av:remainingTfi*(25-req)/20,bv:remainingTfi*(req-5)/20};
  if (req <= 50) return {a:"D5",b:"D50",av:remainingTfi*(50-req)/45,bv:remainingTfi*(req-5)/45};
  return {a:"D5",b:"D50",av:0,bv:remainingTfi};
}

function achievedGir(currentGir, weightKg, aConc, aVol, bConc, bVol) {
  return currentGir + ((aConc*aVol) + (bConc*bVol)) * 10 / (weightKg*1440);
}

// Target GIR planning regression cases
{
  const p = autoPlan(6.944444444444445, 0, 1, 100);
  nearly(p.av, 0);
  nearly(p.bv, 100);
  nearly(achievedGir(0,1,5,p.av,10,p.bv), 6.944444444444445);
}

{
  const p = autoPlan(10, 0, 1, 100);
  nearly(p.av, 53);
  nearly(p.bv, 47);
  nearly(achievedGir(0,1,5,p.av,25,p.bv), 10);
}

{
  const p = autoPlan(0, 4, 1, 100);
  assert.deepEqual(p, {a:"NS",b:"NS",av:0,bv:0});
}

{
  const p = autoPlan(8, 2, 1, 0);
  assert.deepEqual(p, {a:"NS",b:"NS",av:0,bv:0});
}

console.log("Calculation regression tests passed.");

