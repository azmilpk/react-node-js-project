import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

function UlPurePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedFacilityFromNav = location.state?.facility || '';
  const selectedSiteFromNav = location.state?.site || '';

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [utilityFilter, setUtilityFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  useEffect(() => {
    fetchValidatedEntries();
  }, []);

  const fetchValidatedEntries = async () => {
    try {
      setLoading(true);

      const response = await fetch(
  'http://localhost:5000/api/form-entries'
);
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch validated entries');
      }

      const mappedData = result
  .filter(
    (item) =>
      item.Status === 'Validated' ||
      item.Status === 'Modified'
  )
  .map((item) => {
        const facility =
          item.FacilityCode ||
          item.facilityCode ||
          selectedFacilityFromNav ||
          '';

        const site =
          item.SiteCode ||
          item.siteCode ||
          '-';

        const entry =
          item.EntryName ||
          item.entryName ||
          (facility && site !== '-' ? `${facility}-${site}` : site);

        return {
  Id: item.Id,
  id: item.Id,

  entryNumber: item.EntryNumber || item.entryNumber,

  facility,
  site,
  entry,

  utility: item.UtilityCode || item.utilityCode || '-',

  accountMeterNo:
    item.AccountMeterNo || item.accountMeterNo || '-',

  consumption:
    item.Consumption || item.consumption || '-',

  units:
    item.Units || item.units || '-',

  postingMonth:
    item.PostingMonth || item.postingMonth || '-',

  status:
    item.Status || item.status || '-',

  fileName:
    item.FileName || item.fileName || 'No file uploaded',

  fileUrl:
    item.FileUrl || item.fileUrl || '',
    comment: 
    item.Comment || item.comment || '',
};
      });
console.log(mappedData);
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

      const matchSite = !selectedSiteFromNav || row.site === selectedSiteFromNav;
      const matchUtility = !utilityFilter || row.utility === utilityFilter;
      const matchMonth = !monthFilter || month === monthFilter;
      const matchYear = !yearFilter || year === yearFilter;

      return matchSite && matchUtility && matchMonth && matchYear;
    });
  }, [tableData, selectedSiteFromNav, utilityFilter, monthFilter, yearFilter]);

  const utilityOptions = [...new Set(tableData.map((row) => row.utility).filter(Boolean))];

  const yearOptions = [
    ...new Set(
      tableData
        .map((row) => (row.postingMonth || '').split('-')[0])
        .filter(Boolean)
    ),
  ].sort();

  const totalConsumption = filteredData.reduce((sum, row) => {
    return sum + Number(row.consumption || 0);
  }, 0);

  const handleViewDetails = (row) => {
    navigate('/ul-pure-details', {
      state: {
        selectedEntry: row,
      },
    });
  };

  const handleResetFilters = () => {
    setUtilityFilter('');
    setMonthFilter('');
    setYearFilter('');
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
              onClick={() => navigate('/site-owner')}
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
            >
              Go Back
            </button>
          </div>

          <div className="bg-white rounded-[18px] shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                  Reporting Month
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
                  Report Year
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
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Reset
                </label>
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
              <table className="w-full min-w-[1250px] border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Utility</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Region Name</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Consumption</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Units</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Region Id</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Indicator Name</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Indicator Id</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Report Date</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Validate</th>
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
                      <tr key={row.id} className="border-b border-black/10 hover:bg-black/5">
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.entry || row.site}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.consumption}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.units}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.accountMeterNo}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.entryNumber}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.postingMonth}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(row)}
                            className="h-[34px] px-4 rounded-full bg-green-600 text-white text-[12px] font-semibold hover:bg-green-700 transition duration-300"
                          >
                            Validated
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-[13px] text-black/60">
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

              <button
                type="button"
                className="h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
              >
                Generate ULpure Report
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UlPurePage;