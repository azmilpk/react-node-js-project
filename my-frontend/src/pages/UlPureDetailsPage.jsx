import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

function UlPureDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedEntry = location.state?.selectedEntry || null;

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
                    site: selectedEntry?.site || '',
                    facility: selectedEntry?.facility || '',
                    entry: selectedEntry?.entry || '',
                  },
                })
              }
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300 shrink-0"
            >
              Go Back
            </button>
          </div>

          {selectedEntry ? (
            <div className="grid grid-cols-[0.85fr_1.15fr] gap-6 flex-1 min-h-0">
              <div className="bg-white rounded-[18px] shadow-sm p-6 overflow-y-auto">
                <h2 className="text-[22px] font-bold text-black mb-5">
                  Entered Details
                </h2>

                <div className="space-y-4">
                  <div className="text-[14px] text-black">
                    <strong>Entry No:</strong> {selectedEntry.entryNumber}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Facility:</strong> {selectedEntry.entry || selectedEntry.site}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Site:</strong> {selectedEntry.site}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Utility:</strong> {selectedEntry.utility}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Account/Meter No:</strong> {selectedEntry.accountMeterNo}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Consumption:</strong> {selectedEntry.consumption}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Units:</strong> {selectedEntry.units}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Posting Month:</strong> {selectedEntry.postingMonth}
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>Status:</strong>{' '}
                    <span className="inline-flex items-center justify-center min-w-[90px] h-[32px] px-3 rounded-full bg-green-600 text-white text-[12px] font-semibold ml-2">
                      {selectedEntry.status}
                    </span>
                  </div>

                  <div className="text-[14px] text-black">
                    <strong>File Name:</strong> {selectedEntry.fileName || 'No file uploaded'}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[18px] shadow-sm p-6 overflow-hidden flex flex-col">
                <h2 className="text-[22px] font-bold text-black mb-5 shrink-0">
                  Photo / PDF Preview
                </h2>

                <div className="flex-1 min-h-0">
                  {selectedEntry.fileUrl ? (
                    <iframe
                      src={selectedEntry.fileUrl}
                      title="Uploaded File Preview"
                      className="w-full h-full border border-black/10 rounded-[12px]"
                    />
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