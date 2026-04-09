import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const profileFields = {
  student: [
    { name: 'enrollmentNumber', label: 'Enrollment Number', type: 'text', required: true },
    { name: 'roomNumber', label: 'Room Number', type: 'text', required: true },
    { name: 'course', label: 'Course', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'text', required: true },
    { name: 'phoneNumber', label: 'Phone Number', type: 'tel', required: true, pattern: '[0-9]{10}' },
    { name: 'emergencyContact', label: 'Emergency Contact', type: 'tel', required: false, pattern: '[0-9]{10}' },
  ],
  warden: [
    { name: 'department', label: 'Department', type: 'text', required: true },
    { name: 'phoneNumber', label: 'Phone Number', type: 'tel', required: true, pattern: '[0-9]{10}' },
  ],
  manager: [
    { name: 'phoneNumber', label: 'Phone Number', type: 'tel', required: true, pattern: '[0-9]{10}' },
  ],
  gatekeeper: [
    { name: 'phoneNumber', label: 'Phone Number', type: 'tel', required: true, pattern: '[0-9]{10}' },
    { name: 'shift', label: 'Shift', type: 'select', required: true, options: ['Morning', 'Evening', 'Night'] },
  ],
};

export default function CompleteProfile() {
  const { role } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const fields = profileFields[role] || [];

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check required fields
    for (const field of fields) {
      if (field.required && !formData[field.name]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setLoading(true);
    try {
      await api.post('/user/profile', formData);
      toast.success('Profile completed!');
      navigate(`/${role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  // Admin/Super-admin don't need profiles
  if (['admin', 'super-admin'].includes(role)) {
    navigate(`/${role}`);
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <UserCircle />
          </div>
          <h1>Complete Your Profile</h1>
          <p>Fill in your details to get started</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {fields.map((field) => (
            <div className="form-group" key={field.name}>
              <label className="form-label" htmlFor={`profile-${field.name}`}>
                {field.label}
                {field.required && <span style={{ color: 'var(--danger)' }}> *</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  id={`profile-${field.name}`}
                  className="form-select"
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`profile-${field.name}`}
                  type={field.type}
                  className="form-input"
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  pattern={field.pattern}
                />
              )}
            </div>
          ))}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} /> : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
