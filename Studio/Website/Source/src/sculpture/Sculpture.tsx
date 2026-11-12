import { createEffect } from 'solid-js'
import { pageUrl } from '../content'
import './sculpture.css'

const copy = {
  en: {
    role: 'playable console',
    label: 'Sindibad pocket console, a mini game you can play. Arrow keys or WASD move, Z, Space or Enter press A, X presses B, M turns the sound on or off. Drag the console to spin it.',
  },
  ar: {
    role: 'جهاز ألعاب تفاعلي',
    label: 'جهاز سندباد المحمول، لعبة صغيرة يمكنك أن تلعبها. تحرّك بالأسهم أو بمفاتيح WASD، واضغط Z أو المسافة أو Enter للزر A، وX للزر B، وM لتشغيل الصوت أو إيقافه. اسحب الجهاز لتدويره.',
  },
}

export default function Sculpture(props: { arabic: boolean }) {
  let host!: HTMLDivElement
  createEffect(() => props.arabic, arabic => {
    const controller = new AbortController()
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      import('./scene').then(({ mountSculpture }) => {
        if (!controller.signal.aborted) return mountSculpture(host, controller.signal, { arabic })
      }).catch(() => { delete host.dataset.ready })
    }, { rootMargin: '200px' })
    observer.observe(host)
    return () => { observer.disconnect(); controller.abort() }
  })
  const text = () => (props.arabic ? copy.ar : copy.en)
  return (
    <div class="footer-sculpture" ref={host} role="application" tabindex="0" aria-disabled="true"
      aria-roledescription={text().role} aria-label={text().label}>
      <img class="sculpture-poster" src={pageUrl('console/poster.webp')} alt="" width="900" height="900" loading="lazy" draggable="false" />
      <canvas aria-hidden="true" />
    </div>
  )
}
