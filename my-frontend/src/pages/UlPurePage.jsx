import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

function UlPurePage() {
  const navigate = useNavigate();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState('');
  const [utilityFilter, setUtilityFilter] = useState('');

  useEffect(() => {
    fetchValidatedEntries();
  }, []);

  const fetchValidatedEntries = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        'http://localhost:5000/api/form-entries?status=Validated'
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch validated entries');
      }

      const mappedData = result.map((item) => ({
        id: item.id,
        entryNumber: item.entryNumber,
        site: item.siteCode || '-',
        utility: item.utilityCode || '-',
        accountMeterNo: item.accountMeterNo || '-',
        consumption: item.consumption || '-',
        units: item.units || '-',
        postingMonth: item.postingMonth || '-',
        status: item.status || '-',
      }));

      setTableData(mappedData);
    } catch (error) {
      console.error('UL Pure fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const matchSite = !siteFilter || row.site === siteFilter;
      const matchUtility = !utilityFilter || row.utility === utilityFilter;
      return matchSite && matchUtility;
    });
  }, [tableData, siteFilter, utilityFilter]);

  const siteOptions = [...new Set(tableData.map((row) => row.site).filter(Boolean))];
  const utilityOptions = [...new Set(tableData.map((row) => row.utility).filter(Boolean))];

  const totalConsumption = filteredData.reduce((sum, row) => {
    return sum + Number(row.consumption || 0);
  }, 0);

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        <section className="w-full max-w-[1320px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black">
              UL Pure
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
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Site
                </label>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="">All Sites</option>
                  {siteOptions.map((site) => (
                    <option key={site} value={site}>
                      {site}
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
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="">All Utilities</option>
                  {utilityOptions.map((utility) => (
                    <option key={utility} value={utility}>
                      {utility}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSiteFilter('');
                    setUtilityFilter('');
                  }}
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
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Entry No</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Site</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Utility</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Account/Meter No</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Consumption</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Units</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Posting Month</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-[13px] text-black/60">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((row) => (
                      <tr key={row.id} className="border-b border-black/10">
                        <td className="px-4 py-4 text-[13px] text-black">{row.entryNumber}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.site}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.accountMeterNo}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.consumption}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.units}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.postingMonth}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center min-w-[90px] h-[32px] px-3 rounded-full bg-green-600 text-white text-[12px] font-semibold">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-[13px] text-black/60">
                        No validated data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center px-4 py-4 border-t border-black/10">
              <div className="text-[14px] font-semibold text-black">
                Total Consumption : {totalConsumption}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UlPurePage;