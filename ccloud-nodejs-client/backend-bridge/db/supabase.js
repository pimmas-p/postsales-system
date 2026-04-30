const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

console.log('🔍 Supabase Configuration Check:');
console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   SUPABASE_SECRET_KEY:', supabaseKey ? '✅ Set (hidden)' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Missing Supabase environment variables!');
  console.error('   Required variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SECRET_KEY');
  console.error('\n   Please set these in Render Dashboard > Environment\n');
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase client initialized successfully\n');

module.exports = supabase;
