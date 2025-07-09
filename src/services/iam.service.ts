export interface IAMService {
  getAccessToken(): Promise<string>
}
