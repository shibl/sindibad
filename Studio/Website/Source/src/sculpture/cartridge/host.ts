import type { CartridgeEvent } from '../cartridge'
import type { Gfx } from './gfx'
import type { Sfx } from './sound'

/** What the screens (face, voyage) get from the cartridge. */
export interface Host {
  readonly g: Gfx
  readonly reduced: boolean
  emit(event: CartridgeEvent): void
  sfx(name: Sfx): void
  rand(): number
  readonly best: number
  saveBest(score: number): void
}
