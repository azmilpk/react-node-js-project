import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import HistoryPanel from '../components/HistoryPanel';
import { getCurrentUserName } from '../utils/currentUser';
import { unitForUtility } from '../utils/units';

function AuditorValidatePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedUtility = location.state?.utility || '';
  const selectedSite = location.state?.site || '';

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reviewedIds, setReviewedIds] = useState(new Set());

  const [historyRow, setHistoryRow] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);
  const fetchEntries = async () => {
    try {
      setLoading(true);

      const response = await fetch('http://localhost:5000/api/ul-pure-entries');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch entries');
      }

      const mappedData = result.map((item) => {
        const site =
          item.FacilityCode ||
          item.facilityCode ||
          item.SiteCode ||
          item.siteCode ||
          '-';

        return {
          Id: item.Id || item.id,
          id: item.Id || item.id,
          entryNumber: item.EntryNumber || item.entryNumber,
          site,
          siteCode: item.SiteCode || item.siteCode || '',
          utility:
            item.UtilityName ||
            item.utilityName ||
            item.UtilityCode ||
            item.utilityCode ||
            '-',
          accountMeterNo: item.AccountMeterNo || item.accountMeterNo || '-',
          consumption: item.Consumption || item.consumption || '-',
          units: item.Units || item.units || unitForUtility(item.Utility || item.utility),
          postingMonth: item.PostingMonth || item.postingMonth || '-',
          status: item.Status || item.status || 'Validate',
          fileName: item.FileName || item.fileName || 'No file uploaded',
          fileUrl: item.FileUrl || item.fileUrl || '',
          comment: item.Comment || item.comment || '',
          reviewStatus: item.ReviewStatus || item.reviewStatus || 'Not Reviewed',
        };
      });

         setTableData(mappedData);
      setReviewedIds(
        new Set(
          mappedData
            .filter((r) => r.reviewStatus === 'Reviewed')
            .map((r) => r.id)
        )
      );
    } catch (error) {
      console.error('Fetch entries error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const matchUtility = !selectedUtility || row.utility === selectedUtility;
      const matchSite = !selectedSite || row.site === selectedSite;
      return matchUtility && matchSite;
    });
  }, [tableData, selectedUtility, selectedSite]);

  const totalConsumption = filteredData.reduce((sum, row) => {
    return sum + Number(row.consumption || 0);
  }, 0);

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

    const markReviewed = async (row) => {
    setReviewedIds((prev) => new Set(prev).add(row.id));
    try {
      await fetch(
        `http://localhost:5000/api/ul-pure-entries/${row.id}/review`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewedBy: getCurrentUserName() }),
        }
      );
    } catch (e) {
      console.error('Review save failed:', e.message);
    }
  };

  const handlePreview = (row) => {
    if (!row.fileUrl) {
      alert('No file available for this entry');
      return;
    }

    const previewUrl = `http://localhost:5000/api/files/view?blobUrl=${encodeURIComponent(
      row.fileUrl
    )}`;

       setPreviewFile({ ...row, previewUrl });
    setPreviewOpen(true);

    markReviewed(row);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

    const handleOpenHistory = (row) => {
    setHistoryRow(row);
    markReviewed(row);
  };

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        <section className="w-full max-w-[1450px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black">
              Auditor Review - {selectedUtility || 'All Utilities'}
              {selectedSite ? ` (${selectedSite})` : ''}
            </h1>

            <button
              type="button"
              onClick={() => navigate('/auditor-ul-pure')}
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
            >
              Go Back
            </button>
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
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Posting Month</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Reviewed</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">History</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Preview</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-[13px] text-black/60">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((row) => {
                      const isReviewed = reviewedIds.has(row.id);

                      return (
                        <tr key={row.id} className="border-b border-black/10">
                          <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                          <td className="px-4 py-4 text-[13px] text-black">{row.site}</td>
                          <td className="px-4 py-4 text-[13px] text-black">{row.accountMeterNo}</td>
                          <td className="px-4 py-4 text-[13px] text-black">{row.consumption}</td>
                          <td className="px-4 py-4 text-[13px] text-black">{row.units}</td>
                          <td className="px-4 py-4 text-[13px] text-black">{row.postingMonth}</td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center justify-center min-w-[100px] h-[32px] px-3 rounded-full text-[12px] font-semibold ${
                                isReviewed
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-300 text-black'
                              }`}
                            >
                              {isReviewed ? 'Reviewed' : 'Not Reviewed'}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(row)}
                              className="h-[34px] px-4 rounded-full border border-black/20 text-black text-[12px] font-semibold hover:bg-black hover:text-white transition duration-300"
                            >
                              History
                            </button>
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => handlePreview(row)}
                              className="h-[34px] px-4 rounded-full border border-black/20 text-black text-[12px] font-semibold hover:bg-black hover:text-white transition duration-300"
                            >
                              Preview
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-[13px] text-black/60">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-4 border-t border-black/10">
              <div className="text-[14px] font-semibold text-black">
                Total Consumption : {totalConsumption}
              </div>
            </div>
          </div>
        </section>
      </main>

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
                  {historyRow.utility} — {historyRow.site}
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
              <HistoryPanel tableName="UlPureEntries" recordId={historyRow.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditorValidatePage;