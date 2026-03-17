import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

interface BidderPayload {
  firstName: string;
  lastName: string;
  email: string;
}

interface EnsureBidderResult {
  created: boolean;
}

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE key in environment variables.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
};

export const ensureBidderExists = async ({ firstName, lastName, email }: BidderPayload): Promise<EnsureBidderResult> => {
  const client = getSupabaseClient();
  const normalizedFirstName = `${firstName.trim()}`;
  const normalizedLastName = `${lastName.trim()}`;
  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingBidders, error: existingBidderError } = await client
    .from("bidders")
    .select("id")
    .ilike("email", normalizedEmail)
    .limit(1);

  if (existingBidderError) {
    throw existingBidderError;
  }

  if (existingBidders && existingBidders.length > 0) {
    return { created: false };
  }

  const { error: insertError } = await client
    .from("bidders")
    .insert({
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      email: normalizedEmail
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return { created: false };
    }

    throw insertError;
  }

  return { created: true };
};
