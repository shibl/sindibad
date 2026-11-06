// The hoopoe guide: enormous live type, and the game's bird living on it. See main.ts.
import type { AboutMount } from '../types'
import { mountHoopoe } from './main'

const mount: AboutMount = ctx => mountHoopoe(ctx)
export default mount
