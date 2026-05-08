import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const isProd = import.meta.env.PROD

export const logger = {
  debug: (...args: unknown[]) => { if (!isProd) console.debug('[cockpit]', ...args) },
  info:  (...args: unknown[]) => { if (!isProd) console.info('[cockpit]', ...args) },
  warn:  (...args: unknown[]) => console.warn('[cockpit]', ...args),
  error: (...args: unknown[]) => console.error('[cockpit]', ...args),
}
