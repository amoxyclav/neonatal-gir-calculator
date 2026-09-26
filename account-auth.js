(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const status = (message, kind) => {
    const el = $('accountStatus');
    if (!el) return;
    el.textContent = message;
    el.className = 'status' + (kind ? ' ' + kind : '');
  };
  const config = window.NEONATAL_GIR_AUTH_CONFIG;
  let client = null;
  let currentUser = null;
  const CUSTOM_KEY = 'neonatalGirCustomPresets.v1';

  function localPresets() {
    try {
      const value = JSON.parse(sessionStorage.getItem(CUSTOM_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }
  function localPreferences() {
    return {
      defaultVolumeUnit: typeof calculatorPreferences !== 'undefined' && calculatorPreferences.defaultVolumeUnit === 'mL/hr' ? 'mL/hr' : 'mL/day',
      displayDecimals: typeof calculatorPreferences !== 'undefined' && Number.isInteger(calculatorPreferences.displayDecimals) ? Math.max(0, Math.min(4, calculatorPreferences.displayDecimals)) : 2
    };
  }
  function setLocalPresets(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Cloud preset data has an invalid format.');
    const safe = {};
    for (const [name, item] of Object.entries(input)) {
      if (!name || !item || typeof item !== 'object' || Array.isArray(item)) continue;
      const fields = ['conc', 'energy', 'protein', 'carb', 'sodium', 'potassium', 'calcium'];
      const cleaned = {};
      let valid = true;
      for (const field of fields) {
        const number = Number(item[field]);
        if (!Number.isFinite(number) || number < 0) { valid = false; break; }
        cleaned[field] = number;
      }
      if (valid) {
        cleaned.gir = item.gir !== false;
        safe[name] = cleaned;
      }
    }
    sessionStorage.setItem(CUSTOM_KEY, JSON.stringify(safe));
    return safe;
  }
  function userDisplayName(user) {
    const meta = user?.user_metadata || {};
    const value = meta.full_name || meta.name || meta.display_name || meta.preferred_username || '';
    return typeof value === 'string' ? value.trim().slice(0, 80) : '';
  }
  function initials(name, email) {
    const clean = (name || '').trim();
    if (clean) {
      const parts = clean.split(/\\s+/).filter(Boolean);
      return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
    }
    return (email || 'U').trim().slice(0, 1).toUpperCase();
  }
  function updateAvatar(el, name, email, user) {
    if (!el) return;
    const meta = user?.user_metadata || {};
    const photo = meta.avatar_url || meta.picture || '';
    el.replaceChildren();
    if (typeof photo === 'string' && /^https:\/\//i.test(photo)) {
      const img = document.createElement('img');
      img.src = photo;
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => { img.remove(); el.textContent = initials(name, email) || 'U'; }, { once: true });
      el.appendChild(img);
    } else {
      el.textContent = initials(name, email) || 'U';
    }
    el.setAttribute('aria-label', name ? name + ' profile' : 'User profile');
  }
  function updateAccountUI(user) {
    currentUser = user || null;
    const signedIn = !!currentUser;
    const name = userDisplayName(currentUser);
    const email = currentUser?.email || '';
    $('accountSignInControls').hidden = signedIn;
    $('accountSignedInControls').hidden = !signedIn;
    $('accountEmail').textContent = signedIn ? (email || 'Signed in') : '';
    $('accountSyncButton').disabled = !signedIn;
    const details = $('profileDetails');
    if (details) details.hidden = !signedIn;
    const nameInput = $('profileNameInput');
    const emailInput = $('profileEmailInput');
    if (nameInput) nameInput.value = name;
    if (emailInput) emailInput.value = email;
    const heading = $('profileHeading');
    if (heading) heading.textContent = signedIn ? (name ? 'Welcome, ' + name : 'Your profile') : 'Your profile';
    updateAvatar($('navProfileAvatar'), name, email, currentUser);
    updateAvatar($('profileAvatar'), name, email, currentUser);
    const welcome = $('homeWelcome');
    if (welcome) {
      welcome.hidden = !signedIn || !name;
      welcome.textContent = signedIn && name ? 'Welcome, ' + name : '';
    }
    if (signedIn) status('Signed in. Your calculator remains usable offline; preset syncing requires a connection.', 'ok');
    else status('Continue as guest to use the calculator without an account.');
  }
  async function readCloud() {
    const { data, error } = await client.from('user_preset_settings')
      .select('presets,preferences,updated_at')
      .eq('user_id', currentUser.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function writeCloud() {
    if (!client || !currentUser) throw new Error('Sign in before syncing.');
    const payload = {
      user_id: currentUser.id,
      presets: localPresets(),
      preferences: localPreferences(),
      schema_version: 1
    };
    const { error } = await client.from('user_preset_settings').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    status('Your personal presets and preferences were synced. Patient inputs and calculation results were not uploaded.', 'ok');
  }
  function restoreCloud(row) {
    const presets = setLocalPresets(row.presets || {});
    const prefs = row.preferences && typeof row.preferences === 'object' ? row.preferences : {};
    const unit = prefs.defaultVolumeUnit === 'mL/hr' ? 'mL/hr' : 'mL/day';
    const decimals = Number(prefs.displayDecimals);
    if (typeof calculatorPreferences !== 'undefined') {
      calculatorPreferences = { defaultVolumeUnit: unit, displayDecimals: Number.isInteger(decimals) && decimals >= 0 && decimals <= 4 ? decimals : 2 };
    }
    if (typeof displayDecimals !== 'undefined') displayDecimals = Number.isInteger(decimals) && decimals >= 0 && decimals <= 4 ? decimals : 2;
    if (typeof PRODUCTS !== 'undefined') Object.keys(PRODUCTS).forEach((name) => { if (PRODUCTS[name]?.customPreset) delete PRODUCTS[name]; });
    if (typeof readCustomPresets === 'function') readCustomPresets();
    if (typeof renderSettings === 'function') renderSettings();
    status('Personal presets and preferences restored from your account. Review editable preset values before clinical use.', 'ok');
  }
  async function afterSignIn() {
    try {
      const row = await readCloud();
      if (!row) {
        await writeCloud();
        return;
      }
      const hasLocal = Object.keys(localPresets()).length > 0;
      const hasCloud = Object.keys(row.presets || {}).length > 0;
      if (hasLocal && hasCloud) {
        const restore = window.confirm('This account already has saved presets. Choose OK to restore the account presets to this device, or Cancel to keep this device’s presets and upload them to your account.');
        if (restore) restoreCloud(row);
        else await writeCloud();
      } else if (hasCloud || row.preferences) {
        restoreCloud(row);
      } else {
        await writeCloud();
      }
    } catch (error) {
      status('Signed in, but preset sync could not finish: ' + (error.message || 'Connection error') + '. Try Sync presets when online.', 'warn');
    }
  }
  let pendingNativeCallback = null;
  let clientPromise = null;
  let authStateBound = false;
  const isNativeApp = () => !!(window.AndroidAuth && typeof window.AndroidAuth.openAuthUrl === 'function');
  const authRedirectUrl = () => isNativeApp() ? 'neonatalgir://auth-callback' : location.href.split('#')[0];

  async function ensureClient() {
    if (client) return client;
    if (clientPromise) return clientPromise;
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) throw new Error('Account service is not configured.');
    clientPromise = (async () => {
      if (!window.supabase?.createClient) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.async = true;
          script.onload = () => window.supabase?.createClient ? resolve() : reject(new Error('Account library did not initialize.'));
          script.onerror = () => reject(new Error('Could not load account services. Connect to the internet and try again.'));
          document.head.appendChild(script);
        });
      }
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      updateAccountUI(data?.session?.user || null);
      if (data?.session?.user) await afterSignIn();
      if (!authStateBound) {
        authStateBound = true;
        client.auth.onAuthStateChange((event, session) => {
          updateAccountUI(session?.user || null);
          if (event === 'SIGNED_IN' && session?.user) setTimeout(() => afterSignIn(), 0);
        });
      }
      if (pendingNativeCallback) {
        const pending = pendingNativeCallback;
        pendingNativeCallback = null;
        await processNativeAuthCallback(pending);
      }
      return client;
    })();
    try { return await clientPromise; }
    catch (error) { clientPromise = null; client = null; throw error; }
  }

  async function startOAuth(provider) {
    await ensureClient();
    const native = isNativeApp();
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authRedirectUrl(), skipBrowserRedirect: native }
    });
    if (error) throw error;
    if (native) {
      if (!data?.url || !window.AndroidAuth.openAuthUrl(data.url)) throw new Error('Could not open the secure sign-in page.');
      status('Finish signing in in your browser. Return to the calculator when prompted.', 'ok');
    }
  }

  async function processNativeAuthCallback(raw) {
    if (!client || !raw) { pendingNativeCallback = raw; return; }
    try {
      const callback = new URL(raw);
      const callbackError = callback.searchParams.get('error_description') || callback.searchParams.get('error');
      if (callbackError) throw new Error(callbackError);
      const code = callback.searchParams.get('code');
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else {
        const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
        const access_token = fragment.get('access_token');
        const refresh_token = fragment.get('refresh_token');
        if (!access_token || !refresh_token) throw new Error('The sign-in callback did not contain a session. Please try again.');
        const { error } = await client.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
      }
      status('Sign-in completed. Your calculator continues to work offline.', 'ok');
    } catch (error) {
      status('Sign-in could not be completed: ' + (error.message || 'Please try again.'), 'warn');
    }
  }
  window.handleNativeAuthCallback = (raw) => {
    if (client) { processNativeAuthCallback(raw); return; }
    pendingNativeCallback = raw;
    ensureClient().catch(error => status('Sign-in callback could not be processed: ' + error.message, 'warn'));
  };

  async function initialize() {
    updateAccountUI(null);
    status('Calculator works offline. Connect to the internet to sign in or sync personal presets.');
    document.querySelector('[data-page="profile"]')?.addEventListener('click', () => {
      ensureClient().catch(error => status('Account service is unavailable: ' + error.message, 'warn'));
    });
  }
  $('accountGoogleButton')?.addEventListener('click', async () => {
    try { await startOAuth('google'); }
    catch (error) { status('Google sign-in could not start: ' + error.message, 'warn'); }
  });
  $('accountAppleButton')?.addEventListener('click', async () => {
    try { await startOAuth('apple'); }
    catch (error) { status('Apple sign-in could not start: ' + error.message, 'warn'); }
  });
  $('accountEmailButton')?.addEventListener('click', async () => {
    const email = $('accountEmailInput').value.trim();
    if (!email) { status('Enter your email address first.', 'warn'); return; }
    try {
      await ensureClient();
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirectUrl() } });
      if (error) throw error;
      status('Sign-in link sent if email sign-in is enabled. Check your inbox and open the link on this device.', 'ok');
    } catch (error) { status('Email sign-in could not be sent: ' + error.message, 'warn'); }
  });
  $('accountSyncButton')?.addEventListener('click', async () => {
    try { await ensureClient(); await writeCloud(); }
    catch (error) { status('Preset sync failed: ' + (error.message || 'Connection error'), 'warn'); }
  });
  $('profileSaveButton')?.addEventListener('click', async () => {
    try { await ensureClient(); } catch (error) { status('Account service is unavailable: ' + error.message, 'warn'); return; }
    if (!currentUser) { status('Sign in before saving profile details.', 'warn'); return; }
    const name = $('profileNameInput').value.trim();
    const saveStatus = $('profileSaveStatus');
    if (!name) {
      if (saveStatus) { saveStatus.hidden = false; saveStatus.className = 'status warn'; saveStatus.textContent = 'Enter your name before saving.'; }
      return;
    }
    try {
      const { data, error } = await client.auth.updateUser({ data: { full_name: name, name } });
      if (error) throw error;
      updateAccountUI(data?.user || { ...currentUser, user_metadata: { ...(currentUser.user_metadata || {}), full_name: name, name } });
      if (saveStatus) { saveStatus.hidden = false; saveStatus.className = 'status ok'; saveStatus.textContent = 'Profile details saved to your account.'; }
    } catch (error) {
      if (saveStatus) { saveStatus.hidden = false; saveStatus.className = 'status warn'; saveStatus.textContent = 'Could not save profile: ' + (error.message || 'Please try again.'); }
    }
  });
  $('profileLogoutButton')?.addEventListener('click', async () => {
    try { await ensureClient(); } catch (error) { status('Account service is unavailable: ' + error.message, 'warn'); return; }
    if (!currentUser) return;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      updateAccountUI(null);
      status('Signed out. Local calculator data remains on this device.', 'ok');
    } catch (error) { status('Could not sign out: ' + error.message, 'warn'); }
  });

  $('accountSignOutButton')?.addEventListener('click', async () => {
    try { await ensureClient(); } catch (error) { status('Account service is unavailable: ' + error.message, 'warn'); return; }
    if (!currentUser) return;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      updateAccountUI(null);
      status('Signed out. Local calculator data remains on this device.', 'ok');
    } catch (error) { status('Could not sign out: ' + error.message, 'warn'); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
