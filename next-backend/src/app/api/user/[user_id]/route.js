import { ObjectId } from "mongodb";
import { verifyJWT } from "@/lib/auth";
import { getClientPromise } from "@/lib/mongodb";
import { successResponse, errorResponse } from "@/lib/utils";

// Users may retrieve only their own profile; never return password hashes.
export async function GET(request, { params }) {
  try {
    const session = verifyJWT(request);
    if (!session) return errorResponse("Please log in first", 401);

    const { user_id } = await params;
    if (!ObjectId.isValid(user_id)) {
      return errorResponse("Invalid user ID", 400);
    }
    if (new ObjectId(user_id).toString() !== session.id) {
      return errorResponse("You can only view your own profile", 403);
    }

    const client = await getClientPromise();
    const user = await client.db("wad_final_2026").collection("users").findOne(
      { _id: new ObjectId(user_id) },
      { projection: { _id: 1, username: 1, email: 1, role: 1 } },
    );
    if (!user) return errorResponse("User not found", 404);

    return successResponse({ user }, 200);
  } catch (error) {
    console.error("Get user profile error:", error);
    return errorResponse("Internal server error", 500);
  }
}
