import axios, { type AxiosInstance } from 'axios'
import type { LocationService } from './location-service'
import type { District, Province, Ward } from './types'

interface LocationItemApiResponse {
  code?: number
  name?: string
}

interface ProvinceDetailApiResponse extends LocationItemApiResponse {
  districts?: LocationItemApiResponse[]
}

interface DistrictDetailApiResponse extends LocationItemApiResponse {
  wards?: LocationItemApiResponse[]
}

interface ProvincesOpenApiLocationServiceOptions {
  baseURL?: string
  httpClient?: AxiosInstance
}

function normalizeLocationList<T extends Province | District | Ward>(
  items: LocationItemApiResponse[] | null | undefined,
): T[] {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .filter((item) => Number.isInteger(item?.code) && typeof item?.name === 'string')
    .map((item) => ({
      code: Number(item.code),
      name: String(item.name).trim(),
    }) as T)
}

export class ProvincesOpenApiLocationService implements LocationService {
  #cache = new Map<string, Promise<Province[] | District[] | Ward[]> | Province[] | District[] | Ward[]>()

  #httpClient: AxiosInstance

  constructor(options: ProvincesOpenApiLocationServiceOptions = {}) {
    this.#httpClient =
      options.httpClient ??
      axios.create({
        baseURL: options.baseURL ?? 'https://provinces.open-api.vn/api',
        timeout: 10000,
        headers: {
          Accept: 'application/json',
        },
      })
  }

  async getProvinces(): Promise<Province[]> {
    return this.#remember('provinces', async () => {
      const response = await this.#httpClient.get<LocationItemApiResponse[]>('/p/')

      return normalizeLocationList<Province>(response.data)
    })
  }

  async getDistricts(provinceCode: number): Promise<District[]> {
    return this.#remember(`districts:${provinceCode}`, async () => {
      const response = await this.#httpClient.get<ProvinceDetailApiResponse>(`/p/${provinceCode}`, {
        params: { depth: 2 },
      })

      return normalizeLocationList<District>(response.data?.districts)
    })
  }

  async getWards(districtCode: number): Promise<Ward[]> {
    return this.#remember(`wards:${districtCode}`, async () => {
      const response = await this.#httpClient.get<DistrictDetailApiResponse>(`/d/${districtCode}`, {
        params: { depth: 2 },
      })

      return normalizeLocationList<Ward>(response.data?.wards)
    })
  }

  async #remember<T extends Province[] | District[] | Ward[]>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cachedValue = this.#cache.get(key)

    if (cachedValue) {
      return Promise.resolve(cachedValue as T)
    }

    const pendingValue = loader()
      .then((value) => {
        this.#cache.set(key, value)
        return value
      })
      .catch((error) => {
        this.#cache.delete(key)
        throw error
      })

    this.#cache.set(key, pendingValue)

    return pendingValue
  }
}

export function createProvincesOpenApiLocationService(
  options: ProvincesOpenApiLocationServiceOptions = {},
): LocationService {
  return new ProvincesOpenApiLocationService(options)
}
