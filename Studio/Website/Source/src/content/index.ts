import { createContext, useContext } from 'solid-js'
import { ar } from './ar'
import { en } from './en'
import type { Content } from './types'

export type { Content, Item, Lang, Shot } from './types'

/** Picks the copy for a page from its `<html lang>`, defaulting to English. */
export const contentFor = (lang: string): Content => (lang === 'ar' ? ar : en)

/** The copy for the language a page is not in (Mirage shows both side by side). */
export const otherContent = (content: Content): Content => (content.lang === 'ar' ? en : ar)

export const ContentContext = createContext<Content>()
export const useContent = () => useContext(ContentContext)

/** Absolute URL of a page path under the deploy base (e.g. `/sindibad-studio-website/ar/`). */
export const pageUrl = (path: string) => import.meta.env.BASE_URL + path
