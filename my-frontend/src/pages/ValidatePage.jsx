import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import HistoryPanel from '../components/HistoryPanel';
import { getCurrentUserName, getCurrentUserRole } from '../utils/currentUser';
import { unitForUtility } from '../utils/units';
import { API_BASE_URL } from '../config/api';

function ValidatePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedFacility = location.state?.facility || '';
  const selectedSite = location.state?.site || '';
  const selectedEntry =
    location.state?.entry ||
    (selectedFacility && selectedSite
      ? `${selectedFacility}-${selectedSite}`
      : selectedSite || selectedFacility || 'All Facilities');

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [utilityFilter, setUtilityFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');

  const [previewFile, setPreviewFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [historyRow, setHistoryRow] = useState(null);

  const userRole = getCurrentUserRole();
  const isAuditor = userRole === 'Auditor';

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/form-entries`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch entries');
      }

      const mappedData = result.map((item) => {
        const siteCode = item.SiteCode || item.siteCode || '';
        const facilityCode =
          item.FacilityCode ||
          item.facilityCode ||
          selectedFacility ||
          '';

        return {
          Id: item.Id || item.id,
          id: item.Id || item.id,
          entryNumber: item.EntryNumber || item.entryNumber,
          utility:
            item.UtilityName ||
            item.utilityName ||
            item.UtilityCode ||
            item.utilityCode ||
            '-',
          utilityCode: item.UtilityCode || item.utilityCode || '',
          facility: facilityCode || siteCode || '-',
          site: siteCode || '-',
          facilityCode,
          siteCode,
          accountMeterNo: item.AccountMeterNo || item.accountMeterNo || '-',
          consumption: item.Consumption || item.consumption || '-',
          units: item.Units || item.units || unitForUtility(item.UtilityName || item.utilityName || item.UtilityCode || item.utilityCode),
          recordDate: item.PostingMonth || item.postingMonth || '-',
          postingMonth: item.PostingMonth || item.postingMonth || '-',
          status: item.Status || item.status || 'Pending',
          fileName: item.FileName || item.fileName || 'No file uploaded',
          fileUrl: item.FileUrl || item.fileUrl || '',
          comment: item.Comment || item.comment || '',
          entry: item.EntryName || item.entryName || '',
        };
      });

      setTableData(mappedData);
    } catch (error) {
      console.error('Fetch entries error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const [year, month] = (row.recordDate || '').split('-');

      const normalizedSelectedSite = (selectedSite || '').trim().toLowerCase();
      const rowSite = (row.site || '').trim().toLowerCase();

      const matchSite =
        !selectedSite || rowSite === normalizedSelectedSite;

      const matchUtility = !utilityFilter || row.utility === utilityFilter;
      const matchMonth = !monthFilter || month === monthFilter;
      const matchYear = !yearFilter || year === yearFilter;
      const matchStatus = !statusFilter || row.status === statusFilter;

      return (
        matchSite &&
        matchUtility &&
        matchMonth &&
        matchYear &&
        matchStatus
      );
    });
  }, [tableData, selectedSite, utilityFilter, monthFilter, yearFilter, statusFilter]);

 const totalConsumption = filteredData.reduce((sum, row) => {
  const value = Number(row.consumption);
  return sum + (Number.isFinite(value) ? value : 0);
}, 0);

  // Köping values are shown with at most 3 decimals; other sites keep their raw value.
  const formatConsumption = (row) => {
    const site = (row.site || '').trim().toLowerCase();
    const isKoping = site === 'köping' || site === 'koping';
    const value = Number(row.consumption);
    if (!isKoping || !Number.isFinite(value)) return row.consumption;
    return Math.round(value * 1000) / 1000;
  };

  const handleReset = () => {
    setUtilityFilter('');
    setMonthFilter('');
    setYearFilter('');
    setStatusFilter('Pending');
  };

  const handleValidate = (row) => {
    navigate('/validate-details', {
      state: {
        selectedEntry: row,
        selectedSite,
        selectedFacility,
        selectedEntryLabel: selectedEntry,
      },
    });
  };

  const handleOpenValidateDetails = (row) => {
    if (
      row.status !== 'Validated' &&
      row.status !== 'Modified and Validated'
    ) {
      return;
    }

    navigate('/validate-details', {
      state: {
        selectedEntry: row,
        selectedSite,
        selectedFacility,
        selectedEntryLabel: selectedEntry,
      },
    });
  };

  const getFileType = (url = '', name = '') => {
    const value = `${url} ${name}`.toLowerCase();

    if (
      value.includes('.png') ||
      value.includes('.jpg') ||
      value.includes('.jpeg') ||
      value.includes('.gif') ||
      value.includes('.webp')
    ) {
      return 'image';
    }

    if (value.includes('.pdf')) {
      return 'pdf';
    }

    return 'unknown';
  };

  const isExcelFile = (url = '', name = '') => {
    const value = `${url} ${name}`.toLowerCase();

    return (
      value.includes('.xlsx') ||
      value.includes('.xls') ||
      value.includes('.csv')
    );
  };

  const handleDownload = (row) => {
    if (!row.fileUrl) {
      alert('No file available');
      return;
    }

    const previewUrl = `${API_BASE_URL}/api/files/view?blobUrl=${encodeURIComponent(
      row.fileUrl
    )}`;

    if (isExcelFile(row.fileUrl, row.fileName)) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setPreviewFile({
      ...row,
      previewUrl,
    });
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  const handleGenerateUlPure = async () => {
    setConfirmOpen(false);
    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ul-pure-entries/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site: selectedSite,
          status: 'Modified and Validated',
          changedBy: getCurrentUserName(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate UL Pure data');
      }

      alert(result.message || 'Modified and Validated entries moved successfully');

      navigate('/ul-pure', {
        state: {
          facility: selectedFacility,
          site: selectedSite,
          entry: selectedEntry,
        },
      });
    } catch (error) {
      console.error('Generate UL Pure error:', error.message);
      alert(error.message || 'Failed to generate UL Pure data');
    } finally {
      setGenerating(false);
    }
  };

  const utilityOptions = [...new Set(filteredData.map((row) => row.utility).filter(Boolean))];

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        <section className="w-full max-w-[1450px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black">
              Validate Data - {selectedEntry || selectedSite || 'All Facilities'}
            </h1>

            <button
              type="button"
              onClick={() => navigate('/site-owner')}
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
            >
              Go Back
            </button>
          </div>

          <div className="bg-white rounded-[18px] shadow-sm p-4 mb-6">
            <div className="grid grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Utility
                </label>
                <select
                  value={utilityFilter}
                  onChange={(e) => setUtilityFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="">Find items</option>
                  {utilityOptions.map((utility) => (
                    <option key={utility} value={utility}>
                      {utility}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Record Month
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="">Find items</option>
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
                  Record Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="">Find items</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Validated">Validated</option>
                  <option value="Modified and Validated">Modified and Validated</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[18px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Utility</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Facility</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Account/Meter No</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Consumption</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Units</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Record Date</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Check Status</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">
                      {isAuditor ? 'History' : 'Validate Data'}
                    </th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">History</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Download File</th>
                    
                    </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center text-[13px] text-black/60">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((row) => (
                      <tr key={row.id} className="border-b border-black/10">
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.facility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.accountMeterNo}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{formatConsumption(row)}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.units}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.recordDate}</td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleOpenValidateDetails(row)}
                            disabled={row.status !== 'Validated' && row.status !== 'Modified and Validated'}
                            className={`inline-flex items-center justify-center min-w-[90px] h-[32px] px-3 rounded-full text-[12px] font-semibold transition duration-300 ${
                              row.status === 'Validated'
                                ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                                : row.status === 'Modified and Validated'
                                ? 'bg-gray-600 text-white cursor-default'
                                : row.status === 'Rejected'
                                ? 'bg-red-500 text-white cursor-default'
                                : 'bg-[#f4b400] text-black cursor-default'
                            }`}
                          >
                            {row.status}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          {isAuditor ? (
                            <button
                              type="button"
                              onClick={() => setHistoryRow(row)}
                              className="h-[34px] px-4 rounded-full border border-black/20 text-black text-[12px] font-semibold hover:bg-black hover:text-white transition duration-300"
                            >
                              History
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleValidate(row)}
                              disabled={
                                row.status === 'Validated' ||
                                row.status === 'Modified and Validated'
                              }
                              className="h-[34px] px-4 rounded-full bg-[#0078d4] text-white text-[12px] font-semibold hover:bg-[#0062ad] transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Validate
                            </button>
                          )}
                        </td>

                          <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setHistoryRow(row)}
                            className="h-[34px] px-4 rounded-full border border-black/20 text-black text-[12px] font-semibold hover:bg-black hover:text-white transition duration-300"
                          >
                            History
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleDownload(row)}
                            className="h-[34px] px-4 rounded-full border border-black/20 text-black text-[12px] font-semibold hover:bg-black hover:text-white transition duration-300"
                          >
                            View File
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-4 py-8 text-center text-[13px] text-black/60">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 border-t border-black/10">
              <div className="text-[14px] font-semibold text-black">
                Total Consumption : {totalConsumption}
              </div>

              {!isAuditor && (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={generating}
                  className="h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300 self-start sm:self-auto disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating…' : 'Generate ULpure Data'}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[20px] shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-black/10">
              <h2 className="text-[18px] font-bold text-black">Generate UL Pure?</h2>
            </div>
            <div className="px-6 py-5 text-[14px] text-black/70 leading-relaxed">
              This will run the UL Pure calculation for
              <span className="font-semibold text-black">
                {' '}
                {selectedSite || 'all sites'}
              </span>
              . All entries must be validated and at least two months of data are
              required. Do you want to continue?
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/10">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={generating}
                className="h-[40px] px-5 rounded-full border border-black/20 text-black text-[13px] font-semibold hover:bg-black/5 transition duration-300 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateUlPure}
                disabled={generating}
                className="h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating…' : 'Yes, Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewOpen && previewFile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-[20px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <div>
                <h2 className="text-[18px] font-bold text-black">File Preview</h2>
                <p className="text-[13px] text-black/60">
                  {previewFile.fileName || 'Uploaded file'}
                </p>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="min-w-[100px] h-[38px] px-4 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 transition duration-300"
              >
                Close
              </button>
            </div>

            <div className="p-4 h-[75vh] overflow-auto bg-[#f8f8f8]">
              {getFileType(previewFile.fileUrl, previewFile.fileName) === 'image' ? (
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.fileName || 'Uploaded preview'}
                  className="max-w-full max-h-full mx-auto rounded-[12px]"
                />
              ) : getFileType(previewFile.fileUrl, previewFile.fileName) === 'pdf' ? (
                <iframe
                  src={previewFile.previewUrl}
                  title="PDF Preview"
                  className="w-full h-full min-h-[70vh] rounded-[12px] border border-black/10 bg-white"
                />
              ) : (
                <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center text-center text-black/60">
                  <p className="mb-3">Preview is not supported for this file type.</p>
                  <a
                    href={previewFile.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
                  >
                    Open File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {historyRow && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-[20px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <div>
                <h2 className="text-[18px] font-bold text-black">Change History</h2>
                <p className="text-[13px] text-black/60">
                  {historyRow.utility} — {historyRow.facility}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryRow(null)}
                className="min-w-[100px] h-[38px] px-4 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 transition duration-300"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              <HistoryPanel tableName="GtoInvoices" recordId={historyRow.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ValidatePage; // hai