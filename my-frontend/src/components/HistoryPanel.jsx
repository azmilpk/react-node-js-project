import { useEffect, useState } from 'react';
import { API_BASE_URL, authFetch } from '../config/api';

function HistoryPanel({ tableName, recordId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (recordId) {
      fetchHistory();
    }
  }, [recordId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await authFetch(
        `${API_BASE_URL}/api/audit/${tableName}/${recordId}`
      );
      const result = await response.json();
      setHistory(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Fetch history error:', error.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 text-center text-[13px] text-black/60">
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[13px] text-black/60">
        No history yet for this entry.
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-black text-white sticky top-0">
            <th className="px-3 py-2 text-left text-[12px] font-semibold">Field</th>
            <th className="px-3 py-2 text-left text-[12px] font-semibold">Old Value</th>
            <th className="px-3 py-2 text-left text-[12px] font-semibold">New Value</th>
            <th className="px-3 py-2 text-left text-[12px] font-semibold">Changed By</th>
            <th className="px-3 py-2 text-left text-[12px] font-semibold">Changed At</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.Id} className="border-b border-black/10">
              <td className="px-3 py-2 text-[12px] text-black font-medium">
                {row.FieldName}
              </td>
              <td className="px-3 py-2 text-[12px] text-black/70">
                {row.OldValue || '-'}
              </td>
              <td className="px-3 py-2 text-[12px] text-black">
                {row.NewValue || '-'}
              </td>
              <td className="px-3 py-2 text-[12px] text-black">
                {row.ChangedBy || 'Unknown User'}
              </td>
              <td className="px-3 py-2 text-[12px] text-black/60">
                {row.ChangedAt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryPanel;