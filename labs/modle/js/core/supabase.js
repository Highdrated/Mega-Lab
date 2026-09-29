import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mnmipddgcbpolsqgnmrt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ubWlwZGRnY2Jwb2xzcWdubXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDU1NDksImV4cCI6MjEwMDcyMTU0OX0.D446qMaLysZb9rCT7RDQJfDAioo1dpd_6JzUb7co9kE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
