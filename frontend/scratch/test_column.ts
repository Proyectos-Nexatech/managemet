import { supabase } from './src/lib/supabase';

async function test() {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, is_external')
    .limit(1);
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Column exists!');
  }
}

test();
