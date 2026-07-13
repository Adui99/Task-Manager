import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { z } from "zod";
import { env } from "@/env";
import rateLimit from "@/lib/rate-limit";

// Rate limiter: max 5 requests per 15 minutes per IP
const limiter = rateLimit({
  interval: 15 * 60 * 1000, 
  uniqueTokenPerInterval: 500,
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    // Basic IP-based rate limiting
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    try {
      await limiter.check(5, ip); // Limit: 5 requests per IP
    } catch {
      return NextResponse.json({ message: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.format() }, { status: 400 });
    }

    const { email, password } = parsed.data;

    await dbConnect();

    const user = await User.findOne({ email });
    if (!user) {
      // Use generic error for security
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const secretKey = new TextEncoder().encode(env.JWT_SECRET);
    const token = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secretKey);

    const response = NextResponse.json(
      { message: "Login successful", role: user.role, email: user.email, name: user.name },
      { status: 200 }
    );

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
