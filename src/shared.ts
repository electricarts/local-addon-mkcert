export const IPC_GET_STATUS = 'mkcert-ssl:get-status';
export const IPC_GENERATE_FOR_SITE = 'mkcert-ssl:generate-for-site';

export interface MkcertStatus {
  platformSupported: boolean;
  binaryPath?: string;
  version?: string;
  caRoot?: string;
  caFilesPresent: boolean;
  caTrusted: boolean;
  ready: boolean;
  guidance: string[];
}

export interface GenerateResult {
  ok: boolean;
  domain?: string;
  certificatePath?: string;
  keyPath?: string;
  routerReloaded?: boolean;
  httpsEnabled?: boolean;
  wordpressUrlsUpdated?: boolean;
  message: string;
}
