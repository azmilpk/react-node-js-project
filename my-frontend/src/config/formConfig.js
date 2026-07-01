const now = new Date();
const currentYear = String(now.getFullYear());
// "YYYY-MM" e.g. 2026-06
const currentPostingMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
// If you actually want the full date "YYYY-MM-DD":
// const currentPostingMonth = now.toISOString().slice(0, 10);
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
  postingMonth = currentPostingMonth,
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
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Electricity',
      },
      {
        name: 'meterReading',
        label: 'Meter Reading',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
     
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'kWh',
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
        defaultValue: currentPostingMonth,
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
        name:'year',
        label:'Year',
        type:'select',
        options: ['2026','2027','2028','2029','2030'],
        required:true,
        defaultValue: currentYear,
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
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Köping',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Diesel',
      },
      {
        name: 'consumption',
        label: 'Consumption',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
      
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'MWh',
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
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: currentPostingMonth,
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
        name:'year',
        label:'Year',
        type:'select',
        options: ['2026','2027','2028','2029','2030'],
        required:true,
        defaultValue: currentYear,
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
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'District Heating',
      },
      {
        name: 'meterReading',
        label: 'Meter Reading',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
     
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'MWh',
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
        defaultValue: currentPostingMonth,
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
        name:'year',
        label:'Year',
        type:'select',
        options: ['2026','2027','2028','2029','2030'],
        required:true,
        defaultValue: currentYear,
      },
      {
        name: 'attachments',
        label: 'Attachments*',
        type: 'file',
        required: false,
      },
     
    ],
  },

  water: {
    editableFields: [
     
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Köping',
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
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: currentPostingMonth,
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
        name:'year',
        label:'Year',
        type:'select',
        options: ['2026','2027','2028','2029','2030'],
        required:true,
        defaultValue: currentYear,
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
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'LPG',
      },
      {
        name: 'consumption',
        label: 'Consumption',
        type: 'number',
        required: true,
        defaultValue: '12900',
      },
      {
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: currentPostingMonth,
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
        name:'year',
        label:'Year',
        type:'select',
        options: ['2026','2027','2028','2029','2030'],
        required:true,
        defaultValue: currentYear,
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
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'LPG',
      },
      
      {
        name: 'meterReading',
        label: 'Meter Reading',
        type: 'number',
        placeholder: 'Enter the handler',
        required: true,
      },
      
      {
        name: 'units',
        label: 'Units',
        type: 'text',
        required: true,
        defaultValue: 'kWh',
      },
       {
        name: 'accountMeterNo',
        label: 'Account Number / Meter No',
        type: 'select',
        options: ['Solar PV array 75'],
        required: true,
        defaultValue: 'Solar PV array 75',
      },
      {
        name: 'postingMonth',
        label: 'Posting Date Month',
        type: 'text',
        required: true,
        defaultValue: currentPostingMonth,
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
        name:'year',
        label:'Year',
        type:'select',
        options: ['2026','2027','2028','2029','2030'],
        required:true,
        defaultValue: currentYear,
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
    units: 'liters',
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
        defaultValue: currentPostingMonth,
      },
      {
        name: 'year',
        label: 'Year',
        type: 'select',
        options: ['2026','2027','2028','2029','2030'],
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