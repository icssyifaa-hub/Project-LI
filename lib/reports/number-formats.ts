export const JOB_ORDER_NUMBER_EXAMPLE = 'QE26/001 or QS26/001'
export const FINAL_REPORT_NUMBER_EXAMPLE = 'ICS/26-001'
export const AUD_FINAL_REPORT_NUMBER_EXAMPLE = 'AUD/26/001/01'

const JOB_ORDER_NUMBER_PATTERN = /^(QE|QS)\d{2}\/\d{3}$/
const FINAL_REPORT_NUMBER_PATTERN = /^ICS\/\d{2}-\d{3}$/
const AUD_FINAL_REPORT_NUMBER_PATTERN = /^AUD\/\d{2}\/\d{3}\/\d{2}$/

export const normalizeJobOrderNumber = (value: string) =>
  value.trim().toUpperCase().replace(/\s*\/\s*/g, '/')

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

export const isAudiometryJobTask = (jobTask: string | null | undefined) => {
  const normalized = String(jobTask || '').trim().toUpperCase()
  return normalized.includes('AUDIOMETRY') || /\bAUD\b/.test(normalized)
}

export const getFinalReportNumberExample = (jobTask: string | null | undefined) =>
  isAudiometryJobTask(jobTask) ? AUD_FINAL_REPORT_NUMBER_EXAMPLE : FINAL_REPORT_NUMBER_EXAMPLE

export const validateFinalReportNumberForJobTask = (
  value: string,
  jobTask: string | null | undefined
) => {
  const normalized = normalizeFinalReportNumber(value)
  if (!normalized) return true
  return isAudiometryJobTask(jobTask)
    ? AUD_FINAL_REPORT_NUMBER_PATTERN.test(normalized)
    : FINAL_REPORT_NUMBER_PATTERN.test(normalized)
}
