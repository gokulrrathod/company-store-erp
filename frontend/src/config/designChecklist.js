// Mirrors backend/src/config/designChecklist.js — the 13 items a Checker must complete before approving
export const CHECKLIST_ITEMS = [
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'tolerances', label: 'Tolerances' },
  { key: 'material_grade', label: 'Material Grade' },
  { key: 'welding_details', label: 'Welding Details' },
  { key: 'shaft_design', label: 'Shaft Design' },
  { key: 'bearing_selection', label: 'Bearing Selection' },
  { key: 'gearbox_selection', label: 'Gearbox Selection' },
  { key: 'structural_load', label: 'Structural Load' },
  { key: 'corrosion_allowance', label: 'Corrosion Allowance' },
  { key: 'interface_matching', label: 'Interface Matching' },
  { key: 'manufacturability', label: 'Manufacturability' },
  { key: 'drawing_standard', label: 'Drawing Standard' },
  { key: 'bom_accuracy', label: 'BOM Accuracy' },
];
