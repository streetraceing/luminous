var e = `[data-npv-root]`,
  t = `[data-canvas-surface="true"]`,
  n = `.canvasVideoContainerNPV`,
  r = [
    `${e} ${t} video`,
    `#Desktop_PanelContainer_Id ${t} video`,
    `${n} video`,
  ].join(`,`),
  i = `[data-testid="video-player-npv"]`,
  a = `[data-video-container="true"]`,
  o = [
    `${i} video`,
    `${e} ${a} video`,
    `#Desktop_PanelContainer_Id ${a} video`,
  ].join(`,`),
  s = `${e} video, #Desktop_PanelContainer_Id video`,
  c = [
    `#main-view`,
    `[data-testid="main-view"]`,
    `#Desktop_PanelContainer_Id`,
    e,
    i,
    t,
    n,
    `.main-nowPlayingBar-container`,
    `#luminous-dynamic-background`,
  ].join(`,`);
function l(e) {
  return (
    e.closest(`#Desktop_PanelContainer_Id`) ??
    e.closest(`[data-npv-root]`) ??
    e.closest(`[data-testid="video-player-npv"]`)
  );
}
var u = class {
    static TRANSITION_MS = 250;
    static MAX_PRELOADED_IMAGES = 24;
    static root = null;
    static base = null;
    static mediaStage = null;
    static imageLayers = null;
    static activeImage = 0;
    static imageRenderId = 0;
    static cancelImageLoad = null;
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
    static directVideoSlots = new Map();
    static directVideoPlaceholders = new Map();
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
      let t = (e) => {
          let t = document.createElement(`span`);
          t.className = e;
          let n = document.createElement(`span`);
          return (
            (n.className = `luminous-background-surface`),
            t.append(n),
            t
          );
        },
        n = t(`luminous-background-mesh`),
        r = t(`luminous-background-halo`),
        i = [`one`, `two`].map((e) =>
          t(`luminous-background-ribbon luminous-background-ribbon--${e}`),
        ),
        a = [`one`, `two`, `three`, `four`].map((e) =>
          t(`luminous-background-blob luminous-background-blob--${e}`),
        );
      return (e.append(n, r, ...i, ...a), e);
    }
    static ensureBackground() {
      if (this.root?.isConnected) return;
      (this.restoreAllDirectVideos(),
        this.cancelVideoCleanup(),
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
          contain: `layout paint style`,
        }),
        (this.base = document.createElement(`div`)),
        (this.base.className = `luminous-base`),
        Object.assign(this.base.style, {
          position: `absolute`,
          inset: `0`,
          background: `var(--spice-sidebar)`,
          transition: `opacity ${this.TRANSITION_MS}ms linear`,
          opacity: `1`,
        }),
        (this.mediaStage = document.createElement(`div`)),
        (this.mediaStage.className = `luminous-background-media-stage`),
        Object.assign(this.mediaStage.style, {
          position: `absolute`,
          inset: `0`,
          pointerEvents: `none`,
        }));
      let e = this.createImageLayer(),
        t = this.createImageLayer(),
        n = this.createVideoLayer(),
        r = this.createVideoLayer(),
        i = this.createEffectsLayer();
      (this.mediaStage.append(e, t, n, r),
        this.root.append(this.base, this.mediaStage, i),
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
      let t = this.invalidateImageRender(),
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
            this.waitForImageReady(i).then((n) => {
              !n ||
                t !== this.imageRenderId ||
                requestAnimationFrame(() => {
                  t === this.imageRenderId &&
                    (this.transitionTo(`image`, i),
                    Luminous.Logger.info(
                      `Background`,
                      `Rendering image layer`,
                      e,
                    ));
                });
            }));
        };
      if (a.complete && a.naturalWidth > 0) {
        o();
        return;
      }
      let s = () => {
          (a.removeEventListener(`load`, c),
            a.removeEventListener(`error`, l),
            this.cancelImageLoad === s && (this.cancelImageLoad = null));
        },
        c = () => {
          (s(), o());
        },
        l = () => {
          if ((s(), t === this.imageRenderId)) {
            if (
              (Luminous.Logger.warn(`Background`, `Failed to load image`, e),
              this.currentType === `image` && r.complete && r.naturalWidth > 0)
            ) {
              this.transitionTo(`image`, r);
              return;
            }
            this.clear();
          }
        };
      ((this.cancelImageLoad = s),
        a.addEventListener(`load`, c, { once: !0 }),
        a.addEventListener(`error`, l, { once: !0 }));
    }
    static invalidateImageRender() {
      return (
        this.imageRenderId++,
        this.cancelImageLoad?.(),
        (this.cancelImageLoad = null),
        this.imageRenderId
      );
    }
    static async waitForImageReady(e) {
      if (
        (!e.complete &&
          !(await new Promise((t) => {
            let n = (n) => {
                (e.removeEventListener(`load`, r),
                  e.removeEventListener(`error`, i),
                  t(n));
              },
              r = () => n(!0),
              i = () => n(!1);
            (e.addEventListener(`load`, r, { once: !0 }),
              e.addEventListener(`error`, i, { once: !0 }),
              e.complete && n(e.naturalWidth > 0));
          }))) ||
        e.naturalWidth <= 0
      )
        return !1;
      try {
        await e.decode();
      } catch {}
      return e.complete && e.naturalWidth > 0;
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
      if (r === `npv-video`) return this.renderDirectVideo(e, i, t);
      if (
        this.currentType === `canvas` &&
        this.currentCanvasSource === e &&
        this.currentCanvasKey === i &&
        this.isCanvasLayerUsable(this.get())
      )
        return (this.invalidateImageRender(), !0);
      if (
        this.pendingCanvasSource === e &&
        this.pendingCanvasKey === i &&
        this.pendingCanvasVideo?.isConnected
      )
        return (
          this.invalidateImageRender(),
          t !== void 0 && (this.pendingCanvasFallback = t),
          !0
        );
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
      (this.cancelVideoCleanup(), this.invalidateImageRender());
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
    static renderDirectVideo(e, t, n) {
      if (
        this.currentType === `canvas` &&
        this.directVideoSource === e &&
        e.isConnected &&
        !e.ended &&
        e.classList.contains(`luminous-direct-video-background--active`)
      ) {
        (this.invalidateImageRender(),
          (this.directVideoKey = t),
          (this.currentCanvasKey = t));
        let r = this.directVideoSlots.get(e);
        return r?.isConnected
          ? (this.updateDirectVideoPlaceholder(r, n ?? e.poster), !0)
          : (this.deactivateDirectVideo(!0), !1);
      }
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
        this.invalidateImageRender(),
        this.videoRenderId++,
        this.pendingCanvasVideo)
      ) {
        let e = this.pendingCanvasVideo;
        (this.clearPendingCanvas(), this.resetVideo(e));
      }
      (this.directVideoSource &&
        this.directVideoSource !== e &&
        this.deactivateDirectVideo(!0),
        this.cancelDirectVideoCleanup(e));
      let r = l(e) ?? this.directVideoHosts.get(e) ?? null;
      if (!r)
        return (
          Luminous.Logger.warn(
            `Background`,
            `Protected video has no NPV panel host`,
            e,
          ),
          !1
        );
      if (!this.mediaStage || !e.parentElement) return !1;
      let i =
        this.directVideoSlots.get(e) ??
        this.createDirectVideoPlaceholder(e, r, n ?? e.poster);
      return !i.isConnected || !r.contains(i)
        ? !1
        : (this.updateDirectVideoPlaceholder(i, n ?? e.poster),
          this.directVideoSlots.set(e, i),
          this.moveDirectVideo(e, this.mediaStage),
          e.classList.add(`luminous-direct-video-background`),
          (this.directVideoSource = e),
          (this.directVideoKey = t),
          this.directVideoHosts.set(e, r),
          (this.currentCanvasSource = e),
          (this.currentCanvasKey = t),
          e.offsetWidth,
          e.classList.add(`luminous-direct-video-background--active`),
          this.transitionTo(`canvas`, e, !0),
          Luminous.Logger.info(
            `Background`,
            `Using original protected video as background`,
            e,
          ),
          !0);
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
        ),
        this.directVideoHosts.delete(e));
      let t = this.directVideoSlots.get(e);
      (this.directVideoSlots.delete(e),
        t?.parentElement
          ? this.moveDirectVideo(e, t.parentElement, t)
          : e.parentElement === this.mediaStage && e.remove(),
        t && this.removeDirectVideoPlaceholder(t),
        t?.remove());
    }
    static getDirectVideoSource() {
      let e =
        this.directVideoSource ??
        Array.from(this.directVideoHosts.keys()).find(
          (e) => e.isConnected && this.directVideoSlots.get(e)?.isConnected,
        );
      if (!e?.isConnected) return null;
      let t = this.directVideoSlots.get(e),
        n = this.directVideoHosts.get(e);
      return (
        t && this.directVideoPlaceholders.get(t)?.sync(),
        t?.isConnected && n?.contains(t) ? e : null
      );
    }
    static moveDirectVideo(e, t, n = null) {
      let r = t;
      r.moveBefore && t.isConnected && e.isConnected
        ? r.moveBefore(e, n)
        : t.insertBefore(e, n);
    }
    static createDirectVideoPlaceholder(e, t, n) {
      let r = e.getBoundingClientRect(),
        i = e.parentElement,
        o = e.closest(a),
        s = o && t.contains(o) ? o : null,
        c = s ?? i,
        l = !1;
      for (let e = s; e; e = e.parentElement) {
        let n = e.getBoundingClientRect();
        if (
          getComputedStyle(e).aspectRatio !== `auto` &&
          n.width > 0 &&
          n.height > 0
        ) {
          ((c = e), (l = !0));
          break;
        }
        if (e === t) break;
      }
      for (let e = i; !s && e && e !== t; e = e.parentElement) {
        let t = e.getBoundingClientRect(),
          n =
            Math.abs(t.width - r.width) <= 4 &&
            (t.height === 0 || Math.abs(t.height - r.height) <= 4),
          i =
            r.width > 0 &&
            r.height > 0 &&
            t.width >= r.width - 4 &&
            t.width <= r.width * 1.5 &&
            t.height <= r.height * 1.5 &&
            Math.abs(t.left - r.left) <= 4 &&
            Math.abs(t.top - r.top) <= 4;
        if (t.width > 0 && (n || i)) {
          c = e;
          break;
        }
      }
      let u = document.createElement(`div`);
      ((u.className = `luminous-direct-video-anchor`),
        (u.hidden = !0),
        e.before(u));
      let d = document.createElement(`div`);
      ((d.className = `luminous-direct-video-placeholder`),
        d.setAttribute(`role`, `img`),
        d.setAttribute(
          `aria-label`,
          `Music video is playing in the background`,
        ),
        Object.assign(d.style, {
          position: `fixed`,
          display: `block`,
          overflow: `hidden`,
          background: `var(--spice-sidebar, #181818)`,
          borderRadius: `8px`,
          pointerEvents: `none`,
          isolation: `isolate`,
          zIndex: `100`,
        }));
      let f = document.createElement(`img`);
      ((f.className = `luminous-direct-video-placeholder-artwork`),
        (f.alt = ``),
        (f.decoding = `async`),
        Object.assign(f.style, {
          position: `absolute`,
          inset: `0`,
          width: `100%`,
          height: `100%`,
          objectFit: `cover`,
          maxWidth: `none`,
          maxHeight: `none`,
        }),
        f.addEventListener(`error`, () => {
          f.style.visibility = `hidden`;
        }),
        f.addEventListener(`load`, () => {
          f.style.visibility = `visible`;
        }));
      let p = document.createElement(`span`);
      Object.assign(p.style, {
        position: `absolute`,
        inset: `0`,
        background: `linear-gradient(180deg, rgba(8,10,14,.08), rgba(8,10,14,.6))`,
      });
      let m = document.createElement(`span`);
      ((m.className = `luminous-direct-video-placeholder-label`),
        (m.textContent = `Video in background`),
        Object.assign(m.style, {
          position: `absolute`,
          left: `12px`,
          bottom: `12px`,
          maxWidth: `calc(100% - 24px)`,
          padding: `6px 10px`,
          border: `1px solid rgba(255,255,255,.16)`,
          borderRadius: `999px`,
          background: `rgba(0,0,0,.55)`,
          color: `#fff`,
          fontSize: `12px`,
          lineHeight: `1.4`,
        }),
        d.append(f, p, m));
      let h = new Map(),
        g = (e, t) => {
          (h.has(e) ||
            h.set(e, {
              value: c.style.getPropertyValue(e),
              priority: c.style.getPropertyPriority(e),
            }),
            c.style.setProperty(e, t, `important`));
        },
        _ = c.getBoundingClientRect(),
        v =
          s && _.width > 0 && _.height > 0
            ? _.width / _.height
            : r.width > 0 && r.height > 0
              ? r.width / r.height
              : e.videoWidth / e.videoHeight || 16 / 9;
      s &&
        !l &&
        (g(`width`, `100%`),
        g(`max-width`, `100%`),
        g(`box-sizing`, `border-box`));
      let y = () => {
        let e = c.offsetWidth || _.width || r.width,
          t = getComputedStyle(c),
          n =
            t.boxSizing === `border-box`
              ? 0
              : (parseFloat(t.paddingTop) || 0) +
                (parseFloat(t.paddingBottom) || 0) +
                (parseFloat(t.borderTopWidth) || 0) +
                (parseFloat(t.borderBottomWidth) || 0),
          i = `${Math.max(0, e / v - n)}px`;
        c.style.getPropertyValue(`min-height`) !== i && g(`min-height`, i);
      };
      y();
      let b = t,
        x = null,
        S = () => {
          if (
            ((x = null),
            !u.isConnected ||
              !b.contains(u) ||
              b.getClientRects().length === 0 ||
              b.getBoundingClientRect().width <= 0 ||
              getComputedStyle(b).visibility === `hidden`)
          ) {
            d.style.display = `none`;
            return;
          }
          y();
          let {
            left: e,
            top: t,
            width: n,
            height: r,
          } = c.getBoundingClientRect();
          if (n <= 0 || r <= 0 || getComputedStyle(c).visibility === `hidden`) {
            d.style.display = `none`;
            return;
          }
          let i = Math.max(0, e),
            a = Math.max(0, t),
            o = Math.min(window.innerWidth, e + n),
            s = Math.min(window.innerHeight, t + r);
          for (let e = c; e && e !== document.body; e = e.parentElement) {
            let t = e.getBoundingClientRect();
            if (t.width <= 0 || t.height <= 0) continue;
            let n = getComputedStyle(e);
            ((e === b || /(auto|scroll|hidden|clip)/.test(n.overflowX)) &&
              ((i = Math.max(i, t.left)), (o = Math.min(o, t.right))),
              (e === b || /(auto|scroll|hidden|clip)/.test(n.overflowY)) &&
                ((a = Math.max(a, t.top)), (s = Math.min(s, t.bottom))));
          }
          let l = b.querySelector(`.main-nowPlayingView-headerWrapper`);
          (l &&
            !l.contains(c) &&
            !c.contains(l) &&
            (a = Math.max(a, l.getBoundingClientRect().bottom)),
            (d.style.display = o > i && s > a ? `block` : `none`),
            Object.assign(d.style, {
              left: `${e}px`,
              top: `${t}px`,
              width: `${n}px`,
              height: `${r}px`,
              clipPath: `inset(${Math.max(0, a - t)}px ${Math.max(0, e + n - o)}px ${Math.max(0, t + r - s)}px ${Math.max(0, i - e)}px)`,
            }));
        },
        C = () => {
          x === null && (x = requestAnimationFrame(S));
        },
        w = new ResizeObserver(C);
      (w.observe(c), b !== c && w.observe(b));
      let T = new MutationObserver(C);
      for (
        let e = c;
        e &&
        (T.observe(e, {
          attributes: !0,
          attributeFilter: [`style`, `class`, `hidden`, `aria-hidden`],
        }),
        e !== b);
        e = e.parentElement
      );
      window.addEventListener(`resize`, C, { passive: !0 });
      let E = (e) => {
        let t = e.target;
        (t instanceof Element && !t.contains(c)) || C();
      };
      return (
        document.addEventListener(`scroll`, E, { capture: !0, passive: !0 }),
        document.body.append(d),
        this.directVideoPlaceholders.set(u, {
          element: d,
          frame: c,
          observer: w,
          styles: h,
          sync: C,
          dispose: () => {
            (T.disconnect(),
              x !== null && cancelAnimationFrame(x),
              window.removeEventListener(`resize`, C),
              document.removeEventListener(`scroll`, E, !0));
          },
        }),
        S(),
        this.updateDirectVideoPlaceholder(u, n),
        u
      );
    }
    static updateDirectVideoPlaceholder(e, t) {
      let n = this.directVideoPlaceholders
        .get(e)
        ?.element?.querySelector(`img`);
      if (!n) return;
      let r = t?.trim();
      (r
        ? n.getAttribute(`src`) !== r && (n.src = r)
        : (n.removeAttribute(`src`), (n.style.visibility = `hidden`)),
        this.directVideoPlaceholders.get(e)?.sync());
    }
    static removeDirectVideoPlaceholder(e) {
      let t = this.directVideoPlaceholders.get(e);
      t &&
        (t.observer.disconnect(),
        t.dispose(),
        t.element.remove(),
        t.styles.forEach(({ value: e, priority: n }, r) => {
          e
            ? t.frame.style.setProperty(r, e, n)
            : t.frame.style.removeProperty(r);
        }),
        this.directVideoPlaceholders.delete(e));
    }
    static restoreAllDirectVideos() {
      (this.directVideoCleanupTimers.forEach((e) => window.clearTimeout(e)),
        this.directVideoCleanupTimers.clear(),
        Array.from(this.directVideoHosts.keys()).forEach((e) =>
          this.restoreDirectVideo(e),
        ),
        (this.directVideoSource = null),
        (this.directVideoKey = null));
    }
    static destroy() {
      (this.invalidateImageRender(),
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
        (this.mediaStage = null),
        (this.imageLayers = null),
        (this.videoLayers = null),
        (this.activeImage = 0),
        (this.activeVideo = 0),
        (this.currentType = `none`),
        this.emit(`change`));
    }
    static clear() {
      (this.invalidateImageRender(),
        this.videoRenderId++,
        (this.currentCanvasSource = null),
        (this.currentCanvasKey = null),
        this.clearPendingCanvas(),
        this.transitionTo(`none`));
    }
    static transitionTo(e, t = null, n = !1) {
      if (
        !(!this.imageLayers || !this.videoLayers) &&
        !(!n && this.currentType === e && this.get() === t)
      ) {
        if (
          (this.directVideoSource &&
            (e !== `canvas` || t !== this.directVideoSource) &&
            this.deactivateDirectVideo(),
          e === `image` && t instanceof HTMLImageElement)
        ) {
          let e = this.imageLayers.indexOf(t);
          e !== -1 && (this.activeImage = e);
        } else if (
          e === `canvas` &&
          t instanceof HTMLVideoElement &&
          t !== this.directVideoSource
        ) {
          let e = this.videoLayers.indexOf(t);
          e !== -1 && (this.activeVideo = e);
        }
        ((this.currentType = e),
          this.base && (this.base.style.opacity = e === `none` ? `1` : `0`),
          this.imageLayers.forEach((n) => {
            let r = e === `image` && n === t;
            n.style.opacity = r ? `1` : `0`;
          }),
          this.videoLayers.forEach((n) => {
            let r = e === `canvas` && n === t;
            n.style.opacity = r ? `1` : `0`;
          }),
          this.scheduleVideoCleanup(),
          this.emit(`change`));
      }
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
      e.onplaying = null;
      let t = e.srcObject;
      (!t && !e.hasAttribute(`src`) && !e.currentSrc) ||
        (e.pause(),
        t instanceof MediaStream && t.getTracks().forEach((e) => e.stop()),
        (e.srcObject = null),
        e.removeAttribute(`src`),
        e.load());
    }
  },
  d = 64,
  f = 120,
  p = 220,
  m = 750,
  h = class {
    static subscriptions = new Set();
    static observer = null;
    static frameId = null;
    static timerId = null;
    static lastDispatchAt = 0;
    static lastFullSyncAt = 0;
    static pendingRecords = [];
    static saturated = !1;
    static forceDispatch = !1;
    static cachedMainView = null;
    static stats = {
      mutationBatches: 0,
      observedRecords: 0,
      ignoredMainViewRecords: 0,
      frames: 0,
      dispatchedListeners: 0,
      saturatedFrames: 0,
      fullSyncFrames: 0,
    };
    static handleVisibilityChange = () => {
      if (document.hidden) {
        (this.observer?.disconnect(),
          (this.pendingRecords = []),
          (this.saturated = !1),
          this.cancelScheduledDispatch());
        return;
      }
      (this.observeDocument(),
        (this.lastDispatchAt = 0),
        (this.forceDispatch = !0),
        this.schedule());
    };
    static subscribe(e, t = {}) {
      let n = { listener: e, filter: t.filter };
      return (
        this.subscriptions.add(n),
        this.ensureObserver(),
        t.immediate !== !1 && this.callListener(e),
        () => {
          (this.subscriptions.delete(n),
            this.subscriptions.size === 0 && this.stopObserver());
        }
      );
    }
    static getStats() {
      return { ...this.stats };
    }
    static destroy() {
      (this.subscriptions.clear(),
        this.stopObserver(),
        (this.stats = {
          mutationBatches: 0,
          observedRecords: 0,
          ignoredMainViewRecords: 0,
          frames: 0,
          dispatchedListeners: 0,
          saturatedFrames: 0,
          fullSyncFrames: 0,
        }));
    }
    static schedule() {
      if (
        document.hidden ||
        this.frameId !== null ||
        this.timerId !== null ||
        this.subscriptions.size === 0
      )
        return;
      let e = this.saturated ? p : f,
        t = performance.now() - this.lastDispatchAt,
        n = Math.max(0, e - t),
        r = () => {
          ((this.timerId = null),
            (this.frameId = requestAnimationFrame(() => {
              this.frameId = null;
              let e = performance.now();
              this.lastDispatchAt = e;
              let t = this.pendingRecords,
                n = this.saturated,
                r = this.forceDispatch || (n && e - this.lastFullSyncAt >= m);
              ((this.pendingRecords = []),
                (this.saturated = !1),
                (this.forceDispatch = !1),
                this.stats.frames++,
                n && this.stats.saturatedFrames++,
                r && (this.stats.fullSyncFrames++, (this.lastFullSyncAt = e)),
                this.subscriptions.forEach(({ listener: e, filter: n }) => {
                  (!r && n && !n(t)) ||
                    (this.stats.dispatchedListeners++, this.callListener(e));
                }));
            })));
        };
      n <= 0 ? r() : (this.timerId = window.setTimeout(r, n));
    }
    static ensureObserver() {
      this.observer ||
        (document.addEventListener(
          `visibilitychange`,
          this.handleVisibilityChange,
        ),
        (this.observer = new MutationObserver((e) => {
          if (
            (this.stats.mutationBatches++,
            (this.stats.observedRecords += e.length),
            document.hidden)
          ) {
            ((this.pendingRecords = []), (this.saturated = !0));
            return;
          }
          let t = this.cachedMainView?.isConnected ? this.cachedMainView : null;
          t ||
            ((t = document.getElementById(`main-view`)),
            (this.cachedMainView = t));
          let n = 0;
          for (let r of e) {
            if (t?.contains(r.target)) {
              this.stats.ignoredMainViewRecords++;
              continue;
            }
            if ((n++, !this.saturated)) {
              if (this.pendingRecords.length >= d) {
                this.saturated = !0;
                continue;
              }
              this.pendingRecords.push(r);
            }
          }
          n > 0 && this.schedule();
        })),
        this.observeDocument());
    }
    static observeDocument() {
      !this.observer ||
        document.hidden ||
        this.observer.observe(document.documentElement, {
          childList: !0,
          subtree: !0,
        });
    }
    static stopObserver() {
      (this.observer?.disconnect(),
        (this.observer = null),
        document.removeEventListener(
          `visibilitychange`,
          this.handleVisibilityChange,
        ),
        (this.pendingRecords = []),
        (this.saturated = !1),
        (this.forceDispatch = !1),
        (this.cachedMainView = null),
        this.cancelScheduledDispatch(),
        (this.lastDispatchAt = 0),
        (this.lastFullSyncAt = 0));
    }
    static cancelScheduledDispatch() {
      (this.frameId !== null &&
        (cancelAnimationFrame(this.frameId), (this.frameId = null)),
        this.timerId !== null &&
          (window.clearTimeout(this.timerId), (this.timerId = null)));
    }
    static callListener(e) {
      try {
        e();
      } catch (e) {
        Luminous.Logger.error(`UI`, `DOM pulse listener failed`, e);
      }
    }
  };
