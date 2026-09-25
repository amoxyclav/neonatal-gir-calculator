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
    if(await page.locator('#home .home-value-strip').count()!==0) throw new Error('Removed homepage benefits strip is still present.');
    if(await page.locator('#home .home-guides-section').count()!==0) throw new Error('Reference library should be removed from the homepage and kept in About.');
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

    for (const guide of ['guides/neonatal-gir-calculator.html','guides/neonatal-fluid-nutrition-calculator.html','guides/neonatal-fluid-mixer.html']) {
      await page.goto('http://127.0.0.1:4173/'+guide,{waitUntil:'networkidle'});
      const guideNav=page.locator('header .nav');
      if(await guideNav.locator('.nav-home').count()!==1) throw new Error(guide+' should use the Home icon navigation.');
      if(await guideNav.getByText('GIR',{exact:true}).count()!==1) throw new Error(guide+' should include GIR navigation.');
      if(await guideNav.getByText('Nutrition',{exact:true}).count()!==1) throw new Error(guide+' should include Nutrition navigation.');
      if(await guideNav.getByText('Mixer',{exact:true}).count()!==1) throw new Error(guide+' should include Mixer navigation.');
      if(await guideNav.getByText('Calculator',{exact:true}).count()!==0) throw new Error(guide+' should not show the old Calculator navigation.');
      if(await guideNav.getByText('About',{exact:true}).count()!==0) throw new Error(guide+' should not show an About navigation item.');
    }
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});


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

    // Regression: NS is saline (0% glucose), not 0.9% dextrose.
    // At 1.5 kg / TFI 100 / target GIR 6, NS + D10 should reach 6.00 on both pages.
    await page.locator('#planA').selectOption('NS');
    const girPlanValue=await page.locator('#achievedGir').textContent();
    const nutritionPlanValue=await page.locator('#nutPlanGir').textContent();
    if(girPlanValue!=='6.00') throw new Error('GIR interactive plan should calculate 6.00 for NS + D10; got '+girPlanValue);
    if(nutritionPlanValue!=='6.00') throw new Error('Nutrition interactive plan GIR should match GIR page at 6.00 for NS + D10; got '+nutritionPlanValue);
    if(await page.locator('#planAV').inputValue()!=='20.4') throw new Error('NS plan volume should be 20.4 mL/day when NS contributes no glucose.');
    if(await page.locator('#planBV').inputValue()!=='129.6') throw new Error('D10 plan volume should be 129.6 mL/day when NS contributes no glucose.');
    await page.locator('#resetPlan').click();

    if(await page.locator('#patientStatus').count()!==0) throw new Error('Patient helper status text should be removed from the GIR page.');

    const displayCard=page.locator('#gir .stat').first();
    const cardStyle=await displayCard.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,border:s.borderTopColor,radius:s.borderTopLeftRadius};});
    if(cardStyle.background !== 'rgba(0, 0, 0, 0)') throw new Error('Premium display cards should use the layered blue surface.');
    if(cardStyle.border !== 'rgb(219, 230, 247)') throw new Error('Premium display cards are missing the refined blue border.');
    if(cardStyle.radius !== '17px') throw new Error('Premium display cards do not have the intended rounded shape.');

    async function chooseFluid(name,volume='0.001'){
      await page.locator('[data-fluid-picker="addFluid"]').click();
      const picker=page.locator('#fluidPickerDialog');
      if(!(await picker.isVisible())) throw new Error('Predefined-fluid picker did not open while selecting '+name+'.');
      const input=picker.locator('.fluid-picker-volume[data-fluid-name="'+name+'"]');
      if(await input.count()!==1) throw new Error('Predefined-fluid volume input missing: '+name);
      await input.fill(String(volume));
      await picker.locator('#applyPredefinedFluids').click();
    }

    const girPickerTrigger=page.locator('[data-fluid-picker="addFluid"]');
    if(await girPickerTrigger.count()!==1) throw new Error('GIR predefined-fluid picker trigger is missing.');
    if(await girPickerTrigger.isVisible()!==true) throw new Error('GIR predefined-fluid picker trigger should be visible.');
    await girPickerTrigger.click();
    if(await page.locator('#fluidPickerDialog').isVisible()!==true) { const pickerState=await page.locator('#fluidPickerDialog').evaluate(el=>({hidden:el.hidden,attr:el.getAttribute('hidden'),display:getComputedStyle(el).display,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})); throw new Error('Predefined-fluid picker dialog did not open: '+JSON.stringify(pickerState)+' runtime='+errors.join(' | ')); }
    if(await page.locator('#fluidPickerDialog .fluid-picker-group').count()<2) throw new Error('Predefined-fluid picker groups are missing.');
    if(await page.locator('#fluidPickerDialog .fluid-picker-option').count()<13) throw new Error('Predefined-fluid picker options are incomplete.');
    const pickerD5=page.locator('#fluidPickerDialog .fluid-picker-volume[data-fluid-name="D5"]');
    if(await pickerD5.getAttribute('placeholder')!=='Volume (mL/day)') throw new Error('Predefined-fluid volume box is missing its ghost placeholder.');
    await pickerD5.fill('4');
    await page.locator('#fluidPickerDialog .fluid-picker-volume[data-fluid-name="D10"]').fill('6');
    await page.locator('#fluidPickerDialog #applyPredefinedFluids').click();
    if(await page.locator('#fluidList .fluid').filter({hasText:'D5'}).count()!==1||await page.locator('#fluidList .fluid').filter({hasText:'D10'}).count()!==1) throw new Error('Bulk fluid selection did not add both nonzero fluid volumes.');
    if(await page.locator('#currentTotal').textContent()!=='10.0') throw new Error('Bulk volume entry did not total 10.0 mL/day.');
    await page.locator('#fluidList .fluid .remove').first().click();
    while(await page.locator('#fluidList .fluid').count()) await page.locator('#fluidList .fluid .remove').first().click();
    await girPickerTrigger.click();
    await page.locator('#fluidPickerDialog .fluid-picker-volume[data-fluid-name="D5"]').fill('0');
    await page.locator('#fluidPickerDialog #applyPredefinedFluids').click();
    if(await page.locator('#fluidList .fluid').filter({hasText:'D5'}).count()!==0) throw new Error('A zero-volume fluid should not be added.');
    await chooseFluid('D5');
    if(await page.locator('#fluidList .fluid').filter({hasText:'D5'}).count()!==1) throw new Error('Selecting a positive D5 volume did not add the fluid.');
    await girPickerTrigger.click();
    await page.locator('#fluidPickerDialog .fluid-picker-volume[data-fluid-name="D5"]').fill('0');
    await page.locator('#fluidPickerDialog #applyPredefinedFluids').click();
    if(await page.locator('#fluidList .fluid').filter({hasText:'D5'}).count()!==0) throw new Error('Setting an existing fluid volume to zero should remove its row.');

    await chooseFluid('Formula milk');
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
      await chooseFluid(fluidName);
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
    const compactFluidRow=await d5Fluid.locator('.fluid-main-row').evaluate(el=>getComputedStyle(el).minHeight);
    if(compactFluidRow!=='34px') throw new Error('Current-fluid rows should use compact 34px minimum height; got '+compactFluidRow+'.');
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
    await fluidVolume.fill('10');
    const totalAfterFluid = await page.locator('#currentTotal').textContent();
    if(totalAfterFluid !== '10.0') throw new Error('Entering D5 volume did not update current fluid total; got '+totalAfterFluid);

    await chooseFluid('Calcium gluconate 10%');
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
      // Navigation intentionally includes a short branded transition; wait for it to finish before asserting the active page.
      await page.waitForFunction(expected=>{
        const visible=[...document.querySelectorAll('.page')].filter(el=>el.getClientRects().length>0).map(el=>el.id);
        return visible.length===1 && visible[0]===expected;
      },id,{timeout:3000});
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
      const compactSourceHeight=await card.locator('.nutrition-extra-head').evaluate(el=>getComputedStyle(el).minHeight);
      if(compactSourceHeight!=='34px') throw new Error(source.id+' nutrition source row should use compact 34px minimum height; got '+compactSourceHeight+'.');
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

    const guidePage=await browser.newPage();
    for(const guidePath of ['guides/neonatal-gir-calculator.html','guides/neonatal-fluid-nutrition-calculator.html','guides/neonatal-fluid-mixer.html']){
      await guidePage.goto('http://127.0.0.1:4173/'+guidePath,{waitUntil:'networkidle'});
      if(await guidePage.locator('header .nav a').filter({hasText:/^About$/}).count()!==0) throw new Error('Guide page should not show a duplicate About navigation link: '+guidePath);
    }
    await guidePage.goto('http://127.0.0.1:4173/about.html',{waitUntil:'networkidle'});
    await guidePage.waitForURL('**/#about',{timeout:5000});
    await guidePage.close();

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
    if(await page.locator('#about .about-info-card').count()!==4) throw new Error('Unified About page should contain four styled information cards.');
    if(!(await page.locator('#about .about-scope-card').textContent()).includes('not replace')) throw new Error('Unified About clinical scope and safety details are missing.');
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
