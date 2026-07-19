"use server";

import { db } from "@/lib/db";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please provide a valid email address."),
  message: z.string().min(10, "Message must be at least 10 characters.")
});

export async function submitContactForm(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;

  // Validate fields
  const validation = contactSchema.safeParse({ name, email, message });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message
    };
  }

  try {
    // Insert into database
    await db.contactsubmission.create({
      data: {
        name,
        email,
        message
      }
    });

    return {
      success: true,
      error: null
    };
  } catch (err: any) {
    console.error("Failed to save contact submission to DB:", err);
    return {
      success: false,
      error: "Failed to submit. Please try again later."
    };
  }
}