function g(e, t) {
  for (let n of e) {
    let e = n.target;
    if (
      (e instanceof Element && e.closest(t)) ||
      v(n.addedNodes, t) ||
      v(n.removedNodes, t)
    )
      return !0;
  }
  return !1;
}
function _(e, t) {
  for (let n of e) if (v(n.addedNodes, t) || v(n.removedNodes, t)) return !0;
  return !1;
}
function v(e, t) {
  for (let n of e)
    if (n instanceof Element && (n.matches(t) || n.querySelector(t))) return !0;
  return !1;
}
var y = 64,
  b = 120,
  x = 220,
  S = 750,
  C = class {
    static subscriptions = new Set();
    static root = null;
    static observer = null;
    static unsubscribeDomPulse = null;
    static frameId = null;
    static timerId = null;
    static lastDispatchAt = 0;
    static lastFullSyncAt = 0;
    static pendingRecords = [];
    static saturated = !1;
    static forceDispatch = !1;
    static stats = {
      mutationBatches: 0,
      observedRecords: 0,
      frames: 0,
      dispatchedListeners: 0,
      saturatedFrames: 0,
      fullSyncFrames: 0,
    };
    static handleVisibilityChange = () => {
      if (document.hidden) {
        (this.observer?.disconnect(),
          (this.pendingRecords = []),
          (this.saturated = !1),
          this.cancelScheduledDispatch());
        return;
      }
      (this.observeRoot(),
        (this.lastDispatchAt = 0),
        (this.forceDispatch = !0),
        this.schedule());
    };
    static subscribe(e, t = {}) {
      let n = { listener: e, filter: t.filter };
      return (
        this.subscriptions.add(n),
        this.ensureStarted(),
        t.immediate !== !1 && this.callListener(e),
        () => {
          (this.subscriptions.delete(n),
            this.subscriptions.size === 0 && this.stop());
        }
      );
    }
    static getRoot() {
      return this.root?.isConnected ? this.root : null;
    }
    static getStats() {
      return { ...this.stats };
    }
    static destroy() {
      (this.subscriptions.clear(),
        this.stop(),
        (this.stats = {
          mutationBatches: 0,
          observedRecords: 0,
          frames: 0,
          dispatchedListeners: 0,
          saturatedFrames: 0,
          fullSyncFrames: 0,
        }));
    }
    static ensureStarted() {
      ((this.unsubscribeDomPulse ||=
        (document.addEventListener(
          `visibilitychange`,
          this.handleVisibilityChange,
        ),
        h.subscribe(
          () => {
            (this.attachRoot(), (this.forceDispatch = !0), this.schedule());
          },
          { immediate: !1, filter: (e) => _(e, `#main-view`) },
        ))),
        this.attachRoot());
    }
    static attachRoot() {
      let e = document.querySelector(`#main-view`);
      (e === this.root && this.root?.isConnected) ||
        (this.observer?.disconnect(),
        (this.observer = null),
        (this.pendingRecords = []),
        (this.saturated = !1),
        (this.root = e),
        this.root &&
          ((this.observer = new MutationObserver((e) => {
            if (
              (this.stats.mutationBatches++,
              (this.stats.observedRecords += e.length),
              document.hidden)
            ) {
              ((this.pendingRecords = []), (this.saturated = !0));
              return;
            }
            for (let t of e)
              if (!this.saturated) {
                if (this.pendingRecords.length >= y) {
                  this.saturated = !0;
                  continue;
                }
                this.pendingRecords.push(t);
              }
            this.schedule();
          })),
          this.observeRoot()));
    }
    static observeRoot() {
      !this.observer ||
        !this.root ||
        document.hidden ||
        this.observer.observe(this.root, { childList: !0, subtree: !0 });
    }
    static schedule() {
      if (
        document.hidden ||
        this.subscriptions.size === 0 ||
        this.frameId !== null ||
        this.timerId !== null
      )
        return;
      let e = this.saturated ? x : b,
        t = performance.now() - this.lastDispatchAt,
        n = Math.max(0, e - t),
        r = () => {
          ((this.timerId = null),
            (this.frameId = requestAnimationFrame(() => {
              this.frameId = null;
              let e = performance.now();
              ((this.lastDispatchAt = e), this.attachRoot());
              let t = this.pendingRecords,
                n = this.saturated,
                r = this.forceDispatch || (n && e - this.lastFullSyncAt >= S);
              ((this.pendingRecords = []),
                (this.saturated = !1),
                (this.forceDispatch = !1),
                this.stats.frames++,
                n && this.stats.saturatedFrames++,
                r && (this.stats.fullSyncFrames++, (this.lastFullSyncAt = e)),
                this.subscriptions.forEach(({ listener: e, filter: n }) => {
                  (!r && n && !n(t)) ||
                    (this.stats.dispatchedListeners++, this.callListener(e));
                }));
            })));
        };
      n <= 0 ? r() : (this.timerId = window.setTimeout(r, n));
    }
    static stop() {
      (this.observer?.disconnect(),
        (this.observer = null),
        (this.root = null),
        (this.pendingRecords = []),
        (this.saturated = !1),
        (this.forceDispatch = !1),
        this.unsubscribeDomPulse?.(),
        (this.unsubscribeDomPulse = null),
        document.removeEventListener(
          `visibilitychange`,
          this.handleVisibilityChange,
        ),
        this.cancelScheduledDispatch(),
        (this.lastDispatchAt = 0),
        (this.lastFullSyncAt = 0));
    }
    static cancelScheduledDispatch() {
      (this.frameId !== null &&
        (cancelAnimationFrame(this.frameId), (this.frameId = null)),
        this.timerId !== null &&
          (window.clearTimeout(this.timerId), (this.timerId = null)));
    }
    static callListener(e) {
      try {
        e();
      } catch (e) {
        Luminous.Logger.error(`UI`, `Main-view pulse listener failed`, e);
      }
    }
  },
  w = class {
    static STRUCTURAL_SELECTOR = [
      e,
      i,
      a,
      t,
      n,
      `#Desktop_PanelContainer_Id`,
      `#lyrics-cinema`,
      `video`,
    ].join(`,`);
    static listeners = new Map();
    static unsubscribeDomPulse = null;
    static unsubscribeMainViewPulse = null;
    static checkFrame = null;
    static currentVideo = null;
    static currentMode = null;
    static currentSource = null;
    static currentPlayable = !1;
    static revision = 0;
    static observedSourceVideo = null;
    static uiSidebar = null;
    static uiCanvasFrameParent = null;
    static initialized = !1;
    static enabled = !0;
    static handleVideoSourceChange = () => {
      this.scheduleCheck();
    };
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
        (this.unsubscribeDomPulse = h.subscribe(() => this.scheduleCheck(), {
          immediate: !1,
          filter: (e) => g(e, this.STRUCTURAL_SELECTOR),
        })),
        (this.unsubscribeMainViewPulse = C.subscribe(
          () => this.scheduleCheck(),
          { immediate: !1, filter: (e) => g(e, this.STRUCTURAL_SELECTOR) },
        )),
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
      (this.unsubscribeDomPulse?.(),
        (this.unsubscribeDomPulse = null),
        this.unsubscribeMainViewPulse?.(),
        (this.unsubscribeMainViewPulse = null),
        this.checkFrame !== null &&
          (cancelAnimationFrame(this.checkFrame), (this.checkFrame = null)),
        this.observeVideoSource(null),
        this.syncUiState(null, null),
        (this.currentVideo = null),
        (this.currentMode = null),
        (this.currentSource = null),
        (this.currentPlayable = !1),
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
      let e = this.findVisibleVideo(r);
      if (e) return this.createPayload(e, `npv`);
      let t = this.findVisibleVideo(o, !0) ?? this.findVisibleVideo(s, !0);
      if (t) return this.createPayload(t, `npv-video`);
      let n = Luminous.Background.getDirectVideoSource();
      if (n && !n.ended) return this.createPayload(n, `npv-video`);
      let i = this.findCinemaVideo();
      return i
        ? this.createPayload(i, `cinema`)
        : this.createPayload(null, null);
    }
    static findCinemaVideo() {
      for (let e of document.querySelectorAll(`video`)) {
        if (
          !e.closest(`.Root__top-container`) ||
          e.closest(c) ||
          !e.isConnected ||
          e.ended ||
          e.getClientRects().length === 0
        )
          continue;
        let t = getComputedStyle(e);
        if (t.display !== `none` && t.visibility !== `hidden`) return e;
      }
      return null;
    }
    static findVisibleVideo(e, t = !1) {
      let n = document.querySelectorAll(e);
      for (let e of n) {
        if (
          (t &&
            e.closest(
              `[data-canvas-surface="true"],.canvasVideoContainerNPV`,
            )) ||
          !e.isConnected ||
          e.ended ||
          e.getClientRects().length === 0
        )
          continue;
        let n = getComputedStyle(e);
        if (n.display !== `none` && n.visibility !== `hidden`) return e;
      }
      return null;
    }
    static isPlayable(e) {
      return !!(
        e &&
        e.isConnected &&
        !e.ended &&
        e.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        e.videoWidth > 0 &&
        e.videoHeight > 0
      );
    }
    static check() {
      let { video: e, mode: t, source: n } = this.detect(),
        r = this.isPlayable(e),
        i = this.currentVideo,
        a = this.currentMode;
      if (
        (this.syncUiState(e, t),
        i === e &&
          a === t &&
          this.currentSource === n &&
          this.currentPlayable === r)
      )
        return;
      if (
        ((this.currentVideo = e),
        (this.currentMode = t),
        (this.currentSource = n),
        (this.currentPlayable = r),
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
          e?.addEventListener(t, this.handleVideoSourceChange, { passive: !0 });
        }));
    }
    static syncUiState(e, r) {
      let i = e && r === `npv` ? e.closest(t) : null,
        a = e && r === `npv` && !i ? e.closest(n) : null,
        o = i ?? a,
        s =
          o?.closest(`#Desktop_PanelContainer_Id`) ??
          o?.closest(`[data-npv-root]`) ??
          null,
        c = i ? i.parentElement : (a?.parentElement?.parentElement ?? null);
      (s !== this.uiSidebar &&
        (this.uiSidebar?.classList.remove(`luminous-has-canvas`),
        (this.uiSidebar = s),
        this.uiSidebar?.classList.add(`luminous-has-canvas`)),
        c !== this.uiCanvasFrameParent &&
          (this.uiCanvasFrameParent?.classList.remove(
            `luminous-canvas-frame-parent`,
          ),
          (this.uiCanvasFrameParent = c),
          this.uiCanvasFrameParent?.classList.add(
            `luminous-canvas-frame-parent`,
          )));
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
  T = class {
    static disabledLevels = new Set([`INFO`]);
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
        `%c Luminous v2.4.6 %c by streetraceing `,
        `background:#1DB954;color:#000;padding:6px 12px;border-radius:8px 0 0 8px;font-weight:600;`,
        `background:#181818;color:#1DB954;padding:6px 12px;border-radius:0 8px 8px 0;font-weight:500;`,
      ),
        console.log(
          `%c build: 27/10/2026 19:01:15 UTC+03:00 `,
          `color:#888;font-size:12px;`,
        ));
    }
  },
  E = { status: `booting`, brokenSince: null },
  D = new Set();
