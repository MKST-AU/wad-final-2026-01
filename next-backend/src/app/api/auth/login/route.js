//src/app/api/auth/login/route.js

/**
 * Your login APIs go here
 */


import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getClientPromise } from "@/lib/mongodb";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return errorResponse("Invalid email or password", 401);
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const response = successResponse(
      {
        message: "Login successful",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      200
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
