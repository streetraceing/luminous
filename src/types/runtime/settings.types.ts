export type SettingValue = string | number | boolean;

export type SettingDefinition = {
  default: SettingValue;
  normalize?: (value: unknown) => SettingValue;
  apply?: (value: SettingValue) => void;
};

export type SettingListener<T extends SettingValue = SettingValue> = (
  value: T,
  key: string,
) => void;
