import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/topnavbar/TopNavbar';

function FormDetailsPage() {
  const getCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const navigate = useNavigate();
  const location = useLocation();

  const selectedFacility = location.state?.facility || '';
  const selectedSite = location.state?.site || 'KOP';
  const selectedUtility = location.state?.utility || 'WATER';
  const selectedEntry =
    location.state?.entry ||
    (selectedFacility && selectedSite
      ? `${selectedFacility}-${selectedSite}`
      : selectedSite);

  const formConfig = useMemo(() => {
    const configs = {
      WATER: {
        fixedFields: [
          { label: 'Facility', value: selectedEntry },
          { label: 'Posting Date Month', value: getCurrentMonth() },
          { label: 'Utility', value: 'WATER' },
          { label: 'Account Number / Meter No', value: '12812696' },
          { label: 'Units', value: 'm3' },
        ],
        editableFields: [
          {
            name: 'consumption',
            label: 'Consumption',
            placeholder: 'Enter water consumption',
          },
          { name: 'attachments', label: 'Attachments', type: 'file' },
        ],
      },
      WASTE: {
        fixedFields: [
          { label: 'Facility', value: selectedEntry },
          { label: 'Posting Date Month', value: getCurrentMonth() },
          { label: 'Utility', value: 'WASTE' },
          { label: 'Waste Category', value: 'General Waste' },
          { label: 'Units', value: 'kg' },
        ],
        editableFields: [
          {
            name: 'quantity',
            label: 'Quantity',
            placeholder: 'Enter waste quantity',
          },
          { name: 'attachments', label: 'Attachments', type: 'file' },
        ],
      },
    };

    return configs[selectedUtility] || {
      fixedFields: [
        { label: 'Facility', value: selectedEntry },
        { label: 'Posting Date Month', value: getCurrentMonth() },
        { label: 'Utility', value: selectedUtility },
        { label: 'Account Number / Meter No', value: 'DEFAULT-001' },
        { label: 'Units', value: 'unit' },
      ],
      editableFields: [
        {
          name: 'consumption',
          label: 'Consumption',
          placeholder: 'Enter value',
        },
        { name: 'attachments', label: 'Attachments', type: 'file' },
      ],
    };
  }, [selectedEntry, selectedUtility]);

  const [formValues, setFormValues] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (name, value) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setMessage('');

      const payload = {
        facilityCode: selectedFacility,
        siteCode: selectedSite,
        entryName: selectedEntry,
        utilityCode: selectedUtility,
        postingMonth: formConfig.fixedFields[1]?.value || '',
        accountMeterNo: formConfig.fixedFields[3]?.value || '',
        units: formConfig.fixedFields[4]?.value || '',
        consumption:
          formValues.consumption ||
          formValues.quantity ||
          formValues.producedQuantity ||
          '',
        status: 'Pending',
        createdBy: 'Bot_02',
      };

      const response = await fetch('http://localhost:5000/api/form-entries', {
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

          <div className="bg-white rounded-[22px] p-5 sm:p-6 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                {formConfig.fixedFields.slice(0, 3).map((field) => (
                  <div key={field.label}>
                    <label className="block text-[13px] font-semibold text-black mb-2">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={field.value}
                      readOnly
                      className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-[#f3f3f3] text-[13px] text-black outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {formConfig.fixedFields.slice(3).map((field) => (
                  <div key={field.label}>
                    <label className="block text-[13px] font-semibold text-black mb-2">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={field.value}
                      readOnly
                      className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-[#f3f3f3] text-[13px] text-black outline-none"
                    />
                  </div>
                ))}

                {formConfig.editableFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-[13px] font-semibold text-black mb-2">
                      {field.label}
                    </label>

                    {field.type === 'file' ? (
                      <div>
                        <div className="space-y-3">
                          <label className="w-full h-[42px] rounded-full bg-black text-white text-[13px] font-semibold flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition duration-300">
                            Upload File
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,image/*"
                              onChange={(e) =>
                                setSelectedFile(e.target.files?.[0] || null)
                              }
                            />
                          </label>

                          <label className="w-full h-[42px] rounded-full border border-black text-black text-[13px] font-semibold flex items-center justify-center cursor-pointer hover:bg-black hover:text-white transition duration-300">
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

                          <div className="w-full min-h-[60px] rounded-[16px] border border-black/20 bg-[#fafafa] flex items-center justify-center px-4 text-center text-[#666] text-[13px]">
                            {selectedFile ? selectedFile.name : 'No file selected'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formValues[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full h-[42px] px-4 rounded-[12px] border border-black/20 bg-white text-[13px] text-black outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
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
        </section>
      </main>
    </div>
  );
}

export default FormDetailsPage;