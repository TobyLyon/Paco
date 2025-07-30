// Supabase Configuration
// Uses environment variables when available, falls back to hardcoded values

const SUPABASE_CONFIG = {
    url: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL 
        ? process.env.NEXT_PUBLIC_SUPABASE_URL 
        : 'https://tbowrsbjoijdtpdgnoio.supabase.co',
    anonKey: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib3dyc2Jqb2lqZHRwZGdub2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTM5NDQsImV4cCI6MjA2OTQyOTk0NH0.-A1uzl0uuzS5ZyHhRAffLEPo10PH1K7dwNPHNW5r1FQ'
};

console.log('🔧 Supabase Config:', {
    url: SUPABASE_CONFIG.url,
    hasAnonKey: !!SUPABASE_CONFIG.anonKey,
    keyPreview: SUPABASE_CONFIG.anonKey.substring(0, 20) + '...'
});

export default SUPABASE_CONFIG;