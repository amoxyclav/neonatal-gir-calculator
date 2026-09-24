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
    if(await page.locator('#home .home-hero-premium').count()!==1) throw new Error('Premium homepage hero is missing.');
    if((await page.locator('#home .hero-copy h1').innerText()).replace(/\s+/g,' ').trim()!=='Neonatal GIR & Nutrition Calculator') throw new Error('Homepage hero title is incorrect.');
    if(await page.locator('#home .home-tool').count()!==3) throw new Error('Homepage should show all three primary tools.');
    if(await page.locator('#home .home-value-strip .home-value-item').count()!==4) throw new Error('Homepage benefits strip should contain four focus areas.');
    if(await page.locator('#home .home-guides-section').count()!==1) throw new Error('Styled calculation guides section is missing.');
    if(await page.locator('#home .home-guides-section .home-guide-links > a').count()!==3) throw new Error('Homepage should show all three calculation guide links.');
    const guideLayout=await page.locator('#home .home-guide-links').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,links:[...el.querySelectorAll(':scope > a')].map(a=>({top:a.getBoundingClientRect().top,bottom:a.getBoundingClientRect().bottom}))}));
    if(guideLayout.columns!==1) throw new Error('Calculation guide cards should be arranged in one ordered column.');
    for(let i=1;i<guideLayout.links.length;i++) if(guideLayout.links[i].top<guideLayout.links[i-1].bottom) throw new Error('Calculation guide cards overlap or are out of order.');
    if(await page.locator('#copyToolLink').count()!==0) throw new Error('Copy link button should be removed from the homepage.');
    if(await page.locator('#home #shareTool').count()!==1) throw new Error('Share calculator button should remain available.');
    if(await page.locator('#home .home-community-premium .home-feature').count()!==1) throw new Error('Premium feature suggestion card is missing.');
    if(await page.locator('#home .home-share-actions').count()!==1) throw new Error('Styled share actions are missing.');
    if(await page.locator('#home .home-safety-note').count()!==1) throw new Error('Styled clinical safety note is missing.');
    await page.setViewportSize({width:390,height:844});
    const mobileHero=await page.locator('#home .home-hero-premium').evaluate(el=>({height:el.getBoundingClientRect().height,artDisplay:getComputedStyle(el.querySelector('.home-hero-art')).display}));
    if(mobileHero.height>300) throw new Error('Mobile homepage hero is too tall after hiding artwork: '+mobileHero.height+'px.');
    if(mobileHero.artDisplay!=='none') throw new Error('Mobile hero artwork should be hidden; got display '+mobileHero.artDisplay+'.');
    await page.setViewportSize({width:1280,height:720});
    if(await page.locator('#home .home-support').count()!==0) throw new Error('Support section should remain hidden.');
    if(await page.locator('#home .home-support').count()!==0) throw new Error('Support the developer section should be hidden from the homepage.');
    const savedSupport=await page.locator('#saved-home-support-section').evaluate(el=>el.innerHTML);
    if(!savedSupport.includes('Support the developer')) throw new Error('Saved support section should remain available for future restoration.');
    if(!homeText.includes('Calculate fluids, GIR and Energy-Protein Ratio for neonates with ease.')) throw new Error('Updated homepage description is missing.');
    if(homeText.includes('Calculate fluids, GIR, nutrition and electrolytes for neonates with ease.')) throw new Error('Old homepage description is still present.');
    if(homeText.includes('Smaller patients.')) throw new Error('Removed hero slogan is still present.');
    if(homeText.includes('A PRACTICAL TOOL FOR NEONATAL CARE')) throw new Error('Removed homepage eyebrow is still present.');
    if(homeText.includes('Simple. Flexible. NICU-focused.')) throw new Error('Removed homepage tagline is still present.');
    if(await page.locator('#home h1').count() !== 1) throw new Error('Premium Home page title should appear exactly once.');

    await page.locator('[data-page="gir"]').first().click();
    if(await page.locator('#gir>.section').count()!==3) throw new Error('GIR premium section layout is incomplete.');
    if(await page.locator('#gir .stat').count()<8) throw new Error('GIR premium summary cards are missing.');
    const girSectionStyle=await page.locator('#gir>.section').first().evaluate(el=>{const x=getComputedStyle(el);return{radius:x.borderTopLeftRadius,border:x.borderTopColor};});
    if(girSectionStyle.radius!=='22px'||girSectionStyle.border!=='rgb(220, 230, 246)') throw new Error('GIR page premium section styling is missing.');
    if(await page.locator('#gir .section').first().locator('h1').count() !== 0) throw new Error('Removed GIR page title is still present.');
    if((await page.locator('#gir').textContent()).includes('GIR CALCULATOR')) throw new Error('Removed GIR page eyebrow is still present.');
    if((await page.locator('#gir').textContent()).includes('Neonatal GIR & Fluid Planner')) throw new Error('Removed GIR page title text is still present.');
    const currentFluidsHelp=page.locator('#currentSection .help');
    if((await currentFluidsHelp.textContent()).trim() !== 'Enter the fluids already being administered or planned for.') throw new Error('Current fluids helper text is incorrect.');
    if(await page.locator('#gir .section').first().locator('p.mut').count()) throw new Error('Legacy GIR intro text is still present.');

    for (const [selector,placeholder] of [['#w','Weight'],['#tfi','TFI'],['#tg','Target GIR']]) {
      if(await page.locator(selector).getAttribute('placeholder')!==placeholder) throw new Error(selector+' should display the '+placeholder+' placeholder on the GIR page.');
    }
    await page.locator('#w').fill('1.5');
    await page.locator('#tfi').fill('100');
    await page.locator('#tg').fill('6');

    const permitted = await page.locator('#patientPermittedTfi').textContent();
    if(permitted !== '150.0') throw new Error('Permitted TFI did not calculate to 150.0 mL/day; got '+permitted);

    const status = await page.locator('#patientStatus').textContent();
    if(!status.includes('Patient inputs ready')) throw new Error('Patient status did not update after patient inputs.');

    const displayCard=page.locator('#gir .stat').first();
    const cardStyle=await displayCard.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,border:s.borderTopColor,radius:s.borderTopLeftRadius};});
    if(cardStyle.background !== 'rgba(0, 0, 0, 0)') throw new Error('Premium display cards should use the layered blue surface.');
    if(cardStyle.border !== 'rgb(219, 230, 247)') throw new Error('Premium display cards are missing the refined blue border.');
    if(cardStyle.radius !== '17px') throw new Error('Premium display cards do not have the intended rounded shape.');

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
    if(await page.locator('#nutrition>.section').count()<5) throw new Error('Nutrition premium section layout is incomplete.');
    if(await page.locator('#nutrition .nutrition-extra').count()!==3) throw new Error('Nutrition source cards are missing.');
    const nutritionSectionStyle=await page.locator('#nutrition>.section').first().evaluate(el=>getComputedStyle(el).borderTopLeftRadius);
    if(nutritionSectionStyle!=='22px') throw new Error('Nutrition page premium section styling is missing.');
    await assertOnlyPageVisible('nutrition');
    const nutritionCurrentHelp=page.locator('#nutrition .section').filter({has:page.getByRole('heading',{name:'2. Current IV / Oral Fluids'})}).locator('p.help');
    if((await nutritionCurrentHelp.textContent()).trim()!=='Enter the fluids already being administered or planned for.') throw new Error('Nutrition current-fluid helper text is incorrect.');
    if(await page.locator('#nutrition .section').filter({has:page.getByRole('heading',{name:'2. Current IV / Oral Fluids'})}).locator('p.mut').count()) throw new Error('The old Nutrition current-fluid explanatory paragraph is still present.');
    if(await page.locator('#nutRemainingTfi').textContent() !== '-20.0') throw new Error('Nutrition Remaining TFI card did not preserve the negative balance.');
    if(await page.locator('#nutCurrentCa').textContent() !== '1493.27') throw new Error('Nutrition calcium card did not reflect the shared calcium calculation.');

    const ratioCard=page.locator('#nEPRatio').locator('xpath=..');
    const baseEnergy=Number((await page.locator('#nEnergy').textContent()).replace(/,/g,''));
    const baseProtein=Number((await page.locator('#nProtein').textContent()).replace(/,/g,''));
    const hmfToggle=page.locator('#hmfSource [data-extra-details="hmf"]');
    if(await hmfToggle.getAttribute('aria-expanded')!=='true') await hmfToggle.click();
    await page.locator('#hmf').fill('1');
    await page.locator('#hmfProtein').fill('10000');
    await page.locator('#hmfEnergy').fill('0');
    let ratio=Number(await page.locator('#nEPRatio').textContent());
    if(ratio>=20) throw new Error('Test setup failed to place energy-protein ratio below 20; got '+ratio+'.');
    if(!(await ratioCard.evaluate(el=>el.classList.contains('ratio-low')))) throw new Error('Energy-protein ratio below 20 should use the red theme.');
    if(await ratioCard.evaluate(el=>el.classList.contains('ratio-target'))) throw new Error('Energy-protein ratio below 20 should not use the green theme.');
    await page.locator('#hmfEnergy').fill(String(Math.max(0,25*(baseProtein+10000)-baseEnergy)));
    ratio=Number(await page.locator('#nEPRatio').textContent());
    if(ratio<20||ratio>30) throw new Error('Test setup failed to place energy-protein ratio in the 20–30 range; got '+ratio+'.');
    if(!(await ratioCard.evaluate(el=>el.classList.contains('ratio-target')))) throw new Error('Energy-protein ratio from 20 to 30 should use the green theme.');
    if(await ratioCard.evaluate(el=>el.classList.contains('ratio-low'))) throw new Error('Energy-protein ratio from 20 to 30 should not use the red theme.');
    if(await hmfToggle.getAttribute('aria-expanded')==='true') await hmfToggle.click();
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
    if(await page.locator('#mixer>.section>.section').count()!==2) throw new Error('Mixer premium calculator panels are incomplete.');
    const mixerStyle=await page.locator('#mixer>.section>.section').first().evaluate(el=>({radius:getComputedStyle(el).borderTopLeftRadius,bg:getComputedStyle(el).backgroundImage}));
    if(mixerStyle.radius!=='19px'||!mixerStyle.bg.includes('linear-gradient')) throw new Error('Mixer page premium panel styling is missing.');

    await page.locator('[data-page="about"]').first().click();
    await assertOnlyPageVisible('about');
    if((await page.locator('#about').textContent()).includes('A calculation aid for bedside neonatal fluid, glucose and nutrition planning.')) throw new Error('Removed About page opening description is still present.');
    if(await page.locator('#about .about-hero').count()!==1) throw new Error('Premium About hero is missing.');
    if(await page.locator('#about .about-info-card').count()!==3) throw new Error('About page should contain three styled information cards.');
    if(await page.locator('#about .about-reference-links a').count()!==3) throw new Error('About page calculation reference links are incomplete.');
    if(await page.locator('#about .about-feedback-link').count()!==1) throw new Error('About page feedback action is missing.');
    const aboutGrid=await page.locator('#about .about-info-grid').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,rects:[...el.querySelectorAll('.about-info-card')].map(x=>{const r=x.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}})}));
    if(aboutGrid.columns!==2) throw new Error('About information cards should use a balanced desktop grid.');
    for(let i=0;i<aboutGrid.rects.length;i++)for(let j=i+1;j<aboutGrid.rects.length;j++){const a=aboutGrid.rects[i],b=aboutGrid.rects[j];if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)throw new Error('About information cards overlap.');}
    await page.setViewportSize({width:390,height:844});
    const mobileAboutColumns=await page.locator('#about .about-info-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    if(mobileAboutColumns!==1) throw new Error('About information cards should stack on mobile.');
    await page.setViewportSize({width:1280,height:720});
    const creator=page.locator('#creator');
    if(await creator.count()!==1) throw new Error('About page creator showcase is missing.');
    if(await creator.locator('h2').textContent()!=='Built by a pediatrician. Shaped by everyday clinical needs.') throw new Error('Creator showcase heading is missing or incorrect.');
    if(!(await creator.textContent()).includes('one place')) throw new Error('Creator showcase vision statement is missing.');
    if(await page.locator('#about .section > *').last().getAttribute('id')!=='creator') throw new Error('Creator showcase should be the final section on the About page.');
    if(await creator.locator('.creator-capabilities span').count()!==4) throw new Error('Creator showcase capability tags are incomplete.');

    await page.locator('[data-page="home"]').first().click();
    await assertOnlyPageVisible('home');

    if(errors.length) throw new Error('Browser runtime error: '+errors.join(' | '));
    console.log('Browser smoke test passed: patient inputs, TFI calculation, fluid calculation and navigation are working.');
  } finally {
    if(browser) await browser.close();
    server.kill();
  }
})().catch(err=>{console.error(err);process.exit(1)});
