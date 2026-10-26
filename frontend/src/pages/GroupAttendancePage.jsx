import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getAttendanceHistory, takeAttendance } from '../api/attendance.api';
import { getGroupById } from '../api/group.api';
import { getStudents } from '../api/student.api';

function GroupAttendancePage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const isTakeMode = searchParams.get('mode') === 'take';
  const [groupName, setGroupName] = useState('Group');
  const [students, setStudents] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [todayDraft, setTodayDraft] = useState({});
  const [aiAssistant, setAiAssistant] = useState(null);

  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

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
      return data;
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to fetch students');
      return [];
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const data = await getAttendanceHistory(groupId);
      setAttendanceHistory(data);
      return data;
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to fetch attendance history');
      return [];
    }
  };

  useEffect(() => {
    if (!groupId) {
      return;
    }

    const init = async () => {
      await fetchGroup();
      const studentsData = await fetchStudents();
      const historyData = await fetchAttendanceHistory();

      if (isTakeMode) {
        const todayRecord = historyData.find((record) => record.date === todayDate);
        const todayMap = {};

        studentsData.forEach((student) => {
          const existing = todayRecord?.entries?.find(
            (entry) => String(entry.studentId) === String(student._id)
          );
          todayMap[student._id] = existing?.status || 'present';
        });

        setTodayDraft(todayMap);
      } else {
        setTodayDraft({});
      }
    };

    init();
  }, [groupId, todayDate, isTakeMode]);

  const pastDateColumns = useMemo(() => {
    const allRecordedDates = attendanceHistory
      .map((record) => record.date)
      .sort((a, b) => new Date(a) - new Date(b));
    return isTakeMode
      ? allRecordedDates.filter((date) => date !== todayDate)
      : allRecordedDates;
  }, [attendanceHistory, todayDate, isTakeMode]);

  const attendanceByDateAndStudent = useMemo(() => {
    const map = {};

    attendanceHistory.forEach((record) => {
      map[record.date] = {};
      record.entries.forEach((entry) => {
        if (entry.studentId) {
          map[record.date][entry.studentId] = entry.status;
        }
      });
    });

    return map;
  }, [attendanceHistory]);

  const studentAbsenceStats = useMemo(() => {
    const statsMap = {};

    students.forEach((student) => {
      statsMap[student._id] = { total: 0, absent: 0, absentRate: 0 };
    });

    attendanceHistory.forEach((record) => {
      record.entries.forEach((entry) => {
        if (!entry.studentId || !statsMap[entry.studentId]) {
          return;
        }

        statsMap[entry.studentId].total += 1;
        if (entry.status === 'absent') {
          statsMap[entry.studentId].absent += 1;
        }
      });
    });

    if (isTakeMode) {
      students.forEach((student) => {
        const studentId = student._id;
        const draftStatus = todayDraft[studentId] || 'present';
        const todayStatusFromHistory = attendanceByDateAndStudent?.[todayDate]?.[studentId];

        if (todayStatusFromHistory) {
          if (todayStatusFromHistory === 'absent') {
            statsMap[studentId].absent -= 1;
          }
          if (draftStatus === 'absent') {
            statsMap[studentId].absent += 1;
          }
        } else {
          statsMap[studentId].total += 1;
          if (draftStatus === 'absent') {
            statsMap[studentId].absent += 1;
          }
        }
      });
    }

    Object.keys(statsMap).forEach((studentId) => {
      const studentStats = statsMap[studentId];
      studentStats.absentRate =
        studentStats.total > 0 ? (studentStats.absent / studentStats.total) * 100 : 0;
    });

    return statsMap;
  }, [students, attendanceHistory, isTakeMode, todayDraft, attendanceByDateAndStudent, todayDate]);

  const toggleTodayStatus = (studentId) => {
    setTodayDraft((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSubmitAttendance = async () => {
    if (students.length === 0) {
      alert('No students in this group to take attendance');
      return;
    }

    const entries = students.map((student) => ({
      studentId: student._id,
      status: todayDraft[student._id] || 'present'
    }));

    try {
      const response = await takeAttendance(groupId, entries, todayDate);
      const historyData = await fetchAttendanceHistory();
      setAiAssistant(response.aiAssistant || null);

      const todayRecord = historyData.find((record) => record.date === todayDate);
      const todayMap = {};
      students.forEach((student) => {
        const existing = todayRecord?.entries?.find((entry) => String(entry.studentId) === String(student._id));
        todayMap[student._id] = existing?.status || 'present';
      });
      setTodayDraft(todayMap);

    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  return (
    <div className="dashboard attendance-dashboard">
      <div className="attendance-header-row">
        <h2>{groupName} Attendance</h2>
        <Link className="secondary-btn" to={`/students/${groupId}`}>
          Back to Students
        </Link>
      </div>

      <div className="attendance-table-wrapper">
        <table className="attendance-sheet-table">
          <thead>
            <tr>
              <th>Roll No.</th>
              <th>Student Name</th>
              {pastDateColumns.map((date) => (
                <th key={date}>{date}</th>
              ))}
              {isTakeMode && <th>{todayDate}</th>}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={pastDateColumns.length + (isTakeMode ? 3 : 2)}>
                  No students found in this group.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student._id}>
                  <td>{student.rollNo || '-'}</td>
                  <td>
                    <div className="student-name-cell">
                      <span>{student.name}</span>
                      {studentAbsenceStats[student._id]?.total > 0 &&
                        studentAbsenceStats[student._id]?.absentRate >= 50 && (
                          <span className="risk-badge" title="50% or more absences">
                            🔴
                          </span>
                        )}
                    </div>
                  </td>
                  {pastDateColumns.map((date) => {
                    const status = attendanceByDateAndStudent?.[date]?.[student._id] || '-';
                    return (
                      <td key={`${student._id}-${date}`}>
                        {status === '-' ? (
                          '-'
                        ) : (
                          <span
                            className={`attendance-badge ${
                              status === 'present' ? 'attendance-present' : 'attendance-absent'
                            }`}
                          >
                            {status}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {isTakeMode && (
                    <td>
                      <button
                        className={`toggle-attendance-btn ${
                          (todayDraft[student._id] || 'present') === 'present'
                            ? 'attendance-present-btn'
                            : 'attendance-absent-btn'
                        }`}
                        type="button"
                        onClick={() => toggleTodayStatus(student._id)}
                      >
                        {todayDraft[student._id] || 'present'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isTakeMode && (
        <div className="attendance-actions-row">
          <button className="primary-btn" type="button" onClick={handleSubmitAttendance}>
            Save Attendance
          </button>
        </div>
      )}

      {isTakeMode && aiAssistant && (
        <div className="attendance-ai-card">
          <h3>AI Attendance Assistant</h3>
          <p>
            Today: {aiAssistant.summary.presentCount} present, {aiAssistant.summary.absentCount} absent (
            {aiAssistant.summary.absentPercent}% absent)
          </p>
          <ul className="attendance-ai-list">
            {aiAssistant.insights.map((insight, index) => (
              <li key={`${index}-${insight}`}>{insight}</li>
            ))}
          </ul>
          {aiAssistant.repeatedAbsentees.length > 0 && (
            <div className="attendance-ai-repeat">
              <strong>Repeated Absentees:</strong>
              <ul className="attendance-ai-list">
                {aiAssistant.repeatedAbsentees.map((student) => (
                  <li key={String(student.studentId)}>
                    {student.studentName} - {student.absentDays} absent days
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GroupAttendancePage;
