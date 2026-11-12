const SPREADSHEET_ID = 'DIEN_ID_GOOGLE_SHEET'
const TAB_NAME = 'Đơn hàng'
const FIELDS = ['full_name', 'phone_number', 'address', 'package']
const HEADERS = ['Họ tên', 'Số điện thoại', 'Địa chỉ giao hàng', 'Gói hạt giống']

function doGet() {
  try {
    SpreadsheetApp.openById(SPREADSHEET_ID).getId()
    return reply(true, 'ready_single_address')
  } catch {
    return reply(false, 'sheet_access')
  }
}

function doPost(e) {
  const fields = e?.parameter || {}
  const values = FIELDS.map((field) => String(fields[field] || '').trim())
  if (values.some((value) => !value || value.length > 500)) {
    return reply(false, 'invalid_order')
  }

  const lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) return reply(false, 'busy')
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    let sheet = spreadsheet.getSheetByName(TAB_NAME) || spreadsheet.insertSheet(TAB_NAME)
    if (!matchesOrderLayout(sheet)) {
      const newTabName = TAB_NAME + ' (4 trường)'
      sheet = spreadsheet.getSheetByName(newTabName) || spreadsheet.insertSheet(newTabName)
      if (!matchesOrderLayout(sheet)) return reply(false, 'sheet_write')
    }
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS)

    // Giữ số 0 đầu số điện thoại và ghi dữ liệu nhập dưới dạng văn bản.
    sheet.appendRow(values.map((value) => "'" + value))
    SpreadsheetApp.flush()
    return reply(true)
  } catch (error) {
    console.error(error.message)
    return reply(false, 'sheet_write')
  } finally {
    lock.releaseLock()
  }
}

function matchesOrderLayout(sheet) {
  if (sheet.getLastRow() === 0) return true
  if (sheet.getLastColumn() !== HEADERS.length) return false
  const [headers] = sheet.getRange(1, 1, 1, HEADERS.length).getValues()
  return HEADERS.every((header, index) => header === headers[index])
}

function reply(ok, code) {
  return ContentService.createTextOutput(JSON.stringify({ ok, code }))
    .setMimeType(ContentService.MimeType.JSON)
}
