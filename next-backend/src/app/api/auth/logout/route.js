//src/app/api/auth/logout/route.js

/**
 * Your logout codes goes here
 */


import { successResponse } from "@/lib/utils";

export async function POST() {
  const response = successResponse(
    { message: "Logout successful" },
    200
  );

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