function O() {
  return E;
}
function k(e) {
  let t = { ...E, ...e };
  (t.status === E.status && t.brokenSince === E.brokenSince) ||
    ((E = t), D.forEach((e) => te(e)));
}
function ee(e) {
  return (
    D.add(e),
    te(e),
    () => {
      D.delete(e);
    }
  );
}
function te(e) {
  try {
    e(E);
  } catch (e) {
    T.error(`Main`, `UI health listener failed`, e);
  }
}
var ne = `luminous-playlist-background`,
  A = `--luminous-playlist-background-image`,
  re = [
    `.main-view-container`,
    `.before-scroll-node`,
    `[data-testid="playlist-page"]`,
    `[data-testid="playlist-tracklist"]`,
    `[data-testid="entity-header"]`,
  ].join(`,`),
  ie = [
    `[data-testid="playlist-page"]`,
    `[data-testid="playlist-tracklist"]`,
    `.marketplace-content`,
    `#searchPage`,
    `section[data-testid="episode"]`,
    `section[data-test-uri^="spotify:artist:"]`,
    `section[data-testid="home-page"]`,
    `div[data-testid="test-ref-div"]`,
    `[data-testid="entity-header"]`,
  ].join(`,`),
  ae = [
    `.Root__top-container #main-view`,
    `.Root__top-container [data-testid="main-view"]`,
    `#main-view`,
    `[data-testid="main-view"]`,
    `.Root__top-container .main-view-container`,
    `.main-view-container`,
  ],
  oe = null;
