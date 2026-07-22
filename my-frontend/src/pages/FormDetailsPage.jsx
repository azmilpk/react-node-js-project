import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';
import { formConfigBySiteUtility } from '../config/formConfig';
import { API_BASE_URL, authFetch } from '../config/api';

function FormDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedFacility = location.state?.facility || '';
  const selectedSite = location.state?.site || '';
  const selectedUtilityCode = location.state?.utilityCode || '';
  const selectedUtilityName = location.state?.utilityName || '';

  const selectedEntry =
    location.state?.entry ||
    (selectedFacility && selectedSite
      ? `${selectedFacility}-${selectedSite}`
      : selectedSite || selectedFacility);

  const formConfig = useMemo(() => {
    return (
      formConfigBySiteUtility[selectedSite]?.[selectedUtilityCode] ||
      formConfigBySiteUtility[selectedFacility]?.[selectedUtilityCode] ||
      null
    );
  }, [selectedSite, selectedFacility, selectedUtilityCode]);

  const [formValues, setFormValues] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!formConfig) return;

    const initialValues = {};

    (formConfig.editableFields || []).forEach((field) => {
      if (field.defaultValue !== undefined) {
        initialValues[field.name] =
          field.name === 'facility' && !field.defaultValue
            ? selectedEntry
            : field.defaultValue;
      } else if (field.name === 'facility') {
        initialValues[field.name] = selectedEntry;
      }
    });

    setFormValues(initialValues);
  }, [formConfig, selectedEntry]);

  const monthToNumber = (monthName) => {
    const monthsMap = {
      January: '01',
      February: '02',
      March: '03',
      April: '04',
      May: '05',
      June: '06',
      July: '07',
      August: '08',
      September: '09',
      October: '10',
      November: '11',
      December: '12',
    };

    return monthsMap[monthName] || '01';
  };

 const handleChange = (name, value) => {
  setFormValues((prev) => {
    const updated = { ...prev, [name]: value };

    if (name === 'reportingMonth' && prev.postingMonth) {
      const year = prev.postingMonth.split('-')[0] || String(new Date().getFullYear());
      updated.postingMonth = `${year}-${monthToNumber(value)}`;
    }

    // NEW: when the Year dropdown changes, swap the year part of postingMonth
    if (name === 'year' && prev.postingMonth) {
      const parts = prev.postingMonth.split('-');
      const month = parts[1] || '01';
      updated.postingMonth = `${value}-${month}`;
    }

    return updated;
  });

  setMessage('');
};

  const validateForm = () => {
    const editableFields = formConfig?.editableFields || [];

    for (const field of editableFields) {
      if (field.required && field.type !== 'file') {
        const value = formValues[field.name];
        if (value === undefined || value === null || value === '') {
          return `${field.label} is required`;
        }
      }
    }

    return '';
  };

  const handleSubmit = async () => {
    try {
      if (!formConfig) {
        setMessage('No form configuration found');
        return;
      }

      const validationError = validateForm();

      if (validationError) {
        setMessage(validationError);
        return;
      }

      setIsSubmitting(true);
      setMessage('');

      let uploadedFileData = {
        fileName: '',
        fileUrl: '',
      };

      if (selectedFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', selectedFile);

        const uploadResponse = await authFetch(`${API_BASE_URL}/api/files/upload`, {
          method: 'POST',
          body: fileFormData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.message || 'File upload failed');
        }

        uploadedFileData = {
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
        };
      }

      const payload = {
        facilityCode: selectedFacility,
        siteCode: selectedSite,
        entryName: selectedEntry,
        utilityCode: selectedUtilityCode,
        utilityName: formValues.utility || selectedUtilityName,
        postingMonth: formValues.postingMonth || '',
        accountMeterNo: formValues.accountMeterNo || '',
        units: formValues.units || '',
        consumption:
          formValues.consumption ||
          formValues.meterReading ||
          formValues.quantity ||
          formValues.producedQuantity ||
          '',
        status: 'Validated',
        createdBy: 'Bot_02',
        fileName: uploadedFileData.fileName,
        fileUrl: uploadedFileData.fileUrl,
      };

      const response = await authFetch(`${API_BASE_URL}/api/form-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit form');
      }

      setMessage('Form submitted successfully');

      setTimeout(() => {
        navigate('/facility-selection', {
          state: {
            facility: selectedFacility,
            site: selectedSite,
            entry: selectedEntry,
          },
        });
      }, 1000);
    } catch (error) {
      setMessage(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
      <TopNavbar />

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex justify-center px-4 py-4">
        <section className="w-full max-w-[1040px] mx-auto">
          <div className="text-center mb-5">
            <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] xl:text-[48px] leading-tight font-bold text-black mb-2">
              Form Details
            </h1>

            <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-black max-w-[760px] mx-auto leading-6">
              Fill in your inputs and click submit
            </p>
          </div>

          {!formConfig ? (
            <div className="bg-white rounded-[22px] p-5 sm:p-6 shadow-md text-center">
              No form configuration found for {selectedSite} / {selectedUtilityName || selectedUtilityCode}.
            </div>
          ) : (
            <div className="bg-white rounded-[22px] p-5 sm:p-6 shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {formConfig.editableFields?.map((field) => (
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
                  disabled={isSubmitting}
                  className="min-w-[130px] h-[42px] px-5 rounded-full bg-black text-white text-[13px] font-semibold hover:bg-neutral-800 transition duration-300 disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default FormDetailsPage;