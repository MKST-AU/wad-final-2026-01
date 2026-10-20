
import { ObjectId } from "mongodb";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request, { params }) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return errorResponse("Please log in first", 401);
    }

    if (user.role !== "Student") {
      return errorResponse("Only Students can enroll", 403);
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    const courseId = new ObjectId(course_id);

    const result = await db.collection("courses").updateOne(
      {
        _id: courseId,
        status: "Open",
        enrolledStudentIds: { $ne: user.id },
        $expr: {
          $lt: [
            { $size: "$enrolledStudentIds" },
            "$maxStudent"
          ]
        }
      },
      {
        $addToSet: { enrolledStudentIds: user.id }
      }
    );

    if (result.modifiedCount === 1) {
      return successResponse({
        message: "Enrollment successful"
      }, 200);
    }

    const course = await db.collection("courses").findOne({
      _id: courseId
    });

    if (!course) {
      return errorResponse("Course not found", 404);
    }

    if (course.status !== "Open") {
      return errorResponse("Course is not open", 400);
    }

    if (course.enrolledStudentIds.includes(user.id)) {
      return errorResponse("Already enrolled", 400);
    }

    return errorResponse("Course is full", 400);

  } catch (error) {
    console.error("Enrollment error:", error);
    return errorResponse("Internal server error", 500);
  }
}
