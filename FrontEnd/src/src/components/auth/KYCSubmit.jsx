import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import ErrorMessage from '../common/ErrorMessage';
import Input from '../common/Input';
import Button from '../common/Button';
import { DOCUMENT_TYPES } from '../../utils/constants';

const KYCSubmit = () => {
  const [formData, setFormData] = useState({
    document_type: 'aadhar',
    document_number: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await authAPI.submitKYC(formData);
      navigate('/pending-verification');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-3xl font-bold text-gray-900">KYC Verification</h2>
          <p className="mt-2 text-gray-600">Submit your identity documents</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorMessage message={error} onClose={() => setError('')} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Document Type <span className="text-red-600">*</span>
            </label>
            <select
              name="document_type"
              value={formData.document_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={DOCUMENT_TYPES.AADHAR}>Aadhar Card</option>
              <option value={DOCUMENT_TYPES.PAN}>PAN Card</option>
            </select>
          </div>

          <Input
            label="Document Number"
            type="text"
            name="document_number"
            value={formData.document_number}
            onChange={handleChange}
            required
            placeholder={formData.document_type === 'aadhar' ? '1234-5678-9012' : 'ABCDE1234F'}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit KYC'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your documents will be reviewed within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KYCSubmit;