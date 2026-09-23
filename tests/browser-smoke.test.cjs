const { chromium } = require('playwright');
const { spawn } = require('child_process');

(async()=>{
  const server = spawn('python3',['-m','http.server','4173'],{stdio:'ignore'});
  let browser;
  try{
    await new Promise(r=>setTimeout(r,1000));
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});

    await page.locator('#w').fill('1.5');
    await page.locator('#tfi').fill('100');
    await page.locator('#tg').fill('6');

    const permitted = await page.locator('#patientPermittedTfi').textContent();
    if(permitted !== '150.0') throw new Error('Permitted TFI did not calculate to 150.0 mL/day; got '+permitted);

    const status = await page.locator('#patientStatus').textContent();
    if(!status.includes('Patient inputs ready')) throw new Error('Patient status did not update after patient inputs.');

    await page.locator('#addFluid').selectOption('D5');
    const totalAfterFluid = await page.locator('#currentTotal').textContent();
    if(totalAfterFluid === '0.0') throw new Error('Adding D5 did not update current fluid total.');

    await page.locator('[data-page="nutrition"]').click();
    if(!(await page.locator('#nutrition').evaluate(el=>el.classList.contains('active')))) throw new Error('Nutrition navigation failed.');

    await page.locator('[data-page="mixer"]').click();
    if(!(await page.locator('#mixer').evaluate(el=>el.classList.contains('active')))) throw new Error('Mixer navigation failed.');

    await page.locator('[data-page="gir"]').click();
    if(!(await page.locator('#gir').evaluate(el=>el.classList.contains('active')))) throw new Error('GIR navigation failed.');

    if(errors.length) throw new Error('Browser runtime error: '+errors.join(' | '));
    console.log('Browser smoke test passed: patient inputs, TFI calculation, fluid calculation and navigation are working.');
  } finally {
    if(browser) await browser.close();
    server.kill();
  }
})().catch(err=>{console.error(err);process.exit(1)});
