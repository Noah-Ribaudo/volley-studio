import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_AUTO_TIMEZONE, resolveThemeByTimeZone } from '@/lib/themes'

const DEFAULT_COORDS = {
  latitude: 41.8781,
  longitude: -87.6298,
}

const VERCEL_LAT_HEADER = 'x-vercel-ip-latitude'
const VERCEL_LON_HEADER = 'x-vercel-ip-longitude'
const VERCEL_TZ_HEADER = 'x-vercel-ip-timezone'

type GeoContext = {
  latitude: number | null
  longitude: number | null
  timeZone: string
  source: 'vercel' | 'ipapi' | 'fallback'
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

function parseNumericHeader(headers: Headers, key: string): number | null {
  const value = headers.get(key)
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  )
}

async function fetchIpGeolocation(ip: string): Promise<{
  latitude: number
  longitude: number
  timeZone?: string
} | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return null

    const payload = await response.json() as {
      latitude?: number
      longitude?: number
      timezone?: string
    }

    if (typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number') {
      return null
    }

    return {
      latitude: payload.latitude,
      longitude: payload.longitude,
      timeZone: payload.timezone,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchDaylightStatus(latitude: number, longitude: number): Promise<boolean | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`,
      {
        cache: 'no-store',
        signal: controller.signal,
      }
    )

    if (!response.ok) return null

    const payload = await response.json() as {
      status?: string
      results?: {
        sunrise?: string
        sunset?: string
      }
    }

    if (payload.status !== 'OK' || !payload.results?.sunrise || !payload.results?.sunset) {
      return null
    }

    const sunrise = new Date(payload.results.sunrise)
    const sunset = new Date(payload.results.sunset)
    const now = new Date()

    return now >= sunrise && now < sunset
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function getGeoContext(request: NextRequest): Promise<GeoContext> {
  const headerTimeZone = request.headers.get(VERCEL_TZ_HEADER)
  const safeHeaderTimeZone = headerTimeZone && isValidTimeZone(headerTimeZone)
    ? headerTimeZone
    : DEFAULT_AUTO_TIMEZONE

  const headerLat = parseNumericHeader(request.headers, VERCEL_LAT_HEADER)
  const headerLon = parseNumericHeader(request.headers, VERCEL_LON_HEADER)

  if (headerLat !== null && headerLon !== null) {
    return {
      latitude: headerLat,
      longitude: headerLon,
      timeZone: safeHeaderTimeZone,
      source: 'vercel',
    }
  }

  const ip = readClientIp(request)
  if (ip && !isPrivateIp(ip)) {
    const geo = await fetchIpGeolocation(ip)
    if (geo) {
      const timeZone = geo.timeZone && isValidTimeZone(geo.timeZone)
        ? geo.timeZone
        : safeHeaderTimeZone

      return {
        latitude: geo.latitude,
        longitude: geo.longitude,
        timeZone,
        source: 'ipapi',
      }
    }
  }

  return {
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    timeZone: safeHeaderTimeZone,
    source: 'fallback',
  }
}

export async function GET(request: NextRequest) {
  const geo = await getGeoContext(request)

  let isDaylight = false
  if (geo.latitude !== null && geo.longitude !== null) {
    const fromSunApi = await fetchDaylightStatus(geo.latitude, geo.longitude)
    if (typeof fromSunApi === 'boolean') {
      isDaylight = fromSunApi
    } else {
      isDaylight = resolveThemeByTimeZone(geo.timeZone) === 'light'
    }
  } else {
    isDaylight = resolveThemeByTimeZone(geo.timeZone) === 'light'
  }

  return NextResponse.json({
    timeZone: geo.timeZone,
    isDaylight,
    source: geo.source,
  })
}
