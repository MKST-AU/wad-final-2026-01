
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/user-context";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const emptyForm = {
  name: "",
  duration: "",
  topics: "",
  price: "",
  maxStudent: "",
  status: "Open",
};

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


export default function TeacherDashboard() {
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);


  async function loadCourses() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/course");
      setCourses(data.courses || []);
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

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const courseData = {
      name: form.name.trim(),
      duration: Number(form.duration),
      topics: form.topics
        .split(",")
        .map((topic) => topic.trim())
        .filter(Boolean),
      price: Number(form.price),
      maxStudent: Number(form.maxStudent),
      status: form.status,
    };

    try {
      if (editingId) {
        await apiRequest(`/api/course/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(courseData),
        });
        setMessage("Course updated successfully!");
      } else {
        await apiRequest("/api/course", {
          method: "POST",
          body: JSON.stringify(courseData),
        });
        setMessage("Course created successfully!");
      }

      resetForm();
      await loadCourses();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(course) {
    setEditingId(course._id);
    setForm({
      name: course.name || "",
      duration: String(course.duration ?? ""),
      topics: (course.topics || []).join(", "),
      price: String(course.price ?? ""),
      maxStudent: String(course.maxStudent ?? ""),
      status: course.status || "Open",
    });
    setSelectedCourse(null);
    setError("");
    setMessage("");
    window.scrollTo(0, 0);
  }

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${course.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await apiRequest(`/api/course/${course._id}`, {
        method: "DELETE",
      });

      setMessage("Course deleted successfully!");
      setSelectedCourse(null);
      await loadCourses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDetails(course) {
    setError("");

    try {
      const data = await apiRequest(`/api/course/${course._id}`);
      setSelectedCourse({ ...data.course, enrolledStudents: data.enrolledStudents || [] });
    } catch (err) {
      setError(err.message);
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

  return (
    <div style={{ maxWidth: "1100px", margin: "30px auto", padding: "20px" }}>
      <header>
        <h1>Teacher Dashboard</h1>
        <p>Welcome, {user?.username}!</p>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <hr />

      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      <section>
        <h2>{editingId ? "Edit Course" : "Create New Course"}</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label>Course Name</label>
            <input
              name="name"
              value={form.name}
              onChange={updateForm}
              required
            />
          </div>

          <div>
            <label>Duration</label>
            <input
              type="number"
              name="duration"
              min="1"
              value={form.duration}
              onChange={updateForm}
              required
            />
          </div>

          <div>
            <label>Topics (separated by commas)</label>
            <input
              name="topics"
              value={form.topics}
              onChange={updateForm}
              placeholder="Variables, Loops, Functions"
              required
            />
          </div>

          <div>
            <label>Price</label>
            <input
              type="number"
              name="price"
              min="0"
              value={form.price}
              onChange={updateForm}
              required
            />
          </div>

          <div>
            <label>Maximum Students</label>
            <input
              type="number"
              name="maxStudent"
              min="1"
              value={form.maxStudent}
              onChange={updateForm}
              required
            />
          </div>

          <div>
            <label>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={updateForm}
            >
              <option value="Open">Open</option>
              <option value="Close">Close</option>
              <option value="Cancel">Cancel</option>
            </select>
          </div>

          <button type="submit">
            {editingId ? "Update Course" : "Create Course"}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel Editing
            </button>
          )}
        </form>
      </section>

      <hr />

      <section>
        <h2>My Courses</h2>

        {loading ? (
          <p>Loading courses...</p>
        ) : courses.length === 0 ? (
          <p>You have not created any courses yet.</p>
        ) : (
          <table border="1" cellPadding="10" style={{ width: "100%" }}>
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
              {courses.map((course) => (
                <tr key={course._id}>
                  <td>{course.name}</td>
                  <td>{course.duration}</td>
                  <td>{course.price} CZK</td>
                  <td>{course.status}</td>
                  <td>
                    <button onClick={() => handleDetails(course)}>
                      Details
                    </button>
                    <button onClick={() => handleEdit(course)}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(course)}>
                      Delete
                    </button>
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

          <p><strong>Name:</strong> {selectedCourse.name}</p>
          <p><strong>Duration:</strong> {selectedCourse.duration}</p>
          <p><strong>Topics:</strong> {(selectedCourse.topics || []).join(", ")}</p>
          <p><strong>Price:</strong> {selectedCourse.price} CZK</p>
          <p><strong>Maximum Students:</strong> {selectedCourse.maxStudent}</p>
          <p><strong>Status:</strong> {selectedCourse.status}</p>

          <h3>Enrolled Students</h3>

          {selectedCourse.enrolledStudents?.length > 0 ? (
            <ul>
              {selectedCourse.enrolledStudents.map((student) => (
                <li key={student._id}>
                  {student.username} — {student.email}
                </li>
              ))}
            </ul>
          ) : (
            <p>No students enrolled yet.</p>
          )}

          <button onClick={() => setSelectedCourse(null)}>
            Close Details
          </button>
        </section>
      )}
    </div>
  );
}
