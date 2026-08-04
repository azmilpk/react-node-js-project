import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { unitForUtility } from '../utils/units';
import HistoryPanel from '../components/HistoryPanel';
import { API_BASE_URL, authFetch } from '../config/api';
import { regionFullName } from '../config/regionNames';
import { saveCache, loadCache, clearCache } from '../utils/pageCache';

const CACHE_KEY = 'ulPurePage_cache';

const DATA_SOURCE_EXPLANATIONS = {
  Calculated: 'Generated automatically by the calculation engine from the raw meter readings (Value Slots) for the month.',
  Manual: 'Entered directly by a user on the Validate/Add Data form and used as-is — no meter calculation applied.',
};

const VALUE_SLOT_EXPLANATION =
  "A 'Value Slot' (V1, V2, V3, …) is one raw meter/account reading imported for the site and month. " +
  'A utility can have several meters in the same month (e.g. two water meters), each landing in its own slot — ' +
  'the formula below shows exactly how those slots are combined to produce this indicator.';
function UlPurePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedFacilityFromNav = location.state?.facility || '';
  const selectedSiteFromNav = location.state?.site || '';
  const selectedEntryFromNav = location.state?.entry || '';

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [utilityFilter, setUtilityFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [historyRow, setHistoryRow] = useState(null);
  const [formulaRow, setFormulaRow] = useState(null);
  const [formulaSources, setFormulaSources] = useState(null);

  useEffect(() => {
  const cached = loadCache(CACHE_KEY);

  if (cached) {
    setTableData(cached.data);
    setUtilityFilter(cached.filters.utilityFilter || '');
    setMonthFilter(cached.filters.monthFilter || '');
    setYearFilter(cached.filters.yearFilter || '');
    setLoading(false);
  } else {
    fetchUlPureEntries();
  }
}, []);
useEffect(() => {
  if (tableData.length > 0) {
    saveCache(CACHE_KEY, tableData, {
      utilityFilter,
      monthFilter,
      yearFilter,
    });
  }
}, [tableData, utilityFilter, monthFilter, yearFilter]);

useEffect(() => {
  if (!formulaRow) {
    setFormulaSources(null);
    return;
  }
  (async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/ul-pure-entries/${formulaRow.id}/raw-data`);
      const result = await response.json();
      if (response.ok) setFormulaSources(result);
    } catch (error) {
      console.error('Formula sources fetch error:', error.message);
    }
  })();
}, [formulaRow]);
  const fetchUlPureEntries = async () => {
    try {
      setLoading(true);

      const response = await authFetch(`${API_BASE_URL}/api/ul-pure-entries`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch UL Pure entries');
      }

      const mappedData = result.map((item) => {
        const site = item.SiteCode || item.siteCode || '-';
        const facility =
          selectedFacilityFromNav ||
          item.FacilityCode ||
          item.facilityCode ||
          site ||
          '-';

        const entry =
          item.EntryName ||
          item.entryName ||
          `${facility}-${site}`;

        return {
          Id: item.Id || item.id,
          id: item.Id || item.id,
          entryNumber: item.EntryNumber || item.entryNumber,
          facility,
          site,
          entry,
          utility:
            item.UtilityName ||
            item.utilityName ||
            item.UtilityCode ||
            item.utilityCode ||
            '-',
          accountMeterNo: item.AccountMeterNo || item.accountMeterNo || '-',
          indicatorName: item.IndicatorName || item.indicatorName || '',
          indicatorId: item.IndicatorId || item.indicatorId || '-',
          consumption: (() => {
  const raw = item.Consumption ?? item.consumption;
  if (raw === null || raw === undefined || raw === '') return '-';
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(3) : raw;
})(),
          units: item.Units || item.units || unitForUtility(item.Utility || item.utility),
          regonId: item.RegonId || item.regonId || '-',
          postingMonth: item.PostingMonth || item.postingMonth || '-',
          status: item.Status || item.status || 'Validate',
          fileName: item.FileName || item.fileName || 'No file uploaded',
          fileUrl: item.FileUrl || item.fileUrl || '',
          comment: item.Comment || item.comment || '',
          formula: item.FormulaDescription || item.formulaDescription || '-',
          dataSource: item.DataSource || item.dataSource || '-',
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
    // Logical order for the five Water indicators so they appear grouped, top-to-bottom.
    const WATER_ORDER = [
      'City water, Water use in process excluded cooling',
      'City water, Cooling of process',
      'Water used in process',
      'Domestic water use',
      'Water Discharge',
    ];
    const waterRank = (name) => {
      const i = WATER_ORDER.indexOf(name);
      return i === -1 ? 99 : i;
    };

    return tableData
      .filter((row) => {
        const [year, month] = (row.postingMonth || '').split('-');

        const normalizedSelectedSite = (selectedSiteFromNav || '').trim().toLowerCase();
        const rowSite = (row.site || '').trim().toLowerCase();

        const matchSite =
          !selectedSiteFromNav || rowSite === normalizedSelectedSite;

        const matchUtility = !utilityFilter || row.utility === utilityFilter;
        const matchMonth = !monthFilter || month === monthFilter;
        const matchYear = !yearFilter || year === yearFilter;

        return matchSite && matchUtility && matchMonth && matchYear;
      })
      .sort((a, b) => {
        // Group rows by site, then month, then utility.
        const siteCmp = (a.site || '').localeCompare(b.site || '');
        if (siteCmp !== 0) return siteCmp;
        const monthCmp = (a.postingMonth || '').localeCompare(b.postingMonth || '');
        if (monthCmp !== 0) return monthCmp;
        const utilCmp = (a.utility || '').localeCompare(b.utility || '');
        if (utilCmp !== 0) return utilCmp;
        // Within Water, keep the five indicators in their logical sequence.
        return waterRank(a.indicatorName) - waterRank(b.indicatorName);
      });
  }, [
    tableData,
    selectedSiteFromNav,
    utilityFilter,
    monthFilter,
    yearFilter,
  ]);

  const utilityOptions = [...new Set(filteredData.map((row) => row.utility).filter(Boolean))];

  const yearOptions = [
    ...new Set(
      filteredData
        .map((row) => (row.postingMonth || '').split('-')[0])
        .filter(Boolean)
    ),
  ].sort();

  const totalConsumption = filteredData.reduce((sum, row) => {
    const n = Number(row.consumption);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const handleViewDetails = (row) => {
    navigate('/ul-pure-details', {
      state: {
        selectedEntry: row,
        selectedSite: selectedSiteFromNav,
        selectedFacility: selectedFacilityFromNav,
        selectedEntryLabel: selectedEntryFromNav,
      },
    });
  };

  const handleResetFilters = () => {
    setUtilityFilter('');
    setMonthFilter('');
    setYearFilter('');
    clearCache(CACHE_KEY);
  fetchEntries();
  };

  return (
    <div className="w-full h-screen bg-[#fafaf9] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        <section className="w-full max-w-[1450px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black">
              UL PURE DATA - {selectedEntryFromNav || selectedSiteFromNav || 'All Facilities'}
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
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">History</th>
                    <th className="px-4 py-3 text-left text-[13px] font-semibold">Formula</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="px-4 py-8 text-center text-[13px] text-black/60">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((row) => (
                      <tr key={row.id} className="border-b border-black/10 hover:bg-black/5">
                        <td className="px-4 py-4 text-[13px] text-black">{row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{regionFullName(row.site)}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.consumption}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.units}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.regonId}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.indicatorName || row.utility}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.indicatorId}</td>
                        <td className="px-4 py-4 text-[13px] text-black">{row.postingMonth}</td>
                        <td className="px-4 py-4">
 <button
  type="button"
  onClick={() => handleViewDetails(row)}
  className={`h-[34px] px-4 rounded-full text-white text-[12px] font-semibold transition duration-300 ${
    row.status === 'Validated'
      ? 'bg-green-600 hover:bg-green-700'
      : 'bg-sky-500 hover:bg-sky-600'
  }`}
>
  {row.status === 'Validated'
    ? 'Validated'
    : 'Validate'}
</button>
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
                            onClick={() => setFormulaRow(row)}
                            className="h-[34px] px-4 rounded-full border border-black/20 text-black text-[12px] font-semibold hover:bg-black hover:text-white transition duration-300"
                          >
                            Formula
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" className="px-4 py-8 text-center text-[13px] text-black/60">
                        No validated data available.
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
     

      {historyRow && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-[20px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <div>
                <h2 className="text-[18px] font-bold text-black">Change History</h2>
                <p className="text-[13px] text-black/60">
                  {historyRow.utility} — {historyRow.entry || historyRow.site}
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

      {formulaRow && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-[20px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <div>
                <h2 className="text-[18px] font-bold text-black">Formula Used</h2>
                <p className="text-[13px] text-black/60">
                  {formulaRow.utility} — {formulaRow.entry || formulaRow.site}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormulaRow(null)}
                className="min-w-[100px] h-[38px] px-4 rounded-full bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 transition duration-300"
              >
                Close
              </button>
            </div>
                        <div className="p-5 space-y-4">
              <div>
                <h3 className="text-[13px] font-semibold text-black mb-1">Data Source: {formulaRow.dataSource}</h3>
                <p className="text-[13px] text-black/70 leading-relaxed">
                  {DATA_SOURCE_EXPLANATIONS[formulaRow.dataSource] || 'Source of this value is not recorded.'}
                </p>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-black mb-1">Value Slots</h3>
                <p className="text-[13px] text-black/70 leading-relaxed">{VALUE_SLOT_EXPLANATION}</p>
                {formulaSources && (
                  <div className="mt-3 space-y-2">
                    {[...formulaSources.currentMonth.rows, ...formulaSources.previousMonth.rows].length === 0 ? (
                      <p className="text-[12px] text-black/50">No raw meter rows recorded for this entry.</p>
                    ) : (
                      <>
                        {formulaSources.currentMonth.rows.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-black/50 mb-1">
                              {formulaSources.currentMonth.month}
                            </p>
                            {formulaSources.currentMonth.rows.map((r) => (
                              <p key={`cur-${r.Id}`} className="text-[12px] text-black/70">
                                {r.ValueSlot}: {r.AccountNumber || 'Unnamed meter'} = {r.Consumption} {r.Units || ''}
                                {' '}— <span className="font-semibold">Source: {r.DataSource || 'Unknown'}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {formulaSources.previousMonth.rows.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-black/50 mb-1">
                              {formulaSources.previousMonth.month} (previous month, used for delta)
                            </p>
                            {formulaSources.previousMonth.rows.map((r) => (
                              <p key={`prev-${r.Id}`} className="text-[12px] text-black/70">
                                {r.ValueSlot}: {r.AccountNumber || 'Unnamed meter'} = {r.Consumption} {r.Units || ''}
                                {' '}— <span className="font-semibold">Source: {r.DataSource || 'Unknown'}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-black mb-1">Formula</h3>
                <p className="text-[14px] text-black leading-relaxed">{formulaRow.formula}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UlPurePage;