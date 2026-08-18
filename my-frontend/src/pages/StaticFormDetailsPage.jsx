import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { formConfigBySiteUtility } from '../config/formConfig';
import { siteOptions } from '../config/siteOptionsConfig';

const prettify = (key) =>
  key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

function StaticFormDetailsPage() {
  const navigate = useNavigate();

  const facilityNames = Object.keys(siteOptions);

  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedUtilityKey, setSelectedUtilityKey] = useState('');
  const [formValues, setFormValues] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');

  const availableSites = useMemo(() => {
    return selectedFacility ? siteOptions[selectedFacility] || [] : [];
  }, [selectedFacility]);

  const utilityKeys = useMemo(() => {
    return selectedSite
      ? Object.keys(formConfigBySiteUtility[selectedSite] || {})
      : [];
  }, [selectedSite]);

  const formConfig = useMemo(() => {
    if (!selectedSite || !selectedUtilityKey) return null;
    return formConfigBySiteUtility[selectedSite]?.[selectedUtilityKey] || null;
  }, [selectedSite, selectedUtilityKey]);

  useEffect(() => {
    if (!formConfig) {
      setFormValues({});
      return;
    }

    const initial = {};
    (formConfig.editableFields || []).forEach((field) => {
      if (field.type === 'file') return;
      if (field.name === 'facility' && !field.defaultValue) {
        initial[field.name] = selectedSite || selectedFacility;
      } else {
        initial[field.name] = field.defaultValue ?? '';
      }
    });
    setFormValues(initial);
  }, [formConfig, selectedFacility, selectedSite]);

  const handleFacilityChange = (e) => {
    const value = e.target.value;
    const sites = siteOptions[value] || [];

    setSelectedFacility(value);
    setSelectedUtilityKey('');
    setMessage('');

    if (sites.length === 1) {
      setSelectedSite(sites[0]);
    } else {
      setSelectedSite('');
    }
  };

  const handleSiteChange = (e) => {
    setSelectedSite(e.target.value);
    setSelectedUtilityKey('');
    setMessage('');
  };

  const handleUtilityChange = (e) => {
    setSelectedUtilityKey(e.target.value);
    setMessage('');
  };

  const handleChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const validate = () => {
    for (const field of formConfig.editableFields || []) {
      if (field.required && field.type !== 'file') {
        const v = formValues[field.name];
        if (v === undefined || v === null || v === '') {
          return `${field.label} is required`;
        }
      }
    }
    return '';
  };

  const handleSubmit = () => {
    if (!formConfig) {
      setMessage('Please select facility, site and utility');
      return;
    }

    const error = validate();
    if (error) {
      setMessage(error);
      return;
    }

    const payload = {
      facility: selectedFacility,
      site: selectedSite,
      utilityKey: selectedUtilityKey,
      ...formValues,
      fileName: selectedFile ? selectedFile.name : '',
    };

    console.log('Static form payload:', payload);
    setMessage('Static form submitted successfully');
  };

  return (
    <div className="w-full h-screen bg-[#fafaf9] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex justify-center px-4 py-4">
        <section className="w-full max-w-[1040px] mx-auto">
          {/* TOP-LEFT BACK BUTTON: visible only when form is NOT loaded */}
          {!formConfig && (
            <div className="flex justify-start mb-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="min-w-[120px] h-[40px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 hover:scale-105 transition-all duration-300 shadow-md"
              >
                Go Back
              </button>
            </div>
          )}

          <div className="text-center mb-5">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black mb-2">
              Form Details
            </h1>
            <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-black max-w-[760px] mx-auto leading-6">
              Fill in your inputs and click submit
            </p>
          </div>

          <div className="bg-white rounded-[22px] p-5 sm:p-6 shadow-md">
            {/* Facility + Site + Utility selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Facility
                </label>
                <select
                  value={selectedFacility}
                  onChange={handleFacilityChange}
                  className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-white text-[13px] text-black outline-none"
                >
                  <option value="">Select Facility</option>
                  {facilityNames.map((facility) => (
                    <option key={facility} value={facility}>
                      {facility}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-black mb-2">
                  Site
                </label>
                <select
                  value={selectedSite}
                  onChange={handleSiteChange}
                  disabled={!selectedFacility}
                  className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-white text-[13px] text-black outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {selectedFacility ? 'Select Site' : 'Select Facility First'}
                  </option>
                  {availableSites.map((site) => (
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
                  value={selectedUtilityKey}
                  onChange={handleUtilityChange}
                  disabled={!selectedSite}
                  className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-white text-[13px] text-black outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {selectedSite ? 'Select Utility' : 'Select Site First'}
                  </option>
                  {utilityKeys.map((key) => (
                    <option key={key} value={key}>
                      {prettify(key)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic fields from formConfig */}
            {formConfig ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {formConfig.editableFields.map((field) => (
                    <div
                      key={field.name}
                      className={field.type === 'file' ? 'md:col-span-2' : ''}
                    >
                      <label className="block text-[13px] font-semibold text-black mb-2">
                        {field.label}
                      </label>

                      {field.type === 'file' ? (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <label className="flex-1 h-[36px] rounded-full bg-black text-white text-[12px] font-semibold flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition duration-300">
                              Upload File
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.xlsx,.xls,.csv,image/*,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                onChange={(e) =>
                                  setSelectedFile(e.target.files?.[0] || null)
                                }
                              />
                            </label>

                            <label className="flex-1 h-[36px] rounded-full border border-black text-black text-[12px] font-semibold flex items-center justify-center cursor-pointer hover:bg-black hover:text-white transition duration-300">
                              Take Photo
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) =>
                                  setSelectedFile(e.target.files?.[0] || null)
                                }
                              />
                            </label>
                          </div>

                          <div className="w-full min-h-[52px] rounded-[14px] border border-black/20 bg-[#fafafa] flex items-center justify-center px-4 text-center text-[#666] text-[12px]">
                            {selectedFile ? selectedFile.name : 'No file selected'}
                          </div>
                        </div>
                      ) : field.type === 'select' ? (
                        <select
                          value={formValues[field.name] || ''}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-white text-[13px] text-black outline-none"
                        >
                          <option value="">Select {field.label}</option>
                          {(field.options || []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type || 'text'}
                          value={formValues[field.name] || ''}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-white text-[13px] text-black outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {message && (
                  <div className="mt-4 text-center text-sm font-medium text-black">
                    {message}
                  </div>
                )}

                {/* FORM BACK + SUBMIT BUTTONS: visible only when form IS loaded */}
                <div className="flex justify-center gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300"
                  >
                    Submit
                  </button>
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-black mt-4">
                Select a facility, site and utility to load the form.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default StaticFormDetailsPage;