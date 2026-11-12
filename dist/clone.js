// Dán URL Web App Google Apps Script kết thúc bằng /exec vào đây.
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzfqDoYJJH2dz8H_qpgkhaCJiPuZd2KJN6BxhT0Pu39zUSVLoBDRkqWOpAF_Ou-ZGh_vQ/exec'

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
  byId(id).addEventListener('click', openOrder)
}
popup.querySelector('.order-close').addEventListener('click', () => popup.close())
popup.addEventListener('close', () => {
  document.body.classList.remove('order-open')
  if (!submit.disabled) feedback.textContent = ''
})

const submit = form.querySelector('button[type="submit"]')

const orderFields = ['full_name', 'phone_number', 'address', 'package']
const sheetsErrors = {
  invalid_order: 'Google Sheets từ chối dữ liệu. Vui lòng kiểm tra lại thông tin đơn hàng.',
  busy: 'Hệ thống đang bận. Vui lòng thử lại sau vài giây.',
  sheet_write: 'Google Sheets chưa ghi được đơn. Vui lòng liên hệ cửa hàng.',
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (submit.disabled) return

  const formData = new FormData(form)
  const data = new URLSearchParams(orderFields.map((field) => [
    field, String(formData.get(field) ?? '').trim(),
  ]))
  if (!GOOGLE_SHEETS_WEB_APP_URL) {
    feedback.textContent = 'Hệ thống đặt hàng chưa sẵn sàng.'
    return
  }

  submit.disabled = true
  feedback.textContent = 'Đang gửi đơn hàng…'
  try {
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
    form.reset()
  } catch {
    feedback.textContent = 'Chưa xác nhận được đơn hàng. Vui lòng liên hệ cửa hàng để kiểm tra.'
  } finally {
    submit.disabled = false
  }
})
