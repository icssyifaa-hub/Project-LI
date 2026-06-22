export const JOB_ORDER_NUMBER_EXAMPLE = 'QE26_001'
export const FINAL_REPORT_NUMBER_EXAMPLE = 'ICS/26-001'

const JOB_ORDER_NUMBER_PATTERN = /^QE\d{2}_\d{3}$/
const FINAL_REPORT_NUMBER_PATTERN = /^ICS\/\d{2}-\d{3}$/

export const normalizeJobOrderNumber = (value: string) =>
  value.trim().toUpperCase().replace(/\s*_\s*/g, '_')

export const normalizeFinalReportNumber = (value: string) =>
  value.trim().toUpperCase().replace(/\s*\/\s*/g, '/').replace(/\s*-\s*/g, '-')

export const validateJobOrderNumberFormat = (value: string) => {
  const normalized = normalizeJobOrderNumber(value)
  return !normalized || JOB_ORDER_NUMBER_PATTERN.test(normalized)
}

export const validateFinalReportNumberFormat = (value: string) => {
  const normalized = normalizeFinalReportNumber(value)
  return !normalized || FINAL_REPORT_NUMBER_PATTERN.test(normalized)
}
