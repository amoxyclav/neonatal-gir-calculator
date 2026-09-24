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

    const layoutFluids=['D5','D10','D25','D50','NS','Isolyte P','Aminoven','Intralipid','Breast milk','Formula milk'];
    for (const fluidName of layoutFluids) {
      await page.locator('#addFluid').selectOption(fluidName);
    }
    const exactFluid=(name)=>page.locator('#fluidList .fluid').filter({has:page.locator('.fluid-name b').filter({hasText:new RegExp('^'+name+'$')})}).first();

    const d5Fluid=exactFluid('D5');
    const d5Control=d5Fluid.locator('.details-toggle');
    if(!(await d5Control.textContent()).includes('Show contents')) throw new Error('D5 should use Show contents.');
    if(await d5Control.locator('.details-chevron').count() !== 1) throw new Error('D5 should show a downward chevron.');
    for (const fluidName of ['D5','D10','D25','D50']) {
      const fluid=exactFluid(fluidName);
      const control=fluid.locator('.details-toggle');
      if(!(await control.textContent()).includes('Show contents')) throw new Error(fluidName+' should use Show contents.');
      if(await control.locator('.details-chevron').count() !== 1) throw new Error(fluidName+' should show a downward arrow.');
    }
    for (const fluidName of layoutFluids) {
      const fluid=exactFluid(fluidName);
      const row=fluid.locator('.fluid-main-row');
      const boxes=await row.locator(':scope > *').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
      for(let i=1;i<boxes.length;i++){
        if(boxes[i].left < boxes[i-1].right - 1) throw new Error(fluidName+' current-fluid controls overlap.');
        if(boxes[i].left < boxes[0].left - 1 || boxes[i].right > (boxes[boxes.length-1].right + 1)) throw new Error(fluidName+' current-fluid row extends unexpectedly.');
      }
    }
    const fluidVolume = page.locator('#fluidList [data-field="volumeDisplay"]').first();
    await fluidVolume.click();
    await fluidVolume.pressSequentially('10');
    const totalAfterFluid = await page.locator('#currentTotal').textContent();
    if(totalAfterFluid !== '10.0') throw new Error('Entering D5 volume did not update current fluid total; got '+totalAfterFluid);

    await page.locator('#addFluid').selectOption('Calcium gluconate 10%');
    const calciumFluid=page.locator('#fluidList .fluid').filter({has:page.locator('.fluid-name b').filter({hasText:/^Calcium gluconate 10%$/})}).first();
    await calciumFluid.locator('.details-toggle').click();
    const calciumSalt=calciumFluid.locator('[data-field="conc"]');
    const elementalCalcium=calciumFluid.locator('[data-field="calcium"]');
    if(await calciumSalt.inputValue() !== '100') throw new Error('10% calcium gluconate salt concentration should default to 100 mg/mL.');
    if(await elementalCalcium.inputValue() !== '0.465') throw new Error('10% calcium gluconate elemental calcium should default to 0.465 mEq/mL.');
    if(!(await calciumFluid.locator('.fluid-details').textContent()).includes('approximately 9.3 mg/mL elemental calcium')) throw new Error('Calcium gluconate composition clarification is missing.');
    const calciumVolume=calciumFluid.locator('[data-field="volumeDisplay"]');
    await calciumVolume.fill('15');
    const caMg15=await calciumFluid.locator('[data-row-ca-mg]').textContent();
    const caKg15=await calciumFluid.locator('[data-row-ca-mgkg]').textContent();
    if(caMg15 !== '139.50' || caKg15 !== '93.00') throw new Error('Calcium elemental-mg calculations are inconsistent with 9.3 mg/mL: '+caMg15+' mg/day, '+caKg15+' mg/kg/day.');
    await calciumVolume.fill('160');
    if(await page.locator('#remaining').textContent() !== '-20.0') throw new Error('Remaining TFI should show -20.0 mL/day when current fluid exceeds permitted TFI.');
    const girCalciumTotal=await page.locator('#currentCa').textContent(); if(girCalciumTotal !== '1493.27') throw new Error('Calcium total card did not update from the calcium gluconate preset; got '+girCalciumTotal+'.');

    async function assertOnlyPageVisible(id){
      const visible=await page.locator('.page:visible').evaluateAll(els=>els.map(el=>el.id));
      if(visible.length!==1 || visible[0]!==id) throw new Error('Expected only '+id+' to be visible; got '+visible.join(', '));
    }

    await page.locator('[data-page="nutrition"]').first().click();
    await assertOnlyPageVisible('nutrition');
    if(await page.locator('#nutRemainingTfi').textContent() !== '-20.0') throw new Error('Nutrition Remaining TFI card did not preserve the negative balance.');
    if(await page.locator('#nutCurrentCa').textContent() !== '1493.27') throw new Error('Nutrition calcium card did not reflect the shared calcium calculation.');
    if (await page.locator('#nutrition .ey').count()) throw new Error('Nutrition page starting eyebrow text is still present');
    if (await page.locator('#nutrition h2').filter({hasText:'Nutrition Calculator'}).count()) throw new Error('Nutrition Calculator starting heading is still present');

    for (const source of [
      {id:'hmf',card:'#hmfSource'},
      {id:'hmfAdvance',card:'#hmfAdvanceSource'},
      {id:'mct',card:'#mctSource'}
    ]) {
      const card=page.locator(source.card);
      const control=card.locator('[data-extra-details="'+source.id+'"]');
      if(!(await control.textContent()).includes('Edit contents')) throw new Error(source.id+' additional nutrition source is missing the Edit contents label.');
      if(await control.locator('.details-chevron').count()!==1) throw new Error(source.id+' additional nutrition source is missing its downward chevron.');
      if(await control.evaluate(el=>getComputedStyle(el).minWidth)!=='118px') throw new Error(source.id+' edit control does not match the current-fluid control sizing.');
      await control.click();
      if(await control.getAttribute('aria-expanded')!=='true') throw new Error(source.id+' additional nutrition source did not expand.');
      if(await card.locator('.nutrition-extra-details').getAttribute('hidden')!==null) throw new Error(source.id+' composition panel remains hidden after opening.');
      await control.click();
      if(await control.getAttribute('aria-expanded')!=='false') throw new Error(source.id+' additional nutrition source did not collapse.');
      if(await card.locator('.nutrition-extra-details').getAttribute('hidden')===null) throw new Error(source.id+' composition panel remains visible after closing.');
    }

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
