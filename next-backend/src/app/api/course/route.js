//src/app/api/course/route.js

/**
 * Course endpoints go here
 */


import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return errorResponse("Please log in first", 401);
    }

    if (user.role !== "Teacher") {
      return errorResponse("Only Teachers can create courses", 403);
    }

    const data = await request.json();

    const {
      name,
      duration,
      topics,
      price,
      maxStudent,
      status,
    } = data;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isInteger(duration) ||
      duration <= 0 ||
      !Array.isArray(topics) ||
      topics.length === 0 ||
      !topics.every((topic) => typeof topic === "string" && topic.trim()) ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(maxStudent) ||
      maxStudent <= 0 ||
      !["Open", "Close", "Cancel"].includes(status)
    ) {
      return errorResponse("Invalid course information", 400);
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    const course = {
      name: name.trim(),
      duration,
      topics: topics.map((topic) => topic.trim()),
      price,
      maxStudent,
      status,
      teacherId: user.id,
      enrolledStudentIds: [],
      createdAt: new Date(),
    };

    const result = await db.collection("courses").insertOne(course);

    return successResponse(
      {
        message: "Course created successfully",
        courseId: result.insertedId.toString(),
      },
      201
    );
  } catch (error) {
    console.error("Create course error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function GET(request) {
  try {
    const user = verifyJWT(request);

    if (!user) {
      return errorResponse("Please log in first", 401);
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    if (user.role === "Teacher") {
      const courses = await db
        .collection("courses")
        .find({ teacherId: user.id })
        .toArray();

      return successResponse({ courses }, 200);
    }


if (user.role === "Student") {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const enrolled = searchParams.get("enrolled");

  const filter = {
    status: { $ne: "Cancel" }
  };

  if (enrolled === "true") {
    filter.enrolledStudentIds = user.id;
  }

  let courses = await db
    .collection("courses")
    .find(filter)
    .toArray();

  if (search.trim()) {
    const teachers = await db
      .collection("users")
      .find({
        role: "Teacher"
      })
      .project({
        _id: 1,
        username: 1
      })
      .toArray();

    const matchingTeacherIds = teachers
      .filter(t =>
        t.username.toLowerCase()
          .includes(search.toLowerCase())
      )
      .map(t => t._id.toString());

    courses = courses.filter(course =>
      course.name.toLowerCase()
        .includes(search.toLowerCase()) ||
      matchingTeacherIds.includes(course.teacherId)
    );
  }

  return successResponse({ courses }, 200);
}


    return errorResponse("Invalid user role", 403);
  } catch (error) {
    console.error("Get courses error:", error);
    return errorResponse("Internal server error", 500);
  }
}
