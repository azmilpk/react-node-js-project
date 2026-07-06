import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { unitForUtility } from '../utils/units';
import { API_BASE_URL } from '../config/api';

function AuditorUlPurePage() {
  const navigate = useNavigate();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [siteFilter, setSiteFilter] = useState('');
  const [utilityFilter, setUtilityFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  useEffect(() => {
    fetchUlPureEntries();
  }, []);

  const fetchUlPureEntries = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/ul-pure-entries`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch UL Pure entries');
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
          regonId: item.RegonId || item.regonId || '-',
          consumption: (() => {
            const raw = item.Consumption ?? item.consumption;
            return raw !== null && raw !== undefined && raw !== ''
              ? Number(raw).toFixed(3)
              : '-';
          })(),
          units: item.Units || item.units || unitForUtility(item.UtilityName || item.utilityName || item.UtilityCode || item.utilityCode),
          postingMonth: item.PostingMonth || item.postingMonth || '-',
          status: item.Status || item.status || 'Validate',
          fileName: item.FileName || item.fileName || 'No file uploaded',
          fileUrl: item.FileUrl || item.fileUrl || '',
        };
      });

      setTableData(mappedData);
    } catch (error) {
      console.error('UL Pure fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const [year, month] = (row.postingMonth || '').split('-');

      const matchSite = !siteFilter || row.site === siteFilter;
      const matchUtility = !utilityFilter || row.utility === utilityFilter;
      const matchMonth = !monthFilter || month === monthFilter;
      const matchYear = !yearFilter || year === yearFilter;

      return matchSite && matchUtility && matchMonth && matchYear;
    });
  }, [tableData, siteFilter, utilityFilter, monthFilter, yearFilter]);

  const siteOptions = [...new Set(tableData.map((row) => row.site).filter(Boolean))];
  const utilityOptions = [...new Set(tableData.map((row) => row.utility).filter(Boolean))];
  const yearOptions = [
    ...new Set(
      tableData
        .map((row) => (row.postingMonth || '').split('-')[0])
        .filter(Boolean)
    ),
  ].sort();

  const totalConsumption = filteredData.reduce((sum, row) => {
    const n = Number(row.consumption);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const handleResetFilters = () => {
    setSiteFilter('');
    setUtilityFilter('');
    setMonthFilter('');
    setYearFilter('');
  };

  const handleReview = (row) => {
    navigate('/auditor-validate-data', {
      state: {
        utility: row.utility,
        site: row.site,
        siteCode: row.siteCode,
      },
    });
  };

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        <section className="w-full max-w-[1450px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black">
              UL PURE DATA
            </h1>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
            >
              Go Back
            </button>
          </div>

          <div className="bg-white rounded-[18px] shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Site
                </label>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="">Find items</option>
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
                  Month
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
                  Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full h-[42px] rounded-[12px] border border-black/20 px-4 bg-white text-[13px] outline-none"
                >
                  <option value="">Find items</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleResetFilters}
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
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Region Name</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Consumption</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Units</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Regon Id</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Indicator Name</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Indicator Id</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Report Date</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Validate</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-[13px] text-black/60">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                                        filteredData.map((row) => (
                      <tr key={row.id} className="border-b border-black/10 hover:bg-black/5">
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.site}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.consumption}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.units}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.regonId}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.entryNumber}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.postingMonth}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleReview(row)}
                            className="h-[34px] px-4 rounded-full bg-sky-500 text-white text-[12px] font-semibold hover:bg-sky-600 transition duration-300"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-[13px] text-black/60">
                        No data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center px-4 py-4 border-t border-black/10">
              <div className="text-[14px] font-semibold text-black">
                Total Consumption : {totalConsumption.toFixed(3)}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AuditorUlPurePage;