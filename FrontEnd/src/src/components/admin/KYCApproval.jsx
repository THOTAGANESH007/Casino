import React, { useState, useEffect } from "react";
import { adminAPI } from "../../api/admin";
import Loading from "../common/Loading";
import ErrorMessage from "../common/ErrorMessage";
import SuccessMessage from "../common/SuccessMessage";
import Button from "../common/Button";
import axios from "axios"; // Added axios import

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
    if (
      !window.confirm(
        "Approve this KYC? Even if details don't match OCR, this will activate the user.",
      )
    )
      return;
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
    if (reason === null) return; // Cancelled
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
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Pending KYC Approvals (PDF Verification)
      </h2>

      <ErrorMessage message={error} onClose={() => setError("")} />
      <SuccessMessage message={success} onClose={() => setSuccess("")} />

      {kycList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 text-lg">No pending KYC verifications</p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  User / Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Document Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kycList.map((kyc) => (
                <KYCRow
                  key={kyc.kyc_id}
                  kyc={kyc}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * SUB-COMPONENT FOR INDIVIDUAL ROW LOGIC
 */
const KYCRow = ({ kyc, onApprove, onReject }) => {
  const [parsedNo, setParsedNo] = useState(kyc.parsed_number || "");
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    setIsParsing(true);
    try {
      const res = await adminAPI.parseKYC(kyc.kyc_id);
      setParsedNo(res?.extracted_number);
    } catch (err) {
      alert(
        "OCR Parsing failed. You can still manually review the PDF and Accept.",
      );
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div className="text-sm font-bold text-gray-900">{kyc.user_name}</div>
        <div className="text-xs text-gray-500 mb-2">{kyc.email}</div>
        <a
          href={kyc.document_url}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:text-indigo-900 text-xs font-bold underline flex items-center gap-1"
        >
          📄 View Uploaded PDF
        </a>
      </td>

      <td className="px-6 py-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase font-semibold">
            Type: {kyc.document_type}
          </p>
          <div className="bg-gray-100 p-2 rounded border border-gray-200">
            <p className="text-xs text-gray-600">User Entered:</p>
            <p className="font-mono text-sm font-bold">{kyc.document_number}</p>
          </div>
          <div className="bg-purple-50 p-2 rounded border border-purple-200">
            <p className="text-xs text-purple-600">OCR Parsed Result:</p>
            <p className="font-mono text-sm font-bold text-purple-800">
              {parsedNo || (isParsing ? "Scanning..." : "Not scanned")}
            </p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap space-y-2">
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleParse}
            variant="secondary"
            size="sm"
            disabled={isParsing}
            className="w-full"
          >
            {isParsing ? "Parsing..." : "Run OCR Parser"}
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={() => onApprove(kyc.kyc_id)}
              variant="success"
              size="sm"
              className="flex-1"
            >
              Accept
            </Button>
            <Button
              onClick={() => onReject(kyc.kyc_id)}
              variant="danger"
              size="sm"
              className="flex-1"
            >
              Reject
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default KYCApproval;
