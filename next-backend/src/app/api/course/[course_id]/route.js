
import { ObjectId } from "mongodb";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

// GET - View course details
export async function GET(request, { params }) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return errorResponse("Please log in first", 401);
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    const course = await db.collection("courses").findOne({
      _id: new ObjectId(course_id),
    });

    if (!course) {
      return errorResponse("Course not found", 404);
    }

    // Teacher can only view their own courses
    if (user.role === "Teacher" && course.teacherId !== user.id) {
      return errorResponse(
        "You can only view your own courses",
        403
      );
    }

    // Students cannot view cancelled courses
    if (user.role === "Student" && course.status === "Cancel") {
      return errorResponse("Course not available", 404);
    }

    // Check user role
    if (!["Teacher", "Student"].includes(user.role)) {
      return errorResponse("Access denied", 403);
    }

    // Teacher can view enrolled students
    if (user.role === "Teacher") {
      const studentIds = course.enrolledStudentIds || [];

      const students = await db.collection("users")
        .find({
          _id: {
            $in: studentIds.map(id => new ObjectId(id))
          },
          role: "Student"
        })
        .project({
          username: 1,
          email: 1
        })
        .toArray();

      return successResponse({
        course,
        enrolledStudents: students
      }, 200);
    }

    // Student can view course details
    return successResponse({ course }, 200);

  } catch (error) {
    console.error(error);
    return errorResponse("Internal server error", 500);
  }
}

// PUT - Teacher updates their own course
export async function PUT(request, { params }) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return errorResponse("Please log in first", 401);
    }

    if (user.role !== "Teacher") {
      return errorResponse("Only Teachers can edit courses", 403);
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const data = await request.json();

    const allowedFields = [
      "name",
      "duration",
      "topics",
      "price",
      "maxStudent",
      "status"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates[field] = data[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("No valid fields provided", 400);
    }

    // Validate updated course information
    if (
      ("name" in updates &&
        (typeof updates.name !== "string" ||
          !updates.name.trim())) ||

      ("duration" in updates &&
        (!Number.isInteger(updates.duration) ||
          updates.duration <= 0)) ||

      ("topics" in updates &&
        (!Array.isArray(updates.topics) ||
          updates.topics.length === 0 ||
          !updates.topics.every(
            t => typeof t === "string" && t.trim()
          ))) ||

      ("price" in updates &&
        (typeof updates.price !== "number" ||
          !Number.isFinite(updates.price) ||
          updates.price < 0)) ||

      ("maxStudent" in updates &&
        (!Number.isInteger(updates.maxStudent) ||
          updates.maxStudent <= 0)) ||

      ("status" in updates &&
        !["Open", "Close", "Cancel"].includes(updates.status))
    ) {
      return errorResponse(
        "Invalid course information",
        400
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    // Find only the Teacher's own course
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(course_id),
      teacherId: user.id,
    });

    if (!course) {
      return errorResponse(
        "Course not found or access denied",
        404
      );
    }

    // Cannot reduce seats below current enrollment
    if (
      updates.maxStudent !== undefined &&
      updates.maxStudent < course.enrolledStudentIds.length
    ) {
      return errorResponse(
        "Maximum students cannot be less than current enrollment",
        400
      );
    }

    await db.collection("courses").updateOne(
      {
        _id: course._id,
        teacherId: user.id
      },
      {
        $set: updates
      }
    );

    return successResponse({
      message: "Course updated successfully"
    }, 200);

  } catch (error) {
    console.error(error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE - Teacher deletes course with no enrolled students
export async function DELETE(request, { params }) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return errorResponse("Please log in first", 401);
    }

    if (user.role !== "Teacher") {
      return errorResponse(
        "Only Teachers can delete courses",
        403
      );
    }

    const { course_id } = await params;

    if (!ObjectId.isValid(course_id)) {
      return errorResponse("Invalid course ID", 400);
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    // Delete only if owned by Teacher and no students enrolled
    const result = await db.collection("courses").deleteOne({
      _id: new ObjectId(course_id),
      teacherId: user.id,
      enrolledStudentIds: { $size: 0 },
    });

    if (result.deletedCount === 0) {
      return errorResponse(
        "Course not found, not yours, or has enrolled students",
        400
      );
    }

    return successResponse({
      message: "Course deleted successfully"
    }, 200);

  } catch (error) {
    console.error(error);
    return errorResponse("Internal server error", 500);
  }
}
