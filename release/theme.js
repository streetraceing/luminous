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
    static currentCanvasKey = null;
    static pendingCanvasSource = null;
    static pendingCanvasKey = null;
    static pendingCanvasVideo = null;
    static pendingCanvasFallback = null;
    static videoCleanupTimer = null;
    static unsupportedCanvasSources = new WeakSet();
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
    static createEffectsLayer() {
      let e = document.createElement(`div`);
      e.className = `luminous-background-effects`;
      let t = document.createElement(`span`);
      t.className = `luminous-background-mesh`;
      let n = document.createElement(`span`);
      n.className = `luminous-background-halo`;
      let r = [`one`, `two`].map((e) => {
          let t = document.createElement(`span`);
          return (
            (t.className = `luminous-background-ribbon luminous-background-ribbon--${e}`),
            t
          );
        }),
        i = [`one`, `two`, `three`, `four`].map((e) => {
          let t = document.createElement(`span`);
          return (
            (t.className = `luminous-background-blob luminous-background-blob--${e}`),
            t
          );
        });
      return (e.append(t, n, ...r, ...i), e);
    }
    static ensureBackground() {
      if (this.root?.isConnected) return;
      (this.cancelVideoCleanup(),
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
          isolation: `isolate`,
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
        r = this.createVideoLayer(),
        i = this.createEffectsLayer();
      (this.root.append(this.base, e, t, n, r, i),
        (this.imageLayers = [e, t]),
        (this.videoLayers = [n, r]),
        (this.activeImage = 0),
        (this.activeVideo = 0),
        (this.currentType = `none`),
        (this.currentCanvasSource = null),
        (this.currentCanvasKey = null),
        this.clearPendingCanvas(),
        document.body.prepend(this.root));
    }
    static render(e) {
      if ((this.ensureBackground(), !e || (!e.image && !e.canvas))) {
        (this.clear(),
          Luminous.Logger.info(`Background`, `Rendering default layer`));
        return;
      }
      if (!(
        e.canvas && this.renderCanvas(e.canvas, e.image, e.canvasSource ?? null)
      )) {
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
        (this.currentCanvasKey = null),
        this.clearPendingCanvas(),
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
    static renderCanvas(e, t, n) {
      if ((this.ensureBackground(), !this.videoLayers))
        return (
          Luminous.Logger.warn(`Background`, `No video layers for render`),
          !1
        );
      let r = (n ?? e.currentSrc) || e.src || null;
      if (
        this.currentType === `canvas` &&
        this.currentCanvasSource === e &&
        this.currentCanvasKey === r &&
        this.isCanvasLayerUsable(this.get())
      )
        return !0;
      if (
        this.pendingCanvasSource === e &&
        this.pendingCanvasKey === r &&
        this.pendingCanvasVideo?.isConnected
      )
        return (t !== void 0 && (this.pendingCanvasFallback = t), !0);
      if (this.pendingCanvasVideo) {
        this.videoRenderId++;
        let e = this.pendingCanvasVideo;
        (this.clearPendingCanvas(), this.resetVideo(e));
      }
      if (
        this.unsupportedCanvasSources.has(e) ||
        !e.isConnected ||
        e.ended ||
        e.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      )
        return !1;
      let i = e.captureStream;
      if (typeof i != `function`)
        return (this.unsupportedCanvasSources.add(e), !1);
      let a;
      try {
        a = i.call(e);
      } catch (t) {
        return (
          this.isPermanentCanvasError(t) &&
            this.unsupportedCanvasSources.add(e),
          !1
        );
      }
      if (a.getVideoTracks().length === 0)
        return (a.getTracks().forEach((e) => e.stop()), !1);
      (this.cancelVideoCleanup(), this.imageRenderId++);
      let o = +(this.activeVideo === 0),
        s = this.videoLayers[o],
        c = ++this.videoRenderId;
      return (
        this.resetVideo(s),
        (s.style.opacity = `0`),
        (s.srcObject = a),
        (this.pendingCanvasSource = e),
        (this.pendingCanvasKey = r),
        (this.pendingCanvasVideo = s),
        (this.pendingCanvasFallback = t ?? null),
        s
          .play()
          .then(() => {
            this.isPendingCanvas(c, s) &&
              requestAnimationFrame(() => {
                this.isPendingCanvas(c, s) &&
                  (this.clearPendingCanvas(),
                  (this.activeVideo = o),
                  (this.currentCanvasSource = e),
                  (this.currentCanvasKey = r),
                  this.transitionTo(`canvas`, s),
                  Luminous.Logger.info(
                    `Background`,
                    `Rendering canvas layer`,
                    e,
                  ));
              });
          })
          .catch((t) => {
            if (!this.isPendingCanvas(c, s)) return;
            let n = this.pendingCanvasFallback;
            if (
              (this.clearPendingCanvas(),
              this.resetVideo(s),
              this.isInterruptedPlayback(t))
            ) {
              this.currentType === `none` && n && this.renderImage(n);
              return;
            }
            (this.isPermanentCanvasError(t) &&
              this.unsupportedCanvasSources.add(e),
              Luminous.Logger.warn(
                `Background`,
                `Failed to play canvas stream`,
                t,
              ),
              n ? this.renderImage(n) : this.clear());
          }),
        !0
      );
    }
    static destroy() {
      (this.imageRenderId++,
        this.videoRenderId++,
        (this.currentCanvasSource = null),
        (this.currentCanvasKey = null),
        this.clearPendingCanvas(),
        this.cancelVideoCleanup(),
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
        (this.currentCanvasKey = null),
        this.clearPendingCanvas(),
        this.transitionTo(`none`));
    }
    static transitionTo(e, t = null) {
      !this.imageLayers ||
        !this.videoLayers ||
        ((this.currentType = e),
        this.base && (this.base.style.opacity = e === `none` ? `1` : `0`),
        this.imageLayers.forEach((n) => {
          let r = e === `image` && n === t;
          ((n.style.opacity = r ? `1` : `0`),
            n.classList.toggle(`luminous-background-layer--active`, r));
        }),
        this.videoLayers.forEach((n) => {
          let r = e === `canvas` && n === t;
          ((n.style.opacity = r ? `1` : `0`),
            n.classList.toggle(`luminous-background-layer--active`, r));
        }),
        this.scheduleVideoCleanup(),
        this.emit(`change`));
    }
    static isCanvasLayerUsable(e) {
      if (!(e instanceof HTMLVideoElement) || !e.isConnected) return !1;
      let t = e.srcObject;
      return (
        t instanceof MediaStream &&
        t.getVideoTracks().some((e) => e.readyState === `live`)
      );
    }
    static isPendingCanvas(e, t) {
      return e === this.videoRenderId && this.pendingCanvasVideo === t;
    }
    static clearPendingCanvas() {
      ((this.pendingCanvasSource = null),
        (this.pendingCanvasKey = null),
        (this.pendingCanvasVideo = null),
        (this.pendingCanvasFallback = null));
    }
    static scheduleVideoCleanup() {
      (this.cancelVideoCleanup(),
        (this.videoCleanupTimer = window.setTimeout(() => {
          this.videoCleanupTimer = null;
          let e =
              this.currentType === `canvas` && this.videoLayers
                ? this.videoLayers[this.activeVideo]
                : null,
            t = this.pendingCanvasVideo;
          this.videoLayers?.forEach((n) => {
            n !== e && n !== t && this.resetVideo(n);
          });
        }, this.TRANSITION_MS)));
    }
    static cancelVideoCleanup() {
      this.videoCleanupTimer !== null &&
        (window.clearTimeout(this.videoCleanupTimer),
        (this.videoCleanupTimer = null));
    }
    static getErrorName(e) {
      return typeof e != `object` || !e || !(`name` in e)
        ? null
        : typeof e.name == `string`
          ? e.name
          : null;
    }
    static isInterruptedPlayback(e) {
      return this.getErrorName(e) === `AbortError`;
    }
    static isPermanentCanvasError(e) {
      let t = this.getErrorName(e);
      return t === `NotSupportedError` || t === `SecurityError`;
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
    static NPV_LONGFORM_VIDEO_SELECTOR = `#VideoPlayerNpv_ReactPortal video`;
    static CINEMA_VIDEO_SELECTOR = `.Root__top-container:has(#VideoPlayerCinema_ReactPortal) video`;
    static listeners = new Map();
    static observer = null;
    static checkFrame = null;
    static currentVideo = null;
    static currentMode = null;
    static currentSource = null;
    static revision = 0;
    static observedSourceVideo = null;
    static forceCheck = !1;
    static handleVideoSourceChange = () => {
      ((this.forceCheck = !0), this.scheduleCheck());
    };
    static initialized = !1;
    static createPayload(e, t) {
      return {
        video: e,
        mode: t,
        source: e?.currentSrc || e?.src || null,
        revision: this.revision,
      };
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
          attributes: !0,
          attributeFilter: [`class`, `style`, `hidden`, `src`],
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
      let t = this.findVisibleVideo(this.NPV_LONGFORM_VIDEO_SELECTOR);
      if (t) return this.createPayload(t, `npv-video`);
      let n = document.querySelector(this.CINEMA_VIDEO_SELECTOR);
      return n
        ? this.createPayload(n, `cinema`)
        : this.createPayload(null, null);
    }
    static findVisibleVideo(e) {
      let t = document.querySelectorAll(e);
      return (
        Array.from(t).find((e) => {
          let t = getComputedStyle(e);
          return (
            e.isConnected &&
            t.display !== `none` &&
            t.visibility !== `hidden` &&
            !e.ended &&
            e.getClientRects().length > 0
          );
        }) ?? null
      );
    }
    static check() {
      let { video: e, mode: t, source: n } = this.detect(),
        r = this.forceCheck;
      this.forceCheck = !1;
      let i = this.currentVideo,
        a = this.currentMode;
      if (!r && i === e && a === t && this.currentSource === n) return;
      if (
        ((this.currentVideo = e),
        (this.currentMode = t),
        (this.currentSource = n),
        this.revision++,
        this.observeVideoSource(e),
        i && !e)
      ) {
        let e = this.createPayload(null, a);
        (Luminous.Logger.info(`Canvas`, `Unmounted`, e),
          this.emit(`unmount`, e));
        return;
      }
      if (!i && e) {
        let n = this.createPayload(e, t);
        (Luminous.Logger.info(`Canvas`, `Mounted`, n), this.emit(`mount`, n));
        return;
      }
      let o = this.createPayload(e, t);
      (Luminous.Logger.info(`Canvas`, `Changed`, o), this.emit(`change`, o));
    }
    static emit(e, t) {
      this.getListeners(e).forEach((e) => {
        this.callListener(e, t);
      });
    }
    static observeVideoSource(e) {
      if (e === this.observedSourceVideo) return;
      let t = [
        `loadedmetadata`,
        `loadeddata`,
        `canplay`,
        `playing`,
        `emptied`,
        `ended`,
      ];
      (t.forEach((e) => {
        this.observedSourceVideo?.removeEventListener(
          e,
          this.handleVideoSourceChange,
        );
      }),
        (this.observedSourceVideo = e),
        t.forEach((t) => {
          e?.addEventListener(t, this.handleVideoSourceChange);
        }));
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
      Palette: `color:#f472b6`,
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
        `%c Luminous v2.1.2 %c by streetraceing `,
        `background:#1DB954;color:#000;padding:6px 12px;border-radius:8px 0 0 8px;font-weight:600;`,
        `background:#181818;color:#1DB954;padding:6px 12px;border-radius:0 8px 8px 0;font-weight:500;`,
      ),
        console.log(
          `%c build: 28/07/2026 21:14:13 UTC+03:00 `,
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
  i = `luminous-dynamic-palette`,
  a = [
    `--luminous-palette-primary`,
    `--luminous-palette-secondary`,
    `--luminous-palette-accent`,
    `--luminous-palette-light`,
    `--luminous-palette-dark`,
    `--luminous-effect-angle`,
    `--luminous-effect-saturation`,
    `--luminous-effect-brightness`,
    `--luminous-effect-contrast`,
    `--luminous-blob-1-duration`,
    `--luminous-blob-2-duration`,
    `--luminous-blob-3-duration`,
    `--luminous-blob-4-duration`,
  ],
  o = [
    `luminous-effect-aurora`,
    `luminous-effect-ember`,
    `luminous-effect-bloom`,
    `luminous-effect-prism`,
    `luminous-effect-halo`,
    `luminous-effect-energy-soft`,
    `luminous-effect-energy-flow`,
    `luminous-effect-energy-vivid`,
    `luminous-effect-tone-dark`,
    `luminous-effect-tone-balanced`,
    `luminous-effect-tone-light`,
  ],
  s = 48,
  c = 24,
  l = 20,
  u = class {
    static requestId = 0;
    static source = null;
    static cache = new Map();
    static currentProfile = null;
    static motionScale = 1;
    static cancel() {
      this.requestId++;
    }
    static clear() {
      (this.cancel(),
        (this.source = null),
        (this.currentProfile = null),
        this.clearAppliedPalette());
    }
    static setMotionDuration(e) {
      let t = Number.isFinite(e) ? Math.min(48, Math.max(8, e)) : l;
      ((this.motionScale = t / l),
        this.currentProfile &&
          this.applyDurations(this.currentProfile.baseDurations));
    }
    static async applyFromImage(e) {
      if (!e) {
        this.clear();
        return;
      }
      if (e === this.source && document.documentElement.classList.contains(i))
        return;
      let t = ++this.requestId;
      try {
        let n = this.getCachedPalette(e) ?? (await this.extractProfile(e));
        if (t !== this.requestId) return;
        (this.cachePalette(e, n), this.applyProfile(n), (this.source = e));
      } catch (e) {
        if (t !== this.requestId) return;
        ((this.source = null),
          (this.currentProfile = null),
          this.clearAppliedPalette(),
          Luminous.Logger.warn(
            `Palette`,
            `Failed to create adaptive background effects`,
            e,
          ));
      }
    }
    static async extractProfile(e) {
      let t = await this.loadImage(e),
        n = document.createElement(`canvas`);
      ((n.width = s), (n.height = s));
      let r = n.getContext(`2d`, { willReadFrequently: !0 });
      if (!r) throw Error(`Canvas context unavailable`);
      ((r.imageSmoothingEnabled = !0),
        (r.imageSmoothingQuality = `high`),
        r.drawImage(t, 0, 0, s, s));
      let i = r.getImageData(0, 0, s, s).data;
      return this.analyzePixels(i);
    }
    static loadImage(e) {
      return new Promise((t, n) => {
        let r = new Image();
        ((r.crossOrigin = `anonymous`),
          (r.decoding = `async`),
          (r.onload = () => t(r)),
          (r.onerror = () => n(Error(`Failed to load cover image`))),
          (r.src = e));
      });
    }
    static analyzePixels(e) {
      let t = new Map(),
        n = 0,
        r = 0,
        i = 0,
        a = 0,
        o = 0,
        s = 0,
        c = 0,
        l = 0,
        u = 0,
        d = 0,
        f = 0;
      for (let p = 0; p < e.length; p += 4) {
        let m = e[p + 3] / 255;
        if (m < 0.45) continue;
        let h = { red: e[p], green: e[p + 1], blue: e[p + 2] },
          g = this.rgbToHsl(h),
          _ = m * (0.62 + g.saturation * 0.78);
        if (
          ((n += _),
          (r += h.red * _),
          (i += h.green * _),
          (a += h.blue * _),
          (o += g.saturation * _),
          (s += g.lightness * _),
          (c += g.lightness * g.lightness * _),
          (l +=
            ((h.red - h.blue) / 255 + ((h.green - h.blue) / 255) * 0.28) * _),
          g.saturation > 0.08 && g.lightness > 0.04 && g.lightness < 0.96)
        ) {
          let e = g.hue * Math.PI * 2,
            t = _ * g.saturation;
          ((u += Math.cos(e) * t), (d += Math.sin(e) * t), (f += t));
        }
        if (g.lightness < 0.025 || g.lightness > 0.975) continue;
        let v = `${h.red >> 5}:${h.green >> 5}:${h.blue >> 5}`,
          y =
            _ *
            (0.72 + g.saturation * 0.96) *
            (0.82 + (1 - Math.abs(g.lightness - 0.52)) * 0.34),
          b = t.get(v) ?? { red: 0, green: 0, blue: 0, weight: 0 };
        ((b.red += h.red * y),
          (b.green += h.green * y),
          (b.blue += h.blue * y),
          (b.weight += y),
          t.set(v, b));
      }
      if (n === 0) throw Error(`Cover image has no usable pixels`);
      t.size === 0 &&
        t.set(`fallback`, { red: r, green: i, blue: a, weight: n });
      let p = s / n,
        m = Math.max(0, c / n - p ** 2),
        h = f > 0 ? Math.hypot(u, d) / f : 1,
        g = {
          averageSaturation: o / n,
          averageLightness: p,
          contrast: Math.min(1, Math.sqrt(m) / 0.3),
          hueDiversity: Math.min(1, Math.max(0, 1 - h)),
          warmth: l / n,
        },
        _ = Array.from(t.values())
          .map((e) => {
            let t = {
              red: Math.round(e.red / e.weight),
              green: Math.round(e.green / e.weight),
              blue: Math.round(e.blue / e.weight),
            };
            return { rgb: t, hsl: this.rgbToHsl(t), score: e.weight };
          })
          .sort((e, t) => t.score - e.score)
          .slice(0, 36),
        v = _.reduce((e, t) =>
          t.score * (0.82 + t.hsl.saturation * 0.5) >
          e.score * (0.82 + e.hsl.saturation * 0.5)
            ? t
            : e,
        ),
        y = this.selectDistinctColor(_, [v], 0.14),
        b = this.selectDistinctColor(_, [v, y], 0.1),
        x = this.getVisualChroma(v.hsl.saturation, g),
        S = this.selectScene(v.hsl.hue, x, g),
        C = this.selectEnergy(x, g),
        w = this.selectTone(g.averageLightness),
        {
          primary: T,
          secondary: E,
          accent: D,
        } = this.createSceneColors(S, v, y, b),
        O = [T, E, D].reduce((e, t) =>
          this.relativeLuminance(t) > this.relativeLuminance(e) ? t : e,
        ),
        k = [T, E, D].reduce((e, t) =>
          this.relativeLuminance(t) < this.relativeLuminance(e) ? t : e,
        );
      return {
        primary: this.toHex(T),
        secondary: this.toHex(E),
        accent: this.toHex(D),
        light: this.toHex(
          this.mix(O, { red: 255, green: 255, blue: 255 }, 0.34),
        ),
        dark: this.toHex(this.mix(k, { red: 0, green: 0, blue: 0 }, 0.62)),
        scene: S,
        energy: C,
        tone: w,
        angle: Math.round(v.hsl.hue * 360),
        saturation: Number((0.92 + Math.min(0.68, x * 0.9)).toFixed(2)),
        brightness: w === `dark` ? 1.08 : w === `light` ? 0.9 : 1,
        contrast: Number((0.94 + g.contrast * 0.16).toFixed(2)),
        baseDurations: this.getBaseDurations(C),
      };
    }
    static selectDistinctColor(e, t, n) {
      let r = e[0]?.score ?? 1,
        i = e[0],
        a = -1 / 0;
      if (
        (e.forEach((e) => {
          let o = Math.min(...t.map((t) => this.colorDistance(e.rgb, t.rgb)));
          if (o < n) return;
          let s = Math.max(
              ...t.map((t) => Math.abs(e.hsl.lightness - t.hsl.lightness)),
            ),
            c = (e.score / r) * 0.46 + o * 0.42 + s * 0.12;
          c > a && ((i = e), (a = c));
        }),
        a > -1 / 0)
      )
        return i;
      let o = t[t.length - 1],
        s = {
          hue: (o.hsl.hue + 0.42) % 1,
          saturation: Math.max(0.28, o.hsl.saturation),
          lightness: Math.min(0.72, Math.max(0.28, 1 - o.hsl.lightness * 0.72)),
        };
      return { rgb: this.hslToRgb(s), hsl: s, score: 0 };
    }
    static createSceneColors(e, t, n, r) {
      if (e === `halo`) {
        let e = this.normalizeColor(t.rgb, 0, 0.22, 0.72),
          n = this.rgbToHsl(e),
          r = n.saturation > 0.05 ? n.hue : 0.61;
        return {
          primary: e,
          secondary: this.mix(e, { red: 255, green: 255, blue: 255 }, 0.3),
          accent: this.hslToRgb({
            hue: r,
            saturation: Math.max(0.08, n.saturation * 0.72),
            lightness: Math.min(0.74, Math.max(0.38, n.lightness + 0.12)),
          }),
        };
      }
      let [i, a] = {
          aurora: [-0.12, -0.22],
          ember: [0.08, 0.14],
          bloom: [0.1, 0.2],
          prism: [0.33, 0.66],
        }[e],
        o = n.score > 0 ? n.rgb : this.createHarmonyColor(t.hsl, i, 0.5),
        s = r.score > 0 ? r.rgb : this.createHarmonyColor(t.hsl, a, 0.58);
      return {
        primary: this.normalizeColor(t.rgb, 0.34, 0.24, 0.74),
        secondary: this.normalizeColor(o, 0.38, 0.2, 0.78),
        accent: this.normalizeColor(s, 0.46, 0.34, 0.78),
      };
    }
    static createHarmonyColor(e, t, n) {
      return this.hslToRgb({
        hue: (e.hue + t + 1) % 1,
        saturation: Math.max(n, e.saturation),
        lightness: Math.min(0.7, Math.max(0.38, e.lightness + 0.08)),
      });
    }
    static getVisualChroma(e, t) {
      let n = e * (0.52 + t.contrast * 0.24);
      return Math.min(1, Math.max(t.averageSaturation, n));
    }
    static selectScene(e, t, n) {
      if (t < 0.18) return `halo`;
      if (n.hueDiversity > 0.43 && t > 0.38) return `prism`;
      let r = e * 360;
      return r >= 68 && r < 166
        ? `bloom`
        : n.warmth > 0.08 || r < 58 || r >= 334
          ? `ember`
          : `aurora`;
    }
    static selectEnergy(e, t) {
      if (e < 0.18) return `soft`;
      let n = e * 0.48 + t.contrast * 0.34 + t.hueDiversity * 0.18;
      return n < 0.34 ? `soft` : n < 0.57 ? `flow` : `vivid`;
    }
    static selectTone(e) {
      return e < 0.31 ? `dark` : e > 0.68 ? `light` : `balanced`;
    }
    static getBaseDurations(e) {
      return e === `soft`
        ? [42, 51, 60, 70]
        : e === `vivid`
          ? [14, 18, 23, 29]
          : [24, 31, 38, 46];
    }
    static normalizeColor(e, t, n, r) {
      let i = this.rgbToHsl(e);
      return this.hslToRgb({
        hue: i.hue,
        saturation: Math.max(t, i.saturation),
        lightness: Math.min(r, Math.max(n, i.lightness)),
      });
    }
    static rgbToHsl({ red: e, green: t, blue: n }) {
      let r = e / 255,
        i = t / 255,
        a = n / 255,
        o = Math.max(r, i, a),
        s = Math.min(r, i, a),
        c = o - s,
        l = (o + s) / 2;
      if (c === 0) return { hue: 0, saturation: 0, lightness: l };
      let u = c / (1 - Math.abs(2 * l - 1)),
        d;
      return (
        (d =
          o === r
            ? ((i - a) / c) % 6
            : o === i
              ? (a - r) / c + 2
              : (r - i) / c + 4),
        { hue: ((d * 60 + 360) % 360) / 360, saturation: u, lightness: l }
      );
    }
    static hslToRgb({ hue: e, saturation: t, lightness: n }) {
      let r = (1 - Math.abs(2 * n - 1)) * t,
        i = (e * 360) / 60,
        a = r * (1 - Math.abs((i % 2) - 1)),
        o = n - r / 2,
        s = 0,
        c = 0,
        l = 0;
      return (
        i < 1
          ? ((s = r), (c = a))
          : i < 2
            ? ((s = a), (c = r))
            : i < 3
              ? ((c = r), (l = a))
              : i < 4
                ? ((c = a), (l = r))
                : i < 5
                  ? ((s = a), (l = r))
                  : ((s = r), (l = a)),
        {
          red: Math.round((s + o) * 255),
          green: Math.round((c + o) * 255),
          blue: Math.round((l + o) * 255),
        }
      );
    }
    static colorDistance(e, t) {
      let n = (e.red - t.red) / 255,
        r = (e.green - t.green) / 255,
        i = (e.blue - t.blue) / 255;
      return Math.min(1, Math.sqrt(n * n * 0.3 + r * r * 0.59 + i * i * 0.11));
    }
    static relativeLuminance({ red: e, green: t, blue: n }) {
      return (0.2126 * e + 0.7152 * t + 0.0722 * n) / 255;
    }
    static mix(e, t, n) {
      return {
        red: Math.round(e.red + (t.red - e.red) * n),
        green: Math.round(e.green + (t.green - e.green) * n),
        blue: Math.round(e.blue + (t.blue - e.blue) * n),
      };
    }
    static toHex({ red: e, green: t, blue: n }) {
      return `#${[e, t, n].map((e) => e.toString(16).padStart(2, `0`)).join(``)}`;
    }
    static getCachedPalette(e) {
      let t = this.cache.get(e);
      return t ? (this.cache.delete(e), this.cache.set(e, t), t) : null;
    }
    static cachePalette(e, t) {
      for (this.cache.set(e, t); this.cache.size > c;) {
        let e = this.cache.keys().next().value;
        if (!e) return;
        this.cache.delete(e);
      }
    }
    static applyProfile(e) {
      let t = document.documentElement;
      (t.style.setProperty(`--luminous-palette-primary`, e.primary),
        t.style.setProperty(`--luminous-palette-secondary`, e.secondary),
        t.style.setProperty(`--luminous-palette-accent`, e.accent),
        t.style.setProperty(`--luminous-palette-light`, e.light),
        t.style.setProperty(`--luminous-palette-dark`, e.dark),
        t.style.setProperty(`--luminous-effect-angle`, `${e.angle}deg`),
        t.style.setProperty(
          `--luminous-effect-saturation`,
          String(e.saturation),
        ),
        t.style.setProperty(
          `--luminous-effect-brightness`,
          String(e.brightness),
        ),
        t.style.setProperty(`--luminous-effect-contrast`, String(e.contrast)),
        o.forEach((e) => t.classList.remove(e)),
        t.classList.add(
          `luminous-effect-${e.scene}`,
          `luminous-effect-energy-${e.energy}`,
          `luminous-effect-tone-${e.tone}`,
          i,
        ),
        (this.currentProfile = e),
        this.applyDurations(e.baseDurations));
    }
    static applyDurations(e) {
      e.forEach((e, t) => {
        let n = Math.max(7, e * this.motionScale);
        document.documentElement.style.setProperty(
          `--luminous-blob-${t + 1}-duration`,
          `${Number(n.toFixed(1))}s`,
        );
      });
    }
    static clearAppliedPalette() {
      let e = document.documentElement;
      (a.forEach((t) => {
        e.style.removeProperty(t);
      }),
        o.forEach((t) => e.classList.remove(t)),
        e.classList.remove(i));
    }
  },
  d = class {
    static STORAGE_KEY = `luminous-settings`;
    static PERSIST_DELAY_MS = 200;
    static registry = new Map();
    static values = new Map();
    static listeners = new Map();
    static savedValues = new Map();
    static persistTimer = null;
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
        window.addEventListener(`pagehide`, () => this.flushPersist()),
        this.persistNow());
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
        this.schedulePersist());
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
      this.values.get(e) !== r &&
        (this.values.set(e, r),
        this.savedValues.set(e, r),
        this.apply(e, n, r),
        this.emit(e, r),
        this.schedulePersist());
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
        this.schedulePersist());
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
    static schedulePersist() {
      (this.persistTimer !== null && window.clearTimeout(this.persistTimer),
        (this.persistTimer = window.setTimeout(() => {
          ((this.persistTimer = null), this.persistNow());
        }, this.PERSIST_DELAY_MS)));
    }
    static flushPersist() {
      (this.persistTimer !== null &&
        (window.clearTimeout(this.persistTimer), (this.persistTimer = null)),
        this.persistNow());
    }
    static persistNow() {
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
  f = class {
    static PLAYER_TIMEOUT_MESSAGE = `Spicetify Player not available`;
    static INITIAL_TRACK_SYNC_INTERVAL = 100;
    static current = null;
    static currentSignature = null;
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
      if (!e) return;
      let t = this.createTrackSignature(e);
      if (!(this.current?.uri === e.uri && this.currentSignature === t)) {
        if (
          (this.initialTrackTimer !== null &&
            (window.clearTimeout(this.initialTrackTimer),
            (this.initialTrackTimer = null)),
          (this.current = e),
          (this.currentSignature = t),
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
    static createTrackSignature(e) {
      let t = e.artists?.map((e) => e.name).join(`|`) ?? ``,
        n = p(
          e.images?.[0]?.url ??
            e.album?.images?.[0]?.url ??
            e.metadata?.image_url ??
            null,
        );
      return `${e.uri}\u0000${e.name}\u0000${t}\u0000${n ?? ``}`;
    }
    static createPayload(e) {
      let t = e.artists?.map((e) => e.name) ?? [],
        n = p(
          e.images?.[0]?.url ??
            e.album?.images?.[0]?.url ??
            e.metadata?.image_url ??
            null,
        );
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
function p(e) {
  if (!e) return null;
  if (e.startsWith(`spotify:image:`)) {
    let t = e.slice(14);
    return t ? `https://i.scdn.co/image/${t}` : null;
  }
  return e;
}
function m() {
  Object.defineProperty(window, 'Luminous', {
    value: {
      Background: e,
      Canvas: t,
      Song: f,
      Native: r,
      Palette: u,
      Settings: d,
      Logger: n,
      version: `2.1.2`,
    },
    configurable: !0,
  });
}
function h() {
  return Spicetify.React;
}
function g() {
  return h().useEffect;
}
function _() {
  return h().useMemo;
}
function v() {
  return h().useRef;
}
function y() {
  return h().useState;
}
var b = { status: `booting`, brokenSince: null },
  x = new Set();
function S() {
  return b;
}
function C(e) {
  let t = { ...b, ...e };
  (t.status === b.status && t.brokenSince === b.brokenSince) ||
    ((b = t), x.forEach((e) => T(e)));
}
function w(e) {
  return (
    x.add(e),
    T(e),
    () => {
      x.delete(e);
    }
  );
}
function T(e) {
  try {
    e(b);
  } catch (e) {
    n.error(`Main`, `UI health listener failed`, e);
  }
}
function E() {
  let e = g(),
    t = _(),
    n = y(),
    [r, i] = n(() => Luminous.Song.getSync()),
    [a, o] = n(() => Luminous.Canvas.get()),
    [s, c] = n(() => Luminous.Settings.get(`dynamicBackground`) !== !1),
    [l, u] = n(() => Luminous.Settings.get(`dynamicPalette`) !== !1),
    [d, f] = n(() => S().status !== `booting`),
    p = t(
      () =>
        d
          ? s
            ? a.video
              ? `canvas:${a.source ?? ``}:${a.revision}:${r?.image ?? ``}`
              : r?.image
                ? `image:${r.image}`
                : `empty`
            : `disabled`
          : `inactive`,
      [d, a, s, r?.image],
    );
  return (
    e(() => {
      let e = r ? `${r.uri}\u0000${r.image ?? ``}` : null,
        t = `${a.mode ?? ``}\u0000${a.source ?? ``}\u0000${a.revision}`,
        n = a.video,
        s = (t) => {
          let n = `${t.uri}\u0000${t.image ?? ``}`;
          e !== n &&
            ((e = n),
            Luminous.Palette.cancel(),
            Luminous.Background.preloadImage(t.image),
            i(t));
        },
        l = (e) => {
          let r = `${e.mode ?? ``}\u0000${e.source ?? ``}\u0000${e.revision}`;
          (t === r && n === e.video) || ((t = r), (n = e.video), o(e));
        };
      (Luminous.Song.addEventListener(`ready`, s),
        Luminous.Song.addEventListener(`change`, s),
        Luminous.Canvas.addEventListener(`mount`, l),
        Luminous.Canvas.addEventListener(`change`, l),
        Luminous.Canvas.addEventListener(`unmount`, l));
      let d = w((e) => {
          f(e.status !== `booting`);
        }),
        p = Luminous.Settings.subscribe(
          `dynamicBackground`,
          (e) => c(e !== !1),
          { immediate: !0 },
        ),
        m = Luminous.Settings.subscribe(`dynamicPalette`, (e) => u(e !== !1), {
          immediate: !0,
        });
      return () => {
        (Luminous.Song.removeEventListener(`ready`, s),
          Luminous.Song.removeEventListener(`change`, s),
          Luminous.Canvas.removeEventListener(`mount`, l),
          Luminous.Canvas.removeEventListener(`change`, l),
          Luminous.Canvas.removeEventListener(`unmount`, l),
          d(),
          p(),
          m(),
          Luminous.Background.destroy(),
          Luminous.Palette.clear());
      };
    }, []),
    e(() => {
      if (!d || !s || !l) {
        Luminous.Palette.clear();
        return;
      }
      Luminous.Palette.applyFromImage(r?.image);
    }, [d, l, s, r?.image]),
    e(() => {
      if (!d) {
        Luminous.Background.destroy();
        return;
      }
      if (!s) {
        Luminous.Background.clear();
        return;
      }
      if (a.video) {
        Luminous.Background.render({
          canvas: a.video,
          canvasSource: a.source,
          image: r?.image,
        });
        return;
      }
      if (r?.image) {
        Luminous.Background.render({ image: r.image });
        return;
      }
      Luminous.Background.render();
    }, [p]),
    null
  );
}
var D = 600,
  O = 2600,
  k = 1500,
  ee = `.Root__top-container #main-view`,
  te = Date.now();
function ne() {
  let e = h(),
    t = g(),
    n = _(),
    r = v(),
    i = y(),
    [a, o] = i(() => A()),
    [s, c] = i(!0),
    [l, u] = i(() => S()),
    [d, f] = i(() => Date.now()),
    p = r(a ? te : null),
    m = r(!1);
  (t(() => w(u), []),
    t(() => {
      let e = null,
        t = () => {
          ((e = null), o(A()));
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
      if (!a || m.current) return;
      p.current === null && (p.current = Date.now());
      let e = Date.now() - p.current,
        t = l.status === `ready` ? D : O,
        n = Math.max(0, t - e),
        r = window.setTimeout(() => {
          ((m.current = !0), c(!1));
        }, n);
      return () => window.clearTimeout(r);
    }, [l.status, a]),
    t(() => {
      if (!a || !s || l.status !== `waiting`) return;
      let e = window.setInterval(() => {
        f(Date.now());
      }, 250);
      return () => window.clearInterval(e);
    }, [l.status, a, s]));
  let b = n(
      () =>
        l.status === `waiting` && l.brokenSince
          ? `Waiting for Spotify UI... (${j(d - l.brokenSince)})`
          : l.status === `ready`
            ? `Welcome back. Lighting up Spotify...`
            : `Starting Luminous...`,
      [l.brokenSince, l.status, d],
    ),
    x =
      l.status === `waiting` &&
      l.brokenSince !== null &&
      d - l.brokenSince >= k;
  return a
    ? e.createElement(
        `div`,
        {
          className: `luminous-splash${s ? `` : ` luminous-splash--hidden`}`,
          'aria-hidden': s ? `false` : `true`,
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
            e.createElement(`small`, null, b),
          ),
          e.createElement(
            `div`,
            { className: `luminous-splash__loader` },
            e.createElement(`span`),
          ),
          x &&
            e.createElement(
              `div`,
              { className: `luminous-splash__hint` },
              `Spotify is taking longer than expected. The splash will close automatically.`,
            ),
        ),
      )
    : null;
}
function A() {
  return document.querySelector(ee) !== null;
}
function j(e) {
  return `${Math.max(0, Math.floor(e / 1e3))}s`;
}
var re = `Luminous Settings`,
  ie = `brightness`,
  M = `luminous-theme-modal`,
  N = `luminous-theme-modal-title`,
  P = `luminous-theme-modal-description`,
  F = [
    `button:not([disabled])`,
    `input:not([disabled])`,
    `[href]`,
    `[tabindex]:not([tabindex="-1"])`,
  ].join(`,`),
  I = [
    { id: `appearance`, label: `Appearance` },
    { id: `motion`, label: `Motion` },
  ],
  L = [
    {
      key: `dynamicBackground`,
      label: `Dynamic background`,
      description: `Use the current cover or Spotify Canvas as the backdrop.`,
      fallback: !0,
    },
    {
      key: `dynamicPalette`,
      label: `Adaptive effects`,
      description: `Build a colour scene automatically from each track cover.`,
      fallback: !0,
    },
  ],
  R = [
    {
      key: `backgroundBlur`,
      label: `Background blur`,
      description: `Softens album art and Canvas motion behind the interface.`,
      min: 0,
      max: 48,
      step: 1,
      unit: `px`,
      fallback: 24,
    },
    {
      key: `backgroundBrightness`,
      label: `Background brightness`,
      description: `Controls how prominent the artwork remains behind Spotify.`,
      min: 30,
      max: 120,
      step: 1,
      unit: `%`,
      fallback: 75,
    },
    {
      key: `uiOpacity`,
      label: `Surface opacity`,
      description: `Sets the density of the translucent interface surfaces.`,
      min: 0,
      max: 100,
      step: 1,
      unit: `%`,
      fallback: 50,
    },
    {
      key: `uiBlur`,
      label: `Surface blur`,
      description: `Controls the blur applied to navigation and content surfaces.`,
      min: 0,
      max: 32,
      step: 1,
      unit: `px`,
      fallback: 16,
    },
    {
      key: `paletteStrength`,
      label: `Effect intensity`,
      description: `Controls how strongly the adaptive scene appears behind Spotify.`,
      min: 0,
      max: 45,
      step: 1,
      unit: `%`,
      fallback: 24,
    },
  ],
  z = {
    key: `backgroundMotion`,
    label: `Background movement`,
    description: `Choose how the artwork, Canvas, and adaptive scene travel.`,
    fallback: `drift`,
    options: [
      { value: `still`, label: `Still` },
      { value: `drift`, label: `Drift` },
      { value: `float`, label: `Float` },
    ],
  },
  B = [
    {
      key: `motionDuration`,
      label: `Motion speed`,
      description: `Scales the media movement and the adaptive scene tempo.`,
      min: 8,
      max: 48,
      step: 1,
      unit: `s`,
      fallback: 20,
    },
  ],
  V = [
    {
      key: `reduceMotion`,
      label: `Reduce motion`,
      description: `Stop Luminous animations and background cross-fades.`,
      fallback: !1,
    },
  ],
  ae = [
    ...L.map((e) => e.key),
    ...R.map((e) => e.key),
    z.key,
    ...B.map((e) => e.key),
    ...V.map((e) => e.key),
  ];
function oe() {
  let e = h(),
    t = g(),
    n = v(),
    r = y(),
    i = n(null),
    [a, o] = r(!1);
  return (
    t(() => {
      let e = !1,
        t = null,
        n = () => {
          e ||
            t !== null ||
            (t = window.setTimeout(() => {
              ((t = null), r());
            }, 250));
        },
        r = () => {
          if (((t = null), e || i.current)) return;
          if (!Spicetify.Menu?.Item) {
            n();
            return;
          }
          let r = new Spicetify.Menu.Item(re, !1, () => o(!0), ie);
          (r.register(), (i.current = r));
        };
      return (
        r(),
        () => {
          ((e = !0),
            t !== null && window.clearTimeout(t),
            i.current?.deregister(),
            (i.current = null));
        }
      );
    }, []),
    a ? e.createElement(se, { onClose: () => o(!1) }) : null
  );
}
function se({ onClose: e }) {
  let t = h(),
    n = g(),
    r = v(),
    i = y(),
    a = r(null),
    o = r(null),
    s = r({ appearance: null, motion: null }),
    c = r(null),
    l = r(null),
    [u, d] = i(`appearance`),
    [f, p] = i(null),
    m = (e, t = !1) => {
      if (e === u) return;
      let n = c.current?.getBoundingClientRect().height;
      (n && p(Math.ceil(n)),
        d(e),
        t && requestAnimationFrame(() => s.current[e]?.focus()));
    };
  (n(() => {
    let e = document.body.style.overflow,
      t = requestAnimationFrame(() => {
        o.current?.focus();
      });
    return (
      (document.body.style.overflow = `hidden`),
      () => {
        (cancelAnimationFrame(t), (document.body.style.overflow = e));
      }
    );
  }, []),
    n(() => {
      let t = (t) => {
        if (t.key === `Escape`) {
          (t.preventDefault(), e());
          return;
        }
        if (t.key !== `Tab`) return;
        let n = Array.from(a.current?.querySelectorAll(F) ?? []);
        if (!n.length) {
          t.preventDefault();
          return;
        }
        let r = n[0],
          i = n[n.length - 1];
        if (t.shiftKey && document.activeElement === r) {
          (t.preventDefault(), i.focus());
          return;
        }
        !t.shiftKey &&
          document.activeElement === i &&
          (t.preventDefault(), r.focus());
      };
      return (
        document.addEventListener(`keydown`, t, !0),
        () => {
          document.removeEventListener(`keydown`, t, !0);
        }
      );
    }, [e]),
    n(() => {
      if (f === null || !l.current) return;
      let e = Math.ceil(l.current.getBoundingClientRect().height),
        t = requestAnimationFrame(() => {
          p(e);
        }),
        n = window.setTimeout(() => {
          p(null);
        }, 220);
      return () => {
        (cancelAnimationFrame(t), window.clearTimeout(n));
      };
    }, [u]));
  let _ = (e, t) => {
    let n = I.findIndex((e) => e.id === t),
      r = null;
    (e.key === `ArrowRight` && (r = (n + 1) % I.length),
      e.key === `ArrowLeft` && (r = (n - 1 + I.length) % I.length),
      e.key === `Home` && (r = 0),
      e.key === `End` && (r = I.length - 1),
      r !== null && (e.preventDefault(), m(I[r].id, !0)));
  };
  return t.createElement(
    `div`,
    {
      className: `luminous-theme-modal-backdrop`,
      onMouseDown: (t) => {
        t.target === t.currentTarget && e();
      },
    },
    t.createElement(
      `div`,
      {
        ref: a,
        id: M,
        className: `luminous-theme-menu`,
        role: `dialog`,
        'aria-modal': `true`,
        'aria-labelledby': N,
        'aria-describedby': P,
      },
      t.createElement(
        `div`,
        { className: `luminous-theme-menu__header` },
        t.createElement(
          `div`,
          { className: `luminous-theme-menu__mark` },
          t.createElement(`svg`, {
            className: `luminous-theme-menu__luminous-icon`,
            viewBox: `0 0 16 16`,
            'aria-hidden': `true`,
            focusable: `false`,
            dangerouslySetInnerHTML: {
              __html: Spicetify.SVGIcons?.brightness ?? ``,
            },
          }),
        ),
        t.createElement(
          `div`,
          { className: `luminous-theme-menu__title` },
          t.createElement(`span`, { id: N }, `Luminous`),
          t.createElement(`small`, { id: P }, `Theme preferences`),
        ),
        t.createElement(
          `button`,
          {
            className: `luminous-theme-menu__reset-button`,
            type: `button`,
            onClick: () => Luminous.Settings.resetMany(ae),
          },
          `Reset`,
        ),
        t.createElement(
          `button`,
          {
            ref: o,
            className: `luminous-theme-menu__icon-button`,
            type: `button`,
            'aria-label': `Close settings`,
            onClick: e,
          },
          t.createElement(`svg`, {
            className: `luminous-theme-menu__close-icon`,
            'aria-hidden': `true`,
            dangerouslySetInnerHTML: { __html: Spicetify.SVGIcons?.x ?? `` },
          }),
        ),
      ),
      t.createElement(
        `div`,
        {
          className: `luminous-theme-menu__tabs`,
          role: `tablist`,
          'aria-label': `Luminous settings sections`,
        },
        I.map((e) =>
          t.createElement(
            `button`,
            {
              key: e.id,
              ref: (t) => {
                s.current[e.id] = t;
              },
              id: `${M}-${e.id}-tab`,
              className: `luminous-theme-menu__tab${u === e.id ? ` luminous-theme-menu__tab--active` : ``}`,
              type: `button`,
              role: `tab`,
              tabIndex: u === e.id ? 0 : -1,
              'aria-selected': String(u === e.id),
              'aria-controls': `${M}-${e.id}-panel`,
              onClick: () => m(e.id),
              onKeyDown: (t) => _(t, e.id),
            },
            e.label,
          ),
        ),
      ),
      t.createElement(
        `div`,
        {
          ref: c,
          id: `${M}-${u}-panel`,
          className: `luminous-theme-menu__panel`,
          style: f === null ? void 0 : { height: `${f}px` },
          role: `tabpanel`,
          'aria-labelledby': `${M}-${u}-tab`,
        },
        t.createElement(
          `div`,
          { key: u, ref: l, className: `luminous-theme-menu__panel-content` },
          u === `appearance` ? t.createElement(ce) : t.createElement(le),
        ),
      ),
      t.createElement(
        `p`,
        { className: `luminous-theme-menu__footer` },
        `Changes are saved automatically.`,
      ),
    ),
  );
}
function ce() {
  let e = h();
  return e.createElement(
    e.Fragment,
    null,
    e.createElement(
      `div`,
      { className: `luminous-theme-menu__panel-heading` },
      e.createElement(`h2`, null, `Appearance`),
      e.createElement(
        `p`,
        null,
        `Shape the balance between artwork, colour, and Spotify surfaces.`,
      ),
    ),
    L.map((t) => e.createElement(H, { key: t.key, setting: t })),
    R.map((t) => e.createElement(U, { key: t.key, setting: t })),
  );
}
function le() {
  let e = h();
  return e.createElement(
    e.Fragment,
    null,
    e.createElement(
      `div`,
      { className: `luminous-theme-menu__panel-heading` },
      e.createElement(`h2`, null, `Motion`),
      e.createElement(
        `p`,
        null,
        `Set the overall movement while each track keeps its own adaptive scene.`,
      ),
    ),
    e.createElement(ue, { setting: z }),
    B.map((t) => e.createElement(U, { key: t.key, setting: t })),
    V.map((t) => e.createElement(H, { key: t.key, setting: t })),
  );
}
function H({ setting: e }) {
  let t = h(),
    n = g(),
    [r, i] = y()(() => fe(e.key, e.fallback));
  return (
    n(
      () =>
        Luminous.Settings.subscribe(e.key, (e) => i(e === !0), {
          immediate: !0,
        }),
      [e.key],
    ),
    t.createElement(
      `label`,
      { className: `luminous-theme-menu__row luminous-theme-menu__toggle` },
      t.createElement(
        `span`,
        { className: `luminous-theme-menu__copy` },
        t.createElement(`span`, null, e.label),
        t.createElement(`small`, null, e.description),
      ),
      t.createElement(
        `span`,
        { className: `luminous-theme-menu__switch` },
        t.createElement(`input`, {
          type: `checkbox`,
          checked: r,
          onChange: (t) =>
            Luminous.Settings.set(e.key, t.currentTarget.checked),
        }),
        t.createElement(`span`),
      ),
    )
  );
}
function U({ setting: e }) {
  let t = h(),
    n = g(),
    [r, i] = y()(() => de(e));
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
        t.createElement(`strong`, null, `${r}${e.unit}`),
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
function ue({ setting: e }) {
  let t = h(),
    n = g(),
    [r, i] = y()(() => pe(e.key, e.fallback));
  return (
    n(
      () =>
        Luminous.Settings.subscribe(e.key, (e) => i(String(e)), {
          immediate: !0,
        }),
      [e.key],
    ),
    t.createElement(
      `div`,
      { className: `luminous-theme-menu__row luminous-theme-menu__choice` },
      t.createElement(
        `div`,
        { className: `luminous-theme-menu__copy` },
        t.createElement(`span`, null, e.label),
        t.createElement(`small`, null, e.description),
      ),
      t.createElement(
        `div`,
        {
          className: `luminous-theme-menu__choices`,
          role: `group`,
          'aria-label': e.label,
        },
        e.options.map((n) =>
          t.createElement(
            `button`,
            {
              key: n.value,
              className: `luminous-theme-menu__choice-button${r === n.value ? ` luminous-theme-menu__choice-button--active` : ``}`,
              type: `button`,
              'aria-pressed': String(r === n.value),
              onClick: () => Luminous.Settings.set(e.key, n.value),
            },
            n.label,
          ),
        ),
      ),
    )
  );
}
function de(e) {
  let t = Luminous.Settings.get(e.key),
    n = Number(t);
  return Number.isFinite(n) ? n : e.fallback;
}
function fe(e, t) {
  let n = Luminous.Settings.get(e);
  return typeof n == `boolean` ? n : t;
}
function pe(e, t) {
  let n = Luminous.Settings.get(e);
  return typeof n == `string` ? n : t;
}
var W = `luminous-playlist-background`,
  G = `--luminous-playlist-background-image`,
  K = `luminous-home-header-height`,
  q = `--luminous-home-header-height`,
  J = class {
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
          (s.classList.remove(W),
          s.style.removeProperty(G),
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
            r.classList.add(W),
            r.style.setProperty(G, i),
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
          (s.classList.remove(K),
          s.style.removeProperty(q),
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
            n.classList.add(K),
            n.style.setProperty(q, `${a}px`),
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
          ((i = null), C({ status: `booting`, brokenSince: null }));
          return;
        }
        if (o()) {
          ((i = null), C({ status: `ready`, brokenSince: null }));
          return;
        }
        (i === null &&
          ((i = Date.now()), n.info(`Main`, `Waiting for Spotify UI mount...`)),
          C({ status: `waiting`, brokenSince: i }));
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
              C({ status: `booting`, brokenSince: null }));
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
function me() {
  return (
    g()(() => {
      let e = [
        J.uiMountWatcher(),
        J.observeCinema(),
        J.playlistBackground(),
        J.homeHeaderHeight(),
      ];
      return () => {
        e.forEach((e) => e.disconnect());
      };
    }, []),
    null
  );
}
function he() {
  let e = h();
  return e.createElement(
    e.Fragment,
    null,
    e.createElement(ne),
    e.createElement(me),
    e.createElement(E),
    e.createElement(oe),
  );
}
var Y = `luminous-react-root`,
  ge = 15e3,
  X = null;
function _e() {
  Z()
    .then(ve)
    .catch((e) => {
      Luminous.Logger.error(`Main`, e);
    });
}
function ve() {
  let e = h(),
    { ReactDOM: t } = Spicetify,
    n = ye(),
    r = e.createElement(he);
  if (t.createRoot) {
    let e = X ?? t.createRoot(n);
    ((X = e), e.render(r));
    return;
  }
  t.render(r, n);
}
function Z() {
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
        if (Date.now() - n > ge) {
          t(Error(`Spicetify React runtime not available`));
          return;
        }
        requestAnimationFrame(r);
      };
    r();
  });
}
function ye() {
  let e = document.getElementById(Y);
  return (
    e ||
      ((e = document.createElement(`div`)),
      (e.id = Y),
      (e.style.display = `contents`),
      document.body.appendChild(e)),
    e
  );
}
(m(), Luminous.Logger.printBanner());
var Q = (e, t, n) => (r) => {
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
  normalize: Q(24, 0, 48),
  apply: (e) => {
    Luminous.Settings.setVar(`--luminous-background-blur`, `${e}px`);
  },
}),
  Luminous.Settings.register(`backgroundBrightness`, {
    default: 75,
    normalize: Q(75, 30, 120),
    apply: (e) => {
      Luminous.Settings.setVar(
        `--luminous-background-brightness`,
        String(Number(e) / 100),
      );
    },
  }),
  Luminous.Settings.register(`uiBlur`, {
    default: 16,
    normalize: Q(16, 0, 32),
    apply: (e) => {
      Luminous.Settings.setVar(`--luminous-ui-blur`, `${e}px`);
    },
  }),
  Luminous.Settings.register(`paletteStrength`, {
    default: 24,
    normalize: Q(24, 0, 45),
    apply: (e) => {
      let t = Math.min(72, Math.round(Number(e) * 1.6));
      Luminous.Settings.setVar(`--luminous-palette-effect-opacity`, `${t}%`);
    },
  }),
  Luminous.Settings.register(`backgroundEnergy`, {
    default: `adaptive`,
    normalize: () => `adaptive`,
  }),
  Luminous.Settings.register(`uiOpacity`, {
    default: 50,
    normalize: Q(50, 0, 100),
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
  Luminous.Settings.register(`dynamicPalette`, {
    default: !0,
    normalize: (e) => typeof e != `boolean` || e,
    apply: (e) => {
      e === !1 && Luminous.Palette.clear();
    },
  }));
var $ = [`still`, `drift`, `float`];
(Luminous.Settings.register(`backgroundMotion`, {
  default: `drift`,
  normalize: (e) => (typeof e == `string` && $.includes(e) ? e : `drift`),
  apply: (e) => {
    $.forEach((t) => {
      Luminous.Settings.toggleClass(`luminous-motion-${t}`, t === e);
    });
  },
}),
  Luminous.Settings.register(`motionDuration`, {
    default: 20,
    normalize: Q(20, 8, 48),
    apply: (e) => {
      let t = Number(e);
      (Luminous.Settings.setVar(`--luminous-motion-duration`, `${t}s`),
        Luminous.Palette.setMotionDuration(t));
    },
  }),
  Luminous.Settings.register(`reduceMotion`, {
    default: !1,
    normalize: (e) => typeof e == `boolean` && e,
    apply: (e) => {
      Luminous.Settings.toggleClass(`luminous-reduce-motion`, e === !0);
    },
  }),
  Luminous.Settings.init(),
  Luminous.Song.init().catch((e) => {
    Luminous.Logger.error(`Song`, `Initialization failed`, e);
  }),
  Luminous.Canvas.init(),
  _e());
