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

const popup = byId('w-__popup_default__')
const backdrop = byId('popup-backdrop')
const form = byId('ykt0scmz')
let opener

popup.setAttribute('role', 'dialog')
popup.setAttribute('aria-modal', 'true')
popup.setAttribute('aria-label', 'Đặt mua ngay')

function openOrder(trigger) {
  opener = trigger
  popup.classList.remove('d-none')
  backdrop.classList.remove('d-none')
  document.body.classList.add('order-open')
  byId('w-ph5ut51q').focus()
}

function closeOrder() {
  popup.classList.add('d-none')
  backdrop.classList.add('d-none')
  document.body.classList.remove('order-open')
  opener?.focus()
}

for (const id of ['w-qbrn1zhe', 'w-2hmqlp43']) {
  const trigger = byId(id)
  action(trigger, 'Đặt mua ngay', () => openOrder(trigger))
}
action(byId('w-ph5ut51q'), 'Đóng biểu mẫu đặt hàng', closeOrder)
backdrop.addEventListener('click', closeOrder)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !popup.classList.contains('d-none')) closeOrder()
})

const submit = byId('w-rcz96ssh').querySelector('button')
submit.removeAttribute('style')
submit.setAttribute('aria-label', 'Xem thông tin đặt hàng')

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
form.addEventListener('submit', (event) => {
  event.preventDefault()
  const data = new FormData(form)
  const address = ['address', 'commune_id', 'district_id', 'province_id']
    .map((name) => data.get(name).trim()).join(', ')
  orderText.value = [
    'Đặt hạt giống xà lách Sanchu F1',
    `Họ tên: ${data.get('full_name').trim()}`,
    `Số điện thoại: ${data.get('phone_number')}`,
    `Địa chỉ: ${address}`,
    `Gói đã chọn: ${data.get('package')}`,
  ].join('\n')
  copyStatus.textContent = ''
  order.showModal()
})
