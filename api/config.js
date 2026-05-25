function toSupabaseProjectUrl(url) {
  return url.replace(/\/rest\/v1\/?$/, "");
}

export default function handler(request, response) {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    supabaseUrl: toSupabaseProjectUrl(supabaseUrl),
    supabaseAnonKey,
    maxAnswersPerQuestion: 5
  });
}
