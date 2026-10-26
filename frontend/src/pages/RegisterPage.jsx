import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth.api';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const namePattern = /^[A-Za-z ]+$/;

    if (!name.trim() || !namePattern.test(name)) {
      alert('Name should contain only alphabets and spaces');
      return;
    }

    if (/\s/.test(password)) {
      alert('Password must not contain spaces');
      return;
    }

    if (password.length < 6) {
      alert('Please enter password at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      alert('Password and confirm password must match');
      return;
    }

    try {
      await register(name, email, password);
      navigate('/login');
    } catch (error) {
      alert('Registration failed');
    }
  };

  return (
    <div className="auth-container">
      <img src="ThaparMS.png" className="auth-logo" />
      <div className="auth-card">
        <form onSubmit={handleSubmit}>
          <h1>Register</h1>
          <div>
            <label htmlFor="name">Name</label>
            <input
              className="input-field"
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              pattern="[A-Za-z ]+"
              title="Name should contain only alphabets and spaces"
              required
            />
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input
              className="input-field"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              className="input-field"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              className="input-field"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button className="primary-btn" type="submit">
            Register
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;


