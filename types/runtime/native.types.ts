export type VersionInfo = {
  containerVersion: string;
  containerBuildType: string;
  containerPlatform: string;
  uiVersion: string;
  cefVersion: string;
  cefRuntime?: string;
};
export type ToastPayload = {
  title: string;
  body: string;
};
