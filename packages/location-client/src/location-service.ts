import type { District, Province, Ward } from './types'

export interface LocationService {
  getProvinces(): Promise<Province[]>
  getDistricts(provinceCode: number): Promise<District[]>
  getWards(districtCode: number): Promise<Ward[]>
}
