import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGroup, deleteGroup, getGroups } from '../api/group.api';

function StudentsPage() {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');

  const fetchGroups = async () => {
    try {
      const data = await getGroups();
      setGroups(data);
    } catch (error) {
      alert('Failed to fetch groups');
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      alert('Group name is required');
      return;
    }

    try {
      await createGroup(trimmedName);
      setGroupName('');
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const confirmDelete = window.confirm(
      'Delete this group? All students in this group will also be deleted.'
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteGroup(groupId);
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete group');
    }
  };

  return (
    <div className="dashboard groups-dashboard">
      <h2>Groups</h2>

      <form className="group-form" onSubmit={handleCreateGroup}>
        <input
          className="input-field"
          type="text"
          placeholder="Enter group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
        />
        <button className="primary-btn" type="submit">
          Add Group
        </button>
      </form>

      <div className="groups-list">
        {groups.length === 0 ? (
          <p>No groups found. Add your first group.</p>
        ) : (
          groups.map((group) => (
            <div key={group._id} className="group-item">
              <Link className="group-btn" to={`/students/${group._id}`}>
                {group.name}
              </Link>
              <button
                className="danger-btn"
                type="button"
                onClick={() => handleDeleteGroup(group._id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StudentsPage;
