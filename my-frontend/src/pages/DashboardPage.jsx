import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { authFetch, API_BASE_URL, getToken } from '../config/api';

function DashboardPage() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [sites, setSites] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [summary, setSummary] = useState({ total: 0, withFile: 0, withoutFile: 0 });
  const [loading, setLoading] = useState(true);

  const [siteFilter, setSiteFilter] = useState('');
  const [utilityFilter, setUtilityFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [previewFile, setPreviewFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchSites();
    fetchUtilities();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [siteFilter, utilityFilter, monthFilter, yearFilter, statusFilter]);

  const fetchSites = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/dashboard/sites`);
      const data = await response.json();
      setSites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Sites fetch error:', error.message);
    }
  };

  const fetchUtilities = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/dashboard/utilities`);
      const data = await response.json();
      setUtilities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Utilities fetch error:', error.message);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (siteFilter) params.append('siteId', siteFilter);
      if (utilityFilter) params.append('utilityTypeId', utilityFilter);
      if (monthFilter) params.append('month', monthFilter);
      if (yearFilter) params.append('year', yearFilter);
      if (statusFilter) params.append('botStatus', statusFilter);

      const response = await authFetch(
        `${API_BASE_URL}/api/dashboard?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch');

      setEntries(data.entries || []);
      setSummary(data.summary || { total: 0, withFile: 0, withoutFile: 0 });

    } catch (error) {
      console.error('Dashboard fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSiteFilter('');
    setUtilityFilter('');
    setMonthFilter('');
    setYearFilter('');
    setStatusFilter('');
  };

    const handlePreview = (row) => {
    const previewUrl = `${API_BASE_URL}/api/files/view?blobUrl=${encodeURIComponent(row.PdfFile)}&token=${getToken()}`;
    setPreviewFile({ ...row, previewUrl });
    setPreviewOpen(true);
  };

  const getFileType = (url = '') => {
    const lower = url.toLowerCase();
    if (lower.includes('.pdf')) return 'pdf';
    if (
      lower.includes('.png') ||
      lower.includes('.jpg') ||
      lower.includes('.jpeg') ||
      lower.includes('.webp')
    ) return 'image';
    return 'unknown';
  };

  const yearOptions = useMemo(() => {
    const years = [...new Set(
      entries
        .map((r) => (r.PostingDateMonth || '').split('-')[0])
        .filter(Boolean)
    )].sort().reverse();
    return years;
  }, [entries]);

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        <section className="w-full max-w-[1450px] mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold text-black">
              Invoice Dashboard
            </h1>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
            >
              Go Back
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-[18px] shadow-sm p-5 text-center">
              <div className="text-[36px] font-bold text-black">
                {summary.total}
              </div>
              <div className="text-[13px] text-black/50 mt-1">
                Total Entries
              </div>
            </div>

            <div className="bg-white rounded-[18px] shadow-sm p-5 text-center">
              <div className="text-[36px] font-bold text-green-600">
                {summary.withFile}
              </div>
              <div className="text-[13px] text-black/50 mt-1">
                Invoice Uploaded
              </div>
            </div>

            <div className="bg-white rounded-[18px] shadow-sm p-5 text-center">
              <div className="text-[36px] font-bold text-red-500">
                {summary.withoutFile}
              </div>
              <div className="text-[13px] text-black/50 mt-1">
                No Invoice
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-[18px] shadow-sm p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">

              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Site
                </label>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-3 bg-white text-[13px] outline-none"
                >
                  <option value="">All Sites</option>
                  {sites.map((s) => (
                    <option key={s.Id} value={s.Id}>
                      {s.SiteName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Utility
                </label>
                <select
                  value={utilityFilter}
                  onChange={(e) => setUtilityFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-3 bg-white text-[13px] outline-none"
                >
                  <option value="">All Utilities</option>
                  {utilities.map((u) => (
                    <option key={u.Id} value={u.Id}>
                      {u.UtilityName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Month
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-3 bg-white text-[13px] outline-none"
                >
                  <option value="">All Months</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-3 bg-white text-[13px] outline-none"
                >
                  <option value="">All Years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full h-[42px] rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
                >
                  Reset Filter
                </button>
              </div>

            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[18px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Site</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Utility</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Data Source</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Invoice File</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-[13px] text-black/50">
                        Loading...
                      </td>
                    </tr>
                  ) : entries.length > 0 ? (
                    entries.map((row) => (
                      <tr key={row.Id} className="border-b border-black/10 hover:bg-black/5">
                        <td className="px-4 py-4 text-[13px] text-black">
                          {row.SiteName || row.Site || '-'}
                        </td>
                        <td className="px-4 py-4 text-[13px] text-black">
                          {row.UtilityName || '-'}
                        </td>
                        <td className="px-4 py-4 text-[13px] text-black">
                          {row.DataSource || '-'}
                        </td>
                        <td className="px-4 py-4">
                          {row.hasFile ? (
                            <button
                              type="button"
                              onClick={() => handlePreview(row)}
                              className="inline-flex items-center gap-2 h-[32px] px-3 rounded-full bg-green-600 text-white text-[12px] font-semibold hover:bg-green-700 transition duration-300"
                            >
                              <span className="w-2 h-2 rounded-full bg-white"></span>
                              View Invoice
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-2 h-[32px] px-3 rounded-full bg-red-100 text-red-600 text-[12px] font-semibold">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              No File
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-[13px] text-black/50">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>
      </main>

      {/* File Preview Modal */}
      {previewOpen && previewFile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-[20px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <div>
                <h2 className="text-[18px] font-bold text-black">
                  Invoice Preview
                </h2>
                <p className="text-[13px] text-black/50">
                  {previewFile.SiteName || previewFile.Site} —
                  {previewFile.UtilityName} —
                  {previewFile.PostingDateMonth}
                </p>
                <p className="text-[12px] text-black/40 mt-1">
                  Data Source: {previewFile.DataSource || '-'} |
                  Invoice No: {previewFile.InvoiceNo || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewOpen(false);
                  setPreviewFile(null);
                }}
                className="min-w-[100px] h-[38px] px-4 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 transition"
              >
                Close
              </button>
            </div>

            <div className="p-4 h-[75vh] overflow-auto bg-[#f8f8f8]">
              {getFileType(previewFile.PdfFile) === 'pdf' ? (
                <iframe
                  src={previewFile.previewUrl}
                  title="Invoice Preview"
                  className="w-full h-full min-h-[70vh] rounded-[12px] border border-black/10 bg-white"
                />
              ) : getFileType(previewFile.PdfFile) === 'image' ? (
                <img
                  src={previewFile.previewUrl}
                  alt="Invoice"
                  className="max-w-full max-h-full mx-auto rounded-[12px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-black/50">
                  <p className="mb-3">Preview not supported for this file type.</p>
                  <a
                    href={previewFile.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition"
                  >
                    Open File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;