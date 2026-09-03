import { env } from '../config/env.js'
import { localStorage } from './storage/local.js'
import { supabaseStorage } from './storage/supabase.js'
import { r2Storage } from './storage/r2.js'

const drivers = { local: localStorage, supabase: supabaseStorage, r2: r2Storage }

export const storage = drivers[env.STORAGE_DRIVER] || localStorage
export { drivers }
