const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const directEntryForm = ({
  facilityDefault = '',
  utility,
  units,
  postingMonth = '2026-01',
  accountMeterNoDefault,
  consumptionLabel = 'Consumption',
  consumptionPlaceholder = 'Enter value',
}) => ({
  editableFields: [
    {
      name: 'facility',
      label: 'Facility',
      type: 'text',
      required: true,
      defaultValue: facilityDefault,
    },
    {
      name: 'postingMonth',
      label: 'Posting Date Month',
      type: 'text',
      required: true,
      defaultValue: postingMonth,
    },
    {
      name: 'utility',
      label: 'Utility',
      type: 'text',
      required: true,
      defaultValue: utility,
    },
    {
      name: 'units',
      label: 'Units',
      type: 'text',
      required: true,
      defaultValue: units,
    },
    {
      name: 'accountMeterNo',
      label: 'Account Number / Meter No',
      type: 'text',
      required: true,
      defaultValue: accountMeterNoDefault,
    },
    {
      name: 'consumption',
      label: consumptionLabel,
      type: 'number',
      placeholder: consumptionPlaceholder,
      required: true,
    },
    {
      name: 'attachments',
      label: 'Attachments',
      type: 'file',
      required: false,
    },
  ],
});

const kopingForms = {
  electricity: {
    editableFields: [
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Köping',
      },
      {
        name: 'meterReading',
        label: 'Meter Reading',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
      {
        name: 'reportingMonth',
        label: 'Reporting Month',
        type: 'select',
        required: true,
        options: months,
        defaultValue: 'January',
      },
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'kWh',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Electricity',
      },
      {
        name: 'accountMeterNo',
        label: 'Account Number / Meter No',
        type: 'select',
        required: true,
        options: ['Elektriciteit_billadaplaser_kwh'],
        defaultValue: 'Elektriciteit_billadaplaser_kwh',
      },
      {
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: '2026-01',
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'file',
        required: false,
      },
    ],
  },

  diesel: {
    editableFields: [
      {
        name: 'reportingMonth',
        label: 'Reporting Month',
        type: 'select',
        required: true,
        options: months,
        defaultValue: 'January',
      },
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Köping',
      },
      {
        name: 'consumption',
        label: 'Consumption',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
      {
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: '2026-01',
      },
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'MWh',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Diesel',
      },
      {
        name: 'accountMeterNo',
        label: 'Account Number / Meter No',
        type: 'select',
        required: true,
        options: ['Diesel'],
        defaultValue: 'Diesel',
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'file',
        required: false,
      },
    ],
  },

  'district-heating': {
    editableFields: [
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Köping',
      },
      {
        name: 'meterReading',
        label: 'Meter Reading',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
      {
        name: 'reportingMonth',
        label: 'Reporting Month',
        type: 'select',
        required: true,
        options: months,
        defaultValue: 'January',
      },
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'MWh',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'District Heating',
      },
      {
        name: 'accountMeterNo',
        label: 'Account Number / Meter No',
        type: 'select',
        required: true,
        options: ['Huvudmätare_1_MWh'],
        defaultValue: 'Huvudmätare_1_MWh',
      },
      {
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: '2026-01',
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'file',
        required: false,
      },
    ],
  },

  water: {
    editableFields: [
      {
        name: 'reportingMonth',
        label: 'Reporting Month',
        type: 'select',
        required: true,
        options: months,
        defaultValue: 'January',
      },
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Köping',
      },
      {
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: '2026-01',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Water',
      },
      {
        name: 'freshWater',
        label: 'Fresh water(%)',
        type: 'text',
        required: true,
        defaultValue: '0.9',
      },
      {
        name: 'evaporationFactor',
        label: 'Evaporation Factor',
        type: 'text',
        required: true,
        defaultValue: '1.25',
      },
      {
        name: 'accountMeterNo',
        label: 'Account Number / Meter No',
        type: 'select',
        required: true,
        options: ['12812696_A_verkstad'],
        defaultValue: '12812696_A_verkstad',
      },
      {
        name: 'meterReading',
        label: 'Meter Reading',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'file',
        required: false,
      },
    ],
  },

  lpg: {
    editableFields: [
      {
        name: 'consumption',
        label: 'Consumption',
        type: 'number',
        required: true,
        defaultValue: '12900',
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'file',
        required: false,
      },
    ],
  },
};

const nrvForms = {
  'renewable-electricity': {
    editableFields: [
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'NRV',
      },
      {
        name: 'meterReading',
        label: 'Meter Reading',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
      {
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: '2026-05',
      },
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'kWh',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Renewable Electricity',
      },
      {
        name: 'accountMeterNo',
        label: 'Account Number / Meter No',
        type: 'text',
        required: true,
        defaultValue: 'Solar PV array 75',
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'file',
        required: false,
      },
    ],
  },
};

const lvlcForms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'TEST-LVLC-ENERGY-001',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'TEST-LVLC-NG-001',
  }),
  propane: directEntryForm({
    utility: 'Propane',
    units: 'litres',
    accountMeterNoDefault: 'TEST-LVLC-PROP-001',
  }),
};

const macungieForms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'TEST-MAC-ENERGY-001',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'TEST-MAC-NG-001',
  }),
  gasoline: directEntryForm({
    utility: 'Gasoline',
    units: 'litres',
    accountMeterNoDefault: 'TEST-MAC-GASOLINE-001',
  }),
  'produced-units': {
    editableFields: [
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: '',
      },
      {
        name: 'postingMonth',
        label: 'Posting Month',
        type: 'month',
        required: true,
        defaultValue: '2026-06',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Produced Units',
      },
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'units',
      },
      {
        name: 'accountMeterNo',
        label: 'Account Number / Meter No',
        type: 'text',
        required: true,
        defaultValue: 'TEST-MAC-PU-001',
      },
      {
        name: 'producedQuantity',
        label: 'Produced Units',
        type: 'number',
        placeholder: 'Enter produced units',
        required: true,
      },
      {
        name: 'attachments',
        label: 'Attachments',
        type: 'file',
        required: false,
      },
    ],
  },
};

const mecForms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'TEST-MEC-ENERGY-001',
  }),
  propane: directEntryForm({
    utility: 'Propane',
    units: 'litres',
    accountMeterNoDefault: 'TEST-MEC-PROP-001',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'TEST-MEC-NG-001',
  }),
  diesel: directEntryForm({
    utility: 'Diesel',
    units: 'litres',
    accountMeterNoDefault: 'TEST-MEC-DIESEL-001',
  }),
  water: directEntryForm({
    utility: 'Water',
    units: 'm3',
    accountMeterNoDefault: 'TEST-MEC-WATER-001',
  }),
};

const rt100Forms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'TEST-RT100-ENERGY-001',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'TEST-RT100-NG-001',
  }),
  water: directEntryForm({
    utility: 'Water',
    units: 'm3',
    accountMeterNoDefault: 'TEST-RT100-WATER-001',
  }),
};

export const formConfigBySiteUtility = {
  'Köping': kopingForms,
  'NRV': nrvForms,
  'LVLC': lvlcForms,
  'Macungie': macungieForms,
  'MEC': mecForms,
  'RT100': rt100Forms,
};