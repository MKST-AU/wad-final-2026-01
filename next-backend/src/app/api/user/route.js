//src/app/api/user/route.js

/**
 * User API endpoints go here
 */


import { NextResponse } from "next/server";
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { username, email, password, role } = await request.json();

    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    if (!["Student", "Teacher"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role" },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad_final_2026");

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.collection("users").insertOne({
      username,
      email,
      password: hashedPassword,
      role,
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
