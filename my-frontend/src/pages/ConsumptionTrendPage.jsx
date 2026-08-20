import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { API_BASE_URL, authFetch } from '../config/api';

function ConsumptionTrendPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedFacility = location.state?.facility || '';
  const selectedSite = location.state?.site || '';
  const selectedEntry = location.state?.entry || '';

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [utilityFilter, setUtilityFilter] = useState('');

  // ---------------------------------------------------------
  // Fetch consumption entries
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        if (selectedSite) params.append('siteName', selectedSite);

        const response = await authFetch(
          `${API_BASE_URL}/api/dashboard/consumption-trend?${params}`
        );

        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
          // Normalise to the shape the rest of the component expects.
          setEntries(
            data.map((row) => ({
              postingMonth: row.month,
              utilityName: row.utility,
              consumption: row.total,
              units: row.units,
            }))
          );
        } else {
          setEntries([]);
        }
      } catch (err) {
        console.error('Failed to fetch entries:', err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedSite) {
      fetchEntries();
    } else {
      setLoading(false);
      setEntries([]);
    }
  }, [selectedSite]);

  // ---------------------------------------------------------
  // Get unique utility names
  // ---------------------------------------------------------
  const utilityNames = useMemo(() => {
    const names = [
      ...new Set(
        entries
          .map((entry) => entry.utilityName)
          .filter(Boolean)
      ),
    ];

    return names.sort();
  }, [entries]);

  // ---------------------------------------------------------
  // Filter entries by utility
  // ---------------------------------------------------------
  const filteredEntries = useMemo(() => {
    if (!utilityFilter) {
      return entries;
    }

    return entries.filter(
      (entry) => entry.utilityName === utilityFilter
    );
  }, [entries, utilityFilter]);

  // ---------------------------------------------------------
  // Group entries by month
  // Calculate total consumption and month-over-month change
  // ---------------------------------------------------------
  const trendData = useMemo(() => {
    const monthlyMap = {};

    filteredEntries.forEach((entry) => {
      const month = entry.postingMonth || 'Unknown';

      const value = parseFloat(entry.consumption) || 0;

      if (!monthlyMap[month]) {
        monthlyMap[month] = {
          total: 0,
          utility: entry.utilityName || '',
          units: entry.units || '',
        };
      }

      monthlyMap[month].total += value;
    });

    const sorted = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data], idx, arr) => {
        const previous =
          idx > 0
            ? arr[idx - 1][1].total
            : null;

        let change = null;
        let changeValue = null;

        if (
          previous !== null &&
          previous !== 0
        ) {
          changeValue = data.total - previous;

          change = (
            (changeValue / previous) *
            100
          ).toFixed(1);
        }

        return {
          month,
          total: data.total,
          utility: data.utility,
          units: data.units,
          change,
          changeValue,
        };
      });

    return sorted;
  }, [filteredEntries]);

  // ---------------------------------------------------------
  // Find maximum consumption
  // Used for bar width
  // ---------------------------------------------------------
  const maxConsumption = useMemo(() => {
    if (trendData.length === 0) {
      return 1;
    }

    return Math.max(
      ...trendData.map((data) => data.total),
      1
    );
  }, [trendData]);

  // ---------------------------------------------------------
  // Total consumption
  // ---------------------------------------------------------
  const totalConsumption = useMemo(() => {
    return trendData.reduce(
      (sum, data) => sum + data.total,
      0
    );
  }, [trendData]);

  // ---------------------------------------------------------
  // Number of months decreased
  // ---------------------------------------------------------
  const monthsDecreased = useMemo(() => {
    return trendData.filter(
      (data) =>
        data.change !== null &&
        parseFloat(data.change) < 0
    ).length;
  }, [trendData]);

  // ---------------------------------------------------------
  // Number of months increased
  // ---------------------------------------------------------
  const monthsIncreased = useMemo(() => {
    return trendData.filter(
      (data) =>
        data.change !== null &&
        parseFloat(data.change) > 0
    ).length;
  }, [trendData]);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <div className="w-full h-screen bg-[#fafaf9] flex flex-col overflow-hidden">

      {/* Navbar */}
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex justify-center px-4 py-4">

        <section className="w-full max-w-[1280px] mx-auto">

          {/* =====================================================
              PAGE HEADER
          ====================================================== */}
          <div className="text-center mb-5">

            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black mb-2">
              Consumption Trend
            </h1>

            <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-black max-w-[760px] mx-auto leading-6">
              {selectedEntry ||
                selectedSite ||
                'Your Site'}{' '}
              — Month-over-month consumption changes
            </p>

          </div>

          {/* =====================================================
              FILTER + BACK BUTTON
          ====================================================== */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">

            {/* Utility Filter */}
            <div className="flex items-center gap-3">

              <label className="text-[13px] font-semibold text-black">
                Utility:
              </label>

              <select
                value={utilityFilter}
                onChange={(e) =>
                  setUtilityFilter(e.target.value)
                }
                className="h-[38px] px-4 rounded-[12px] border border-black/20 bg-white text-[13px] text-black outline-none"
              >

                <option value="">
                  All Utilities
                </option>

                {utilityNames.map((name) => (
                  <option
                    key={name}
                    value={name}
                  >
                    {name}
                  </option>
                ))}

              </select>

            </div>

            {/* Go Back */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 hover:scale-105 transition-all duration-300 shadow-md"
            >
              Go Back
            </button>

          </div>

          {/* =====================================================
              LOADING
          ====================================================== */}
          {loading ? (

            <div className="bg-white rounded-[22px] p-8 shadow-md text-center text-[13px] text-black/50">
              Loading consumption data...
            </div>

          ) : trendData.length === 0 ? (

            /* =====================================================
                NO DATA
            ====================================================== */
            <div className="bg-white rounded-[22px] p-8 shadow-md text-center text-[13px] text-black/50">
              No consumption data found for this site.
            </div>

          ) : (

            <>

              {/* =================================================
                  SUMMARY CARDS
              ================================================== */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">

                {/* Months Tracked */}
                <div className="bg-white rounded-[18px] shadow-sm p-4 text-center">

                  <div className="text-[28px] font-bold text-black">
                    {trendData.length}
                  </div>

                  <div className="text-[12px] text-black/50 mt-1">
                    Months Tracked
                  </div>

                </div>

                {/* Total Consumption */}
                <div className="bg-white rounded-[18px] shadow-sm p-4 text-center">

                  <div className="text-[28px] font-bold text-black">
                    {totalConsumption.toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits: 2,
                      }
                    )}
                  </div>

                  <div className="text-[12px] text-black/50 mt-1">
                    Total Consumption
                  </div>

                </div>

                {/* Months Decreased */}
                <div className="bg-white rounded-[18px] shadow-sm p-4 text-center">

                  <div className="text-[28px] font-bold text-green-600">
                    {monthsDecreased}
                  </div>

                  <div className="text-[12px] text-black/50 mt-1">
                    Months Decreased
                  </div>

                </div>

                {/* Months Increased */}
                <div className="bg-white rounded-[18px] shadow-sm p-4 text-center">

                  <div className="text-[28px] font-bold text-red-500">
                    {monthsIncreased}
                  </div>

                  <div className="text-[12px] text-black/50 mt-1">
                    Months Increased
                  </div>

                </div>

              </div>

              {/* =================================================
                  MONTHLY CONSUMPTION BAR CHART
              ================================================== */}
              <div className="bg-white rounded-[22px] p-5 sm:p-6 shadow-md mb-6">

                <h2 className="text-[16px] font-bold text-black mb-4">
                  Monthly Consumption
                </h2>

                <div className="space-y-3">

                  {trendData.map((row, idx) => {

                    const barWidth =
                      (row.total / maxConsumption) * 100;

                    const isIncrease =
                      row.change !== null &&
                      parseFloat(row.change) > 0;

                    const isDecrease =
                      row.change !== null &&
                      parseFloat(row.change) < 0;

                    return (
                      <div
                        key={`${row.month}-${idx}`}
                        className="flex items-center gap-3"
                      >

                        {/* Month */}
                        <div className="w-[80px] text-[12px] font-semibold text-black shrink-0">
                          {row.month}
                        </div>

                        {/* Bar */}
                        <div className="flex-1 h-[32px] bg-[#f0f0f0] rounded-full overflow-hidden relative">

                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isIncrease
                                ? 'bg-red-500'
                                : isDecrease
                                ? 'bg-green-600'
                                : 'bg-gray-400'
                            }`}
                            style={{
                              width: `${barWidth}%`,
                            }}
                          />

                        </div>

                        {/* Consumption */}
                        <div className="w-[120px] text-[12px] font-semibold text-black shrink-0 text-right">

                          {row.total.toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 2,
                            }
                          )}

                          {row.units
                            ? ` ${row.units}`
                            : ''}

                        </div>

                        {/* Percentage Change */}
                        <div className="w-[70px] text-[12px] font-semibold shrink-0 text-right">

                          {row.change !== null ? (

                            <span
                              className={
                                isIncrease
                                  ? 'text-red-500'
                                  : isDecrease
                                  ? 'text-green-600'
                                  : 'text-black'
                              }
                            >
                              {parseFloat(
                                row.change
                              ).toFixed(2)}
                              %
                            </span>

                          ) : (

                            <span className="text-black/50">
                              N/A
                            </span>

                          )}

                        </div>

                      </div>
                    );
                  })}

                </div>

              </div>

              {/* =================================================
                  DETAILS TABLE
              ================================================== */}
              <div className="bg-white rounded-[22px] p-5 sm:p-6 shadow-md mb-6">

                <h2 className="text-[16px] font-bold text-black mb-4">
                  Consumption Details
                </h2>

                <div className="overflow-x-auto">

                  <table className="w-full border-collapse">

                    <thead>

                      <tr className="border-b border-black/10">

                        <th className="text-left px-3 py-3 text-[12px] font-semibold text-black">
                          Month
                        </th>

                        <th className="text-left px-3 py-3 text-[12px] font-semibold text-black">
                          Utility
                        </th>

                        <th className="text-right px-3 py-3 text-[12px] font-semibold text-black">
                          Consumption
                        </th>

                        <th className="text-left px-3 py-3 text-[12px] font-semibold text-black">
                          Units
                        </th>

                        <th className="text-right px-3 py-3 text-[12px] font-semibold text-black">
                          Change
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {trendData.map((row, idx) => {

                        const isIncrease =
                          row.change !== null &&
                          parseFloat(row.change) > 0;

                        const isDecrease =
                          row.change !== null &&
                          parseFloat(row.change) < 0;

                        return (
                          <tr
                            key={`table-${row.month}-${idx}`}
                            className="border-b border-black/5 hover:bg-[#fafafa] transition"
                          >

                            <td className="px-3 py-3 text-[12px] font-medium text-black">
                              {row.month}
                            </td>

                            <td className="px-3 py-3 text-[12px] text-black/70">
                              {row.utility || '-'}
                            </td>

                            <td className="px-3 py-3 text-[12px] font-semibold text-black text-right">
                              {row.total.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </td>

                            <td className="px-3 py-3 text-[12px] text-black/70">
                              {row.units || '-'}
                            </td>

                            <td className="px-3 py-3 text-[12px] font-semibold text-right">

                              {row.change !== null ? (

                                <span
                                  className={
                                    isIncrease
                                      ? 'text-red-500'
                                      : isDecrease
                                      ? 'text-green-600'
                                      : 'text-black'
                                  }
                                >
                                  {isIncrease
                                    ? '+'
                                    : ''}
                                  {parseFloat(
                                    row.change
                                  ).toFixed(2)}
                                  %
                                </span>

                              ) : (

                                <span className="text-black/40">
                                  N/A
                                </span>

                              )}

                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>

                </div>

              </div>

            </>
          )}

        </section>
      </main>
    </div>
  );
}

export default ConsumptionTrendPage;