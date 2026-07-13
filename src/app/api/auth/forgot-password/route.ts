import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendForgotPasswordEmail } from "@/lib/sendEmail";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid email", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email });

    if (!user) {
      // Return 200 even if user doesn't exist for security reasons (prevent email enumeration)
      return NextResponse.json({ message: "If your email is in our database, a reset link will be sent." }, { status: 200 });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Hash token before saving to database (optional but recommended for security)
    const passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 1 hour
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = passwordResetToken;
    user.resetPasswordExpires = passwordResetExpires;
    await user.save();

    // Generate reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get("origin") || "http://localhost:3000");
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email
    await sendForgotPasswordEmail(user.email, resetUrl);

    return NextResponse.json({ message: "If your email is in our database, a reset link will be sent." }, { status: 200 });
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