function se() {
  for (let e of ae) if (document.querySelector(e)) return ((oe = e), e);
  return null;
}
function ce() {
  return oe;
}
var j = class {
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
          (s.classList.remove(ne),
          s.style.removeProperty(A),
          (s = null),
          (o = null));
      }
      function l(e) {
        e !== r &&
          (n?.disconnect(),
          (n = null),
          (r = e),
          e &&
            ((n = new MutationObserver(d)),
            n.observe(e, {
              attributes: !0,
              attributeFilter: [`style`, `class`],
            })));
      }
      function u() {
        if (a) return;
        let e =
          C.getRoot()?.querySelector(`.main-view-container`) ??
          document.querySelector(`.main-view-container`);
        (e === t && t?.isConnected) || (l(null), c(), (t = e));
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
        let n = t.querySelector(`.before-scroll-node > div > :first-child`),
          r = t.querySelector(`[data-testid="entity-header"]`);
        if ((l(n), !n || !r)) {
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
            r.classList.add(ne),
            r.style.setProperty(A, i),
            e?.onBackgroundChange?.(i, n, r)));
      }
      let p = C.subscribe(d, {
        filter: (e) => _(e, re) || g(e, `.before-scroll-node`),
      });
      return {
        disconnect() {
          ((a = !0),
            p(),
            n?.disconnect(),
            (n = null),
            (r = null),
            i !== null && (cancelAnimationFrame(i), (i = null)),
            c(),
            (t = null));
        },
      };
    }
    static mainViewState() {
      let e = [
          `luminous-page-playlist`,
          `luminous-page-marketplace`,
          `luminous-page-search`,
          `luminous-page-episode`,
          `luminous-page-artist`,
          `luminous-page-home`,
        ],
        t = null,
        n = !1,
        r = new Set(),
        i = new Set();
      function a(e, t) {
        return (e.forEach((e) => e.classList.remove(t)), new Set());
      }
      function o() {
        (t?.classList.remove(...e),
          (r = a(r, `luminous-hidden-test-ref-container`)),
          (i = a(i, `luminous-artist-image-ancestor`)));
      }
      function s() {
        let e = C.getRoot();
        (e === t && t?.isConnected) || (o(), (t = e));
      }
      function c(e, n) {
        t?.classList.toggle(e, n);
      }
      function l() {
        if (n || (s(), !t)) return;
        (c(
          `luminous-page-playlist`,
          !!t.querySelector(
            `[data-testid="playlist-page"], [data-testid="playlist-tracklist"]`,
          ),
        ),
          c(
            `luminous-page-marketplace`,
            !!t.querySelector(`.marketplace-content`),
          ),
          c(`luminous-page-search`, !!t.querySelector(`#searchPage`)),
          c(
            `luminous-page-episode`,
            !!t.querySelector(`section[data-testid="episode"]`),
          ),
          c(
            `luminous-page-artist`,
            !!t.querySelector(`section[data-test-uri^="spotify:artist:"]`),
          ),
          c(
            `luminous-page-home`,
            !!t.querySelector(`section[data-testid="home-page"]`),
          ));
        let e = new Set();
        (t.querySelectorAll(`div[data-testid="test-ref-div"]`).forEach((n) => {
          let r = n.parentElement;
          for (; r?.parentElement && r.parentElement !== t;)
            r = r.parentElement;
          r?.parentElement === t &&
            (r.classList.contains(`luminous-hidden-test-ref-container`) ||
              r.classList.add(`luminous-hidden-test-ref-container`),
            e.add(r));
        }),
          r.forEach((t) => {
            e.has(t) ||
              t.classList.remove(`luminous-hidden-test-ref-container`);
          }),
          (r = e));
        let a = new Set(),
          o =
            t.querySelector(
              `section[data-test-uri^="spotify:artist:"] [data-testid="entity-header"] img, section[data-test-uri^="spotify:artist:"] img`,
            )?.parentElement ?? null;
        for (; o && o !== t;)
          (o.tagName === `DIV` &&
            (o.classList.contains(`luminous-artist-image-ancestor`) ||
              o.classList.add(`luminous-artist-image-ancestor`),
            a.add(o)),
            (o = o.parentElement));
        (i.forEach((e) => {
          a.has(e) || e.classList.remove(`luminous-artist-image-ancestor`);
        }),
          (i = a));
      }
      let u = C.subscribe(l, {
        filter: (e) =>
          _(e, ie) ||
          e.some((e) => {
            let t = e.target;
            return t instanceof Element
              ? t.matches(
                  `[data-testid="playlist-page"],.marketplace-content,#searchPage,section[data-testid="episode"],section[data-test-uri^="spotify:artist:"],section[data-testid="home-page"]`,
                ) ||
                  (t.closest(`section[data-test-uri^="spotify:artist:"]`) !==
                    null &&
                    _([e], `img`))
              : !1;
          }),
      });
      return {
        disconnect() {
          ((n = !0), u(), o(), (t = null));
        },
      };
    }
    static leftSidebarState() {
      let e = null,
        t = null,
        n = !1;
      function r() {
        (t?.disconnect(),
          (t = null),
          document.documentElement.classList.remove(
            `luminous-left-sidebar-expanded`,
          ));
      }
      function i() {
        if (n) return;
        let r = document.querySelector(`#Desktop_LeftSidebar_Id`);
        r !== e &&
          (t?.disconnect(),
          (t = null),
          (e = r),
          e &&
            ((t = new MutationObserver(i)),
            t.observe(e, { attributes: !0, attributeFilter: [`class`] })));
        let a = !!e && e.getBoundingClientRect().width > 120;
        document.documentElement.classList.toggle(
          `luminous-left-sidebar-expanded`,
          a,
        );
      }
      let a = h.subscribe(i, {
        filter: (e) => _(e, `#Desktop_LeftSidebar_Id`),
      });
      return {
        disconnect() {
          ((n = !0), a(), r(), (e = null));
        },
      };
    }
    static uiMountWatcher() {
      let e = !1,
        t = null,
        n = null;
      function r() {
        return se() !== null;
      }
      function i() {
        return !!(
          document.querySelector(`.main-view-container`) ||
          document.querySelector(`[data-testid="main-view"]`) ||
          document.querySelector(`#main-view`)
        );
      }
      function a() {
        try {
          return !!Spicetify?.Player?.data?.item;
        } catch {
          return !1;
        }
      }
      function o() {
        if (!e) {
          if (!r()) {
            (a()
              ? n === null &&
                (n = window.setTimeout(() => {
                  ((n = null),
                    !e &&
                      O().status === `booting` &&
                      (T.warn(
                        `Main`,
                        `Spotify shell selector not found; promoting to ready because Player has a track. Spicetify ≥ 2.45.2 is required for Spotify 1.3.3+.`,
                      ),
                      (t = null),
                      k({ status: `ready`, brokenSince: null })));
                }, 4e3))
              : n !== null && (window.clearTimeout(n), (n = null)),
              (t = null),
              k({ status: `booting`, brokenSince: null }));
            return;
          }
          if ((n !== null && (window.clearTimeout(n), (n = null)), i())) {
            ((t = null), k({ status: `ready`, brokenSince: null }));
            return;
          }
          (t === null &&
            ((t = Date.now()),
            T.info(`Main`, `Waiting for Spotify UI mount...`)),
            k({ status: `waiting`, brokenSince: t }));
        }
      }
      let s = h.subscribe(o, {
          filter: (e) =>
            _(
              e,
              `.Root__top-container,#main-view,[data-testid="main-view"],.main-view-container`,
            ),
        }),
        c = C.subscribe(o, {
          immediate: !1,
          filter: (e) =>
            _(e, `.main-view-container,[data-testid="main-view"],#main-view`),
        });
      return {
        disconnect() {
          ((e = !0),
            n !== null && (window.clearTimeout(n), (n = null)),
            s(),
            c(),
            (t = null),
            k({ status: `booting`, brokenSince: null }));
        },
      };
    }
    static observeCinema() {
      let e = null,
        t = !1,
        n = null;
      function r() {
        (n?.classList.remove(`luminous-cinema-has-video`), (n = null));
      }
      function i() {
        if (n?.querySelector(`video`)) return !0;
        for (let e of document.querySelectorAll(`video`))
          if (
            !(!e.closest(`.Root__top-container`) || e.closest(c)) &&
            e.getClientRects().length > 0
          )
            return !0;
        return !1;
      }
      function a() {
        let e = document.querySelector(`#lyrics-cinema`);
        (e !== n && r(),
          (n = e),
          n && n.classList.toggle(`luminous-cinema-has-video`, i()));
      }
      function o() {
        t = !1;
        let e = document.documentElement;
        (e.hasAttribute(`data-transition`) &&
          e.removeAttribute(`data-transition`),
          [
            `data-right-sidebar-open-preenter`,
            `data-right-sidebar-open-preexit`,
            `data-right-sidebar-open-duringexit`,
            `data-right-sidebar-open-postexit`,
          ].forEach((t) => {
            e.hasAttribute(t) && e.removeAttribute(t);
          }));
      }
      function s() {
        t || ((t = !0), queueMicrotask(o));
      }
      ((e = new MutationObserver(s)),
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
        o(),
        a());
      let l = h.subscribe(a, {
          immediate: !1,
          filter: (e) => g(e, `#lyrics-cinema,video`),
        }),
        u = C.subscribe(a, {
          immediate: !1,
          filter: (e) => g(e, `#lyrics-cinema,video`),
        });
      return {
        disconnect() {
          (e?.disconnect(), (e = null), l(), u(), r(), (t = !1));
        },
      };
    }
  },
  le = class {
    static get() {
      let e = Luminous.Canvas.get(),
        t = Luminous.Song.getSync();
      return {
        luminous: {
          version: `2.4.6`,
          buildTime: `27/10/2026 19:01:15 UTC+03:00`,
        },
        runtime: {
          background: Luminous.Background.getType(),
          canvasMode: e.mode,
          canvasSource: e.source,
          track: t?.title ?? null,
          uiHealth: O().status,
          documentHidden: document.hidden,
          shellSelector: ce(),
        },
        performance: { domPulse: h.getStats(), mainViewPulse: C.getStats() },
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
  ue = class {
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
  M = `luminous-dynamic-palette`,
  de = [
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
  fe = [
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
  N = 48,
  pe = 24,
  me = 20,
  he = class {
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
      let t = Number.isFinite(e) ? Math.min(60, Math.max(8, e)) : me;
      ((this.motionScale = t / me),
        this.currentProfile &&
          this.applyDurations(this.currentProfile.baseDurations));
    }
    static async applyFromImage(e) {
      if (!e) {
        this.clear();
        return;
      }
      if (e === this.source && this.currentProfile) {
        if (this.hasAppliedPalette()) return;
        this.applyProfile(this.currentProfile);
        return;
      }
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
      ((n.width = N), (n.height = N));
      let r = n.getContext(`2d`, { willReadFrequently: !0 });
      if (!r) throw Error(`Canvas context unavailable`);
      ((r.imageSmoothingEnabled = !0),
        (r.imageSmoothingQuality = `high`),
        r.drawImage(t, 0, 0, N, N));
      let i = r.getImageData(0, 0, N, N).data;
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
      for (this.cache.set(e, t); this.cache.size > pe;) {
        let e = this.cache.keys().next().value;
        if (!e) return;
        this.cache.delete(e);
      }
    }
    static applyProfile(e) {
      this.currentProfile = e;
      let t = this.getTarget();
      t &&
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
        t.classList.remove(...fe),
        t.classList.add(
          `luminous-effect-${e.scene}`,
          `luminous-effect-energy-${e.energy}`,
          `luminous-effect-tone-${e.tone}`,
          M,
        ),
        this.applyDurations(e.baseDurations));
    }
    static applyDurations(e) {
      let t = this.getTarget();
      t &&
        e.forEach((e, n) => {
          let r = Math.max(7, e * this.motionScale);
          t.style.setProperty(
            `--luminous-blob-${n + 1}-duration`,
            `${Number(r.toFixed(1))}s`,
          );
        });
    }
    static clearAppliedPalette() {
      let e = this.getTarget();
      e &&
        (de.forEach((t) => {
          e.style.removeProperty(t);
        }),
        e.classList.remove(...fe, M));
    }
    static getTarget() {
      return document.querySelector(`.luminous-background-effects`);
    }
    static hasAppliedPalette() {
      return this.getTarget()?.classList.contains(M) === !0;
    }
  },
  ge = class {
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
      this.registry.forEach((t, n) => {
        e[n] = this.values.get(n) ?? t.default;
      });
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
  _e = class {
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
    static refresh() {
      return (
        typeof Spicetify < `u` &&
          Spicetify.Player?.data?.item &&
          this.syncCurrentTrack(),
        this.getSync()
      );
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
        n = P(e);
      return `${e.uri}\u0000${e.name}\u0000${t}\u0000${n ?? ``}`;
    }
    static createPayload(e) {
      let t = e.artists?.map((e) => e.name) ?? [],
        n = P(e);
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
function ve(e) {
  if (!e) return null;
  if (e.startsWith(`spotify:image:`)) {
    let t = e.slice(14);
    return t ? `https://i.scdn.co/image/${t}` : null;
  }
  return e;
}
function P(e) {
  let t = [
    ...(e.images ?? []).map((e) => e.url),
    ...(e.album?.images ?? []).map((e) => e.url),
    e.metadata?.image_xlarge_url,
    e.metadata?.image_large_url,
    e.metadata?.image_url,
    e.metadata?.image_small_url,
  ];
  for (let e of t) {
    let t = ve(e?.trim());
    if (t) return t;
  }
  return null;
}
function ye() {
  let e = window.Luminous;
  if (typeof e?.destroy == `function`)
    try {
      e.destroy();
    } catch (e) {
      console.warn(`[Luminous] Failed to clean previous runtime`, e);
    }
}
function be(e) {
  Object.defineProperty(window, 'Luminous', {
    value: {
      Background: u,
      Canvas: w,
      Diagnostics: le,
      Song: _e,
      Native: ue,
      Palette: he,
      Settings: ge,
      Logger: T,
      destroy: e,
      version: `2.4.6`,
    },
    configurable: !0,
  });
}
function F() {
  return Spicetify.React;
}
function I() {
  return F().useEffect;
}
function L() {
  return F().useMemo;
}
function R() {
  return F().useRef;
}
function z() {
  return F().useState;
}
function xe() {
  let e = I(),
    t = L(),
    n = z(),
    [r, i] = n(() => Luminous.Song.getSync()),
    [a, o] = n(() => Luminous.Canvas.get()),
    [s, c] = n(() => Luminous.Settings.get(`dynamicBackground`) !== !1),
    [l, u] = n(() => Luminous.Settings.get(`musicVideoBackground`)),
    [d, f] = n(() => Luminous.Settings.get(`dynamicPalette`) !== !1),
    [p, m] = n(() => O().status !== `booting`),
    h = !!a.video && (a.mode !== `npv-video` || l !== `artwork`),
    g = t(
      () =>
        p
          ? s
            ? h
              ? `canvas:${a.mode}:${a.source ?? ``}:${a.revision}:${r?.image ?? ``}`
              : r?.image
                ? `image:${l}:${r.image}`
                : `empty:${l}`
            : `disabled`
          : `inactive`,
      [p, a, s, r?.image, h, l],
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
            Luminous.Settings.get(`dynamicBackground`) !== !1 &&
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
      let d = ee((e) => {
          m(e.status !== `booting`);
        }),
        p = Luminous.Settings.subscribe(
          `dynamicBackground`,
          (e) => c(e !== !1),
          { immediate: !0 },
        ),
        h = Luminous.Settings.subscribe(
          `musicVideoBackground`,
          (e) => {
            if (e === `artwork`) {
              let e = Luminous.Song.refresh();
              e &&
                (Luminous.Settings.get(`dynamicBackground`) !== !1 &&
                  Luminous.Background.preloadImage(e.image),
                s(e));
            }
            u(e);
          },
          { immediate: !0 },
        ),
        g = Luminous.Settings.subscribe(`dynamicPalette`, (e) => f(e !== !1), {
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
          g(),
          h(),
          Luminous.Background.destroy(),
          Luminous.Palette.clear());
      };
    }, []),
    e(() => {
      if (!p) {
        Luminous.Background.destroy();
        return;
      }
      if (!s) {
        Luminous.Background.clear();
        return;
      }
      if (h) {
        Luminous.Background.render({
          canvas: a.video,
          canvasSource: a.source,
          canvasMode: a.mode,
          image: r?.image,
        });
        return;
      }
      if (r?.image) {
        Luminous.Background.render({ image: r.image });
        return;
      }
      Luminous.Background.render();
    }, [g]),
    e(() => {
      if (!p || !s || !d) {
        Luminous.Palette.clear();
        return;
      }
      Luminous.Palette.applyFromImage(r?.image);
    }, [p, d, s, r?.image]),
    null
  );
}
var Se = 600,
  Ce = 2600,
  we = 1500,
  Te = Date.now();
function Ee() {
  let e = F(),
    t = I(),
    n = L(),
    r = R(),
    i = z(),
    [a, o] = i(!0),
    [s, c] = i(() => O()),
    [l, u] = i(() => Date.now()),
    d = r(null),
    f = r(!1),
    p = s.status !== `booting`;
  (t(() => {
    p &&
      document.documentElement.classList.remove(`luminous-bootstrap-pending`);
  }, [p]),
    t(() => {
      if (a) return ee(c);
    }, [a]),
    t(() => {
      if (!p || f.current) return;
      d.current === null && (d.current = Te);
      let e = Date.now() - d.current,
        t = s.status === `ready` ? Se : Ce,
        n = Math.max(0, t - e),
        r = window.setTimeout(() => {
          ((f.current = !0), o(!1));
        }, n);
      return () => window.clearTimeout(r);
    }, [s.status, p]),
    t(() => {
      if (!p || !a || s.status !== `waiting`) return;
      let e = window.setInterval(() => {
        u(Date.now());
      }, 500);
      return () => window.clearInterval(e);
    }, [s.status, p, a]));
  let m = n(
      () =>
        s.status === `waiting` && s.brokenSince
          ? `Waiting for Spotify UI... (${De(l - s.brokenSince)})`
          : s.status === `ready`
            ? `Welcome back. Lighting up Spotify...`
            : `Starting Luminous...`,
      [s.brokenSince, s.status, l],
    ),
    h =
      s.status === `waiting` &&
      s.brokenSince !== null &&
      l - s.brokenSince >= we;
  return p
    ? e.createElement(
        `div`,
        {
          className: `luminous-splash${a ? `` : ` luminous-splash--hidden`}`,
          'aria-hidden': a ? `false` : `true`,
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
            e.createElement(`small`, null, m),
          ),
          e.createElement(
            `div`,
            { className: `luminous-splash__loader` },
            e.createElement(`span`),
          ),
          h &&
            e.createElement(
              `div`,
              { className: `luminous-splash__hint` },
              `Spotify is taking longer than expected. The splash will close automatically.`,
            ),
        ),
      )
    : null;
}
function De(e) {
  return `${Math.max(0, Math.floor(e / 1e3))}s`;
}
var Oe = [`still`, `drift`, `float`],
  ke = [`auto`, `artwork`],
  B = (e, t, n) => (r) => {
    if (
      (typeof r != `number` && typeof r != `string`) ||
      (typeof r == `string` && r.trim() === ``)
    )
      return e;
    let i = typeof r == `number` ? r : Number(r);
    return Number.isFinite(i) ? Math.min(n, Math.max(t, i)) : e;
  },
  V = (e) => (t) => (typeof t == `boolean` ? t : e),
  H = (e, t) => (n) => (typeof n == `string` && e.includes(n) ? n : t),
  Ae = (e, t, n) => {
    t.forEach((t) => {
      Luminous.Settings.toggleClass(`${e}${t}`, t === n);
    });
  },
  je = () => {
    let e = Luminous.Settings.get(`dynamicBackground`) !== !1,
      t = Luminous.Settings.get(`backgroundSource`);
    Luminous.Canvas.setEnabled(e && t === `auto`);
  },
  Me = {
    backgroundBlur: {
      default: 24,
      normalize: B(24, 0, 48),
      apply: (e) =>
        Luminous.Settings.setVar(`--luminous-background-blur`, `${e}px`),
    },
    backgroundBrightness: {
      default: 75,
      normalize: B(75, 30, 120),
      apply: (e) =>
        Luminous.Settings.setVar(
          `--luminous-background-brightness`,
          String(e / 100),
        ),
    },
    uiBlur: {
      default: 16,
      normalize: B(16, 0, 32),
      apply: (e) => Luminous.Settings.setVar(`--luminous-ui-blur`, `${e}px`),
    },
    paletteStrength: {
      default: 24,
      normalize: B(24, 0, 50),
      apply: (e) => {
        let t = Math.min(78, Math.round(e * 1.6));
        Luminous.Settings.setVar(`--luminous-palette-effect-opacity`, `${t}%`);
      },
    },
    backgroundEnergy: { default: `adaptive`, normalize: () => `adaptive` },
    uiOpacity: {
      default: 50,
      normalize: B(50, 0, 100),
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
      normalize: V(!0),
      apply: (e) => {
        if (
          (Luminous.Settings.toggleClass(`hideDynamicBackground`, !e), je(), e)
        ) {
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
      normalize: H(ke, `auto`),
      apply: (e) => {
        (Ae(`luminous-source-`, ke, e), je());
      },
    },
    musicVideoBackground: {
      default: `video`,
      normalize: H([`video`, `artwork`], `video`),
    },
    dynamicPalette: {
      default: !0,
      normalize: V(!0),
      apply: (e) => {
        e || Luminous.Palette.clear();
      },
    },
    backgroundMotion: {
      default: `drift`,
      normalize: H(Oe, `drift`),
      apply: (e) => Ae(`luminous-motion-`, Oe, e),
    },
    motionDuration: {
      default: 20,
      normalize: B(20, 8, 60),
      apply: (e) => {
        (Luminous.Settings.setVar(`--luminous-motion-duration`, `${e}s`),
          Luminous.Palette.setMotionDuration(e));
      },
    },
    reduceMotion: {
      default: !1,
      normalize: V(!1),
      apply: (e) => Luminous.Settings.toggleClass(`luminous-reduce-motion`, e),
    },
  },
  U = [
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
      key: `musicVideoBackground`,
      label: `Music video background`,
      description: `For full-length NPV videos only. Auto source must be enabled.`,
      section: `appearance`,
      control: `choice`,
      options: [
        { value: `video`, label: `Video` },
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
  Ne = [
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
function Pe() {
  Object.entries(Me).forEach(([e, t]) => {
    Luminous.Settings.register(e, t);
  });
}
var Fe = `Luminous Settings`,
  Ie = `brightness`,
  W = `luminous-theme-modal`,
  Le = `luminous-theme-modal-title`,
  Re = `luminous-theme-modal-description`,
  ze = [
    `button:not([disabled])`,
    `input:not([disabled])`,
    `[href]`,
    `[tabindex]:not([tabindex="-1"])`,
  ].join(`,`),
  G = [
    { id: `presets`, label: `Presets` },
    { id: `appearance`, label: `Appearance` },
    { id: `motion`, label: `Motion` },
    { id: `advanced`, label: `Advanced` },
  ],
  Be = 32,
  Ve = U.map((e) => e.key);
function He() {
  let e = F(),
    t = I(),
    n = R(),
    r = z(),
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
          let r = new Spicetify.Menu.Item(Fe, !1, () => o(!0), Ie);
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
    a ? e.createElement(Ue, { onClose: () => o(!1) }) : null
  );
}
function Ue({ onClose: e }) {
  let t = F(),
    n = I(),
    r = R(),
    i = z(),
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
        let n = Array.from(a.current?.querySelectorAll(ze) ?? []).filter(
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
    let n = G.findIndex((e) => e.id === t),
      r = null;
    (e.key === `ArrowRight` && (r = (n + 1) % G.length),
      e.key === `ArrowLeft` && (r = (n - 1 + G.length) % G.length),
      e.key === `Home` && (r = 0),
      e.key === `End` && (r = G.length - 1),
      r !== null && (e.preventDefault(), u(G[r].id, !0)));
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
        id: W,
        className: `luminous-theme-menu`,
        role: `dialog`,
        'aria-modal': `true`,
        'aria-labelledby': Le,
        'aria-describedby': Re,
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
          t.createElement(`span`, { id: Le }, `Luminous`),
          t.createElement(
            `small`,
            { id: Re },
            `Theme preferences · v${Luminous.version}`,
          ),
        ),
        t.createElement(
          `button`,
          {
            className: `luminous-theme-menu__reset-button`,
            type: `button`,
            onClick: () => {
              (Luminous.Settings.resetMany(Ve),
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
        G.map((e) =>
          t.createElement(
            `button`,
            {
              key: e.id,
              ref: (t) => {
                s.current[e.id] = t;
              },
              id: `${W}-${e.id}-tab`,
              className: `luminous-theme-menu__tab${c === e.id ? ` luminous-theme-menu__tab--active` : ``}`,
              type: `button`,
              role: `tab`,
              tabIndex: c === e.id ? 0 : -1,
              'aria-selected': String(c === e.id),
              'aria-controls': `${W}-${e.id}-panel`,
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
          id: `${W}-${c}-panel`,
          className: `luminous-theme-menu__panel`,
          role: `tabpanel`,
          'aria-labelledby': `${W}-${c}-tab`,
        },
        t.createElement(
          `div`,
          { key: c, className: `luminous-theme-menu__panel-content` },
          t.createElement(Ge, { section: c }),
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
function We() {
  let e = F();
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
      Ne.map((t) =>
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
function Ge({ section: e }) {
  let t = F();
  if (e === `presets`) return t.createElement(We);
  let n = {
      appearance: {
        title: `Appearance`,
        description: `Shape artwork, adaptive colour, and Spotify glass surfaces.`,
      },
      motion: {
        title: `Motion`,
        description: `Tune background movement, timing, and accessibility.`,
      },
      advanced: {
        title: `Advanced`,
        description: `Inspect the current runtime and copy diagnostics for troubleshooting.`,
      },
    }[e],
    r = U.filter((t) => t.section === e);
  return t.createElement(
    t.Fragment,
    null,
    t.createElement(
      `div`,
      { className: `luminous-theme-menu__panel-heading` },
      t.createElement(`h2`, null, n.title),
      t.createElement(`p`, null, n.description),
    ),
    r.map((e) => t.createElement(Ke, { key: e.key, setting: e })),
    e === `advanced` && t.createElement(Xe),
  );
}
function Ke({ setting: e }) {
  return e.control === `toggle`
    ? F().createElement(qe, { setting: e })
    : e.control === `range`
      ? F().createElement(Je, { setting: e })
      : F().createElement(Ye, { setting: e });
}
function qe({ setting: e }) {
  let t = F(),
    n = I(),
    [r, i] = z()(() => Luminous.Settings.get(e.key) === !0);
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
      t.createElement(K, { setting: e }),
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
function Je({ setting: e }) {
  let t = F(),
    n = I(),
    r = R(),
    [i, a] = z()(() => Number(Luminous.Settings.get(e.key))),
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
          }, Be)));
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
        t.createElement(K, { setting: e }),
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
function Ye({ setting: e }) {
  let t = F(),
    n = I(),
    [r, i] = z()(() => String(Luminous.Settings.get(e.key)));
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
      t.createElement(K, { setting: e }),
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
function K({ setting: e }) {
  let t = F();
  return t.createElement(
    `span`,
    { className: `luminous-theme-menu__copy` },
    t.createElement(`span`, null, e.label),
    t.createElement(`small`, null, e.description),
  );
}
function Xe() {
  let e = F(),
    t = I(),
    [n, r] = z()(() => Ze());
  return (
    t(() => {
      let e = () => r(Ze());
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
function Ze() {
  let e = Luminous.Diagnostics.get(),
    t = e.runtime.canvasMode ?? `none`;
  return `Background: ${e.runtime.background} · Canvas: ${t} · UI: ${e.runtime.uiHealth}`;
}
function Qe() {
  return (
    I()(() => {
      let e = [
        j.uiMountWatcher(),
        j.observeCinema(),
        j.mainViewState(),
        j.leftSidebarState(),
        j.playlistBackground(),
      ];
      return () => {
        e.forEach((e) => e.disconnect());
      };
    }, []),
    null
  );
}
var q = `luminous-visibility-hold`;
function $e() {
  return (
    I()(() => {
      let e = document.documentElement,
        t = null,
        n = () => {
          t !== null && (cancelAnimationFrame(t), (t = null));
        },
        r = () => {
          (n(),
            (t = requestAnimationFrame(() => {
              t = requestAnimationFrame(() => {
                ((t = null), e.classList.remove(q));
              });
            })));
        },
        i = () => {
          if (document.visibilityState === `hidden`) {
            (n(), e.classList.add(q));
            return;
          }
          r();
        };
      return (
        document.addEventListener(`visibilitychange`, i, { passive: !0 }),
        i(),
        () => {
          (document.removeEventListener(`visibilitychange`, i),
            n(),
            e.classList.remove(q));
        }
      );
    }, []),
    null
  );
}
function et() {
  let e = F();
  return e.createElement(
    e.Fragment,
    null,
    e.createElement(Ee),
    e.createElement(Qe),
    e.createElement($e),
    e.createElement(xe),
    e.createElement(He),
  );
}
var J = `luminous-react-root`,
  tt = 15e3,
  Y = null,
  X = 0,
  Z = null;
function nt() {
  let e = ++X;
  (Q(),
    at(e)
      .then(() => {
        e === X && it();
      })
      .catch((t) => {
        e === X &&
          Luminous.Logger.error(`Runtime`, `Failed to mount application`, t);
      }));
}
function rt() {
  if ((X++, Q(), Y?.unmount)) (Y.unmount(), (Y = null));
  else if (typeof Spicetify < `u` && Spicetify.ReactDOM) {
    let e = document.getElementById(J);
    e &&
      Spicetify.ReactDOM.unmountComponentAtNode &&
      Spicetify.ReactDOM.unmountComponentAtNode(e);
  }
  document.getElementById(J)?.remove();
}
function it() {
  let e = F(),
    { ReactDOM: t } = Spicetify,
    n = ot(),
    r = e.createElement(et);
  if (t.createRoot) {
    let e = Y ?? t.createRoot(n);
    ((Y = e), e.render(r));
    return;
  }
  t.render(r, n);
}
function at(e) {
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
        if (performance.now() - r > tt) {
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
function ot() {
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
var st =
    `luminous-runtime-active.luminous-bootstrap-pending.hideDynamicBackground.luminous-dynamic-palette.luminous-palette-transitioning.luminous-track-changing.luminous-glass-highlights.luminous-reduce-motion.luminous-runtime-suspended.luminous-settings-open.luminous-document-hidden.luminous-visibility-hold.luminous-parallax-enabled.luminous-source-auto.luminous-source-artwork.luminous-motion-still.luminous-motion-drift.luminous-motion-float.luminous-motion-orbit.luminous-quality-full.luminous-quality-balanced.luminous-quality-lite.luminous-effect-aurora.luminous-effect-ember.luminous-effect-bloom.luminous-effect-prism.luminous-effect-halo.luminous-effect-nebula.luminous-effect-energy-soft.luminous-effect-energy-flow.luminous-effect-energy-vivid.luminous-effect-tone-dark.luminous-effect-tone-balanced.luminous-effect-tone-light`.split(
      `.`,
    ),
  ct = [
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
function lt() {
  if ($) return;
  (($ = !0),
    rt(),
    Luminous.Background.destroy(),
    Luminous.Palette.clear(),
    Luminous.Canvas.destroy(),
    Luminous.Song.destroy(),
    Luminous.Settings.destroy(),
    C.destroy(),
    h.destroy());
  let e = document.documentElement;
  (st.forEach((t) => e.classList.remove(t)),
    ct.forEach((t) => e.style.removeProperty(t)),
    Luminous.Logger.info(`Runtime`, `Destroyed`));
}
function ut() {
  (($ = !1),
    document.documentElement.classList.add(
      `luminous-runtime-active`,
      `luminous-bootstrap-pending`,
    ));
}
(ye(),
  be(lt),
  ut(),
  Luminous.Logger.printBanner(),
  Pe(),
  Luminous.Settings.init(),
  Luminous.Song.init().catch((e) => {
    Luminous.Logger.error(`Song`, `Initialization failed`, e);
  }),
  nt());
