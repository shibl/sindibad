import { createSignal, onSettled } from 'solid-js'

/** The current year for the copyright line. */
export default function Year() {
  // Prerendered with the build year (so hydration matches), then corrected in the browser in
  // case the site hasn't been rebuilt since.
  const [year, setYear] = createSignal(__BUILD_YEAR__)
  onSettled(() => {
    setYear(new Date().getFullYear())
  })
  return <>{year()}</>
}
