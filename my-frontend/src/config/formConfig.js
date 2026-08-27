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
      label: 'Meter Reference',
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

const alphaPlantForms = {
  electricity: {
    editableFields: [
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Alpha Plant',
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
        label: 'Meter Reference',
        type: 'select',
        required: true,
        options: ['DEMO-METER-001', 'DEMO-METER-002'],
        defaultValue: 'DEMO-METER-001',
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
        defaultValue: 'Alpha Plant',
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
        label: 'Meter Reference',
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
        defaultValue: 'Alpha Plant',
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
        label: 'Meter Reference',
        type: 'select',
        required: true,
        options: ['DEMO-METER-003', 'DEMO-METER-004', 'DEMO-METER-005',
          'DEMO-METER-006', 'DEMO-METER-007', 'DEMO-METER-008'],
        defaultValue: 'DEMO-METER-003',
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
        defaultValue: 'Alpha Plant',
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
        label: 'Meter Reference',
        type: 'select',
        required: true,
        options: ['DEMO-METER-009', 'DEMO-METER-010', 'DEMO-METER-011', 'DEMO-METER-012',
          'DEMO-METER-013', 'DEMO-METER-014', 'DEMO-METER-015', 'DEMO-METER-016'],
        defaultValue: 'DEMO-METER-009',
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
        defaultValue: 'm3',
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

const bravoPlantForms = {
  'renewable-electricity': {
    editableFields: [
      {
        name: 'facility',
        label: 'Facility',
        type: 'text',
        required: true,
        defaultValue: 'Bravo Plant',
      },
      {
        name: 'utility',
        label: 'Utility',
        type: 'text',
        required: true,
        defaultValue: 'Renewable Electricity',
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
        label: 'Meter Reference',
        type: 'select',
        options: ['DEMO-METER-017', 'DEMO-METER-018'],
        required: true,
        defaultValue: 'DEMO-METER-017',
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

const charliePlantForms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'DEMO-METER-001',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'DEMO-METER-002',
  }),
  propane: directEntryForm({
    utility: 'Propane',
    units: 'liters',
    accountMeterNoDefault: 'DEMO-METER-003',
  }),
};

const deltaPlantForms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'DEMO-METER-019',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'DEMO-METER-020',
  }),
  gasoline: directEntryForm({
    utility: 'Gasoline',
    units: 'litres',
    accountMeterNoDefault: 'DEMO-METER-021',
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
        label: 'Meter Reference',
        type: 'text',
        required: true,
        defaultValue: 'DEMO-METER-022',
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

const echoPlantForms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'DEMO-METER-007',
  }),
  propane: directEntryForm({
    utility: 'Propane',
    units: 'litres',
    accountMeterNoDefault: 'DEMO-METER-008',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'DEMO-METER-009',
  }),
  diesel: directEntryForm({
    utility: 'Diesel',
    units: 'litres',
    accountMeterNoDefault: 'DEMO-METER-010',
  }),
  water: directEntryForm({
    utility: 'Water',
    units: 'm3',
    accountMeterNoDefault: 'DEMO-METER-011',
  }),
};

const foxtrotPlantForms = {
  'energy-consumption': directEntryForm({
    utility: 'Energy Consumption',
    units: 'kWh',
    accountMeterNoDefault: 'DEMO-METER-004',
  }),
  'natural-gas': directEntryForm({
    utility: 'Natural Gas',
    units: 'm3',
    accountMeterNoDefault: 'DEMO-METER-005',
  }),
  water: directEntryForm({
    utility: 'Water',
    units: 'm3',
    accountMeterNoDefault: 'DEMO-METER-006',
  }),
};

export const formConfigBySiteUtility = {
  'Alpha Plant': alphaPlantForms,
  'Bravo Plant': bravoPlantForms,
  'Charlie Plant': charliePlantForms,
  'Delta Plant': deltaPlantForms,
  'Echo Plant': echoPlantForms,
  'Foxtrot Plant': foxtrotPlantForms,
};
