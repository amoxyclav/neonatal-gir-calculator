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
  nearly(x.a, 66.66666666666667);
  nearly(x.b, 33.33333333333333);
  nearly(x.a + x.b, 100);
}

// Existing-bag mixer regression
{
  const x = mixExistingBag(10, 100, 25, 12.5);
  nearly(x.added, 20);
  nearly(x.finalVolume, 120);
  nearly(x.finalConcentration, 12.5);
}

console.log("Calculation regression tests passed.");
