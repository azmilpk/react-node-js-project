import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { API_BASE_URL, authFetch } from '../config/api';
import { regionFullName } from '../config/regionNames';

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

  const handleSave = async () => {
    try {
      if (!selectedEntry?.id && !selectedEntry?.Id) {
        alert('Entry ID is missing');
        return;
      }

      const entryId = selectedEntry?.id || selectedEntry?.Id;

      const response = await authFetch(
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
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col">
      <TopNavbar />

      <main className="flex-1 overflow-y-auto px-3 py-4">
        <section className="w-full max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-5xl font-bold text-black">
              UL Pure Details
            </h1>

           
          </div>

          {selectedEntry ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
                            {/* Form Grid Layout — label on left, value on right (two columns) */}
              <div className="grid grid-cols-2 gap-x-10 gap-y-4 mb-6">
                {/* utility */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Utility</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {selectedEntry.utility || '—'}
                  </div>
                </div>

                {/* Region ID */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Region ID</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {selectedEntry.regonId || '—'}
                  </div>
                </div>

                {/* Region Name */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Region Name</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {regionFullName(selectedEntry.site)}
                  </div>
                </div>

                {/* consumption (editable) */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Consumption</label>
                  <input
                    type="text"
                    value={consumption}
                    onChange={(e) => setConsumption(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-gray-100 border border-black text-[13px] text-black outline-none focus:border-black/40 transition"

                  />
                </div>

                {/* units */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Units</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {selectedEntry.units || '—'}
                  </div>
                </div>

                {/* postingdatemonth (editable) */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Posting Month</label>
                  <input
                    type="month"
                    value={postingMonth}
                    onChange={(e) => setPostingMonth(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-gray-100 border border-black text-[13px] text-black outline-none focus:border-black/40 transition"
                  />
                </div>

                {/* Indicator Name */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Indicator Name</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {selectedEntry.indicatorName || '—'}
                  </div>
                </div>

                {/* Indicator ID */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Indicator ID</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {selectedEntry.indicatorId || '—'}
                  </div>
                </div>

                {/* Com Person */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Com Person</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black/50 truncate">
                    {selectedEntry.comPerson || selectedEntry.createdBy || '—'}
                  </div>
                </div>

                {/* Formula */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Formula</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {selectedEntry.formulaCode || '—'}
                  </div>
                </div>

                {/* id */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">ID</label>
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded text-[13px] text-black truncate">
                    {selectedEntry.id || selectedEntry.Id || '—'}
                  </div>
                </div>

                {/* Comments (editable) */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-[13px] font-semibold text-gray-800">Comments</label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1 px-3 py-2 rounded bg-gray-100 border border-black text-[13px] text-black outline-none focus:border-black/40 transition"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-center">
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
                  className="flex-1 h-[36px] px-4 rounded-full border-2 border-black text-black text-[12px] font-semibold hover:bg-black hover:text-white transition duration-300"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 h-[36px] px-4 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 transition duration-300"
                >
                  Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <p className="text-[12px] text-black/60">
                  No validated entry selected.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default UlPureDetailsPage;