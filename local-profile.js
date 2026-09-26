(function () {
  'use strict';
  const PROFILE_KEY = 'neonatalGirLocalProfile.v1';
  const PRESETS_KEY = 'neonatalGirCustomPresets.v1';
  const PREFS_KEY = 'neonatalGirPreferences.v1';
  const $ = (id) => document.getElementById(id);
  const showStatus = (id, message, kind) => {
    const el = $(id); if (!el) return;
    el.hidden = false; el.textContent = message;
    el.className = 'status' + (kind ? ' ' + kind : '');
  };
  const readObject = (key) => {
    try { const value = JSON.parse(localStorage.getItem(key) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    catch (_) { return {}; }
  };
  const readProfile = () => {
    const value = readObject(PROFILE_KEY);
    return { name: typeof value.name === 'string' ? value.name.slice(0, 80) : '' };
  };
  function renderProfile() {
    const name = readProfile().name;
    const input = $('localProfileName');
    if (input && input.value !== name) input.value = name;
    const heading = $('profileHeading');
    if (heading) heading.textContent = name ? 'Hello, ' + name : 'Your profile';
    const initials = name ? name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() : 'U';
    const avatar = $('profileAvatar');
    if (avatar) avatar.textContent = initials;
    const welcome = $('homeWelcome');
    if (welcome) { welcome.hidden = !name; welcome.textContent = name ? 'Welcome, ' + name : ''; }
  }
  function saveProfile() {
    const name = $('localProfileName')?.value.trim().slice(0, 80) || '';
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name }));
      renderProfile();
      showStatus('localProfileStatus', name ? 'Profile saved on this device.' : 'Profile name cleared. Saved presets and preferences remain.', 'ok');
    } catch (_) { showStatus('localProfileStatus', 'Could not save profile. Device storage may be unavailable.', 'warn'); }
  }
  function validatePresets(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Preset data has an invalid format.');
    const fields = ['conc', 'energy', 'protein', 'carb', 'sodium', 'potassium', 'calcium'];
    const out = {};
    for (const [name, item] of Object.entries(input)) {
      if (!name.trim() || !item || typeof item !== 'object' || Array.isArray(item)) throw new Error('A preset entry is invalid.');
      if (typeof PRODUCTS !== 'undefined' && Object.prototype.hasOwnProperty.call(PRODUCTS, name) && !PRODUCTS[name]?.customPreset) {
        throw new Error('Backup cannot replace built-in preset "' + name + '".');
      }
      const clean = {};
      for (const field of fields) {
        const value = Number(item[field]);
        if (!Number.isFinite(value) || value < 0) throw new Error('Preset "' + name + '" has an invalid ' + field + ' value.');
        clean[field] = value;
      }
      clean.gir = item.gir !== false;
      out[name.slice(0, 100)] = clean;
    }
    return out;
  }
  function validatePreferences(input) {
    const d = Number(input?.displayDecimals);
    return { defaultVolumeUnit: input?.defaultVolumeUnit === 'mL/hr' ? 'mL/hr' : 'mL/day', displayDecimals: Number.isInteger(d) && d >= 0 && d <= 4 ? d : 2 };
  }
  function exportData() {
    const presets = {};
    if (typeof PRODUCTS !== 'undefined') Object.entries(PRODUCTS).forEach(([name, p]) => {
      if (p?.customPreset) presets[name] = { conc:Number(p.conc)||0, energy:Number(p.energy)||0, protein:Number(p.protein)||0, carb:Number(p.carb)||0, sodium:Number(p.sodium)||0, potassium:Number(p.potassium)||0, calcium:Number(p.calcium)||0, gir:p.gir !== false };
    });
    const preferences = typeof calculatorPreferences !== 'undefined' ? validatePreferences(calculatorPreferences) : validatePreferences(readObject(PREFS_KEY));
    return { format:'neonatal-gir-settings', schemaVersion:1, exportedAt:new Date().toISOString(), profile:readProfile(), presets, preferences };
  }
  function exportSettings() {
    try {
      const data = exportData();
      if (window.AndroidProfile && typeof window.AndroidProfile.saveBackup === 'function') {
        window.AndroidProfile.saveBackup(JSON.stringify(data));
        showStatus('backupStatus', 'Choose a location to save your settings backup.', 'ok');
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'neonatal-gir-settings-backup.json';
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      showStatus('backupStatus', 'Backup exported. Import this JSON file on another device to transfer your profile name, custom presets and preferences.', 'ok');
    } catch (error) { showStatus('backupStatus', 'Could not export settings: ' + (error.message || 'Device storage is unavailable.'), 'warn'); }
  }
  function importSettings(data) {
    if (!data || data.format !== 'neonatal-gir-settings' || data.schemaVersion !== 1) throw new Error('This is not a supported Neonatal GIR settings backup.');
    const presets = validatePresets(data.presets || {});
    const preferences = validatePreferences(data.preferences || {});
    const name = typeof data.profile?.name === 'string' ? data.profile.name.trim().slice(0, 80) : '';
    if (!window.confirm('Import this backup? It will replace the local profile name, custom presets and preferences on this device. Patient inputs and current fluid rows will not be changed.')) return;
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name }));
    if (typeof PRODUCTS !== 'undefined') Object.keys(PRODUCTS).forEach(key => { if (PRODUCTS[key]?.customPreset) delete PRODUCTS[key]; });
    if (typeof readCustomPresets === 'function') readCustomPresets();
    if (typeof calculatorPreferences !== 'undefined') {
      calculatorPreferences = preferences; displayDecimals = preferences.displayDecimals;
      if (typeof fluidPickerVolumeUnit !== 'undefined') fluidPickerVolumeUnit = preferences.defaultVolumeUnit;
    }
    if (typeof renderSettings === 'function') renderSettings();
    if (typeof refreshMixerPresetOptions === 'function') refreshMixerPresetOptions();
    if (typeof recalc === 'function') recalc(false);
    if (typeof renderFluids === 'function') renderFluids();
    if (typeof renderNutritionFluids === 'function' && $('nutritionFluidEditor')) renderNutritionFluids();
    renderProfile();
    showStatus('backupStatus', 'Backup imported. Review restored preset values against product labels before clinical use.', 'ok');
  }
  $('saveLocalProfile')?.addEventListener('click', saveProfile);
  $('localProfileName')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); saveProfile(); } });
  $('exportProfile')?.addEventListener('click', exportSettings);
  $('importProfile')?.addEventListener('click', () => {
    if (window.AndroidProfile && typeof window.AndroidProfile.openBackupPicker === 'function') window.AndroidProfile.openBackupPicker();
    else $('importProfileFile')?.click();
  });
  $('importProfileFile')?.addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { importSettings(JSON.parse(await file.text())); }
    catch (error) { showStatus('backupStatus', 'Import failed: ' + (error.message || 'Choose a valid settings backup JSON file.'), 'warn'); }
    finally { event.target.value = ''; }
  });
  window.handleProfileBackupImport = (raw) => {
    try { importSettings(JSON.parse(raw)); }
    catch (error) { showStatus('backupStatus', 'Import failed: ' + (error.message || 'Choose a valid settings backup JSON file.'), 'warn'); }
  };
  renderProfile();
})();