export type SettingValue = string | number | boolean;
export type SettingDefinition = {
  default: SettingValue;
  apply?: (value: SettingValue) => void;
};
