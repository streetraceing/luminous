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
    static directVideoSource = null;
    static directVideoKey = null;
    static directVideoHosts = new Map();
    static directVideoBridgeSnapshots = new Map();
    static directVideoCleanupTimers = new Map();
    static currentType = `none`;
    static listeners = new Map();
    static getType() {
      return this.currentType;
    }
    static get() {
      return this.currentType === `canvas` &&
        this.directVideoSource?.isConnected
        ? this.directVideoSource
        : this.currentType === `canvas` && this.videoLayers
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
        e.canvas &&
        this.renderCanvas(
          e.canvas,
          e.image,
          e.canvasSource ?? null,
          e.canvasMode ?? null,
        )
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
    static renderCanvas(e, t, n, r = null) {
      if ((this.ensureBackground(), !this.videoLayers))
        return (
          Luminous.Logger.warn(`Background`, `No video layers for render`),
          !1
        );
      let i = (n ?? e.currentSrc) || e.src || null;
      if (r === `npv-video`) return this.renderDirectVideo(e, i);
      if (
        this.currentType === `canvas` &&
        this.currentCanvasSource === e &&
        this.currentCanvasKey === i &&
        this.isCanvasLayerUsable(this.get())
      )
        return !0;
      if (
        this.pendingCanvasSource === e &&
        this.pendingCanvasKey === i &&
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
      let a = e.captureStream;
      if (typeof a != `function`)
        return (this.unsupportedCanvasSources.add(e), !1);
      let o;
      try {
        o = a.call(e);
      } catch (t) {
        return (
          this.isPermanentCanvasError(t) &&
            this.unsupportedCanvasSources.add(e),
          !1
        );
      }
      if (o.getVideoTracks().length === 0)
        return (o.getTracks().forEach((e) => e.stop()), !1);
      (this.cancelVideoCleanup(), this.imageRenderId++);
      let s = +(this.activeVideo === 0),
        c = this.videoLayers[s],
        l = ++this.videoRenderId;
      return (
        this.resetVideo(c),
        (c.style.opacity = `0`),
        (c.srcObject = o),
        (this.pendingCanvasSource = e),
        (this.pendingCanvasKey = i),
        (this.pendingCanvasVideo = c),
        (this.pendingCanvasFallback = t ?? null),
        c
          .play()
          .then(() => {
            this.isPendingCanvas(l, c) &&
              requestAnimationFrame(() => {
                this.isPendingCanvas(l, c) &&
                  (this.clearPendingCanvas(),
                  (this.activeVideo = s),
                  (this.currentCanvasSource = e),
                  (this.currentCanvasKey = i),
                  this.transitionTo(`canvas`, c),
                  Luminous.Logger.info(
                    `Background`,
                    `Rendering canvas layer`,
                    e,
                  ));
              });
          })
          .catch((t) => {
            if (!this.isPendingCanvas(l, c)) return;
            let n = this.pendingCanvasFallback;
            if (
              (this.clearPendingCanvas(),
              this.resetVideo(c),
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
    static renderDirectVideo(e, t) {
      if (
        this.currentType === `canvas` &&
        this.directVideoSource === e &&
        e.isConnected &&
        !e.ended &&
        e.classList.contains(`luminous-direct-video-background--active`)
      )
        return ((this.directVideoKey = t), (this.currentCanvasKey = t), !0);
      if (
        !e.isConnected ||
        e.ended ||
        e.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        e.videoWidth === 0 ||
        e.videoHeight === 0
      )
        return !1;
      if (
        (this.cancelVideoCleanup(),
        this.imageRenderId++,
        this.videoRenderId++,
        this.pendingCanvasVideo)
      ) {
        let e = this.pendingCanvasVideo;
        (this.clearPendingCanvas(), this.resetVideo(e));
      }
      (this.directVideoSource &&
        this.directVideoSource !== e &&
        this.deactivateDirectVideo(),
        this.cancelDirectVideoCleanup(e));
      let n = e.closest(`#VideoPlayerNpv_ReactPortal`);
      return n
        ? (this.prepareDirectVideoBridge(e, n),
          e.classList.add(`luminous-direct-video-background`),
          n.classList.add(`luminous-direct-video-host`),
          document.documentElement.classList.add(
            `luminous-direct-video-active`,
          ),
          (this.directVideoSource = e),
          (this.directVideoKey = t),
          this.directVideoHosts.set(e, n),
          (this.currentCanvasSource = e),
          (this.currentCanvasKey = t),
          e.offsetWidth,
          e.classList.add(`luminous-direct-video-background--active`),
          this.transitionTo(`canvas`, e),
          Luminous.Logger.info(
            `Background`,
            `Using original protected video as background`,
            e,
          ),
          !0)
        : (Luminous.Logger.warn(
            `Background`,
            `Protected video has no NPV portal host`,
            e,
          ),
          !1);
    }
    static deactivateDirectVideo(e = !1) {
      let t = this.directVideoSource;
      if (!t) return;
      if (
        ((this.directVideoSource = null),
        (this.directVideoKey = null),
        t.classList.remove(`luminous-direct-video-background--active`),
        e)
      ) {
        this.restoreDirectVideo(t);
        return;
      }
      this.cancelDirectVideoCleanup(t);
      let n = window.setTimeout(() => {
        (this.directVideoCleanupTimers.delete(t), this.restoreDirectVideo(t));
      }, this.TRANSITION_MS);
      this.directVideoCleanupTimers.set(t, n);
    }
    static cancelDirectVideoCleanup(e) {
      let t = this.directVideoCleanupTimers.get(e);
      t !== void 0 &&
        (window.clearTimeout(t), this.directVideoCleanupTimers.delete(e));
    }
    static restoreDirectVideo(e) {
      (this.cancelDirectVideoCleanup(e),
        e.classList.remove(
          `luminous-direct-video-background`,
          `luminous-direct-video-background--active`,
        ));
      let t = this.directVideoHosts.get(e);
      (this.directVideoHosts.delete(e),
        t &&
          !t.querySelector(`video.luminous-direct-video-background`) &&
          t.classList.remove(`luminous-direct-video-host`),
        this.restoreDirectVideoBridge(e),
        this.directVideoHosts.size === 0 &&
          document.documentElement.classList.remove(
            `luminous-direct-video-active`,
          ));
    }
    static prepareDirectVideoBridge(e, t) {
      this.restoreDirectVideoBridge(e);
      let n = new Map(),
        r = (e, t, r) => {
          let i = n.get(e);
          (i || ((i = new Map()), n.set(e, i)),
            i.has(t) ||
              i.set(t, {
                value: e.style.getPropertyValue(t),
                priority: e.style.getPropertyPriority(t),
              }),
            e.style.setProperty(t, r, `important`));
        },
        i = t;
      for (; i && i !== document.body;) {
        let e = getComputedStyle(i);
        if (
          ((e.overflowX !== `visible` || e.overflowY !== `visible`) &&
            r(i, `overflow`, `visible`),
          e.clip !== `auto` && r(i, `clip`, `auto`),
          e.clipPath !== `none` && r(i, `clip-path`, `none`),
          e.transform !== `none` && r(i, `transform`, `none`),
          e.translate !== `none` && r(i, `translate`, `none`),
          e.rotate !== `none` && r(i, `rotate`, `none`),
          e.scale !== `none` && r(i, `scale`, `none`),
          e.perspective !== `none` && r(i, `perspective`, `none`),
          e.filter !== `none` && r(i, `filter`, `none`),
          e.backdropFilter !== `none` && r(i, `backdrop-filter`, `none`),
          e.contain !== `none` && r(i, `contain`, `none`),
          e.containerType !== `normal` && r(i, `container-type`, `normal`),
          e.contentVisibility !== `visible` &&
            r(i, `content-visibility`, `visible`),
          e.isolation !== `auto` && r(i, `isolation`, `auto`),
          e.mixBlendMode !== `normal` && r(i, `mix-blend-mode`, `normal`),
          e.willChange !== `auto` && r(i, `will-change`, `auto`),
          e.position !== `static` &&
            e.zIndex !== `auto` &&
            r(i, `z-index`, `auto`),
          i.classList.add(`luminous-direct-video-bridge`),
          i.classList.contains(`Root__top-container`))
        )
          break;
        i = i.parentElement;
      }
      this.directVideoBridgeSnapshots.set(e, n);
    }
    static restoreDirectVideoBridge(e) {
      let t = this.directVideoBridgeSnapshots.get(e);
      t &&
        (t.forEach((e, t) => {
          (e.forEach(({ value: e, priority: n }, r) => {
            e ? t.style.setProperty(r, e, n) : t.style.removeProperty(r);
          }),
            t.classList.remove(`luminous-direct-video-bridge`));
        }),
        this.directVideoBridgeSnapshots.delete(e));
    }
    static restoreAllDirectVideos() {
      (this.directVideoCleanupTimers.forEach((e) => window.clearTimeout(e)),
        this.directVideoCleanupTimers.clear(),
        Array.from(this.directVideoHosts.keys()).forEach((e) =>
          this.restoreDirectVideo(e),
        ),
        this.directVideoBridgeSnapshots.forEach((e, t) =>
          this.restoreDirectVideoBridge(t),
        ),
        document.documentElement.classList.remove(
          `luminous-direct-video-active`,
        ),
        (this.directVideoSource = null),
        (this.directVideoKey = null));
    }
    static destroy() {
      (this.imageRenderId++,
        this.videoRenderId++,
        (this.currentCanvasSource = null),
        (this.currentCanvasKey = null),
        this.clearPendingCanvas(),
        this.restoreAllDirectVideos(),
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
        (this.directVideoSource &&
          (e !== `canvas` || t !== this.directVideoSource) &&
          this.deactivateDirectVideo(),
        (this.currentType = e),
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
              this.currentType === `canvas` &&
              !this.directVideoSource &&
              this.videoLayers
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
    static enabled = !0;
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
        !this.enabled ||
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
    static setEnabled(e) {
      if (this.enabled !== e) {
        if (((this.enabled = e), !e)) {
          let e = this.currentVideo,
            t = this.currentMode;
          (this.destroy(!1),
            e &&
              (this.revision++,
              this.emit(`unmount`, this.createPayload(null, t))));
          return;
        }
        this.init();
      }
    }
    static destroy(e = !0) {
      (this.observer?.disconnect(),
        (this.observer = null),
        this.checkFrame !== null &&
          (cancelAnimationFrame(this.checkFrame), (this.checkFrame = null)),
        this.observeVideoSource(null),
        (this.currentVideo = null),
        (this.currentMode = null),
        (this.currentSource = null),
        (this.forceCheck = !1),
        (this.initialized = !1),
        e && this.listeners.clear());
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
      Runtime: `color:#38bdf8`,
      Main: `color:#68c4e8`,
      Background: `color:#60a5fa`,
      Canvas: `color:#a78bfa`,
      Palette: `color:#f472b6`,
      Song: `color:#34d399`,
      Settings: `color:#fbbf24`,
      Motion: `color:#22d3ee`,
      UI: `color:#c084fc`,
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
        `%c Luminous v2.2.3 %c by streetraceing `,
        `background:#1DB954;color:#000;padding:6px 12px;border-radius:8px 0 0 8px;font-weight:600;`,
        `background:#181818;color:#1DB954;padding:6px 12px;border-radius:0 8px 8px 0;font-weight:500;`,
      ),
        console.log(
          `%c build: 09/08/2026 03:01:32 UTC+03:00 `,
          `color:#888;font-size:12px;`,
        ));
    }
  },
  r = { status: `booting`, brokenSince: null },
  i = new Set();
function a() {
  return r;
}
function o(e) {
  let t = { ...r, ...e };
  (t.status === r.status && t.brokenSince === r.brokenSince) ||
    ((r = t), i.forEach((e) => c(e)));
}
function s(e) {
  return (
    i.add(e),
    c(e),
    () => {
      i.delete(e);
    }
  );
}
function c(e) {
  try {
    e(r);
  } catch (e) {
    n.error(`Main`, `UI health listener failed`, e);
  }
}
var l = class {
    static get() {
      let e = Luminous.Canvas.get(),
        t = Luminous.Song.getSync();
      return {
        luminous: {
          version: `2.2.3`,
          buildTime: `09/08/2026 03:01:32 UTC+03:00`,
        },
        runtime: {
          background: Luminous.Background.getType(),
          canvasMode: e.mode,
          canvasSource: e.source,
          track: t?.title ?? null,
          uiHealth: a().status,
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
        return (await navigator.clipboard.writeText(this.toText()), !0);
      } catch (e) {
        return (
          Luminous.Logger.warn(`Runtime`, `Failed to copy diagnostics`, e),
          !1
        );
      }
    }
  },
  u = class {
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
        Spicetify.Platform?.FocusMainWindowAPI?.focusMainWindow?.();
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
      let e = Spicetify.Platform?.ZoomAPI;
      if (!e?.getZoomLevel) return null;
      try {
        return await e.getZoomLevel();
      } catch (e) {
        return (
          Luminous.Logger.warn(`Runtime`, `Failed to read Spotify zoom`, e),
          null
        );
      }
    }
    static async setZoomLevel(e) {
      let t = Spicetify.Platform?.ZoomAPI;
      if (!t?.setZoomLevel || !this.getZoomCapabilities().canSetZoomLevel)
        return !1;
      try {
        return (await t.setZoomLevel(e), !0);
      } catch (e) {
        return (
          Luminous.Logger.warn(`Runtime`, `Failed to set Spotify zoom`, e),
          !1
        );
      }
    }
    static zoomIn() {
      this.getZoomCapabilities().canZoomIn &&
        Spicetify.Platform?.ZoomAPI?.zoomIn?.();
    }
    static zoomOut() {
      this.getZoomCapabilities().canZoomOut &&
        Spicetify.Platform?.ZoomAPI?.zoomOut?.();
    }
    static setWindowButtonsVisible(e) {
      Spicetify.Platform?.NativeAPI?.setWindowButtonsVisibility?.(e);
    }
    static async setFullscreen(e) {
      try {
        return (
          e
            ? await document.documentElement.requestFullscreen()
            : document.fullscreenElement && (await document.exitFullscreen()),
          !0
        );
      } catch (e) {
        return (
          Luminous.Logger.warn(
            `Runtime`,
            `Failed to change fullscreen state`,
            e,
          ),
          !1
        );
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
    static showToast(e, t) {
      Spicetify.Platform?.OSNotificationsAPI?.showToast?.(e, t);
    }
    static async getLogFolder() {
      let e = Spicetify.Platform?.DesktopLogsAPI;
      if (!e?.getLogFolder) return null;
      try {
        return await e.getLogFolder();
      } catch (e) {
        return (
          Luminous.Logger.warn(
            `Runtime`,
            `Failed to get Spotify log folder`,
            e,
          ),
          null
        );
      }
    }
    static async getVersionInfo() {
      let e = Spicetify.Platform?.UpdateAPI;
      if (!e?.getVersionInfo) return null;
      try {
        return await e.getVersionInfo();
      } catch (e) {
        return (
          Luminous.Logger.warn(
            `Runtime`,
            `Failed to get Spotify version info`,
            e,
          ),
          null
        );
      }
    }
  },
  d = `luminous-dynamic-palette`,
  f = [
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
  p = [
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
  m = 48,
  h = 24,
  g = 20,
  _ = class {
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
      let t = Number.isFinite(e) ? Math.min(48, Math.max(8, e)) : g;
      ((this.motionScale = t / g),
        this.currentProfile &&
          this.applyDurations(this.currentProfile.baseDurations));
    }
    static async applyFromImage(e) {
      if (!e) {
        this.clear();
        return;
      }
      if (e === this.source && document.documentElement.classList.contains(d))
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
      ((n.width = m), (n.height = m));
      let r = n.getContext(`2d`, { willReadFrequently: !0 });
      if (!r) throw Error(`Canvas context unavailable`);
      ((r.imageSmoothingEnabled = !0),
        (r.imageSmoothingQuality = `high`),
        r.drawImage(t, 0, 0, m, m));
      let i = r.getImageData(0, 0, m, m).data;
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
        ee = [T, E, D].reduce((e, t) =>
          this.relativeLuminance(t) > this.relativeLuminance(e) ? t : e,
        ),
        O = [T, E, D].reduce((e, t) =>
          this.relativeLuminance(t) < this.relativeLuminance(e) ? t : e,
        );
      return {
        primary: this.toHex(T),
        secondary: this.toHex(E),
        accent: this.toHex(D),
        light: this.toHex(
          this.mix(ee, { red: 255, green: 255, blue: 255 }, 0.34),
        ),
        dark: this.toHex(this.mix(O, { red: 0, green: 0, blue: 0 }, 0.62)),
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
      for (this.cache.set(e, t); this.cache.size > h;) {
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
        p.forEach((e) => t.classList.remove(e)),
        t.classList.add(
          `luminous-effect-${e.scene}`,
          `luminous-effect-energy-${e.energy}`,
          `luminous-effect-tone-${e.tone}`,
          d,
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
      (f.forEach((t) => {
        e.style.removeProperty(t);
      }),
        p.forEach((t) => e.classList.remove(t)),
        e.classList.remove(d));
    }
  },
  v = class {
    static STORAGE_KEY = `luminous-settings`;
    static PERSIST_DELAY_MS = 180;
    static registry = new Map();
    static values = new Map();
    static listeners = new Map();
    static savedValues = new Map();
    static persistTimer = null;
    static initialized = !1;
    static batchDepth = 0;
    static persistQueued = !1;
    static handlePageHide = () => {
      this.flushPersist();
    };
    static init() {
      this.initialized ||
        ((this.initialized = !0),
        this.savedValues.clear(),
        Object.entries(this.readSavedValues()).forEach(([e, t]) => {
          this.savedValues.set(e, t);
        }),
        this.registry.forEach((e, t) => {
          let n = this.normalizeValue(e, this.savedValues.get(t));
          (this.values.set(t, n),
            this.savedValues.set(t, n),
            this.apply(t, e, n));
        }),
        window.addEventListener(`pagehide`, this.handlePageHide),
        this.persistNow());
    }
    static destroy() {
      (this.persistTimer !== null &&
        (window.clearTimeout(this.persistTimer), (this.persistTimer = null)),
        this.initialized &&
          (this.persistNow(),
          window.removeEventListener(`pagehide`, this.handlePageHide)),
        this.listeners.clear(),
        this.values.clear(),
        this.savedValues.clear(),
        this.registry.clear(),
        (this.batchDepth = 0),
        (this.persistQueued = !1),
        (this.initialized = !1));
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
      return this.values.has(e)
        ? this.values.get(e)
        : this.registry.get(e)?.default;
    }
    static has(e) {
      return this.registry.has(e);
    }
    static set(e, t) {
      this.setInternal(e, t, !0);
    }
    static setMany(e) {
      this.batch(() => {
        Object.entries(e).forEach(([e, t]) => {
          this.setInternal(e, t, !0);
        });
      });
    }
    static reset(e) {
      let t = this.registry.get(e);
      t && this.set(e, t.default);
    }
    static resetMany(e) {
      this.batch(() => {
        e.forEach((e) => {
          let t = this.registry.get(e);
          t && this.setInternal(e, t.default, !0);
        });
      });
    }
    static resetAll() {
      this.resetMany([...this.registry.keys()]);
    }
    static snapshot() {
      let e = {};
      return (
        this.registry.forEach((t, n) => {
          e[n] = this.values.get(n) ?? t.default;
        }),
        e
      );
    }
    static subscribe(e, t, n = {}) {
      if ((this.getListeners(e).add(t), n.immediate)) {
        let n = this.values.get(e) ?? this.registry.get(e)?.default;
        n !== void 0 && this.callListener(e, t, n);
      }
      return () => {
        this.listeners.get(e)?.delete(t);
      };
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
    static setInternal(e, t, n) {
      let r = this.registry.get(e);
      if (!r) {
        Luminous.Logger.warn(`Settings`, `Unknown setting: ${e}`);
        return;
      }
      let i = this.normalizeValue(r, t);
      Object.is(this.values.get(e), i) ||
        (this.values.set(e, i),
        this.savedValues.set(e, i),
        this.apply(e, r, i),
        n && this.emit(e, i),
        this.schedulePersist());
    }
    static batch(e) {
      this.batchDepth++;
      try {
        e();
      } finally {
        (this.batchDepth--,
          this.batchDepth === 0 &&
            this.persistQueued &&
            ((this.persistQueued = !1), this.schedulePersist()));
      }
    }
    static readSavedValues() {
      try {
        let e = Spicetify.LocalStorage.get(this.STORAGE_KEY);
        if (!e) return {};
        let t = JSON.parse(e);
        if (typeof t == `object` && t && !Array.isArray(t)) return t;
      } catch (e) {
        Luminous.Logger.warn(`Settings`, `Failed to read saved settings`, e);
      }
      return {};
    }
    static normalizeValue(e, t) {
      let n = t ?? e.default;
      if (e.normalize)
        try {
          n = e.normalize(n);
        } catch (t) {
          return (
            Luminous.Logger.warn(
              `Settings`,
              `Failed to normalize setting value`,
              t,
            ),
            e.default
          );
        }
      return typeof n == typeof e.default &&
        (typeof n != `number` || Number.isFinite(n))
        ? n
        : (Luminous.Logger.warn(
            `Settings`,
            `Invalid setting value, using default`,
          ),
          e.default);
    }
    static apply(e, t, n) {
      try {
        t.apply?.(n);
      } catch (t) {
        Luminous.Logger.error(`Settings`, `Failed to apply setting: ${e}`, t);
      }
    }
    static schedulePersist() {
      if (this.batchDepth > 0) {
        this.persistQueued = !0;
        return;
      }
      (this.persistTimer !== null && window.clearTimeout(this.persistTimer),
        (this.persistTimer = window.setTimeout(() => {
          ((this.persistTimer = null), this.persistNow());
        }, this.PERSIST_DELAY_MS)));
    }
    static flushPersist() {
      (this.persistTimer !== null &&
        (window.clearTimeout(this.persistTimer), (this.persistTimer = null)),
        (this.persistQueued = !1),
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
          e[n] = this.values.get(n) ?? t.default;
        }));
      try {
        Spicetify.LocalStorage.set(this.STORAGE_KEY, JSON.stringify(e));
      } catch (e) {
        Luminous.Logger.error(`Settings`, `Failed to persist settings`, e);
      }
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
        Luminous.Logger.error(`Settings`, `Setting listener failed: ${e}`, t);
      }
    }
    static getListeners(e) {
      let t = this.listeners.get(e);
      return (t || ((t = new Set()), this.listeners.set(e, t)), t);
    }
  },
  y = class {
    static PLAYER_TIMEOUT_MESSAGE = `Spicetify Player not available`;
    static INITIAL_TRACK_SYNC_INTERVAL = 100;
    static current = null;
    static currentSignature = null;
    static listeners = new Map();
    static ready = !1;
    static eventsBound = !1;
    static initPromise = null;
    static initialTrackTimer = null;
    static readyPromise = Promise.resolve();
    static readyResolve = () => void 0;
    static handleSongChange = (e) => {
      let t = e;
      this.handleTrack(t?.data?.item ?? Spicetify.Player.data?.item ?? null);
    };
    static {
      this.resetReadyPromise();
    }
    static init(e = 15e3) {
      return this.eventsBound
        ? Promise.resolve()
        : ((this.initPromise ||= this.initialize(e).finally(() => {
            this.initPromise = null;
          })),
          this.initPromise);
    }
    static destroy() {
      if (this.eventsBound)
        try {
          Spicetify.Player.removeEventListener(
            `songchange`,
            this.handleSongChange,
          );
        } catch (e) {
          Luminous.Logger.warn(`Song`, `Failed to remove player listener`, e);
        }
      (this.initialTrackTimer !== null &&
        (window.clearTimeout(this.initialTrackTimer),
        (this.initialTrackTimer = null)),
        this.listeners.clear(),
        (this.current = null),
        (this.currentSignature = null),
        (this.ready = !1),
        (this.eventsBound = !1),
        (this.initPromise = null),
        this.resetReadyPromise());
    }
    static addEventListener(e, t) {
      (this.getListeners(e).add(t),
        !this.eventsBound &&
          !this.initPromise &&
          this.init().catch((e) => {
            Luminous.Logger.error(`Song`, `Initialization retry failed`, e);
          }),
        this.current &&
          (e === `change` || (e === `ready` && this.ready)) &&
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
    static getSync() {
      return this.current ? this.createPayload(this.current) : null;
    }
    static async initialize(e) {
      (await this.waitForPlayer(e),
        this.bindEvents(),
        this.syncCurrentTrack() || this.startInitialTrackSync(e));
    }
    static waitForPlayer(e) {
      return new Promise((t, n) => {
        let r = performance.now(),
          i = () => {
            if (
              typeof Spicetify < `u` &&
              typeof Spicetify.Player?.addEventListener == `function`
            ) {
              t();
              return;
            }
            if (performance.now() - r > e) {
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
        Spicetify.Player.addEventListener(`songchange`, this.handleSongChange));
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
            !(this.ready || this.syncCurrentTrack() || Date.now() >= t) &&
              (this.initialTrackTimer = window.setTimeout(
                n,
                this.INITIAL_TRACK_SYNC_INTERVAL,
              )));
        };
      n();
    }
    static waitForReady(e) {
      return this.ready
        ? Promise.resolve(!0)
        : e <= 0
          ? Promise.resolve(!1)
          : new Promise((t) => {
              let n = !1,
                r = (e) => {
                  n || ((n = !0), window.clearTimeout(i), t(e));
                },
                i = window.setTimeout(() => r(!1), e);
              this.readyPromise.then(() => r(!0));
            });
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
            Luminous.Logger.info(`Song`, `Ready`, this.createPayload(e)),
            this.emit(`ready`));
          return;
        }
        (Luminous.Logger.info(`Song`, `Changed`, this.createPayload(e)),
          this.emit(`change`));
      }
    }
    static createTrackSignature(e) {
      let t = e.artists?.map((e) => e.name).join(`|`) ?? ``,
        n = b(
          e.images?.[0]?.url ??
            e.album?.images?.[0]?.url ??
            e.metadata?.image_url ??
            null,
        );
      return `${e.uri}\u0000${e.name}\u0000${t}\u0000${n ?? ``}`;
    }
    static createPayload(e) {
      let t = e.artists?.map((e) => e.name) ?? [],
        n = b(
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
    static resetReadyPromise() {
      this.readyPromise = new Promise((e) => {
        this.readyResolve = e;
      });
    }
  };
function b(e) {
  if (!e) return null;
  if (e.startsWith(`spotify:image:`)) {
    let t = e.slice(14);
    return t ? `https://i.scdn.co/image/${t}` : null;
  }
  return e;
}
function x() {
  let e = window.Luminous;
  if (typeof e?.destroy == `function`)
    try {
      e.destroy();
    } catch (e) {
      console.warn(`[Luminous] Failed to clean previous runtime`, e);
    }
}
function S(r) {
  Object.defineProperty(window, 'Luminous', {
    value: {
      Background: e,
      Canvas: t,
      Diagnostics: l,
      Song: y,
      Native: u,
      Palette: _,
      Settings: v,
      Logger: n,
      destroy: r,
      version: `2.2.3`,
    },
    configurable: !0,
  });
}
function C() {
  return Spicetify.React;
}
function w() {
  return C().useEffect;
}
function T() {
  return C().useMemo;
}
function E() {
  return C().useRef;
}
function D() {
  return C().useState;
}
function ee() {
  let e = w(),
    t = T(),
    n = D(),
    [r, i] = n(() => Luminous.Song.getSync()),
    [o, c] = n(() => Luminous.Canvas.get()),
    [l, u] = n(() => Luminous.Settings.get(`dynamicBackground`) !== !1),
    [d, f] = n(() => Luminous.Settings.get(`dynamicPalette`) !== !1),
    [p, m] = n(() => a().status !== `booting`),
    h = t(
      () =>
        p
          ? l
            ? o.video
              ? `canvas:${o.source ?? ``}:${o.revision}:${r?.image ?? ``}`
              : r?.image
                ? `image:${r.image}`
                : `empty`
            : `disabled`
          : `inactive`,
      [p, o, l, r?.image],
    );
  return (
    e(() => {
      let e = r ? `${r.uri}\u0000${r.image ?? ``}` : null,
        t = `${o.mode ?? ``}\u0000${o.source ?? ``}\u0000${o.revision}`,
        n = o.video,
        a = (t) => {
          let n = `${t.uri}\u0000${t.image ?? ``}`;
          e !== n &&
            ((e = n),
            Luminous.Palette.cancel(),
            Luminous.Background.preloadImage(t.image),
            i(t));
        },
        l = (e) => {
          let r = `${e.mode ?? ``}\u0000${e.source ?? ``}\u0000${e.revision}`;
          (t === r && n === e.video) || ((t = r), (n = e.video), c(e));
        };
      (Luminous.Song.addEventListener(`ready`, a),
        Luminous.Song.addEventListener(`change`, a),
        Luminous.Canvas.addEventListener(`mount`, l),
        Luminous.Canvas.addEventListener(`change`, l),
        Luminous.Canvas.addEventListener(`unmount`, l));
      let d = s((e) => {
          m(e.status !== `booting`);
        }),
        p = Luminous.Settings.subscribe(
          `dynamicBackground`,
          (e) => u(e !== !1),
          { immediate: !0 },
        ),
        h = Luminous.Settings.subscribe(`dynamicPalette`, (e) => f(e !== !1), {
          immediate: !0,
        });
      return () => {
        (Luminous.Song.removeEventListener(`ready`, a),
          Luminous.Song.removeEventListener(`change`, a),
          Luminous.Canvas.removeEventListener(`mount`, l),
          Luminous.Canvas.removeEventListener(`change`, l),
          Luminous.Canvas.removeEventListener(`unmount`, l),
          d(),
          p(),
          h(),
          Luminous.Background.destroy(),
          Luminous.Palette.clear());
      };
    }, []),
    e(() => {
      if (!p || !l || !d) {
        Luminous.Palette.clear();
        return;
      }
      Luminous.Palette.applyFromImage(r?.image);
    }, [p, d, l, r?.image]),
    e(() => {
      if (!p) {
        Luminous.Background.destroy();
        return;
      }
      if (!l) {
        Luminous.Background.clear();
        return;
      }
      if (o.video) {
        Luminous.Background.render({
          canvas: o.video,
          canvasSource: o.source,
          canvasMode: o.mode,
          image: r?.image,
        });
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
var O = 600,
  te = 2600,
  ne = 1500,
  re = `.Root__top-container #main-view`,
  ie = Date.now();
function ae() {
  let e = C(),
    t = w(),
    n = T(),
    r = E(),
    i = D(),
    [o, c] = i(() => k()),
    [l, u] = i(!0),
    [d, f] = i(() => a()),
    [p, m] = i(() => Date.now()),
    h = r(o ? ie : null),
    g = r(!1);
  (t(() => s(f), []),
    t(() => {
      let e = null,
        t = () => {
          ((e = null), c(k()));
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
      if (!o || g.current) return;
      h.current === null && (h.current = Date.now());
      let e = Date.now() - h.current,
        t = d.status === `ready` ? O : te,
        n = Math.max(0, t - e),
        r = window.setTimeout(() => {
          ((g.current = !0), u(!1));
        }, n);
      return () => window.clearTimeout(r);
    }, [d.status, o]),
    t(() => {
      if (!o || !l || d.status !== `waiting`) return;
      let e = window.setInterval(() => {
        m(Date.now());
      }, 250);
      return () => window.clearInterval(e);
    }, [d.status, o, l]));
  let _ = n(
      () =>
        d.status === `waiting` && d.brokenSince
          ? `Waiting for Spotify UI... (${oe(p - d.brokenSince)})`
          : d.status === `ready`
            ? `Welcome back. Lighting up Spotify...`
            : `Starting Luminous...`,
      [d.brokenSince, d.status, p],
    ),
    v =
      d.status === `waiting` &&
      d.brokenSince !== null &&
      p - d.brokenSince >= ne;
  return o
    ? e.createElement(
        `div`,
        {
          className: `luminous-splash${l ? `` : ` luminous-splash--hidden`}`,
          'aria-hidden': l ? `false` : `true`,
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
            e.createElement(`small`, null, _),
          ),
          e.createElement(
            `div`,
            { className: `luminous-splash__loader` },
            e.createElement(`span`),
          ),
          v &&
            e.createElement(
              `div`,
              { className: `luminous-splash__hint` },
              `Spotify is taking longer than expected. The splash will close automatically.`,
            ),
        ),
      )
    : null;
}
function k() {
  return document.querySelector(re) !== null;
}
function oe(e) {
  return `${Math.max(0, Math.floor(e / 1e3))}s`;
}
var A = [`still`, `drift`, `float`],
  j = [`auto`, `artwork`],
  M = (e, t, n) => (r) => {
    if (
      (typeof r != `number` && typeof r != `string`) ||
      (typeof r == `string` && r.trim() === ``)
    )
      return e;
    let i = typeof r == `number` ? r : Number(r);
    return Number.isFinite(i) ? Math.min(n, Math.max(t, i)) : e;
  },
  N = (e) => (t) => (typeof t == `boolean` ? t : e),
  P = (e, t) => (n) => (typeof n == `string` && e.includes(n) ? n : t),
  F = (e, t, n) => {
    t.forEach((t) => {
      Luminous.Settings.toggleClass(`${e}${t}`, t === n);
    });
  },
  se = {
    backgroundBlur: {
      default: 24,
      normalize: M(24, 0, 48),
      apply: (e) =>
        Luminous.Settings.setVar(`--luminous-background-blur`, `${e}px`),
    },
    backgroundBrightness: {
      default: 75,
      normalize: M(75, 30, 120),
      apply: (e) =>
        Luminous.Settings.setVar(
          `--luminous-background-brightness`,
          String(e / 100),
        ),
    },
    uiBlur: {
      default: 16,
      normalize: M(16, 0, 32),
      apply: (e) => Luminous.Settings.setVar(`--luminous-ui-blur`, `${e}px`),
    },
    paletteStrength: {
      default: 24,
      normalize: M(24, 0, 50),
      apply: (e) => {
        let t = Math.min(78, Math.round(e * 1.6));
        Luminous.Settings.setVar(`--luminous-palette-effect-opacity`, `${t}%`);
      },
    },
    backgroundEnergy: { default: `adaptive`, normalize: () => `adaptive` },
    uiOpacity: {
      default: 50,
      normalize: M(50, 0, 100),
      apply: (e) => {
        if (Luminous.Settings.get(`dynamicBackground`) === !1) {
          Luminous.Settings.removeVar(`--luminous-ui-opacity`);
          return;
        }
        Luminous.Settings.setVar(`--luminous-ui-opacity`, `${e}%`);
      },
    },
    dynamicBackground: {
      default: !0,
      normalize: N(!0),
      apply: (e) => {
        if ((Luminous.Settings.toggleClass(`hideDynamicBackground`, !e), e)) {
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
    },
    backgroundSource: {
      default: `auto`,
      normalize: P(j, `auto`),
      apply: (e) => {
        (F(`luminous-source-`, j, e), Luminous.Canvas.setEnabled(e === `auto`));
      },
    },
    dynamicPalette: {
      default: !0,
      normalize: N(!0),
      apply: (e) => {
        e || Luminous.Palette.clear();
      },
    },
    backgroundMotion: {
      default: `drift`,
      normalize: P(A, `drift`),
      apply: (e) => F(`luminous-motion-`, A, e),
    },
    motionDuration: {
      default: 20,
      normalize: M(20, 8, 60),
      apply: (e) => {
        (Luminous.Settings.setVar(`--luminous-motion-duration`, `${e}s`),
          Luminous.Palette.setMotionDuration(e));
      },
    },
    reduceMotion: {
      default: !1,
      normalize: N(!1),
      apply: (e) => Luminous.Settings.toggleClass(`luminous-reduce-motion`, e),
    },
  },
  I = [
    {
      key: `dynamicBackground`,
      label: `Dynamic background`,
      description: `Use artwork or Spotify video behind the interface.`,
      section: `appearance`,
      control: `toggle`,
    },
    {
      key: `backgroundSource`,
      label: `Background source`,
      description: `Prefer Spotify video automatically, or always use artwork.`,
      section: `appearance`,
      control: `choice`,
      options: [
        { value: `auto`, label: `Auto` },
        { value: `artwork`, label: `Artwork` },
      ],
    },
    {
      key: `dynamicPalette`,
      label: `Adaptive effects`,
      description: `Build a colour scene automatically from each track cover.`,
      section: `appearance`,
      control: `toggle`,
    },
    {
      key: `backgroundBlur`,
      label: `Background blur`,
      description: `Softens artwork and video behind Spotify.`,
      section: `appearance`,
      control: `range`,
      min: 0,
      max: 48,
      step: 1,
      unit: `px`,
    },
    {
      key: `backgroundBrightness`,
      label: `Background brightness`,
      description: `Controls how prominent the media remains.`,
      section: `appearance`,
      control: `range`,
      min: 30,
      max: 120,
      step: 1,
      unit: `%`,
    },
    {
      key: `uiOpacity`,
      label: `Surface opacity`,
      description: `Sets the density of translucent Spotify surfaces.`,
      section: `appearance`,
      control: `range`,
      min: 0,
      max: 100,
      step: 1,
      unit: `%`,
    },
    {
      key: `uiBlur`,
      label: `Surface blur`,
      description: `Controls the glass blur applied to interface surfaces.`,
      section: `appearance`,
      control: `range`,
      min: 0,
      max: 32,
      step: 1,
      unit: `px`,
    },
    {
      key: `paletteStrength`,
      label: `Effect intensity`,
      description: `Controls how strongly adaptive light appears.`,
      section: `appearance`,
      control: `range`,
      min: 0,
      max: 50,
      step: 1,
      unit: `%`,
    },
    {
      key: `backgroundMotion`,
      label: `Background movement`,
      description: `Choose the stable media/light motion path.`,
      section: `motion`,
      control: `choice`,
      options: [
        { value: `still`, label: `Still` },
        { value: `drift`, label: `Drift` },
        { value: `float`, label: `Float` },
      ],
    },
    {
      key: `motionDuration`,
      label: `Motion speed`,
      description: `Scales media movement and adaptive scene tempo.`,
      section: `motion`,
      control: `range`,
      min: 8,
      max: 60,
      step: 1,
      unit: `s`,
    },
    {
      key: `reduceMotion`,
      label: `Reduce motion`,
      description: `Stops Luminous animation regardless of system preference.`,
      section: `motion`,
      control: `toggle`,
    },
  ],
  ce = [
    {
      id: `balanced`,
      label: `Balanced`,
      description: `Stable default balance of clarity, colour, and motion.`,
      values: {
        dynamicBackground: !0,
        backgroundSource: `auto`,
        dynamicPalette: !0,
        backgroundBlur: 24,
        backgroundBrightness: 75,
        uiOpacity: 50,
        uiBlur: 16,
        paletteStrength: 24,
        backgroundMotion: `drift`,
        motionDuration: 20,
      },
    },
    {
      id: `cinematic`,
      label: `Cinematic`,
      description: `Brighter media and stronger colour without extra compositor layers.`,
      values: {
        dynamicBackground: !0,
        backgroundSource: `auto`,
        dynamicPalette: !0,
        backgroundBlur: 16,
        backgroundBrightness: 88,
        uiOpacity: 38,
        uiBlur: 20,
        paletteStrength: 36,
        backgroundMotion: `float`,
        motionDuration: 26,
      },
    },
    {
      id: `calm`,
      label: `Calm`,
      description: `Artwork-only mode with soft lighting and no movement.`,
      values: {
        dynamicBackground: !0,
        backgroundSource: `artwork`,
        dynamicPalette: !0,
        backgroundBlur: 36,
        backgroundBrightness: 62,
        uiOpacity: 68,
        uiBlur: 18,
        paletteStrength: 14,
        backgroundMotion: `still`,
      },
    },
    {
      id: `performance`,
      label: `Performance`,
      description: `Artwork-only mode with minimal motion and lower glass cost.`,
      values: {
        dynamicBackground: !0,
        backgroundSource: `artwork`,
        dynamicPalette: !0,
        backgroundBlur: 18,
        backgroundBrightness: 72,
        uiOpacity: 72,
        uiBlur: 10,
        paletteStrength: 10,
        backgroundMotion: `still`,
      },
    },
  ];
function le() {
  Object.entries(se).forEach(([e, t]) => {
    Luminous.Settings.register(e, t);
  });
}
var ue = `Luminous Settings`,
  de = `brightness`,
  L = `luminous-theme-modal`,
  R = `luminous-theme-modal-title`,
  z = `luminous-theme-modal-description`,
  fe = [
    `button:not([disabled])`,
    `input:not([disabled])`,
    `[href]`,
    `[tabindex]:not([tabindex="-1"])`,
  ].join(`,`),
  B = [
    { id: `presets`, label: `Presets` },
    { id: `appearance`, label: `Appearance` },
    { id: `motion`, label: `Motion` },
    { id: `advanced`, label: `Advanced` },
  ],
  pe = 32,
  me = I.map((e) => e.key);
function he() {
  let e = C(),
    t = w(),
    n = E(),
    r = D(),
    i = n(null),
    [a, o] = r(!1);
  return (
    t(() => {
      let e = !1,
        t = null,
        n = () => {
          if (((t = null), e || i.current)) return;
          if (!Spicetify.Menu?.Item) {
            t = window.setTimeout(n, 250);
            return;
          }
          let r = new Spicetify.Menu.Item(ue, !1, () => o(!0), de);
          (r.register(), (i.current = r));
        };
      return (
        n(),
        () => {
          ((e = !0),
            t !== null && window.clearTimeout(t),
            i.current?.deregister(),
            (i.current = null));
        }
      );
    }, []),
    a ? e.createElement(ge, { onClose: () => o(!1) }) : null
  );
}
function ge({ onClose: e }) {
  let t = C(),
    n = w(),
    r = E(),
    i = D(),
    a = r(null),
    o = r(null),
    s = r({ presets: null, appearance: null, motion: null, advanced: null }),
    [c, l] = i(`appearance`),
    u = (e, t = !1) => {
      e !== c &&
        (l(e), t && requestAnimationFrame(() => s.current[e]?.focus()));
    };
  (n(() => {
    let e = document.body.style.overflow,
      t = document.activeElement,
      n = document.documentElement,
      r = requestAnimationFrame(() => o.current?.focus());
    return (
      (document.body.style.overflow = `hidden`),
      n.classList.add(`luminous-settings-open`),
      () => {
        (cancelAnimationFrame(r),
          (document.body.style.overflow = e),
          n.classList.remove(`luminous-settings-open`),
          t?.focus?.());
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
        let n = Array.from(a.current?.querySelectorAll(fe) ?? []).filter(
          (e) => e.offsetParent !== null,
        );
        if (!n.length) {
          t.preventDefault();
          return;
        }
        let r = n[0],
          i = n[n.length - 1];
        t.shiftKey && document.activeElement === r
          ? (t.preventDefault(), i.focus())
          : !t.shiftKey &&
            document.activeElement === i &&
            (t.preventDefault(), r.focus());
      };
      return (
        document.addEventListener(`keydown`, t, !0),
        () => document.removeEventListener(`keydown`, t, !0)
      );
    }, [e]));
  let d = (e, t) => {
    let n = B.findIndex((e) => e.id === t),
      r = null;
    (e.key === `ArrowRight` && (r = (n + 1) % B.length),
      e.key === `ArrowLeft` && (r = (n - 1 + B.length) % B.length),
      e.key === `Home` && (r = 0),
      e.key === `End` && (r = B.length - 1),
      r !== null && (e.preventDefault(), u(B[r].id, !0)));
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
        id: L,
        className: `luminous-theme-menu`,
        role: `dialog`,
        'aria-modal': `true`,
        'aria-labelledby': R,
        'aria-describedby': z,
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
          t.createElement(`span`, { id: R }, `Luminous`),
          t.createElement(
            `small`,
            { id: z },
            `Theme preferences · v${Luminous.version}`,
          ),
        ),
        t.createElement(
          `button`,
          {
            className: `luminous-theme-menu__reset-button`,
            type: `button`,
            onClick: () => {
              (Luminous.Settings.resetMany(me),
                Spicetify.showNotification(`Luminous settings reset`));
            },
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
        B.map((e) =>
          t.createElement(
            `button`,
            {
              key: e.id,
              ref: (t) => {
                s.current[e.id] = t;
              },
              id: `${L}-${e.id}-tab`,
              className: `luminous-theme-menu__tab${c === e.id ? ` luminous-theme-menu__tab--active` : ``}`,
              type: `button`,
              role: `tab`,
              tabIndex: c === e.id ? 0 : -1,
              'aria-selected': String(c === e.id),
              'aria-controls': `${L}-${e.id}-panel`,
              onClick: () => u(e.id),
              onKeyDown: (t) => d(t, e.id),
            },
            e.label,
          ),
        ),
      ),
      t.createElement(
        `div`,
        {
          id: `${L}-${c}-panel`,
          className: `luminous-theme-menu__panel`,
          role: `tabpanel`,
          'aria-labelledby': `${L}-${c}-tab`,
        },
        t.createElement(
          `div`,
          { key: c, className: `luminous-theme-menu__panel-content` },
          t.createElement(ve, { section: c }),
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
function _e() {
  let e = C();
  return e.createElement(
    e.Fragment,
    null,
    e.createElement(
      `div`,
      { className: `luminous-theme-menu__panel-heading` },
      e.createElement(`h2`, null, `Presets`),
      e.createElement(
        `p`,
        null,
        `Apply a complete visual and performance profile in one click.`,
      ),
    ),
    e.createElement(
      `div`,
      { className: `luminous-theme-menu__preset-grid` },
      ce.map((t) =>
        e.createElement(
          `button`,
          {
            key: t.id,
            type: `button`,
            className: `luminous-theme-menu__preset-card`,
            onClick: () => {
              (Luminous.Settings.setMany(t.values),
                Spicetify.showNotification(`Luminous preset: ${t.label}`));
            },
          },
          e.createElement(`strong`, null, t.label),
          e.createElement(`small`, null, t.description),
          e.createElement(`span`, { 'aria-hidden': `true` }, `Apply`),
        ),
      ),
    ),
  );
}
function ve({ section: e }) {
  let t = C();
  if (e === `presets`) return t.createElement(_e);
  let n = {
      appearance: {
        title: `Appearance`,
        description: `Shape artwork, adaptive colour, and Spotify glass surfaces.`,
      },
      motion: {
        title: `Motion`,
        description: `Tune movement, transitions, pointer depth, and accessibility.`,
      },
      advanced: {
        title: `Advanced`,
        description: `Control rendering cost and inspect the current runtime.`,
      },
    }[e],
    r = I.filter((t) => t.section === e);
  return t.createElement(
    t.Fragment,
    null,
    t.createElement(
      `div`,
      { className: `luminous-theme-menu__panel-heading` },
      t.createElement(`h2`, null, n.title),
      t.createElement(`p`, null, n.description),
    ),
    r.map((e) => t.createElement(ye, { key: e.key, setting: e })),
    e === `advanced` && t.createElement(Ce),
  );
}
function ye({ setting: e }) {
  return e.control === `toggle`
    ? C().createElement(be, { setting: e })
    : e.control === `range`
      ? C().createElement(xe, { setting: e })
      : C().createElement(Se, { setting: e });
}
function be({ setting: e }) {
  let t = C(),
    n = w(),
    [r, i] = D()(() => Luminous.Settings.get(e.key) === !0);
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
      t.createElement(V, { setting: e }),
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
function xe({ setting: e }) {
  let t = C(),
    n = w(),
    r = E(),
    [i, a] = D()(() => Number(Luminous.Settings.get(e.key))),
    o = r(i),
    s = r(null),
    c = () => {
      (s.current !== null &&
        (window.clearTimeout(s.current), (s.current = null)),
        Luminous.Settings.set(e.key, o.current));
    },
    l = (t) => {
      ((o.current = t),
        a(t),
        s.current === null &&
          (s.current = window.setTimeout(() => {
            ((s.current = null), Luminous.Settings.set(e.key, o.current));
          }, pe)));
    };
  return (
    n(
      () =>
        Luminous.Settings.subscribe(
          e.key,
          (e) => {
            let t = Number(e);
            ((o.current = t), a(t));
          },
          { immediate: !0 },
        ),
      [e.key],
    ),
    n(
      () => () => {
        s.current !== null &&
          (window.clearTimeout(s.current),
          Luminous.Settings.set(e.key, o.current));
      },
      [e.key],
    ),
    t.createElement(
      `label`,
      { className: `luminous-theme-menu__row luminous-theme-menu__range` },
      t.createElement(
        `span`,
        { className: `luminous-theme-menu__range-header` },
        t.createElement(V, { setting: e }),
        t.createElement(`strong`, null, `${i}${e.unit ?? ``}`),
      ),
      t.createElement(
        `span`,
        { className: `luminous-theme-menu__range-control` },
        t.createElement(`input`, {
          type: `range`,
          min: e.min,
          max: e.max,
          step: e.step,
          value: i,
          onInput: (e) => l(Number(e.currentTarget.value)),
          onPointerUp: c,
          onKeyUp: c,
          onBlur: c,
        }),
      ),
    )
  );
}
function Se({ setting: e }) {
  let t = C(),
    n = w(),
    [r, i] = D()(() => String(Luminous.Settings.get(e.key)));
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
      t.createElement(V, { setting: e }),
      t.createElement(
        `div`,
        {
          className: `luminous-theme-menu__choices`,
          role: `group`,
          'aria-label': e.label,
        },
        e.options?.map((n) =>
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
function V({ setting: e }) {
  let t = C();
  return t.createElement(
    `span`,
    { className: `luminous-theme-menu__copy` },
    t.createElement(`span`, null, e.label),
    t.createElement(`small`, null, e.description),
  );
}
function Ce() {
  let e = C(),
    t = w(),
    [n, r] = D()(() => H());
  return (
    t(() => {
      let e = () => r(H());
      return (
        Luminous.Background.addEventListener(`change`, e),
        Luminous.Canvas.addEventListener(`mount`, e),
        Luminous.Canvas.addEventListener(`change`, e),
        Luminous.Canvas.addEventListener(`unmount`, e),
        Luminous.Song.addEventListener(`change`, e),
        () => {
          (Luminous.Background.removeEventListener(`change`, e),
            Luminous.Canvas.removeEventListener(`mount`, e),
            Luminous.Canvas.removeEventListener(`change`, e),
            Luminous.Canvas.removeEventListener(`unmount`, e),
            Luminous.Song.removeEventListener(`change`, e));
        }
      );
    }, []),
    e.createElement(
      `div`,
      { className: `luminous-theme-menu__runtime` },
      e.createElement(
        `div`,
        { className: `luminous-theme-menu__runtime-copy` },
        e.createElement(`strong`, null, `Runtime`),
        e.createElement(`small`, null, n),
      ),
      e.createElement(
        `button`,
        {
          type: `button`,
          className: `luminous-theme-menu__tool-button`,
          onClick: async () => {
            let e = await Luminous.Diagnostics.copy();
            Spicetify.showNotification(
              e ? `Luminous diagnostics copied` : `Could not copy diagnostics`,
              !e,
            );
          },
        },
        `Copy diagnostics`,
      ),
    )
  );
}
function H() {
  let e = Luminous.Diagnostics.get(),
    t = e.runtime.canvasMode ?? `none`;
  return `Background: ${e.runtime.background} · Canvas: ${t} · UI: ${e.runtime.uiHealth}`;
}
var U = `luminous-playlist-background`,
  W = `--luminous-playlist-background-image`,
  G = `luminous-home-header-height`,
  K = `--luminous-home-header-height`,
  q = class {
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
          (s.classList.remove(U),
          s.style.removeProperty(W),
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
            r.classList.add(U),
            r.style.setProperty(W, i),
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
          (s.classList.remove(G),
          s.style.removeProperty(K),
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
            n.classList.add(G),
            n.style.setProperty(K, `${a}px`),
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
      function s() {
        return !!(
          document.querySelector(`.Root__main-view`) ||
          document.querySelector(`.main-view-container`) ||
          document.querySelector(`[data-testid="main-view"]`)
        );
      }
      function c() {
        r ||
          t !== null ||
          (t = requestAnimationFrame(() => {
            ((t = null), l());
          }));
      }
      function l() {
        if (!a()) {
          ((i = null), o({ status: `booting`, brokenSince: null }));
          return;
        }
        if (s()) {
          ((i = null), o({ status: `ready`, brokenSince: null }));
          return;
        }
        (i === null &&
          ((i = Date.now()), n.info(`Main`, `Waiting for Spotify UI mount...`)),
          o({ status: `waiting`, brokenSince: i }));
      }
      return (
        (e = new MutationObserver(c)),
        e.observe(document.documentElement, { subtree: !0, childList: !0 }),
        c(),
        {
          disconnect() {
            ((r = !0),
              e?.disconnect(),
              (e = null),
              t !== null && (cancelAnimationFrame(t), (t = null)),
              (i = null),
              o({ status: `booting`, brokenSince: null }));
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
function we() {
  return (
    w()(() => {
      let e = [
        q.uiMountWatcher(),
        q.observeCinema(),
        q.playlistBackground(),
        q.homeHeaderHeight(),
      ];
      return () => {
        e.forEach((e) => e.disconnect());
      };
    }, []),
    null
  );
}
function Te() {
  let e = C();
  return e.createElement(
    e.Fragment,
    null,
    e.createElement(ae),
    e.createElement(we),
    e.createElement(ee),
    e.createElement(he),
  );
}
var J = `luminous-react-root`,
  Ee = 15e3,
  Y = null,
  X = 0,
  Z = null;
function De() {
  let e = ++X;
  (Q(),
    Ae(e)
      .then(() => {
        e === X && ke();
      })
      .catch((t) => {
        e === X &&
          Luminous.Logger.error(`Runtime`, `Failed to mount application`, t);
      }));
}
function Oe() {
  if ((X++, Q(), Y?.unmount)) (Y.unmount(), (Y = null));
  else if (typeof Spicetify < `u` && Spicetify.ReactDOM) {
    let e = document.getElementById(J);
    e &&
      Spicetify.ReactDOM.unmountComponentAtNode &&
      Spicetify.ReactDOM.unmountComponentAtNode(e);
  }
  document.getElementById(J)?.remove();
}
function ke() {
  let e = C(),
    { ReactDOM: t } = Spicetify,
    n = je(),
    r = e.createElement(Te);
  if (t.createRoot) {
    let e = Y ?? t.createRoot(n);
    ((Y = e), e.render(r));
    return;
  }
  t.render(r, n);
}
function Ae(e) {
  return new Promise((t, n) => {
    let r = performance.now(),
      i = () => {
        if (((Z = null), e !== X)) {
          n(Error(`Luminous mount superseded`));
          return;
        }
        if (
          typeof Spicetify < `u` &&
          Spicetify.React &&
          Spicetify.ReactDOM &&
          document.body
        ) {
          t();
          return;
        }
        if (performance.now() - r > Ee) {
          n(Error(`Spicetify React runtime not available`));
          return;
        }
        Z = requestAnimationFrame(i);
      };
    i();
  });
}
function Q() {
  Z !== null && (cancelAnimationFrame(Z), (Z = null));
}
function je() {
  let e = document.getElementById(J);
  return (
    e ||
      ((e = document.createElement(`div`)),
      (e.id = J),
      (e.style.display = `contents`),
      document.body.appendChild(e)),
    e
  );
}
var Me =
    `luminous-runtime-active.hideDynamicBackground.luminous-dynamic-palette.luminous-palette-transitioning.luminous-track-changing.luminous-glass-highlights.luminous-reduce-motion.luminous-runtime-suspended.luminous-settings-open.luminous-parallax-enabled.luminous-source-auto.luminous-source-artwork.luminous-motion-still.luminous-motion-drift.luminous-motion-float.luminous-motion-orbit.luminous-quality-full.luminous-quality-balanced.luminous-quality-lite.luminous-effect-aurora.luminous-effect-ember.luminous-effect-bloom.luminous-effect-prism.luminous-effect-halo.luminous-effect-nebula.luminous-effect-energy-soft.luminous-effect-energy-flow.luminous-effect-energy-vivid.luminous-effect-tone-dark.luminous-effect-tone-balanced.luminous-effect-tone-light`.split(
      `.`,
    ),
  Ne = [
    `--luminous-background`,
    `--luminous-background-blur`,
    `--luminous-background-brightness`,
    `--luminous-ui-opacity`,
    `--luminous-ui-blur`,
    `--luminous-ui-base`,
    `--luminous-palette-effect-opacity`,
    `--luminous-motion-duration`,
    `--luminous-transition-duration`,
    `--luminous-vignette-opacity`,
    `--luminous-grain-opacity`,
    `--luminous-parallax-strength`,
    `--luminous-parallax-x`,
    `--luminous-parallax-y`,
  ],
  $ = !1;
function Pe() {
  if ($) return;
  (($ = !0),
    Oe(),
    Luminous.Background.destroy(),
    Luminous.Palette.clear(),
    Luminous.Canvas.destroy(),
    Luminous.Song.destroy(),
    Luminous.Settings.destroy());
  let e = document.documentElement;
  (Me.forEach((t) => e.classList.remove(t)),
    Ne.forEach((t) => e.style.removeProperty(t)),
    Luminous.Logger.info(`Runtime`, `Destroyed`));
}
function Fe() {
  (($ = !1), document.documentElement.classList.add(`luminous-runtime-active`));
}
(x(),
  S(Pe),
  Fe(),
  Luminous.Logger.printBanner(),
  le(),
  Luminous.Settings.init(),
  Luminous.Song.init().catch((e) => {
    Luminous.Logger.error(`Song`, `Initialization failed`, e);
  }),
  De());
