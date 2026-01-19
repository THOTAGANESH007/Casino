import React, { useState, useEffect } from "react";
import { adminAPI } from "../../api/admin";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";

const KYCApproval = () => {
  const [kycList, setKycList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  const fetchPendingKYC = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getPendingKYC();
      setKycList(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch pending KYC");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (kycId) => {
    if (!window.confirm("Approve this KYC?")) return;

    try {
      await adminAPI.approveKYC(kycId);
      setSuccess("KYC approved successfully");
      fetchPendingKYC();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to approve KYC");
    }
  };

  const handleReject = async (kycId) => {
    const reason = window.prompt("Enter rejection reason (optional):");

    try {
      await adminAPI.rejectKYC(kycId, reason);
      setSuccess("KYC rejected");
      fetchPendingKYC();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to reject KYC");
    }
  };

  if (loading) return <Loading message="Loading pending KYC..." />;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Pending KYC Approvals
      </h2>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {kycList.length === 0 ? (
        <div className="text-center py-12">
          {/* <div className="text-6xl mb-4"></div> */}
          <p className="text-gray-600 text-lg">No pending KYC verifications</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KYC ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kycList.map((kyc) => (
                <tr key={kyc.kyc_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{kyc.kyc_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {kyc.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {kyc.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="badge-info">{kyc.document_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {kyc.document_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <Button
                      onClick={() => handleApprove(kyc.kyc_id)}
                      variant="success"
                      size="sm"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(kyc.kyc_id)}
                      variant="danger"
                      size="sm"
                    >
                      ✗ Reject
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KYCApproval;
