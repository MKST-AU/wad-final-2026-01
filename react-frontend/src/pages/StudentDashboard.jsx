
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/user-context";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }


export default function StudentDashboard() {
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [enrollingId, setEnrollingId] = useState(null);


  async function loadCourses(searchText = "") {
    try {
      setLoading(true);
      setError("");

      const query = searchText
        ? `?search=${encodeURIComponent(searchText)}`
        : "";

      const data = await apiRequest(`/api/course${query}`);
      setCourses(data.courses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEnrolledCourses() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/api/course?enrolled=true");
      setEnrolledCourses(data.courses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiRequest("/api/course")
      .then(data => { if (active) setCourses(data.courses || []); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setMessage("");
    setSelectedCourse(null);
    setActiveTab("available");
    await loadCourses(search.trim());
  }

  async function handleDetails(course) {
    try {
      setError("");
      setMessage("");

      const data = await apiRequest(`/api/course/${course._id}`);
      setSelectedCourse(data.course);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEnroll(course) {
    const confirmed = window.confirm(
      `Do you want to enroll in "${course.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      setEnrollingId(course._id);

      await apiRequest(`/api/course/${course._id}/enroll`, {
        method: "POST",
      });

      setMessage(`Successfully enrolled in "${course.name}"!`);
      setSelectedCourse(null);

      await loadCourses(search.trim());
      await loadEnrolledCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnrollingId(null);
    }
  }

  async function handleTabChange(tab) {
    setActiveTab(tab);
    setSelectedCourse(null);
    setError("");
    setMessage("");

    if (tab === "enrolled") {
      await loadEnrolledCourses();
    } else {
      await loadCourses(search.trim());
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  const displayedCourses =
    activeTab === "available" ? courses : enrolledCourses;

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "30px auto",
        padding: "20px",
      }}
    >
      <header>
        <h1>Student Dashboard</h1>
        <p>Welcome, {user?.username}!</p>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <hr />

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      {message && (
        <p style={{ color: "green" }}>{message}</p>
      )}

      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => handleTabChange("available")}>
          Browse Courses
        </button>

        <button onClick={() => handleTabChange("enrolled")}>
          My Enrolled Courses
        </button>
      </div>

      {activeTab === "available" && (
        <section>
          <h2>Search Courses</h2>

          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by course or teacher name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="submit">Search</button>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                loadCourses("");
              }}
            >
              Clear
            </button>
          </form>
        </section>
      )}

      <hr />

      <section>
        <h2>
          {activeTab === "available"
            ? "Available Courses"
            : "My Enrolled Courses"}
        </h2>

        {loading ? (
          <p>Loading courses...</p>
        ) : displayedCourses.length === 0 ? (
          <p>No courses found.</p>
        ) : (
          <table
            border="1"
            cellPadding="10"
            style={{ width: "100%" }}
          >
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayedCourses.map((course) => (
                <tr key={course._id}>
                  <td>{course.name}</td>
                  <td>{course.duration}</td>
                  <td>{course.price} CZK</td>
                  <td>{course.status}</td>

                  <td>
                    <button
                      onClick={() => handleDetails(course)}
                    >
                      Details
                    </button>

                    {activeTab === "available" &&
                      course.status === "Open" && (
                        <button
                          disabled={enrollingId === course._id}
                          onClick={() => handleEnroll(course)}
                        >
                          {enrollingId === course._id
                            ? "Enrolling..."
                            : "Enroll"}
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedCourse && (
        <section>
          <hr />

          <h2>Course Details</h2>

          <p>
            <strong>Name:</strong> {selectedCourse.name}
          </p>

          <p>
            <strong>Duration:</strong> {selectedCourse.duration}
          </p>

          <p>
            <strong>Topics:</strong>{" "}
            {(selectedCourse.topics || []).join(", ")}
          </p>

          <p>
            <strong>Price:</strong> {selectedCourse.price} CZK
          </p>

          <p>
            <strong>Maximum Students:</strong>{" "}
            {selectedCourse.maxStudent}
          </p>

          <p>
            <strong>Status:</strong> {selectedCourse.status}
          </p>

          {activeTab === "available" &&
            selectedCourse.status === "Open" && (
              <button
                disabled={enrollingId === selectedCourse._id}
                onClick={() => handleEnroll(selectedCourse)}
              >
                Enroll in This Course
              </button>
            )}

          <button onClick={() => setSelectedCourse(null)}>
            Close Details
          </button>
        </section>
      )}
    </div>
  );
}
