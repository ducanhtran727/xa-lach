// Dán URL Web App Google Apps Script kết thúc bằng /exec vào đây.
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw7-FKDlmkvl5PbE1zDysY7_OTmAN4Acl7lAI5FI_ezDHHurXA6vCex3IiqePuAMqVVjg/exec'

const byId = (id) => document.getElementById(id)
const gallery = byId('w-jzvgamuh')
const slides = [...gallery.querySelectorAll('.gallery-view-item')]
const thumbnails = [...gallery.querySelectorAll('.gallery-controls-item')]
let currentSlide = 0

function action(element, label, handler) {
  element.setAttribute('role', 'button')
  element.setAttribute('aria-label', label)
  element.tabIndex = 0
  element.addEventListener('click', handler)
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handler()
    }
  })
}

function showSlide(index) {
  currentSlide = (index + slides.length) % slides.length
  slides.forEach((slide, i) => slide.classList.toggle('active', i === currentSlide))
  thumbnails.forEach((thumbnail, i) => {
    thumbnail.classList.toggle('active', i === currentSlide)
    thumbnail.setAttribute('aria-pressed', String(i === currentSlide))
  })
  const thumbnail = thumbnails[currentSlide]
  gallery.querySelector('.gallery-scroll').scrollLeft = Math.max(0, thumbnail.offsetLeft - thumbnail.offsetWidth)
}

thumbnails.forEach((thumbnail, i) => action(thumbnail, `Ảnh sản phẩm ${i + 1}`, () => showSlide(i)))
for (const kind of ['view', 'controls']) {
  action(gallery.querySelector(`.gallery-${kind}-icon-prev`), 'Ảnh trước', () => showSlide(currentSlide - 1))
  action(gallery.querySelector(`.gallery-${kind}-icon-next`), 'Ảnh tiếp theo', () => showSlide(currentSlide + 1))
}
showSlide(0)

const galleryView = gallery.querySelector('.gallery-view')
let touchX
galleryView.addEventListener('touchstart', (event) => { touchX = event.changedTouches[0].clientX }, { passive: true })
galleryView.addEventListener('touchend', (event) => {
  const delta = event.changedTouches[0].clientX - touchX
  if (Math.abs(delta) > 40) showSlide(currentSlide - Math.sign(delta))
}, { passive: true })

const timer = byId('w-oriolupf')
const digits = ['hour', 'minute', 'second'].map((unit) =>
  timer.querySelectorAll(`.countdown-item-${unit} .show`)
)
const startedAt = Date.now()
function updateTimer() {
  const seconds = 59 * 60 - Math.floor((Date.now() - startedAt) / 1000) % (59 * 60)
  const values = [0, Math.floor(seconds / 60), seconds % 60]
  digits.forEach((pair, i) => {
    const value = String(values[i]).padStart(2, '0')
    pair.forEach((digit, j) => { digit.textContent = value[j] })
  })
}
updateTimer()
setInterval(updateTimer, 1000)

const popup = byId('order-dialog')
const form = byId('ykt0scmz')
const feedback = popup.querySelector('.order-feedback')

function openOrder() {
  popup.showModal()
  document.body.classList.add('order-open')
}

for (const id of ['w-qbrn1zhe', 'w-2hmqlp43']) {
  action(byId(id), 'Đặt mua ngay', openOrder)
}
popup.querySelector('.order-close').addEventListener('click', () => popup.close())
popup.addEventListener('close', () => {
  document.body.classList.remove('order-open')
  if (!submit.disabled) feedback.textContent = ''
})

const submit = form.querySelector('button[type="submit"]')

const order = document.createElement('dialog')
order.className = 'order-summary'
order.innerHTML = `
  <h2>Thông tin đặt hàng</h2>
  <p>Đơn chưa được gửi. Bạn có thể sao chép thông tin rồi gửi qua Zalo để đặt hàng.</p>
  <textarea readonly aria-label="Nội dung đặt hàng"></textarea>
  <div class="order-actions">
    <button type="button" class="copy-order">Sao chép</button>
    <a href="https://zalo.me/0388403111" target="_blank" rel="noopener">Mở Zalo</a>
    <button type="button" class="close-summary">Quay lại</button>
  </div>
  <p class="copy-status" role="status"></p>
`
document.body.append(order)
const orderText = order.querySelector('textarea')
const copyStatus = order.querySelector('.copy-status')
order.querySelector('.close-summary').addEventListener('click', () => order.close())
order.querySelector('.copy-order').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(orderText.value)
    copyStatus.textContent = 'Đã sao chép thông tin.'
  } catch {
    orderText.select()
    copyStatus.textContent = 'Thông tin đã được chọn. Bạn có thể dùng lệnh sao chép của thiết bị.'
  }
})
let pendingOrder

const sheetsErrors = {
  invalid_order: 'Google Sheets từ chối dữ liệu. Vui lòng kiểm tra lại thông tin đơn hàng.',
  busy: 'Hệ thống đang bận. Vui lòng thử lại sau vài giây.',
  sheet_write: 'Google Sheets chưa ghi được đơn. Vui lòng liên hệ cửa hàng.',
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (submit.disabled) return

  const data = new URLSearchParams(new FormData(form))
  const address = data.get('address').trim()
  orderText.value = [
    'Đặt hạt giống xà lách Sanchu F1',
    `Họ tên: ${data.get('full_name').trim()}`,
    `Số điện thoại: ${data.get('phone_number')}`,
    `Địa chỉ: ${address}`,
    `Gói đã chọn: ${data.get('package')}`,
  ].join('\n')
  copyStatus.textContent = ''
  if (!GOOGLE_SHEETS_WEB_APP_URL) {
    order.showModal()
    return
  }

  // Giữ cùng mã đơn khi khách gửi lại cùng dữ liệu sau lỗi mạng.
  submit.disabled = true
  feedback.textContent = 'Đang gửi đơn hàng…'
  try {
    const payload = data.toString()
    if (pendingOrder?.payload !== payload) {
      pendingOrder = { payload, id: crypto.randomUUID() }
    }
    data.set('order_id', pendingOrder.id)
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      body: data,
      credentials: 'omit',
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error('Apps Script HTTP ' + response.status)
    const result = await response.json()
    if (result.ok !== true) {
      feedback.textContent = sheetsErrors[result.code] ||
        'Apps Script đã nhận yêu cầu nhưng chưa ghi đơn. Vui lòng liên hệ cửa hàng.'
      return
    }
    feedback.textContent = 'Đã gửi đơn hàng thành công.'
    pendingOrder = undefined
    form.reset()
  } catch {
    feedback.textContent = 'Chưa xác nhận được đơn hàng. Bạn có thể bấm Đặt hàng để thử lại.'
  } finally {
    submit.disabled = false
  }
})
