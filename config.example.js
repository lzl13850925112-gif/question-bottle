const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";

function toSupabaseProjectUrl(url) {
  return url.replace(/\/rest\/v1\/?$/, "");
}

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

window.BOTTLE_CONFIG = {
  supabaseUrl: toSupabaseProjectUrl(SUPABASE_URL),
  supabaseAnonKey: SUPABASE_ANON_KEY,
  maxAnswersPerQuestion: 5
};
