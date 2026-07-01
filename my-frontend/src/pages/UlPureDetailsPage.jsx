import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import TopNavbar from '../components/topnavbar/TopNavbar';
import HistoryPanel from '../components/HistoryPanel';
import { API_BASE_URL } from '../config/api';

function UlPureDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedEntry = location.state?.selectedEntry || null;
  const selectedSite = location.state?.selectedSite || selectedEntry?.site || '';
  const selectedFacility = location.state?.selectedFacility || selectedEntry?.facility || '';
  const selectedEntryLabel =
    location.state?.selectedEntryLabel ||
    selectedEntry?.entry ||
    `${selectedFacility}-${selectedSite}`;

  const authUser = JSON.parse(localStorage.getItem('authUser'));

  const [postingMonth, setPostingMonth] = useState(selectedEntry?.postingMonth || '');
  const [consumption, setConsumption] = useState(selectedEntry?.consumption || '');
  const [comment, setComment] = useState(selectedEntry?.comment || '');

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

  const previewUrl = selectedEntry?.fileUrl
  ? `${API_BASE_URL}/api/files/view?blobUrl=${encodeURIComponent(
      selectedEntry.fileUrl
    )}`
  : '';

  const handleSave = async () => {
    try {
      if (!selectedEntry?.id && !selectedEntry?.Id) {
        alert('Entry ID is missing');
        return;
      }

      const entryId = selectedEntry?.id || selectedEntry?.Id;

      const response = await fetch(
        `${API_BASE_URL}/api/ul-pure-entries/${entryId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postingMonth,
            consumption,
            comment,
            modifiedBy: authUser?.name || authUser?.userId || 'Unknown User',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update UL Pure entry');
      }

      alert('Entry updated successfully');

      navigate('/ul-pure', {
        state: {
          facility: selectedFacility,
          site: selectedSite,
          entry: selectedEntryLabel,
        },
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to update UL Pure entry');
    }
  };

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-hidden px-4 py-4">
        <section className="w-full max-w-[1450px] h-full mx-auto flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black">
              UL Pure Details
            </h1>

            <button
              type="button"
              onClick={() =>
                navigate('/ul-pure', {
                  state: {
                    facility: selectedFacility,
                    site: selectedSite,
                    entry: selectedEntryLabel,
                  },
                })
              }
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300 shrink-0"
            >
              Go Back
            </button>
          </div>

          {selectedEntry ? (
            <div className="grid grid-cols-[0.95fr_1.05fr] gap-6 flex-1 min-h-0">
              <div className="bg-white rounded-[18px] shadow-sm p-6 overflow-y-auto">
                <h2 className="text-[22px] font-bold text-black mb-5">
                  Entered Details
                </h2>

                <div className="overflow-hidden rounded-[14px] border border-black/10">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8] w-[40%]">
                          Entry No
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          {selectedEntry.entryNumber}
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Facility
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          {selectedEntry.facility}
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Subsite
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          {selectedEntry.site}
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Utility
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          {selectedEntry.utility}
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Account / Meter No
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          {selectedEntry.accountMeterNo}
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Consumption
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={consumption}
                            onChange={(e) => setConsumption(e.target.value)}
                            className="w-full h-[38px] px-3 rounded-[10px] border border-black/20 bg-white text-[13px] text-black outline-none"
                          />
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Units
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          {selectedEntry.units}
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Posting Month
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="month"
                            value={postingMonth}
                            onChange={(e) => setPostingMonth(e.target.value)}
                            className="w-full h-[38px] px-3 rounded-[10px] border border-black/20 bg-white text-[13px] text-black outline-none"
                          />
                        </td>
                      </tr>

                      <tr className="border-b border-black/10">
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          Status
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          <span
  className={`inline-flex items-center justify-center min-w-[120px] h-[32px] px-3 rounded-full text-white text-[12px] font-semibold ${
    selectedEntry.status === 'Validated'
      ? 'bg-green-600'
      : 'bg-sky-500'
  }`}
>
  {selectedEntry.status}
</span>
                        </td>
                      </tr>

                      <tr>
                        <td className="px-4 py-3 text-[13px] font-semibold text-black bg-[#f8f8f8]">
                          File Name
                        </td>
                        <td className="px-4 py-3 text-[13px] text-black">
                          {selectedEntry.fileName || 'No file uploaded'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-5">
                  <label className="block text-[13px] font-semibold text-black mb-2">
                    Comment
                  </label>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={5}
                    placeholder="Enter your comment here..."
                    className="w-full rounded-[12px] border border-black/20 bg-white px-4 py-3 text-[13px] text-black outline-none resize-none"
                  />
     
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="h-[42px] px-6 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
              

              <div className="bg-white rounded-[18px] shadow-sm p-6 overflow-hidden flex flex-col">
                <h2 className="text-[22px] font-bold text-black mb-5 shrink-0">
                  Photo / PDF Preview
                </h2>

                <div className="flex-1 min-h-0">
                  {previewUrl ? (
                    getFileType(selectedEntry.fileUrl, selectedEntry.fileName) === 'image' ? (
                      <div className="w-full h-full flex items-center justify-center border border-black/10 rounded-[12px] bg-[#fafafa] overflow-hidden">
                        <img
                          src={previewUrl}
                          alt={selectedEntry.fileName || 'Uploaded preview'}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : getFileType(selectedEntry.fileUrl, selectedEntry.fileName) === 'pdf' ? (
                      <iframe
                        src={previewUrl}
                        title="Uploaded File Preview"
                        className="w-full h-full border border-black/10 rounded-[12px] bg-white"
                      />
                    ) : (
                      <div className="w-full h-full border border-dashed border-black/20 rounded-[12px] flex flex-col items-center justify-center text-[13px] text-black/60 text-center px-4">
                        <p className="mb-3">Preview is not supported for this file type.</p>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
                        >
                          Open File
                        </a>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-full border border-dashed border-black/20 rounded-[12px] flex items-center justify-center text-[13px] text-black/60 text-center px-4">
                      No uploaded photo or PDF available for preview.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[18px] shadow-sm p-8 flex-1 min-h-0">
              <div className="w-full h-full border border-dashed border-black/20 rounded-[12px] flex items-center justify-center text-[13px] text-black/60 text-center px-4">
                No validated entry selected.
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default UlPureDetailsPage;