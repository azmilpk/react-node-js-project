import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

function ValidatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedSite = location.state?.site || 'All Facilities';

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [utilityFilter, setUtilityFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      const response = await fetch('http://localhost:5000/api/form-entries');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch entries');
      }

      const mappedData = result.map((item) => ({
        id: item.id,
        utility: item.utilityCode || '-',
        facility: item.siteCode || '-',
        accountMeterNo: item.accountMeterNo || '-',
        consumption: item.consumption || '-',
        units: item.units || '-',
        recordDate: item.postingMonth || '-',
        status: item.status || 'Pending',
      }));

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

      const matchSite =
        selectedSite === 'All Facilities' || row.facility === selectedSite;

      const matchUtility =
        !utilityFilter || row.utility === utilityFilter;

      const matchMonth =
        !monthFilter || month === monthFilter;

      const matchYear =
        !yearFilter || year === yearFilter;

      const matchStatus =
        !statusFilter || row.status === statusFilter;

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
    return sum + Number(row.consumption || 0);
  }, 0);

  const handleReset = () => {
    setUtilityFilter('');
    setMonthFilter('');
    setYearFilter('');
    setStatusFilter('Pending');
  };

  const handleValidate = async (row) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/form-entries/${row.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'Validated',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update status');
      }

      fetchEntries();
    } catch (error) {
      console.error('Validate error:', error.message);
    }
  };

  const handleDownload = (row) => {
    console.log('Download clicked:', row);
  };

  const utilityOptions = [...new Set(tableData.map((row) => row.utility).filter(Boolean))];

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        <section className="w-full max-w-[1320px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black">
              Validate Data - {selectedSite}
            </h1>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-[44px] h-[44px] rounded-full bg-black text-white flex items-center justify-center text-[18px] hover:bg-neutral-800 transition duration-300"
              aria-label="Go Back"
            >
              ↩
            </button>
          </div>

          {/* Filters */}
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

          {/* Table */}
          <div className="bg-white rounded-[18px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Utility</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Facility</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Account/Meter No</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Consumption</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Units</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Record Date</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Check Status</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Validate Data</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Download File</th>
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
                    filteredData.map((row) => (
                      <tr key={row.id} className="border-b border-black/10">
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.facility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.accountMeterNo}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.consumption}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.units}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.recordDate}</td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center min-w-[90px] h-[32px] px-3 rounded-full bg-[#f4b400] text-black text-[12px] font-semibold">
                            {row.status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleValidate(row)}
                            className="h-[34px] px-4 rounded-full bg-[#0078d4] text-white text-[12px] font-semibold hover:bg-[#0062ad] transition duration-300"
                          >
                            Validate
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleDownload(row)}
                            className="w-[34px] h-[34px] rounded-full border border-black/20 flex items-center justify-center text-black hover:bg-black hover:text-white transition duration-300"
                            aria-label="Download File"
                          >
                            ⬇
                          </button>
                        </td>
                      </tr>
                    ))
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

            {/* Bottom area */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 border-t border-black/10">
              <div className="text-[14px] font-semibold text-black">
                Total Consumption : {totalConsumption}
              </div>

              <button
                type="button"
                className="h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300 self-start sm:self-auto"
              >
                Generate Upure Data
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ValidatePage;