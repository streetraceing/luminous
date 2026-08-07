export type SettingValue = string | number | boolean;

export type SettingDefinition<T extends SettingValue = SettingValue> = {
  default: T;
  normalize?: (value: unknown) => T;
  apply?: (value: T) => void;
};

export type SettingListener<T extends SettingValue = SettingValue> = (
  value: T,
  key: string,
) => void;

export type SettingSnapshot = Record<string, SettingValue>;
