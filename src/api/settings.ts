import {
  SettingDefinition,
  SettingListener,
  SettingValue,
} from '../types/runtime/settings.types';

export class Settings {
  private static readonly STORAGE_KEY = 'luminous-settings';

  private static registry = new Map<string, SettingDefinition>();
  private static values = new Map<string, SettingValue>();
  private static listeners = new Map<string, Set<SettingListener>>();
  private static savedValues = new Map<string, unknown>();
  private static initialized = false;

  static init() {
    if (this.initialized) return;

    this.initialized = true;
    const savedValues = this.readSavedValues();
    Object.entries(savedValues).forEach(([key, value]) => {
      this.savedValues.set(key, value);
    });

    this.registry.forEach((definition, key) => {
      const value = this.normalizeValue(definition, this.savedValues.get(key));
      this.values.set(key, value);
      this.savedValues.set(key, value);
      this.apply(key, definition, value);
    });

    this.persist();
  }

  static register(key: string, definition: SettingDefinition) {
    this.registry.set(key, definition);

    if (!this.initialized) return;

    const value = this.normalizeValue(
      definition,
      this.values.get(key) ?? this.savedValues.get(key),
    );
    this.values.set(key, value);
    this.savedValues.set(key, value);
    this.apply(key, definition, value);
    this.persist();
  }

  static get<T extends SettingValue>(key: string): T {
    return this.values.get(key) as T;
  }

  static set(key: string, value: SettingValue) {
    const definition = this.registry.get(key);

    if (!definition) {
      Luminous.Logger.warn('Main', `Unknown setting: ${key}`);
      return;
    }

    const normalized = this.normalizeValue(definition, value);
    this.values.set(key, normalized);
    this.savedValues.set(key, normalized);
    this.apply(key, definition, normalized);
    this.emit(key, normalized);
    this.persist();
  }

  static reset(key: string) {
    const definition = this.registry.get(key);
    if (!definition) return;

    this.set(key, definition.default);
  }

  static resetMany(keys: string[]) {
    keys.forEach((key) => {
      const definition = this.registry.get(key);
      if (!definition) return;

      const value = this.normalizeValue(definition, definition.default);
      this.values.set(key, value);
      this.savedValues.set(key, value);
      this.apply(key, definition, value);
      this.emit(key, value);
    });

    this.persist();
  }

  static subscribe<T extends SettingValue>(
    key: string,
    listener: SettingListener<T>,
    options: { immediate?: boolean } = {},
  ): () => void {
    this.getListeners(key).add(listener as SettingListener);

    if (options.immediate && this.values.has(key)) {
      this.callListener(
        key,
        listener as SettingListener,
        this.values.get(key)!,
      );
    }

    return () => {
      this.listeners.get(key)?.delete(listener as SettingListener);
    };
  }

  private static readSavedValues(): Record<string, unknown> {
    try {
      const saved = Spicetify.LocalStorage.get(this.STORAGE_KEY);
      if (!saved) return {};

      const parsed: unknown = JSON.parse(saved);

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      Luminous.Logger.warn('Main', 'Failed to read saved settings', error);
    }

    return {};
  }

  private static normalizeValue(
    definition: SettingDefinition,
    value: unknown,
  ): SettingValue {
    let normalized = value;

    if (definition.normalize) {
      try {
        normalized = definition.normalize(value);
      } catch (error) {
        Luminous.Logger.warn(
          'Main',
          'Failed to normalize setting value',
          error,
        );
        return definition.default;
      }
    }

    if (typeof normalized === typeof definition.default) {
      if (typeof normalized !== 'number' || Number.isFinite(normalized)) {
        return normalized as SettingValue;
      }
    }

    Luminous.Logger.warn('Main', 'Invalid setting value, using default');
    return definition.default;
  }

  private static apply(
    key: string,
    definition: SettingDefinition,
    value: SettingValue,
  ) {
    try {
      definition.apply?.(value);
    } catch (error) {
      Luminous.Logger.error('Main', `Failed to apply setting: ${key}`, error);
    }
  }

  private static persist() {
    const saved: Record<string, SettingValue> = {};

    this.savedValues.forEach((value, key) => {
      if (
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        saved[key] = value;
      }
    });

    this.registry.forEach((_definition, key) => {
      const value = this.values.get(key);
      if (value !== undefined) saved[key] = value;
    });

    try {
      Spicetify.LocalStorage.set(this.STORAGE_KEY, JSON.stringify(saved));
    } catch (error) {
      Luminous.Logger.error('Main', 'Failed to persist settings', error);
    }
  }

  static getVar(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  static setVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
  }

  static removeVar(name: string) {
    document.documentElement.style.removeProperty(name);
  }

  static toggleClass(className: string, force?: boolean) {
    document.documentElement.classList.toggle(className, force);
  }

  static hasClass(className: string): boolean {
    return document.documentElement.classList.contains(className);
  }

  private static emit(key: string, value: SettingValue) {
    this.listeners.get(key)?.forEach((listener) => {
      this.callListener(key, listener, value);
    });
  }

  private static callListener(
    key: string,
    listener: SettingListener,
    value: SettingValue,
  ) {
    try {
      listener(value, key);
    } catch (error) {
      Luminous.Logger.error('Main', `Setting listener failed: ${key}`, error);
    }
  }

  private static getListeners(key: string): Set<SettingListener> {
    let listeners = this.listeners.get(key);

    if (!listeners) {
      listeners = new Set();
      this.listeners.set(key, listeners);
    }

    return listeners;
  }
}
