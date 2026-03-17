import { Request, Response } from "express";
import { ensureBidderExists } from "../services/bidder-service";
import { setBidderRegistrationCookie } from "../services/bidder-auth-service";

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const handleRegister = async (req: Request, res: Response): Promise<void> => {
  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";

  if (!firstName || !lastName || !email || !isValidEmail(email)) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid first name, last name, and email address."
    });
    return;
  }

  try {
    const result = await ensureBidderExists({ firstName, lastName, email });
    setBidderRegistrationCookie(res, { firstName, lastName, email });

    res.status(200).json({
      success: true,
      created: result.created,
      redirectTo: "/home"
    });
  } catch (error) {
    console.error("Failed to create/check bidder in Supabase:", error);
    res.status(500).json({
      success: false,
      message: "Could not save registration right now."
    });
  }
};
