import React, { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import Modal from '../common/Modal';
import ErrorMessage from '../common/ErrorMessage';
import SuccessMessage from '../common/SuccessMessage';
import Input from '../common/Input';
import Button from '../common/Button';

const DepositModal = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { deposit } = useWallet();

  const quickAmounts = [10, 50, 100, 500, 1000];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const depositAmount = parseFloat(amount);

    if (depositAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    const result = await deposit(depositAmount);
    setLoading(false);

    if (result.success) {
      setSuccess(`Successfully deposited $${depositAmount.toFixed(2)}`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(result.error);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Deposit Funds">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} onClose={() => setError('')} />
        <SuccessMessage message={success} onClose={() => setSuccess('')} />

        <Input
          label="Amount ($)"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          required
        />

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Quick amounts:</p>
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt.toString())}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Processing...' : 'Deposit'}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-800">💡 Funds are added instantly</p>
          <p className="text-sm text-blue-800">🔒 All transactions are secure</p>
        </div>
      </form>
    </Modal>
  );
};

export default DepositModal;