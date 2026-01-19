import React, { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import Modal from '../common/Modal';
import ErrorMessage from '../common/ErrorMessage';
import SuccessMessage from '../common/SuccessMessage';
import Input from '../common/Input';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/helpers';

const WithdrawModal = ({ onClose, maxAmount }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { withdraw } = useWallet();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (withdrawAmount > maxAmount) {
      setError(`Insufficient balance. Maximum: ${formatCurrency(maxAmount)}`);
      return;
    }

    setLoading(true);
    const result = await withdraw(withdrawAmount);
    setLoading(false);

    if (result.success) {
      setSuccess(`Successfully withdrew ${formatCurrency(withdrawAmount)}`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(result.error);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Withdraw Funds">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} onClose={() => setError('')} />
        <SuccessMessage message={success} onClose={() => setSuccess('')} />

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">
            Available Balance: {formatCurrency(maxAmount)}
          </p>
        </div>

        <Input
          label="Amount ($)"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          max={maxAmount}
          required
        />

        <button
          type="button"
          onClick={() => setAmount(maxAmount.toString())}
          className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
        >
          Withdraw All
        </button>

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
            {loading ? 'Processing...' : 'Withdraw'}
          </Button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-yellow-800">⏱️ Processed in 24-48 hours</p>
          <p className="text-sm text-yellow-800">🔒 Secure transaction</p>
        </div>
      </form>
    </Modal>
  );
};

export default WithdrawModal;