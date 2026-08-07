/* Luminous 2.2.0 | streetraceing */
(() => {
  const __APP_VERSION__ = '2.2.0';
  const __APP_AUTHOR__ = 'streetraceing';
  const __BUILD_TIME__ = '07/08/2026 20:07:31 UTC+00:00';
  const modules = {
    'src/api/canvas': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Canvas = void 0;
      const MEDIA_SOURCE_EVENTS = [
        'loadedmetadata',
        'loadeddata',
        'canplay',
        'playing',
        'emptied',
        'ended',
        'suspend',
      ];
      class Canvas {
        static VIDEO_CANDIDATES = [
          { selector: '.canvasVideoContainerNPV video', mode: 'npv' },
          { selector: '#VideoPlayerNpv_ReactPortal video', mode: 'npv-video' },
          {
            selector:
              '.Root__top-container:has(#VideoPlayerCinema_ReactPortal) video',
            mode: 'cinema',
          },
        ];
        static listeners = new Map();
        static observer = null;
        static checkFrame = null;
        static currentVideo = null;
        static currentMode = null;
        static currentSource = null;
        static revision = 0;
        static observedSourceVideo = null;
        static forceCheck = false;
        static initialized = false;
        static enabled = true;
        static handleVideoSourceChange = () => {
          this.forceCheck = true;
          this.scheduleCheck();
        };
        static addEventListener(event, listener) {
          this.getListeners(event).add(listener);
          if (
            (event === 'mount' || event === 'change') &&
            this.currentVideo &&
            this.currentMode
          ) {
            this.callListener(listener, this.get());
          }
          if (this.enabled && !this.initialized) this.init();
        }
        static removeEventListener(event, listener) {
          this.listeners.get(event)?.delete(listener);
        }
        static get() {
          return this.createPayload(
            this.currentVideo,
            this.currentMode,
            this.currentSource,
          );
        }
        static getVideo() {
          return this.currentVideo;
        }
        static init() {
          if (!this.enabled || this.initialized) return;
          this.initialized = true;
          this.observer = new MutationObserver(() => this.scheduleCheck());
          this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'src'],
          });
          this.check();
        }
        static setEnabled(enabled) {
          if (this.enabled === enabled) return;
          this.enabled = enabled;
          if (enabled) {
            this.init();
            return;
          }
          const previousVideo = this.currentVideo;
          const previousMode = this.currentMode;
          const previousSource = this.currentSource;
          this.observer?.disconnect();
          this.observer = null;
          if (this.checkFrame !== null) {
            cancelAnimationFrame(this.checkFrame);
            this.checkFrame = null;
          }
          this.observeVideoSource(null);
          this.initialized = false;
          this.currentVideo = null;
          this.currentMode = null;
          this.currentSource = null;
          this.forceCheck = false;
          if (previousVideo) {
            this.revision++;
            this.emit(
              'unmount',
              this.createPayload(null, previousMode, previousSource),
            );
          }
        }
        static destroy() {
          this.observer?.disconnect();
          this.observer = null;
          if (this.checkFrame !== null) {
            cancelAnimationFrame(this.checkFrame);
            this.checkFrame = null;
          }
          this.observeVideoSource(null);
          this.listeners.clear();
          this.currentVideo = null;
          this.currentMode = null;
          this.currentSource = null;
          this.revision = 0;
          this.forceCheck = false;
          this.initialized = false;
          this.enabled = true;
        }
        static createPayload(
          video,
          mode,
          source = video?.currentSrc || video?.src || null,
        ) {
          return { video, mode, source, revision: this.revision };
        }
        static scheduleCheck() {
          if (!this.initialized || this.checkFrame !== null) return;
          this.checkFrame = requestAnimationFrame(() => {
            this.checkFrame = null;
            this.check();
          });
        }
        static detect() {
          for (const candidate of this.VIDEO_CANDIDATES) {
            const video = this.findBestVideo(candidate.selector);
            if (video) return this.createPayload(video, candidate.mode);
          }
          return this.createPayload(null, null, null);
        }
        static findBestVideo(selector) {
          const videos = Array.from(document.querySelectorAll(selector));
          const visible = videos.filter((video) => this.isVisibleVideo(video));
          if (!visible.length) return null;
          return (
            visible.find(
              (video) =>
                !video.ended &&
                video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
            ) ??
            visible.find((video) => !video.ended) ??
            visible[0]
          );
        }
        static isVisibleVideo(video) {
          if (!video.isConnected || video.hidden) return false;
          const style = getComputedStyle(video);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number.parseFloat(style.opacity || '1') !== 0 &&
            video.getClientRects().length > 0
          );
        }
        static check() {
          if (!this.initialized) return;
          const detected = this.detect();
          const forced = this.forceCheck;
          this.forceCheck = false;
          const previousVideo = this.currentVideo;
          const previousMode = this.currentMode;
          const previousSource = this.currentSource;
          if (
            !forced &&
            previousVideo === detected.video &&
            previousMode === detected.mode &&
            previousSource === detected.source
          ) {
            return;
          }
          this.currentVideo = detected.video;
          this.currentMode = detected.mode;
          this.currentSource = detected.source;
          this.revision++;
          this.observeVideoSource(detected.video);
          if (previousVideo && !detected.video) {
            const payload = this.createPayload(
              null,
              previousMode,
              previousSource,
            );
            Luminous.Logger.info('Canvas', 'Unmounted', payload);
            this.emit('unmount', payload);
            return;
          }
          if (!previousVideo && detected.video) {
            const payload = this.get();
            Luminous.Logger.info('Canvas', 'Mounted', payload);
            this.emit('mount', payload);
            return;
          }
          const payload = this.get();
          Luminous.Logger.info('Canvas', 'Changed', payload);
          this.emit('change', payload);
        }
        static emit(event, payload) {
          this.getListeners(event).forEach((listener) => {
            this.callListener(listener, payload);
          });
        }
        static observeVideoSource(video) {
          if (video === this.observedSourceVideo) return;
          MEDIA_SOURCE_EVENTS.forEach((event) => {
            this.observedSourceVideo?.removeEventListener(
              event,
              this.handleVideoSourceChange,
            );
          });
          this.observedSourceVideo = video;
          MEDIA_SOURCE_EVENTS.forEach((event) => {
            video?.addEventListener(event, this.handleVideoSourceChange);
          });
        }
        static callListener(listener, payload) {
          try {
            listener(payload);
          } catch (error) {
            Luminous.Logger.error('Canvas', 'Listener failed', error);
          }
        }
        static getListeners(event) {
          let listeners = this.listeners.get(event);
          if (!listeners) {
            listeners = new Set();
            this.listeners.set(event, listeners);
          }
          return listeners;
        }
      }
      exports.Canvas = Canvas;
    },
    'src/api/diagnostics': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Diagnostics = void 0;
      const health_1 = require('../ui/health');
      class Diagnostics {
        static get() {
          const canvas = Luminous.Canvas.get();
          const song = Luminous.Song.getSync();
          return {
            luminous: {
              version: __APP_VERSION__,
              buildTime: __BUILD_TIME__,
            },
            runtime: {
              background: Luminous.Background.getType(),
              canvasMode: canvas.mode,
              canvasSource: canvas.source,
              track: song?.title ?? null,
              uiHealth: (0, health_1.getUiHealth)().status,
              documentHidden: document.hidden,
            },
            settings: Luminous.Settings.snapshot(),
            environment: {
              platform: navigator.platform,
              language: navigator.language,
            },
          };
        }
        static toText() {
          return JSON.stringify(this.get(), null, 2);
        }
        static async copy() {
          try {
            await navigator.clipboard.writeText(this.toText());
            return true;
          } catch (error) {
            Luminous.Logger.warn(
              'Runtime',
              'Failed to copy diagnostics',
              error,
            );
            return false;
          }
        }
      }
      exports.Diagnostics = Diagnostics;
    },
    'src/api/global': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.destroyExistingRuntime = destroyExistingRuntime;
      exports.exposeGlobalAPI = exposeGlobalAPI;
      const background_1 = require('../render/background');
      const canvas_1 = require('./canvas');
      const diagnostics_1 = require('./diagnostics');
      const logger_1 = require('./logger');
      const native_1 = require('./native');
      const palette_1 = require('./palette');
      const settings_1 = require('./settings');
      const song_1 = require('./song');
      function destroyExistingRuntime() {
        const existing = window.Luminous;
        if (typeof existing?.destroy !== 'function') return;
        try {
          existing.destroy();
        } catch (error) {
          console.warn('[Luminous] Failed to clean previous runtime', error);
        }
      }
      function exposeGlobalAPI(destroy) {
        Object.defineProperty(window, 'Luminous', {
          value: {
            Background: background_1.Background,
            Canvas: canvas_1.Canvas,
            Diagnostics: diagnostics_1.Diagnostics,
            Song: song_1.Song,
            Native: native_1.Native,
            Palette: palette_1.Palette,
            Settings: settings_1.Settings,
            Logger: logger_1.Logger,
            destroy,
            version: __APP_VERSION__,
          },
          configurable: true,
        });
      }
    },
    'src/api/logger': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Logger = void 0;
      class Logger {
        static disabledLevels = new Set();
        static disabledChannels = new Set();
        static levelStyles = {
          INFO: 'color:#ccc',
          WARN: 'color:#facc15',
          ERROR: 'color:#ef4444',
        };
        static channelStyles = {
          Runtime: 'color:#38bdf8',
          Main: 'color:#68c4e8',
          Background: 'color:#60a5fa',
          Canvas: 'color:#a78bfa',
          Palette: 'color:#f472b6',
          Song: 'color:#34d399',
          Settings: 'color:#fbbf24',
          Motion: 'color:#22d3ee',
          UI: 'color:#c084fc',
        };
        static baseStyle = 'color:#888';
        static getTime() {
          return new Date().toLocaleTimeString('en-GB', { hour12: false });
        }
        static shouldLog(level, channel) {
          return (
            !this.disabledLevels.has(level) &&
            !this.disabledChannels.has(channel)
          );
        }
        static format(channel) {
          return `Luminous/${channel}`;
        }
        static log(level, channel, ...data) {
          if (!this.shouldLog(level, channel)) return;
          console.log(
            `%c[${this.getTime()}] %c[${level}] %c[${this.format(channel)}]`,
            this.baseStyle,
            this.levelStyles[level],
            this.channelStyles[channel],
            ...data,
          );
        }
        static info(channel, ...data) {
          this.log('INFO', channel, ...data);
        }
        static warn(channel, ...data) {
          this.log('WARN', channel, ...data);
        }
        static error(channel, ...data) {
          this.log('ERROR', channel, ...data);
        }
        static enableLevel(level) {
          this.disabledLevels.delete(level);
        }
        static disableLevel(level) {
          this.disabledLevels.add(level);
        }
        static enableChannel(channel) {
          this.disabledChannels.delete(channel);
        }
        static disableChannel(channel) {
          this.disabledChannels.add(channel);
        }
        static printBanner() {
          console.log(
            `%c Luminous v${__APP_VERSION__} %c by ${__APP_AUTHOR__} `,
            'background:#1DB954;color:#000;padding:6px 12px;border-radius:8px 0 0 8px;font-weight:600;',
            'background:#181818;color:#1DB954;padding:6px 12px;border-radius:0 8px 8px 0;font-weight:500;',
          );
          console.log(
            `%c build: ${__BUILD_TIME__} `,
            'color:#888;font-size:12px;',
          );
        }
      }
      exports.Logger = Logger;
    },
    'src/api/native': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Native = void 0;
      class Native {
        static isDesktop() {
          return !!Spicetify.Platform?.NativeAPI;
        }
        static canFocus() {
          return (
            Spicetify.Platform?.FocusMainWindowAPI?.canFocusMainWindow?.() ??
            false
          );
        }
        static focus() {
          if (!this.canFocus()) return;
          Spicetify.Platform?.FocusMainWindowAPI?.focusMainWindow?.();
        }
        static getZoomCapabilities() {
          return (
            Spicetify.Platform?.ZoomAPI?.getCapabilities?.() ?? {
              canGetZoomLevel: false,
              canSetZoomLevel: false,
              canZoomIn: false,
              canZoomOut: false,
            }
          );
        }
        static async getZoomLevel() {
          const zoomApi = Spicetify.Platform?.ZoomAPI;
          if (!zoomApi?.getZoomLevel) return null;
          try {
            return await zoomApi.getZoomLevel();
          } catch (error) {
            Luminous.Logger.warn(
              'Runtime',
              'Failed to read Spotify zoom',
              error,
            );
            return null;
          }
        }
        static async setZoomLevel(level) {
          const zoomApi = Spicetify.Platform?.ZoomAPI;
          if (
            !zoomApi?.setZoomLevel ||
            !this.getZoomCapabilities().canSetZoomLevel
          ) {
            return false;
          }
          try {
            await zoomApi.setZoomLevel(level);
            return true;
          } catch (error) {
            Luminous.Logger.warn(
              'Runtime',
              'Failed to set Spotify zoom',
              error,
            );
            return false;
          }
        }
        static zoomIn() {
          if (!this.getZoomCapabilities().canZoomIn) return;
          Spicetify.Platform?.ZoomAPI?.zoomIn?.();
        }
        static zoomOut() {
          if (!this.getZoomCapabilities().canZoomOut) return;
          Spicetify.Platform?.ZoomAPI?.zoomOut?.();
        }
        static setWindowButtonsVisible(visible) {
          Spicetify.Platform?.NativeAPI?.setWindowButtonsVisibility?.(visible);
        }
        static async setFullscreen(fullscreen) {
          try {
            if (fullscreen) {
              await document.documentElement.requestFullscreen();
            } else if (document.fullscreenElement) {
              await document.exitFullscreen();
            }
            return true;
          } catch (error) {
            Luminous.Logger.warn(
              'Runtime',
              'Failed to change fullscreen state',
              error,
            );
            return false;
          }
        }
        static restart() {
          Spicetify.Platform?.LifecycleAPI?.restart?.();
        }
        static shutdown() {
          Spicetify.Platform?.LifecycleAPI?.shutdown?.();
        }
        static openNotificationSettings() {
          Spicetify.Platform?.OSNotificationsAPI?.openNotificationsSetting?.();
        }
        static showToast(payload, callback) {
          Spicetify.Platform?.OSNotificationsAPI?.showToast?.(
            payload,
            callback,
          );
        }
        static async getLogFolder() {
          const logsApi = Spicetify.Platform?.DesktopLogsAPI;
          if (!logsApi?.getLogFolder) return null;
          try {
            return await logsApi.getLogFolder();
          } catch (error) {
            Luminous.Logger.warn(
              'Runtime',
              'Failed to get Spotify log folder',
              error,
            );
            return null;
          }
        }
        static async getVersionInfo() {
          const updateApi = Spicetify.Platform?.UpdateAPI;
          if (!updateApi?.getVersionInfo) return null;
          try {
            return await updateApi.getVersionInfo();
          } catch (error) {
            Luminous.Logger.warn(
              'Runtime',
              'Failed to get Spotify version info',
              error,
            );
            return null;
          }
        }
      }
      exports.Native = Native;
    },
    'src/api/palette': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Palette = void 0;
      const PALETTE_CLASS = 'luminous-dynamic-palette';
      const PALETTE_VARIABLES = [
        '--luminous-palette-primary',
        '--luminous-palette-secondary',
        '--luminous-palette-accent',
        '--luminous-palette-light',
        '--luminous-palette-dark',
        '--luminous-effect-angle',
        '--luminous-effect-saturation',
        '--luminous-effect-brightness',
        '--luminous-effect-contrast',
        '--luminous-blob-1-duration',
        '--luminous-blob-2-duration',
        '--luminous-blob-3-duration',
        '--luminous-blob-4-duration',
      ];
      const EFFECT_CLASSES = [
        'luminous-effect-aurora',
        'luminous-effect-ember',
        'luminous-effect-bloom',
        'luminous-effect-prism',
        'luminous-effect-halo',
        'luminous-effect-nebula',
        'luminous-effect-energy-soft',
        'luminous-effect-energy-flow',
        'luminous-effect-energy-vivid',
        'luminous-effect-tone-dark',
        'luminous-effect-tone-balanced',
        'luminous-effect-tone-light',
      ];
      const SAMPLE_SIZE = 48;
      const MAX_CACHED_PALETTES = 24;
      const DEFAULT_MOTION_DURATION = 20;
      class Palette {
        static requestId = 0;
        static source = null;
        static cache = new Map();
        static currentProfile = null;
        static motionScale = 1;
        static cancel() {
          this.requestId++;
        }
        static clear() {
          this.cancel();
          this.source = null;
          this.currentProfile = null;
          this.clearAppliedPalette();
        }
        static setMotionDuration(duration) {
          const normalized = Number.isFinite(duration)
            ? Math.min(48, Math.max(8, duration))
            : DEFAULT_MOTION_DURATION;
          this.motionScale = normalized / DEFAULT_MOTION_DURATION;
          if (this.currentProfile) {
            this.applyDurations(this.currentProfile.baseDurations);
          }
        }
        static async applyFromImage(image) {
          if (!image) {
            this.clear();
            return;
          }
          if (
            image === this.source &&
            document.documentElement.classList.contains(PALETTE_CLASS)
          ) {
            return;
          }
          const requestId = ++this.requestId;
          try {
            const profile =
              this.getCachedPalette(image) ??
              (await this.extractProfile(image));
            if (requestId !== this.requestId) return;
            this.cachePalette(image, profile);
            this.applyProfile(profile);
            this.source = image;
          } catch (error) {
            if (requestId !== this.requestId) return;
            this.source = null;
            this.currentProfile = null;
            this.clearAppliedPalette();
            Luminous.Logger.warn(
              'Palette',
              'Failed to create adaptive background effects',
              error,
            );
          }
        }
        static async extractProfile(source) {
          const image = await this.loadImage(source);
          const canvas = document.createElement('canvas');
          canvas.width = SAMPLE_SIZE;
          canvas.height = SAMPLE_SIZE;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Canvas context unavailable');
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
          const pixels = context.getImageData(
            0,
            0,
            SAMPLE_SIZE,
            SAMPLE_SIZE,
          ).data;
          return this.analyzePixels(pixels);
        }
        static loadImage(source) {
          return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () =>
              reject(new Error('Failed to load cover image'));
            image.src = source;
          });
        }
        static analyzePixels(pixels) {
          const buckets = new Map();
          let totalWeight = 0;
          let redTotal = 0;
          let greenTotal = 0;
          let blueTotal = 0;
          let saturationTotal = 0;
          let lightnessTotal = 0;
          let lightnessSquaredTotal = 0;
          let warmthTotal = 0;
          let hueX = 0;
          let hueY = 0;
          let hueWeight = 0;
          for (let index = 0; index < pixels.length; index += 4) {
            const alpha = pixels[index + 3] / 255;
            if (alpha < 0.45) continue;
            const rgb = {
              red: pixels[index],
              green: pixels[index + 1],
              blue: pixels[index + 2],
            };
            const hsl = this.rgbToHsl(rgb);
            const metricWeight = alpha * (0.62 + hsl.saturation * 0.78);
            totalWeight += metricWeight;
            redTotal += rgb.red * metricWeight;
            greenTotal += rgb.green * metricWeight;
            blueTotal += rgb.blue * metricWeight;
            saturationTotal += hsl.saturation * metricWeight;
            lightnessTotal += hsl.lightness * metricWeight;
            lightnessSquaredTotal +=
              hsl.lightness * hsl.lightness * metricWeight;
            warmthTotal +=
              ((rgb.red - rgb.blue) / 255 +
                ((rgb.green - rgb.blue) / 255) * 0.28) *
              metricWeight;
            if (
              hsl.saturation > 0.08 &&
              hsl.lightness > 0.04 &&
              hsl.lightness < 0.96
            ) {
              const angle = hsl.hue * Math.PI * 2;
              const chromaWeight = metricWeight * hsl.saturation;
              hueX += Math.cos(angle) * chromaWeight;
              hueY += Math.sin(angle) * chromaWeight;
              hueWeight += chromaWeight;
            }
            if (hsl.lightness < 0.025 || hsl.lightness > 0.975) continue;
            const key = `${rgb.red >> 5}:${rgb.green >> 5}:${rgb.blue >> 5}`;
            const colorWeight =
              metricWeight *
              (0.72 + hsl.saturation * 0.96) *
              (0.82 + (1 - Math.abs(hsl.lightness - 0.52)) * 0.34);
            const bucket = buckets.get(key) ?? {
              red: 0,
              green: 0,
              blue: 0,
              weight: 0,
            };
            bucket.red += rgb.red * colorWeight;
            bucket.green += rgb.green * colorWeight;
            bucket.blue += rgb.blue * colorWeight;
            bucket.weight += colorWeight;
            buckets.set(key, bucket);
          }
          if (totalWeight === 0) {
            throw new Error('Cover image has no usable pixels');
          }
          if (buckets.size === 0) {
            buckets.set('fallback', {
              red: redTotal,
              green: greenTotal,
              blue: blueTotal,
              weight: totalWeight,
            });
          }
          const averageLightness = lightnessTotal / totalWeight;
          const lightnessVariance = Math.max(
            0,
            lightnessSquaredTotal / totalWeight - averageLightness ** 2,
          );
          const hueConcentration =
            hueWeight > 0 ? Math.hypot(hueX, hueY) / hueWeight : 1;
          const metrics = {
            averageSaturation: saturationTotal / totalWeight,
            averageLightness,
            contrast: Math.min(1, Math.sqrt(lightnessVariance) / 0.3),
            hueDiversity: Math.min(1, Math.max(0, 1 - hueConcentration)),
            warmth: warmthTotal / totalWeight,
          };
          const candidates = Array.from(buckets.values())
            .map((bucket) => {
              const rgb = {
                red: Math.round(bucket.red / bucket.weight),
                green: Math.round(bucket.green / bucket.weight),
                blue: Math.round(bucket.blue / bucket.weight),
              };
              return {
                rgb,
                hsl: this.rgbToHsl(rgb),
                score: bucket.weight,
              };
            })
            .sort((left, right) => right.score - left.score)
            .slice(0, 36);
          const primaryCandidate = candidates.reduce((best, candidate) => {
            const candidateScore =
              candidate.score * (0.82 + candidate.hsl.saturation * 0.5);
            const bestScore = best.score * (0.82 + best.hsl.saturation * 0.5);
            return candidateScore > bestScore ? candidate : best;
          });
          const secondaryCandidate = this.selectDistinctColor(
            candidates,
            [primaryCandidate],
            0.14,
          );
          const accentCandidate = this.selectDistinctColor(
            candidates,
            [primaryCandidate, secondaryCandidate],
            0.1,
          );
          const visualChroma = this.getVisualChroma(
            primaryCandidate.hsl.saturation,
            metrics,
          );
          const scene = this.selectScene(
            primaryCandidate.hsl.hue,
            visualChroma,
            metrics,
          );
          const energy = this.selectEnergy(visualChroma, metrics);
          const tone = this.selectTone(metrics.averageLightness);
          const { primary, secondary, accent } = this.createSceneColors(
            scene,
            primaryCandidate,
            secondaryCandidate,
            accentCandidate,
          );
          const brightest = [primary, secondary, accent].reduce(
            (best, color) =>
              this.relativeLuminance(color) > this.relativeLuminance(best)
                ? color
                : best,
          );
          const darkest = [primary, secondary, accent].reduce((best, color) =>
            this.relativeLuminance(color) < this.relativeLuminance(best)
              ? color
              : best,
          );
          return {
            primary: this.toHex(primary),
            secondary: this.toHex(secondary),
            accent: this.toHex(accent),
            light: this.toHex(
              this.mix(brightest, { red: 255, green: 255, blue: 255 }, 0.34),
            ),
            dark: this.toHex(
              this.mix(darkest, { red: 0, green: 0, blue: 0 }, 0.62),
            ),
            scene,
            energy,
            tone,
            angle: Math.round(primaryCandidate.hsl.hue * 360),
            saturation: Number(
              (0.92 + Math.min(0.68, visualChroma * 0.9)).toFixed(2),
            ),
            brightness: tone === 'dark' ? 1.08 : tone === 'light' ? 0.9 : 1,
            contrast: Number((0.94 + metrics.contrast * 0.16).toFixed(2)),
            baseDurations: this.getBaseDurations(energy),
          };
        }
        static selectDistinctColor(candidates, anchors, minimumDistance) {
          const maxScore = candidates[0]?.score ?? 1;
          let selected = candidates[0];
          let selectedScore = -Infinity;
          candidates.forEach((candidate) => {
            const distance = Math.min(
              ...anchors.map((anchor) =>
                this.colorDistance(candidate.rgb, anchor.rgb),
              ),
            );
            if (distance < minimumDistance) return;
            const luminanceContrast = Math.max(
              ...anchors.map((anchor) =>
                Math.abs(candidate.hsl.lightness - anchor.hsl.lightness),
              ),
            );
            const score =
              (candidate.score / maxScore) * 0.46 +
              distance * 0.42 +
              luminanceContrast * 0.12;
            if (score > selectedScore) {
              selected = candidate;
              selectedScore = score;
            }
          });
          if (selectedScore > -Infinity) return selected;
          const anchor = anchors[anchors.length - 1];
          const fallbackHsl = {
            hue: (anchor.hsl.hue + 0.42) % 1,
            saturation: Math.max(0.28, anchor.hsl.saturation),
            lightness: Math.min(
              0.72,
              Math.max(0.28, 1 - anchor.hsl.lightness * 0.72),
            ),
          };
          return {
            rgb: this.hslToRgb(fallbackHsl),
            hsl: fallbackHsl,
            score: 0,
          };
        }
        static createSceneColors(
          scene,
          primaryCandidate,
          secondaryCandidate,
          accentCandidate,
        ) {
          if (scene === 'halo') {
            const primary = this.normalizeColor(
              primaryCandidate.rgb,
              0,
              0.22,
              0.72,
            );
            const primaryHsl = this.rgbToHsl(primary);
            const neutralHue =
              primaryHsl.saturation > 0.05 ? primaryHsl.hue : 0.61;
            return {
              primary,
              secondary: this.mix(
                primary,
                { red: 255, green: 255, blue: 255 },
                0.3,
              ),
              accent: this.hslToRgb({
                hue: neutralHue,
                saturation: Math.max(0.08, primaryHsl.saturation * 0.72),
                lightness: Math.min(
                  0.74,
                  Math.max(0.38, primaryHsl.lightness + 0.12),
                ),
              }),
            };
          }
          const harmonyOffsets = {
            aurora: [-0.12, -0.22],
            ember: [0.08, 0.14],
            bloom: [0.1, 0.2],
            prism: [0.33, 0.66],
            nebula: [0.12, -0.12],
          };
          const [secondaryOffset, accentOffset] = harmonyOffsets[scene];
          const secondarySource =
            secondaryCandidate.score > 0
              ? secondaryCandidate.rgb
              : this.createHarmonyColor(
                  primaryCandidate.hsl,
                  secondaryOffset,
                  0.5,
                );
          const accentSource =
            accentCandidate.score > 0
              ? accentCandidate.rgb
              : this.createHarmonyColor(
                  primaryCandidate.hsl,
                  accentOffset,
                  0.58,
                );
          return {
            primary: this.normalizeColor(
              primaryCandidate.rgb,
              0.34,
              0.24,
              0.74,
            ),
            secondary: this.normalizeColor(secondarySource, 0.38, 0.2, 0.78),
            accent: this.normalizeColor(accentSource, 0.46, 0.34, 0.78),
          };
        }
        static createHarmonyColor(anchor, hueOffset, minimumSaturation) {
          return this.hslToRgb({
            hue: (anchor.hue + hueOffset + 1) % 1,
            saturation: Math.max(minimumSaturation, anchor.saturation),
            lightness: Math.min(0.7, Math.max(0.38, anchor.lightness + 0.08)),
          });
        }
        static getVisualChroma(dominantSaturation, metrics) {
          const accentContribution =
            dominantSaturation * (0.52 + metrics.contrast * 0.24);
          return Math.min(
            1,
            Math.max(metrics.averageSaturation, accentContribution),
          );
        }
        static selectScene(dominantHue, visualChroma, metrics) {
          if (visualChroma < 0.18) return 'halo';
          if (metrics.hueDiversity > 0.43 && visualChroma > 0.38) {
            return 'prism';
          }
          const hueDegrees = dominantHue * 360;
          if (
            hueDegrees >= 252 &&
            hueDegrees < 334 &&
            visualChroma > 0.32 &&
            metrics.averageLightness < 0.72
          ) {
            return 'nebula';
          }
          if (hueDegrees >= 68 && hueDegrees < 166) return 'bloom';
          if (metrics.warmth > 0.08 || hueDegrees < 58 || hueDegrees >= 334) {
            return 'ember';
          }
          return 'aurora';
        }
        static selectEnergy(visualChroma, metrics) {
          if (visualChroma < 0.18) return 'soft';
          const score =
            visualChroma * 0.48 +
            metrics.contrast * 0.34 +
            metrics.hueDiversity * 0.18;
          if (score < 0.34) return 'soft';
          if (score < 0.57) return 'flow';
          return 'vivid';
        }
        static selectTone(averageLightness) {
          if (averageLightness < 0.31) return 'dark';
          if (averageLightness > 0.68) return 'light';
          return 'balanced';
        }
        static getBaseDurations(energy) {
          if (energy === 'soft') return [42, 51, 60, 70];
          if (energy === 'vivid') return [14, 18, 23, 29];
          return [24, 31, 38, 46];
        }
        static normalizeColor(
          rgb,
          minimumSaturation,
          minimumLightness,
          maximumLightness,
        ) {
          const hsl = this.rgbToHsl(rgb);
          return this.hslToRgb({
            hue: hsl.hue,
            saturation: Math.max(minimumSaturation, hsl.saturation),
            lightness: Math.min(
              maximumLightness,
              Math.max(minimumLightness, hsl.lightness),
            ),
          });
        }
        static rgbToHsl({ red, green, blue }) {
          const normalizedRed = red / 255;
          const normalizedGreen = green / 255;
          const normalizedBlue = blue / 255;
          const maximum = Math.max(
            normalizedRed,
            normalizedGreen,
            normalizedBlue,
          );
          const minimum = Math.min(
            normalizedRed,
            normalizedGreen,
            normalizedBlue,
          );
          const delta = maximum - minimum;
          const lightness = (maximum + minimum) / 2;
          if (delta === 0) {
            return { hue: 0, saturation: 0, lightness };
          }
          const saturation = delta / (1 - Math.abs(2 * lightness - 1));
          let hue;
          if (maximum === normalizedRed) {
            hue = ((normalizedGreen - normalizedBlue) / delta) % 6;
          } else if (maximum === normalizedGreen) {
            hue = (normalizedBlue - normalizedRed) / delta + 2;
          } else {
            hue = (normalizedRed - normalizedGreen) / delta + 4;
          }
          return {
            hue: ((hue * 60 + 360) % 360) / 360,
            saturation,
            lightness,
          };
        }
        static hslToRgb({ hue, saturation, lightness }) {
          const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
          const hueSection = (hue * 360) / 60;
          const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
          const offset = lightness - chroma / 2;
          let red = 0;
          let green = 0;
          let blue = 0;
          if (hueSection < 1) {
            red = chroma;
            green = secondary;
          } else if (hueSection < 2) {
            red = secondary;
            green = chroma;
          } else if (hueSection < 3) {
            green = chroma;
            blue = secondary;
          } else if (hueSection < 4) {
            green = secondary;
            blue = chroma;
          } else if (hueSection < 5) {
            red = secondary;
            blue = chroma;
          } else {
            red = chroma;
            blue = secondary;
          }
          return {
            red: Math.round((red + offset) * 255),
            green: Math.round((green + offset) * 255),
            blue: Math.round((blue + offset) * 255),
          };
        }
        static colorDistance(left, right) {
          const red = (left.red - right.red) / 255;
          const green = (left.green - right.green) / 255;
          const blue = (left.blue - right.blue) / 255;
          return Math.min(
            1,
            Math.sqrt(
              red * red * 0.3 + green * green * 0.59 + blue * blue * 0.11,
            ),
          );
        }
        static relativeLuminance({ red, green, blue }) {
          return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        }
        static mix(from, to, amount) {
          return {
            red: Math.round(from.red + (to.red - from.red) * amount),
            green: Math.round(from.green + (to.green - from.green) * amount),
            blue: Math.round(from.blue + (to.blue - from.blue) * amount),
          };
        }
        static toHex({ red, green, blue }) {
          return `#${[red, green, blue]
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('')}`;
        }
        static getCachedPalette(source) {
          const profile = this.cache.get(source);
          if (!profile) return null;
          this.cache.delete(source);
          this.cache.set(source, profile);
          return profile;
        }
        static cachePalette(source, profile) {
          this.cache.set(source, profile);
          while (this.cache.size > MAX_CACHED_PALETTES) {
            const oldestSource = this.cache.keys().next().value;
            if (!oldestSource) return;
            this.cache.delete(oldestSource);
          }
        }
        static applyProfile(profile) {
          const root = document.documentElement;
          root.style.setProperty('--luminous-palette-primary', profile.primary);
          root.style.setProperty(
            '--luminous-palette-secondary',
            profile.secondary,
          );
          root.style.setProperty('--luminous-palette-accent', profile.accent);
          root.style.setProperty('--luminous-palette-light', profile.light);
          root.style.setProperty('--luminous-palette-dark', profile.dark);
          root.style.setProperty(
            '--luminous-effect-angle',
            `${profile.angle}deg`,
          );
          root.style.setProperty(
            '--luminous-effect-saturation',
            String(profile.saturation),
          );
          root.style.setProperty(
            '--luminous-effect-brightness',
            String(profile.brightness),
          );
          root.style.setProperty(
            '--luminous-effect-contrast',
            String(profile.contrast),
          );
          EFFECT_CLASSES.forEach((className) =>
            root.classList.remove(className),
          );
          root.classList.add(
            `luminous-effect-${profile.scene}`,
            `luminous-effect-energy-${profile.energy}`,
            `luminous-effect-tone-${profile.tone}`,
            PALETTE_CLASS,
          );
          this.currentProfile = profile;
          this.applyDurations(profile.baseDurations);
        }
        static applyDurations(durations) {
          durations.forEach((duration, index) => {
            const scaled = Math.max(7, duration * this.motionScale);
            document.documentElement.style.setProperty(
              `--luminous-blob-${index + 1}-duration`,
              `${Number(scaled.toFixed(1))}s`,
            );
          });
        }
        static clearAppliedPalette() {
          const root = document.documentElement;
          PALETTE_VARIABLES.forEach((variable) => {
            root.style.removeProperty(variable);
          });
          EFFECT_CLASSES.forEach((className) =>
            root.classList.remove(className),
          );
          root.classList.remove(PALETTE_CLASS);
        }
      }
      exports.Palette = Palette;
    },
    'src/api/settings': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Settings = void 0;
      class Settings {
        static STORAGE_KEY = 'luminous-settings';
        static PERSIST_DELAY_MS = 180;
        static registry = new Map();
        static values = new Map();
        static listeners = new Map();
        static savedValues = new Map();
        static persistTimer = null;
        static initialized = false;
        static batchDepth = 0;
        static persistQueued = false;
        static handlePageHide = () => {
          this.flushPersist();
        };
        static init() {
          if (this.initialized) return;
          this.initialized = true;
          this.savedValues.clear();
          Object.entries(this.readSavedValues()).forEach(([key, value]) => {
            this.savedValues.set(key, value);
          });
          this.registry.forEach((definition, key) => {
            const value = this.normalizeValue(
              definition,
              this.savedValues.get(key),
            );
            this.values.set(key, value);
            this.savedValues.set(key, value);
            this.apply(key, definition, value);
          });
          window.addEventListener('pagehide', this.handlePageHide);
          this.persistNow();
        }
        static destroy() {
          if (this.persistTimer !== null) {
            window.clearTimeout(this.persistTimer);
            this.persistTimer = null;
          }
          if (this.initialized) {
            this.persistNow();
            window.removeEventListener('pagehide', this.handlePageHide);
          }
          this.listeners.clear();
          this.values.clear();
          this.savedValues.clear();
          this.registry.clear();
          this.batchDepth = 0;
          this.persistQueued = false;
          this.initialized = false;
        }
        static register(key, definition) {
          this.registry.set(key, definition);
          if (!this.initialized) return;
          const value = this.normalizeValue(
            definition,
            this.values.get(key) ?? this.savedValues.get(key),
          );
          this.values.set(key, value);
          this.savedValues.set(key, value);
          this.apply(key, definition, value);
          this.schedulePersist();
        }
        static get(key) {
          if (this.values.has(key)) return this.values.get(key);
          const definition = this.registry.get(key);
          return definition?.default;
        }
        static has(key) {
          return this.registry.has(key);
        }
        static set(key, value) {
          this.setInternal(key, value, true);
        }
        static setMany(values) {
          this.batch(() => {
            Object.entries(values).forEach(([key, value]) => {
              this.setInternal(key, value, true);
            });
          });
        }
        static reset(key) {
          const definition = this.registry.get(key);
          if (!definition) return;
          this.set(key, definition.default);
        }
        static resetMany(keys) {
          this.batch(() => {
            keys.forEach((key) => {
              const definition = this.registry.get(key);
              if (!definition) return;
              this.setInternal(key, definition.default, true);
            });
          });
        }
        static resetAll() {
          this.resetMany([...this.registry.keys()]);
        }
        static snapshot() {
          const snapshot = {};
          this.registry.forEach((definition, key) => {
            snapshot[key] = this.values.get(key) ?? definition.default;
          });
          return snapshot;
        }
        static subscribe(key, listener, options = {}) {
          this.getListeners(key).add(listener);
          if (options.immediate) {
            const value =
              this.values.get(key) ?? this.registry.get(key)?.default;
            if (value !== undefined) {
              this.callListener(key, listener, value);
            }
          }
          return () => {
            this.listeners.get(key)?.delete(listener);
          };
        }
        static getVar(name) {
          return getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();
        }
        static setVar(name, value) {
          document.documentElement.style.setProperty(name, value);
        }
        static removeVar(name) {
          document.documentElement.style.removeProperty(name);
        }
        static toggleClass(className, force) {
          document.documentElement.classList.toggle(className, force);
        }
        static hasClass(className) {
          return document.documentElement.classList.contains(className);
        }
        static setInternal(key, value, notify) {
          const definition = this.registry.get(key);
          if (!definition) {
            Luminous.Logger.warn('Settings', `Unknown setting: ${key}`);
            return;
          }
          const normalized = this.normalizeValue(definition, value);
          if (Object.is(this.values.get(key), normalized)) return;
          this.values.set(key, normalized);
          this.savedValues.set(key, normalized);
          this.apply(key, definition, normalized);
          if (notify) this.emit(key, normalized);
          this.schedulePersist();
        }
        static batch(callback) {
          this.batchDepth++;
          try {
            callback();
          } finally {
            this.batchDepth--;
            if (this.batchDepth === 0 && this.persistQueued) {
              this.persistQueued = false;
              this.schedulePersist();
            }
          }
        }
        static readSavedValues() {
          try {
            const saved = Spicetify.LocalStorage.get(this.STORAGE_KEY);
            if (!saved) return {};
            const parsed = JSON.parse(saved);
            if (
              typeof parsed === 'object' &&
              parsed !== null &&
              !Array.isArray(parsed)
            ) {
              return parsed;
            }
          } catch (error) {
            Luminous.Logger.warn(
              'Settings',
              'Failed to read saved settings',
              error,
            );
          }
          return {};
        }
        static normalizeValue(definition, value) {
          let normalized = value ?? definition.default;
          if (definition.normalize) {
            try {
              normalized = definition.normalize(normalized);
            } catch (error) {
              Luminous.Logger.warn(
                'Settings',
                'Failed to normalize setting value',
                error,
              );
              return definition.default;
            }
          }
          if (typeof normalized === typeof definition.default) {
            if (typeof normalized !== 'number' || Number.isFinite(normalized)) {
              return normalized;
            }
          }
          Luminous.Logger.warn(
            'Settings',
            'Invalid setting value, using default',
          );
          return definition.default;
        }
        static apply(key, definition, value) {
          try {
            definition.apply?.(value);
          } catch (error) {
            Luminous.Logger.error(
              'Settings',
              `Failed to apply setting: ${key}`,
              error,
            );
          }
        }
        static schedulePersist() {
          if (this.batchDepth > 0) {
            this.persistQueued = true;
            return;
          }
          if (this.persistTimer !== null) {
            window.clearTimeout(this.persistTimer);
          }
          this.persistTimer = window.setTimeout(() => {
            this.persistTimer = null;
            this.persistNow();
          }, this.PERSIST_DELAY_MS);
        }
        static flushPersist() {
          if (this.persistTimer !== null) {
            window.clearTimeout(this.persistTimer);
            this.persistTimer = null;
          }
          this.persistQueued = false;
          this.persistNow();
        }
        static persistNow() {
          const saved = {};
          this.savedValues.forEach((value, key) => {
            if (
              typeof value === 'string' ||
              typeof value === 'boolean' ||
              (typeof value === 'number' && Number.isFinite(value))
            ) {
              saved[key] = value;
            }
          });
          this.registry.forEach((definition, key) => {
            saved[key] = this.values.get(key) ?? definition.default;
          });
          try {
            Spicetify.LocalStorage.set(this.STORAGE_KEY, JSON.stringify(saved));
          } catch (error) {
            Luminous.Logger.error(
              'Settings',
              'Failed to persist settings',
              error,
            );
          }
        }
        static emit(key, value) {
          this.listeners.get(key)?.forEach((listener) => {
            this.callListener(key, listener, value);
          });
        }
        static callListener(key, listener, value) {
          try {
            listener(value, key);
          } catch (error) {
            Luminous.Logger.error(
              'Settings',
              `Setting listener failed: ${key}`,
              error,
            );
          }
        }
        static getListeners(key) {
          let listeners = this.listeners.get(key);
          if (!listeners) {
            listeners = new Set();
            this.listeners.set(key, listeners);
          }
          return listeners;
        }
      }
      exports.Settings = Settings;
    },
    'src/api/song': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Song = void 0;
      class Song {
        static PLAYER_TIMEOUT_MESSAGE = 'Spicetify Player not available';
        static INITIAL_TRACK_SYNC_INTERVAL = 100;
        static current = null;
        static currentSignature = null;
        static listeners = new Map();
        static ready = false;
        static eventsBound = false;
        static initPromise = null;
        static initialTrackTimer = null;
        static readyPromise = Promise.resolve();
        static readyResolve = () => undefined;
        static handleSongChange = (event) => {
          const playerEvent = event;
          this.handleTrack(
            playerEvent?.data?.item ?? Spicetify.Player.data?.item ?? null,
          );
        };
        static {
          this.resetReadyPromise();
        }
        static init(timeout = 15000) {
          if (this.eventsBound) return Promise.resolve();
          if (this.initPromise) return this.initPromise;
          this.initPromise = this.initialize(timeout).finally(() => {
            this.initPromise = null;
          });
          return this.initPromise;
        }
        static destroy() {
          if (this.eventsBound) {
            try {
              Spicetify.Player.removeEventListener(
                'songchange',
                this.handleSongChange,
              );
            } catch (error) {
              Luminous.Logger.warn(
                'Song',
                'Failed to remove player listener',
                error,
              );
            }
          }
          if (this.initialTrackTimer !== null) {
            window.clearTimeout(this.initialTrackTimer);
            this.initialTrackTimer = null;
          }
          this.listeners.clear();
          this.current = null;
          this.currentSignature = null;
          this.ready = false;
          this.eventsBound = false;
          this.initPromise = null;
          this.resetReadyPromise();
        }
        static addEventListener(event, listener) {
          this.getListeners(event).add(listener);
          if (!this.eventsBound && !this.initPromise) {
            void this.init().catch((error) => {
              Luminous.Logger.error(
                'Song',
                'Initialization retry failed',
                error,
              );
            });
          }
          if (
            this.current &&
            (event === 'change' || (event === 'ready' && this.ready))
          ) {
            this.callListener(listener, this.createPayload(this.current));
          }
        }
        static removeEventListener(event, listener) {
          this.listeners.get(event)?.delete(listener);
        }
        static async get(timeout = 15000) {
          const startedAt = Date.now();
          if (!this.eventsBound) {
            try {
              await this.init(timeout);
            } catch {
              return null;
            }
          }
          if (!this.ready) {
            const remaining = Math.max(0, timeout - (Date.now() - startedAt));
            if (!(await this.waitForReady(remaining))) return null;
          }
          return this.current ? this.createPayload(this.current) : null;
        }
        static getSync() {
          return this.current ? this.createPayload(this.current) : null;
        }
        static async initialize(timeout) {
          await this.waitForPlayer(timeout);
          this.bindEvents();
          if (!this.syncCurrentTrack()) this.startInitialTrackSync(timeout);
        }
        static waitForPlayer(timeout) {
          return new Promise((resolve, reject) => {
            const start = performance.now();
            const check = () => {
              if (
                typeof Spicetify !== 'undefined' &&
                typeof Spicetify.Player?.addEventListener === 'function'
              ) {
                resolve();
                return;
              }
              if (performance.now() - start > timeout) {
                reject(new Error(this.PLAYER_TIMEOUT_MESSAGE));
                return;
              }
              requestAnimationFrame(check);
            };
            check();
          });
        }
        static bindEvents() {
          if (this.eventsBound) return;
          this.eventsBound = true;
          Spicetify.Player.addEventListener(
            'songchange',
            this.handleSongChange,
          );
        }
        static syncCurrentTrack() {
          const track = Spicetify.Player.data?.item ?? null;
          this.handleTrack(track);
          return track !== null;
        }
        static startInitialTrackSync(timeout) {
          if (this.initialTrackTimer !== null || this.ready) return;
          const deadline = Date.now() + timeout;
          const sync = () => {
            this.initialTrackTimer = null;
            if (this.ready || this.syncCurrentTrack() || Date.now() >= deadline)
              return;
            this.initialTrackTimer = window.setTimeout(
              sync,
              this.INITIAL_TRACK_SYNC_INTERVAL,
            );
          };
          sync();
        }
        static waitForReady(timeout) {
          if (this.ready) return Promise.resolve(true);
          if (timeout <= 0) return Promise.resolve(false);
          return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timeoutId);
              resolve(value);
            };
            const timeoutId = window.setTimeout(() => finish(false), timeout);
            void this.readyPromise.then(() => finish(true));
          });
        }
        static handleTrack(track) {
          if (!track) return;
          const signature = this.createTrackSignature(track);
          if (
            this.current?.uri === track.uri &&
            this.currentSignature === signature
          ) {
            return;
          }
          if (this.initialTrackTimer !== null) {
            window.clearTimeout(this.initialTrackTimer);
            this.initialTrackTimer = null;
          }
          this.current = track;
          this.currentSignature = signature;
          if (!this.ready) {
            this.ready = true;
            this.readyResolve();
            Luminous.Logger.info('Song', 'Ready', this.createPayload(track));
            this.emit('ready');
            return;
          }
          Luminous.Logger.info('Song', 'Changed', this.createPayload(track));
          this.emit('change');
        }
        static createTrackSignature(track) {
          const artists =
            track.artists?.map((artist) => artist.name).join('|') ?? '';
          const image = normalizeImageUrl(
            track.images?.[0]?.url ??
              track.album?.images?.[0]?.url ??
              track.metadata?.image_url ??
              null,
          );
          return `${track.uri}\u0000${track.name}\u0000${artists}\u0000${image ?? ''}`;
        }
        static createPayload(track) {
          const artists = track.artists?.map((artist) => artist.name) ?? [];
          const image = normalizeImageUrl(
            track.images?.[0]?.url ??
              track.album?.images?.[0]?.url ??
              track.metadata?.image_url ??
              null,
          );
          return {
            track,
            name: track.name,
            title: artists.length
              ? `${track.name} - ${artists.join(', ')}`
              : track.name,
            artists,
            image,
            uri: track.uri,
          };
        }
        static emit(event) {
          if (!this.current) return;
          const payload = this.createPayload(this.current);
          this.getListeners(event).forEach((listener) => {
            this.callListener(listener, payload);
          });
        }
        static callListener(listener, payload) {
          try {
            listener(payload);
          } catch (error) {
            Luminous.Logger.error('Song', 'Listener failed', error);
          }
        }
        static getListeners(event) {
          let listeners = this.listeners.get(event);
          if (!listeners) {
            listeners = new Set();
            this.listeners.set(event, listeners);
          }
          return listeners;
        }
        static resetReadyPromise() {
          this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve;
          });
        }
      }
      exports.Song = Song;
      function normalizeImageUrl(image) {
        if (!image) return null;
        const spotifyImagePrefix = 'spotify:image:';
        if (image.startsWith(spotifyImagePrefix)) {
          const imageId = image.slice(spotifyImagePrefix.length);
          return imageId ? `https://i.scdn.co/image/${imageId}` : null;
        }
        return image;
      }
    },
    'src/app/App': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.App = App;
      const DynamicBackgroundFeature_1 = require('./features/DynamicBackgroundFeature');
      const SplashFeature_1 = require('./features/SplashFeature');
      const ThemeMenuFeature_1 = require('./features/ThemeMenuFeature');
      const SynchronizeFeature_1 = require('./features/SynchronizeFeature');
      const MotionFeature_1 = require('./features/MotionFeature');
      const react_1 = require('./react');
      function App() {
        const React = (0, react_1.getReact)();
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(SplashFeature_1.SplashFeature),
          React.createElement(SynchronizeFeature_1.SynchronizeFeature),
          React.createElement(MotionFeature_1.MotionFeature),
          React.createElement(
            DynamicBackgroundFeature_1.DynamicBackgroundFeature,
          ),
          React.createElement(ThemeMenuFeature_1.ThemeMenuFeature),
        );
      }
    },
    'src/app/features/DynamicBackgroundFeature': function (
      module,
      exports,
      require,
    ) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.DynamicBackgroundFeature = DynamicBackgroundFeature;
      const react_1 = require('../react');
      const health_1 = require('../../ui/health');
      function DynamicBackgroundFeature() {
        const effect = (0, react_1.useEffect)();
        const memo = (0, react_1.useMemo)();
        const state = (0, react_1.useState)();
        const [song, setSong] = state(() => Luminous.Song.getSync());
        const [canvas, setCanvas] = state(() => Luminous.Canvas.get());
        const [enabled, setEnabled] = state(
          () => Luminous.Settings.get('dynamicBackground') !== false,
        );
        const [dynamicPalette, setDynamicPalette] = state(
          () => Luminous.Settings.get('dynamicPalette') !== false,
        );
        const [backgroundSource, setBackgroundSource] = state(() =>
          String(Luminous.Settings.get('backgroundSource') ?? 'auto'),
        );
        const [appActive, setAppActive] = state(
          () => (0, health_1.getUiHealth)().status !== 'booting',
        );
        const renderKey = memo(() => {
          if (!appActive) return 'inactive';
          if (!enabled) return 'disabled';
          if (backgroundSource === 'auto' && canvas.video) {
            return `canvas:${canvas.source ?? ''}:${canvas.revision}:${song?.image ?? ''}`;
          }
          if (song?.image) return `image:${song.image}`;
          return 'empty';
        }, [appActive, backgroundSource, canvas, enabled, song?.image]);
        effect(() => {
          let songKey = song ? `${song.uri}\u0000${song.image ?? ''}` : null;
          let canvasKey = `${canvas.mode ?? ''}\u0000${canvas.source ?? ''}\u0000${canvas.revision}`;
          let canvasVideo = canvas.video;
          const handleSong = (nextSong) => {
            const nextKey = `${nextSong.uri}\u0000${nextSong.image ?? ''}`;
            if (songKey === nextKey) return;
            songKey = nextKey;
            Luminous.Palette.cancel();
            Luminous.Background.preloadImage(nextSong.image);
            setSong(nextSong);
          };
          const handleCanvas = (payload) => {
            const nextKey = `${payload.mode ?? ''}\u0000${payload.source ?? ''}\u0000${payload.revision}`;
            if (canvasKey === nextKey && canvasVideo === payload.video) return;
            canvasKey = nextKey;
            canvasVideo = payload.video;
            setCanvas(payload);
          };
          Luminous.Song.addEventListener('ready', handleSong);
          Luminous.Song.addEventListener('change', handleSong);
          Luminous.Canvas.addEventListener('mount', handleCanvas);
          Luminous.Canvas.addEventListener('change', handleCanvas);
          Luminous.Canvas.addEventListener('unmount', handleCanvas);
          const unsubscribeHealth = (0, health_1.subscribeUiHealth)(
            (health) => {
              setAppActive(health.status !== 'booting');
            },
          );
          const unsubscribeSetting = Luminous.Settings.subscribe(
            'dynamicBackground',
            (value) => setEnabled(value !== false),
            { immediate: true },
          );
          const unsubscribePaletteSetting = Luminous.Settings.subscribe(
            'dynamicPalette',
            (value) => setDynamicPalette(value !== false),
            { immediate: true },
          );
          const unsubscribeSourceSetting = Luminous.Settings.subscribe(
            'backgroundSource',
            (value) => setBackgroundSource(String(value)),
            { immediate: true },
          );
          return () => {
            Luminous.Song.removeEventListener('ready', handleSong);
            Luminous.Song.removeEventListener('change', handleSong);
            Luminous.Canvas.removeEventListener('mount', handleCanvas);
            Luminous.Canvas.removeEventListener('change', handleCanvas);
            Luminous.Canvas.removeEventListener('unmount', handleCanvas);
            unsubscribeHealth();
            unsubscribeSetting();
            unsubscribePaletteSetting();
            unsubscribeSourceSetting();
            Luminous.Background.destroy();
            Luminous.Palette.clear();
          };
        }, []);
        effect(() => {
          if (!appActive || !enabled || !dynamicPalette) {
            Luminous.Palette.clear();
            return;
          }
          void Luminous.Palette.applyFromImage(song?.image);
        }, [appActive, dynamicPalette, enabled, song?.image]);
        effect(() => {
          if (!appActive) {
            Luminous.Background.destroy();
            return;
          }
          if (!enabled) {
            Luminous.Background.clear();
            return;
          }
          if (backgroundSource === 'auto' && canvas.video) {
            Luminous.Background.render({
              canvas: canvas.video,
              canvasSource: canvas.source,
              image: song?.image,
            });
            return;
          }
          if (song?.image) {
            Luminous.Background.render({ image: song.image });
            return;
          }
          Luminous.Background.render();
        }, [renderKey]);
        return null;
      }
    },
    'src/app/features/MotionFeature': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.MotionFeature = MotionFeature;
      const react_1 = require('../react');
      const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
      const PARALLAX_EASING = 0.12;
      const PARALLAX_EPSILON = 0.05;
      function MotionFeature() {
        const effect = (0, react_1.useEffect)();
        effect(() => {
          const root = document.documentElement;
          const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
          let frameId = null;
          let targetX = 0;
          let targetY = 0;
          let currentX = 0;
          let currentY = 0;
          let reduceMotion = Luminous.Settings.get('reduceMotion') === true;
          let respectSystem =
            Luminous.Settings.get('respectSystemMotion') !== false;
          let parallax = Luminous.Settings.get('parallax') !== false;
          let parallaxStrength = Number(
            Luminous.Settings.get('parallaxStrength') ?? 8,
          );
          let pauseWhenHidden =
            Luminous.Settings.get('pauseWhenHidden') !== false;
          const isReduced = () =>
            reduceMotion || (respectSystem && mediaQuery.matches);
          const resetParallax = () => {
            targetX = 0;
            targetY = 0;
            if (frameId === null)
              frameId = requestAnimationFrame(animateParallax);
          };
          const syncMotionState = () => {
            const reduced = isReduced();
            root.classList.toggle('luminous-reduce-motion', reduced);
            if (reduced || !parallax) resetParallax();
          };
          const syncVisibility = () => {
            const suspended = pauseWhenHidden && document.hidden;
            root.classList.toggle('luminous-runtime-suspended', suspended);
            Luminous.Background.setSuspended(suspended);
          };
          const animateParallax = () => {
            frameId = null;
            currentX += (targetX - currentX) * PARALLAX_EASING;
            currentY += (targetY - currentY) * PARALLAX_EASING;
            if (Math.abs(currentX) < PARALLAX_EPSILON) currentX = 0;
            if (Math.abs(currentY) < PARALLAX_EPSILON) currentY = 0;
            root.style.setProperty(
              '--luminous-parallax-x',
              `${(currentX * parallaxStrength).toFixed(2)}px`,
            );
            root.style.setProperty(
              '--luminous-parallax-y',
              `${(currentY * parallaxStrength).toFixed(2)}px`,
            );
            if (
              Math.abs(targetX - currentX) > PARALLAX_EPSILON ||
              Math.abs(targetY - currentY) > PARALLAX_EPSILON
            ) {
              frameId = requestAnimationFrame(animateParallax);
            }
          };
          const handlePointerMove = (event) => {
            if (
              !parallax ||
              isReduced() ||
              (pauseWhenHidden && document.hidden)
            ) {
              return;
            }
            targetX =
              (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
            targetY =
              (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
            if (frameId === null)
              frameId = requestAnimationFrame(animateParallax);
          };
          const unsubscribers = [
            Luminous.Settings.subscribe(
              'reduceMotion',
              (value) => {
                reduceMotion = value === true;
                syncMotionState();
              },
              { immediate: true },
            ),
            Luminous.Settings.subscribe(
              'respectSystemMotion',
              (value) => {
                respectSystem = value !== false;
                syncMotionState();
              },
              { immediate: true },
            ),
            Luminous.Settings.subscribe(
              'parallax',
              (value) => {
                parallax = value !== false;
                syncMotionState();
              },
              { immediate: true },
            ),
            Luminous.Settings.subscribe(
              'parallaxStrength',
              (value) => {
                parallaxStrength = Number(value);
                if (frameId === null)
                  frameId = requestAnimationFrame(animateParallax);
              },
              { immediate: true },
            ),
            Luminous.Settings.subscribe(
              'pauseWhenHidden',
              (value) => {
                pauseWhenHidden = value !== false;
                syncVisibility();
              },
              { immediate: true },
            ),
          ];
          mediaQuery.addEventListener('change', syncMotionState);
          window.addEventListener('pointermove', handlePointerMove, {
            passive: true,
          });
          window.addEventListener('pointerleave', resetParallax);
          document.addEventListener('visibilitychange', syncVisibility);
          syncMotionState();
          syncVisibility();
          return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
            mediaQuery.removeEventListener('change', syncMotionState);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerleave', resetParallax);
            document.removeEventListener('visibilitychange', syncVisibility);
            if (frameId !== null) cancelAnimationFrame(frameId);
            root.classList.remove('luminous-runtime-suspended');
            root.style.removeProperty('--luminous-parallax-x');
            root.style.removeProperty('--luminous-parallax-y');
            Luminous.Background.setSuspended(false);
          };
        }, []);
        return null;
      }
    },
    'src/app/features/SplashFeature': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.SplashFeature = SplashFeature;
      const react_1 = require('../react');
      const health_1 = require('../../ui/health');
      const MIN_VISIBLE_MS = 600;
      const MAX_VISIBLE_MS = 2600;
      const HELP_HINT_DELAY_MS = 1500;
      const SPOTIFY_SHELL_SELECTOR = '.Root__top-container #main-view';
      const SCRIPT_STARTED_AT = Date.now();
      function SplashFeature() {
        const React = (0, react_1.getReact)();
        const effect = (0, react_1.useEffect)();
        const memo = (0, react_1.useMemo)();
        const ref = (0, react_1.useRef)();
        const state = (0, react_1.useState)();
        const [shellPresent, setShellPresent] = state(() => hasSpotifyShell());
        const [visible, setVisible] = state(true);
        const [health, setHealth] = state(() => (0, health_1.getUiHealth)());
        const [now, setNow] = state(() => Date.now());
        const mountedAt = ref(shellPresent ? SCRIPT_STARTED_AT : null);
        const finished = ref(false);
        effect(() => (0, health_1.subscribeUiHealth)(setHealth), []);
        effect(() => {
          let frameId = null;
          const syncShellPresence = () => {
            frameId = null;
            setShellPresent(hasSpotifyShell());
          };
          const scheduleSync = () => {
            if (frameId !== null) return;
            frameId = requestAnimationFrame(syncShellPresence);
          };
          const observer = new MutationObserver(scheduleSync);
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });
          syncShellPresence();
          return () => {
            observer.disconnect();
            if (frameId !== null) cancelAnimationFrame(frameId);
          };
        }, []);
        effect(() => {
          if (!shellPresent || finished.current) return;
          if (mountedAt.current === null) {
            mountedAt.current = Date.now();
          }
          const elapsed = Date.now() - mountedAt.current;
          const targetDuration =
            health.status === 'ready' ? MIN_VISIBLE_MS : MAX_VISIBLE_MS;
          const remaining = Math.max(0, targetDuration - elapsed);
          const timeoutId = window.setTimeout(() => {
            finished.current = true;
            setVisible(false);
          }, remaining);
          return () => window.clearTimeout(timeoutId);
        }, [health.status, shellPresent]);
        effect(() => {
          if (!shellPresent || !visible || health.status !== 'waiting') return;
          const intervalId = window.setInterval(() => {
            setNow(Date.now());
          }, 250);
          return () => window.clearInterval(intervalId);
        }, [health.status, shellPresent, visible]);
        const message = memo(() => {
          if (health.status === 'waiting' && health.brokenSince) {
            return `Waiting for Spotify UI... (${formatSeconds(now - health.brokenSince)})`;
          }
          if (health.status === 'ready') {
            return 'Welcome back. Lighting up Spotify...';
          }
          return 'Starting Luminous...';
        }, [health.brokenSince, health.status, now]);
        const showHelpHint =
          health.status === 'waiting' &&
          health.brokenSince !== null &&
          now - health.brokenSince >= HELP_HINT_DELAY_MS;
        if (!shellPresent) return null;
        return React.createElement(
          'div',
          {
            className: `luminous-splash${visible ? '' : ' luminous-splash--hidden'}`,
            'aria-hidden': visible ? 'false' : 'true',
          },
          React.createElement(
            'div',
            { className: 'luminous-splash__panel' },
            React.createElement(
              'div',
              { className: 'luminous-splash__mark' },
              React.createElement('svg', {
                className: 'luminous-splash__luminous-icon',
                viewBox: '0 0 16 16',
                'aria-hidden': 'true',
                focusable: 'false',
                dangerouslySetInnerHTML: {
                  __html: Spicetify.SVGIcons?.brightness ?? '',
                },
              }),
            ),
            React.createElement(
              'div',
              { className: 'luminous-splash__copy' },
              React.createElement('span', null, 'Luminous'),
              React.createElement('small', null, message),
            ),
            React.createElement(
              'div',
              { className: 'luminous-splash__loader' },
              React.createElement('span'),
            ),
            showHelpHint &&
              React.createElement(
                'div',
                { className: 'luminous-splash__hint' },
                'Spotify is taking longer than expected. The splash will close automatically.',
              ),
          ),
        );
      }
      function hasSpotifyShell() {
        return document.querySelector(SPOTIFY_SHELL_SELECTOR) !== null;
      }
      function formatSeconds(duration) {
        return `${Math.max(0, Math.floor(duration / 1000))}s`;
      }
    },
    'src/app/features/SynchronizeFeature': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.SynchronizeFeature = SynchronizeFeature;
      const react_1 = require('../react');
      const synchronize_1 = require('../../ui/synchronize');
      function SynchronizeFeature() {
        const effect = (0, react_1.useEffect)();
        effect(() => {
          const controllers = [
            synchronize_1.Synchronize.uiMountWatcher(),
            synchronize_1.Synchronize.observeCinema(),
            synchronize_1.Synchronize.playlistBackground(),
            synchronize_1.Synchronize.homeHeaderHeight(),
          ];
          return () => {
            controllers.forEach((controller) => controller.disconnect());
          };
        }, []);
        return null;
      }
    },
    'src/app/features/ThemeMenuFeature': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.ThemeMenuFeature = ThemeMenuFeature;
      const settings_1 = require('../../config/settings');
      const react_1 = require('../react');
      const MENU_ITEM_LABEL = 'Luminous Settings';
      const MENU_ITEM_ICON = 'brightness';
      const MODAL_ID = 'luminous-theme-modal';
      const MODAL_TITLE_ID = 'luminous-theme-modal-title';
      const MODAL_DESCRIPTION_ID = 'luminous-theme-modal-description';
      const FOCUSABLE_SELECTOR = [
        'button:not([disabled])',
        'input:not([disabled])',
        '[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      const tabs = [
        { id: 'appearance', label: 'Appearance' },
        { id: 'motion', label: 'Motion' },
        { id: 'advanced', label: 'Advanced' },
      ];
      const resettableSettings = settings_1.settingsUi.map(
        (setting) => setting.key,
      );
      function ThemeMenuFeature() {
        const React = (0, react_1.getReact)();
        const effect = (0, react_1.useEffect)();
        const ref = (0, react_1.useRef)();
        const state = (0, react_1.useState)();
        const menuItemRef = ref(null);
        const [open, setOpen] = state(false);
        effect(() => {
          let disposed = false;
          let retryTimer = null;
          const registerMenuItem = () => {
            retryTimer = null;
            if (disposed || menuItemRef.current) return;
            if (!Spicetify.Menu?.Item) {
              retryTimer = window.setTimeout(registerMenuItem, 250);
              return;
            }
            const menuItem = new Spicetify.Menu.Item(
              MENU_ITEM_LABEL,
              false,
              () => setOpen(true),
              MENU_ITEM_ICON,
            );
            menuItem.register();
            menuItemRef.current = menuItem;
          };
          registerMenuItem();
          return () => {
            disposed = true;
            if (retryTimer !== null) window.clearTimeout(retryTimer);
            menuItemRef.current?.deregister();
            menuItemRef.current = null;
          };
        }, []);
        if (!open) return null;
        return React.createElement(ThemeSettingsModal, {
          onClose: () => setOpen(false),
        });
      }
      function ThemeSettingsModal({ onClose }) {
        const React = (0, react_1.getReact)();
        const effect = (0, react_1.useEffect)();
        const ref = (0, react_1.useRef)();
        const state = (0, react_1.useState)();
        const dialogRef = ref(null);
        const closeButtonRef = ref(null);
        const tabButtonRefs = ref({
          appearance: null,
          motion: null,
          advanced: null,
        });
        const panelRef = ref(null);
        const panelContentRef = ref(null);
        const [activeTab, setActiveTab] = state('appearance');
        const [panelHeight, setPanelHeight] = state(null);
        const selectTab = (tab, focus = false) => {
          if (tab === activeTab) return;
          const currentHeight =
            panelRef.current?.getBoundingClientRect().height;
          if (currentHeight) setPanelHeight(Math.ceil(currentHeight));
          setActiveTab(tab);
          if (focus)
            requestAnimationFrame(() => tabButtonRefs.current[tab]?.focus());
        };
        effect(() => {
          const previousOverflow = document.body.style.overflow;
          const previouslyFocused = document.activeElement;
          const focusFrame = requestAnimationFrame(() =>
            closeButtonRef.current?.focus(),
          );
          document.body.style.overflow = 'hidden';
          return () => {
            cancelAnimationFrame(focusFrame);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
          };
        }, []);
        effect(() => {
          const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
              return;
            }
            if (event.key !== 'Tab') return;
            const focusable = Array.from(
              dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [],
            ).filter((element) => element.offsetParent !== null);
            if (!focusable.length) {
              event.preventDefault();
              return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          };
          document.addEventListener('keydown', handleKeyDown, true);
          return () =>
            document.removeEventListener('keydown', handleKeyDown, true);
        }, [onClose]);
        effect(() => {
          if (panelHeight === null || !panelContentRef.current) return;
          const targetHeight = Math.ceil(
            panelContentRef.current.getBoundingClientRect().height,
          );
          const frameId = requestAnimationFrame(() =>
            setPanelHeight(targetHeight),
          );
          const resetTimer = window.setTimeout(() => setPanelHeight(null), 240);
          return () => {
            cancelAnimationFrame(frameId);
            window.clearTimeout(resetTimer);
          };
        }, [activeTab]);
        const handleTabKeyDown = (event, tab) => {
          const currentIndex = tabs.findIndex((item) => item.id === tab);
          let nextIndex = null;
          if (event.key === 'ArrowRight')
            nextIndex = (currentIndex + 1) % tabs.length;
          if (event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          }
          if (event.key === 'Home') nextIndex = 0;
          if (event.key === 'End') nextIndex = tabs.length - 1;
          if (nextIndex === null) return;
          event.preventDefault();
          selectTab(tabs[nextIndex].id, true);
        };
        return React.createElement(
          'div',
          {
            className: 'luminous-theme-modal-backdrop',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) onClose();
            },
          },
          React.createElement(
            'div',
            {
              ref: dialogRef,
              id: MODAL_ID,
              className: 'luminous-theme-menu',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-labelledby': MODAL_TITLE_ID,
              'aria-describedby': MODAL_DESCRIPTION_ID,
            },
            React.createElement(
              'div',
              { className: 'luminous-theme-menu__header' },
              React.createElement(
                'div',
                { className: 'luminous-theme-menu__mark' },
                React.createElement('svg', {
                  className: 'luminous-theme-menu__luminous-icon',
                  viewBox: '0 0 16 16',
                  'aria-hidden': 'true',
                  focusable: 'false',
                  dangerouslySetInnerHTML: {
                    __html: Spicetify.SVGIcons?.brightness ?? '',
                  },
                }),
              ),
              React.createElement(
                'div',
                { className: 'luminous-theme-menu__title' },
                React.createElement('span', { id: MODAL_TITLE_ID }, 'Luminous'),
                React.createElement(
                  'small',
                  { id: MODAL_DESCRIPTION_ID },
                  `Theme preferences · v${Luminous.version}`,
                ),
              ),
              React.createElement(
                'button',
                {
                  className: 'luminous-theme-menu__reset-button',
                  type: 'button',
                  onClick: () => {
                    Luminous.Settings.resetMany(resettableSettings);
                    Spicetify.showNotification('Luminous settings reset');
                  },
                },
                'Reset',
              ),
              React.createElement(
                'button',
                {
                  ref: closeButtonRef,
                  className: 'luminous-theme-menu__icon-button',
                  type: 'button',
                  'aria-label': 'Close settings',
                  onClick: onClose,
                },
                React.createElement('svg', {
                  className: 'luminous-theme-menu__close-icon',
                  'aria-hidden': 'true',
                  dangerouslySetInnerHTML: {
                    __html: Spicetify.SVGIcons?.x ?? '',
                  },
                }),
              ),
            ),
            React.createElement(PresetStrip),
            React.createElement(
              'div',
              {
                className: 'luminous-theme-menu__tabs',
                role: 'tablist',
                'aria-label': 'Luminous settings sections',
              },
              tabs.map((tab) =>
                React.createElement(
                  'button',
                  {
                    key: tab.id,
                    ref: (element) => {
                      tabButtonRefs.current[tab.id] = element;
                    },
                    id: `${MODAL_ID}-${tab.id}-tab`,
                    className: `luminous-theme-menu__tab${activeTab === tab.id ? ' luminous-theme-menu__tab--active' : ''}`,
                    type: 'button',
                    role: 'tab',
                    tabIndex: activeTab === tab.id ? 0 : -1,
                    'aria-selected': String(activeTab === tab.id),
                    'aria-controls': `${MODAL_ID}-${tab.id}-panel`,
                    onClick: () => selectTab(tab.id),
                    onKeyDown: (event) => handleTabKeyDown(event, tab.id),
                  },
                  tab.label,
                ),
              ),
            ),
            React.createElement(
              'div',
              {
                ref: panelRef,
                id: `${MODAL_ID}-${activeTab}-panel`,
                className: 'luminous-theme-menu__panel',
                style:
                  panelHeight === null
                    ? undefined
                    : { height: `${panelHeight}px` },
                role: 'tabpanel',
                'aria-labelledby': `${MODAL_ID}-${activeTab}-tab`,
              },
              React.createElement(
                'div',
                {
                  key: activeTab,
                  ref: panelContentRef,
                  className: 'luminous-theme-menu__panel-content',
                },
                React.createElement(SettingsSection, { section: activeTab }),
              ),
            ),
            React.createElement(
              'p',
              { className: 'luminous-theme-menu__footer' },
              'Changes are saved automatically.',
            ),
          ),
        );
      }
      function PresetStrip() {
        const React = (0, react_1.getReact)();
        return React.createElement(
          'div',
          {
            className: 'luminous-theme-menu__presets',
            'aria-label': 'Visual presets',
          },
          React.createElement('span', null, 'Presets'),
          React.createElement(
            'div',
            { className: 'luminous-theme-menu__preset-list' },
            settings_1.visualPresets.map((preset) =>
              React.createElement(
                'button',
                {
                  key: preset.id,
                  type: 'button',
                  className: 'luminous-theme-menu__preset-button',
                  title: preset.description,
                  onClick: () => {
                    Luminous.Settings.setMany(preset.values);
                    Spicetify.showNotification(
                      `Luminous preset: ${preset.label}`,
                    );
                  },
                },
                preset.label,
              ),
            ),
          ),
        );
      }
      function SettingsSection({ section }) {
        const React = (0, react_1.getReact)();
        const headings = {
          appearance: {
            title: 'Appearance',
            description:
              'Shape artwork, adaptive colour, and Spotify glass surfaces.',
          },
          motion: {
            title: 'Motion',
            description:
              'Tune movement, transitions, pointer depth, and accessibility.',
          },
          advanced: {
            title: 'Advanced',
            description:
              'Control rendering cost and inspect the current runtime.',
          },
        };
        const heading = headings[section];
        const rows = settings_1.settingsUi.filter(
          (setting) => setting.section === section,
        );
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'div',
            { className: 'luminous-theme-menu__panel-heading' },
            React.createElement('h2', null, heading.title),
            React.createElement('p', null, heading.description),
          ),
          rows.map((setting) =>
            React.createElement(SettingRow, { key: setting.key, setting }),
          ),
          section === 'advanced' && React.createElement(RuntimeTools),
        );
      }
      function SettingRow({ setting }) {
        if (setting.control === 'toggle') {
          return (0, react_1.getReact)().createElement(ToggleSettingRow, {
            setting,
          });
        }
        if (setting.control === 'range') {
          return (0, react_1.getReact)().createElement(NumericSettingRow, {
            setting,
          });
        }
        return (0, react_1.getReact)().createElement(ChoiceSettingRow, {
          setting,
        });
      }
      function ToggleSettingRow({ setting }) {
        const React = (0, react_1.getReact)();
        const effect = (0, react_1.useEffect)();
        const state = (0, react_1.useState)();
        const [checked, setChecked] = state(
          () => Luminous.Settings.get(setting.key) === true,
        );
        effect(
          () =>
            Luminous.Settings.subscribe(
              setting.key,
              (value) => setChecked(value === true),
              { immediate: true },
            ),
          [setting.key],
        );
        return React.createElement(
          'label',
          { className: 'luminous-theme-menu__row luminous-theme-menu__toggle' },
          React.createElement(SettingCopy, { setting }),
          React.createElement(
            'span',
            { className: 'luminous-theme-menu__switch' },
            React.createElement('input', {
              type: 'checkbox',
              checked,
              onChange: (event) =>
                Luminous.Settings.set(setting.key, event.currentTarget.checked),
            }),
            React.createElement('span'),
          ),
        );
      }
      function NumericSettingRow({ setting }) {
        const React = (0, react_1.getReact)();
        const effect = (0, react_1.useEffect)();
        const state = (0, react_1.useState)();
        const [value, setValue] = state(() =>
          Number(Luminous.Settings.get(setting.key)),
        );
        effect(
          () =>
            Luminous.Settings.subscribe(
              setting.key,
              (nextValue) => setValue(Number(nextValue)),
              { immediate: true },
            ),
          [setting.key],
        );
        return React.createElement(
          'label',
          { className: 'luminous-theme-menu__row luminous-theme-menu__range' },
          React.createElement(
            'span',
            { className: 'luminous-theme-menu__range-header' },
            React.createElement(SettingCopy, { setting }),
            React.createElement(
              'strong',
              null,
              `${value}${setting.unit ?? ''}`,
            ),
          ),
          React.createElement(
            'span',
            { className: 'luminous-theme-menu__range-control' },
            React.createElement('input', {
              type: 'range',
              min: setting.min,
              max: setting.max,
              step: setting.step,
              value,
              onChange: (event) =>
                Luminous.Settings.set(
                  setting.key,
                  Number(event.currentTarget.value),
                ),
            }),
          ),
        );
      }
      function ChoiceSettingRow({ setting }) {
        const React = (0, react_1.getReact)();
        const effect = (0, react_1.useEffect)();
        const state = (0, react_1.useState)();
        const [value, setValue] = state(() =>
          String(Luminous.Settings.get(setting.key)),
        );
        effect(
          () =>
            Luminous.Settings.subscribe(
              setting.key,
              (nextValue) => setValue(String(nextValue)),
              { immediate: true },
            ),
          [setting.key],
        );
        return React.createElement(
          'div',
          { className: 'luminous-theme-menu__row luminous-theme-menu__choice' },
          React.createElement(SettingCopy, { setting }),
          React.createElement(
            'div',
            {
              className: 'luminous-theme-menu__choices',
              role: 'group',
              'aria-label': setting.label,
            },
            setting.options?.map((option) =>
              React.createElement(
                'button',
                {
                  key: option.value,
                  className: `luminous-theme-menu__choice-button${
                    value === option.value
                      ? ' luminous-theme-menu__choice-button--active'
                      : ''
                  }`,
                  type: 'button',
                  'aria-pressed': String(value === option.value),
                  onClick: () =>
                    Luminous.Settings.set(setting.key, option.value),
                },
                option.label,
              ),
            ),
          ),
        );
      }
      function SettingCopy({ setting }) {
        const React = (0, react_1.getReact)();
        return React.createElement(
          'span',
          { className: 'luminous-theme-menu__copy' },
          React.createElement('span', null, setting.label),
          React.createElement('small', null, setting.description),
        );
      }
      function RuntimeTools() {
        const React = (0, react_1.getReact)();
        const effect = (0, react_1.useEffect)();
        const state = (0, react_1.useState)();
        const [summary, setSummary] = state(() => getRuntimeSummary());
        effect(() => {
          const refresh = () => setSummary(getRuntimeSummary());
          Luminous.Background.addEventListener('change', refresh);
          Luminous.Canvas.addEventListener('mount', refresh);
          Luminous.Canvas.addEventListener('change', refresh);
          Luminous.Canvas.addEventListener('unmount', refresh);
          Luminous.Song.addEventListener('change', refresh);
          return () => {
            Luminous.Background.removeEventListener('change', refresh);
            Luminous.Canvas.removeEventListener('mount', refresh);
            Luminous.Canvas.removeEventListener('change', refresh);
            Luminous.Canvas.removeEventListener('unmount', refresh);
            Luminous.Song.removeEventListener('change', refresh);
          };
        }, []);
        return React.createElement(
          'div',
          { className: 'luminous-theme-menu__runtime' },
          React.createElement(
            'div',
            { className: 'luminous-theme-menu__runtime-copy' },
            React.createElement('strong', null, 'Runtime'),
            React.createElement('small', null, summary),
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'luminous-theme-menu__tool-button',
              onClick: async () => {
                const copied = await Luminous.Diagnostics.copy();
                Spicetify.showNotification(
                  copied
                    ? 'Luminous diagnostics copied'
                    : 'Could not copy diagnostics',
                  !copied,
                );
              },
            },
            'Copy diagnostics',
          ),
        );
      }
      function getRuntimeSummary() {
        const diagnostics = Luminous.Diagnostics.get();
        const canvas = diagnostics.runtime.canvasMode ?? 'none';
        return `Background: ${diagnostics.runtime.background} · Canvas: ${canvas} · UI: ${diagnostics.runtime.uiHealth}`;
      }
    },
    'src/app/lifecycle': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.destroyLuminousRuntime = destroyLuminousRuntime;
      exports.markLuminousRuntimeActive = markLuminousRuntimeActive;
      const runtime_1 = require('./runtime');
      const ROOT_CLASSES = [
        'hideDynamicBackground',
        'luminous-dynamic-palette',
        'luminous-glass-highlights',
        'luminous-reduce-motion',
        'luminous-runtime-suspended',
        'luminous-parallax-enabled',
        'luminous-source-auto',
        'luminous-source-artwork',
        'luminous-motion-still',
        'luminous-motion-drift',
        'luminous-motion-float',
        'luminous-motion-orbit',
        'luminous-quality-full',
        'luminous-quality-balanced',
        'luminous-quality-lite',
        'luminous-effect-aurora',
        'luminous-effect-ember',
        'luminous-effect-bloom',
        'luminous-effect-prism',
        'luminous-effect-halo',
        'luminous-effect-nebula',
        'luminous-effect-energy-soft',
        'luminous-effect-energy-flow',
        'luminous-effect-energy-vivid',
        'luminous-effect-tone-dark',
        'luminous-effect-tone-balanced',
        'luminous-effect-tone-light',
      ];
      const ROOT_VARIABLES = [
        '--luminous-background',
        '--luminous-background-blur',
        '--luminous-background-brightness',
        '--luminous-ui-opacity',
        '--luminous-ui-blur',
        '--luminous-ui-base',
        '--luminous-palette-effect-opacity',
        '--luminous-motion-duration',
        '--luminous-transition-duration',
        '--luminous-vignette-opacity',
        '--luminous-grain-opacity',
        '--luminous-parallax-strength',
        '--luminous-parallax-x',
        '--luminous-parallax-y',
      ];
      let destroyed = false;
      function destroyLuminousRuntime() {
        if (destroyed) return;
        destroyed = true;
        (0, runtime_1.unmountLuminousApp)();
        Luminous.Background.destroy();
        Luminous.Palette.clear();
        Luminous.Canvas.destroy();
        Luminous.Song.destroy();
        Luminous.Settings.destroy();
        const root = document.documentElement;
        ROOT_CLASSES.forEach((className) => root.classList.remove(className));
        ROOT_VARIABLES.forEach((variable) =>
          root.style.removeProperty(variable),
        );
        Luminous.Logger.info('Runtime', 'Destroyed');
      }
      function markLuminousRuntimeActive() {
        destroyed = false;
      }
    },
    'src/app/react': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.getReact = getReact;
      exports.useEffect = useEffect;
      exports.useMemo = useMemo;
      exports.useRef = useRef;
      exports.useState = useState;
      function getReact() {
        return Spicetify.React;
      }
      function useEffect() {
        return getReact().useEffect;
      }
      function useMemo() {
        return getReact().useMemo;
      }
      function useRef() {
        return getReact().useRef;
      }
      function useState() {
        return getReact().useState;
      }
    },
    'src/app/runtime': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.mountLuminousApp = mountLuminousApp;
      exports.unmountLuminousApp = unmountLuminousApp;
      const App_1 = require('./App');
      const react_1 = require('./react');
      const ROOT_ID = 'luminous-react-root';
      const REACT_READY_TIMEOUT = 15000;
      let root = null;
      let mountRevision = 0;
      let reactWaitFrame = null;
      function mountLuminousApp() {
        const revision = ++mountRevision;
        cancelReactWait();
        waitForReactRuntime(revision)
          .then(() => {
            if (revision !== mountRevision) return;
            renderApp();
          })
          .catch((error) => {
            if (revision !== mountRevision) return;
            Luminous.Logger.error(
              'Runtime',
              'Failed to mount application',
              error,
            );
          });
      }
      function unmountLuminousApp() {
        mountRevision++;
        cancelReactWait();
        if (root?.unmount) {
          root.unmount();
          root = null;
        } else if (typeof Spicetify !== 'undefined' && Spicetify.ReactDOM) {
          const container = document.getElementById(ROOT_ID);
          if (container && Spicetify.ReactDOM.unmountComponentAtNode) {
            Spicetify.ReactDOM.unmountComponentAtNode(container);
          }
        }
        document.getElementById(ROOT_ID)?.remove();
      }
      function renderApp() {
        const React = (0, react_1.getReact)();
        const { ReactDOM } = Spicetify;
        const container = ensureRoot();
        const element = React.createElement(App_1.App);
        if (ReactDOM.createRoot) {
          const mountedRoot = root ?? ReactDOM.createRoot(container);
          root = mountedRoot;
          mountedRoot.render(element);
          return;
        }
        ReactDOM.render(element, container);
      }
      function waitForReactRuntime(revision) {
        return new Promise((resolve, reject) => {
          const start = performance.now();
          const check = () => {
            reactWaitFrame = null;
            if (revision !== mountRevision) {
              reject(new Error('Luminous mount superseded'));
              return;
            }
            if (
              typeof Spicetify !== 'undefined' &&
              Spicetify.React &&
              Spicetify.ReactDOM &&
              document.body
            ) {
              resolve();
              return;
            }
            if (performance.now() - start > REACT_READY_TIMEOUT) {
              reject(new Error('Spicetify React runtime not available'));
              return;
            }
            reactWaitFrame = requestAnimationFrame(check);
          };
          check();
        });
      }
      function cancelReactWait() {
        if (reactWaitFrame === null) return;
        cancelAnimationFrame(reactWaitFrame);
        reactWaitFrame = null;
      }
      function ensureRoot() {
        let container = document.getElementById(ROOT_ID);
        if (!container) {
          container = document.createElement('div');
          container.id = ROOT_ID;
          container.style.display = 'contents';
          document.body.appendChild(container);
        }
        return container;
      }
    },
    'src/config/settings': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.visualPresets =
        exports.settingsUi =
        exports.settingDefinitions =
        exports.effectQualities =
        exports.backgroundSources =
        exports.motionModes =
          void 0;
      exports.registerLuminousSettings = registerLuminousSettings;
      exports.motionModes = ['still', 'drift', 'float', 'orbit'];
      exports.backgroundSources = ['auto', 'artwork'];
      exports.effectQualities = ['full', 'balanced', 'lite'];
      const numberNormalizer = (fallback, min, max) => {
        return (value) => {
          if (typeof value !== 'number' && typeof value !== 'string')
            return fallback;
          if (typeof value === 'string' && value.trim() === '') return fallback;
          const parsed = typeof value === 'number' ? value : Number(value);
          if (!Number.isFinite(parsed)) return fallback;
          return Math.min(max, Math.max(min, parsed));
        };
      };
      const booleanNormalizer = (fallback) => {
        return (value) => (typeof value === 'boolean' ? value : fallback);
      };
      const choiceNormalizer = (values, fallback) => {
        return (value) =>
          typeof value === 'string' && values.includes(value)
            ? value
            : fallback;
      };
      const toggleExclusiveClasses = (prefix, values, active) => {
        values.forEach((value) => {
          Luminous.Settings.toggleClass(`${prefix}${value}`, value === active);
        });
      };
      exports.settingDefinitions = {
        backgroundBlur: {
          default: 24,
          normalize: numberNormalizer(24, 0, 48),
          apply: (value) =>
            Luminous.Settings.setVar(
              '--luminous-background-blur',
              `${value}px`,
            ),
        },
        backgroundBrightness: {
          default: 75,
          normalize: numberNormalizer(75, 30, 120),
          apply: (value) =>
            Luminous.Settings.setVar(
              '--luminous-background-brightness',
              String(value / 100),
            ),
        },
        uiBlur: {
          default: 16,
          normalize: numberNormalizer(16, 0, 32),
          apply: (value) =>
            Luminous.Settings.setVar('--luminous-ui-blur', `${value}px`),
        },
        paletteStrength: {
          default: 24,
          normalize: numberNormalizer(24, 0, 50),
          apply: (value) => {
            const opacity = Math.min(78, Math.round(value * 1.6));
            Luminous.Settings.setVar(
              '--luminous-palette-effect-opacity',
              `${opacity}%`,
            );
          },
        },
        vignetteStrength: {
          default: 28,
          normalize: numberNormalizer(28, 0, 70),
          apply: (value) =>
            Luminous.Settings.setVar(
              '--luminous-vignette-opacity',
              `${value}%`,
            ),
        },
        grainStrength: {
          default: 5,
          normalize: numberNormalizer(5, 0, 20),
          apply: (value) =>
            Luminous.Settings.setVar('--luminous-grain-opacity', `${value}%`),
        },
        glassHighlights: {
          default: true,
          normalize: booleanNormalizer(true),
          apply: (value) =>
            Luminous.Settings.toggleClass('luminous-glass-highlights', value),
        },
        backgroundEnergy: {
          default: 'adaptive',
          normalize: () => 'adaptive',
        },
        uiOpacity: {
          default: 50,
          normalize: numberNormalizer(50, 0, 100),
          apply: (value) => {
            if (Luminous.Settings.get('dynamicBackground') === false) {
              Luminous.Settings.removeVar('--luminous-ui-opacity');
              return;
            }
            Luminous.Settings.setVar('--luminous-ui-opacity', `${value}%`);
          },
        },
        dynamicBackground: {
          default: true,
          normalize: booleanNormalizer(true),
          apply: (value) => {
            Luminous.Settings.toggleClass('hideDynamicBackground', !value);
            if (value) {
              Luminous.Settings.setVar('--luminous-background', 'transparent');
              Luminous.Settings.setVar(
                '--luminous-ui-base',
                'var(--spice-sidebar)',
              );
              Luminous.Settings.setVar(
                '--luminous-ui-opacity',
                `${Luminous.Settings.get('uiOpacity') ?? 50}%`,
              );
              return;
            }
            Luminous.Settings.removeVar('--luminous-background');
            Luminous.Settings.removeVar('--luminous-ui-base');
            Luminous.Settings.removeVar('--luminous-ui-opacity');
          },
        },
        backgroundSource: {
          default: 'auto',
          normalize: choiceNormalizer(exports.backgroundSources, 'auto'),
          apply: (value) => {
            toggleExclusiveClasses(
              'luminous-source-',
              exports.backgroundSources,
              value,
            );
            Luminous.Canvas.setEnabled(value === 'auto');
          },
        },
        dynamicPalette: {
          default: true,
          normalize: booleanNormalizer(true),
          apply: (value) => {
            if (!value) Luminous.Palette.clear();
          },
        },
        backgroundMotion: {
          default: 'drift',
          normalize: choiceNormalizer(exports.motionModes, 'drift'),
          apply: (value) =>
            toggleExclusiveClasses(
              'luminous-motion-',
              exports.motionModes,
              value,
            ),
        },
        motionDuration: {
          default: 20,
          normalize: numberNormalizer(20, 8, 60),
          apply: (value) => {
            Luminous.Settings.setVar('--luminous-motion-duration', `${value}s`);
            Luminous.Palette.setMotionDuration(value);
          },
        },
        transitionDuration: {
          default: 420,
          normalize: numberNormalizer(420, 0, 1200),
          apply: (value) => {
            Luminous.Settings.setVar(
              '--luminous-transition-duration',
              `${value}ms`,
            );
            Luminous.Background.setTransitionDuration(value);
          },
        },
        parallax: {
          default: true,
          normalize: booleanNormalizer(true),
          apply: (value) =>
            Luminous.Settings.toggleClass('luminous-parallax-enabled', value),
        },
        parallaxStrength: {
          default: 8,
          normalize: numberNormalizer(8, 0, 20),
          apply: (value) =>
            Luminous.Settings.setVar(
              '--luminous-parallax-strength',
              `${value}px`,
            ),
        },
        reduceMotion: {
          default: false,
          normalize: booleanNormalizer(false),
        },
        respectSystemMotion: {
          default: true,
          normalize: booleanNormalizer(true),
        },
        pauseWhenHidden: {
          default: true,
          normalize: booleanNormalizer(true),
        },
        effectQuality: {
          default: 'full',
          normalize: choiceNormalizer(exports.effectQualities, 'full'),
          apply: (value) =>
            toggleExclusiveClasses(
              'luminous-quality-',
              exports.effectQualities,
              value,
            ),
        },
      };
      exports.settingsUi = [
        {
          key: 'dynamicBackground',
          label: 'Dynamic background',
          description: 'Use artwork or Spotify video behind the interface.',
          section: 'appearance',
          control: 'toggle',
        },
        {
          key: 'backgroundSource',
          label: 'Background source',
          description:
            'Prefer Spotify video automatically, or always use artwork.',
          section: 'appearance',
          control: 'choice',
          options: [
            { value: 'auto', label: 'Auto' },
            { value: 'artwork', label: 'Artwork' },
          ],
        },
        {
          key: 'dynamicPalette',
          label: 'Adaptive effects',
          description:
            'Build a colour scene automatically from each track cover.',
          section: 'appearance',
          control: 'toggle',
        },
        {
          key: 'backgroundBlur',
          label: 'Background blur',
          description: 'Softens artwork and video behind Spotify.',
          section: 'appearance',
          control: 'range',
          min: 0,
          max: 48,
          step: 1,
          unit: 'px',
        },
        {
          key: 'backgroundBrightness',
          label: 'Background brightness',
          description: 'Controls how prominent the media remains.',
          section: 'appearance',
          control: 'range',
          min: 30,
          max: 120,
          step: 1,
          unit: '%',
        },
        {
          key: 'uiOpacity',
          label: 'Surface opacity',
          description: 'Sets the density of translucent Spotify surfaces.',
          section: 'appearance',
          control: 'range',
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
        {
          key: 'uiBlur',
          label: 'Surface blur',
          description: 'Controls the glass blur applied to interface surfaces.',
          section: 'appearance',
          control: 'range',
          min: 0,
          max: 32,
          step: 1,
          unit: 'px',
        },
        {
          key: 'paletteStrength',
          label: 'Effect intensity',
          description: 'Controls how strongly adaptive light appears.',
          section: 'appearance',
          control: 'range',
          min: 0,
          max: 50,
          step: 1,
          unit: '%',
        },
        {
          key: 'vignetteStrength',
          label: 'Edge vignette',
          description: 'Darkens the edges for stronger foreground contrast.',
          section: 'appearance',
          control: 'range',
          min: 0,
          max: 70,
          step: 1,
          unit: '%',
        },
        {
          key: 'grainStrength',
          label: 'Film grain',
          description: 'Adds subtle animated texture to the lighting.',
          section: 'appearance',
          control: 'range',
          min: 0,
          max: 20,
          step: 1,
          unit: '%',
        },
        {
          key: 'glassHighlights',
          label: 'Glass highlights',
          description: 'Adds a faint light edge to the main glass surfaces.',
          section: 'appearance',
          control: 'toggle',
        },
        {
          key: 'backgroundMotion',
          label: 'Background movement',
          description: 'Choose the motion path used by media and light.',
          section: 'motion',
          control: 'choice',
          options: [
            { value: 'still', label: 'Still' },
            { value: 'drift', label: 'Drift' },
            { value: 'float', label: 'Float' },
            { value: 'orbit', label: 'Orbit' },
          ],
        },
        {
          key: 'motionDuration',
          label: 'Motion speed',
          description: 'Scales the media movement and adaptive scene tempo.',
          section: 'motion',
          control: 'range',
          min: 8,
          max: 60,
          step: 1,
          unit: 's',
        },
        {
          key: 'transitionDuration',
          label: 'Cross-fade',
          description: 'Sets how quickly backgrounds and lighting morph.',
          section: 'motion',
          control: 'range',
          min: 0,
          max: 1200,
          step: 20,
          unit: 'ms',
        },
        {
          key: 'parallax',
          label: 'Pointer parallax',
          description:
            'Lets the lighting follow the pointer with gentle depth.',
          section: 'motion',
          control: 'toggle',
        },
        {
          key: 'parallaxStrength',
          label: 'Parallax depth',
          description:
            'Controls how far the ambient background follows the pointer.',
          section: 'motion',
          control: 'range',
          min: 0,
          max: 20,
          step: 1,
          unit: 'px',
        },
        {
          key: 'reduceMotion',
          label: 'Reduce motion',
          description:
            'Stops Luminous animation regardless of system preference.',
          section: 'motion',
          control: 'toggle',
        },
        {
          key: 'respectSystemMotion',
          label: 'Respect system motion',
          description:
            'Also reduce motion when the operating system asks for it.',
          section: 'motion',
          control: 'toggle',
        },
        {
          key: 'effectQuality',
          label: 'Effect detail',
          description: 'Trade richer animated lighting for lower GPU work.',
          section: 'advanced',
          control: 'choice',
          options: [
            { value: 'full', label: 'Full' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'lite', label: 'Lite' },
          ],
        },
        {
          key: 'pauseWhenHidden',
          label: 'Pause when hidden',
          description:
            'Pause cloned video and custom animation when Spotify is hidden.',
          section: 'advanced',
          control: 'toggle',
        },
      ];
      exports.visualPresets = [
        {
          id: 'balanced',
          label: 'Balanced',
          description:
            'The default Luminous balance of clarity, colour, and motion.',
          values: {
            dynamicBackground: true,
            backgroundSource: 'auto',
            dynamicPalette: true,
            backgroundBlur: 24,
            backgroundBrightness: 75,
            uiOpacity: 50,
            uiBlur: 16,
            paletteStrength: 24,
            vignetteStrength: 28,
            grainStrength: 5,
            glassHighlights: true,
            backgroundMotion: 'drift',
            motionDuration: 20,
            transitionDuration: 420,
            parallax: true,
            parallaxStrength: 8,
            effectQuality: 'full',
          },
        },
        {
          id: 'cinematic',
          label: 'Cinematic',
          description:
            'Brighter media, deeper colour, slower transitions, more depth.',
          values: {
            dynamicBackground: true,
            backgroundSource: 'auto',
            dynamicPalette: true,
            backgroundBlur: 16,
            backgroundBrightness: 88,
            uiOpacity: 38,
            uiBlur: 20,
            paletteStrength: 36,
            vignetteStrength: 36,
            grainStrength: 7,
            glassHighlights: true,
            backgroundMotion: 'orbit',
            motionDuration: 26,
            transitionDuration: 620,
            parallax: true,
            parallaxStrength: 11,
            effectQuality: 'full',
          },
        },
        {
          id: 'calm',
          label: 'Calm',
          description: 'Soft, subdued lighting with minimal movement.',
          values: {
            dynamicBackground: true,
            backgroundSource: 'artwork',
            dynamicPalette: true,
            backgroundBlur: 36,
            backgroundBrightness: 62,
            uiOpacity: 68,
            uiBlur: 18,
            paletteStrength: 14,
            vignetteStrength: 22,
            grainStrength: 2,
            glassHighlights: false,
            backgroundMotion: 'still',
            transitionDuration: 360,
            parallax: false,
            effectQuality: 'balanced',
          },
        },
        {
          id: 'performance',
          label: 'Performance',
          description:
            'Artwork-only mode with reduced effect complexity and motion.',
          values: {
            dynamicBackground: true,
            backgroundSource: 'artwork',
            dynamicPalette: true,
            backgroundBlur: 18,
            backgroundBrightness: 72,
            uiOpacity: 72,
            uiBlur: 10,
            paletteStrength: 10,
            vignetteStrength: 20,
            grainStrength: 0,
            glassHighlights: false,
            backgroundMotion: 'still',
            transitionDuration: 220,
            parallax: false,
            effectQuality: 'lite',
            pauseWhenHidden: true,
          },
        },
      ];
      function registerLuminousSettings() {
        Object.entries(exports.settingDefinitions).forEach(
          ([key, definition]) => {
            Luminous.Settings.register(key, definition);
          },
        );
      }
    },
    'src/index': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      const global_1 = require('./api/global');
      const lifecycle_1 = require('./app/lifecycle');
      const runtime_1 = require('./app/runtime');
      const settings_1 = require('./config/settings');
      (0, global_1.destroyExistingRuntime)();
      (0, global_1.exposeGlobalAPI)(lifecycle_1.destroyLuminousRuntime);
      (0, lifecycle_1.markLuminousRuntimeActive)();
      Luminous.Logger.printBanner();
      (0, settings_1.registerLuminousSettings)();
      Luminous.Settings.init();
      void Luminous.Song.init().catch((error) => {
        Luminous.Logger.error('Song', 'Initialization failed', error);
      });
      (0, runtime_1.mountLuminousApp)();
    },
    'src/render/background': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Background = void 0;
      class Background {
        static DEFAULT_TRANSITION_MS = 420;
        static transitionMs = this.DEFAULT_TRANSITION_MS;
        static suspended = false;
        static MAX_PRELOADED_IMAGES = 24;
        static root = null;
        static base = null;
        static imageLayers = null;
        static activeImage = 0;
        static imageRenderId = 0;
        static preloadedImages = new Map();
        static videoLayers = null;
        static activeVideo = 0;
        static videoRenderId = 0;
        static currentCanvasSource = null;
        static currentCanvasKey = null;
        static pendingCanvasSource = null;
        static pendingCanvasKey = null;
        static pendingCanvasVideo = null;
        static pendingCanvasFallback = null;
        static videoCleanupTimer = null;
        static unsupportedCanvasSources = new WeakMap();
        static currentType = 'none';
        static listeners = new Map();
        static getType() {
          return this.currentType;
        }
        static get() {
          if (this.currentType === 'canvas' && this.videoLayers) {
            return this.videoLayers[this.activeVideo];
          }
          if (this.currentType === 'image' && this.imageLayers) {
            return this.imageLayers[this.activeImage];
          }
          return null;
        }
        static addEventListener(event, listener) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
          }
          this.listeners.get(event).add(listener);
        }
        static removeEventListener(event, listener) {
          this.listeners.get(event)?.delete(listener);
        }
        static emit(event) {
          const payload = {
            type: this.currentType,
            element: this.get(),
          };
          this.listeners.get(event)?.forEach((listener) => {
            try {
              listener(payload);
            } catch (error) {
              Luminous.Logger.error('Background', 'Listener failed', error);
            }
          });
        }
        static baseStyle() {
          return {
            position: 'absolute',
            inset: '0',
            width: '120%',
            height: '120%',
            objectFit: 'cover',
            filter: `blur(var(--luminous-background-blur)) brightness(var(--luminous-background-brightness))`,
            transform: 'scale(1.2) translateZ(0)',
            pointerEvents: 'none',
            transition: 'opacity var(--luminous-transition-duration) ease',
            opacity: '0',
            willChange: 'opacity, transform',
          };
        }
        static createImageLayer() {
          const image = document.createElement('img');
          Object.assign(image.style, this.baseStyle());
          image.alt = '';
          image.decoding = 'async';
          Luminous.Logger.info('Background', 'Created image layer', image);
          return image;
        }
        static createVideoLayer() {
          const video = document.createElement('video');
          Object.assign(video.style, this.baseStyle());
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          video.loop = true;
          Luminous.Logger.info('Background', 'Created video layer', video);
          return video;
        }
        static createEffectsLayer() {
          const effects = document.createElement('div');
          effects.className = 'luminous-background-effects';
          const mesh = document.createElement('span');
          mesh.className = 'luminous-background-mesh';
          const halo = document.createElement('span');
          halo.className = 'luminous-background-halo';
          const ribbons = ['one', 'two'].map((variant) => {
            const ribbon = document.createElement('span');
            ribbon.className = `luminous-background-ribbon luminous-background-ribbon--${variant}`;
            return ribbon;
          });
          const blobs = ['one', 'two', 'three', 'four'].map((variant) => {
            const blob = document.createElement('span');
            blob.className = `luminous-background-blob luminous-background-blob--${variant}`;
            return blob;
          });
          const shimmer = document.createElement('span');
          shimmer.className = 'luminous-background-shimmer';
          const sparkles = document.createElement('span');
          sparkles.className = 'luminous-background-sparkles';
          const vignette = document.createElement('span');
          vignette.className = 'luminous-background-vignette';
          const grain = document.createElement('span');
          grain.className = 'luminous-background-grain';
          effects.append(
            mesh,
            halo,
            ...ribbons,
            ...blobs,
            shimmer,
            sparkles,
            vignette,
            grain,
          );
          return effects;
        }
        static ensureBackground() {
          if (this.root?.isConnected) return;
          this.cancelVideoCleanup();
          this.videoLayers?.forEach((video) => this.resetVideo(video));
          this.root?.remove();
          this.root = document.createElement('div');
          this.root.id = 'luminous-dynamic-background';
          this.root.setAttribute('aria-hidden', 'true');
          Object.assign(this.root.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '0',
            overflow: 'hidden',
            pointerEvents: 'none',
            isolation: 'isolate',
          });
          this.base = document.createElement('div');
          this.base.className = 'luminous-base';
          Object.assign(this.base.style, {
            position: 'absolute',
            inset: '0',
            background: 'var(--spice-sidebar)',
            transition: 'opacity var(--luminous-transition-duration) ease',
            opacity: '1',
          });
          const imageA = this.createImageLayer();
          const imageB = this.createImageLayer();
          const videoA = this.createVideoLayer();
          const videoB = this.createVideoLayer();
          const effects = this.createEffectsLayer();
          this.root.append(this.base, imageA, imageB, videoA, videoB, effects);
          this.imageLayers = [imageA, imageB];
          this.videoLayers = [videoA, videoB];
          this.activeImage = 0;
          this.activeVideo = 0;
          this.currentType = 'none';
          this.currentCanvasSource = null;
          this.currentCanvasKey = null;
          this.clearPendingCanvas();
          document.body.prepend(this.root);
        }
        static render(options) {
          this.ensureBackground();
          if (!options || (!options.image && !options.canvas)) {
            this.clear();
            Luminous.Logger.info('Background', 'Rendering default layer');
            return;
          }
          if (
            options.canvas &&
            this.renderCanvas(
              options.canvas,
              options.image,
              options.canvasSource ?? null,
            )
          ) {
            return;
          }
          if (options.image) {
            this.renderImage(options.image);
            return;
          }
          this.clear();
        }
        static preloadImage(src) {
          if (!src || this.preloadedImages.has(src)) return;
          const image = new Image();
          image.decoding = 'async';
          image.src = src;
          this.preloadedImages.set(src, image);
          this.trimPreloadedImages();
        }
        static renderImage(src) {
          this.ensureBackground();
          this.videoRenderId++;
          this.currentCanvasSource = null;
          this.currentCanvasKey = null;
          this.clearPendingCanvas();
          if (!this.imageLayers) {
            Luminous.Logger.warn('Background', 'No image layers for render');
            return;
          }
          if (!src) {
            Luminous.Logger.warn('Background', 'No image src for render');
            this.clear();
            return;
          }
          const renderId = ++this.imageRenderId;
          const nextIndex = this.activeImage === 0 ? 1 : 0;
          const current = this.imageLayers[this.activeImage];
          const next = this.imageLayers[nextIndex];
          if (
            current.src === src &&
            current.complete &&
            current.naturalWidth > 0
          ) {
            this.transitionTo('image', current);
            return;
          }
          const preload = this.getPreloadedImage(src);
          const showImage = () => {
            if (renderId !== this.imageRenderId) return;
            next.src = src;
            requestAnimationFrame(() => {
              if (renderId !== this.imageRenderId) return;
              this.activeImage = nextIndex;
              this.transitionTo('image', next);
              Luminous.Logger.info('Background', 'Rendering image layer', src);
            });
          };
          if (preload.complete && preload.naturalWidth > 0) {
            showImage();
            return;
          }
          preload.addEventListener('load', showImage, { once: true });
          preload.addEventListener(
            'error',
            () => {
              if (renderId !== this.imageRenderId) return;
              Luminous.Logger.warn('Background', 'Failed to load image', src);
              if (
                this.currentType === 'image' &&
                current.complete &&
                current.naturalWidth > 0
              ) {
                this.transitionTo('image', current);
                return;
              }
              this.clear();
            },
            { once: true },
          );
        }
        static getPreloadedImage(src) {
          let image = this.preloadedImages.get(src);
          if (image?.complete && image.naturalWidth === 0) {
            this.preloadedImages.delete(src);
            image = undefined;
          }
          if (!image) {
            image = new Image();
            image.decoding = 'async';
            image.src = src;
            this.preloadedImages.set(src, image);
            this.trimPreloadedImages();
          }
          return image;
        }
        static trimPreloadedImages() {
          while (this.preloadedImages.size > this.MAX_PRELOADED_IMAGES) {
            const oldestKey = this.preloadedImages.keys().next().value;
            if (!oldestKey) return;
            this.preloadedImages.delete(oldestKey);
          }
        }
        static renderCanvas(sourceVideo, fallbackImage, sourceKey) {
          this.ensureBackground();
          if (!this.videoLayers) {
            Luminous.Logger.warn('Background', 'No video layers for render');
            return false;
          }
          const canvasKey =
            (sourceKey ?? sourceVideo.currentSrc) || sourceVideo.src || null;
          if (
            this.currentType === 'canvas' &&
            this.currentCanvasSource === sourceVideo &&
            this.currentCanvasKey === canvasKey &&
            this.isCanvasLayerUsable(this.get())
          ) {
            return true;
          }
          if (
            this.pendingCanvasSource === sourceVideo &&
            this.pendingCanvasKey === canvasKey &&
            this.pendingCanvasVideo?.isConnected
          ) {
            if (fallbackImage !== undefined) {
              this.pendingCanvasFallback = fallbackImage;
            }
            return true;
          }
          if (this.pendingCanvasVideo) {
            this.videoRenderId++;
            const pendingVideo = this.pendingCanvasVideo;
            this.clearPendingCanvas();
            this.resetVideo(pendingVideo);
          }
          if (this.isUnsupportedCanvasSource(sourceVideo, canvasKey))
            return false;
          if (
            !sourceVideo.isConnected ||
            sourceVideo.ended ||
            sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            return false;
          }
          const captureStream = sourceVideo.captureStream;
          if (typeof captureStream !== 'function') {
            this.markUnsupportedCanvasSource(sourceVideo, canvasKey);
            return false;
          }
          let stream;
          try {
            stream = captureStream.call(sourceVideo);
          } catch (error) {
            if (this.isPermanentCanvasError(error)) {
              this.markUnsupportedCanvasSource(sourceVideo, canvasKey);
            }
            return false;
          }
          if (stream.getVideoTracks().length === 0) {
            stream.getTracks().forEach((track) => track.stop());
            return false;
          }
          this.cancelVideoCleanup();
          this.imageRenderId++;
          const nextIndex = this.activeVideo === 0 ? 1 : 0;
          const next = this.videoLayers[nextIndex];
          const renderId = ++this.videoRenderId;
          this.resetVideo(next);
          next.style.opacity = '0';
          next.srcObject = stream;
          this.pendingCanvasSource = sourceVideo;
          this.pendingCanvasKey = canvasKey;
          this.pendingCanvasVideo = next;
          this.pendingCanvasFallback = fallbackImage ?? null;
          void next
            .play()
            .then(() => {
              if (!this.isPendingCanvas(renderId, next)) return;
              requestAnimationFrame(() => {
                if (!this.isPendingCanvas(renderId, next)) return;
                this.clearPendingCanvas();
                this.activeVideo = nextIndex;
                this.currentCanvasSource = sourceVideo;
                this.currentCanvasKey = canvasKey;
                this.transitionTo('canvas', next);
                if (this.suspended) next.pause();
                Luminous.Logger.info(
                  'Background',
                  'Rendering canvas layer',
                  sourceVideo,
                );
              });
            })
            .catch((error) => {
              if (!this.isPendingCanvas(renderId, next)) return;
              const currentFallback = this.pendingCanvasFallback;
              this.clearPendingCanvas();
              this.resetVideo(next);
              if (this.isInterruptedPlayback(error)) {
                if (this.currentType === 'none' && currentFallback) {
                  this.renderImage(currentFallback);
                }
                return;
              }
              if (this.isPermanentCanvasError(error)) {
                this.markUnsupportedCanvasSource(sourceVideo, canvasKey);
              }
              Luminous.Logger.warn(
                'Background',
                'Failed to play canvas stream',
                error,
              );
              if (currentFallback) {
                this.renderImage(currentFallback);
              } else {
                this.clear();
              }
            });
          return true;
        }
        static setTransitionDuration(duration) {
          this.transitionMs = Number.isFinite(duration)
            ? Math.min(1200, Math.max(0, duration))
            : this.DEFAULT_TRANSITION_MS;
        }
        static setSuspended(suspended) {
          if (this.suspended === suspended) return;
          this.suspended = suspended;
          const active =
            this.currentType === 'canvas' && this.videoLayers
              ? this.videoLayers[this.activeVideo]
              : null;
          if (!active) return;
          if (suspended) {
            active.pause();
            return;
          }
          void active.play().catch((error) => {
            if (!this.isInterruptedPlayback(error)) {
              Luminous.Logger.warn(
                'Background',
                'Failed to resume canvas stream',
                error,
              );
            }
          });
        }
        static destroy() {
          this.imageRenderId++;
          this.videoRenderId++;
          this.currentCanvasSource = null;
          this.currentCanvasKey = null;
          this.clearPendingCanvas();
          this.cancelVideoCleanup();
          this.videoLayers?.forEach((video) => this.resetVideo(video));
          this.root?.remove();
          this.root = null;
          this.base = null;
          this.imageLayers = null;
          this.videoLayers = null;
          this.activeImage = 0;
          this.activeVideo = 0;
          this.currentType = 'none';
          this.suspended = false;
          this.emit('change');
        }
        static clear() {
          this.imageRenderId++;
          this.videoRenderId++;
          this.currentCanvasSource = null;
          this.currentCanvasKey = null;
          this.clearPendingCanvas();
          this.transitionTo('none');
        }
        static transitionTo(type, activeElement = null) {
          if (!this.imageLayers || !this.videoLayers) return;
          this.currentType = type;
          if (this.base) {
            this.base.style.opacity = type === 'none' ? '1' : '0';
          }
          this.imageLayers.forEach((element) => {
            const active = type === 'image' && element === activeElement;
            element.style.opacity = active ? '1' : '0';
            element.classList.toggle(
              'luminous-background-layer--active',
              active,
            );
          });
          this.videoLayers.forEach((element) => {
            const active = type === 'canvas' && element === activeElement;
            element.style.opacity = active ? '1' : '0';
            element.classList.toggle(
              'luminous-background-layer--active',
              active,
            );
          });
          this.scheduleVideoCleanup();
          this.emit('change');
        }
        static isCanvasLayerUsable(element) {
          if (!(element instanceof HTMLVideoElement) || !element.isConnected) {
            return false;
          }
          const stream = element.srcObject;
          return (
            stream instanceof MediaStream &&
            stream.getVideoTracks().some((track) => track.readyState === 'live')
          );
        }
        static isPendingCanvas(renderId, video) {
          return (
            renderId === this.videoRenderId && this.pendingCanvasVideo === video
          );
        }
        static clearPendingCanvas() {
          this.pendingCanvasSource = null;
          this.pendingCanvasKey = null;
          this.pendingCanvasVideo = null;
          this.pendingCanvasFallback = null;
        }
        static scheduleVideoCleanup() {
          this.cancelVideoCleanup();
          this.videoCleanupTimer = window.setTimeout(() => {
            this.videoCleanupTimer = null;
            const activeVideo =
              this.currentType === 'canvas' && this.videoLayers
                ? this.videoLayers[this.activeVideo]
                : null;
            const pendingVideo = this.pendingCanvasVideo;
            this.videoLayers?.forEach((video) => {
              if (video !== activeVideo && video !== pendingVideo) {
                this.resetVideo(video);
              }
            });
          }, this.transitionMs);
        }
        static cancelVideoCleanup() {
          if (this.videoCleanupTimer === null) return;
          window.clearTimeout(this.videoCleanupTimer);
          this.videoCleanupTimer = null;
        }
        static isUnsupportedCanvasSource(video, source) {
          if (!source) return false;
          return this.unsupportedCanvasSources.get(video)?.has(source) ?? false;
        }
        static markUnsupportedCanvasSource(video, source) {
          if (!source) return;
          let sources = this.unsupportedCanvasSources.get(video);
          if (!sources) {
            sources = new Set();
            this.unsupportedCanvasSources.set(video, sources);
          }
          sources.add(source);
        }
        static getErrorName(error) {
          if (
            typeof error !== 'object' ||
            error === null ||
            !('name' in error)
          ) {
            return null;
          }
          return typeof error.name === 'string' ? error.name : null;
        }
        static isInterruptedPlayback(error) {
          return this.getErrorName(error) === 'AbortError';
        }
        static isPermanentCanvasError(error) {
          const name = this.getErrorName(error);
          return name === 'NotSupportedError' || name === 'SecurityError';
        }
        static resetVideo(video) {
          video.onplaying = null;
          video.pause();
          const stream = video.srcObject;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          video.srcObject = null;
          video.removeAttribute('src');
          video.load();
        }
      }
      exports.Background = Background;
    },
    'src/types/runtime/canvas.types': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
    },
    'src/types/runtime/dynamic.types': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
    },
    'src/types/runtime/global.types': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
    },
    'src/types/runtime/logger.types': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
    },
    'src/types/runtime/native.types': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
    },
    'src/types/runtime/settings.types': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
    },
    'src/types/runtime/song.types': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
    },
    'src/ui/health': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.getUiHealth = getUiHealth;
      exports.setUiHealth = setUiHealth;
      exports.subscribeUiHealth = subscribeUiHealth;
      const logger_1 = require('../api/logger');
      let state = {
        status: 'booting',
        brokenSince: null,
      };
      const listeners = new Set();
      function getUiHealth() {
        return state;
      }
      function setUiHealth(nextState) {
        const next = { ...state, ...nextState };
        if (
          next.status === state.status &&
          next.brokenSince === state.brokenSince
        ) {
          return;
        }
        state = next;
        listeners.forEach((listener) => notifyListener(listener));
      }
      function subscribeUiHealth(listener) {
        listeners.add(listener);
        notifyListener(listener);
        return () => {
          listeners.delete(listener);
        };
      }
      function notifyListener(listener) {
        try {
          listener(state);
        } catch (error) {
          logger_1.Logger.error('UI', 'UI health listener failed', error);
        }
      }
    },
    'src/ui/synchronize': function (module, exports, require) {
      'use strict';
      Object.defineProperty(exports, '__esModule', { value: true });
      exports.Synchronize = void 0;
      const logger_1 = require('../api/logger');
      const health_1 = require('./health');
      const PLAYLIST_BACKGROUND_CLASS = 'luminous-playlist-background';
      const PLAYLIST_BACKGROUND_VAR = '--luminous-playlist-background-image';
      const HOME_HEADER_HEIGHT_CLASS = 'luminous-home-header-height';
      const HOME_HEADER_HEIGHT_VAR = '--luminous-home-header-height';
      class Synchronize {
        static playlistBackground(options) {
          let root = null;
          let rootObserver = null;
          let contentObserver = null;
          let rafId = null;
          let disposed = false;
          let lastBackground = null;
          let lastTarget = null;
          function cleanupTarget() {
            if (!lastTarget) return;
            lastTarget.classList.remove(PLAYLIST_BACKGROUND_CLASS);
            lastTarget.style.removeProperty(PLAYLIST_BACKGROUND_VAR);
            lastTarget = null;
            lastBackground = null;
          }
          function attachRoot() {
            if (disposed) return;
            const nextRoot = document.querySelector('.main-view-container');
            if (nextRoot === root && root?.isConnected) return;
            contentObserver?.disconnect();
            contentObserver = null;
            cleanupTarget();
            root = nextRoot;
            if (!root) return;
            contentObserver = new MutationObserver(scheduleSync);
            contentObserver.observe(root, {
              subtree: true,
              childList: true,
              attributes: true,
              attributeFilter: ['style', 'class'],
            });
          }
          function scheduleSync() {
            if (disposed || rafId !== null) return;
            rafId = requestAnimationFrame(() => {
              rafId = null;
              attachRoot();
              sync();
            });
          }
          function sync() {
            if (!root) return;
            const source = root.querySelector(
              '.before-scroll-node > div > :first-child',
            );
            const target =
              root.querySelector(
                'section > .main-entityHeader-container, section > div > .main-entityHeader-container',
              ) ||
              root.querySelector('main > div > .main-entityHeader-container');
            if (!source || !target) {
              cleanupTarget();
              return;
            }
            const background = getComputedStyle(source).backgroundImage;
            if (!background || background === 'none') {
              cleanupTarget();
              return;
            }
            if (target !== lastTarget) {
              cleanupTarget();
              lastTarget = target;
            }
            if (background === lastBackground) return;
            lastBackground = background;
            target.classList.add(PLAYLIST_BACKGROUND_CLASS);
            target.style.setProperty(PLAYLIST_BACKGROUND_VAR, background);
            options?.onBackgroundChange?.(background, source, target);
          }
          rootObserver = new MutationObserver(scheduleSync);
          rootObserver.observe(document.documentElement, {
            subtree: true,
            childList: true,
          });
          scheduleSync();
          return {
            disconnect() {
              disposed = true;
              rootObserver?.disconnect();
              contentObserver?.disconnect();
              rootObserver = null;
              contentObserver = null;
              if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              cleanupTarget();
              root = null;
            },
          };
        }
        static homeHeaderHeight(options) {
          let root = null;
          let rootObserver = null;
          let contentObserver = null;
          let rafId = null;
          let disposed = false;
          let lastHeight = null;
          let lastHeader = null;
          function cleanupHeader() {
            if (!lastHeader) return;
            lastHeader.classList.remove(HOME_HEADER_HEIGHT_CLASS);
            lastHeader.style.removeProperty(HOME_HEADER_HEIGHT_VAR);
            lastHeader = null;
            lastHeight = null;
          }
          function outerHeight(element) {
            const style = getComputedStyle(element);
            const marginTop = Number.parseFloat(style.marginTop) || 0;
            const marginBottom = Number.parseFloat(style.marginBottom) || 0;
            return element.offsetHeight + marginTop + marginBottom;
          }
          function attachRoot() {
            if (disposed) return;
            const nextRoot = document.querySelector('#main-view');
            if (nextRoot === root && root?.isConnected) return;
            contentObserver?.disconnect();
            contentObserver = null;
            cleanupHeader();
            root = nextRoot;
            if (!root) return;
            contentObserver = new MutationObserver(scheduleSync);
            contentObserver.observe(root, {
              subtree: true,
              childList: true,
              attributes: true,
              attributeFilter: ['style', 'class'],
            });
          }
          function scheduleSync() {
            if (disposed || rafId !== null) return;
            rafId = requestAnimationFrame(() => {
              rafId = null;
              attachRoot();
              sync();
            });
          }
          function sync() {
            if (!root) return;
            const header = root.querySelector('.main-home-homeHeader');
            const chips = root.querySelector('.main-home-filterChipsContainer');
            const firstSection = root.querySelector(
              'section[data-testid="home-page"]:has(.view-homeShortcutsGrid-shortcuts) .main-home-content section:first-child',
            );
            if (!header || !chips || !firstSection) {
              cleanupHeader();
              return;
            }
            const height = outerHeight(chips) + outerHeight(firstSection);
            if (header !== lastHeader) {
              cleanupHeader();
              lastHeader = header;
            }
            if (height === lastHeight) return;
            lastHeight = height;
            header.classList.add(HOME_HEADER_HEIGHT_CLASS);
            header.style.setProperty(HOME_HEADER_HEIGHT_VAR, `${height}px`);
            options?.onHeightChange?.(height, chips, firstSection, header);
          }
          rootObserver = new MutationObserver(scheduleSync);
          rootObserver.observe(document.documentElement, {
            subtree: true,
            childList: true,
          });
          window.addEventListener('resize', scheduleSync);
          scheduleSync();
          return {
            disconnect() {
              disposed = true;
              rootObserver?.disconnect();
              contentObserver?.disconnect();
              window.removeEventListener('resize', scheduleSync);
              rootObserver = null;
              contentObserver = null;
              if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              cleanupHeader();
              root = null;
            },
          };
        }
        static uiMountWatcher() {
          let observer = null;
          let rafId = null;
          let disposed = false;
          let waitingSince = null;
          function hasSpotifyShell() {
            return (
              document.querySelector('.Root__top-container #main-view') !== null
            );
          }
          function hasSpotifyUi() {
            return !!(
              document.querySelector('.Root__main-view') ||
              document.querySelector('.main-view-container') ||
              document.querySelector('[data-testid="main-view"]')
            );
          }
          function scheduleCheck() {
            if (disposed || rafId !== null) return;
            rafId = requestAnimationFrame(() => {
              rafId = null;
              check();
            });
          }
          function check() {
            if (!hasSpotifyShell()) {
              waitingSince = null;
              (0, health_1.setUiHealth)({
                status: 'booting',
                brokenSince: null,
              });
              return;
            }
            if (hasSpotifyUi()) {
              waitingSince = null;
              (0, health_1.setUiHealth)({ status: 'ready', brokenSince: null });
              return;
            }
            if (waitingSince === null) {
              waitingSince = Date.now();
              logger_1.Logger.info('Main', 'Waiting for Spotify UI mount...');
            }
            (0, health_1.setUiHealth)({
              status: 'waiting',
              brokenSince: waitingSince,
            });
          }
          observer = new MutationObserver(scheduleCheck);
          observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
          });
          scheduleCheck();
          return {
            disconnect() {
              disposed = true;
              observer?.disconnect();
              observer = null;
              if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              waitingSince = null;
              (0, health_1.setUiHealth)({
                status: 'booting',
                brokenSince: null,
              });
            },
          };
        }
        static observeCinema() {
          let observer = null;
          function cleanupAttributes() {
            const html = document.documentElement;
            html.removeAttribute('data-transition');
            [
              'data-right-sidebar-open-preenter',
              'data-right-sidebar-open-preexit',
              'data-right-sidebar-open-duringexit',
              'data-right-sidebar-open-postexit',
            ].forEach((attribute) => {
              html.removeAttribute(attribute);
            });
          }
          observer = new MutationObserver(cleanupAttributes);
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: [
              'data-transition',
              'data-right-sidebar-open-preenter',
              'data-right-sidebar-open-duringenter',
              'data-right-sidebar-open-postenter',
              'data-right-sidebar-open-preexit',
              'data-right-sidebar-open-duringexit',
              'data-right-sidebar-open-postexit',
            ],
          });
          cleanupAttributes();
          return {
            disconnect() {
              observer?.disconnect();
              observer = null;
            },
          };
        }
      }
      exports.Synchronize = Synchronize;
    },
  };
  const cache = Object.create(null);
  const normalize = (value) => {
    const parts = [];
    for (const part of value.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return parts.join('/');
  };
  const load = (id) => {
    id = normalize(id);
    if (cache[id]) return cache[id].exports;
    const factory = modules[id] || modules[id + '/index'];
    if (!factory) throw new Error('[Luminous] Missing bundled module: ' + id);
    const module = { exports: {} };
    cache[id] = module;
    const base = id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : '';
    const localRequire = (request) => {
      if (!request.startsWith('.'))
        throw new Error('[Luminous] Unexpected external module: ' + request);
      return load(normalize(base + '/' + request));
    };
    factory(module, module.exports, localRequire);
    return module.exports;
  };
  load('src/index');
})();
