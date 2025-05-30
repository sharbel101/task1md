import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tiiprfeovumzgcjxsrco.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaXByZmVvdnVtemdjanhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MDY1MjAsImV4cCI6MjA2NDA4MjUyMH0.XGBUdCCl4sMWoKVyJH499dooG0Etv3BJgrEMsVd5P7c'

export const supabase = createClient(supabaseUrl, supabaseKey)
