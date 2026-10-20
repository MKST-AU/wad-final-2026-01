
import { verifyJWT } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return errorResponse("Please log in first", 401);
    }

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }, 200);

  } catch (error) {
    console.error("Authentication check error:", error);
    return errorResponse("Internal server error", 500);
  }
}
