import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGroupById } from '../api/group.api';
import {
  createStudent,
  deleteStudent,
  getStudents,
  importStudentsFromFile,
  updateStudent
} from '../api/student.api';

function GroupStudentsPage() {
  const { groupId } = useParams();
  const fileInputRef = useRef(null);
  const [groupName, setGroupName] = useState('Group');
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', rollNo: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', rollNo: '' });
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchGroup = async () => {
    try {
      const data = await getGroupById(groupId);
      setGroupName(data.name);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to fetch group');
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await getStudents(groupId);
      setStudents(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to fetch students');
    }
  };

  useEffect(() => {
    if (!groupId) {
      return;
    }

    fetchGroup();
    fetchStudents();
  }, [groupId]);

  const validateStudentData = (data) => {
    const namePattern = /^[A-Za-z ]+$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rollNoPattern = /^\d+$/;

    if (!data.name || !data.name.trim() || !namePattern.test(data.name)) {
      alert('Student name should contain only alphabets and spaces');
      return false;
    }

    if (!data.email || !emailPattern.test(data.email.trim())) {
      alert('Please enter a valid email');
      return false;
    }

    if (!data.rollNo || !rollNoPattern.test(String(data.rollNo).trim())) {
      alert('Roll no. must contain digits only');
      return false;
    }

    return true;
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!validateStudentData(formData)) {
      return;
    }

    try {
      await createStudent(groupId, { ...formData, rollNo: String(formData.rollNo).trim() });
      setFormData({ name: '', email: '', rollNo: '' });
      setShowAddModal(false);
      fetchStudents();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create student');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(groupId, id);
      fetchStudents();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete student');
    }
  };

  const startEdit = (student) => {
    setEditingId(student._id);
    setEditData({
      name: student.name,
      email: student.email,
      rollNo: student.rollNo || ''
    });
  };

  const handleUpdate = async (id) => {
    if (!validateStudentData(editData)) {
      return;
    }

    try {
      await updateStudent(groupId, id, { ...editData, rollNo: String(editData.rollNo).trim() });
      setEditingId(null);
      fetchStudents();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update student');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = await importStudentsFromFile(groupId, file);
      const firstErrors = (result.errors || []).slice(0, 5);
      const summary = [
        `Imported: ${result.importedCount}`,
        `Skipped: ${result.skippedCount}`,
        ...(firstErrors.length > 0 ? ['', 'Sample issues:', ...firstErrors] : [])
      ].join('\n');

      alert(summary);
      fetchStudents();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to import students');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="dashboard students-dashboard">
      <h2>{groupName}</h2>

      <div className="students-toolbar">
        <button className="primary-btn" type="button" onClick={() => setShowAddModal(true)}>
          Add Student
        </button>
        <button className="secondary-btn" type="button" onClick={handleImportClick}>
          Import File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleImportFileChange}
          style={{ display: 'none' }}
        />
        <Link className="secondary-btn" to={`/students/${groupId}/attendance?mode=take`}>
          Take Attendance
        </Link>
        <Link className="secondary-btn" to={`/students/${groupId}/attendance?mode=view`}>
          Past Attendance
        </Link>
      </div>

      <div className="student-list table-wrapper">
        <table className="students-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roll No.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="4">No students found in this group.</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student._id}>
                  {editingId === student._id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          value={editData.email}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editData.rollNo}
                          onChange={(e) => setEditData({ ...editData, rollNo: e.target.value })}
                        />
                      </td>
                      <td className="table-actions">
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => handleUpdate(student._id)}
                        >
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.rollNo || '-'}</td>
                      <td className="table-actions">
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => startEdit(student)}
                        >
                          Edit
                        </button>
                        <button
                          className="danger-btn"
                          type="button"
                          onClick={() => handleDelete(student._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Add Student</h3>
            <form className="modal-form" onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Roll No."
                value={formData.rollNo}
                onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                required
              />
              <div className="modal-actions">
                <button className="primary-btn" type="submit">
                  Add
                </button>
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupStudentsPage;
