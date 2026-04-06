// Tristar Physical Therapy clinic and provider directory

export const CLINICS = [
  { id: 'main', name: 'Tristar PT — Main Clinic', npi: '' },
  { id: 'east', name: 'Tristar PT — East', npi: '' },
  { id: 'west', name: 'Tristar PT — West', npi: '' },
];

export const PROVIDER_TYPES = [
  { value: 'PT', label: 'Physical Therapist' },
  { value: 'PTA', label: 'Physical Therapist Assistant' },
  { value: 'OT', label: 'Occupational Therapist' },
  { value: 'OTA', label: 'OT Assistant' },
  { value: 'SLP', label: 'Speech-Language Pathologist' },
];

export const DEFAULT_PROVIDERS = [
  { id: '1', name: 'Jordan Black', type: 'PT', clinic: 'main' },
];

export function getClinicLabel(clinicId) {
  return CLINICS.find(c => c.id === clinicId)?.name || clinicId;
}

export function getProviderTypeLabel(typeValue) {
  return PROVIDER_TYPES.find(t => t.value === typeValue)?.label || typeValue;
}
