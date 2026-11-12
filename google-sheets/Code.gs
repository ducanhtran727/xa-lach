const SPREADSHEET_ID = 'DIEN_ID_GOOGLE_SHEET'
const TAB_NAME = 'Đơn hàng'
const FIELDS = [
  'full_name', 'phone_number', 'address', 'commune_id', 'district_id',
  'province_id', 'package',
]

function doGet() {
  try {
    SpreadsheetApp.openById(SPREADSHEET_ID).getId()
    return reply(true, 'ready_single_address')
  } catch {
    return reply(false, 'sheet_access')
  }
}

function doPost(e) {
  const fields = e.parameter
  const orderId = String(fields.order_id || '')
  const values = FIELDS.map((field) => String(fields[field] || '').trim())
  const requiredFields = ['full_name', 'phone_number', 'address', 'package']
  if (!/^[a-f0-9-]{36}$/i.test(orderId) ||
      requiredFields.some((field) => !values[FIELDS.indexOf(field)]) ||
      values.some((value) => value.length > 500)) {
    return reply(false, 'invalid_order')
  }

  const lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) return reply(false, 'busy')
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    const sheet = spreadsheet.getSheetByName(TAB_NAME) || spreadsheet.insertSheet(TAB_NAME)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Mã đơn', 'Thời gian', 'Họ tên', 'Số điện thoại', 'Địa chỉ',
        'Phường/Xã', 'Quận/Huyện', 'Tỉnh/Thành phố', 'Gói mua',
      ])
    }
    const lastRow = sheet.getLastRow()
    const existing = lastRow > 1 && sheet.getRange(2, 1, lastRow - 1, 1)
      .createTextFinder(orderId).matchEntireCell(true).findNext()
    if (!existing) {
      // Ghi dạng văn bản để giữ số 0 đầu số điện thoại và tránh công thức từ dữ liệu nhập.
      sheet.appendRow([orderId, new Date(), ...values.map((value) => value ? "'" + value : '')])
      SpreadsheetApp.flush()
    }
    return reply(true)
  } catch (error) {
    console.error(error.message)
    return reply(false, 'sheet_write')
  } finally {
    lock.releaseLock()
  }
}

function reply(ok, code) {
  return ContentService.createTextOutput(JSON.stringify({ ok, code }))
    .setMimeType(ContentService.MimeType.JSON)
}
