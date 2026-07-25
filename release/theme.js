var e = class {
    static TRANSITION_MS = 250;
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
    static videoCleanupTimer = null;
    static currentType = `none`;
    static listeners = new Map();
    static getType() {
      return this.currentType;
    }
    static get() {
      return this.currentType === `canvas` && this.videoLayers
        ? this.videoLayers[this.activeVideo]
        : this.currentType === `image` && this.imageLayers
          ? this.imageLayers[this.activeImage]
          : null;
    }
    static addEventListener(e, t) {
      (this.listeners.has(e) || this.listeners.set(e, new Set()),
        this.listeners.get(e).add(t));
    }
    static removeEventListener(e, t) {
      this.listeners.get(e)?.delete(t);
    }
    static emit(e) {
      let t = { type: this.currentType, element: this.get() };
      this.listeners.get(e)?.forEach((e) => {
        try {
          e(t);
        } catch (e) {
          Luminous.Logger.error(`Background`, `Listener failed`, e);
        }
      });
    }
    static baseStyle() {
      return {
        position: `absolute`,
        inset: `0`,
        width: `120%`,
        height: `120%`,
        objectFit: `cover`,
        filter: `blur(var(--luminous-background-blur)) brightness(var(--luminous-background-brightness))`,
        transform: `scale(1.2) translateZ(0)`,
        pointerEvents: `none`,
        transition: `opacity ${this.TRANSITION_MS}ms linear`,
        opacity: `0`,
        willChange: `opacity, transform`,
      };
    }
    static createImageLayer() {
      let e = document.createElement(`img`);
      return (
        Object.assign(e.style, this.baseStyle()),
        (e.alt = ``),
        (e.decoding = `async`),
        Luminous.Logger.info(`Background`, `Created image layer`, e),
        e
      );
    }
    static createVideoLayer() {
      let e = document.createElement(`video`);
      return (
        Object.assign(e.style, this.baseStyle()),
        (e.muted = !0),
        (e.playsInline = !0),
        (e.autoplay = !0),
        (e.loop = !0),
        Luminous.Logger.info(`Background`, `Created video layer`, e),
        e
      );
    }
    static ensureBackground() {
      if (this.root?.isConnected) return;
      (this.videoCleanupTimer !== null &&
        (window.clearTimeout(this.videoCleanupTimer),
        (this.videoCleanupTimer = null)),
        this.videoLayers?.forEach((e) => this.resetVideo(e)),
        this.root?.remove(),
        (this.root = document.createElement(`div`)),
        (this.root.id = `luminous-dynamic-background`),
        this.root.setAttribute(`aria-hidden`, `true`),
        Object.assign(this.root.style, {
          position: `fixed`,
          inset: `0`,
          zIndex: `0`,
          overflow: `hidden`,
          pointerEvents: `none`,
        }),
        (this.base = document.createElement(`div`)),
        (this.base.className = `luminous-base`),
        Object.assign(this.base.style, {
          position: `absolute`,
          inset: `0`,
          background: `var(--spice-sidebar)`,
          transition: `opacity ${this.TRANSITION_MS}ms linear`,
          opacity: `1`,
        }));
      let e = this.createImageLayer(),
        t = this.createImageLayer(),
        n = this.createVideoLayer(),
        r = this.createVideoLayer();
      (this.root.append(this.base, e, t, n, r),
        (this.imageLayers = [e, t]),
        (this.videoLayers = [n, r]),
        (this.activeImage = 0),
        (this.activeVideo = 0),
        (this.currentType = `none`),
        (this.currentCanvasSource = null),
        document.body.prepend(this.root));
    }
    static render(e) {
      if ((this.ensureBackground(), !e || (!e.image && !e.canvas))) {
        (this.clear(),
          Luminous.Logger.info(`Background`, `Rendering default layer`));
        return;
      }
      if (!(e.canvas && this.renderCanvas(e.canvas, e.image))) {
        if (e.image) {
          this.renderImage(e.image);
          return;
        }
        this.clear();
      }
    }
    static preloadImage(e) {
      if (!e || this.preloadedImages.has(e)) return;
      let t = new Image();
      ((t.decoding = `async`),
        (t.src = e),
        this.preloadedImages.set(e, t),
        this.trimPreloadedImages());
    }
    static renderImage(e) {
      if (
        (this.ensureBackground(),
        this.videoRenderId++,
        (this.currentCanvasSource = null),
        !this.imageLayers)
      ) {
        Luminous.Logger.warn(`Background`, `No image layers for render`);
        return;
      }
      if (!e) {
        (Luminous.Logger.warn(`Background`, `No image src for render`),
          this.clear());
        return;
      }
      let t = ++this.imageRenderId,
        n = +(this.activeImage === 0),
        r = this.imageLayers[this.activeImage],
        i = this.imageLayers[n];
      if (r.src === e && r.complete && r.naturalWidth > 0) {
        this.transitionTo(`image`, r);
        return;
      }
      let a = this.getPreloadedImage(e),
        o = () => {
          t === this.imageRenderId &&
            ((i.src = e),
            requestAnimationFrame(() => {
              t === this.imageRenderId &&
                ((this.activeImage = n),
                this.transitionTo(`image`, i),
                Luminous.Logger.info(`Background`, `Rendering image layer`, e));
            }));
        };
      if (a.complete && a.naturalWidth > 0) {
        o();
        return;
      }
      (a.addEventListener(`load`, o, { once: !0 }),
        a.addEventListener(
          `error`,
          () => {
            if (t === this.imageRenderId) {
              if (
                (Luminous.Logger.warn(`Background`, `Failed to load image`, e),
                this.currentType === `image` &&
                  r.complete &&
                  r.naturalWidth > 0)
              ) {
                this.transitionTo(`image`, r);
                return;
              }
              this.clear();
            }
          },
          { once: !0 },
        ));
    }
    static getPreloadedImage(e) {
      let t = this.preloadedImages.get(e);
      return (
        t?.complete &&
          t.naturalWidth === 0 &&
          (this.preloadedImages.delete(e), (t = void 0)),
        t ||
          ((t = new Image()),
          (t.decoding = `async`),
          (t.src = e),
          this.preloadedImages.set(e, t),
          this.trimPreloadedImages()),
        t
      );
    }
    static trimPreloadedImages() {
      for (; this.preloadedImages.size > this.MAX_PRELOADED_IMAGES;) {
        let e = this.preloadedImages.keys().next().value;
        if (!e) return;
        this.preloadedImages.delete(e);
      }
    }
    static renderCanvas(e, t) {
      if ((this.ensureBackground(), !this.videoLayers))
        return (
          Luminous.Logger.warn(`Background`, `No video layers for render`),
          !1
        );
      if (
        this.currentType === `canvas` &&
        this.currentCanvasSource === e &&
        this.get()?.isConnected
      )
        return !0;
      this.imageRenderId++;
      let n = e.captureStream,
        r;
      try {
        r = n?.call(e);
      } catch (e) {
        return (
          Luminous.Logger.warn(
            `Background`,
            `Failed to capture Canvas stream`,
            e,
          ),
          !1
        );
      }
      if (!r)
        return (
          Luminous.Logger.warn(`Background`, `Canvas capture is not available`),
          !1
        );
      let i = +(this.activeVideo === 0),
        a = this.videoLayers[i],
        o = ++this.videoRenderId;
      return (
        this.resetVideo(a),
        (a.style.opacity = `0`),
        (a.srcObject = r),
        (a.onplaying = () => {
          if (o !== this.videoRenderId) {
            this.resetVideo(a);
            return;
          }
          ((a.onplaying = null),
            requestAnimationFrame(() => {
              if (o !== this.videoRenderId) {
                this.resetVideo(a);
                return;
              }
              ((this.activeVideo = i),
                (this.currentCanvasSource = e),
                this.transitionTo(`canvas`, a),
                Luminous.Logger.info(
                  `Background`,
                  `Rendering canvas layer`,
                  e,
                ));
            }));
        }),
        a.play().catch((e) => {
          (this.resetVideo(a),
            o === this.videoRenderId &&
              (Luminous.Logger.warn(
                `Background`,
                `Failed to play canvas stream`,
                e,
              ),
              t ? this.renderImage(t) : this.clear()));
        }),
        !0
      );
    }
    static destroy() {
      (this.imageRenderId++,
        this.videoRenderId++,
        (this.currentCanvasSource = null),
        this.videoCleanupTimer !== null &&
          (window.clearTimeout(this.videoCleanupTimer),
          (this.videoCleanupTimer = null)),
        this.videoLayers?.forEach((e) => this.resetVideo(e)),
        this.root?.remove(),
        (this.root = null),
        (this.base = null),
        (this.imageLayers = null),
        (this.videoLayers = null),
        (this.activeImage = 0),
        (this.activeVideo = 0),
        (this.currentType = `none`),
        this.emit(`change`));
    }
    static clear() {
      (this.imageRenderId++,
        this.videoRenderId++,
        (this.currentCanvasSource = null),
        this.transitionTo(`none`));
    }
    static transitionTo(e, t = null) {
      !this.imageLayers ||
        !this.videoLayers ||
        ((this.currentType = e),
        this.base && (this.base.style.opacity = e === `none` ? `1` : `0`),
        this.imageLayers.forEach((n) => {
          n.style.opacity = e === `image` && n === t ? `1` : `0`;
        }),
        this.videoLayers.forEach((n) => {
          n.style.opacity = e === `canvas` && n === t ? `1` : `0`;
        }),
        this.scheduleVideoCleanup(e === `canvas` ? t : null),
        this.emit(`change`));
    }
    static scheduleVideoCleanup(e) {
      (this.videoCleanupTimer !== null &&
        window.clearTimeout(this.videoCleanupTimer),
        (this.videoCleanupTimer = window.setTimeout(() => {
          ((this.videoCleanupTimer = null),
            this.videoLayers?.forEach((t) => {
              t !== e && this.resetVideo(t);
            }));
        }, this.TRANSITION_MS)));
    }
    static resetVideo(e) {
      ((e.onplaying = null), e.pause());
      let t = e.srcObject;
      (t instanceof MediaStream && t.getTracks().forEach((e) => e.stop()),
        (e.srcObject = null),
        e.removeAttribute(`src`),
        e.load());
    }
  },
  t = class {
    static NPV_VIDEO_SELECTOR = `.canvasVideoContainerNPV video`;
    static CINEMA_VIDEO_SELECTOR = `.Root__top-container:has(#VideoPlayerCinema_ReactPortal) video`;
    static listeners = new Map();
    static observer = null;
    static checkFrame = null;
    static currentVideo = null;
    static currentMode = null;
    static initialized = !1;
    static createPayload(e, t) {
      return { video: e, mode: t };
    }
    static addEventListener(e, t) {
      (this.getListeners(e).add(t),
        (e === `mount` || e === `change`) &&
          this.currentVideo &&
          this.currentMode &&
          this.callListener(
            t,
            this.createPayload(this.currentVideo, this.currentMode),
          ),
        this.initialized || this.init());
    }
    static removeEventListener(e, t) {
      this.listeners.get(e)?.delete(t);
    }
    static get() {
      return this.createPayload(this.currentVideo, this.currentMode);
    }
    static getVideo() {
      return this.currentVideo;
    }
    static init() {
      this.initialized ||
        ((this.initialized = !0),
        (this.observer = new MutationObserver(() => this.scheduleCheck())),
        this.observer.observe(document.documentElement, {
          childList: !0,
          subtree: !0,
        }),
        this.check());
    }
    static scheduleCheck() {
      this.checkFrame === null &&
        (this.checkFrame = requestAnimationFrame(() => {
          ((this.checkFrame = null), this.check());
        }));
    }
    static detect() {
      let e = document.querySelector(this.NPV_VIDEO_SELECTOR);
      if (e) return this.createPayload(e, `npv`);
      let t = document.querySelector(this.CINEMA_VIDEO_SELECTOR);
      return t
        ? this.createPayload(t, `cinema`)
        : this.createPayload(null, null);
    }
    static check() {
      let { video: e, mode: t } = this.detect(),
        n = this.currentVideo,
        r = this.currentMode;
      if (n === e && r === t) return;
      if (((this.currentVideo = e), (this.currentMode = t), n && !e)) {
        let e = this.createPayload(null, r);
        (Luminous.Logger.info(`Canvas`, `Unmounted`, e),
          this.emit(`unmount`, e));
        return;
      }
      if (!n && e) {
        let n = this.createPayload(e, t);
        (Luminous.Logger.info(`Canvas`, `Mounted`, n), this.emit(`mount`, n));
        return;
      }
      let i = this.createPayload(e, t);
      (Luminous.Logger.info(`Canvas`, `Changed`, i), this.emit(`change`, i));
    }
    static emit(e, t) {
      this.getListeners(e).forEach((e) => {
        this.callListener(e, t);
      });
    }
    static callListener(e, t) {
      try {
        e(t);
      } catch (e) {
        Luminous.Logger.error(`Canvas`, `Listener failed`, e);
      }
    }
    static getListeners(e) {
      let t = this.listeners.get(e);
      return (t || ((t = new Set()), this.listeners.set(e, t)), t);
    }
  },
  n = class {
    static disabledLevels = new Set();
    static disabledChannels = new Set();
    static levelStyles = {
      INFO: `color:#ccc`,
      WARN: `color:#facc15`,
      ERROR: `color:#ef4444`,
    };
    static channelStyles = {
      Main: `color:#68c4e8`,
      Background: `color:#60a5fa`,
      Canvas: `color:#a78bfa`,
      Song: `color:#34d399`,
    };
    static baseStyle = `color:#888`;
    static getTime() {
      return new Date().toLocaleTimeString(`en-GB`, { hour12: !1 });
    }
    static shouldLog(e, t) {
      return !this.disabledLevels.has(e) && !this.disabledChannels.has(t);
    }
    static format(e) {
      return `Luminous/${e}`;
    }
    static log(e, t, ...n) {
      this.shouldLog(e, t) &&
        console.log(
          `%c[${this.getTime()}] %c[${e}] %c[${this.format(t)}]`,
          this.baseStyle,
          this.levelStyles[e],
          this.channelStyles[t],
          ...n,
        );
    }
    static info(e, ...t) {
      this.log(`INFO`, e, ...t);
    }
    static warn(e, ...t) {
      this.log(`WARN`, e, ...t);
    }
    static error(e, ...t) {
      this.log(`ERROR`, e, ...t);
    }
    static enableLevel(e) {
      this.disabledLevels.delete(e);
    }
    static disableLevel(e) {
      this.disabledLevels.add(e);
    }
    static enableChannel(e) {
      this.disabledChannels.delete(e);
    }
    static disableChannel(e) {
      this.disabledChannels.add(e);
    }
    static printBanner() {
      (console.log(
        `%c Luminous v2.1.0 %c by streetraceing `,
        `background:#1DB954;color:#000;padding:6px 12px;border-radius:8px 0 0 8px;font-weight:600;`,
        `background:#181818;color:#1DB954;padding:6px 12px;border-radius:0 8px 8px 0;font-weight:500;`,
      ),
        console.log(
          `%c build: 26/07/2026 02:13:06 UTC+03:00 `,
          `color:#888;font-size:12px;`,
        ));
    }
  },
  r = class {
    static isDesktop() {
      return !!Spicetify.Platform?.NativeAPI;
    }
    static canFocus() {
      return (
        Spicetify.Platform?.FocusMainWindowAPI?.canFocusMainWindow?.() ?? !1
      );
    }
    static focus() {
      this.canFocus() &&
        Spicetify.Platform.FocusMainWindowAPI.focusMainWindow();
    }
    static getZoomCapabilities() {
      return (
        Spicetify.Platform?.ZoomAPI?.getCapabilities?.() ?? {
          canGetZoomLevel: !1,
          canSetZoomLevel: !1,
          canZoomIn: !1,
          canZoomOut: !1,
        }
      );
    }
    static async getZoomLevel() {
      try {
        return await Spicetify.Platform.ZoomAPI.getZoomLevel();
      } catch {
        return null;
      }
    }
    static async setZoomLevel(e) {
      this.getZoomCapabilities().canSetZoomLevel &&
        (await Spicetify.Platform.ZoomAPI.setZoomLevel(e));
    }
    static zoomIn() {
      this.getZoomCapabilities().canZoomIn &&
        Spicetify.Platform.ZoomAPI.zoomIn();
    }
    static zoomOut() {
      this.getZoomCapabilities().canZoomOut &&
        Spicetify.Platform.ZoomAPI.zoomOut();
    }
    static setWindowButtonsVisible(e) {
      Spicetify.Platform?.NativeAPI?.setWindowButtonsVisibility?.(e);
    }
    static setFullscreen(e) {
      e
        ? document.documentElement.requestFullscreen()
        : document.exitFullscreen();
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
    static showToast(e, t) {
      Spicetify.Platform?.OSNotificationsAPI?.showToast?.(e, t);
    }
    static async getLogFolder() {
      try {
        return await Spicetify.Platform.DesktopLogsAPI.getLogFolder();
      } catch {
        return null;
      }
    }
    static async getVersionInfo() {
      try {
        return await Spicetify.Platform.UpdateAPI.getVersionInfo();
      } catch {
        return null;
      }
    }
  },
  i = class {
    static STORAGE_KEY = `luminous-settings`;
    static registry = new Map();
    static values = new Map();
    static listeners = new Map();
    static savedValues = new Map();
    static initialized = !1;
    static init() {
      if (this.initialized) return;
      this.initialized = !0;
      let e = this.readSavedValues();
      (Object.entries(e).forEach(([e, t]) => {
        this.savedValues.set(e, t);
      }),
        this.registry.forEach((e, t) => {
          let n = this.normalizeValue(e, this.savedValues.get(t));
          (this.values.set(t, n),
            this.savedValues.set(t, n),
            this.apply(t, e, n));
        }),
        this.persist());
    }
    static register(e, t) {
      if ((this.registry.set(e, t), !this.initialized)) return;
      let n = this.normalizeValue(
        t,
        this.values.get(e) ?? this.savedValues.get(e),
      );
      (this.values.set(e, n),
        this.savedValues.set(e, n),
        this.apply(e, t, n),
        this.persist());
    }
    static get(e) {
      return this.values.get(e);
    }
    static set(e, t) {
      let n = this.registry.get(e);
      if (!n) {
        Luminous.Logger.warn(`Main`, `Unknown setting: ${e}`);
        return;
      }
      let r = this.normalizeValue(n, t);
      (this.values.set(e, r),
        this.savedValues.set(e, r),
        this.apply(e, n, r),
        this.emit(e, r),
        this.persist());
    }
    static reset(e) {
      let t = this.registry.get(e);
      t && this.set(e, t.default);
    }
    static resetMany(e) {
      (e.forEach((e) => {
        let t = this.registry.get(e);
        if (!t) return;
        let n = this.normalizeValue(t, t.default);
        (this.values.set(e, n),
          this.savedValues.set(e, n),
          this.apply(e, t, n),
          this.emit(e, n));
      }),
        this.persist());
    }
    static subscribe(e, t, n = {}) {
      return (
        this.getListeners(e).add(t),
        n.immediate &&
          this.values.has(e) &&
          this.callListener(e, t, this.values.get(e)),
        () => {
          this.listeners.get(e)?.delete(t);
        }
      );
    }
    static readSavedValues() {
      try {
        let e = Spicetify.LocalStorage.get(this.STORAGE_KEY);
        if (!e) return {};
        let t = JSON.parse(e);
        if (typeof t == `object` && t && !Array.isArray(t)) return t;
      } catch (e) {
        Luminous.Logger.warn(`Main`, `Failed to read saved settings`, e);
      }
      return {};
    }
    static normalizeValue(e, t) {
      let n = t;
      if (e.normalize)
        try {
          n = e.normalize(t);
        } catch (t) {
          return (
            Luminous.Logger.warn(
              `Main`,
              `Failed to normalize setting value`,
              t,
            ),
            e.default
          );
        }
      return typeof n == typeof e.default &&
        (typeof n != `number` || Number.isFinite(n))
        ? n
        : (Luminous.Logger.warn(`Main`, `Invalid setting value, using default`),
          e.default);
    }
    static apply(e, t, n) {
      try {
        t.apply?.(n);
      } catch (t) {
        Luminous.Logger.error(`Main`, `Failed to apply setting: ${e}`, t);
      }
    }
    static persist() {
      let e = {};
      (this.savedValues.forEach((t, n) => {
        (typeof t == `string` ||
          typeof t == `boolean` ||
          (typeof t == `number` && Number.isFinite(t))) &&
          (e[n] = t);
      }),
        this.registry.forEach((t, n) => {
          let r = this.values.get(n);
          r !== void 0 && (e[n] = r);
        }));
      try {
        Spicetify.LocalStorage.set(this.STORAGE_KEY, JSON.stringify(e));
      } catch (e) {
        Luminous.Logger.error(`Main`, `Failed to persist settings`, e);
      }
    }
    static getVar(e) {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(e)
        .trim();
    }
    static setVar(e, t) {
      document.documentElement.style.setProperty(e, t);
    }
    static removeVar(e) {
      document.documentElement.style.removeProperty(e);
    }
    static toggleClass(e, t) {
      document.documentElement.classList.toggle(e, t);
    }
    static hasClass(e) {
      return document.documentElement.classList.contains(e);
    }
    static emit(e, t) {
      this.listeners.get(e)?.forEach((n) => {
        this.callListener(e, n, t);
      });
    }
    static callListener(e, t, n) {
      try {
        t(n, e);
      } catch (t) {
        Luminous.Logger.error(`Main`, `Setting listener failed: ${e}`, t);
      }
    }
    static getListeners(e) {
      let t = this.listeners.get(e);
      return (t || ((t = new Set()), this.listeners.set(e, t)), t);
    }
  },
  a = class {
    static PLAYER_TIMEOUT_MESSAGE = `Spicetify Player not available`;
    static INITIAL_TRACK_SYNC_INTERVAL = 100;
    static current = null;
    static listeners = new Map();
    static ready = !1;
    static eventsBound = !1;
    static initPromise = null;
    static initialTrackTimer = null;
    static readyPromise;
    static readyResolve;
    static {
      this.readyPromise = new Promise((e) => {
        this.readyResolve = e;
      });
    }
    static init(e = 15e3) {
      return this.eventsBound
        ? Promise.resolve()
        : ((this.initPromise ||= this.initialize(e).finally(() => {
            this.initPromise = null;
          })),
          this.initPromise);
    }
    static async initialize(e) {
      (await this.waitForPlayer(e),
        this.bindEvents(),
        this.syncCurrentTrack() || this.startInitialTrackSync(e));
    }
    static waitForPlayer(e) {
      return new Promise((t, n) => {
        let r = Date.now(),
          i = () => {
            if (
              typeof Spicetify < `u` &&
              typeof Spicetify.Player?.addEventListener == `function`
            ) {
              t();
              return;
            }
            if (Date.now() - r > e) {
              n(Error(this.PLAYER_TIMEOUT_MESSAGE));
              return;
            }
            requestAnimationFrame(i);
          };
        i();
      });
    }
    static bindEvents() {
      this.eventsBound ||
        ((this.eventsBound = !0),
        Spicetify.Player.addEventListener(`songchange`, (e) => {
          this.handleTrack(
            e?.data?.item ?? Spicetify.Player.data?.item ?? null,
          );
        }));
    }
    static syncCurrentTrack() {
      let e = Spicetify.Player.data?.item ?? null;
      return (this.handleTrack(e), e !== null);
    }
    static startInitialTrackSync(e) {
      if (this.initialTrackTimer !== null || this.ready) return;
      let t = Date.now() + e,
        n = () => {
          ((this.initialTrackTimer = null),
            !(this.ready || this.syncCurrentTrack()) &&
              (Date.now() >= t ||
                (this.initialTrackTimer = window.setTimeout(
                  n,
                  this.INITIAL_TRACK_SYNC_INTERVAL,
                ))));
        };
      n();
    }
    static addEventListener(e, t) {
      (this.getListeners(e).add(t),
        !this.eventsBound &&
          !this.initPromise &&
          this.init().catch((e) => {
            Luminous.Logger.error(`Song`, `Initialization retry failed`, e);
          }),
        e === `ready` &&
          this.ready &&
          this.current &&
          this.callListener(t, this.createPayload(this.current)),
        e === `change` &&
          this.current &&
          this.callListener(t, this.createPayload(this.current)));
    }
    static removeEventListener(e, t) {
      this.listeners.get(e)?.delete(t);
    }
    static async get(e = 15e3) {
      let t = Date.now();
      if (!this.eventsBound)
        try {
          await this.init(e);
        } catch {
          return null;
        }
      if (!this.ready) {
        let n = Math.max(0, e - (Date.now() - t));
        if (!(await this.waitForReady(n))) return null;
      }
      return this.current ? this.createPayload(this.current) : null;
    }
    static waitForReady(e) {
      return this.ready
        ? Promise.resolve(!0)
        : e <= 0
          ? Promise.resolve(!1)
          : new Promise((t) => {
              let n = window.setTimeout(() => t(!1), e);
              this.readyPromise.then(() => {
                (window.clearTimeout(n), t(!0));
              });
            });
    }
    static getSync() {
      return this.current ? this.createPayload(this.current) : null;
    }
    static handleTrack(e) {
      if (!(!e || this.current?.uri === e.uri)) {
        if (
          (this.initialTrackTimer !== null &&
            (window.clearTimeout(this.initialTrackTimer),
            (this.initialTrackTimer = null)),
          (this.current = e),
          !this.ready)
        ) {
          ((this.ready = !0),
            this.readyResolve(),
            Luminous.Logger.info(`Song`, `Ready, current is`, e),
            this.emit(`ready`));
          return;
        }
        (Luminous.Logger.info(`Song`, `Changed to`, e), this.emit(`change`));
      }
    }
    static createPayload(e) {
      let t = e.artists?.map((e) => e.name) ?? [],
        n =
          e.images?.[0]?.url ??
          e.album?.images?.[0]?.url ??
          e.metadata?.image_url ??
          null;
      return {
        track: e,
        name: e.name,
        title: t.length ? `${e.name} - ${t.join(`, `)}` : e.name,
        artists: t,
        image: n,
        uri: e.uri,
      };
    }
    static emit(e) {
      if (!this.current) return;
      let t = this.createPayload(this.current);
      this.getListeners(e).forEach((e) => {
        this.callListener(e, t);
      });
    }
    static callListener(e, t) {
      try {
        e(t);
      } catch (e) {
        Luminous.Logger.error(`Song`, `Listener failed`, e);
      }
    }
    static getListeners(e) {
      let t = this.listeners.get(e);
      return (t || ((t = new Set()), this.listeners.set(e, t)), t);
    }
  };
function o() {
  Object.defineProperty(window, 'Luminous', {
    value: {
      Background: e,
      Canvas: t,
      Song: a,
      Native: r,
      Settings: i,
      Logger: n,
      version: `2.1.0`,
    },
    configurable: !0,
  });
}
function s() {
  return Spicetify.React;
}
function c() {
  return s().useEffect;
}
function l() {
  return s().useMemo;
}
function u() {
  return s().useRef;
}
function d() {
  return s().useState;
}
var f = { status: `booting`, brokenSince: null },
  p = new Set();
function m() {
  return f;
}
function h(e) {
  let t = { ...f, ...e };
  (t.status === f.status && t.brokenSince === f.brokenSince) ||
    ((f = t), p.forEach((e) => _(e)));
}
function g(e) {
  return (
    p.add(e),
    _(e),
    () => {
      p.delete(e);
    }
  );
}
function _(e) {
  try {
    e(f);
  } catch (e) {
    n.error(`Main`, `UI health listener failed`, e);
  }
}
function v() {
  let e = c(),
    t = l(),
    n = d(),
    [r, i] = n(() => Luminous.Song.getSync()),
    [a, o] = n(() => Luminous.Canvas.getVideo()),
    [s, u] = n(() => Luminous.Settings.get(`dynamicBackground`) !== !1),
    [f, p] = n(() => m().status !== `booting`),
    h = t(
      () =>
        f
          ? s
            ? a
              ? `canvas:${a.currentSrc}:${r?.image ?? ``}`
              : r?.image
                ? `image:${r.image}`
                : `empty`
            : `disabled`
          : `inactive`,
      [f, a, s, r?.image],
    );
  return (
    e(() => {
      let e = (e) => {
          (i(e), Luminous.Background.preloadImage(e.image));
        },
        t = (e) => {
          o(e.video);
        },
        n = () => {
          o(null);
        };
      (Luminous.Song.addEventListener(`ready`, e),
        Luminous.Song.addEventListener(`change`, e),
        Luminous.Canvas.addEventListener(`mount`, t),
        Luminous.Canvas.addEventListener(`change`, t),
        Luminous.Canvas.addEventListener(`unmount`, n));
      let r = g((e) => {
          p(e.status !== `booting`);
        }),
        a = Luminous.Settings.subscribe(
          `dynamicBackground`,
          (e) => u(e !== !1),
          { immediate: !0 },
        ),
        s = Luminous.Song.getSync();
      return (
        s && e(s),
        () => {
          (Luminous.Song.removeEventListener(`ready`, e),
            Luminous.Song.removeEventListener(`change`, e),
            Luminous.Canvas.removeEventListener(`mount`, t),
            Luminous.Canvas.removeEventListener(`change`, t),
            Luminous.Canvas.removeEventListener(`unmount`, n),
            r(),
            a(),
            Luminous.Background.destroy());
        }
      );
    }, []),
    e(() => {
      if (!f) {
        Luminous.Background.destroy();
        return;
      }
      if (!s) {
        Luminous.Background.clear();
        return;
      }
      if (a) {
        Luminous.Background.render({ canvas: a, image: r?.image });
        return;
      }
      if (r?.image) {
        Luminous.Background.render({ image: r.image });
        return;
      }
      Luminous.Background.render();
    }, [h]),
    null
  );
}
var y = 600,
  b = 2600,
  x = 1500,
  S = `.Root__top-container #main-view`,
  C = Date.now();
function w() {
  let e = s(),
    t = c(),
    n = l(),
    r = u(),
    i = d(),
    [a, o] = i(() => T()),
    [f, p] = i(!0),
    [h, _] = i(() => m()),
    [v, S] = i(() => Date.now()),
    w = r(a ? C : null),
    D = r(!1);
  (t(() => g(_), []),
    t(() => {
      let e = null,
        t = () => {
          ((e = null), o(T()));
        },
        n = new MutationObserver(() => {
          e === null && (e = requestAnimationFrame(t));
        });
      return (
        n.observe(document.documentElement, { childList: !0, subtree: !0 }),
        t(),
        () => {
          (n.disconnect(), e !== null && cancelAnimationFrame(e));
        }
      );
    }, []),
    t(() => {
      if (!a || D.current) return;
      w.current === null && (w.current = Date.now());
      let e = Date.now() - w.current,
        t = h.status === `ready` ? y : b,
        n = Math.max(0, t - e),
        r = window.setTimeout(() => {
          ((D.current = !0), p(!1));
        }, n);
      return () => window.clearTimeout(r);
    }, [h.status, a]),
    t(() => {
      if (!a || !f || h.status !== `waiting`) return;
      let e = window.setInterval(() => {
        S(Date.now());
      }, 250);
      return () => window.clearInterval(e);
    }, [h.status, a, f]));
  let O = n(
      () =>
        h.status === `waiting` && h.brokenSince
          ? `Waiting for Spotify UI... (${E(v - h.brokenSince)})`
          : h.status === `ready`
            ? `Welcome back. Lighting up Spotify...`
            : `Starting Luminous...`,
      [h.brokenSince, h.status, v],
    ),
    k =
      h.status === `waiting` &&
      h.brokenSince !== null &&
      v - h.brokenSince >= x;
  return a
    ? e.createElement(
        `div`,
        {
          className: `luminous-splash${f ? `` : ` luminous-splash--hidden`}`,
          'aria-hidden': f ? `false` : `true`,
        },
        e.createElement(
          `div`,
          { className: `luminous-splash__panel` },
          e.createElement(
            `div`,
            { className: `luminous-splash__mark` },
            e.createElement(`svg`, {
              className: `luminous-splash__luminous-icon`,
              viewBox: `0 0 16 16`,
              'aria-hidden': `true`,
              focusable: `false`,
              dangerouslySetInnerHTML: {
                __html: Spicetify.SVGIcons?.brightness ?? ``,
              },
            }),
          ),
          e.createElement(
            `div`,
            { className: `luminous-splash__copy` },
            e.createElement(`span`, null, `Luminous`),
            e.createElement(`small`, null, O),
          ),
          e.createElement(
            `div`,
            { className: `luminous-splash__loader` },
            e.createElement(`span`),
          ),
          k &&
            e.createElement(
              `div`,
              { className: `luminous-splash__hint` },
              `Spotify is taking longer than expected. The splash will close automatically.`,
            ),
        ),
      )
    : null;
}
function T() {
  return document.querySelector(S) !== null;
}
function E(e) {
  return `${Math.max(0, Math.floor(e / 1e3))}s`;
}
var D = `Luminous settings`,
  O = `brightness`,
  k = [
    {
      key: `backgroundBlur`,
      label: `Background blur`,
      description: `Softens album art and canvas motion.`,
      min: 0,
      max: 48,
      step: 1,
      unit: `px`,
      fallback: 24,
    },
    {
      key: `backgroundBrightness`,
      label: `Background brightness`,
      description: `Controls the ambient backdrop intensity.`,
      min: 30,
      max: 120,
      step: 1,
      unit: `%`,
      fallback: 75,
    },
    {
      key: `uiOpacity`,
      label: `UI opacity`,
      description: `Adjusts the glass surface strength.`,
      min: 0,
      max: 100,
      step: 1,
      unit: `%`,
      fallback: 50,
    },
  ],
  A = [`dynamicBackground`, ...k.map((e) => e.key)];
function j() {
  let e = s(),
    t = c(),
    n = u(),
    r = d(),
    i = n(null),
    a = n(null),
    [o, l] = r(!1);
  return (
    t(() => {
      let e = !1,
        t = null,
        n = () => {
          if (((t = null), e)) return;
          if (!Spicetify.Topbar?.Button) {
            t = window.setTimeout(n, 250);
            return;
          }
          let r = new Spicetify.Topbar.Button(D, O, () => l((e) => !e), !1, !0);
          (r.element.classList.add(`luminous-theme-menu-button`),
            (i.current = r));
        };
      return (
        n(),
        () => {
          ((e = !0),
            t !== null && window.clearTimeout(t),
            i.current?.element.remove(),
            (i.current = null));
        }
      );
    }, []),
    t(() => {
      if (!o) return;
      let e = (e) => {
          let t = e.composedPath(),
            n = i.current?.element,
            r = a.current;
          (n && t.includes(n)) || (r && t.includes(r)) || l(!1);
        },
        t = (e) => {
          e.key === `Escape` && l(!1);
        };
      return (
        document.addEventListener(`pointerdown`, e, !0),
        document.addEventListener(`click`, e, !0),
        document.addEventListener(`keydown`, t, !0),
        () => {
          (document.removeEventListener(`pointerdown`, e, !0),
            document.removeEventListener(`click`, e, !0),
            document.removeEventListener(`keydown`, t, !0));
        }
      );
    }, [o]),
    o
      ? e.createElement(M, {
          anchor: i.current?.element ?? null,
          menuRef: a,
          onClose: () => l(!1),
        })
      : null
  );
}
function M({ anchor: e, menuRef: t, onClose: n }) {
  let r = s(),
    i = c(),
    a = d(),
    [o, l] = a(() => F(e)),
    [u, f] = a(() => Luminous.Settings.get(`dynamicBackground`) !== !1);
  return (
    i(() => {
      let t = () => l(F(e));
      return (
        t(),
        window.addEventListener(`resize`, t),
        window.addEventListener(`scroll`, t, !0),
        () => {
          (window.removeEventListener(`resize`, t),
            window.removeEventListener(`scroll`, t, !0));
        }
      );
    }, [e]),
    i(
      () =>
        Luminous.Settings.subscribe(`dynamicBackground`, (e) => f(e !== !1), {
          immediate: !0,
        }),
      [],
    ),
    r.createElement(
      `div`,
      {
        ref: t,
        className: `luminous-theme-menu`,
        style: { top: `${o.top}px`, right: `${o.right}px` },
        role: `dialog`,
        'aria-label': `Luminous settings`,
      },
      r.createElement(
        `div`,
        { className: `luminous-theme-menu__header` },
        r.createElement(
          `div`,
          { className: `luminous-theme-menu__mark` },
          r.createElement(`svg`, {
            className: `luminous-theme-menu__luminous-icon`,
            viewBox: `0 0 16 16`,
            'aria-hidden': `true`,
            focusable: `false`,
            dangerouslySetInnerHTML: { __html: Spicetify.SVGIcons.brightness },
          }),
        ),
        r.createElement(
          `div`,
          { className: `luminous-theme-menu__title` },
          r.createElement(`span`, null, `Luminous`),
          r.createElement(`small`, null, `Theme settings`),
        ),
        r.createElement(
          `button`,
          {
            className: `luminous-theme-menu__reset-button`,
            type: `button`,
            onClick: () => Luminous.Settings.resetMany(A),
          },
          `Reset`,
        ),
        r.createElement(
          `button`,
          {
            className: `luminous-theme-menu__icon-button`,
            type: `button`,
            'aria-label': `Close`,
            onClick: n,
          },
          r.createElement(`svg`, {
            className: `luminous-theme-menu__close-icon`,
            dangerouslySetInnerHTML: { __html: Spicetify.SVGIcons.x },
          }),
        ),
      ),
      r.createElement(
        `div`,
        { className: `luminous-theme-menu__section` },
        r.createElement(
          `div`,
          { className: `luminous-theme-menu__section-header` },
          `Appearance`,
        ),
        r.createElement(N, {
          label: `Dynamic background`,
          description: `Use the current cover or Spotify Canvas as backdrop.`,
          checked: u,
          onChange: (e) => Luminous.Settings.set(`dynamicBackground`, e),
        }),
        k.map((e) => r.createElement(P, { key: e.key, setting: e })),
      ),
    )
  );
}
function N({ label: e, description: t, checked: n, onChange: r }) {
  let i = s();
  return i.createElement(
    `label`,
    { className: `luminous-theme-menu__row luminous-theme-menu__toggle` },
    i.createElement(
      `span`,
      { className: `luminous-theme-menu__copy` },
      i.createElement(`span`, null, e),
      i.createElement(`small`, null, t),
    ),
    i.createElement(
      `span`,
      { className: `luminous-theme-menu__switch` },
      i.createElement(`input`, {
        type: `checkbox`,
        checked: n,
        onChange: (e) => r(e.currentTarget.checked),
      }),
      i.createElement(`span`),
    ),
  );
}
function P({ setting: e }) {
  let t = s(),
    n = c(),
    [r, i] = d()(() => I(e));
  return (
    n(
      () =>
        Luminous.Settings.subscribe(e.key, (e) => i(Number(e)), {
          immediate: !0,
        }),
      [e.key],
    ),
    t.createElement(
      `label`,
      { className: `luminous-theme-menu__row luminous-theme-menu__range` },
      t.createElement(
        `span`,
        { className: `luminous-theme-menu__range-header` },
        t.createElement(
          `span`,
          { className: `luminous-theme-menu__copy` },
          t.createElement(`span`, null, e.label),
          t.createElement(`small`, null, e.description),
        ),
        t.createElement(
          `strong`,
          null,
          e.unit === `%` || e.unit === `px` ? `${r}${e.unit}` : r,
        ),
      ),
      t.createElement(
        `span`,
        { className: `luminous-theme-menu__range-control` },
        t.createElement(`input`, {
          type: `range`,
          min: e.min,
          max: e.max,
          step: e.step,
          value: r,
          onChange: (t) =>
            Luminous.Settings.set(e.key, Number(t.currentTarget.value)),
        }),
      ),
    )
  );
}
function F(e) {
  if (!e) return { top: 64, right: 16 };
  let t = e.getBoundingClientRect();
  return {
    top: Math.round(t.bottom + 8),
    right: Math.max(12, Math.round(window.innerWidth - t.right)),
  };
}
function I(e) {
  let t = Luminous.Settings.get(e.key),
    n = Number(t);
  return Number.isNaN(n) ? e.fallback : n;
}
var L = `luminous-playlist-background`,
  R = `--luminous-playlist-background-image`,
  z = `luminous-home-header-height`,
  B = `--luminous-home-header-height`,
  V = class {
    static playlistBackground(e) {
      let t = null,
        n = null,
        r = null,
        i = null,
        a = !1,
        o = null,
        s = null;
      function c() {
        s &&
          (s.classList.remove(L),
          s.style.removeProperty(R),
          (s = null),
          (o = null));
      }
      function l() {
        if (a) return;
        let e = document.querySelector(`.main-view-container`);
        (e === t && t?.isConnected) ||
          (r?.disconnect(),
          (r = null),
          c(),
          (t = e),
          t &&
            ((r = new MutationObserver(u)),
            r.observe(t, {
              subtree: !0,
              childList: !0,
              attributes: !0,
              attributeFilter: [`style`, `class`],
            })));
      }
      function u() {
        a ||
          i !== null ||
          (i = requestAnimationFrame(() => {
            ((i = null), l(), d());
          }));
      }
      function d() {
        if (!t) return;
        let n = t.querySelector(`.before-scroll-node > div > :first-child`),
          r =
            t.querySelector(
              `section > .main-entityHeader-container, section > div > .main-entityHeader-container`,
            ) || t.querySelector(`main > div > .main-entityHeader-container`);
        if (!n || !r) {
          c();
          return;
        }
        let i = getComputedStyle(n).backgroundImage;
        if (!i || i === `none`) {
          c();
          return;
        }
        (r !== s && (c(), (s = r)),
          i !== o &&
            ((o = i),
            r.classList.add(L),
            r.style.setProperty(R, i),
            e?.onBackgroundChange?.(i, n, r)));
      }
      return (
        (n = new MutationObserver(u)),
        n.observe(document.documentElement, { subtree: !0, childList: !0 }),
        u(),
        {
          disconnect() {
            ((a = !0),
              n?.disconnect(),
              r?.disconnect(),
              (n = null),
              (r = null),
              i !== null && (cancelAnimationFrame(i), (i = null)),
              c(),
              (t = null));
          },
        }
      );
    }
    static homeHeaderHeight(e) {
      let t = null,
        n = null,
        r = null,
        i = null,
        a = !1,
        o = null,
        s = null;
      function c() {
        s &&
          (s.classList.remove(z),
          s.style.removeProperty(B),
          (s = null),
          (o = null));
      }
      function l(e) {
        let t = getComputedStyle(e),
          n = Number.parseFloat(t.marginTop) || 0,
          r = Number.parseFloat(t.marginBottom) || 0;
        return e.offsetHeight + n + r;
      }
      function u() {
        if (a) return;
        let e = document.querySelector(`#main-view`);
        (e === t && t?.isConnected) ||
          (r?.disconnect(),
          (r = null),
          c(),
          (t = e),
          t &&
            ((r = new MutationObserver(d)),
            r.observe(t, {
              subtree: !0,
              childList: !0,
              attributes: !0,
              attributeFilter: [`style`, `class`],
            })));
      }
      function d() {
        a ||
          i !== null ||
          (i = requestAnimationFrame(() => {
            ((i = null), u(), f());
          }));
      }
      function f() {
        if (!t) return;
        let n = t.querySelector(`.main-home-homeHeader`),
          r = t.querySelector(`.main-home-filterChipsContainer`),
          i = t.querySelector(
            `section[data-testid="home-page"]:has(.view-homeShortcutsGrid-shortcuts) .main-home-content section:first-child`,
          );
        if (!n || !r || !i) {
          c();
          return;
        }
        let a = l(r) + l(i);
        (n !== s && (c(), (s = n)),
          a !== o &&
            ((o = a),
            n.classList.add(z),
            n.style.setProperty(B, `${a}px`),
            e?.onHeightChange?.(a, r, i, n)));
      }
      return (
        (n = new MutationObserver(d)),
        n.observe(document.documentElement, { subtree: !0, childList: !0 }),
        window.addEventListener(`resize`, d),
        d(),
        {
          disconnect() {
            ((a = !0),
              n?.disconnect(),
              r?.disconnect(),
              window.removeEventListener(`resize`, d),
              (n = null),
              (r = null),
              i !== null && (cancelAnimationFrame(i), (i = null)),
              c(),
              (t = null));
          },
        }
      );
    }
    static uiMountWatcher() {
      let e = null,
        t = null,
        r = !1,
        i = null;
      function a() {
        return (
          document.querySelector(`.Root__top-container #main-view`) !== null
        );
      }
      function o() {
        return !!(
          document.querySelector(`.Root__main-view`) ||
          document.querySelector(`.main-view-container`) ||
          document.querySelector(`[data-testid="main-view"]`)
        );
      }
      function s() {
        r ||
          t !== null ||
          (t = requestAnimationFrame(() => {
            ((t = null), c());
          }));
      }
      function c() {
        if (!a()) {
          ((i = null), h({ status: `booting`, brokenSince: null }));
          return;
        }
        if (o()) {
          ((i = null), h({ status: `ready`, brokenSince: null }));
          return;
        }
        (i === null &&
          ((i = Date.now()), n.info(`Main`, `Waiting for Spotify UI mount...`)),
          h({ status: `waiting`, brokenSince: i }));
      }
      return (
        (e = new MutationObserver(s)),
        e.observe(document.documentElement, { subtree: !0, childList: !0 }),
        s(),
        {
          disconnect() {
            ((r = !0),
              e?.disconnect(),
              (e = null),
              t !== null && (cancelAnimationFrame(t), (t = null)),
              (i = null),
              h({ status: `booting`, brokenSince: null }));
          },
        }
      );
    }
    static observeCinema() {
      let e = null;
      function t() {
        let e = document.documentElement;
        (e.removeAttribute(`data-transition`),
          [
            `data-right-sidebar-open-preenter`,
            `data-right-sidebar-open-preexit`,
            `data-right-sidebar-open-duringexit`,
            `data-right-sidebar-open-postexit`,
          ].forEach((t) => {
            e.removeAttribute(t);
          }));
      }
      return (
        (e = new MutationObserver(t)),
        e.observe(document.documentElement, {
          attributes: !0,
          attributeFilter: [
            `data-transition`,
            `data-right-sidebar-open-preenter`,
            `data-right-sidebar-open-duringenter`,
            `data-right-sidebar-open-postenter`,
            `data-right-sidebar-open-preexit`,
            `data-right-sidebar-open-duringexit`,
            `data-right-sidebar-open-postexit`,
          ],
        }),
        t(),
        {
          disconnect() {
            (e?.disconnect(), (e = null));
          },
        }
      );
    }
  };
function H() {
  return (
    c()(() => {
      let e = [
        V.uiMountWatcher(),
        V.observeCinema(),
        V.playlistBackground(),
        V.homeHeaderHeight(),
      ];
      return () => {
        e.forEach((e) => e.disconnect());
      };
    }, []),
    null
  );
}
function U() {
  let e = s();
  return e.createElement(
    e.Fragment,
    null,
    e.createElement(w),
    e.createElement(H),
    e.createElement(v),
    e.createElement(j),
  );
}
var W = `luminous-react-root`,
  G = 15e3,
  K = null;
function q() {
  Y()
    .then(J)
    .catch((e) => {
      Luminous.Logger.error(`Main`, e);
    });
}
function J() {
  let e = s(),
    { ReactDOM: t } = Spicetify,
    n = X(),
    r = e.createElement(U);
  if (t.createRoot) {
    let e = K ?? t.createRoot(n);
    ((K = e), e.render(r));
    return;
  }
  t.render(r, n);
}
function Y() {
  return new Promise((e, t) => {
    let n = Date.now(),
      r = () => {
        if (
          typeof Spicetify < `u` &&
          Spicetify.React &&
          Spicetify.ReactDOM &&
          document.body
        ) {
          e();
          return;
        }
        if (Date.now() - n > G) {
          t(Error(`Spicetify React runtime not available`));
          return;
        }
        requestAnimationFrame(r);
      };
    r();
  });
}
function X() {
  let e = document.getElementById(W);
  return (
    e ||
      ((e = document.createElement(`div`)),
      (e.id = W),
      (e.style.display = `contents`),
      document.body.appendChild(e)),
    e
  );
}
(o(), Luminous.Logger.printBanner());
var Z = (e, t, n) => (r) => {
  if (
    (typeof r != `number` && typeof r != `string`) ||
    (typeof r == `string` && r.trim() === ``)
  )
    return e;
  let i = typeof r == `number` ? r : Number(r);
  return Number.isFinite(i) ? Math.min(n, Math.max(t, i)) : e;
};
(Luminous.Settings.register(`backgroundBlur`, {
  default: 24,
  normalize: Z(24, 0, 48),
  apply: (e) => {
    Luminous.Settings.setVar(`--luminous-background-blur`, `${e}px`);
  },
}),
  Luminous.Settings.register(`backgroundBrightness`, {
    default: 75,
    normalize: Z(75, 30, 120),
    apply: (e) => {
      Luminous.Settings.setVar(
        `--luminous-background-brightness`,
        String(Number(e) / 100),
      );
    },
  }),
  Luminous.Settings.register(`uiOpacity`, {
    default: 50,
    normalize: Z(50, 0, 100),
    apply: (e) => {
      if (Luminous.Settings.get(`dynamicBackground`) === !1) {
        Luminous.Settings.removeVar(`--luminous-ui-opacity`);
        return;
      }
      Luminous.Settings.setVar(`--luminous-ui-opacity`, `${e}%`);
    },
  }),
  Luminous.Settings.register(`dynamicBackground`, {
    default: !0,
    normalize: (e) => typeof e != `boolean` || e,
    apply: (e) => {
      let t = e === !0;
      if ((Luminous.Settings.toggleClass(`hideDynamicBackground`, !t), t)) {
        (Luminous.Settings.setVar(`--luminous-background`, `transparent`),
          Luminous.Settings.setVar(
            `--luminous-ui-base`,
            `var(--spice-sidebar)`,
          ),
          Luminous.Settings.setVar(
            `--luminous-ui-opacity`,
            `${Luminous.Settings.get(`uiOpacity`) ?? 50}%`,
          ));
        return;
      }
      (Luminous.Settings.removeVar(`--luminous-background`),
        Luminous.Settings.removeVar(`--luminous-ui-base`),
        Luminous.Settings.removeVar(`--luminous-ui-opacity`));
    },
  }),
  Luminous.Settings.init(),
  Luminous.Song.init().catch((e) => {
    Luminous.Logger.error(`Song`, `Initialization failed`, e);
  }),
  Luminous.Canvas.init(),
  q());
