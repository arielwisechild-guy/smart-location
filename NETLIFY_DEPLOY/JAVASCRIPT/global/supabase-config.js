/* ============================================================
   INITIALISATION SUPABASE
   ============================================================ */

(function () {
  var url = window.SUPABASE_URL || 'https://czcnnfxyosmrvvbupfxu.supabase.co';
  var anonKey = window.SUPABASE_ANON_KEY || 'sb_publishable_nMufF6cxXeuLX3SfBJPFLw_bYzFg60t';

  window.supabaseClient = null;

  if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(url, anonKey);
    console.log("Supabase est bien connecté !");
  } else {
    console.error("Erreur : Le script Supabase JS n'a pas été trouvé.");
  }
})();