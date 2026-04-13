import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data, error } = await supabase.from('recipes').select('*').limit(1);
  console.log('ERROR:', error);
  console.log('DATA:', JSON.stringify(data, null, 2));
  console.log('KEYS:', data ? Object.keys(data[0]) : 'no data');
}
main();
