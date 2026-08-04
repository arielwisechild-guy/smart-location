/* ============================================================
   SMART LOCATION — supabase-init.js
   Rôle : initialisation cliente Supabase pour le stockage d'images
   Remplacez les valeurs ci-dessous par votre URL et votre anon key Supabase.
   ============================================================ */

(function () {
  var url = window.SUPABASE_URL || 'https://czcnnfxyosmrvvbupfxu.supabase.co';
  var anonKey = window.SUPABASE_ANON_KEY || 'sb_publishable_nMufF6cxXeuLX3SfBJPFLw_bYzFg60t';

  window.supabaseClient = null;
  window.supabaseConfigStatus = 'missing';

  if (url && anonKey && url.indexOf('supabase.co') !== -1 && anonKey.indexOf('YOUR_') === -1) {
    if (window.supabase && window.supabase.createClient) {
      window.supabaseClient = window.supabase.createClient(url, anonKey);
      window.supabaseConfigStatus = 'ready';
    } else {
      window.supabaseConfigStatus = 'script-missing';
    }
  }
})();
