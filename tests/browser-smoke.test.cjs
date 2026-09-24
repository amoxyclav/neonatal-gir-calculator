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
    if(await page.locator('.hero-art').count() !== 0) throw new Error('Removed hero artwork is still present.');
    const homeText=await page.locator('#home').textContent();
    if(homeText.includes('Smaller patients.')) throw new Error('Removed hero slogan is still present.');
    if(homeText.includes('A PRACTICAL TOOL FOR NEONATAL CARE')) throw new Error('Removed homepage eyebrow is still present.');
    if(homeText.includes('Simple. Flexible. NICU-focused.')) throw new Error('Removed homepage tagline is still present.');
    if(await page.locator('#home h1').count() !== 0) throw new Error('Duplicate Home page calculator title is still present.');

    await page.locator('[data-page="gir"]').first().click();
    if(await page.locator('#gir .section').first().locator('h1').count() !== 0) throw new Error('Removed GIR page title is still present.');
    if((await page.locator('#gir').textContent()).includes('GIR CALCULATOR')) throw new Error('Removed GIR page eyebrow is still present.');
    if((await page.locator('#gir').textContent()).includes('Neonatal GIR & Fluid Planner')) throw new Error('Removed GIR page title text is still present.');
    const currentFluidsHelp=page.locator('#currentSection .help');
    if((await currentFluidsHelp.textContent()).trim() !== 'Enter the fluids already being administered or planned for.') throw new Error('Current fluids helper text is incorrect.');
    if(await page.locator('#gir .section').first().locator('p.mut').count()) throw new Error('Legacy GIR intro text is still present.');

    await page.locator('#w').fill('1.5');
    await page.locator('#tfi').fill('100');
    await page.locator('#tg').fill('6');

    const permitted = await page.locator('#patientPermittedTfi').textContent();
    if(permitted !== '150.0') throw new Error('Permitted TFI did not calculate to 150.0 mL/day; got '+permitted);

    const status = await page.locator('#patientStatus').textContent();
    if(!status.includes('Patient inputs ready')) throw new Error('Patient status did not update after patient inputs.');

    const displayCard=page.locator('#gir .stat').first();
    const cardStyle=await displayCard.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,border:s.borderTopColor,radius:s.borderTopLeftRadius};});
    if(cardStyle.background !== 'rgb(238, 244, 255)') throw new Error('Display cards are not using the blue theme background.');
    if(cardStyle.border !== 'rgb(216, 228, 245)') throw new Error('Display cards are not using the blue theme border.');
    if(cardStyle.radius !== '28px') throw new Error('Display cards do not have the intended rounded shape.');

    await page.locator('#addFluid').selectOption('Formula milk');
    const formulaFluid=page.locator('#fluidList .fluid').filter({hasText:'Formula milk'}).first();
    const formulaEdit=formulaFluid.locator('.details-toggle');
    if(!(await formulaEdit.textContent()).includes('Edit contents')) throw new Error('Fluid edit control text is incorrect.');
    if(await formulaEdit.locator('.details-chevron').count() !== 1) throw new Error('Editable fluid chevron is missing.');
    if(await formulaEdit.locator('.details-chevron').evaluate(el=>el.parentElement?.classList.contains('details-toggle') !== true)) throw new Error('Editable fluid chevron is outside the control.');
    await formulaEdit.evaluate(el=>el.click());
    if(await formulaEdit.getAttribute('aria-expanded') !== 'true') throw new Error('Formula milk edit control did not open.');
    const formulaDetails=formulaFluid.locator('.fluid-details');
    if(await formulaDetails.getAttribute('hidden') !== null) throw new Error('Formula milk edit panel remains hidden.');
    if(!(await formulaDetails.textContent()).includes('Preset note: For this calculator, glucose is used for GIR')) throw new Error('Formula milk preset note is missing.');

    await page.locator('#addFluid').selectOption('D5');
    const d5Fluid=page.locator('#fluidList .fluid').filter({hasText:'D5'}).first();
    const d5Control=d5Fluid.locator('.details-toggle');
    if((await d5Control.textContent()).trim() !== 'Show contents') throw new Error('D5 should use Show contents.');
    if(await d5Control.locator('.details-chevron').count() !== 0) throw new Error('D5 should not show an edit chevron.');
    const fluidVolume = page.locator('#fluidList [data-field="volumeDisplay"]').first();
    await fluidVolume.click();
    await fluidVolume.pressSequentially('10');
    const totalAfterFluid = await page.locator('#currentTotal').textContent();
    if(totalAfterFluid !== '10.0') throw new Error('Entering D5 volume did not update current fluid total; got '+totalAfterFluid);

    async function assertOnlyPageVisible(id){
      const visible=await page.locator('.page:visible').evaluateAll(els=>els.map(el=>el.id));
      if(visible.length!==1 || visible[0]!==id) throw new Error('Expected only '+id+' to be visible; got '+visible.join(', '));
    }

    await page.locator('[data-page="nutrition"]').first().click();
    await assertOnlyPageVisible('nutrition');
    if (await page.locator('#nutrition .ey').count()) throw new Error('Nutrition page starting eyebrow text is still present');
    if (await page.locator('#nutrition h2').filter({hasText:'Nutrition Calculator'}).count()) throw new Error('Nutrition Calculator starting heading is still present');

    await page.locator('[data-page="home"]').first().click();
    await assertOnlyPageVisible('home');

    await page.locator('[data-page="gir"]').first().click();
    await assertOnlyPageVisible('gir');

    await page.locator('[data-page="mixer"]').first().click();
    await assertOnlyPageVisible('mixer');

    await page.locator('[data-page="about"]').first().click();
    await assertOnlyPageVisible('about');

    await page.locator('[data-page="home"]').first().click();
    await assertOnlyPageVisible('home');

    if(errors.length) throw new Error('Browser runtime error: '+errors.join(' | '));
    console.log('Browser smoke test passed: patient inputs, TFI calculation, fluid calculation and navigation are working.');
  } finally {
    if(browser) await browser.close();
    server.kill();
  }
})().catch(err=>{console.error(err);process.exit(1)});
