var Gc = Object.defineProperty;
var Kc = (r, e, t) => e in r ? Gc(r, e, {
    enumerable: !0,
    configurable: !0,
    writable: !0,
    value: t
}) : r[e] = t;
var Mt = (r, e, t) => Kc(r, typeof e != "symbol" ? e + "" : e, t);
(function() {
    const e = document.createElement("link").relList;
    if (e && e.supports && e.supports("modulepreload"))
        return;
    for (const i of document.querySelectorAll('link[rel="modulepreload"]'))
        n(i);
    new MutationObserver(i => {
        for (const s of i)
            if (s.type === "childList")
                for (const a of s.addedNodes)
                    a.tagName === "LINK" && a.rel === "modulepreload" && n(a)
    }
    ).observe(document, {
        childList: !0,
        subtree: !0
    });
    function t(i) {
        const s = {};
        return i.integrity && (s.integrity = i.integrity),
        i.referrerPolicy && (s.referrerPolicy = i.referrerPolicy),
        i.crossOrigin === "use-credentials" ? s.credentials = "include" : i.crossOrigin === "anonymous" ? s.credentials = "omit" : s.credentials = "same-origin",
        s
    }
    function n(i) {
        if (i.ep)
            return;
        i.ep = !0;
        const s = t(i);
        fetch(i.href, s)
    }
}
)();
function Hc(r) {
    return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r
}
var Pr = {
    exports: {}
}, is;
function Qc() {
    if (is)
        return Pr.exports;
    is = 1;
    var r = typeof Reflect == "object" ? Reflect : null, e = r && typeof r.apply == "function" ? r.apply : function(w, T, L) {
        return Function.prototype.apply.call(w, T, L)
    }
    , t;
    r && typeof r.ownKeys == "function" ? t = r.ownKeys : Object.getOwnPropertySymbols ? t = function(w) {
        return Object.getOwnPropertyNames(w).concat(Object.getOwnPropertySymbols(w))
    }
    : t = function(w) {
        return Object.getOwnPropertyNames(w)
    }
    ;
    function n(k) {
        console && console.warn && console.warn(k)
    }
    var i = Number.isNaN || function(w) {
        return w !== w
    }
    ;
    function s() {
        s.init.call(this)
    }
    Pr.exports = s,
    Pr.exports.once = C,
    s.EventEmitter = s,
    s.prototype._events = void 0,
    s.prototype._eventsCount = 0,
    s.prototype._maxListeners = void 0;
    var a = 10;
    function c(k) {
        if (typeof k != "function")
            throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof k)
    }
    Object.defineProperty(s, "defaultMaxListeners", {
        enumerable: !0,
        get: function() {
            return a
        },
        set: function(k) {
            if (typeof k != "number" || k < 0 || i(k))
                throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + k + ".");
            a = k
        }
    }),
    s.init = function() {
        (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = Object.create(null),
        this._eventsCount = 0),
        this._maxListeners = this._maxListeners || void 0
    }
    ,
    s.prototype.setMaxListeners = function(w) {
        if (typeof w != "number" || w < 0 || i(w))
            throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + w + ".");
        return this._maxListeners = w,
        this
    }
    ;
    function l(k) {
        return k._maxListeners === void 0 ? s.defaultMaxListeners : k._maxListeners
    }
    s.prototype.getMaxListeners = function() {
        return l(this)
    }
    ,
    s.prototype.emit = function(w) {
        for (var T = [], L = 1; L < arguments.length; L++)
            T.push(arguments[L]);
        var D = w === "error"
          , q = this._events;
        if (q !== void 0)
            D = D && q.error === void 0;
        else if (!D)
            return !1;
        if (D) {
            var U;
            if (T.length > 0 && (U = T[0]),
            U instanceof Error)
                throw U;
            var ae = new Error("Unhandled error." + (U ? " (" + U.message + ")" : ""));
            throw ae.context = U,
            ae
        }
        var Le = q[w];
        if (Le === void 0)
            return !1;
        if (typeof Le == "function")
            e(Le, this, T);
        else
            for (var We = Le.length, bt = b(Le, We), L = 0; L < We; ++L)
                e(bt[L], this, T);
        return !0
    }
    ;
    function u(k, w, T, L) {
        var D, q, U;
        if (c(T),
        q = k._events,
        q === void 0 ? (q = k._events = Object.create(null),
        k._eventsCount = 0) : (q.newListener !== void 0 && (k.emit("newListener", w, T.listener ? T.listener : T),
        q = k._events),
        U = q[w]),
        U === void 0)
            U = q[w] = T,
            ++k._eventsCount;
        else if (typeof U == "function" ? U = q[w] = L ? [T, U] : [U, T] : L ? U.unshift(T) : U.push(T),
        D = l(k),
        D > 0 && U.length > D && !U.warned) {
            U.warned = !0;
            var ae = new Error("Possible EventEmitter memory leak detected. " + U.length + " " + String(w) + " listeners added. Use emitter.setMaxListeners() to increase limit");
            ae.name = "MaxListenersExceededWarning",
            ae.emitter = k,
            ae.type = w,
            ae.count = U.length,
            n(ae)
        }
        return k
    }
    s.prototype.addListener = function(w, T) {
        return u(this, w, T, !1)
    }
    ,
    s.prototype.on = s.prototype.addListener,
    s.prototype.prependListener = function(w, T) {
        return u(this, w, T, !0)
    }
    ;
    function h() {
        if (!this.fired)
            return this.target.removeListener(this.type, this.wrapFn),
            this.fired = !0,
            arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments)
    }
    function m(k, w, T) {
        var L = {
            fired: !1,
            wrapFn: void 0,
            target: k,
            type: w,
            listener: T
        }
          , D = h.bind(L);
        return D.listener = T,
        L.wrapFn = D,
        D
    }
    s.prototype.once = function(w, T) {
        return c(T),
        this.on(w, m(this, w, T)),
        this
    }
    ,
    s.prototype.prependOnceListener = function(w, T) {
        return c(T),
        this.prependListener(w, m(this, w, T)),
        this
    }
    ,
    s.prototype.removeListener = function(w, T) {
        var L, D, q, U, ae;
        if (c(T),
        D = this._events,
        D === void 0)
            return this;
        if (L = D[w],
        L === void 0)
            return this;
        if (L === T || L.listener === T)
            --this._eventsCount === 0 ? this._events = Object.create(null) : (delete D[w],
            D.removeListener && this.emit("removeListener", w, L.listener || T));
        else if (typeof L != "function") {
            for (q = -1,
            U = L.length - 1; U >= 0; U--)
                if (L[U] === T || L[U].listener === T) {
                    ae = L[U].listener,
                    q = U;
                    break
                }
            if (q < 0)
                return this;
            q === 0 ? L.shift() : v(L, q),
            L.length === 1 && (D[w] = L[0]),
            D.removeListener !== void 0 && this.emit("removeListener", w, ae || T)
        }
        return this
    }
    ,
    s.prototype.off = s.prototype.removeListener,
    s.prototype.removeAllListeners = function(w) {
        var T, L, D;
        if (L = this._events,
        L === void 0)
            return this;
        if (L.removeListener === void 0)
            return arguments.length === 0 ? (this._events = Object.create(null),
            this._eventsCount = 0) : L[w] !== void 0 && (--this._eventsCount === 0 ? this._events = Object.create(null) : delete L[w]),
            this;
        if (arguments.length === 0) {
            var q = Object.keys(L), U;
            for (D = 0; D < q.length; ++D)
                U = q[D],
                U !== "removeListener" && this.removeAllListeners(U);
            return this.removeAllListeners("removeListener"),
            this._events = Object.create(null),
            this._eventsCount = 0,
            this
        }
        if (T = L[w],
        typeof T == "function")
            this.removeListener(w, T);
        else if (T !== void 0)
            for (D = T.length - 1; D >= 0; D--)
                this.removeListener(w, T[D]);
        return this
    }
    ;
    function _(k, w, T) {
        var L = k._events;
        if (L === void 0)
            return [];
        var D = L[w];
        return D === void 0 ? [] : typeof D == "function" ? T ? [D.listener || D] : [D] : T ? E(D) : b(D, D.length)
    }
    s.prototype.listeners = function(w) {
        return _(this, w, !0)
    }
    ,
    s.prototype.rawListeners = function(w) {
        return _(this, w, !1)
    }
    ,
    s.listenerCount = function(k, w) {
        return typeof k.listenerCount == "function" ? k.listenerCount(w) : M.call(k, w)
    }
    ,
    s.prototype.listenerCount = M;
    function M(k) {
        var w = this._events;
        if (w !== void 0) {
            var T = w[k];
            if (typeof T == "function")
                return 1;
            if (T !== void 0)
                return T.length
        }
        return 0
    }
    s.prototype.eventNames = function() {
        return this._eventsCount > 0 ? t(this._events) : []
    }
    ;
    function b(k, w) {
        for (var T = new Array(w), L = 0; L < w; ++L)
            T[L] = k[L];
        return T
    }
    function v(k, w) {
        for (; w + 1 < k.length; w++)
            k[w] = k[w + 1];
        k.pop()
    }
    function E(k) {
        for (var w = new Array(k.length), T = 0; T < w.length; ++T)
            w[T] = k[T].listener || k[T];
        return w
    }
    function C(k, w) {
        return new Promise(function(T, L) {
            function D(U) {
                k.removeListener(w, q),
                L(U)
            }
            function q() {
                typeof k.removeListener == "function" && k.removeListener("error", D),
                T([].slice.call(arguments))
            }
            N(k, w, q, {
                once: !0
            }),
            w !== "error" && x(k, D, {
                once: !0
            })
        }
        )
    }
    function x(k, w, T) {
        typeof k.on == "function" && N(k, "error", w, T)
    }
    function N(k, w, T, L) {
        if (typeof k.on == "function")
            L.once ? k.once(w, T) : k.on(w, T);
        else if (typeof k.addEventListener == "function")
            k.addEventListener(w, function D(q) {
                L.once && k.removeEventListener(w, D),
                T(q)
            });
        else
            throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof k)
    }
    return Pr.exports
}
var bo = Qc();
const Yc = Hc(bo);
var fe = [];
for (var Tn = 0; Tn < 256; ++Tn)
    fe.push((Tn + 256).toString(16).slice(1));
function Xc(r, e=0) {
    return (fe[r[e + 0]] + fe[r[e + 1]] + fe[r[e + 2]] + fe[r[e + 3]] + "-" + fe[r[e + 4]] + fe[r[e + 5]] + "-" + fe[r[e + 6]] + fe[r[e + 7]] + "-" + fe[r[e + 8]] + fe[r[e + 9]] + "-" + fe[r[e + 10]] + fe[r[e + 11]] + fe[r[e + 12]] + fe[r[e + 13]] + fe[r[e + 14]] + fe[r[e + 15]]).toLowerCase()
}
var Ir, Zc = new Uint8Array(16);
function el() {
    if (!Ir && (Ir = typeof crypto < "u" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto),
    !Ir))
        throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    return Ir(Zc)
}
var tl = typeof crypto < "u" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
const ss = {
    randomUUID: tl
};
function rl(r, e, t) {
    if (ss.randomUUID && !e && !r)
        return ss.randomUUID();
    r = r || {};
    var n = r.random || (r.rng || el)();
    if (n[6] = n[6] & 15 | 64,
    n[8] = n[8] & 63 | 128,
    e) {
        t = t || 0;
        for (var i = 0; i < 16; ++i)
            e[t + i] = n[i];
        return e
    }
    return Xc(n)
}
const nl = {
    AmazonBot: "amazonbot",
    "Amazon Silk": "amazon_silk",
    "Android Browser": "android",
    BaiduSpider: "baiduspider",
    Bada: "bada",
    BingCrawler: "bingcrawler",
    BlackBerry: "blackberry",
    "ChatGPT-User": "chatgpt_user",
    Chrome: "chrome",
    ClaudeBot: "claudebot",
    Chromium: "chromium",
    Diffbot: "diffbot",
    DuckDuckBot: "duckduckbot",
    Electron: "electron",
    Epiphany: "epiphany",
    FacebookExternalHit: "facebookexternalhit",
    Firefox: "firefox",
    Focus: "focus",
    Generic: "generic",
    "Google Search": "google_search",
    Googlebot: "googlebot",
    GPTBot: "gptbot",
    "Internet Explorer": "ie",
    InternetArchiveCrawler: "internetarchivecrawler",
    "K-Meleon": "k_meleon",
    LibreWolf: "librewolf",
    Maxthon: "maxthon",
    "Meta-ExternalAds": "meta_externalads",
    "Meta-ExternalAgent": "meta_externalagent",
    "Meta-ExternalFetcher": "meta_externalfetcher",
    "Meta-WebIndexer": "meta_webindexer",
    "Microsoft Edge": "edge",
    "MZ Browser": "mz",
    "NAVER Whale Browser": "naver",
    "OAI-SearchBot": "oai_searchbot",
    Omgilibot: "omgilibot",
    Opera: "opera",
    "Opera Coast": "opera_coast",
    "Pale Moon": "pale_moon",
    PerplexityBot: "perplexitybot",
    "Perplexity-User": "perplexity_user",
    PhantomJS: "phantomjs",
    PingdomBot: "pingdombot",
    Puffin: "puffin",
    QQ: "qq",
    QQLite: "qqlite",
    QupZilla: "qupzilla",
    Roku: "roku",
    Safari: "safari",
    Sailfish: "sailfish",
    "Samsung Internet for Android": "samsung_internet",
    SeaMonkey: "seamonkey",
    Sleipnir: "sleipnir",
    "Sogou Browser": "sogou",
    Swing: "swing",
    Tizen: "tizen",
    "UC Browser": "uc",
    Vivaldi: "vivaldi",
    "WebOS Browser": "webos",
    WeChat: "wechat",
    YahooSlurp: "yahooslurp",
    "Yandex Browser": "yandex",
    YandexBot: "yandexbot",
    YouBot: "youbot"
}
  , yo = {
    amazonbot: "AmazonBot",
    amazon_silk: "Amazon Silk",
    android: "Android Browser",
    baiduspider: "BaiduSpider",
    bada: "Bada",
    bingcrawler: "BingCrawler",
    blackberry: "BlackBerry",
    chatgpt_user: "ChatGPT-User",
    chrome: "Chrome",
    claudebot: "ClaudeBot",
    chromium: "Chromium",
    diffbot: "Diffbot",
    duckduckbot: "DuckDuckBot",
    edge: "Microsoft Edge",
    electron: "Electron",
    epiphany: "Epiphany",
    facebookexternalhit: "FacebookExternalHit",
    firefox: "Firefox",
    focus: "Focus",
    generic: "Generic",
    google_search: "Google Search",
    googlebot: "Googlebot",
    gptbot: "GPTBot",
    ie: "Internet Explorer",
    internetarchivecrawler: "InternetArchiveCrawler",
    k_meleon: "K-Meleon",
    librewolf: "LibreWolf",
    maxthon: "Maxthon",
    meta_externalads: "Meta-ExternalAds",
    meta_externalagent: "Meta-ExternalAgent",
    meta_externalfetcher: "Meta-ExternalFetcher",
    meta_webindexer: "Meta-WebIndexer",
    mz: "MZ Browser",
    naver: "NAVER Whale Browser",
    oai_searchbot: "OAI-SearchBot",
    omgilibot: "Omgilibot",
    opera: "Opera",
    opera_coast: "Opera Coast",
    pale_moon: "Pale Moon",
    perplexitybot: "PerplexityBot",
    perplexity_user: "Perplexity-User",
    phantomjs: "PhantomJS",
    pingdombot: "PingdomBot",
    puffin: "Puffin",
    qq: "QQ Browser",
    qqlite: "QQ Browser Lite",
    qupzilla: "QupZilla",
    roku: "Roku",
    safari: "Safari",
    sailfish: "Sailfish",
    samsung_internet: "Samsung Internet for Android",
    seamonkey: "SeaMonkey",
    sleipnir: "Sleipnir",
    sogou: "Sogou Browser",
    swing: "Swing",
    tizen: "Tizen",
    uc: "UC Browser",
    vivaldi: "Vivaldi",
    webos: "WebOS Browser",
    wechat: "WeChat",
    yahooslurp: "YahooSlurp",
    yandex: "Yandex Browser",
    yandexbot: "YandexBot",
    youbot: "YouBot"
}
  , V = {
    bot: "bot",
    desktop: "desktop",
    mobile: "mobile",
    tablet: "tablet",
    tv: "tv"
}
  , he = {
    Android: "Android",
    Bada: "Bada",
    BlackBerry: "BlackBerry",
    ChromeOS: "Chrome OS",
    HarmonyOS: "HarmonyOS",
    iOS: "iOS",
    Linux: "Linux",
    MacOS: "macOS",
    PlayStation4: "PlayStation 4",
    Roku: "Roku",
    Tizen: "Tizen",
    WebOS: "WebOS",
    Windows: "Windows",
    WindowsPhone: "Windows Phone"
}
  , lt = {
    Blink: "Blink",
    EdgeHTML: "EdgeHTML",
    Gecko: "Gecko",
    Presto: "Presto",
    Trident: "Trident",
    WebKit: "WebKit"
};
class y {
    static getFirstMatch(e, t) {
        const n = t.match(e);
        return n && n.length > 0 && n[1] || ""
    }
    static getSecondMatch(e, t) {
        const n = t.match(e);
        return n && n.length > 1 && n[2] || ""
    }
    static matchAndReturnConst(e, t, n) {
        if (e.test(t))
            return n
    }
    static getWindowsVersionName(e) {
        switch (e) {
        case "NT":
            return "NT";
        case "XP":
            return "XP";
        case "NT 5.0":
            return "2000";
        case "NT 5.1":
            return "XP";
        case "NT 5.2":
            return "2003";
        case "NT 6.0":
            return "Vista";
        case "NT 6.1":
            return "7";
        case "NT 6.2":
            return "8";
        case "NT 6.3":
            return "8.1";
        case "NT 10.0":
            return "10";
        default:
            return
        }
    }
    static getMacOSVersionName(e) {
        const t = e.split(".").splice(0, 2).map(s => parseInt(s, 10) || 0);
        t.push(0);
        const n = t[0]
          , i = t[1];
        if (n === 10)
            switch (i) {
            case 5:
                return "Leopard";
            case 6:
                return "Snow Leopard";
            case 7:
                return "Lion";
            case 8:
                return "Mountain Lion";
            case 9:
                return "Mavericks";
            case 10:
                return "Yosemite";
            case 11:
                return "El Capitan";
            case 12:
                return "Sierra";
            case 13:
                return "High Sierra";
            case 14:
                return "Mojave";
            case 15:
                return "Catalina";
            default:
                return
            }
        switch (n) {
        case 11:
            return "Big Sur";
        case 12:
            return "Monterey";
        case 13:
            return "Ventura";
        case 14:
            return "Sonoma";
        case 15:
            return "Sequoia";
        default:
            return
        }
    }
    static getAndroidVersionName(e) {
        const t = e.split(".").splice(0, 2).map(n => parseInt(n, 10) || 0);
        if (t.push(0),
        !(t[0] === 1 && t[1] < 5)) {
            if (t[0] === 1 && t[1] < 6)
                return "Cupcake";
            if (t[0] === 1 && t[1] >= 6)
                return "Donut";
            if (t[0] === 2 && t[1] < 2)
                return "Eclair";
            if (t[0] === 2 && t[1] === 2)
                return "Froyo";
            if (t[0] === 2 && t[1] > 2)
                return "Gingerbread";
            if (t[0] === 3)
                return "Honeycomb";
            if (t[0] === 4 && t[1] < 1)
                return "Ice Cream Sandwich";
            if (t[0] === 4 && t[1] < 4)
                return "Jelly Bean";
            if (t[0] === 4 && t[1] >= 4)
                return "KitKat";
            if (t[0] === 5)
                return "Lollipop";
            if (t[0] === 6)
                return "Marshmallow";
            if (t[0] === 7)
                return "Nougat";
            if (t[0] === 8)
                return "Oreo";
            if (t[0] === 9)
                return "Pie"
        }
    }
    static getVersionPrecision(e) {
        return e.split(".").length
    }
    static compareVersions(e, t, n=!1) {
        const i = y.getVersionPrecision(e)
          , s = y.getVersionPrecision(t);
        let a = Math.max(i, s)
          , c = 0;
        const l = y.map([e, t], u => {
            const h = a - y.getVersionPrecision(u)
              , m = u + new Array(h + 1).join(".0");
            return y.map(m.split("."), _ => new Array(20 - _.length).join("0") + _).reverse()
        }
        );
        for (n && (c = a - Math.min(i, s)),
        a -= 1; a >= c; ) {
            if (l[0][a] > l[1][a])
                return 1;
            if (l[0][a] === l[1][a]) {
                if (a === c)
                    return 0;
                a -= 1
            } else if (l[0][a] < l[1][a])
                return -1
        }
    }
    static map(e, t) {
        const n = [];
        let i;
        if (Array.prototype.map)
            return Array.prototype.map.call(e, t);
        for (i = 0; i < e.length; i += 1)
            n.push(t(e[i]));
        return n
    }
    static find(e, t) {
        let n, i;
        if (Array.prototype.find)
            return Array.prototype.find.call(e, t);
        for (n = 0,
        i = e.length; n < i; n += 1) {
            const s = e[n];
            if (t(s, n))
                return s
        }
    }
    static assign(e, ...t) {
        const n = e;
        let i, s;
        if (Object.assign)
            return Object.assign(e, ...t);
        for (i = 0,
        s = t.length; i < s; i += 1) {
            const a = t[i];
            typeof a == "object" && a !== null && Object.keys(a).forEach(l => {
                n[l] = a[l]
            }
            )
        }
        return e
    }
    static getBrowserAlias(e) {
        return nl[e]
    }
    static getBrowserTypeByAlias(e) {
        return yo[e] || ""
    }
}
const j = /version\/(\d+(\.?_?\d+)+)/i
  , il = [{
    test: [/gptbot/i],
    describe(r) {
        const e = {
            name: "GPTBot"
        }
          , t = y.getFirstMatch(/gptbot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/chatgpt-user/i],
    describe(r) {
        const e = {
            name: "ChatGPT-User"
        }
          , t = y.getFirstMatch(/chatgpt-user\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/oai-searchbot/i],
    describe(r) {
        const e = {
            name: "OAI-SearchBot"
        }
          , t = y.getFirstMatch(/oai-searchbot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i],
    describe(r) {
        const e = {
            name: "ClaudeBot"
        }
          , t = y.getFirstMatch(/(?:claudebot|claude-web|claude-user|claude-searchbot)\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/omgilibot/i, /webzio-extended/i],
    describe(r) {
        const e = {
            name: "Omgilibot"
        }
          , t = y.getFirstMatch(/(?:omgilibot|webzio-extended)\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/diffbot/i],
    describe(r) {
        const e = {
            name: "Diffbot"
        }
          , t = y.getFirstMatch(/diffbot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/perplexitybot/i],
    describe(r) {
        const e = {
            name: "PerplexityBot"
        }
          , t = y.getFirstMatch(/perplexitybot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/perplexity-user/i],
    describe(r) {
        const e = {
            name: "Perplexity-User"
        }
          , t = y.getFirstMatch(/perplexity-user\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/youbot/i],
    describe(r) {
        const e = {
            name: "YouBot"
        }
          , t = y.getFirstMatch(/youbot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/meta-webindexer/i],
    describe(r) {
        const e = {
            name: "Meta-WebIndexer"
        }
          , t = y.getFirstMatch(/meta-webindexer\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/meta-externalads/i],
    describe(r) {
        const e = {
            name: "Meta-ExternalAds"
        }
          , t = y.getFirstMatch(/meta-externalads\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/meta-externalagent/i],
    describe(r) {
        const e = {
            name: "Meta-ExternalAgent"
        }
          , t = y.getFirstMatch(/meta-externalagent\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/meta-externalfetcher/i],
    describe(r) {
        const e = {
            name: "Meta-ExternalFetcher"
        }
          , t = y.getFirstMatch(/meta-externalfetcher\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/googlebot/i],
    describe(r) {
        const e = {
            name: "Googlebot"
        }
          , t = y.getFirstMatch(/googlebot\/(\d+(\.\d+))/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/amazonbot/i],
    describe(r) {
        const e = {
            name: "AmazonBot"
        }
          , t = y.getFirstMatch(/amazonbot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/bingbot/i],
    describe(r) {
        const e = {
            name: "BingCrawler"
        }
          , t = y.getFirstMatch(/bingbot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/baiduspider/i],
    describe(r) {
        const e = {
            name: "BaiduSpider"
        }
          , t = y.getFirstMatch(/baiduspider\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/duckduckbot/i],
    describe(r) {
        const e = {
            name: "DuckDuckBot"
        }
          , t = y.getFirstMatch(/duckduckbot\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/ia_archiver/i],
    describe(r) {
        const e = {
            name: "InternetArchiveCrawler"
        }
          , t = y.getFirstMatch(/ia_archiver\/(\d+(\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/facebookexternalhit/i, /facebookcatalog/i],
    describe() {
        return {
            name: "FacebookExternalHit"
        }
    }
}, {
    test: [/yahoo!?[\s/]*slurp/i],
    describe() {
        return {
            name: "YahooSlurp"
        }
    }
}, {
    test: [/yandexbot/i, /yandexmobilebot/i],
    describe() {
        return {
            name: "YandexBot"
        }
    }
}, {
    test: [/pingdom/i],
    describe() {
        return {
            name: "PingdomBot"
        }
    }
}, {
    test: [/opera/i],
    describe(r) {
        const e = {
            name: "Opera"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/opr\/|opios/i],
    describe(r) {
        const e = {
            name: "Opera"
        }
          , t = y.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/SamsungBrowser/i],
    describe(r) {
        const e = {
            name: "Samsung Internet for Android"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/Whale/i],
    describe(r) {
        const e = {
            name: "NAVER Whale Browser"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/PaleMoon/i],
    describe(r) {
        const e = {
            name: "Pale Moon"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:PaleMoon)[\s/](\d+(?:\.\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/MZBrowser/i],
    describe(r) {
        const e = {
            name: "MZ Browser"
        }
          , t = y.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/focus/i],
    describe(r) {
        const e = {
            name: "Focus"
        }
          , t = y.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/swing/i],
    describe(r) {
        const e = {
            name: "Swing"
        }
          , t = y.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/coast/i],
    describe(r) {
        const e = {
            name: "Opera Coast"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/opt\/\d+(?:.?_?\d+)+/i],
    describe(r) {
        const e = {
            name: "Opera Touch"
        }
          , t = y.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/yabrowser/i],
    describe(r) {
        const e = {
            name: "Yandex Browser"
        }
          , t = y.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/ucbrowser/i],
    describe(r) {
        const e = {
            name: "UC Browser"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/Maxthon|mxios/i],
    describe(r) {
        const e = {
            name: "Maxthon"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/epiphany/i],
    describe(r) {
        const e = {
            name: "Epiphany"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/puffin/i],
    describe(r) {
        const e = {
            name: "Puffin"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/sleipnir/i],
    describe(r) {
        const e = {
            name: "Sleipnir"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/k-meleon/i],
    describe(r) {
        const e = {
            name: "K-Meleon"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/micromessenger/i],
    describe(r) {
        const e = {
            name: "WeChat"
        }
          , t = y.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/qqbrowser/i],
    describe(r) {
        const e = {
            name: /qqbrowserlite/i.test(r) ? "QQ Browser Lite" : "QQ Browser"
        }
          , t = y.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/msie|trident/i],
    describe(r) {
        const e = {
            name: "Internet Explorer"
        }
          , t = y.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/\sedg\//i],
    describe(r) {
        const e = {
            name: "Microsoft Edge"
        }
          , t = y.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/edg([ea]|ios)/i],
    describe(r) {
        const e = {
            name: "Microsoft Edge"
        }
          , t = y.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/vivaldi/i],
    describe(r) {
        const e = {
            name: "Vivaldi"
        }
          , t = y.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/seamonkey/i],
    describe(r) {
        const e = {
            name: "SeaMonkey"
        }
          , t = y.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/sailfish/i],
    describe(r) {
        const e = {
            name: "Sailfish"
        }
          , t = y.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/silk/i],
    describe(r) {
        const e = {
            name: "Amazon Silk"
        }
          , t = y.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/phantom/i],
    describe(r) {
        const e = {
            name: "PhantomJS"
        }
          , t = y.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/slimerjs/i],
    describe(r) {
        const e = {
            name: "SlimerJS"
        }
          , t = y.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
    describe(r) {
        const e = {
            name: "BlackBerry"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/(web|hpw)[o0]s/i],
    describe(r) {
        const e = {
            name: "WebOS Browser"
        }
          , t = y.getFirstMatch(j, r) || y.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/bada/i],
    describe(r) {
        const e = {
            name: "Bada"
        }
          , t = y.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/tizen/i],
    describe(r) {
        const e = {
            name: "Tizen"
        }
          , t = y.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/qupzilla/i],
    describe(r) {
        const e = {
            name: "QupZilla"
        }
          , t = y.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/librewolf/i],
    describe(r) {
        const e = {
            name: "LibreWolf"
        }
          , t = y.getFirstMatch(/(?:librewolf)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/firefox|iceweasel|fxios/i],
    describe(r) {
        const e = {
            name: "Firefox"
        }
          , t = y.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/electron/i],
    describe(r) {
        const e = {
            name: "Electron"
        }
          , t = y.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/sogoumobilebrowser/i, /metasr/i, /se 2\.[x]/i],
    describe(r) {
        const e = {
            name: "Sogou Browser"
        }
          , t = y.getFirstMatch(/(?:sogoumobilebrowser)[\s/](\d+(\.?_?\d+)+)/i, r)
          , n = y.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, r)
          , i = y.getFirstMatch(/se ([\d.]+)x/i, r)
          , s = t || n || i;
        return s && (e.version = s),
        e
    }
}, {
    test: [/MiuiBrowser/i],
    describe(r) {
        const e = {
            name: "Miui"
        }
          , t = y.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/chromium/i],
    describe(r) {
        const e = {
            name: "Chromium"
        }
          , t = y.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i, r) || y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/chrome|crios|crmo/i],
    describe(r) {
        const e = {
            name: "Chrome"
        }
          , t = y.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/GSA/i],
    describe(r) {
        const e = {
            name: "Google Search"
        }
          , t = y.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test(r) {
        const e = !r.test(/like android/i)
          , t = r.test(/android/i);
        return e && t
    },
    describe(r) {
        const e = {
            name: "Android Browser"
        }
          , t = y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/playstation 4/i],
    describe(r) {
        const e = {
            name: "PlayStation 4"
        }
          , t = y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/safari|applewebkit/i],
    describe(r) {
        const e = {
            name: "Safari"
        }
          , t = y.getFirstMatch(j, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/.*/i],
    describe(r) {
        const e = /^(.*)\/(.*) /
          , t = /^(.*)\/(.*)[ \t]\((.*)/
          , i = r.search("\\(") !== -1 ? t : e;
        return {
            name: y.getFirstMatch(i, r),
            version: y.getSecondMatch(i, r)
        }
    }
}]
  , sl = [{
    test: [/Roku\/DVP/],
    describe(r) {
        const e = y.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i, r);
        return {
            name: he.Roku,
            version: e
        }
    }
}, {
    test: [/windows phone/i],
    describe(r) {
        const e = y.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i, r);
        return {
            name: he.WindowsPhone,
            version: e
        }
    }
}, {
    test: [/windows /i],
    describe(r) {
        const e = y.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i, r)
          , t = y.getWindowsVersionName(e);
        return {
            name: he.Windows,
            version: e,
            versionName: t
        }
    }
}, {
    test: [/Macintosh(.*?) FxiOS(.*?)\//],
    describe(r) {
        const e = {
            name: he.iOS
        }
          , t = y.getSecondMatch(/(Version\/)(\d[\d.]+)/, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/macintosh/i],
    describe(r) {
        const e = y.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i, r).replace(/[_\s]/g, ".")
          , t = y.getMacOSVersionName(e)
          , n = {
            name: he.MacOS,
            version: e
        };
        return t && (n.versionName = t),
        n
    }
}, {
    test: [/(ipod|iphone|ipad)/i],
    describe(r) {
        const e = y.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, r).replace(/[_\s]/g, ".");
        return {
            name: he.iOS,
            version: e
        }
    }
}, {
    test: [/OpenHarmony/i],
    describe(r) {
        const e = y.getFirstMatch(/OpenHarmony\s+(\d+(\.\d+)*)/i, r);
        return {
            name: he.HarmonyOS,
            version: e
        }
    }
}, {
    test(r) {
        const e = !r.test(/like android/i)
          , t = r.test(/android/i);
        return e && t
    },
    describe(r) {
        const e = y.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i, r)
          , t = y.getAndroidVersionName(e)
          , n = {
            name: he.Android,
            version: e
        };
        return t && (n.versionName = t),
        n
    }
}, {
    test: [/(web|hpw)[o0]s/i],
    describe(r) {
        const e = y.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i, r)
          , t = {
            name: he.WebOS
        };
        return e && e.length && (t.version = e),
        t
    }
}, {
    test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
    describe(r) {
        const e = y.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i, r) || y.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i, r) || y.getFirstMatch(/\bbb(\d+)/i, r);
        return {
            name: he.BlackBerry,
            version: e
        }
    }
}, {
    test: [/bada/i],
    describe(r) {
        const e = y.getFirstMatch(/bada\/(\d+(\.\d+)*)/i, r);
        return {
            name: he.Bada,
            version: e
        }
    }
}, {
    test: [/tizen/i],
    describe(r) {
        const e = y.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i, r);
        return {
            name: he.Tizen,
            version: e
        }
    }
}, {
    test: [/linux/i],
    describe() {
        return {
            name: he.Linux
        }
    }
}, {
    test: [/CrOS/],
    describe() {
        return {
            name: he.ChromeOS
        }
    }
}, {
    test: [/PlayStation 4/],
    describe(r) {
        const e = y.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i, r);
        return {
            name: he.PlayStation4,
            version: e
        }
    }
}]
  , al = [{
    test: [/googlebot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Google"
        }
    }
}, {
    test: [/amazonbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Amazon"
        }
    }
}, {
    test: [/gptbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "OpenAI"
        }
    }
}, {
    test: [/chatgpt-user/i],
    describe() {
        return {
            type: V.bot,
            vendor: "OpenAI"
        }
    }
}, {
    test: [/oai-searchbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "OpenAI"
        }
    }
}, {
    test: [/baiduspider/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Baidu"
        }
    }
}, {
    test: [/bingbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Bing"
        }
    }
}, {
    test: [/duckduckbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "DuckDuckGo"
        }
    }
}, {
    test: [/claudebot/i, /claude-web/i, /claude-user/i, /claude-searchbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Anthropic"
        }
    }
}, {
    test: [/omgilibot/i, /webzio-extended/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Webz.io"
        }
    }
}, {
    test: [/diffbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Diffbot"
        }
    }
}, {
    test: [/perplexitybot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Perplexity AI"
        }
    }
}, {
    test: [/perplexity-user/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Perplexity AI"
        }
    }
}, {
    test: [/youbot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "You.com"
        }
    }
}, {
    test: [/ia_archiver/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Internet Archive"
        }
    }
}, {
    test: [/meta-webindexer/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Meta"
        }
    }
}, {
    test: [/meta-externalads/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Meta"
        }
    }
}, {
    test: [/meta-externalagent/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Meta"
        }
    }
}, {
    test: [/meta-externalfetcher/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Meta"
        }
    }
}, {
    test: [/facebookexternalhit/i, /facebookcatalog/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Meta"
        }
    }
}, {
    test: [/yahoo/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Yahoo"
        }
    }
}, {
    test: [/yandexbot/i, /yandexmobilebot/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Yandex"
        }
    }
}, {
    test: [/pingdom/i],
    describe() {
        return {
            type: V.bot,
            vendor: "Pingdom"
        }
    }
}, {
    test: [/huawei/i],
    describe(r) {
        const e = y.getFirstMatch(/(can-l01)/i, r) && "Nova"
          , t = {
            type: V.mobile,
            vendor: "Huawei"
        };
        return e && (t.model = e),
        t
    }
}, {
    test: [/nexus\s*(?:7|8|9|10).*/i],
    describe() {
        return {
            type: V.tablet,
            vendor: "Nexus"
        }
    }
}, {
    test: [/ipad/i],
    describe() {
        return {
            type: V.tablet,
            vendor: "Apple",
            model: "iPad"
        }
    }
}, {
    test: [/Macintosh(.*?) FxiOS(.*?)\//],
    describe() {
        return {
            type: V.tablet,
            vendor: "Apple",
            model: "iPad"
        }
    }
}, {
    test: [/kftt build/i],
    describe() {
        return {
            type: V.tablet,
            vendor: "Amazon",
            model: "Kindle Fire HD 7"
        }
    }
}, {
    test: [/silk/i],
    describe() {
        return {
            type: V.tablet,
            vendor: "Amazon"
        }
    }
}, {
    test: [/tablet(?! pc)/i],
    describe() {
        return {
            type: V.tablet
        }
    }
}, {
    test(r) {
        const e = r.test(/ipod|iphone/i)
          , t = r.test(/like (ipod|iphone)/i);
        return e && !t
    },
    describe(r) {
        const e = y.getFirstMatch(/(ipod|iphone)/i, r);
        return {
            type: V.mobile,
            vendor: "Apple",
            model: e
        }
    }
}, {
    test: [/nexus\s*[0-6].*/i, /galaxy nexus/i],
    describe() {
        return {
            type: V.mobile,
            vendor: "Nexus"
        }
    }
}, {
    test: [/Nokia/i],
    describe(r) {
        const e = y.getFirstMatch(/Nokia\s+([0-9]+(\.[0-9]+)?)/i, r)
          , t = {
            type: V.mobile,
            vendor: "Nokia"
        };
        return e && (t.model = e),
        t
    }
}, {
    test: [/[^-]mobi/i],
    describe() {
        return {
            type: V.mobile
        }
    }
}, {
    test(r) {
        return r.getBrowserName(!0) === "blackberry"
    },
    describe() {
        return {
            type: V.mobile,
            vendor: "BlackBerry"
        }
    }
}, {
    test(r) {
        return r.getBrowserName(!0) === "bada"
    },
    describe() {
        return {
            type: V.mobile
        }
    }
}, {
    test(r) {
        return r.getBrowserName() === "windows phone"
    },
    describe() {
        return {
            type: V.mobile,
            vendor: "Microsoft"
        }
    }
}, {
    test(r) {
        const e = Number(String(r.getOSVersion()).split(".")[0]);
        return r.getOSName(!0) === "android" && e >= 3
    },
    describe() {
        return {
            type: V.tablet
        }
    }
}, {
    test(r) {
        return r.getOSName(!0) === "android"
    },
    describe() {
        return {
            type: V.mobile
        }
    }
}, {
    test(r) {
        return r.getOSName(!0) === "macos"
    },
    describe() {
        return {
            type: V.desktop,
            vendor: "Apple"
        }
    }
}, {
    test(r) {
        return r.getOSName(!0) === "windows"
    },
    describe() {
        return {
            type: V.desktop
        }
    }
}, {
    test(r) {
        return r.getOSName(!0) === "linux"
    },
    describe() {
        return {
            type: V.desktop
        }
    }
}, {
    test(r) {
        return r.getOSName(!0) === "playstation 4"
    },
    describe() {
        return {
            type: V.tv
        }
    }
}, {
    test(r) {
        return r.getOSName(!0) === "roku"
    },
    describe() {
        return {
            type: V.tv
        }
    }
}]
  , ol = [{
    test(r) {
        return r.getBrowserName(!0) === "microsoft edge"
    },
    describe(r) {
        if (/\sedg\//i.test(r))
            return {
                name: lt.Blink
            };
        const t = y.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, r);
        return {
            name: lt.EdgeHTML,
            version: t
        }
    }
}, {
    test: [/trident/i],
    describe(r) {
        const e = {
            name: lt.Trident
        }
          , t = y.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test(r) {
        return r.test(/presto/i)
    },
    describe(r) {
        const e = {
            name: lt.Presto
        }
          , t = y.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test(r) {
        const e = r.test(/gecko/i)
          , t = r.test(/like gecko/i);
        return e && !t
    },
    describe(r) {
        const e = {
            name: lt.Gecko
        }
          , t = y.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/(apple)?webkit\/537\.36/i],
    describe() {
        return {
            name: lt.Blink
        }
    }
}, {
    test: [/(apple)?webkit/i],
    describe(r) {
        const e = {
            name: lt.WebKit
        }
          , t = y.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}];
class as {
    constructor(e, t=!1) {
        if (e == null || e === "")
            throw new Error("UserAgent parameter can't be empty");
        this._ua = e,
        this.parsedResult = {},
        t !== !0 && this.parse()
    }
    getUA() {
        return this._ua
    }
    test(e) {
        return e.test(this._ua)
    }
    parseBrowser() {
        this.parsedResult.browser = {};
        const e = y.find(il, t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (Array.isArray(t.test))
                return t.test.some(n => this.test(n));
            throw new Error("Browser's test function is not valid")
        }
        );
        return e && (this.parsedResult.browser = e.describe(this.getUA())),
        this.parsedResult.browser
    }
    getBrowser() {
        return this.parsedResult.browser ? this.parsedResult.browser : this.parseBrowser()
    }
    getBrowserName(e) {
        return e ? String(this.getBrowser().name).toLowerCase() || "" : this.getBrowser().name || ""
    }
    getBrowserVersion() {
        return this.getBrowser().version
    }
    getOS() {
        return this.parsedResult.os ? this.parsedResult.os : this.parseOS()
    }
    parseOS() {
        this.parsedResult.os = {};
        const e = y.find(sl, t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (Array.isArray(t.test))
                return t.test.some(n => this.test(n));
            throw new Error("Browser's test function is not valid")
        }
        );
        return e && (this.parsedResult.os = e.describe(this.getUA())),
        this.parsedResult.os
    }
    getOSName(e) {
        const {name: t} = this.getOS();
        return e ? String(t).toLowerCase() || "" : t || ""
    }
    getOSVersion() {
        return this.getOS().version
    }
    getPlatform() {
        return this.parsedResult.platform ? this.parsedResult.platform : this.parsePlatform()
    }
    getPlatformType(e=!1) {
        const {type: t} = this.getPlatform();
        return e ? String(t).toLowerCase() || "" : t || ""
    }
    parsePlatform() {
        this.parsedResult.platform = {};
        const e = y.find(al, t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (Array.isArray(t.test))
                return t.test.some(n => this.test(n));
            throw new Error("Browser's test function is not valid")
        }
        );
        return e && (this.parsedResult.platform = e.describe(this.getUA())),
        this.parsedResult.platform
    }
    getEngine() {
        return this.parsedResult.engine ? this.parsedResult.engine : this.parseEngine()
    }
    getEngineName(e) {
        return e ? String(this.getEngine().name).toLowerCase() || "" : this.getEngine().name || ""
    }
    parseEngine() {
        this.parsedResult.engine = {};
        const e = y.find(ol, t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (Array.isArray(t.test))
                return t.test.some(n => this.test(n));
            throw new Error("Browser's test function is not valid")
        }
        );
        return e && (this.parsedResult.engine = e.describe(this.getUA())),
        this.parsedResult.engine
    }
    parse() {
        return this.parseBrowser(),
        this.parseOS(),
        this.parsePlatform(),
        this.parseEngine(),
        this
    }
    getResult() {
        return y.assign({}, this.parsedResult)
    }
    satisfies(e) {
        const t = {};
        let n = 0;
        const i = {};
        let s = 0;
        if (Object.keys(e).forEach(c => {
            const l = e[c];
            typeof l == "string" ? (i[c] = l,
            s += 1) : typeof l == "object" && (t[c] = l,
            n += 1)
        }
        ),
        n > 0) {
            const c = Object.keys(t)
              , l = y.find(c, h => this.isOS(h));
            if (l) {
                const h = this.satisfies(t[l]);
                if (h !== void 0)
                    return h
            }
            const u = y.find(c, h => this.isPlatform(h));
            if (u) {
                const h = this.satisfies(t[u]);
                if (h !== void 0)
                    return h
            }
        }
        if (s > 0) {
            const c = Object.keys(i)
              , l = y.find(c, u => this.isBrowser(u, !0));
            if (l !== void 0)
                return this.compareVersion(i[l])
        }
    }
    isBrowser(e, t=!1) {
        const n = this.getBrowserName().toLowerCase();
        let i = e.toLowerCase();
        const s = y.getBrowserTypeByAlias(i);
        return t && s && (i = s.toLowerCase()),
        i === n
    }
    compareVersion(e) {
        let t = [0]
          , n = e
          , i = !1;
        const s = this.getBrowserVersion();
        if (typeof s == "string")
            return e[0] === ">" || e[0] === "<" ? (n = e.substr(1),
            e[1] === "=" ? (i = !0,
            n = e.substr(2)) : t = [],
            e[0] === ">" ? t.push(1) : t.push(-1)) : e[0] === "=" ? n = e.substr(1) : e[0] === "~" && (i = !0,
            n = e.substr(1)),
            t.indexOf(y.compareVersions(s, n, i)) > -1
    }
    isOS(e) {
        return this.getOSName(!0) === String(e).toLowerCase()
    }
    isPlatform(e) {
        return this.getPlatformType(!0) === String(e).toLowerCase()
    }
    isEngine(e) {
        return this.getEngineName(!0) === String(e).toLowerCase()
    }
    is(e, t=!1) {
        return this.isBrowser(e, t) || this.isOS(e) || this.isPlatform(e)
    }
    some(e=[]) {
        return e.some(t => this.is(t))
    }
}
/*!
 * Bowser - a browser detector
 * https://github.com/lancedikson/bowser
 * MIT License | (c) Dustin Diaz 2012-2015
 * MIT License | (c) Denis Demchenko 2015-2019
 */
class cl {
    static getParser(e, t=!1) {
        if (typeof e != "string")
            throw new Error("UserAgent should be a string");
        return new as(e,t)
    }
    static parse(e) {
        return new as(e).getResult()
    }
    static get BROWSER_MAP() {
        return yo
    }
    static get ENGINE_MAP() {
        return lt
    }
    static get OS_MAP() {
        return he
    }
    static get PLATFORMS_MAP() {
        return V
    }
}
function He(r, e) {
    return Object.keys(e).forEach(function(t) {
        t === "default" || t === "__esModule" || Object.prototype.hasOwnProperty.call(r, t) || Object.defineProperty(r, t, {
            enumerable: !0,
            get: function() {
                return e[t]
            }
        })
    }),
    r
}
function ll(r) {
    return r && r.__esModule ? r.default : r
}
function se(r, e, t, n) {
    Object.defineProperty(r, e, {
        get: t,
        set: n,
        enumerable: !0,
        configurable: !0
    })
}
var tr = {}
  , _o = {};
se(_o, "PipecatClient", () => Ye);
var Kt = {};
Kt = JSON.parse('{"name":"@pipecat-ai/client-js","version":"1.4.0","license":"BSD-2-Clause","main":"dist/index.js","module":"dist/index.module.js","types":"dist/index.d.ts","source":"index.ts","repository":{"type":"git","url":"git+https://github.com/pipecat-ai/pipecat-client-web.git"},"files":["dist","package.json","README.md"],"scripts":{"build":"jest --silent --passWithNoTests && parcel build --no-cache","dev":"parcel watch","lint":"eslint . --report-unused-disable-directives --max-warnings 0","test":"jest"},"jest":{"preset":"ts-jest","testEnvironment":"jsdom"},"devDependencies":{"@jest/globals":"^29.7.0","@types/clone-deep":"^4.0.4","@types/jest":"^29.5.12","@types/uuid":"^10.0.0","eslint":"^9.11.1","eslint-config-prettier":"^9.1.0","eslint-plugin-simple-import-sort":"^12.1.1","jest":"^29.7.0","jest-environment-jsdom":"^30.0.2","ts-jest":"^29.2.5"},"dependencies":{"@types/events":"^3.0.3","bowser":"^2.11.0","clone-deep":"^4.0.1","events":"^3.3.0","typed-emitter":"^2.1.0","uuid":"^10.0.0"}}');
var gn = {}
  , wo = {};
se(wo, "TransportStateEnum", () => Xn);
var Xn;
(function(r) {
    r.DISCONNECTED = "disconnected",
    r.INITIALIZING = "initializing",
    r.INITIALIZED = "initialized",
    r.AUTHENTICATING = "authenticating",
    r.AUTHENTICATED = "authenticated",
    r.CONNECTING = "connecting",
    r.CONNECTED = "connected",
    r.READY = "ready",
    r.DISCONNECTING = "disconnecting",
    r.ERROR = "error"
}
)(Xn || (Xn = {}));
var Qe = {};
se(Qe, "RTVIError", () => Ce);
se(Qe, "ConnectionTimeoutError", () => ul);
se(Qe, "StartBotError", () => ko);
se(Qe, "TransportStartError", () => Zn);
se(Qe, "InvalidTransportParamsError", () => dl);
se(Qe, "BotNotReadyError", () => So);
se(Qe, "BotAlreadyStartedError", () => Eo);
se(Qe, "UnsupportedFeatureError", () => Qr);
se(Qe, "DeviceError", () => Xe);
class Ce extends Error {
    constructor(e, t) {
        super(e),
        this.status = t
    }
}
class ul extends Ce {
    constructor(e) {
        super(e ?? "Bot did not enter ready state within the specified timeout period.")
    }
}
class ko extends Ce {
    constructor(e, t) {
        super(e ?? "Failed to connect / invalid auth bundle from base url", t ?? 500),
        this.error = "invalid-request-error"
    }
}
class Zn extends Ce {
    constructor(e) {
        super(e ?? "Unable to connect to transport")
    }
}
class dl extends Ce {
    constructor(e) {
        super(e ?? "Invalid transport connection parameters")
    }
}
class So extends Ce {
    constructor(e) {
        super(e ?? "Attempt to call action on transport when not in 'ready' state.")
    }
}
class Eo extends Ce {
    constructor(e) {
        super(e ?? "Pipecat client has already been started. Please call disconnect() before starting again.")
    }
}
class Qr extends Ce {
    constructor(e, t, n) {
        let i = `${e} not supported${n ? `: ${n}` : ""}`;
        t && (i = `${t} does not support ${e}${n ? `: ${n}` : ""}`),
        super(i),
        this.feature = e
    }
}
class Xe extends Ce {
    constructor(e, t, n, i) {
        super(n ?? `Device error for ${e.join(", ")}: ${t}`),
        this.devices = e,
        this.type = t,
        this.details = i
    }
}
var Mo = {};
se(Mo, "RTVIEvent", () => $);
var $;
(function(r) {
    r.Connected = "connected",
    r.Disconnected = "disconnected",
    r.TransportStateChanged = "transportStateChanged",
    r.BotStarted = "botStarted",
    r.BotConnected = "botConnected",
    r.BotReady = "botReady",
    r.BotDisconnected = "botDisconnected",
    r.Error = "error",
    r.ServerMessage = "serverMessage",
    r.ServerResponse = "serverResponse",
    r.MessageError = "messageError",
    r.Metrics = "metrics",
    r.BotStartedSpeaking = "botStartedSpeaking",
    r.BotStoppedSpeaking = "botStoppedSpeaking",
    r.UserStartedSpeaking = "userStartedSpeaking",
    r.UserStoppedSpeaking = "userStoppedSpeaking",
    r.UserTranscript = "userTranscript",
    r.BotTranscript = "botTranscript",
    r.BotLlmText = "botLlmText",
    r.BotLlmStarted = "botLlmStarted",
    r.BotLlmStopped = "botLlmStopped",
    r.LLMFunctionCall = "llmFunctionCall",
    r.BotLlmSearchResponse = "botLlmSearchResponse",
    r.BotTtsText = "botTtsText",
    r.BotTtsStarted = "botTtsStarted",
    r.BotTtsStopped = "botTtsStopped",
    r.ParticipantConnected = "participantConnected",
    r.ParticipantLeft = "participantLeft",
    r.TrackStarted = "trackStarted",
    r.TrackStopped = "trackStopped",
    r.ScreenTrackStarted = "screenTrackStarted",
    r.ScreenTrackStopped = "screenTrackStopped",
    r.ScreenShareError = "screenShareError",
    r.LocalAudioLevel = "localAudioLevel",
    r.RemoteAudioLevel = "remoteAudioLevel",
    r.AvailableCamsUpdated = "availableCamsUpdated",
    r.AvailableMicsUpdated = "availableMicsUpdated",
    r.AvailableSpeakersUpdated = "availableSpeakersUpdated",
    r.CamUpdated = "camUpdated",
    r.MicUpdated = "micUpdated",
    r.SpeakerUpdated = "speakerUpdated",
    r.DeviceError = "deviceError"
}
)($ || ($ = {}));
var rr = {};
se(rr, "RTVI_PROTOCOL_VERSION", () => Co);
se(rr, "RTVI_MESSAGE_LABEL", () => To);
se(rr, "RTVIMessageType", () => G);
se(rr, "setAboutClient", () => Oo);
se(rr, "RTVIMessage", () => ke);
const Co = "1.0.0"
  , To = "rtvi-ai";
var G;
(function(r) {
    r.CLIENT_READY = "client-ready",
    r.DISCONNECT_BOT = "disconnect-bot",
    r.CLIENT_MESSAGE = "client-message",
    r.SEND_TEXT = "send-text",
    r.APPEND_TO_CONTEXT = "append-to-context",
    r.BOT_READY = "bot-ready",
    r.ERROR = "error",
    r.METRICS = "metrics",
    r.SERVER_MESSAGE = "server-message",
    r.SERVER_RESPONSE = "server-response",
    r.ERROR_RESPONSE = "error-response",
    r.APPEND_TO_CONTEXT_RESULT = "append-to-context-result",
    r.USER_TRANSCRIPTION = "user-transcription",
    r.BOT_TRANSCRIPTION = "bot-transcription",
    r.USER_STARTED_SPEAKING = "user-started-speaking",
    r.USER_STOPPED_SPEAKING = "user-stopped-speaking",
    r.BOT_STARTED_SPEAKING = "bot-started-speaking",
    r.BOT_STOPPED_SPEAKING = "bot-stopped-speaking",
    r.USER_LLM_TEXT = "user-llm-text",
    r.BOT_LLM_TEXT = "bot-llm-text",
    r.BOT_LLM_STARTED = "bot-llm-started",
    r.BOT_LLM_STOPPED = "bot-llm-stopped",
    r.LLM_FUNCTION_CALL = "llm-function-call",
    r.LLM_FUNCTION_CALL_RESULT = "llm-function-call-result",
    r.BOT_LLM_SEARCH_RESPONSE = "bot-llm-search-response",
    r.BOT_TTS_TEXT = "bot-tts-text",
    r.BOT_TTS_STARTED = "bot-tts-started",
    r.BOT_TTS_STOPPED = "bot-tts-stopped"
}
)(G || (G = {}));
let gr;
function Oo(r) {
    gr ? gr = {
        ...gr,
        ...r
    } : gr = r
}
class ke {
    constructor(e, t, n) {
        this.label = To,
        this.type = e,
        this.data = t,
        this.id = n || rl().slice(0, 8)
    }
    static clientReady() {
        return new ke(G.CLIENT_READY,{
            version: Co,
            about: gr || {
                library: Kt.name,
                library_version: Kt.version
            }
        })
    }
    static disconnectBot() {
        return new ke(G.DISCONNECT_BOT,{})
    }
    static error(e, t=!1) {
        return new ke(G.ERROR,{
            message: e,
            fatal: t
        })
    }
}
He(gn, wo);
He(gn, Qe);
He(gn, Mo);
He(gn, rr);
function Er(r, e, t) {
    const n = t.value;
    return t.value = function(...i) {
        if (this.state === "ready")
            return n.apply(this, i);
        throw new So(`Attempt to call ${e.toString()} when transport not in ready state. Await connect() first.`)
    }
    ,
    t
}
function Ti(r, e, t) {
    const n = t.value
      , i = ["authenticating", "connecting", "connected", "ready"];
    return t.value = function(...s) {
        if (i.includes(this.state))
            throw new Eo(`Attempt to call ${e.toString()} when client already started. Please call disconnect() before starting again.`);
        return n.apply(this, s)
    }
    ,
    t
}
var Ao = {};
se(Ao, "MessageDispatcher", () => Po);
var Oi = {};
se(Oi, "LogLevel", () => ft);
se(Oi, "logger", () => K);
var ft;
(function(r) {
    r[r.NONE = 0] = "NONE",
    r[r.ERROR = 1] = "ERROR",
    r[r.WARN = 2] = "WARN",
    r[r.INFO = 3] = "INFO",
    r[r.DEBUG = 4] = "DEBUG"
}
)(ft || (ft = {}));
class qt {
    constructor() {
        this.level = ft.DEBUG
    }
    static getInstance() {
        return qt.instance || (qt.instance = new qt),
        qt.instance
    }
    setLevel(e) {
        this.level = e
    }
    debug(...e) {
        this.level >= ft.DEBUG && console.debug(...e)
    }
    info(...e) {
        this.level >= ft.INFO && console.info(...e)
    }
    warn(...e) {
        this.level >= ft.WARN && console.warn(...e)
    }
    error(...e) {
        this.level >= ft.ERROR && console.error(...e)
    }
}
const K = qt.getInstance();
class Po {
    constructor(e) {
        this._queue = new Array,
        this._gcInterval = void 0,
        this._queue = [],
        this._sendMethod = e
    }
    disconnect() {
        this.clearQueue(),
        clearInterval(this._gcInterval),
        this._gcInterval = void 0
    }
    dispatch(e, t=G.CLIENT_MESSAGE, n=1e4) {
        this._gcInterval || (this._gcInterval = setInterval( () => {
            this._gc()
        }
        , 2e3));
        const i = new ke(t,e)
          , s = new Promise( (a, c) => {
            this._queue.push({
                message: i,
                timestamp: Date.now(),
                timeout: n,
                resolve: a,
                reject: c
            })
        }
        );
        K.debug("[MessageDispatcher] dispatch", i);
        try {
            this._sendMethod(i)
        } catch (a) {
            return K.error("[MessageDispatcher] Error sending message", a),
            Promise.reject(a)
        }
        return this._gc(),
        s
    }
    clearQueue() {
        this._queue = []
    }
    _resolveReject(e, t=!0) {
        const n = this._queue.find(i => i.message.id === e.id);
        return n && (t ? (K.debug("[MessageDispatcher] Resolve", e),
        n.resolve(e)) : (K.debug("[MessageDispatcher] Reject", e),
        n.reject(e)),
        this._queue = this._queue.filter(i => i.message.id !== e.id),
        K.debug("[MessageDispatcher] Queue", this._queue)),
        e
    }
    resolve(e) {
        return this._resolveReject(e, !0)
    }
    reject(e) {
        return this._resolveReject(e, !1)
    }
    _gc() {
        const e = [];
        this._queue = this._queue.filter(t => {
            const n = Date.now() - t.timestamp < t.timeout;
            return n || e.push(t),
            n
        }
        ),
        e.forEach(t => {
            t.message.type === G.CLIENT_MESSAGE && t.reject(new ke(G.ERROR_RESPONSE,{
                error: "Timed out waiting for response",
                msgType: t.message.data.t,
                data: t.message.data.d,
                fatal: !1
            }))
        }
        ),
        K.debug("[MessageDispatcher] GC", this._queue)
    }
}
var Ai = {};
se(Ai, "isAPIRequest", () => Io);
se(Ai, "makeRequest", () => xo);
function Io(r) {
    if (typeof r == "object" && r !== null && Object.keys(r).includes("endpoint")) {
        const e = r.endpoint;
        return typeof e == "string" || e instanceof URL || typeof Request < "u" && e instanceof Request
    }
    return !1
}
async function xo(r, e) {
    e || (e = new AbortController);
    let t;
    return new Promise( (n, i) => {
        (async () => (r.timeout && (t = setTimeout(async () => {
            e.abort(),
            i(new Error("Timed out"))
        }
        , r.timeout)),
        K.debug(`[Pipecat Client] Fetching from ${r.endpoint}`),
        fetch(r.endpoint, {
            method: "POST",
            mode: "cors",
            headers: new Headers({
                "Content-Type": "application/json",
                ...Object.fromEntries((r.headers ?? new Headers).entries())
            }),
            body: JSON.stringify(r.requestData),
            signal: e == null ? void 0 : e.signal
        }).then(s => {
            K.debug(`[Pipecat Client] Received response from ${r.endpoint}`, s),
            s.ok || i(s),
            s.json().then(a => n(a))
        }
        ).catch(s => {
            K.error(`[Pipecat Client] Error fetching: ${s}`),
            i(s)
        }
        ).finally( () => {
            t && clearTimeout(t)
        }
        )))()
    }
    )
}
var Pi = {};
se(Pi, "Transport", () => No);
se(Pi, "TransportWrapper", () => Lo);
class No {
    constructor() {
        this._state = "disconnected"
    }
    connect(e) {
        this._abortController = new AbortController;
        let t = e;
        try {
            t = this._validateConnectionParams(e)
        } catch (n) {
            throw new Ce(`Invalid connection params: ${n.message}. Please check your connection params and try again.`)
        }
        return this._connect(t)
    }
    get startBotParams() {
        return this._startBotParams
    }
    set startBotParams(e) {
        this._startBotParams = e
    }
    disconnect() {
        return this._abortController && this._abortController.abort(),
        this._disconnect()
    }
}
class Lo {
    constructor(e) {
        this._transport = e,
        this._proxy = new Proxy(this._transport,{
            get: (t, n, i) => {
                if (typeof t[n] == "function") {
                    let s;
                    switch (String(n)) {
                    case "initialize":
                        s = "Direct calls to initialize() are disabled and used internally by the PipecatClient.";
                        break;
                    case "initDevices":
                        s = "Direct calls to initDevices() are disabled. Please use the PipecatClient.initDevices() wrapper or let PipecatClient.connect() call it for you.";
                        break;
                    case "sendReadyMessage":
                        s = "Direct calls to sendReadyMessage() are disabled and used internally by the PipecatClient.";
                        break;
                    case "connect":
                        s = "Direct calls to connect() are disabled. Please use the PipecatClient.connect() wrapper.";
                        break;
                    case "disconnect":
                        s = "Direct calls to disconnect() are disabled. Please use the PipecatClient.disconnect() wrapper.";
                        break
                    }
                    return s ? () => {
                        throw new Error(s)
                    }
                    : (...a) => t[n](...a)
                }
                return Reflect.get(t, n, i)
            }
        })
    }
    get proxy() {
        return this._proxy
    }
}
var Bo = {};
se(Bo, "learnAboutClient", () => Do);
function Do() {
    var t, n, i, s, a, c;
    let r = {
        library: Kt.name,
        library_version: Kt.version,
        platform_details: {}
    }
      , e = null;
    if ((t = window == null ? void 0 : window.navigator) != null && t.userAgent)
        try {
            e = cl.parse(window.navigator.userAgent)
        } catch {}
    return (n = e == null ? void 0 : e.browser) != null && n.name && (r.platform_details.browser = e.browser.name),
    ((i = e == null ? void 0 : e.browser) == null ? void 0 : i.name) === "Safari" && !e.browser.version ? r.platform_details.browser_version = "Web View" : (s = e == null ? void 0 : e.browser) != null && s.version && (r.platform_details.browser_version = e.browser.version),
    (a = e == null ? void 0 : e.platform) != null && a.type && (r.platform_details.platform_type = e.platform.type),
    (c = e == null ? void 0 : e.engine) != null && c.name && (r.platform_details.engine = e.engine.name),
    e != null && e.os && (r.platform = e.os.name,
    r.platform_version = e.os.version),
    r
}
var vt = function(r, e, t, n) {
    var i = arguments.length, s = i < 3 ? e : n === null ? n = Object.getOwnPropertyDescriptor(e, t) : n, a;
    if (typeof Reflect == "object" && typeof Reflect.decorate == "function")
        s = Reflect.decorate(r, e, t, n);
    else
        for (var c = r.length - 1; c >= 0; c--)
            (a = r[c]) && (s = (i < 3 ? a(s) : i > 3 ? a(e, t, s) : a(e, t)) || s);
    return i > 3 && s && Object.defineProperty(e, t, s),
    s
};
class fl extends Yc {
}
class Ye extends fl {
    constructor(e) {
        super(),
        this._functionCallCallbacks = {},
        Oo(Do()),
        this._transport = e.transport,
        this._transportWrapper = new Lo(this._transport);
        const t = {
            ...e.callbacks,
            onMessageError: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onMessageError) == null || s.call(i, n),
                this.emit($.MessageError, n)
            }
            ,
            onError: n => {
                var s, a;
                (a = (s = e == null ? void 0 : e.callbacks) == null ? void 0 : s.onError) == null || a.call(s, n);
                try {
                    this.emit($.Error, n)
                } catch {
                    K.debug("Could not emit error", n)
                }
                const i = n.data;
                i != null && i.fatal && (K.error("Fatal error reported. Disconnecting..."),
                this.disconnect())
            }
            ,
            onConnected: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onConnected) == null || i.call(n),
                this.emit($.Connected)
            }
            ,
            onDisconnected: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onDisconnected) == null || i.call(n),
                this.emit($.Disconnected)
            }
            ,
            onTransportStateChanged: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onTransportStateChanged) == null || s.call(i, n),
                this.emit($.TransportStateChanged, n)
            }
            ,
            onParticipantJoined: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onParticipantJoined) == null || s.call(i, n),
                this.emit($.ParticipantConnected, n)
            }
            ,
            onParticipantLeft: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onParticipantLeft) == null || s.call(i, n),
                this.emit($.ParticipantLeft, n)
            }
            ,
            onTrackStarted: (n, i) => {
                var s, a;
                (a = (s = e == null ? void 0 : e.callbacks) == null ? void 0 : s.onTrackStarted) == null || a.call(s, n, i),
                this.emit($.TrackStarted, n, i)
            }
            ,
            onTrackStopped: (n, i) => {
                var s, a;
                (a = (s = e == null ? void 0 : e.callbacks) == null ? void 0 : s.onTrackStopped) == null || a.call(s, n, i),
                this.emit($.TrackStopped, n, i)
            }
            ,
            onScreenTrackStarted: (n, i) => {
                var s, a;
                (a = (s = e == null ? void 0 : e.callbacks) == null ? void 0 : s.onScreenTrackStarted) == null || a.call(s, n, i),
                this.emit($.ScreenTrackStarted, n, i)
            }
            ,
            onScreenTrackStopped: (n, i) => {
                var s, a;
                (a = (s = e == null ? void 0 : e.callbacks) == null ? void 0 : s.onScreenTrackStopped) == null || a.call(s, n, i),
                this.emit($.ScreenTrackStopped, n, i)
            }
            ,
            onScreenShareError: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onScreenShareError) == null || s.call(i, n),
                this.emit($.ScreenShareError, n)
            }
            ,
            onAvailableCamsUpdated: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onAvailableCamsUpdated) == null || s.call(i, n),
                this.emit($.AvailableCamsUpdated, n)
            }
            ,
            onAvailableMicsUpdated: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onAvailableMicsUpdated) == null || s.call(i, n),
                this.emit($.AvailableMicsUpdated, n)
            }
            ,
            onAvailableSpeakersUpdated: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onAvailableSpeakersUpdated) == null || s.call(i, n),
                this.emit($.AvailableSpeakersUpdated, n)
            }
            ,
            onCamUpdated: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onCamUpdated) == null || s.call(i, n),
                this.emit($.CamUpdated, n)
            }
            ,
            onMicUpdated: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onMicUpdated) == null || s.call(i, n),
                this.emit($.MicUpdated, n)
            }
            ,
            onSpeakerUpdated: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onSpeakerUpdated) == null || s.call(i, n),
                this.emit($.SpeakerUpdated, n)
            }
            ,
            onDeviceError: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onDeviceError) == null || s.call(i, n),
                this.emit($.DeviceError, n)
            }
            ,
            onBotStarted: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onBotStarted) == null || s.call(i, n),
                this.emit($.BotStarted, n)
            }
            ,
            onBotConnected: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onBotConnected) == null || s.call(i, n),
                this.emit($.BotConnected, n)
            }
            ,
            onBotReady: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onBotReady) == null || s.call(i, n),
                this.emit($.BotReady, n)
            }
            ,
            onBotDisconnected: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onBotDisconnected) == null || s.call(i, n),
                this.emit($.BotDisconnected, n)
            }
            ,
            onBotStartedSpeaking: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onBotStartedSpeaking) == null || i.call(n),
                this.emit($.BotStartedSpeaking)
            }
            ,
            onBotStoppedSpeaking: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onBotStoppedSpeaking) == null || i.call(n),
                this.emit($.BotStoppedSpeaking)
            }
            ,
            onRemoteAudioLevel: (n, i) => {
                var s, a;
                (a = (s = e == null ? void 0 : e.callbacks) == null ? void 0 : s.onRemoteAudioLevel) == null || a.call(s, n, i),
                this.emit($.RemoteAudioLevel, n, i)
            }
            ,
            onUserStartedSpeaking: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onUserStartedSpeaking) == null || i.call(n),
                this.emit($.UserStartedSpeaking)
            }
            ,
            onUserStoppedSpeaking: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onUserStoppedSpeaking) == null || i.call(n),
                this.emit($.UserStoppedSpeaking)
            }
            ,
            onLocalAudioLevel: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onLocalAudioLevel) == null || s.call(i, n),
                this.emit($.LocalAudioLevel, n)
            }
            ,
            onUserTranscript: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onUserTranscript) == null || s.call(i, n),
                this.emit($.UserTranscript, n)
            }
            ,
            onBotTranscript: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onBotTranscript) == null || s.call(i, n),
                this.emit($.BotTranscript, n)
            }
            ,
            onBotLlmText: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onBotLlmText) == null || s.call(i, n),
                this.emit($.BotLlmText, n)
            }
            ,
            onBotLlmStarted: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onBotLlmStarted) == null || i.call(n),
                this.emit($.BotLlmStarted)
            }
            ,
            onBotLlmStopped: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onBotLlmStopped) == null || i.call(n),
                this.emit($.BotLlmStopped)
            }
            ,
            onBotTtsText: n => {
                var i, s;
                (s = (i = e == null ? void 0 : e.callbacks) == null ? void 0 : i.onBotTtsText) == null || s.call(i, n),
                this.emit($.BotTtsText, n)
            }
            ,
            onBotTtsStarted: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onBotTtsStarted) == null || i.call(n),
                this.emit($.BotTtsStarted)
            }
            ,
            onBotTtsStopped: () => {
                var n, i;
                (i = (n = e == null ? void 0 : e.callbacks) == null ? void 0 : n.onBotTtsStopped) == null || i.call(n),
                this.emit($.BotTtsStopped)
            }
        };
        this._options = {
            ...e,
            callbacks: t,
            enableMic: e.enableMic ?? !0,
            enableCam: e.enableCam ?? !1,
            enableScreenShare: e.enableScreenShare ?? !1
        },
        this._initialize(),
        K.debug("[Pipecat Client] Initialized", this.version)
    }
    setLogLevel(e) {
        K.setLevel(e)
    }
    async initDevices() {
        K.debug("[Pipecat Client] Initializing devices..."),
        await this._transport.initDevices()
    }
    async startBot(e) {
        var n, i, s, a;
        this._transport.state = "authenticating",
        this._transport.startBotParams = e,
        this._abortController = new AbortController;
        let t;
        try {
            t = await xo(e, this._abortController)
        } catch (c) {
            let l = "An unknown error occurred while starting the bot.", u;
            if (c instanceof Response) {
                const h = await c.json();
                l = h.info ?? h.detail ?? c.statusText,
                u = c.status
            } else
                c instanceof Error && (l = c.message);
            throw (i = (n = this._options.callbacks) == null ? void 0 : n.onError) == null || i.call(n, new ke(G.ERROR_RESPONSE,{
                message: l,
                fatal: !0
            })),
            new ko(l,u)
        }
        return this._transport.state = "authenticated",
        (a = (s = this._options.callbacks) == null ? void 0 : s.onBotStarted) == null || a.call(s, t),
        t
    }
    async connect(e) {
        return e && Io(e) ? (K.warn("Calling connect with an API endpoint is deprecated. Use startBotAndConnect() instead."),
        this.startBotAndConnect(e)) : new Promise( (t, n) => {
            (async () => {
                this._connectResolve = t,
                this._transport.state === "disconnected" && await this._transport.initDevices();
                try {
                    await this._transport.connect(e),
                    await this._transport.sendReadyMessage()
                } catch (i) {
                    this.disconnect(),
                    n(i);
                    return
                }
            }
            )()
        }
        )
    }
    async startBotAndConnect(e) {
        this._transport.state === "disconnected" && await this._transport.initDevices();
        const t = await this.startBot(e);
        return this.connect(t)
    }
    async disconnect() {
        await this._transport.disconnect(),
        this._messageDispatcher.disconnect()
    }
    _initialize() {
        this._transport.initialize(this._options, this.handleMessage.bind(this)),
        this._messageDispatcher = new Po(this._transport.sendMessage.bind(this._transport))
    }
    get connected() {
        return ["connected", "ready"].includes(this._transport.state)
    }
    get transport() {
        return this._transportWrapper.proxy
    }
    get state() {
        return this._transport.state
    }
    get version() {
        return ll(Kt).version
    }
    async getAllMics() {
        return await this._transport.getAllMics()
    }
    async getAllCams() {
        return await this._transport.getAllCams()
    }
    async getAllSpeakers() {
        return await this._transport.getAllSpeakers()
    }
    get selectedMic() {
        return this._transport.selectedMic
    }
    get selectedCam() {
        return this._transport.selectedCam
    }
    get selectedSpeaker() {
        return this._transport.selectedSpeaker
    }
    updateMic(e) {
        this._transport.updateMic(e)
    }
    updateCam(e) {
        this._transport.updateCam(e)
    }
    updateSpeaker(e) {
        this._transport.updateSpeaker(e)
    }
    enableMic(e) {
        this._transport.enableMic(e)
    }
    get isMicEnabled() {
        return this._transport.isMicEnabled
    }
    enableCam(e) {
        this._transport.enableCam(e)
    }
    get isCamEnabled() {
        return this._transport.isCamEnabled
    }
    tracks() {
        return this._transport.tracks()
    }
    enableScreenShare(e) {
        return this._transport.enableScreenShare(e)
    }
    get isSharingScreen() {
        return this._transport.isSharingScreen
    }
    sendClientMessage(e, t) {
        this._transport.sendMessage(new ke(G.CLIENT_MESSAGE,{
            t: e,
            d: t
        }))
    }
    async sendClientRequest(e, t, n) {
        const i = {
            t: e,
            d: t
        };
        return (await this._messageDispatcher.dispatch(i, G.CLIENT_MESSAGE, n)).data.d
    }
    registerFunctionCallHandler(e, t) {
        this._functionCallCallbacks[e] = t
    }
    unregisterFunctionCallHandler(e) {
        delete this._functionCallCallbacks[e]
    }
    unregisterAllFunctionCallHandlers() {
        this._functionCallCallbacks = {}
    }
    async appendToContext(e) {
        return K.warn("appendToContext() is deprecated. Use sendText() instead."),
        await this._transport.sendMessage(new ke(G.APPEND_TO_CONTEXT,{
            role: e.role,
            content: e.content,
            run_immediately: e.run_immediately
        })),
        !0
    }
    async sendText(e, t={}) {
        await this._transport.sendMessage(new ke(G.SEND_TEXT,{
            content: e,
            options: t
        }))
    }
    disconnectBot() {
        this._transport.sendMessage(new ke(G.DISCONNECT_BOT,{}))
    }
    handleMessage(e) {
        var t, n, i, s, a, c, l, u, h, m, _, M, b, v, E, C, x, N, k, w, T, L, D, q, U, ae, Le, We, bt, yt, sr, _t, ar, wt, or, kt, cr, o, f;
        switch (K.debug("[RTVI Message]", e),
        e.type) {
        case G.BOT_READY:
            {
                const d = e.data
                  , p = d.version ? d.version.split(".").map(Number) : [0, 0, 0];
                K.debug(`[Pipecat Client] Bot is ready. Version: ${d.version}`),
                p[0] < 1 && K.warn("[Pipecat Client] Bot version is less than 1.0.0, which may not be compatible with this client."),
                (t = this._connectResolve) == null || t.call(this, e.data),
                (i = (n = this._options.callbacks) == null ? void 0 : n.onBotReady) == null || i.call(n, e.data);
                break
            }
        case G.ERROR:
            (a = (s = this._options.callbacks) == null ? void 0 : s.onError) == null || a.call(s, e);
            break;
        case G.SERVER_RESPONSE:
            this._messageDispatcher.resolve(e);
            break;
        case G.ERROR_RESPONSE:
            {
                const d = this._messageDispatcher.reject(e);
                (l = (c = this._options.callbacks) == null ? void 0 : c.onMessageError) == null || l.call(c, d);
                break
            }
        case G.USER_STARTED_SPEAKING:
            (h = (u = this._options.callbacks) == null ? void 0 : u.onUserStartedSpeaking) == null || h.call(u);
            break;
        case G.USER_STOPPED_SPEAKING:
            (_ = (m = this._options.callbacks) == null ? void 0 : m.onUserStoppedSpeaking) == null || _.call(m);
            break;
        case G.BOT_STARTED_SPEAKING:
            (b = (M = this._options.callbacks) == null ? void 0 : M.onBotStartedSpeaking) == null || b.call(M);
            break;
        case G.BOT_STOPPED_SPEAKING:
            (E = (v = this._options.callbacks) == null ? void 0 : v.onBotStoppedSpeaking) == null || E.call(v);
            break;
        case G.USER_TRANSCRIPTION:
            {
                const d = e.data;
                (x = (C = this._options.callbacks) == null ? void 0 : C.onUserTranscript) == null || x.call(C, d);
                break
            }
        case G.BOT_TRANSCRIPTION:
            (k = (N = this._options.callbacks) == null ? void 0 : N.onBotTranscript) == null || k.call(N, e.data);
            break;
        case G.BOT_LLM_TEXT:
            (T = (w = this._options.callbacks) == null ? void 0 : w.onBotLlmText) == null || T.call(w, e.data);
            break;
        case G.BOT_LLM_STARTED:
            (D = (L = this._options.callbacks) == null ? void 0 : L.onBotLlmStarted) == null || D.call(L);
            break;
        case G.BOT_LLM_STOPPED:
            (U = (q = this._options.callbacks) == null ? void 0 : q.onBotLlmStopped) == null || U.call(q);
            break;
        case G.BOT_TTS_TEXT:
            (Le = (ae = this._options.callbacks) == null ? void 0 : ae.onBotTtsText) == null || Le.call(ae, e.data);
            break;
        case G.BOT_TTS_STARTED:
            (bt = (We = this._options.callbacks) == null ? void 0 : We.onBotTtsStarted) == null || bt.call(We);
            break;
        case G.BOT_TTS_STOPPED:
            (sr = (yt = this._options.callbacks) == null ? void 0 : yt.onBotTtsStopped) == null || sr.call(yt);
            break;
        case G.METRICS:
            (ar = (_t = this._options.callbacks) == null ? void 0 : _t.onMetrics) == null || ar.call(_t, e.data),
            this.emit($.Metrics, e.data);
            break;
        case G.SERVER_MESSAGE:
            (or = (wt = this._options.callbacks) == null ? void 0 : wt.onServerMessage) == null || or.call(wt, e.data),
            this.emit($.ServerMessage, e.data);
            break;
        case G.LLM_FUNCTION_CALL:
            {
                const d = e.data
                  , p = this._functionCallCallbacks[d.function_name];
                if (p) {
                    const g = {
                        functionName: d.function_name,
                        arguments: d.args
                    };
                    p(g).then(S => {
                        S != null && this._transport.sendMessage(new ke(G.LLM_FUNCTION_CALL_RESULT,{
                            function_name: d.function_name,
                            tool_call_id: d.tool_call_id,
                            arguments: d.args,
                            result: S
                        }))
                    }
                    )
                }
                (cr = (kt = this._options.callbacks) == null ? void 0 : kt.onLLMFunctionCall) == null || cr.call(kt, d),
                this.emit($.LLMFunctionCall, d);
                break
            }
        case G.BOT_LLM_SEARCH_RESPONSE:
            {
                const d = e.data;
                (f = (o = this._options.callbacks) == null ? void 0 : o.onBotLlmSearchResponse) == null || f.call(o, d),
                this.emit($.BotLlmSearchResponse, d);
                break
            }
        default:
            K.debug("[Pipecat Client] Unrecognized message type", e.type);
            break
        }
    }
}
vt([Ti], Ye.prototype, "startBot", null);
vt([Ti], Ye.prototype, "connect", null);
vt([Ti], Ye.prototype, "startBotAndConnect", null);
vt([Er], Ye.prototype, "sendClientMessage", null);
vt([Er], Ye.prototype, "sendClientRequest", null);
vt([Er], Ye.prototype, "appendToContext", null);
vt([Er], Ye.prototype, "sendText", null);
vt([Er], Ye.prototype, "disconnectBot", null);
He(tr, _o);
He(tr, Ao);
He(tr, Oi);
He(tr, Ai);
He(tr, Pi);
He(tr, Bo);
function os(r, e) {
    if (r == null)
        return {};
    var t, n, i = (function(a, c) {
        if (a == null)
            return {};
        var l = {};
        for (var u in a)
            if ({}.hasOwnProperty.call(a, u)) {
                if (c.indexOf(u) !== -1)
                    continue;
                l[u] = a[u]
            }
        return l
    }
    )(r, e);
    if (Object.getOwnPropertySymbols) {
        var s = Object.getOwnPropertySymbols(r);
        for (n = 0; n < s.length; n++)
            t = s[n],
            e.indexOf(t) === -1 && {}.propertyIsEnumerable.call(r, t) && (i[t] = r[t])
    }
    return i
}
function Te(r, e) {
    if (!(r instanceof e))
        throw new TypeError("Cannot call a class as a function")
}
function X(r) {
    return X = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
        return typeof e
    }
    : function(e) {
        return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e
    }
    ,
    X(r)
}
function Ro(r) {
    var e = (function(t, n) {
        if (X(t) != "object" || !t)
            return t;
        var i = t[Symbol.toPrimitive];
        if (i !== void 0) {
            var s = i.call(t, n);
            if (X(s) != "object")
                return s;
            throw new TypeError("@@toPrimitive must return a primitive value.")
        }
        return String(t)
    }
    )(r, "string");
    return X(e) == "symbol" ? e : e + ""
}
function cs(r, e) {
    for (var t = 0; t < e.length; t++) {
        var n = e[t];
        n.enumerable = n.enumerable || !1,
        n.configurable = !0,
        "value"in n && (n.writable = !0),
        Object.defineProperty(r, Ro(n.key), n)
    }
}
function Oe(r, e, t) {
    return e && cs(r.prototype, e),
    t && cs(r, t),
    Object.defineProperty(r, "prototype", {
        writable: !1
    }),
    r
}
function vn(r, e) {
    if (e && (X(e) == "object" || typeof e == "function"))
        return e;
    if (e !== void 0)
        throw new TypeError("Derived constructors may only return object or undefined");
    return (function(t) {
        if (t === void 0)
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        return t
    }
    )(r)
}
function Ve(r) {
    return Ve = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(e) {
        return e.__proto__ || Object.getPrototypeOf(e)
    }
    ,
    Ve(r)
}
function kr(r, e) {
    return kr = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, n) {
        return t.__proto__ = n,
        t
    }
    ,
    kr(r, e)
}
function bn(r, e) {
    if (typeof e != "function" && e !== null)
        throw new TypeError("Super expression must either be null or a function");
    r.prototype = Object.create(e && e.prototype, {
        constructor: {
            value: r,
            writable: !0,
            configurable: !0
        }
    }),
    Object.defineProperty(r, "prototype", {
        writable: !1
    }),
    e && kr(r, e)
}
function Ge(r, e, t) {
    return (e = Ro(e))in r ? Object.defineProperty(r, e, {
        value: t,
        enumerable: !0,
        configurable: !0,
        writable: !0
    }) : r[e] = t,
    r
}
function ls(r, e, t, n, i, s, a) {
    try {
        var c = r[s](a)
          , l = c.value
    } catch (u) {
        return void t(u)
    }
    c.done ? e(l) : Promise.resolve(l).then(n, i)
}
function F(r) {
    return function() {
        var e = this
          , t = arguments;
        return new Promise((function(n, i) {
            var s = r.apply(e, t);
            function a(l) {
                ls(s, n, i, a, c, "next", l)
            }
            function c(l) {
                ls(s, n, i, a, c, "throw", l)
            }
            a(void 0)
        }
        ))
    }
}
function us(r, e) {
    (e == null || e > r.length) && (e = r.length);
    for (var t = 0, n = Array(e); t < e; t++)
        n[t] = r[t];
    return n
}
function me(r, e) {
    return (function(t) {
        if (Array.isArray(t))
            return t
    }
    )(r) || (function(t, n) {
        var i = t == null ? null : typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
        if (i != null) {
            var s, a, c, l, u = [], h = !0, m = !1;
            try {
                if (c = (i = i.call(t)).next,
                n === 0) {
                    if (Object(i) !== i)
                        return;
                    h = !1
                } else
                    for (; !(h = (s = c.call(i)).done) && (u.push(s.value),
                    u.length !== n); h = !0)
                        ;
            } catch (_) {
                m = !0,
                a = _
            } finally {
                try {
                    if (!h && i.return != null && (l = i.return(),
                    Object(l) !== l))
                        return
                } finally {
                    if (m)
                        throw a
                }
            }
            return u
        }
    }
    )(r, e) || (function(t, n) {
        if (t) {
            if (typeof t == "string")
                return us(t, n);
            var i = {}.toString.call(t).slice(8, -1);
            return i === "Object" && t.constructor && (i = t.constructor.name),
            i === "Map" || i === "Set" ? Array.from(t) : i === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i) ? us(t, n) : void 0
        }
    }
    )(r, e) || (function() {
        throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
    }
    )()
}
function hl(r) {
    return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r
}
var ds, xr = {
    exports: {}
}, ei = (function() {
    if (ds)
        return xr.exports;
    ds = 1;
    var r, e = typeof Reflect == "object" ? Reflect : null, t = e && typeof e.apply == "function" ? e.apply : function(v, E, C) {
        return Function.prototype.apply.call(v, E, C)
    }
    ;
    r = e && typeof e.ownKeys == "function" ? e.ownKeys : Object.getOwnPropertySymbols ? function(v) {
        return Object.getOwnPropertyNames(v).concat(Object.getOwnPropertySymbols(v))
    }
    : function(v) {
        return Object.getOwnPropertyNames(v)
    }
    ;
    var n = Number.isNaN || function(v) {
        return v != v
    }
    ;
    function i() {
        i.init.call(this)
    }
    xr.exports = i,
    xr.exports.once = function(v, E) {
        return new Promise((function(C, x) {
            function N(w) {
                v.removeListener(E, k),
                x(w)
            }
            function k() {
                typeof v.removeListener == "function" && v.removeListener("error", N),
                C([].slice.call(arguments))
            }
            b(v, E, k, {
                once: !0
            }),
            E !== "error" && (function(w, T, L) {
                typeof w.on == "function" && b(w, "error", T, L)
            }
            )(v, N, {
                once: !0
            })
        }
        ))
    }
    ,
    i.EventEmitter = i,
    i.prototype._events = void 0,
    i.prototype._eventsCount = 0,
    i.prototype._maxListeners = void 0;
    var s = 10;
    function a(v) {
        if (typeof v != "function")
            throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof v)
    }
    function c(v) {
        return v._maxListeners === void 0 ? i.defaultMaxListeners : v._maxListeners
    }
    function l(v, E, C, x) {
        var N, k, w, T;
        if (a(C),
        (k = v._events) === void 0 ? (k = v._events = Object.create(null),
        v._eventsCount = 0) : (k.newListener !== void 0 && (v.emit("newListener", E, C.listener ? C.listener : C),
        k = v._events),
        w = k[E]),
        w === void 0)
            w = k[E] = C,
            ++v._eventsCount;
        else if (typeof w == "function" ? w = k[E] = x ? [C, w] : [w, C] : x ? w.unshift(C) : w.push(C),
        (N = c(v)) > 0 && w.length > N && !w.warned) {
            w.warned = !0;
            var L = new Error("Possible EventEmitter memory leak detected. " + w.length + " " + String(E) + " listeners added. Use emitter.setMaxListeners() to increase limit");
            L.name = "MaxListenersExceededWarning",
            L.emitter = v,
            L.type = E,
            L.count = w.length,
            T = L,
            console && console.warn && console.warn(T)
        }
        return v
    }
    function u() {
        if (!this.fired)
            return this.target.removeListener(this.type, this.wrapFn),
            this.fired = !0,
            arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments)
    }
    function h(v, E, C) {
        var x = {
            fired: !1,
            wrapFn: void 0,
            target: v,
            type: E,
            listener: C
        }
          , N = u.bind(x);
        return N.listener = C,
        x.wrapFn = N,
        N
    }
    function m(v, E, C) {
        var x = v._events;
        if (x === void 0)
            return [];
        var N = x[E];
        return N === void 0 ? [] : typeof N == "function" ? C ? [N.listener || N] : [N] : C ? (function(k) {
            for (var w = new Array(k.length), T = 0; T < w.length; ++T)
                w[T] = k[T].listener || k[T];
            return w
        }
        )(N) : M(N, N.length)
    }
    function _(v) {
        var E = this._events;
        if (E !== void 0) {
            var C = E[v];
            if (typeof C == "function")
                return 1;
            if (C !== void 0)
                return C.length
        }
        return 0
    }
    function M(v, E) {
        for (var C = new Array(E), x = 0; x < E; ++x)
            C[x] = v[x];
        return C
    }
    function b(v, E, C, x) {
        if (typeof v.on == "function")
            x.once ? v.once(E, C) : v.on(E, C);
        else {
            if (typeof v.addEventListener != "function")
                throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof v);
            v.addEventListener(E, (function N(k) {
                x.once && v.removeEventListener(E, N),
                C(k)
            }
            ))
        }
    }
    return Object.defineProperty(i, "defaultMaxListeners", {
        enumerable: !0,
        get: function() {
            return s
        },
        set: function(v) {
            if (typeof v != "number" || v < 0 || n(v))
                throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + v + ".");
            s = v
        }
    }),
    i.init = function() {
        this._events !== void 0 && this._events !== Object.getPrototypeOf(this)._events || (this._events = Object.create(null),
        this._eventsCount = 0),
        this._maxListeners = this._maxListeners || void 0
    }
    ,
    i.prototype.setMaxListeners = function(v) {
        if (typeof v != "number" || v < 0 || n(v))
            throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + v + ".");
        return this._maxListeners = v,
        this
    }
    ,
    i.prototype.getMaxListeners = function() {
        return c(this)
    }
    ,
    i.prototype.emit = function(v) {
        for (var E = [], C = 1; C < arguments.length; C++)
            E.push(arguments[C]);
        var x = v === "error"
          , N = this._events;
        if (N !== void 0)
            x = x && N.error === void 0;
        else if (!x)
            return !1;
        if (x) {
            var k;
            if (E.length > 0 && (k = E[0]),
            k instanceof Error)
                throw k;
            var w = new Error("Unhandled error." + (k ? " (" + k.message + ")" : ""));
            throw w.context = k,
            w
        }
        var T = N[v];
        if (T === void 0)
            return !1;
        if (typeof T == "function")
            t(T, this, E);
        else {
            var L = T.length
              , D = M(T, L);
            for (C = 0; C < L; ++C)
                t(D[C], this, E)
        }
        return !0
    }
    ,
    i.prototype.addListener = function(v, E) {
        return l(this, v, E, !1)
    }
    ,
    i.prototype.on = i.prototype.addListener,
    i.prototype.prependListener = function(v, E) {
        return l(this, v, E, !0)
    }
    ,
    i.prototype.once = function(v, E) {
        return a(E),
        this.on(v, h(this, v, E)),
        this
    }
    ,
    i.prototype.prependOnceListener = function(v, E) {
        return a(E),
        this.prependListener(v, h(this, v, E)),
        this
    }
    ,
    i.prototype.removeListener = function(v, E) {
        var C, x, N, k, w;
        if (a(E),
        (x = this._events) === void 0)
            return this;
        if ((C = x[v]) === void 0)
            return this;
        if (C === E || C.listener === E)
            --this._eventsCount == 0 ? this._events = Object.create(null) : (delete x[v],
            x.removeListener && this.emit("removeListener", v, C.listener || E));
        else if (typeof C != "function") {
            for (N = -1,
            k = C.length - 1; k >= 0; k--)
                if (C[k] === E || C[k].listener === E) {
                    w = C[k].listener,
                    N = k;
                    break
                }
            if (N < 0)
                return this;
            N === 0 ? C.shift() : (function(T, L) {
                for (; L + 1 < T.length; L++)
                    T[L] = T[L + 1];
                T.pop()
            }
            )(C, N),
            C.length === 1 && (x[v] = C[0]),
            x.removeListener !== void 0 && this.emit("removeListener", v, w || E)
        }
        return this
    }
    ,
    i.prototype.off = i.prototype.removeListener,
    i.prototype.removeAllListeners = function(v) {
        var E, C, x;
        if ((C = this._events) === void 0)
            return this;
        if (C.removeListener === void 0)
            return arguments.length === 0 ? (this._events = Object.create(null),
            this._eventsCount = 0) : C[v] !== void 0 && (--this._eventsCount == 0 ? this._events = Object.create(null) : delete C[v]),
            this;
        if (arguments.length === 0) {
            var N, k = Object.keys(C);
            for (x = 0; x < k.length; ++x)
                (N = k[x]) !== "removeListener" && this.removeAllListeners(N);
            return this.removeAllListeners("removeListener"),
            this._events = Object.create(null),
            this._eventsCount = 0,
            this
        }
        if (typeof (E = C[v]) == "function")
            this.removeListener(v, E);
        else if (E !== void 0)
            for (x = E.length - 1; x >= 0; x--)
                this.removeListener(v, E[x]);
        return this
    }
    ,
    i.prototype.listeners = function(v) {
        return m(this, v, !0)
    }
    ,
    i.prototype.rawListeners = function(v) {
        return m(this, v, !1)
    }
    ,
    i.listenerCount = function(v, E) {
        return typeof v.listenerCount == "function" ? v.listenerCount(E) : _.call(v, E)
    }
    ,
    i.prototype.listenerCount = _,
    i.prototype.eventNames = function() {
        return this._eventsCount > 0 ? r(this._events) : []
    }
    ,
    xr.exports
}
)(), Nr = hl(ei), fs = Object.prototype.hasOwnProperty;
function hs(r, e, t) {
    for (t of r.keys())
        if (ye(t, e))
            return t
}
function ye(r, e) {
    var t, n, i;
    if (r === e)
        return !0;
    if (r && e && (t = r.constructor) === e.constructor) {
        if (t === Date)
            return r.getTime() === e.getTime();
        if (t === RegExp)
            return r.toString() === e.toString();
        if (t === Array) {
            if ((n = r.length) === e.length)
                for (; n-- && ye(r[n], e[n]); )
                    ;
            return n === -1
        }
        if (t === Set) {
            if (r.size !== e.size)
                return !1;
            for (n of r)
                if ((i = n) && typeof i == "object" && !(i = hs(e, i)) || !e.has(i))
                    return !1;
            return !0
        }
        if (t === Map) {
            if (r.size !== e.size)
                return !1;
            for (n of r)
                if ((i = n[0]) && typeof i == "object" && !(i = hs(e, i)) || !ye(n[1], e.get(i)))
                    return !1;
            return !0
        }
        if (t === ArrayBuffer)
            r = new Uint8Array(r),
            e = new Uint8Array(e);
        else if (t === DataView) {
            if ((n = r.byteLength) === e.byteLength)
                for (; n-- && r.getInt8(n) === e.getInt8(n); )
                    ;
            return n === -1
        }
        if (ArrayBuffer.isView(r)) {
            if ((n = r.byteLength) === e.byteLength)
                for (; n-- && r[n] === e[n]; )
                    ;
            return n === -1
        }
        if (!t || typeof r == "object") {
            for (t in n = 0,
            r)
                if (fs.call(r, t) && ++n && !fs.call(e, t) || !(t in e) || !ye(r[t], e[t]))
                    return !1;
            return Object.keys(e).length === n
        }
    }
    return r != r && e != e
}
const pl = {
    "Amazon Silk": "amazon_silk",
    "Android Browser": "android",
    Bada: "bada",
    BlackBerry: "blackberry",
    Chrome: "chrome",
    Chromium: "chromium",
    Electron: "electron",
    Epiphany: "epiphany",
    Firefox: "firefox",
    Focus: "focus",
    Generic: "generic",
    "Google Search": "google_search",
    Googlebot: "googlebot",
    "Internet Explorer": "ie",
    "K-Meleon": "k_meleon",
    Maxthon: "maxthon",
    "Microsoft Edge": "edge",
    "MZ Browser": "mz",
    "NAVER Whale Browser": "naver",
    Opera: "opera",
    "Opera Coast": "opera_coast",
    PhantomJS: "phantomjs",
    Puffin: "puffin",
    QupZilla: "qupzilla",
    QQ: "qq",
    QQLite: "qqlite",
    Safari: "safari",
    Sailfish: "sailfish",
    "Samsung Internet for Android": "samsung_internet",
    SeaMonkey: "seamonkey",
    Sleipnir: "sleipnir",
    Swing: "swing",
    Tizen: "tizen",
    "UC Browser": "uc",
    Vivaldi: "vivaldi",
    "WebOS Browser": "webos",
    WeChat: "wechat",
    "Yandex Browser": "yandex",
    Roku: "roku"
}
  , Fo = {
    amazon_silk: "Amazon Silk",
    android: "Android Browser",
    bada: "Bada",
    blackberry: "BlackBerry",
    chrome: "Chrome",
    chromium: "Chromium",
    electron: "Electron",
    epiphany: "Epiphany",
    firefox: "Firefox",
    focus: "Focus",
    generic: "Generic",
    googlebot: "Googlebot",
    google_search: "Google Search",
    ie: "Internet Explorer",
    k_meleon: "K-Meleon",
    maxthon: "Maxthon",
    edge: "Microsoft Edge",
    mz: "MZ Browser",
    naver: "NAVER Whale Browser",
    opera: "Opera",
    opera_coast: "Opera Coast",
    phantomjs: "PhantomJS",
    puffin: "Puffin",
    qupzilla: "QupZilla",
    qq: "QQ Browser",
    qqlite: "QQ Browser Lite",
    safari: "Safari",
    sailfish: "Sailfish",
    samsung_internet: "Samsung Internet for Android",
    seamonkey: "SeaMonkey",
    sleipnir: "Sleipnir",
    swing: "Swing",
    tizen: "Tizen",
    uc: "UC Browser",
    vivaldi: "Vivaldi",
    webos: "WebOS Browser",
    wechat: "WeChat",
    yandex: "Yandex Browser"
}
  , oe = {
    tablet: "tablet",
    mobile: "mobile",
    desktop: "desktop",
    tv: "tv"
}
  , ve = {
    WindowsPhone: "Windows Phone",
    Windows: "Windows",
    MacOS: "macOS",
    iOS: "iOS",
    Android: "Android",
    WebOS: "WebOS",
    BlackBerry: "BlackBerry",
    Bada: "Bada",
    Tizen: "Tizen",
    Linux: "Linux",
    ChromeOS: "Chrome OS",
    PlayStation4: "PlayStation 4",
    Roku: "Roku"
}
  , ut = {
    EdgeHTML: "EdgeHTML",
    Blink: "Blink",
    Trident: "Trident",
    Presto: "Presto",
    Gecko: "Gecko",
    WebKit: "WebKit"
};
class A {
    static getFirstMatch(e, t) {
        const n = t.match(e);
        return n && n.length > 0 && n[1] || ""
    }
    static getSecondMatch(e, t) {
        const n = t.match(e);
        return n && n.length > 1 && n[2] || ""
    }
    static matchAndReturnConst(e, t, n) {
        if (e.test(t))
            return n
    }
    static getWindowsVersionName(e) {
        switch (e) {
        case "NT":
            return "NT";
        case "XP":
        case "NT 5.1":
            return "XP";
        case "NT 5.0":
            return "2000";
        case "NT 5.2":
            return "2003";
        case "NT 6.0":
            return "Vista";
        case "NT 6.1":
            return "7";
        case "NT 6.2":
            return "8";
        case "NT 6.3":
            return "8.1";
        case "NT 10.0":
            return "10";
        default:
            return
        }
    }
    static getMacOSVersionName(e) {
        const t = e.split(".").splice(0, 2).map((n => parseInt(n, 10) || 0));
        if (t.push(0),
        t[0] === 10)
            switch (t[1]) {
            case 5:
                return "Leopard";
            case 6:
                return "Snow Leopard";
            case 7:
                return "Lion";
            case 8:
                return "Mountain Lion";
            case 9:
                return "Mavericks";
            case 10:
                return "Yosemite";
            case 11:
                return "El Capitan";
            case 12:
                return "Sierra";
            case 13:
                return "High Sierra";
            case 14:
                return "Mojave";
            case 15:
                return "Catalina";
            default:
                return
            }
    }
    static getAndroidVersionName(e) {
        const t = e.split(".").splice(0, 2).map((n => parseInt(n, 10) || 0));
        if (t.push(0),
        !(t[0] === 1 && t[1] < 5))
            return t[0] === 1 && t[1] < 6 ? "Cupcake" : t[0] === 1 && t[1] >= 6 ? "Donut" : t[0] === 2 && t[1] < 2 ? "Eclair" : t[0] === 2 && t[1] === 2 ? "Froyo" : t[0] === 2 && t[1] > 2 ? "Gingerbread" : t[0] === 3 ? "Honeycomb" : t[0] === 4 && t[1] < 1 ? "Ice Cream Sandwich" : t[0] === 4 && t[1] < 4 ? "Jelly Bean" : t[0] === 4 && t[1] >= 4 ? "KitKat" : t[0] === 5 ? "Lollipop" : t[0] === 6 ? "Marshmallow" : t[0] === 7 ? "Nougat" : t[0] === 8 ? "Oreo" : t[0] === 9 ? "Pie" : void 0
    }
    static getVersionPrecision(e) {
        return e.split(".").length
    }
    static compareVersions(e, t, n=!1) {
        const i = A.getVersionPrecision(e)
          , s = A.getVersionPrecision(t);
        let a = Math.max(i, s)
          , c = 0;
        const l = A.map([e, t], (u => {
            const h = a - A.getVersionPrecision(u)
              , m = u + new Array(h + 1).join(".0");
            return A.map(m.split("."), (_ => new Array(20 - _.length).join("0") + _)).reverse()
        }
        ));
        for (n && (c = a - Math.min(i, s)),
        a -= 1; a >= c; ) {
            if (l[0][a] > l[1][a])
                return 1;
            if (l[0][a] === l[1][a]) {
                if (a === c)
                    return 0;
                a -= 1
            } else if (l[0][a] < l[1][a])
                return -1
        }
    }
    static map(e, t) {
        const n = [];
        let i;
        if (Array.prototype.map)
            return Array.prototype.map.call(e, t);
        for (i = 0; i < e.length; i += 1)
            n.push(t(e[i]));
        return n
    }
    static find(e, t) {
        let n, i;
        if (Array.prototype.find)
            return Array.prototype.find.call(e, t);
        for (n = 0,
        i = e.length; n < i; n += 1) {
            const s = e[n];
            if (t(s, n))
                return s
        }
    }
    static assign(e, ...t) {
        const n = e;
        let i, s;
        if (Object.assign)
            return Object.assign(e, ...t);
        for (i = 0,
        s = t.length; i < s; i += 1) {
            const a = t[i];
            typeof a == "object" && a !== null && Object.keys(a).forEach((c => {
                n[c] = a[c]
            }
            ))
        }
        return e
    }
    static getBrowserAlias(e) {
        return pl[e]
    }
    static getBrowserTypeByAlias(e) {
        return Fo[e] || ""
    }
}
const te = /version\/(\d+(\.?_?\d+)+)/i
  , ml = [{
    test: [/googlebot/i],
    describe(r) {
        const e = {
            name: "Googlebot"
        }
          , t = A.getFirstMatch(/googlebot\/(\d+(\.\d+))/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/opera/i],
    describe(r) {
        const e = {
            name: "Opera"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/opr\/|opios/i],
    describe(r) {
        const e = {
            name: "Opera"
        }
          , t = A.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/SamsungBrowser/i],
    describe(r) {
        const e = {
            name: "Samsung Internet for Android"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/Whale/i],
    describe(r) {
        const e = {
            name: "NAVER Whale Browser"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/MZBrowser/i],
    describe(r) {
        const e = {
            name: "MZ Browser"
        }
          , t = A.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/focus/i],
    describe(r) {
        const e = {
            name: "Focus"
        }
          , t = A.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/swing/i],
    describe(r) {
        const e = {
            name: "Swing"
        }
          , t = A.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/coast/i],
    describe(r) {
        const e = {
            name: "Opera Coast"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/opt\/\d+(?:.?_?\d+)+/i],
    describe(r) {
        const e = {
            name: "Opera Touch"
        }
          , t = A.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/yabrowser/i],
    describe(r) {
        const e = {
            name: "Yandex Browser"
        }
          , t = A.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/ucbrowser/i],
    describe(r) {
        const e = {
            name: "UC Browser"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/Maxthon|mxios/i],
    describe(r) {
        const e = {
            name: "Maxthon"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/epiphany/i],
    describe(r) {
        const e = {
            name: "Epiphany"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/puffin/i],
    describe(r) {
        const e = {
            name: "Puffin"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/sleipnir/i],
    describe(r) {
        const e = {
            name: "Sleipnir"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/k-meleon/i],
    describe(r) {
        const e = {
            name: "K-Meleon"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/micromessenger/i],
    describe(r) {
        const e = {
            name: "WeChat"
        }
          , t = A.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/qqbrowser/i],
    describe(r) {
        const e = {
            name: /qqbrowserlite/i.test(r) ? "QQ Browser Lite" : "QQ Browser"
        }
          , t = A.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/msie|trident/i],
    describe(r) {
        const e = {
            name: "Internet Explorer"
        }
          , t = A.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/\sedg\//i],
    describe(r) {
        const e = {
            name: "Microsoft Edge"
        }
          , t = A.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/edg([ea]|ios)/i],
    describe(r) {
        const e = {
            name: "Microsoft Edge"
        }
          , t = A.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/vivaldi/i],
    describe(r) {
        const e = {
            name: "Vivaldi"
        }
          , t = A.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/seamonkey/i],
    describe(r) {
        const e = {
            name: "SeaMonkey"
        }
          , t = A.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/sailfish/i],
    describe(r) {
        const e = {
            name: "Sailfish"
        }
          , t = A.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/silk/i],
    describe(r) {
        const e = {
            name: "Amazon Silk"
        }
          , t = A.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/phantom/i],
    describe(r) {
        const e = {
            name: "PhantomJS"
        }
          , t = A.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/slimerjs/i],
    describe(r) {
        const e = {
            name: "SlimerJS"
        }
          , t = A.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
    describe(r) {
        const e = {
            name: "BlackBerry"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/(web|hpw)[o0]s/i],
    describe(r) {
        const e = {
            name: "WebOS Browser"
        }
          , t = A.getFirstMatch(te, r) || A.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/bada/i],
    describe(r) {
        const e = {
            name: "Bada"
        }
          , t = A.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/tizen/i],
    describe(r) {
        const e = {
            name: "Tizen"
        }
          , t = A.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/qupzilla/i],
    describe(r) {
        const e = {
            name: "QupZilla"
        }
          , t = A.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/firefox|iceweasel|fxios/i],
    describe(r) {
        const e = {
            name: "Firefox"
        }
          , t = A.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/electron/i],
    describe(r) {
        const e = {
            name: "Electron"
        }
          , t = A.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/MiuiBrowser/i],
    describe(r) {
        const e = {
            name: "Miui"
        }
          , t = A.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/chromium/i],
    describe(r) {
        const e = {
            name: "Chromium"
        }
          , t = A.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i, r) || A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/chrome|crios|crmo/i],
    describe(r) {
        const e = {
            name: "Chrome"
        }
          , t = A.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/GSA/i],
    describe(r) {
        const e = {
            name: "Google Search"
        }
          , t = A.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test(r) {
        const e = !r.test(/like android/i)
          , t = r.test(/android/i);
        return e && t
    },
    describe(r) {
        const e = {
            name: "Android Browser"
        }
          , t = A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/playstation 4/i],
    describe(r) {
        const e = {
            name: "PlayStation 4"
        }
          , t = A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/safari|applewebkit/i],
    describe(r) {
        const e = {
            name: "Safari"
        }
          , t = A.getFirstMatch(te, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/.*/i],
    describe(r) {
        const e = r.search("\\(") !== -1 ? /^(.*)\/(.*)[ \t]\((.*)/ : /^(.*)\/(.*) /;
        return {
            name: A.getFirstMatch(e, r),
            version: A.getSecondMatch(e, r)
        }
    }
}];
var gl = [{
    test: [/Roku\/DVP/],
    describe(r) {
        const e = A.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i, r);
        return {
            name: ve.Roku,
            version: e
        }
    }
}, {
    test: [/windows phone/i],
    describe(r) {
        const e = A.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i, r);
        return {
            name: ve.WindowsPhone,
            version: e
        }
    }
}, {
    test: [/windows /i],
    describe(r) {
        const e = A.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i, r)
          , t = A.getWindowsVersionName(e);
        return {
            name: ve.Windows,
            version: e,
            versionName: t
        }
    }
}, {
    test: [/Macintosh(.*?) FxiOS(.*?)\//],
    describe(r) {
        const e = {
            name: ve.iOS
        }
          , t = A.getSecondMatch(/(Version\/)(\d[\d.]+)/, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/macintosh/i],
    describe(r) {
        const e = A.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i, r).replace(/[_\s]/g, ".")
          , t = A.getMacOSVersionName(e)
          , n = {
            name: ve.MacOS,
            version: e
        };
        return t && (n.versionName = t),
        n
    }
}, {
    test: [/(ipod|iphone|ipad)/i],
    describe(r) {
        const e = A.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, r).replace(/[_\s]/g, ".");
        return {
            name: ve.iOS,
            version: e
        }
    }
}, {
    test(r) {
        const e = !r.test(/like android/i)
          , t = r.test(/android/i);
        return e && t
    },
    describe(r) {
        const e = A.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i, r)
          , t = A.getAndroidVersionName(e)
          , n = {
            name: ve.Android,
            version: e
        };
        return t && (n.versionName = t),
        n
    }
}, {
    test: [/(web|hpw)[o0]s/i],
    describe(r) {
        const e = A.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i, r)
          , t = {
            name: ve.WebOS
        };
        return e && e.length && (t.version = e),
        t
    }
}, {
    test: [/blackberry|\bbb\d+/i, /rim\stablet/i],
    describe(r) {
        const e = A.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i, r) || A.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i, r) || A.getFirstMatch(/\bbb(\d+)/i, r);
        return {
            name: ve.BlackBerry,
            version: e
        }
    }
}, {
    test: [/bada/i],
    describe(r) {
        const e = A.getFirstMatch(/bada\/(\d+(\.\d+)*)/i, r);
        return {
            name: ve.Bada,
            version: e
        }
    }
}, {
    test: [/tizen/i],
    describe(r) {
        const e = A.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i, r);
        return {
            name: ve.Tizen,
            version: e
        }
    }
}, {
    test: [/linux/i],
    describe: () => ({
        name: ve.Linux
    })
}, {
    test: [/CrOS/],
    describe: () => ({
        name: ve.ChromeOS
    })
}, {
    test: [/PlayStation 4/],
    describe(r) {
        const e = A.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i, r);
        return {
            name: ve.PlayStation4,
            version: e
        }
    }
}]
  , vl = [{
    test: [/googlebot/i],
    describe: () => ({
        type: "bot",
        vendor: "Google"
    })
}, {
    test: [/huawei/i],
    describe(r) {
        const e = A.getFirstMatch(/(can-l01)/i, r) && "Nova"
          , t = {
            type: oe.mobile,
            vendor: "Huawei"
        };
        return e && (t.model = e),
        t
    }
}, {
    test: [/nexus\s*(?:7|8|9|10).*/i],
    describe: () => ({
        type: oe.tablet,
        vendor: "Nexus"
    })
}, {
    test: [/ipad/i],
    describe: () => ({
        type: oe.tablet,
        vendor: "Apple",
        model: "iPad"
    })
}, {
    test: [/Macintosh(.*?) FxiOS(.*?)\//],
    describe: () => ({
        type: oe.tablet,
        vendor: "Apple",
        model: "iPad"
    })
}, {
    test: [/kftt build/i],
    describe: () => ({
        type: oe.tablet,
        vendor: "Amazon",
        model: "Kindle Fire HD 7"
    })
}, {
    test: [/silk/i],
    describe: () => ({
        type: oe.tablet,
        vendor: "Amazon"
    })
}, {
    test: [/tablet(?! pc)/i],
    describe: () => ({
        type: oe.tablet
    })
}, {
    test(r) {
        const e = r.test(/ipod|iphone/i)
          , t = r.test(/like (ipod|iphone)/i);
        return e && !t
    },
    describe(r) {
        const e = A.getFirstMatch(/(ipod|iphone)/i, r);
        return {
            type: oe.mobile,
            vendor: "Apple",
            model: e
        }
    }
}, {
    test: [/nexus\s*[0-6].*/i, /galaxy nexus/i],
    describe: () => ({
        type: oe.mobile,
        vendor: "Nexus"
    })
}, {
    test: [/[^-]mobi/i],
    describe: () => ({
        type: oe.mobile
    })
}, {
    test: r => r.getBrowserName(!0) === "blackberry",
    describe: () => ({
        type: oe.mobile,
        vendor: "BlackBerry"
    })
}, {
    test: r => r.getBrowserName(!0) === "bada",
    describe: () => ({
        type: oe.mobile
    })
}, {
    test: r => r.getBrowserName() === "windows phone",
    describe: () => ({
        type: oe.mobile,
        vendor: "Microsoft"
    })
}, {
    test(r) {
        const e = Number(String(r.getOSVersion()).split(".")[0]);
        return r.getOSName(!0) === "android" && e >= 3
    },
    describe: () => ({
        type: oe.tablet
    })
}, {
    test: r => r.getOSName(!0) === "android",
    describe: () => ({
        type: oe.mobile
    })
}, {
    test: r => r.getOSName(!0) === "macos",
    describe: () => ({
        type: oe.desktop,
        vendor: "Apple"
    })
}, {
    test: r => r.getOSName(!0) === "windows",
    describe: () => ({
        type: oe.desktop
    })
}, {
    test: r => r.getOSName(!0) === "linux",
    describe: () => ({
        type: oe.desktop
    })
}, {
    test: r => r.getOSName(!0) === "playstation 4",
    describe: () => ({
        type: oe.tv
    })
}, {
    test: r => r.getOSName(!0) === "roku",
    describe: () => ({
        type: oe.tv
    })
}]
  , bl = [{
    test: r => r.getBrowserName(!0) === "microsoft edge",
    describe(r) {
        if (/\sedg\//i.test(r))
            return {
                name: ut.Blink
            };
        const e = A.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, r);
        return {
            name: ut.EdgeHTML,
            version: e
        }
    }
}, {
    test: [/trident/i],
    describe(r) {
        const e = {
            name: ut.Trident
        }
          , t = A.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: r => r.test(/presto/i),
    describe(r) {
        const e = {
            name: ut.Presto
        }
          , t = A.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test(r) {
        const e = r.test(/gecko/i)
          , t = r.test(/like gecko/i);
        return e && !t
    },
    describe(r) {
        const e = {
            name: ut.Gecko
        }
          , t = A.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}, {
    test: [/(apple)?webkit\/537\.36/i],
    describe: () => ({
        name: ut.Blink
    })
}, {
    test: [/(apple)?webkit/i],
    describe(r) {
        const e = {
            name: ut.WebKit
        }
          , t = A.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, r);
        return t && (e.version = t),
        e
    }
}];
class ps {
    constructor(e, t=!1) {
        if (e == null || e === "")
            throw new Error("UserAgent parameter can't be empty");
        this._ua = e,
        this.parsedResult = {},
        t !== !0 && this.parse()
    }
    getUA() {
        return this._ua
    }
    test(e) {
        return e.test(this._ua)
    }
    parseBrowser() {
        this.parsedResult.browser = {};
        const e = A.find(ml, (t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (t.test instanceof Array)
                return t.test.some((n => this.test(n)));
            throw new Error("Browser's test function is not valid")
        }
        ));
        return e && (this.parsedResult.browser = e.describe(this.getUA())),
        this.parsedResult.browser
    }
    getBrowser() {
        return this.parsedResult.browser ? this.parsedResult.browser : this.parseBrowser()
    }
    getBrowserName(e) {
        return e ? String(this.getBrowser().name).toLowerCase() || "" : this.getBrowser().name || ""
    }
    getBrowserVersion() {
        return this.getBrowser().version
    }
    getOS() {
        return this.parsedResult.os ? this.parsedResult.os : this.parseOS()
    }
    parseOS() {
        this.parsedResult.os = {};
        const e = A.find(gl, (t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (t.test instanceof Array)
                return t.test.some((n => this.test(n)));
            throw new Error("Browser's test function is not valid")
        }
        ));
        return e && (this.parsedResult.os = e.describe(this.getUA())),
        this.parsedResult.os
    }
    getOSName(e) {
        const {name: t} = this.getOS();
        return e ? String(t).toLowerCase() || "" : t || ""
    }
    getOSVersion() {
        return this.getOS().version
    }
    getPlatform() {
        return this.parsedResult.platform ? this.parsedResult.platform : this.parsePlatform()
    }
    getPlatformType(e=!1) {
        const {type: t} = this.getPlatform();
        return e ? String(t).toLowerCase() || "" : t || ""
    }
    parsePlatform() {
        this.parsedResult.platform = {};
        const e = A.find(vl, (t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (t.test instanceof Array)
                return t.test.some((n => this.test(n)));
            throw new Error("Browser's test function is not valid")
        }
        ));
        return e && (this.parsedResult.platform = e.describe(this.getUA())),
        this.parsedResult.platform
    }
    getEngine() {
        return this.parsedResult.engine ? this.parsedResult.engine : this.parseEngine()
    }
    getEngineName(e) {
        return e ? String(this.getEngine().name).toLowerCase() || "" : this.getEngine().name || ""
    }
    parseEngine() {
        this.parsedResult.engine = {};
        const e = A.find(bl, (t => {
            if (typeof t.test == "function")
                return t.test(this);
            if (t.test instanceof Array)
                return t.test.some((n => this.test(n)));
            throw new Error("Browser's test function is not valid")
        }
        ));
        return e && (this.parsedResult.engine = e.describe(this.getUA())),
        this.parsedResult.engine
    }
    parse() {
        return this.parseBrowser(),
        this.parseOS(),
        this.parsePlatform(),
        this.parseEngine(),
        this
    }
    getResult() {
        return A.assign({}, this.parsedResult)
    }
    satisfies(e) {
        const t = {};
        let n = 0;
        const i = {};
        let s = 0;
        if (Object.keys(e).forEach((a => {
            const c = e[a];
            typeof c == "string" ? (i[a] = c,
            s += 1) : typeof c == "object" && (t[a] = c,
            n += 1)
        }
        )),
        n > 0) {
            const a = Object.keys(t)
              , c = A.find(a, (u => this.isOS(u)));
            if (c) {
                const u = this.satisfies(t[c]);
                if (u !== void 0)
                    return u
            }
            const l = A.find(a, (u => this.isPlatform(u)));
            if (l) {
                const u = this.satisfies(t[l]);
                if (u !== void 0)
                    return u
            }
        }
        if (s > 0) {
            const a = Object.keys(i)
              , c = A.find(a, (l => this.isBrowser(l, !0)));
            if (c !== void 0)
                return this.compareVersion(i[c])
        }
    }
    isBrowser(e, t=!1) {
        const n = this.getBrowserName().toLowerCase();
        let i = e.toLowerCase();
        const s = A.getBrowserTypeByAlias(i);
        return t && s && (i = s.toLowerCase()),
        i === n
    }
    compareVersion(e) {
        let t = [0]
          , n = e
          , i = !1;
        const s = this.getBrowserVersion();
        if (typeof s == "string")
            return e[0] === ">" || e[0] === "<" ? (n = e.substr(1),
            e[1] === "=" ? (i = !0,
            n = e.substr(2)) : t = [],
            e[0] === ">" ? t.push(1) : t.push(-1)) : e[0] === "=" ? n = e.substr(1) : e[0] === "~" && (i = !0,
            n = e.substr(1)),
            t.indexOf(A.compareVersions(s, n, i)) > -1
    }
    isOS(e) {
        return this.getOSName(!0) === String(e).toLowerCase()
    }
    isPlatform(e) {
        return this.getPlatformType(!0) === String(e).toLowerCase()
    }
    isEngine(e) {
        return this.getEngineName(!0) === String(e).toLowerCase()
    }
    is(e, t=!1) {
        return this.isBrowser(e, t) || this.isOS(e) || this.isPlatform(e)
    }
    some(e=[]) {
        return e.some((t => this.is(t)))
    }
}
/*!
 * Bowser - a browser detector
 * https://github.com/lancedikson/bowser
 * MIT License | (c) Dustin Diaz 2012-2015
 * MIT License | (c) Denis Demchenko 2015-2019
 */
class yl {
    static getParser(e, t=!1) {
        if (typeof e != "string")
            throw new Error("UserAgent should be a string");
        return new ps(e,t)
    }
    static parse(e) {
        return new ps(e).getResult()
    }
    static get BROWSER_MAP() {
        return Fo
    }
    static get ENGINE_MAP() {
        return ut
    }
    static get OS_MAP() {
        return ve
    }
    static get PLATFORMS_MAP() {
        return oe
    }
}
function yn() {
    return Date.now() + Math.random().toString()
}
function hr() {
    throw new Error("Method must be implemented in subclass")
}
function jo(r, e) {
    return e != null && e.proxyUrl ? e.proxyUrl + (e.proxyUrl.slice(-1) === "/" ? "" : "/") + r.substring(8) : r
}
function rn(r) {
    return r != null && r.callObjectBundleUrlOverride ? r.callObjectBundleUrlOverride : jo("https://c.daily.co/call-machine/versioned/".concat("0.83.1", "/static/call-machine-object-bundle.js"), r)
}
function nn(r) {
    try {
        new URL(r)
    } catch {
        return !1
    }
    return !0
}
const ie = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__
  , Lt = "8.55.0"
  , ee = globalThis;
function sn(r, e, t) {
    const n = ee
      , i = n.__SENTRY__ = n.__SENTRY__ || {}
      , s = i[Lt] = i[Lt] || {};
    return s[r] || (s[r] = e())
}
const Ut = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__
  , ti = ["debug", "info", "warn", "error", "log", "assert", "trace"]
  , an = {};
function Mr(r) {
    if (!("console"in ee))
        return r();
    const e = ee.console
      , t = {}
      , n = Object.keys(an);
    n.forEach((i => {
        const s = an[i];
        t[i] = e[i],
        e[i] = s
    }
    ));
    try {
        return r()
    } finally {
        n.forEach((i => {
            e[i] = t[i]
        }
        ))
    }
}
const W = sn("logger", (function() {
    let r = !1;
    const e = {
        enable: () => {
            r = !0
        }
        ,
        disable: () => {
            r = !1
        }
        ,
        isEnabled: () => r
    };
    return Ut ? ti.forEach((t => {
        e[t] = (...n) => {
            r && Mr(( () => {
                ee.console[t](`Sentry Logger [${t}]:`, ...n)
            }
            ))
        }
    }
    )) : ti.forEach((t => {
        e[t] = () => {}
    }
    )),
    e
}
))
  , Nt = "?"
  , ms = /\(error: (.*)\)/
  , gs = /captureMessage|captureException/;
function Lr(r) {
    return r[r.length - 1] || {}
}
const vs = "<anonymous>";
function mt(r) {
    try {
        return r && typeof r == "function" && r.name || vs
    } catch {
        return vs
    }
}
function bs(r) {
    const e = r.exception;
    if (e) {
        const t = [];
        try {
            return e.values.forEach((n => {
                n.stacktrace.frames && t.push(...n.stacktrace.frames)
            }
            )),
            t
        } catch {
            return
        }
    }
}
const Yr = {}
  , ys = {};
function Bt(r, e) {
    Yr[r] = Yr[r] || [],
    Yr[r].push(e)
}
function Dt(r, e) {
    if (!ys[r]) {
        ys[r] = !0;
        try {
            e()
        } catch (t) {
            Ut && W.error(`Error while instrumenting ${r}`, t)
        }
    }
}
function Ue(r, e) {
    const t = r && Yr[r];
    if (t)
        for (const n of t)
            try {
                n(e)
            } catch (i) {
                Ut && W.error(`Error while triggering instrumentation handler.
Type: ${r}
Name: ${mt(n)}
Error:`, i)
            }
}
let On = null;
function _l() {
    On = ee.onerror,
    ee.onerror = function(r, e, t, n, i) {
        return Ue("error", {
            column: n,
            error: i,
            line: t,
            msg: r,
            url: e
        }),
        !!On && On.apply(this, arguments)
    }
    ,
    ee.onerror.__SENTRY_INSTRUMENTED__ = !0
}
let An = null;
function wl() {
    An = ee.onunhandledrejection,
    ee.onunhandledrejection = function(r) {
        return Ue("unhandledrejection", r),
        !An || An.apply(this, arguments)
    }
    ,
    ee.onunhandledrejection.__SENTRY_INSTRUMENTED__ = !0
}
function _n() {
    return Ii(ee),
    ee
}
function Ii(r) {
    const e = r.__SENTRY__ = r.__SENTRY__ || {};
    return e.version = e.version || Lt,
    e[Lt] = e[Lt] || {}
}
const $o = Object.prototype.toString;
function xi(r) {
    switch ($o.call(r)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
    case "[object WebAssembly.Exception]":
        return !0;
    default:
        return Rt(r, Error)
    }
}
function nr(r, e) {
    return $o.call(r) === `[object ${e}]`
}
function Uo(r) {
    return nr(r, "ErrorEvent")
}
function _s(r) {
    return nr(r, "DOMError")
}
function rt(r) {
    return nr(r, "String")
}
function Ni(r) {
    return typeof r == "object" && r !== null && "__sentry_template_string__"in r && "__sentry_template_values__"in r
}
function ri(r) {
    return r === null || Ni(r) || typeof r != "object" && typeof r != "function"
}
function Ht(r) {
    return nr(r, "Object")
}
function wn(r) {
    return typeof Event < "u" && Rt(r, Event)
}
function kn(r) {
    return !!(r && r.then && typeof r.then == "function")
}
function Rt(r, e) {
    try {
        return r instanceof e
    } catch {
        return !1
    }
}
function Vo(r) {
    return !(typeof r != "object" || r === null || !r.__isVue && !r._isVue)
}
const Li = ee;
function Wo(r, e={}) {
    if (!r)
        return "<unknown>";
    try {
        let t = r;
        const n = 5
          , i = [];
        let s = 0
          , a = 0;
        const c = " > "
          , l = c.length;
        let u;
        const h = Array.isArray(e) ? e : e.keyAttrs
          , m = !Array.isArray(e) && e.maxStringLength || 80;
        for (; t && s++ < n && (u = kl(t, h),
        !(u === "html" || s > 1 && a + i.length * l + u.length >= m)); )
            i.push(u),
            a += u.length,
            t = t.parentNode;
        return i.reverse().join(c)
    } catch {
        return "<unknown>"
    }
}
function kl(r, e) {
    const t = r
      , n = [];
    if (!t || !t.tagName)
        return "";
    if (Li.HTMLElement && t instanceof HTMLElement && t.dataset) {
        if (t.dataset.sentryComponent)
            return t.dataset.sentryComponent;
        if (t.dataset.sentryElement)
            return t.dataset.sentryElement
    }
    n.push(t.tagName.toLowerCase());
    const i = e && e.length ? e.filter((a => t.getAttribute(a))).map((a => [a, t.getAttribute(a)])) : null;
    if (i && i.length)
        i.forEach((a => {
            n.push(`[${a[0]}="${a[1]}"]`)
        }
        ));
    else {
        t.id && n.push(`#${t.id}`);
        const a = t.className;
        if (a && rt(a)) {
            const c = a.split(/\s+/);
            for (const l of c)
                n.push(`.${l}`)
        }
    }
    const s = ["aria-label", "type", "name", "title", "alt"];
    for (const a of s) {
        const c = t.getAttribute(a);
        c && n.push(`[${a}="${c}"]`)
    }
    return n.join("")
}
function Jt(r, e=0) {
    return typeof r != "string" || e === 0 || r.length <= e ? r : `${r.slice(0, e)}...`
}
function ws(r, e) {
    if (!Array.isArray(r))
        return "";
    const t = [];
    for (let n = 0; n < r.length; n++) {
        const i = r[n];
        try {
            Vo(i) ? t.push("[VueViewModel]") : t.push(String(i))
        } catch {
            t.push("[value cannot be serialized]")
        }
    }
    return t.join(e)
}
function Sl(r, e, t=!1) {
    return !!rt(r) && (nr(e, "RegExp") ? e.test(r) : !!rt(e) && (t ? r === e : r.includes(e)))
}
function Br(r, e=[], t=!1) {
    return e.some((n => Sl(r, n, t)))
}
function Me(r, e, t) {
    if (!(e in r))
        return;
    const n = r[e]
      , i = t(n);
    typeof i == "function" && qo(i, n);
    try {
        r[e] = i
    } catch {
        Ut && W.log(`Failed to replace method "${e}" in object`, r)
    }
}
function Ft(r, e, t) {
    try {
        Object.defineProperty(r, e, {
            value: t,
            writable: !0,
            configurable: !0
        })
    } catch {
        Ut && W.log(`Failed to add non-enumerable property "${e}" to object`, r)
    }
}
function qo(r, e) {
    try {
        const t = e.prototype || {};
        r.prototype = e.prototype = t,
        Ft(r, "__sentry_original__", e)
    } catch {}
}
function Bi(r) {
    return r.__sentry_original__
}
function zo(r) {
    if (xi(r))
        return {
            message: r.message,
            name: r.name,
            stack: r.stack,
            ...Ss(r)
        };
    if (wn(r)) {
        const e = {
            type: r.type,
            target: ks(r.target),
            currentTarget: ks(r.currentTarget),
            ...Ss(r)
        };
        return typeof CustomEvent < "u" && Rt(r, CustomEvent) && (e.detail = r.detail),
        e
    }
    return r
}
function ks(r) {
    try {
        return e = r,
        typeof Element < "u" && Rt(e, Element) ? Wo(r) : Object.prototype.toString.call(r)
    } catch {
        return "<unknown>"
    }
    var e
}
function Ss(r) {
    if (typeof r == "object" && r !== null) {
        const e = {};
        for (const t in r)
            Object.prototype.hasOwnProperty.call(r, t) && (e[t] = r[t]);
        return e
    }
    return {}
}
function Ie(r) {
    return ni(r, new Map)
}
function ni(r, e) {
    if ((function(t) {
        if (!Ht(t))
            return !1;
        try {
            const n = Object.getPrototypeOf(t).constructor.name;
            return !n || n === "Object"
        } catch {
            return !0
        }
    }
    )(r)) {
        const t = e.get(r);
        if (t !== void 0)
            return t;
        const n = {};
        e.set(r, n);
        for (const i of Object.getOwnPropertyNames(r))
            r[i] !== void 0 && (n[i] = ni(r[i], e));
        return n
    }
    if (Array.isArray(r)) {
        const t = e.get(r);
        if (t !== void 0)
            return t;
        const n = [];
        return e.set(r, n),
        r.forEach((i => {
            n.push(ni(i, e))
        }
        )),
        n
    }
    return r
}
function Cr() {
    return Date.now() / 1e3
}
const it = (function() {
    const {performance: r} = ee;
    if (!r || !r.now)
        return Cr;
    const e = Date.now() - r.now()
      , t = r.timeOrigin == null ? e : r.timeOrigin;
    return () => (t + r.now()) / 1e3
}
)();
function xe() {
    const r = ee
      , e = r.crypto || r.msCrypto;
    let t = () => 16 * Math.random();
    try {
        if (e && e.randomUUID)
            return e.randomUUID().replace(/-/g, "");
        e && e.getRandomValues && (t = () => {
            const n = new Uint8Array(1);
            return e.getRandomValues(n),
            n[0]
        }
        )
    } catch {}
    return ("10000000100040008000" + 1e11).replace(/[018]/g, (n => (n ^ (15 & t()) >> n / 4).toString(16)))
}
function Jo(r) {
    return r.exception && r.exception.values ? r.exception.values[0] : void 0
}
function dt(r) {
    const {message: e, event_id: t} = r;
    if (e)
        return e;
    const n = Jo(r);
    return n ? n.type && n.value ? `${n.type}: ${n.value}` : n.type || n.value || t || "<unknown>" : t || "<unknown>"
}
function ii(r, e, t) {
    const n = r.exception = r.exception || {}
      , i = n.values = n.values || []
      , s = i[0] = i[0] || {};
    s.value || (s.value = e || ""),
    s.type || (s.type = "Error")
}
function Qt(r, e) {
    const t = Jo(r);
    if (!t)
        return;
    const n = t.mechanism;
    if (t.mechanism = {
        type: "generic",
        handled: !0,
        ...n,
        ...e
    },
    e && "data"in e) {
        const i = {
            ...n && n.data,
            ...e.data
        };
        t.mechanism.data = i
    }
}
function Es(r) {
    if ((function(e) {
        try {
            return e.__sentry_captured__
        } catch {}
    }
    )(r))
        return !0;
    try {
        Ft(r, "__sentry_captured__", !0)
    } catch {}
    return !1
}
var Ze;
function jt(r) {
    return new Pe((e => {
        e(r)
    }
    ))
}
function on(r) {
    return new Pe(( (e, t) => {
        t(r)
    }
    ))
}
( () => {
    const {performance: r} = ee;
    !r || !r.now || (r.now(),
    r.timing && r.timing.navigationStart)
}
)(),
(function(r) {
    r[r.PENDING = 0] = "PENDING",
    r[r.RESOLVED = 1] = "RESOLVED",
    r[r.REJECTED = 2] = "REJECTED"
}
)(Ze || (Ze = {}));
class Pe {
    constructor(e) {
        Pe.prototype.__init.call(this),
        Pe.prototype.__init2.call(this),
        Pe.prototype.__init3.call(this),
        Pe.prototype.__init4.call(this),
        this._state = Ze.PENDING,
        this._handlers = [];
        try {
            e(this._resolve, this._reject)
        } catch (t) {
            this._reject(t)
        }
    }
    then(e, t) {
        return new Pe(( (n, i) => {
            this._handlers.push([!1, s => {
                if (e)
                    try {
                        n(e(s))
                    } catch (a) {
                        i(a)
                    }
                else
                    n(s)
            }
            , s => {
                if (t)
                    try {
                        n(t(s))
                    } catch (a) {
                        i(a)
                    }
                else
                    i(s)
            }
            ]),
            this._executeHandlers()
        }
        ))
    }
    catch(e) {
        return this.then((t => t), e)
    }
    finally(e) {
        return new Pe(( (t, n) => {
            let i, s;
            return this.then((a => {
                s = !1,
                i = a,
                e && e()
            }
            ), (a => {
                s = !0,
                i = a,
                e && e()
            }
            )).then(( () => {
                s ? n(i) : t(i)
            }
            ))
        }
        ))
    }
    __init() {
        this._resolve = e => {
            this._setResult(Ze.RESOLVED, e)
        }
    }
    __init2() {
        this._reject = e => {
            this._setResult(Ze.REJECTED, e)
        }
    }
    __init3() {
        this._setResult = (e, t) => {
            this._state === Ze.PENDING && (kn(t) ? t.then(this._resolve, this._reject) : (this._state = e,
            this._value = t,
            this._executeHandlers()))
        }
    }
    __init4() {
        this._executeHandlers = () => {
            if (this._state === Ze.PENDING)
                return;
            const e = this._handlers.slice();
            this._handlers = [],
            e.forEach((t => {
                t[0] || (this._state === Ze.RESOLVED && t[1](this._value),
                this._state === Ze.REJECTED && t[2](this._value),
                t[0] = !0)
            }
            ))
        }
    }
}
function El(r) {
    const e = it()
      , t = {
        sid: xe(),
        init: !0,
        timestamp: e,
        started: e,
        duration: 0,
        status: "ok",
        errors: 0,
        ignoreDuration: !1,
        toJSON: () => (function(n) {
            return Ie({
                sid: `${n.sid}`,
                init: n.init,
                started: new Date(1e3 * n.started).toISOString(),
                timestamp: new Date(1e3 * n.timestamp).toISOString(),
                status: n.status,
                errors: n.errors,
                did: typeof n.did == "number" || typeof n.did == "string" ? `${n.did}` : void 0,
                duration: n.duration,
                abnormal_mechanism: n.abnormal_mechanism,
                attrs: {
                    release: n.release,
                    environment: n.environment,
                    ip_address: n.ipAddress,
                    user_agent: n.userAgent
                }
            })
        }
        )(t)
    };
    return r && Yt(t, r),
    t
}
function Yt(r, e={}) {
    if (e.user && (!r.ipAddress && e.user.ip_address && (r.ipAddress = e.user.ip_address),
    r.did || e.did || (r.did = e.user.id || e.user.email || e.user.username)),
    r.timestamp = e.timestamp || it(),
    e.abnormal_mechanism && (r.abnormal_mechanism = e.abnormal_mechanism),
    e.ignoreDuration && (r.ignoreDuration = e.ignoreDuration),
    e.sid && (r.sid = e.sid.length === 32 ? e.sid : xe()),
    e.init !== void 0 && (r.init = e.init),
    !r.did && e.did && (r.did = `${e.did}`),
    typeof e.started == "number" && (r.started = e.started),
    r.ignoreDuration)
        r.duration = void 0;
    else if (typeof e.duration == "number")
        r.duration = e.duration;
    else {
        const t = r.timestamp - r.started;
        r.duration = t >= 0 ? t : 0
    }
    e.release && (r.release = e.release),
    e.environment && (r.environment = e.environment),
    !r.ipAddress && e.ipAddress && (r.ipAddress = e.ipAddress),
    !r.userAgent && e.userAgent && (r.userAgent = e.userAgent),
    typeof e.errors == "number" && (r.errors = e.errors),
    e.status && (r.status = e.status)
}
function Ms() {
    return xe()
}
function si() {
    return xe().substring(16)
}
function Sn(r, e, t=2) {
    if (!e || typeof e != "object" || t <= 0)
        return e;
    if (r && e && Object.keys(e).length === 0)
        return r;
    const n = {
        ...r
    };
    for (const i in e)
        Object.prototype.hasOwnProperty.call(e, i) && (n[i] = Sn(n[i], e[i], t - 1));
    return n
}
const ai = "_sentrySpan";
function Cs(r, e) {
    e ? Ft(r, ai, e) : delete r[ai]
}
function Ts(r) {
    return r[ai]
}
class Di {
    constructor() {
        this._notifyingListeners = !1,
        this._scopeListeners = [],
        this._eventProcessors = [],
        this._breadcrumbs = [],
        this._attachments = [],
        this._user = {},
        this._tags = {},
        this._extra = {},
        this._contexts = {},
        this._sdkProcessingMetadata = {},
        this._propagationContext = {
            traceId: Ms(),
            spanId: si()
        }
    }
    clone() {
        const e = new Di;
        return e._breadcrumbs = [...this._breadcrumbs],
        e._tags = {
            ...this._tags
        },
        e._extra = {
            ...this._extra
        },
        e._contexts = {
            ...this._contexts
        },
        this._contexts.flags && (e._contexts.flags = {
            values: [...this._contexts.flags.values]
        }),
        e._user = this._user,
        e._level = this._level,
        e._session = this._session,
        e._transactionName = this._transactionName,
        e._fingerprint = this._fingerprint,
        e._eventProcessors = [...this._eventProcessors],
        e._requestSession = this._requestSession,
        e._attachments = [...this._attachments],
        e._sdkProcessingMetadata = {
            ...this._sdkProcessingMetadata
        },
        e._propagationContext = {
            ...this._propagationContext
        },
        e._client = this._client,
        e._lastEventId = this._lastEventId,
        Cs(e, Ts(this)),
        e
    }
    setClient(e) {
        this._client = e
    }
    setLastEventId(e) {
        this._lastEventId = e
    }
    getClient() {
        return this._client
    }
    lastEventId() {
        return this._lastEventId
    }
    addScopeListener(e) {
        this._scopeListeners.push(e)
    }
    addEventProcessor(e) {
        return this._eventProcessors.push(e),
        this
    }
    setUser(e) {
        return this._user = e || {
            email: void 0,
            id: void 0,
            ip_address: void 0,
            username: void 0
        },
        this._session && Yt(this._session, {
            user: e
        }),
        this._notifyScopeListeners(),
        this
    }
    getUser() {
        return this._user
    }
    getRequestSession() {
        return this._requestSession
    }
    setRequestSession(e) {
        return this._requestSession = e,
        this
    }
    setTags(e) {
        return this._tags = {
            ...this._tags,
            ...e
        },
        this._notifyScopeListeners(),
        this
    }
    setTag(e, t) {
        return this._tags = {
            ...this._tags,
            [e]: t
        },
        this._notifyScopeListeners(),
        this
    }
    setExtras(e) {
        return this._extra = {
            ...this._extra,
            ...e
        },
        this._notifyScopeListeners(),
        this
    }
    setExtra(e, t) {
        return this._extra = {
            ...this._extra,
            [e]: t
        },
        this._notifyScopeListeners(),
        this
    }
    setFingerprint(e) {
        return this._fingerprint = e,
        this._notifyScopeListeners(),
        this
    }
    setLevel(e) {
        return this._level = e,
        this._notifyScopeListeners(),
        this
    }
    setTransactionName(e) {
        return this._transactionName = e,
        this._notifyScopeListeners(),
        this
    }
    setContext(e, t) {
        return t === null ? delete this._contexts[e] : this._contexts[e] = t,
        this._notifyScopeListeners(),
        this
    }
    setSession(e) {
        return e ? this._session = e : delete this._session,
        this._notifyScopeListeners(),
        this
    }
    getSession() {
        return this._session
    }
    update(e) {
        if (!e)
            return this;
        const t = typeof e == "function" ? e(this) : e
          , [n,i] = t instanceof gt ? [t.getScopeData(), t.getRequestSession()] : Ht(t) ? [e, e.requestSession] : []
          , {tags: s, extra: a, user: c, contexts: l, level: u, fingerprint: h=[], propagationContext: m} = n || {};
        return this._tags = {
            ...this._tags,
            ...s
        },
        this._extra = {
            ...this._extra,
            ...a
        },
        this._contexts = {
            ...this._contexts,
            ...l
        },
        c && Object.keys(c).length && (this._user = c),
        u && (this._level = u),
        h.length && (this._fingerprint = h),
        m && (this._propagationContext = m),
        i && (this._requestSession = i),
        this
    }
    clear() {
        return this._breadcrumbs = [],
        this._tags = {},
        this._extra = {},
        this._user = {},
        this._contexts = {},
        this._level = void 0,
        this._transactionName = void 0,
        this._fingerprint = void 0,
        this._requestSession = void 0,
        this._session = void 0,
        Cs(this, void 0),
        this._attachments = [],
        this.setPropagationContext({
            traceId: Ms()
        }),
        this._notifyScopeListeners(),
        this
    }
    addBreadcrumb(e, t) {
        const n = typeof t == "number" ? t : 100;
        if (n <= 0)
            return this;
        const i = {
            timestamp: Cr(),
            ...e
        };
        return this._breadcrumbs.push(i),
        this._breadcrumbs.length > n && (this._breadcrumbs = this._breadcrumbs.slice(-n),
        this._client && this._client.recordDroppedEvent("buffer_overflow", "log_item")),
        this._notifyScopeListeners(),
        this
    }
    getLastBreadcrumb() {
        return this._breadcrumbs[this._breadcrumbs.length - 1]
    }
    clearBreadcrumbs() {
        return this._breadcrumbs = [],
        this._notifyScopeListeners(),
        this
    }
    addAttachment(e) {
        return this._attachments.push(e),
        this
    }
    clearAttachments() {
        return this._attachments = [],
        this
    }
    getScopeData() {
        return {
            breadcrumbs: this._breadcrumbs,
            attachments: this._attachments,
            contexts: this._contexts,
            tags: this._tags,
            extra: this._extra,
            user: this._user,
            level: this._level,
            fingerprint: this._fingerprint || [],
            eventProcessors: this._eventProcessors,
            propagationContext: this._propagationContext,
            sdkProcessingMetadata: this._sdkProcessingMetadata,
            transactionName: this._transactionName,
            span: Ts(this)
        }
    }
    setSDKProcessingMetadata(e) {
        return this._sdkProcessingMetadata = Sn(this._sdkProcessingMetadata, e, 2),
        this
    }
    setPropagationContext(e) {
        return this._propagationContext = {
            spanId: si(),
            ...e
        },
        this
    }
    getPropagationContext() {
        return this._propagationContext
    }
    captureException(e, t) {
        const n = t && t.event_id ? t.event_id : xe();
        if (!this._client)
            return W.warn("No client configured on scope - will not capture exception!"),
            n;
        const i = new Error("Sentry syntheticException");
        return this._client.captureException(e, {
            originalException: e,
            syntheticException: i,
            ...t,
            event_id: n
        }, this),
        n
    }
    captureMessage(e, t, n) {
        const i = n && n.event_id ? n.event_id : xe();
        if (!this._client)
            return W.warn("No client configured on scope - will not capture message!"),
            i;
        const s = new Error(e);
        return this._client.captureMessage(e, t, {
            originalException: e,
            syntheticException: s,
            ...n,
            event_id: i
        }, this),
        i
    }
    captureEvent(e, t) {
        const n = t && t.event_id ? t.event_id : xe();
        return this._client ? (this._client.captureEvent(e, {
            ...t,
            event_id: n
        }, this),
        n) : (W.warn("No client configured on scope - will not capture event!"),
        n)
    }
    _notifyScopeListeners() {
        this._notifyingListeners || (this._notifyingListeners = !0,
        this._scopeListeners.forEach((e => {
            e(this)
        }
        )),
        this._notifyingListeners = !1)
    }
}
const gt = Di;
class Ml {
    constructor(e, t) {
        let n, i;
        n = e || new gt,
        i = t || new gt,
        this._stack = [{
            scope: n
        }],
        this._isolationScope = i
    }
    withScope(e) {
        const t = this._pushScope();
        let n;
        try {
            n = e(t)
        } catch (i) {
            throw this._popScope(),
            i
        }
        return kn(n) ? n.then((i => (this._popScope(),
        i)), (i => {
            throw this._popScope(),
            i
        }
        )) : (this._popScope(),
        n)
    }
    getClient() {
        return this.getStackTop().client
    }
    getScope() {
        return this.getStackTop().scope
    }
    getIsolationScope() {
        return this._isolationScope
    }
    getStackTop() {
        return this._stack[this._stack.length - 1]
    }
    _pushScope() {
        const e = this.getScope().clone();
        return this._stack.push({
            client: this.getClient(),
            scope: e
        }),
        e
    }
    _popScope() {
        return !(this._stack.length <= 1) && !!this._stack.pop()
    }
}
function Xt() {
    const r = Ii(_n());
    return r.stack = r.stack || new Ml(sn("defaultCurrentScope", ( () => new gt)),sn("defaultIsolationScope", ( () => new gt)))
}
function Cl(r) {
    return Xt().withScope(r)
}
function Tl(r, e) {
    const t = Xt();
    return t.withScope(( () => (t.getStackTop().scope = r,
    e(r))))
}
function Os(r) {
    return Xt().withScope(( () => r(Xt().getIsolationScope())))
}
function Ri(r) {
    const e = Ii(r);
    return e.acs ? e.acs : {
        withIsolationScope: Os,
        withScope: Cl,
        withSetScope: Tl,
        withSetIsolationScope: (t, n) => Os(n),
        getCurrentScope: () => Xt().getScope(),
        getIsolationScope: () => Xt().getIsolationScope()
    }
}
function Vt() {
    return Ri(_n()).getCurrentScope()
}
function Tr() {
    return Ri(_n()).getIsolationScope()
}
function pe() {
    return Vt().getClient()
}
function Ol(r) {
    const e = r.getPropagationContext()
      , {traceId: t, spanId: n, parentSpanId: i} = e;
    return Ie({
        trace_id: t,
        span_id: n,
        parent_span_id: i
    })
}
function Al(r) {
    const e = r._sentryMetrics;
    if (!e)
        return;
    const t = {};
    for (const [,[n,i]] of e)
        (t[n] || (t[n] = [])).push(Ie(i));
    return t
}
const Pl = /^sentry-/;
function Il(r) {
    const e = (function(n) {
        if (!(!n || !rt(n) && !Array.isArray(n)))
            return Array.isArray(n) ? n.reduce(( (i, s) => {
                const a = As(s);
                return Object.entries(a).forEach(( ([c,l]) => {
                    i[c] = l
                }
                )),
                i
            }
            ), {}) : As(n)
    }
    )(r);
    if (!e)
        return;
    const t = Object.entries(e).reduce(( (n, [i,s]) => (i.match(Pl) && (n[i.slice(7)] = s),
    n)), {});
    return Object.keys(t).length > 0 ? t : void 0
}
function As(r) {
    return r.split(",").map((e => e.split("=").map((t => decodeURIComponent(t.trim()))))).reduce(( (e, [t,n]) => (t && n && (e[t] = n),
    e)), {})
}
let Ps = !1;
function xl(r) {
    const {spanId: e, traceId: t, isRemote: n} = r.spanContext();
    return Ie({
        parent_span_id: n ? e : Fi(r).parent_span_id,
        span_id: n ? si() : e,
        trace_id: t
    })
}
function Is(r) {
    return typeof r == "number" ? xs(r) : Array.isArray(r) ? r[0] + r[1] / 1e9 : r instanceof Date ? xs(r.getTime()) : it()
}
function xs(r) {
    return r > 9999999999 ? r / 1e3 : r
}
function Fi(r) {
    if ((function(e) {
        return typeof e.getSpanJSON == "function"
    }
    )(r))
        return r.getSpanJSON();
    try {
        const {spanId: e, traceId: t} = r.spanContext();
        if ((function(n) {
            const i = n;
            return !!(i.attributes && i.startTime && i.name && i.endTime && i.status)
        }
        )(r)) {
            const {attributes: n, startTime: i, name: s, endTime: a, parentSpanId: c, status: l} = r;
            return Ie({
                span_id: e,
                trace_id: t,
                data: n,
                description: s,
                parent_span_id: c,
                start_timestamp: Is(i),
                timestamp: Is(a) || void 0,
                status: Nl(l),
                op: n["sentry.op"],
                origin: n["sentry.origin"],
                _metrics_summary: Al(r)
            })
        }
        return {
            span_id: e,
            trace_id: t
        }
    } catch {
        return {}
    }
}
function Nl(r) {
    if (r && r.code !== 0)
        return r.code === 1 ? "ok" : r.message || "unknown_error"
}
function Go(r) {
    return r._sentryRootSpan || r
}
function Ll() {
    Ps || (Mr(( () => {
        console.warn("[Sentry] Deprecation warning: Returning null from `beforeSendSpan` will be disallowed from SDK version 9.0.0 onwards. The callback will only support mutating spans. To drop certain spans, configure the respective integrations directly.")
    }
    )),
    Ps = !0)
}
const ji = "production";
function Ko(r, e) {
    const t = e.getOptions()
      , {publicKey: n} = e.getDsn() || {}
      , i = Ie({
        environment: t.environment || ji,
        release: t.release,
        public_key: n,
        trace_id: r
    });
    return e.emit("createDsc", i),
    i
}
function Bl(r) {
    const e = pe();
    if (!e)
        return {};
    const t = Go(r)
      , n = t._frozenDsc;
    if (n)
        return n;
    const i = t.spanContext().traceState
      , s = i && i.get("sentry.dsc")
      , a = s && Il(s);
    if (a)
        return a;
    const c = Ko(r.spanContext().traceId, e)
      , l = Fi(t)
      , u = l.data || {}
      , h = u["sentry.sample_rate"];
    h != null && (c.sample_rate = `${h}`);
    const m = u["sentry.source"]
      , _ = l.description;
    return m !== "url" && _ && (c.transaction = _),
    (function(M) {
        if (typeof __SENTRY_TRACING__ == "boolean" && !__SENTRY_TRACING__)
            return !1;
        const b = pe()
          , v = b && b.getOptions();
        return !!v && (v.enableTracing || "tracesSampleRate"in v || "tracesSampler"in v)
    }
    )() && (c.sampled = String((function(M) {
        const {traceFlags: b} = M.spanContext();
        return b === 1
    }
    )(t))),
    e.emit("createDsc", c, t),
    c
}
const Dl = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;
function cn(r, e=!1) {
    const {host: t, path: n, pass: i, port: s, projectId: a, protocol: c, publicKey: l} = r;
    return `${c}://${l}${e && i ? `:${i}` : ""}@${t}${s ? `:${s}` : ""}/${n && `${n}/`}${a}`
}
function Ns(r) {
    return {
        protocol: r.protocol,
        publicKey: r.publicKey || "",
        pass: r.pass || "",
        host: r.host,
        port: r.port || "",
        path: r.path || "",
        projectId: r.projectId
    }
}
function Rl(r) {
    const e = typeof r == "string" ? (function(t) {
        const n = Dl.exec(t);
        if (!n)
            return void Mr(( () => {
                console.error(`Invalid Sentry Dsn: ${t}`)
            }
            ));
        const [i,s,a="",c="",l="",u=""] = n.slice(1);
        let h = ""
          , m = u;
        const _ = m.split("/");
        if (_.length > 1 && (h = _.slice(0, -1).join("/"),
        m = _.pop()),
        m) {
            const M = m.match(/^\d+/);
            M && (m = M[0])
        }
        return Ns({
            host: c,
            pass: a,
            path: h,
            projectId: m,
            port: l,
            protocol: i,
            publicKey: s
        })
    }
    )(r) : Ns(r);
    if (e && (function(t) {
        if (!Ut)
            return !0;
        const {port: n, projectId: i, protocol: s} = t;
        return !(["protocol", "publicKey", "host", "projectId"].find((a => !t[a] && (W.error(`Invalid Sentry Dsn: ${a} missing`),
        !0))) || (i.match(/^\d+$/) ? (function(a) {
            return a === "http" || a === "https"
        }
        )(s) ? n && isNaN(parseInt(n, 10)) && (W.error(`Invalid Sentry Dsn: Invalid port ${n}`),
        1) : (W.error(`Invalid Sentry Dsn: Invalid protocol ${s}`),
        1) : (W.error(`Invalid Sentry Dsn: Invalid projectId ${i}`),
        1)))
    }
    )(e))
        return e
}
function et(r, e=100, t=1 / 0) {
    try {
        return oi("", r, e, t)
    } catch (n) {
        return {
            ERROR: `**non-serializable** (${n})`
        }
    }
}
function Ho(r, e=3, t=102400) {
    const n = et(r, e);
    return i = n,
    (function(s) {
        return ~-encodeURI(s).split(/%..|./).length
    }
    )(JSON.stringify(i)) > t ? Ho(r, e - 1, t) : n;
    var i
}
function oi(r, e, t=1 / 0, n=1 / 0, i=(function() {
    const s = typeof WeakSet == "function"
      , a = s ? new WeakSet : [];
    return [function(c) {
        if (s)
            return !!a.has(c) || (a.add(c),
            !1);
        for (let l = 0; l < a.length; l++)
            if (a[l] === c)
                return !0;
        return a.push(c),
        !1
    }
    , function(c) {
        if (s)
            a.delete(c);
        else
            for (let l = 0; l < a.length; l++)
                if (a[l] === c) {
                    a.splice(l, 1);
                    break
                }
    }
    ]
}
)()) {
    const [s,a] = i;
    if (e == null || ["boolean", "string"].includes(typeof e) || typeof e == "number" && Number.isFinite(e))
        return e;
    const c = (function(M, b) {
        try {
            if (M === "domain" && b && typeof b == "object" && b._events)
                return "[Domain]";
            if (M === "domainEmitter")
                return "[DomainEmitter]";
            if (typeof global < "u" && b === global)
                return "[Global]";
            if (typeof window < "u" && b === window)
                return "[Window]";
            if (typeof document < "u" && b === document)
                return "[Document]";
            if (Vo(b))
                return "[VueViewModel]";
            if (Ht(v = b) && "nativeEvent"in v && "preventDefault"in v && "stopPropagation"in v)
                return "[SyntheticEvent]";
            if (typeof b == "number" && !Number.isFinite(b))
                return `[${b}]`;
            if (typeof b == "function")
                return `[Function: ${mt(b)}]`;
            if (typeof b == "symbol")
                return `[${String(b)}]`;
            if (typeof b == "bigint")
                return `[BigInt: ${String(b)}]`;
            const E = (function(C) {
                const x = Object.getPrototypeOf(C);
                return x ? x.constructor.name : "null prototype"
            }
            )(b);
            return /^HTML(\w*)Element$/.test(E) ? `[HTMLElement: ${E}]` : `[object ${E}]`
        } catch (E) {
            return `**non-serializable** (${E})`
        }
        var v
    }
    )(r, e);
    if (!c.startsWith("[object "))
        return c;
    if (e.__sentry_skip_normalization__)
        return e;
    const l = typeof e.__sentry_override_normalization_depth__ == "number" ? e.__sentry_override_normalization_depth__ : t;
    if (l === 0)
        return c.replace("object ", "");
    if (s(e))
        return "[Circular ~]";
    const u = e;
    if (u && typeof u.toJSON == "function")
        try {
            return oi("", u.toJSON(), l - 1, n, i)
        } catch {}
    const h = Array.isArray(e) ? [] : {};
    let m = 0;
    const _ = zo(e);
    for (const M in _) {
        if (!Object.prototype.hasOwnProperty.call(_, M))
            continue;
        if (m >= n) {
            h[M] = "[MaxProperties ~]";
            break
        }
        const b = _[M];
        h[M] = oi(M, b, l - 1, n, i),
        m++
    }
    return a(e),
    h
}
function Sr(r, e=[]) {
    return [r, e]
}
function Fl(r, e) {
    const [t,n] = r;
    return [t, [...n, e]]
}
function Ls(r, e) {
    const t = r[1];
    for (const n of t)
        if (e(n, n[0].type))
            return !0;
    return !1
}
function ci(r) {
    return ee.__SENTRY__ && ee.__SENTRY__.encodePolyfill ? ee.__SENTRY__.encodePolyfill(r) : new TextEncoder().encode(r)
}
function jl(r) {
    const [e,t] = r;
    let n = JSON.stringify(e);
    function i(s) {
        typeof n == "string" ? n = typeof s == "string" ? n + s : [ci(n), s] : n.push(typeof s == "string" ? ci(s) : s)
    }
    for (const s of t) {
        const [a,c] = s;
        if (i(`
${JSON.stringify(a)}
`),
        typeof c == "string" || c instanceof Uint8Array)
            i(c);
        else {
            let l;
            try {
                l = JSON.stringify(c)
            } catch {
                l = JSON.stringify(et(c))
            }
            i(l)
        }
    }
    return typeof n == "string" ? n : (function(s) {
        const a = s.reduce(( (u, h) => u + h.length), 0)
          , c = new Uint8Array(a);
        let l = 0;
        for (const u of s)
            c.set(u, l),
            l += u.length;
        return c
    }
    )(n)
}
function $l(r) {
    const e = typeof r.data == "string" ? ci(r.data) : r.data;
    return [Ie({
        type: "attachment",
        length: e.length,
        filename: r.filename,
        content_type: r.contentType,
        attachment_type: r.attachmentType
    }), e]
}
const Ul = {
    session: "session",
    sessions: "session",
    attachment: "attachment",
    transaction: "transaction",
    event: "error",
    client_report: "internal",
    user_report: "default",
    profile: "profile",
    profile_chunk: "profile",
    replay_event: "replay",
    replay_recording: "replay",
    check_in: "monitor",
    feedback: "feedback",
    span: "span",
    statsd: "metric_bucket",
    raw_security: "security"
};
function Bs(r) {
    return Ul[r]
}
function Qo(r) {
    if (!r || !r.sdk)
        return;
    const {name: e, version: t} = r.sdk;
    return {
        name: e,
        version: t
    }
}
function Vl(r, e, t, n) {
    const i = Qo(t)
      , s = r.type && r.type !== "replay_event" ? r.type : "event";
    (function(c, l) {
        l && (c.sdk = c.sdk || {},
        c.sdk.name = c.sdk.name || l.name,
        c.sdk.version = c.sdk.version || l.version,
        c.sdk.integrations = [...c.sdk.integrations || [], ...l.integrations || []],
        c.sdk.packages = [...c.sdk.packages || [], ...l.packages || []])
    }
    )(r, t && t.sdk);
    const a = (function(c, l, u, h) {
        const m = c.sdkProcessingMetadata && c.sdkProcessingMetadata.dynamicSamplingContext;
        return {
            event_id: c.event_id,
            sent_at: new Date().toISOString(),
            ...l && {
                sdk: l
            },
            ...!!u && h && {
                dsn: cn(h)
            },
            ...m && {
                trace: Ie({
                    ...m
                })
            }
        }
    }
    )(r, i, n, e);
    return delete r.sdkProcessingMetadata,
    Sr(a, [[{
        type: s
    }, r]])
}
function li(r, e, t, n=0) {
    return new Pe(( (i, s) => {
        const a = r[n];
        if (e === null || typeof a != "function")
            i(e);
        else {
            const c = a({
                ...e
            }, t);
            ie && a.id && c === null && W.log(`Event processor "${a.id}" dropped event`),
            kn(c) ? c.then((l => li(r, l, t, n + 1).then(i))).then(null, s) : li(r, c, t, n + 1).then(i).then(null, s)
        }
    }
    ))
}
let Dr, Ds, Pn;
function Wl(r, e) {
    const {fingerprint: t, span: n, breadcrumbs: i, sdkProcessingMetadata: s} = e;
    (function(a, c) {
        const {extra: l, tags: u, user: h, contexts: m, level: _, transactionName: M} = c
          , b = Ie(l);
        b && Object.keys(b).length && (a.extra = {
            ...b,
            ...a.extra
        });
        const v = Ie(u);
        v && Object.keys(v).length && (a.tags = {
            ...v,
            ...a.tags
        });
        const E = Ie(h);
        E && Object.keys(E).length && (a.user = {
            ...E,
            ...a.user
        });
        const C = Ie(m);
        C && Object.keys(C).length && (a.contexts = {
            ...C,
            ...a.contexts
        }),
        _ && (a.level = _),
        M && a.type !== "transaction" && (a.transaction = M)
    }
    )(r, e),
    n && (function(a, c) {
        a.contexts = {
            trace: xl(c),
            ...a.contexts
        },
        a.sdkProcessingMetadata = {
            dynamicSamplingContext: Bl(c),
            ...a.sdkProcessingMetadata
        };
        const l = Go(c)
          , u = Fi(l).description;
        u && !a.transaction && a.type === "transaction" && (a.transaction = u)
    }
    )(r, n),
    (function(a, c) {
        a.fingerprint = a.fingerprint ? Array.isArray(a.fingerprint) ? a.fingerprint : [a.fingerprint] : [],
        c && (a.fingerprint = a.fingerprint.concat(c)),
        a.fingerprint && !a.fingerprint.length && delete a.fingerprint
    }
    )(r, t),
    (function(a, c) {
        const l = [...a.breadcrumbs || [], ...c];
        a.breadcrumbs = l.length ? l : void 0
    }
    )(r, i),
    (function(a, c) {
        a.sdkProcessingMetadata = {
            ...a.sdkProcessingMetadata,
            ...c
        }
    }
    )(r, s)
}
function Rs(r, e) {
    const {extra: t, tags: n, user: i, contexts: s, level: a, sdkProcessingMetadata: c, breadcrumbs: l, fingerprint: u, eventProcessors: h, attachments: m, propagationContext: _, transactionName: M, span: b} = e;
    Rr(r, "extra", t),
    Rr(r, "tags", n),
    Rr(r, "user", i),
    Rr(r, "contexts", s),
    r.sdkProcessingMetadata = Sn(r.sdkProcessingMetadata, c, 2),
    a && (r.level = a),
    M && (r.transactionName = M),
    b && (r.span = b),
    l.length && (r.breadcrumbs = [...r.breadcrumbs, ...l]),
    u.length && (r.fingerprint = [...r.fingerprint, ...u]),
    h.length && (r.eventProcessors = [...r.eventProcessors, ...h]),
    m.length && (r.attachments = [...r.attachments, ...m]),
    r.propagationContext = {
        ...r.propagationContext,
        ..._
    }
}
function Rr(r, e, t) {
    r[e] = Sn(r[e], t, 1)
}
function ql(r, e, t, n, i, s) {
    const {normalizeDepth: a=3, normalizeMaxBreadth: c=1e3} = r
      , l = {
        ...e,
        event_id: e.event_id || t.event_id || xe(),
        timestamp: e.timestamp || Cr()
    }
      , u = t.integrations || r.integrations.map((b => b.name));
    (function(b, v) {
        const {environment: E, release: C, dist: x, maxValueLength: N=250} = v;
        b.environment = b.environment || E || ji,
        !b.release && C && (b.release = C),
        !b.dist && x && (b.dist = x),
        b.message && (b.message = Jt(b.message, N));
        const k = b.exception && b.exception.values && b.exception.values[0];
        k && k.value && (k.value = Jt(k.value, N));
        const w = b.request;
        w && w.url && (w.url = Jt(w.url, N))
    }
    )(l, r),
    (function(b, v) {
        v.length > 0 && (b.sdk = b.sdk || {},
        b.sdk.integrations = [...b.sdk.integrations || [], ...v])
    }
    )(l, u),
    i && i.emit("applyFrameMetadata", e),
    e.type === void 0 && (function(b, v) {
        const E = (function(C) {
            const x = ee._sentryDebugIds;
            if (!x)
                return {};
            const N = Object.keys(x);
            return Pn && N.length === Ds || (Ds = N.length,
            Pn = N.reduce(( (k, w) => {
                Dr || (Dr = {});
                const T = Dr[w];
                if (T)
                    k[T[0]] = T[1];
                else {
                    const L = C(w);
                    for (let D = L.length - 1; D >= 0; D--) {
                        const q = L[D]
                          , U = q && q.filename
                          , ae = x[w];
                        if (U && ae) {
                            k[U] = ae,
                            Dr[w] = [U, ae];
                            break
                        }
                    }
                }
                return k
            }
            ), {})),
            Pn
        }
        )(v);
        try {
            b.exception.values.forEach((C => {
                C.stacktrace.frames.forEach((x => {
                    E && x.filename && (x.debug_id = E[x.filename])
                }
                ))
            }
            ))
        } catch {}
    }
    )(l, r.stackParser);
    const h = (function(b, v) {
        if (!v)
            return b;
        const E = b ? b.clone() : new gt;
        return E.update(v),
        E
    }
    )(n, t.captureContext);
    t.mechanism && Qt(l, t.mechanism);
    const m = i ? i.getEventProcessors() : []
      , _ = sn("globalScope", ( () => new gt)).getScopeData();
    s && Rs(_, s.getScopeData()),
    h && Rs(_, h.getScopeData());
    const M = [...t.attachments || [], ..._.attachments];
    return M.length && (t.attachments = M),
    Wl(l, _),
    li([...m, ..._.eventProcessors], l, t).then((b => (b && (function(v) {
        const E = {};
        try {
            v.exception.values.forEach((x => {
                x.stacktrace.frames.forEach((N => {
                    N.debug_id && (N.abs_path ? E[N.abs_path] = N.debug_id : N.filename && (E[N.filename] = N.debug_id),
                    delete N.debug_id)
                }
                ))
            }
            ))
        } catch {}
        if (Object.keys(E).length === 0)
            return;
        v.debug_meta = v.debug_meta || {},
        v.debug_meta.images = v.debug_meta.images || [];
        const C = v.debug_meta.images;
        Object.entries(E).forEach(( ([x,N]) => {
            C.push({
                type: "sourcemap",
                code_file: x,
                debug_id: N
            })
        }
        ))
    }
    )(b),
    typeof a == "number" && a > 0 ? (function(v, E, C) {
        if (!v)
            return null;
        const x = {
            ...v,
            ...v.breadcrumbs && {
                breadcrumbs: v.breadcrumbs.map((N => ({
                    ...N,
                    ...N.data && {
                        data: et(N.data, E, C)
                    }
                })))
            },
            ...v.user && {
                user: et(v.user, E, C)
            },
            ...v.contexts && {
                contexts: et(v.contexts, E, C)
            },
            ...v.extra && {
                extra: et(v.extra, E, C)
            }
        };
        return v.contexts && v.contexts.trace && x.contexts && (x.contexts.trace = v.contexts.trace,
        v.contexts.trace.data && (x.contexts.trace.data = et(v.contexts.trace.data, E, C))),
        v.spans && (x.spans = v.spans.map((N => ({
            ...N,
            ...N.data && {
                data: et(N.data, E, C)
            }
        })))),
        v.contexts && v.contexts.flags && x.contexts && (x.contexts.flags = et(v.contexts.flags, 3, C)),
        x
    }
    )(b, a, c) : b)))
}
function Fs(r, e) {
    return Vt().captureEvent(r, e)
}
function js(r) {
    const e = pe()
      , t = Tr()
      , n = Vt()
      , {release: i, environment: s=ji} = e && e.getOptions() || {}
      , {userAgent: a} = ee.navigator || {}
      , c = El({
        release: i,
        environment: s,
        user: n.getUser() || t.getUser(),
        ...a && {
            userAgent: a
        },
        ...r
    })
      , l = t.getSession();
    return l && l.status === "ok" && Yt(l, {
        status: "exited"
    }),
    Yo(),
    t.setSession(c),
    n.setSession(c),
    c
}
function Yo() {
    const r = Tr()
      , e = Vt()
      , t = e.getSession() || r.getSession();
    t && (function(n, i) {
        let s = {};
        n.status === "ok" && (s = {
            status: "exited"
        }),
        Yt(n, s)
    }
    )(t),
    Xo(),
    r.setSession(),
    e.setSession()
}
function Xo() {
    const r = Tr()
      , e = Vt()
      , t = pe()
      , n = e.getSession() || r.getSession();
    n && t && t.captureSession(n)
}
function $s(r=!1) {
    r ? Yo() : Xo()
}
function zl(r, e, t) {
    return e || `${(function(n) {
        return `${(function(i) {
            const s = i.protocol ? `${i.protocol}:` : ""
              , a = i.port ? `:${i.port}` : "";
            return `${s}//${i.host}${a}${i.path ? `/${i.path}` : ""}/api/`
        }
        )(n)}${n.projectId}/envelope/`
    }
    )(r)}?${(function(n, i) {
        const s = {
            sentry_version: "7"
        };
        return n.publicKey && (s.sentry_key = n.publicKey),
        i && (s.sentry_client = `${i.name}/${i.version}`),
        new URLSearchParams(s).toString()
    }
    )(r, t)}`
}
const Us = [];
function Vs(r, e) {
    for (const t of e)
        t && t.afterAllSetup && t.afterAllSetup(r)
}
function Ws(r, e, t) {
    if (t[e.name])
        ie && W.log(`Integration skipped because it was already installed: ${e.name}`);
    else {
        if (t[e.name] = e,
        Us.indexOf(e.name) === -1 && typeof e.setupOnce == "function" && (e.setupOnce(),
        Us.push(e.name)),
        e.setup && typeof e.setup == "function" && e.setup(r),
        typeof e.preprocessEvent == "function") {
            const n = e.preprocessEvent.bind(e);
            r.on("preprocessEvent", ( (i, s) => n(i, s, r)))
        }
        if (typeof e.processEvent == "function") {
            const n = e.processEvent.bind(e)
              , i = Object.assign(( (s, a) => n(s, a, r)), {
                id: e.name
            });
            r.addEventProcessor(i)
        }
        ie && W.log(`Integration installed: ${e.name}`)
    }
}
class Fe extends Error {
    constructor(e, t="warn") {
        super(e),
        this.message = e,
        this.logLevel = t
    }
}
const qs = "Not capturing exception because it's already been captured.";
class Jl {
    constructor(e) {
        if (this._options = e,
        this._integrations = {},
        this._numProcessing = 0,
        this._outcomes = {},
        this._hooks = {},
        this._eventProcessors = [],
        e.dsn ? this._dsn = Rl(e.dsn) : ie && W.warn("No DSN provided, client will not send events."),
        this._dsn) {
            const n = zl(this._dsn, e.tunnel, e._metadata ? e._metadata.sdk : void 0);
            this._transport = e.transport({
                tunnel: this._options.tunnel,
                recordDroppedEvent: this.recordDroppedEvent.bind(this),
                ...e.transportOptions,
                url: n
            })
        }
        const t = ["enableTracing", "tracesSampleRate", "tracesSampler"].find((n => n in e && e[n] == null));
        t && Mr(( () => {
            console.warn(`[Sentry] Deprecation warning: \`${t}\` is set to undefined, which leads to tracing being enabled. In v9, a value of \`undefined\` will result in tracing being disabled.`)
        }
        ))
    }
    captureException(e, t, n) {
        const i = xe();
        if (Es(e))
            return ie && W.log(qs),
            i;
        const s = {
            event_id: i,
            ...t
        };
        return this._process(this.eventFromException(e, s).then((a => this._captureEvent(a, s, n)))),
        s.event_id
    }
    captureMessage(e, t, n, i) {
        const s = {
            event_id: xe(),
            ...n
        }
          , a = Ni(e) ? e : String(e)
          , c = ri(e) ? this.eventFromMessage(a, t, s) : this.eventFromException(e, s);
        return this._process(c.then((l => this._captureEvent(l, s, i)))),
        s.event_id
    }
    captureEvent(e, t, n) {
        const i = xe();
        if (t && t.originalException && Es(t.originalException))
            return ie && W.log(qs),
            i;
        const s = {
            event_id: i,
            ...t
        }
          , a = (e.sdkProcessingMetadata || {}).capturedSpanScope;
        return this._process(this._captureEvent(e, s, a || n)),
        s.event_id
    }
    captureSession(e) {
        typeof e.release != "string" ? ie && W.warn("Discarded session because of missing or non-string release") : (this.sendSession(e),
        Yt(e, {
            init: !1
        }))
    }
    getDsn() {
        return this._dsn
    }
    getOptions() {
        return this._options
    }
    getSdkMetadata() {
        return this._options._metadata
    }
    getTransport() {
        return this._transport
    }
    flush(e) {
        const t = this._transport;
        return t ? (this.emit("flush"),
        this._isClientDoneProcessing(e).then((n => t.flush(e).then((i => n && i))))) : jt(!0)
    }
    close(e) {
        return this.flush(e).then((t => (this.getOptions().enabled = !1,
        this.emit("close"),
        t)))
    }
    getEventProcessors() {
        return this._eventProcessors
    }
    addEventProcessor(e) {
        this._eventProcessors.push(e)
    }
    init() {
        (this._isEnabled() || this._options.integrations.some(( ({name: e}) => e.startsWith("Spotlight")))) && this._setupIntegrations()
    }
    getIntegrationByName(e) {
        return this._integrations[e]
    }
    addIntegration(e) {
        const t = this._integrations[e.name];
        Ws(this, e, this._integrations),
        t || Vs(this, [e])
    }
    sendEvent(e, t={}) {
        this.emit("beforeSendEvent", e, t);
        let n = Vl(e, this._dsn, this._options._metadata, this._options.tunnel);
        for (const s of t.attachments || [])
            n = Fl(n, $l(s));
        const i = this.sendEnvelope(n);
        i && i.then((s => this.emit("afterSendEvent", e, s)), null)
    }
    sendSession(e) {
        const t = (function(n, i, s, a) {
            const c = Qo(s);
            return Sr({
                sent_at: new Date().toISOString(),
                ...c && {
                    sdk: c
                },
                ...!!a && i && {
                    dsn: cn(i)
                }
            }, ["aggregates"in n ? [{
                type: "sessions"
            }, n] : [{
                type: "session"
            }, n.toJSON()]])
        }
        )(e, this._dsn, this._options._metadata, this._options.tunnel);
        this.sendEnvelope(t)
    }
    recordDroppedEvent(e, t, n) {
        if (this._options.sendClientReports) {
            const i = typeof n == "number" ? n : 1
              , s = `${e}:${t}`;
            ie && W.log(`Recording outcome: "${s}"${i > 1 ? ` (${i} times)` : ""}`),
            this._outcomes[s] = (this._outcomes[s] || 0) + i
        }
    }
    on(e, t) {
        const n = this._hooks[e] = this._hooks[e] || [];
        return n.push(t),
        () => {
            const i = n.indexOf(t);
            i > -1 && n.splice(i, 1)
        }
    }
    emit(e, ...t) {
        const n = this._hooks[e];
        n && n.forEach((i => i(...t)))
    }
    sendEnvelope(e) {
        return this.emit("beforeEnvelope", e),
        this._isEnabled() && this._transport ? this._transport.send(e).then(null, (t => (ie && W.error("Error while sending envelope:", t),
        t))) : (ie && W.error("Transport disabled"),
        jt({}))
    }
    _setupIntegrations() {
        const {integrations: e} = this._options;
        this._integrations = (function(t, n) {
            const i = {};
            return n.forEach((s => {
                s && Ws(t, s, i)
            }
            )),
            i
        }
        )(this, e),
        Vs(this, e)
    }
    _updateSessionFromEvent(e, t) {
        let n = t.level === "fatal"
          , i = !1;
        const s = t.exception && t.exception.values;
        if (s) {
            i = !0;
            for (const c of s) {
                const l = c.mechanism;
                if (l && l.handled === !1) {
                    n = !0;
                    break
                }
            }
        }
        const a = e.status === "ok";
        (a && e.errors === 0 || a && n) && (Yt(e, {
            ...n && {
                status: "crashed"
            },
            errors: e.errors || Number(i || n)
        }),
        this.captureSession(e))
    }
    _isClientDoneProcessing(e) {
        return new Pe((t => {
            let n = 0;
            const i = setInterval(( () => {
                this._numProcessing == 0 ? (clearInterval(i),
                t(!0)) : (n += 1,
                e && n >= e && (clearInterval(i),
                t(!1)))
            }
            ), 1)
        }
        ))
    }
    _isEnabled() {
        return this.getOptions().enabled !== !1 && this._transport !== void 0
    }
    _prepareEvent(e, t, n=Vt(), i=Tr()) {
        const s = this.getOptions()
          , a = Object.keys(this._integrations);
        return !t.integrations && a.length > 0 && (t.integrations = a),
        this.emit("preprocessEvent", e, t),
        e.type || i.setLastEventId(e.event_id || t.event_id),
        ql(s, e, t, n, this, i).then((c => {
            if (c === null)
                return c;
            c.contexts = {
                trace: Ol(n),
                ...c.contexts
            };
            const l = (function(u, h) {
                const m = h.getPropagationContext();
                return m.dsc || Ko(m.traceId, u)
            }
            )(this, n);
            return c.sdkProcessingMetadata = {
                dynamicSamplingContext: l,
                ...c.sdkProcessingMetadata
            },
            c
        }
        ))
    }
    _captureEvent(e, t={}, n) {
        return this._processEvent(e, t, n).then((i => i.event_id), (i => {
            ie && (i instanceof Fe && i.logLevel === "log" ? W.log(i.message) : W.warn(i))
        }
        ))
    }
    _processEvent(e, t, n) {
        const i = this.getOptions()
          , {sampleRate: s} = i
          , a = Js(e)
          , c = zs(e)
          , l = e.type || "error"
          , u = `before send for type \`${l}\``
          , h = s === void 0 ? void 0 : (function(M) {
            if (typeof M == "boolean")
                return Number(M);
            const b = typeof M == "string" ? parseFloat(M) : M;
            if (!(typeof b != "number" || isNaN(b) || b < 0 || b > 1))
                return b;
            ie && W.warn(`[Tracing] Given sample rate is invalid. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(M)} of type ${JSON.stringify(typeof M)}.`)
        }
        )(s);
        if (c && typeof h == "number" && Math.random() > h)
            return this.recordDroppedEvent("sample_rate", "error", e),
            on(new Fe(`Discarding event because it's not included in the random sample (sampling rate = ${s})`,"log"));
        const m = l === "replay_event" ? "replay" : l
          , _ = (e.sdkProcessingMetadata || {}).capturedSpanIsolationScope;
        return this._prepareEvent(e, t, n, _).then((M => {
            if (M === null)
                throw this.recordDroppedEvent("event_processor", m, e),
                new Fe("An event processor returned `null`, will not send event.","log");
            if (t.data && t.data.__sentry__ === !0)
                return M;
            const b = (function(v, E, C, x) {
                const {beforeSend: N, beforeSendTransaction: k, beforeSendSpan: w} = E;
                if (zs(C) && N)
                    return N(C, x);
                if (Js(C)) {
                    if (C.spans && w) {
                        const T = [];
                        for (const L of C.spans) {
                            const D = w(L);
                            D ? T.push(D) : (Ll(),
                            v.recordDroppedEvent("before_send", "span"))
                        }
                        C.spans = T
                    }
                    if (k) {
                        if (C.spans) {
                            const T = C.spans.length;
                            C.sdkProcessingMetadata = {
                                ...C.sdkProcessingMetadata,
                                spanCountBeforeProcessing: T
                            }
                        }
                        return k(C, x)
                    }
                }
                return C
            }
            )(this, i, M, t);
            return (function(v, E) {
                const C = `${E} must return \`null\` or a valid event.`;
                if (kn(v))
                    return v.then((x => {
                        if (!Ht(x) && x !== null)
                            throw new Fe(C);
                        return x
                    }
                    ), (x => {
                        throw new Fe(`${E} rejected with ${x}`)
                    }
                    ));
                if (!Ht(v) && v !== null)
                    throw new Fe(C);
                return v
            }
            )(b, u)
        }
        )).then((M => {
            if (M === null) {
                if (this.recordDroppedEvent("before_send", m, e),
                a) {
                    const E = 1 + (e.spans || []).length;
                    this.recordDroppedEvent("before_send", "span", E)
                }
                throw new Fe(`${u} returned \`null\`, will not send event.`,"log")
            }
            const b = n && n.getSession();
            if (!a && b && this._updateSessionFromEvent(b, M),
            a) {
                const E = (M.sdkProcessingMetadata && M.sdkProcessingMetadata.spanCountBeforeProcessing || 0) - (M.spans ? M.spans.length : 0);
                E > 0 && this.recordDroppedEvent("before_send", "span", E)
            }
            const v = M.transaction_info;
            if (a && v && M.transaction !== e.transaction) {
                const E = "custom";
                M.transaction_info = {
                    ...v,
                    source: E
                }
            }
            return this.sendEvent(M, t),
            M
        }
        )).then(null, (M => {
            throw M instanceof Fe ? M : (this.captureException(M, {
                data: {
                    __sentry__: !0
                },
                originalException: M
            }),
            new Fe(`Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.
Reason: ${M}`))
        }
        ))
    }
    _process(e) {
        this._numProcessing++,
        e.then((t => (this._numProcessing--,
        t)), (t => (this._numProcessing--,
        t)))
    }
    _clearOutcomes() {
        const e = this._outcomes;
        return this._outcomes = {},
        Object.entries(e).map(( ([t,n]) => {
            const [i,s] = t.split(":");
            return {
                reason: i,
                category: s,
                quantity: n
            }
        }
        ))
    }
    _flushOutcomes() {
        ie && W.log("Flushing outcomes...");
        const e = this._clearOutcomes();
        if (e.length === 0)
            return void (ie && W.log("No outcomes to send"));
        if (!this._dsn)
            return void (ie && W.log("No dsn provided, will not send outcomes"));
        ie && W.log("Sending outcomes:", e);
        const t = (n = e,
        Sr((i = this._options.tunnel && cn(this._dsn)) ? {
            dsn: i
        } : {}, [[{
            type: "client_report"
        }, {
            timestamp: s || Cr(),
            discarded_events: n
        }]]));
        var n, i, s;
        this.sendEnvelope(t)
    }
}
function zs(r) {
    return r.type === void 0
}
function Js(r) {
    return r.type === "transaction"
}
function Gl(r) {
    const e = [];
    function t(n) {
        return e.splice(e.indexOf(n), 1)[0] || Promise.resolve(void 0)
    }
    return {
        $: e,
        add: function(n) {
            if (!(r === void 0 || e.length < r))
                return on(new Fe("Not adding Promise because buffer limit was reached."));
            const i = n();
            return e.indexOf(i) === -1 && e.push(i),
            i.then(( () => t(i))).then(null, ( () => t(i).then(null, ( () => {}
            )))),
            i
        },
        drain: function(n) {
            return new Pe(( (i, s) => {
                let a = e.length;
                if (!a)
                    return i(!0);
                const c = setTimeout(( () => {
                    n && n > 0 && i(!1)
                }
                ), n);
                e.forEach((l => {
                    jt(l).then(( () => {
                        --a || (clearTimeout(c),
                        i(!0))
                    }
                    ), s)
                }
                ))
            }
            ))
        }
    }
}
function Kl(r, {statusCode: e, headers: t}, n=Date.now()) {
    const i = {
        ...r
    }
      , s = t && t["x-sentry-rate-limits"]
      , a = t && t["retry-after"];
    if (s)
        for (const c of s.trim().split(",")) {
            const [l,u,,,h] = c.split(":", 5)
              , m = parseInt(l, 10)
              , _ = 1e3 * (isNaN(m) ? 60 : m);
            if (u)
                for (const M of u.split(";"))
                    M === "metric_bucket" && h && !h.split(";").includes("custom") || (i[M] = n + _);
            else
                i.all = n + _
        }
    else
        a ? i.all = n + (function(c, l=Date.now()) {
            const u = parseInt(`${c}`, 10);
            if (!isNaN(u))
                return 1e3 * u;
            const h = Date.parse(`${c}`);
            return isNaN(h) ? 6e4 : h - l
        }
        )(a, n) : e === 429 && (i.all = n + 6e4);
    return i
}
function Hl(r, e, t=Gl(r.bufferSize || 64)) {
    let n = {};
    return {
        send: function(i) {
            const s = [];
            if (Ls(i, ( (l, u) => {
                const h = Bs(u);
                if ((function(m, _, M=Date.now()) {
                    return (function(b, v) {
                        return b[v] || b.all || 0
                    }
                    )(m, _) > M
                }
                )(n, h)) {
                    const m = Gs(l, u);
                    r.recordDroppedEvent("ratelimit_backoff", h, m)
                } else
                    s.push(l)
            }
            )),
            s.length === 0)
                return jt({});
            const a = Sr(i[0], s)
              , c = l => {
                Ls(a, ( (u, h) => {
                    const m = Gs(u, h);
                    r.recordDroppedEvent(l, Bs(h), m)
                }
                ))
            }
            ;
            return t.add(( () => e({
                body: jl(a)
            }).then((l => (l.statusCode !== void 0 && (l.statusCode < 200 || l.statusCode >= 300) && ie && W.warn(`Sentry responded with status code ${l.statusCode} to sent event.`),
            n = Kl(n, l),
            l)), (l => {
                throw c("network_error"),
                l
            }
            )))).then((l => l), (l => {
                if (l instanceof Fe)
                    return ie && W.error("Skipped sending event because buffer is full."),
                    c("queue_overflow"),
                    jt({});
                throw l
            }
            ))
        },
        flush: i => t.drain(i)
    }
}
function Gs(r, e) {
    if (e === "event" || e === "transaction")
        return Array.isArray(r) ? r[1] : void 0
}
const Ql = 100;
function Ct(r, e) {
    const t = pe()
      , n = Tr();
    if (!t)
        return;
    const {beforeBreadcrumb: i=null, maxBreadcrumbs: s=Ql} = t.getOptions();
    if (s <= 0)
        return;
    const a = {
        timestamp: Cr(),
        ...r
    }
      , c = i ? Mr(( () => i(a, e))) : a;
    c !== null && (t.emit && t.emit("beforeAddBreadcrumb", c, e),
    n.addBreadcrumb(c, s))
}
let Ks;
const Hs = new WeakMap
  , Yl = () => ({
    name: "FunctionToString",
    setupOnce() {
        Ks = Function.prototype.toString;
        try {
            Function.prototype.toString = function(...r) {
                const e = Bi(this)
                  , t = Hs.has(pe()) && e !== void 0 ? e : this;
                return Ks.apply(t, r)
            }
        } catch {}
    },
    setup(r) {
        Hs.set(r, !0)
    }
})
  , Xl = [/^Script error\.?$/, /^Javascript error: Script error\.? on line 0$/, /^ResizeObserver loop completed with undelivered notifications.$/, /^Cannot redefine property: googletag$/, "undefined is not an object (evaluating 'a.L')", `can't redefine non-configurable property "solana"`, "vv().getRestrictions is not a function. (In 'vv().getRestrictions(1,a)', 'vv().getRestrictions' is undefined)", "Can't find variable: _AutofillCallbackHandler", /^Non-Error promise rejection captured with value: Object Not Found Matching Id:\d+, MethodName:simulateEvent, ParamCount:\d+$/]
  , Zl = (r={}) => ({
    name: "InboundFilters",
    processEvent(e, t, n) {
        const i = n.getOptions()
          , s = (function(a={}, c={}) {
            return {
                allowUrls: [...a.allowUrls || [], ...c.allowUrls || []],
                denyUrls: [...a.denyUrls || [], ...c.denyUrls || []],
                ignoreErrors: [...a.ignoreErrors || [], ...c.ignoreErrors || [], ...a.disableErrorDefaults ? [] : Xl],
                ignoreTransactions: [...a.ignoreTransactions || [], ...c.ignoreTransactions || []],
                ignoreInternal: a.ignoreInternal === void 0 || a.ignoreInternal
            }
        }
        )(r, i);
        return (function(a, c) {
            return c.ignoreInternal && (function(l) {
                try {
                    return l.exception.values[0].type === "SentryError"
                } catch {}
                return !1
            }
            )(a) ? (ie && W.warn(`Event dropped due to being internal Sentry Error.
Event: ${dt(a)}`),
            !0) : (function(l, u) {
                return l.type || !u || !u.length ? !1 : (function(h) {
                    const m = [];
                    h.message && m.push(h.message);
                    let _;
                    try {
                        _ = h.exception.values[h.exception.values.length - 1]
                    } catch {}
                    return _ && _.value && (m.push(_.value),
                    _.type && m.push(`${_.type}: ${_.value}`)),
                    m
                }
                )(l).some((h => Br(h, u)))
            }
            )(a, c.ignoreErrors) ? (ie && W.warn(`Event dropped due to being matched by \`ignoreErrors\` option.
Event: ${dt(a)}`),
            !0) : (function(l) {
                return l.type || !l.exception || !l.exception.values || l.exception.values.length === 0 ? !1 : !l.message && !l.exception.values.some((u => u.stacktrace || u.type && u.type !== "Error" || u.value))
            }
            )(a) ? (ie && W.warn(`Event dropped due to not having an error message, error type or stacktrace.
Event: ${dt(a)}`),
            !0) : (function(l, u) {
                if (l.type !== "transaction" || !u || !u.length)
                    return !1;
                const h = l.transaction;
                return !!h && Br(h, u)
            }
            )(a, c.ignoreTransactions) ? (ie && W.warn(`Event dropped due to being matched by \`ignoreTransactions\` option.
Event: ${dt(a)}`),
            !0) : (function(l, u) {
                if (!u || !u.length)
                    return !1;
                const h = Fr(l);
                return !!h && Br(h, u)
            }
            )(a, c.denyUrls) ? (ie && W.warn(`Event dropped due to being matched by \`denyUrls\` option.
Event: ${dt(a)}.
Url: ${Fr(a)}`),
            !0) : (function(l, u) {
                if (!u || !u.length)
                    return !0;
                const h = Fr(l);
                return !h || Br(h, u)
            }
            )(a, c.allowUrls) ? !1 : (ie && W.warn(`Event dropped due to not being matched by \`allowUrls\` option.
Event: ${dt(a)}.
Url: ${Fr(a)}`),
            !0)
        }
        )(e, s) ? null : e
    }
});
function Fr(r) {
    try {
        let e;
        try {
            e = r.exception.values[0].stacktrace.frames
        } catch {}
        return e ? (function(t=[]) {
            for (let n = t.length - 1; n >= 0; n--) {
                const i = t[n];
                if (i && i.filename !== "<anonymous>" && i.filename !== "[native code]")
                    return i.filename || null
            }
            return null
        }
        )(e) : null
    } catch {
        return ie && W.error(`Cannot extract url for event ${dt(r)}`),
        null
    }
}
function eu(r, e, t=250, n, i, s, a) {
    if (!(s.exception && s.exception.values && a && Rt(a.originalException, Error)))
        return;
    const c = s.exception.values.length > 0 ? s.exception.values[s.exception.values.length - 1] : void 0;
    var l, u;
    c && (s.exception.values = (l = ui(r, e, i, a.originalException, n, s.exception.values, c, 0),
    u = t,
    l.map((h => (h.value && (h.value = Jt(h.value, u)),
    h)))))
}
function ui(r, e, t, n, i, s, a, c) {
    if (s.length >= t + 1)
        return s;
    let l = [...s];
    if (Rt(n[i], Error)) {
        Qs(a, c);
        const u = r(e, n[i])
          , h = l.length;
        Ys(u, i, h, c),
        l = ui(r, e, t, n[i], i, [u, ...l], u, h)
    }
    return Array.isArray(n.errors) && n.errors.forEach(( (u, h) => {
        if (Rt(u, Error)) {
            Qs(a, c);
            const m = r(e, u)
              , _ = l.length;
            Ys(m, `errors[${h}]`, _, c),
            l = ui(r, e, t, u, i, [m, ...l], m, _)
        }
    }
    )),
    l
}
function Qs(r, e) {
    r.mechanism = r.mechanism || {
        type: "generic",
        handled: !0
    },
    r.mechanism = {
        ...r.mechanism,
        ...r.type === "AggregateError" && {
            is_exception_group: !0
        },
        exception_id: e
    }
}
function Ys(r, e, t, n) {
    r.mechanism = r.mechanism || {
        type: "generic",
        handled: !0
    },
    r.mechanism = {
        ...r.mechanism,
        type: "chained",
        source: e,
        exception_id: t,
        parent_id: n
    }
}
function In(r) {
    if (!r)
        return {};
    const e = r.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
    if (!e)
        return {};
    const t = e[6] || ""
      , n = e[8] || "";
    return {
        host: e[4],
        path: e[5],
        protocol: e[2],
        search: t,
        hash: n,
        relative: e[5] + t + n
    }
}
function tu() {
    "console"in ee && ti.forEach((function(r) {
        r in ee.console && Me(ee.console, r, (function(e) {
            return an[r] = e,
            function(...t) {
                Ue("console", {
                    args: t,
                    level: r
                });
                const n = an[r];
                n && n.apply(ee.console, t)
            }
        }
        ))
    }
    ))
}
function ru(r) {
    return r === "warn" ? "warning" : ["fatal", "error", "warning", "log", "info", "debug"].includes(r) ? r : "log"
}
const nu = () => {
    let r;
    return {
        name: "Dedupe",
        processEvent(e) {
            if (e.type)
                return e;
            try {
                if ((function(t, n) {
                    return n ? !!((function(i, s) {
                        const a = i.message
                          , c = s.message;
                        return !(!a && !c || a && !c || !a && c || a !== c || !Zs(i, s) || !Xs(i, s))
                    }
                    )(t, n) || (function(i, s) {
                        const a = ea(s)
                          , c = ea(i);
                        return !(!a || !c || a.type !== c.type || a.value !== c.value || !Zs(i, s) || !Xs(i, s))
                    }
                    )(t, n)) : !1
                }
                )(e, r))
                    return ie && W.warn("Event dropped due to being a duplicate of previously captured event."),
                    null
            } catch {}
            return r = e
        }
    }
}
;
function Xs(r, e) {
    let t = bs(r)
      , n = bs(e);
    if (!t && !n)
        return !0;
    if (t && !n || !t && n || n.length !== t.length)
        return !1;
    for (let i = 0; i < n.length; i++) {
        const s = n[i]
          , a = t[i];
        if (s.filename !== a.filename || s.lineno !== a.lineno || s.colno !== a.colno || s.function !== a.function)
            return !1
    }
    return !0
}
function Zs(r, e) {
    let t = r.fingerprint
      , n = e.fingerprint;
    if (!t && !n)
        return !0;
    if (t && !n || !t && n)
        return !1;
    try {
        return t.join("") === n.join("")
    } catch {
        return !1
    }
}
function ea(r) {
    return r.exception && r.exception.values && r.exception.values[0]
}
function ta(r) {
    return r === void 0 ? void 0 : r >= 400 && r < 500 ? "warning" : r >= 500 ? "error" : void 0
}
const xn = ee;
function di(r) {
    return r && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(r.toString())
}
function iu() {
    if (typeof EdgeRuntime == "string")
        return !0;
    if (!(function() {
        if (!("fetch"in xn))
            return !1;
        try {
            return new Headers,
            new Request("http://www.example.com"),
            new Response,
            !0
        } catch {
            return !1
        }
    }
    )())
        return !1;
    if (di(xn.fetch))
        return !0;
    let r = !1;
    const e = xn.document;
    if (e && typeof e.createElement == "function")
        try {
            const t = e.createElement("iframe");
            t.hidden = !0,
            e.head.appendChild(t),
            t.contentWindow && t.contentWindow.fetch && (r = di(t.contentWindow.fetch)),
            e.head.removeChild(t)
        } catch (t) {
            Ut && W.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", t)
        }
    return r
}
function su(r, e) {
    const t = "fetch";
    Bt(t, r),
    Dt(t, ( () => (function(n, i=!1) {
        i && !iu() || Me(ee, "fetch", (function(s) {
            return function(...a) {
                const c = new Error
                  , {method: l, url: u} = (function(m) {
                    if (m.length === 0)
                        return {
                            method: "GET",
                            url: ""
                        };
                    if (m.length === 2) {
                        const [M,b] = m;
                        return {
                            url: ra(M),
                            method: fi(b, "method") ? String(b.method).toUpperCase() : "GET"
                        }
                    }
                    const _ = m[0];
                    return {
                        url: ra(_),
                        method: fi(_, "method") ? String(_.method).toUpperCase() : "GET"
                    }
                }
                )(a)
                  , h = {
                    args: a,
                    fetchData: {
                        method: l,
                        url: u
                    },
                    startTimestamp: 1e3 * it(),
                    virtualError: c
                };
                return n || Ue("fetch", {
                    ...h
                }),
                s.apply(ee, a).then((async m => (n ? n(m) : Ue("fetch", {
                    ...h,
                    endTimestamp: 1e3 * it(),
                    response: m
                }),
                m)), (m => {
                    throw Ue("fetch", {
                        ...h,
                        endTimestamp: 1e3 * it(),
                        error: m
                    }),
                    xi(m) && m.stack === void 0 && (m.stack = c.stack,
                    Ft(m, "framesToPop", 1)),
                    m
                }
                ))
            }
        }
        ))
    }
    )(void 0, e)))
}
function fi(r, e) {
    return !!r && typeof r == "object" && !!r[e]
}
function ra(r) {
    return typeof r == "string" ? r : r ? fi(r, "url") ? r.url : r.toString ? r.toString() : "" : ""
}
const jr = ee
  , ue = ee;
let hi = 0;
function na() {
    return hi > 0
}
function Zt(r, e={}) {
    if (!(function(n) {
        return typeof n == "function"
    }
    )(r))
        return r;
    try {
        const n = r.__sentry_wrapped__;
        if (n)
            return typeof n == "function" ? n : r;
        if (Bi(r))
            return r
    } catch {
        return r
    }
    const t = function(...n) {
        try {
            const i = n.map((s => Zt(s, e)));
            return r.apply(this, i)
        } catch (i) {
            throw hi++,
            setTimeout(( () => {
                hi--
            }
            )),
            (function(...s) {
                const a = Ri(_n());
                if (s.length === 2) {
                    const [c,l] = s;
                    return c ? a.withSetScope(c, l) : a.withScope(l)
                }
                a.withScope(s[0])
            }
            )((s => {
                var a;
                s.addEventProcessor((c => (e.mechanism && (ii(c, void 0),
                Qt(c, e.mechanism)),
                c.extra = {
                    ...c.extra,
                    arguments: n
                },
                c))),
                a = i,
                Vt().captureException(a, void 0)
            }
            )),
            i
        }
    };
    try {
        for (const n in r)
            Object.prototype.hasOwnProperty.call(r, n) && (t[n] = r[n])
    } catch {}
    qo(t, r),
    Ft(r, "__sentry_wrapped__", t);
    try {
        Object.getOwnPropertyDescriptor(t, "name").configurable && Object.defineProperty(t, "name", {
            get: () => r.name
        })
    } catch {}
    return t
}
const En = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__;
function $i(r, e) {
    const t = Ui(r, e)
      , n = {
        type: cu(e),
        value: lu(e)
    };
    return t.length && (n.stacktrace = {
        frames: t
    }),
    n.type === void 0 && n.value === "" && (n.value = "Unrecoverable error caught"),
    n
}
function au(r, e, t, n) {
    const i = pe()
      , s = i && i.getOptions().normalizeDepth
      , a = (function(u) {
        for (const h in u)
            if (Object.prototype.hasOwnProperty.call(u, h)) {
                const m = u[h];
                if (m instanceof Error)
                    return m
            }
    }
    )(e)
      , c = {
        __serialized__: Ho(e, s)
    };
    if (a)
        return {
            exception: {
                values: [$i(r, a)]
            },
            extra: c
        };
    const l = {
        exception: {
            values: [{
                type: wn(e) ? e.constructor.name : n ? "UnhandledRejection" : "Error",
                value: uu(e, {
                    isUnhandledRejection: n
                })
            }]
        },
        extra: c
    };
    if (t) {
        const u = Ui(r, t);
        u.length && (l.exception.values[0].stacktrace = {
            frames: u
        })
    }
    return l
}
function Nn(r, e) {
    return {
        exception: {
            values: [$i(r, e)]
        }
    }
}
function Ui(r, e) {
    const t = e.stacktrace || e.stack || ""
      , n = (function(s) {
        return s && ou.test(s.message) ? 1 : 0
    }
    )(e)
      , i = (function(s) {
        return typeof s.framesToPop == "number" ? s.framesToPop : 0
    }
    )(e);
    try {
        return r(t, n, i)
    } catch {}
    return []
}
const ou = /Minified React error #\d+;/i;
function Zo(r) {
    return typeof WebAssembly < "u" && WebAssembly.Exception !== void 0 && r instanceof WebAssembly.Exception
}
function cu(r) {
    const e = r && r.name;
    return !e && Zo(r) ? r.message && Array.isArray(r.message) && r.message.length == 2 ? r.message[0] : "WebAssembly.Exception" : e
}
function lu(r) {
    const e = r && r.message;
    return e ? e.error && typeof e.error.message == "string" ? e.error.message : Zo(r) && Array.isArray(r.message) && r.message.length == 2 ? r.message[1] : e : "No error message"
}
function pi(r, e, t, n, i) {
    let s;
    if (Uo(e) && e.error)
        return Nn(r, e.error);
    if (_s(e) || nr(e, "DOMException")) {
        const a = e;
        if ("stack"in e)
            s = Nn(r, e);
        else {
            const c = a.name || (_s(a) ? "DOMError" : "DOMException")
              , l = a.message ? `${c}: ${a.message}` : c;
            s = mi(r, l, t, n),
            ii(s, l)
        }
        return "code"in a && (s.tags = {
            ...s.tags,
            "DOMException.code": `${a.code}`
        }),
        s
    }
    return xi(e) ? Nn(r, e) : Ht(e) || wn(e) ? (s = au(r, e, t, i),
    Qt(s, {
        synthetic: !0
    }),
    s) : (s = mi(r, e, t, n),
    ii(s, `${e}`),
    Qt(s, {
        synthetic: !0
    }),
    s)
}
function mi(r, e, t, n) {
    const i = {};
    if (n && t) {
        const s = Ui(r, t);
        s.length && (i.exception = {
            values: [{
                value: e,
                stacktrace: {
                    frames: s
                }
            }]
        }),
        Qt(i, {
            synthetic: !0
        })
    }
    if (Ni(e)) {
        const {__sentry_template_string__: s, __sentry_template_values__: a} = e;
        return i.logentry = {
            message: s,
            params: a
        },
        i
    }
    return i.message = e,
    i
}
function uu(r, {isUnhandledRejection: e}) {
    const t = (function(i, s=40) {
        const a = Object.keys(zo(i));
        a.sort();
        const c = a[0];
        if (!c)
            return "[object has no keys]";
        if (c.length >= s)
            return Jt(c, s);
        for (let l = a.length; l > 0; l--) {
            const u = a.slice(0, l).join(", ");
            if (!(u.length > s))
                return l === a.length ? u : Jt(u, s)
        }
        return ""
    }
    )(r)
      , n = e ? "promise rejection" : "exception";
    return Uo(r) ? `Event \`ErrorEvent\` captured as ${n} with message \`${r.message}\`` : wn(r) ? `Event \`${(function(i) {
        try {
            const s = Object.getPrototypeOf(i);
            return s ? s.constructor.name : void 0
        } catch {}
    }
    )(r)}\` (type=${r.type}) captured as ${n}` : `Object captured as ${n} with keys: ${t}`
}
class du extends Jl {
    constructor(e) {
        const t = {
            parentSpanIsAlwaysRootSpan: !0,
            ...e
        };
        (function(n, i, s=[i], a="npm") {
            const c = n._metadata || {};
            c.sdk || (c.sdk = {
                name: `sentry.javascript.${i}`,
                packages: s.map((l => ({
                    name: `${a}:@sentry/${l}`,
                    version: Lt
                }))),
                version: Lt
            }),
            n._metadata = c
        }
        )(t, "browser", ["browser"], ue.SENTRY_SDK_SOURCE || "npm"),
        super(t),
        t.sendClientReports && ue.document && ue.document.addEventListener("visibilitychange", ( () => {
            ue.document.visibilityState === "hidden" && this._flushOutcomes()
        }
        ))
    }
    eventFromException(e, t) {
        return (function(n, i, s, a) {
            const c = pi(n, i, s && s.syntheticException || void 0, a);
            return Qt(c),
            c.level = "error",
            s && s.event_id && (c.event_id = s.event_id),
            jt(c)
        }
        )(this._options.stackParser, e, t, this._options.attachStacktrace)
    }
    eventFromMessage(e, t="info", n) {
        return (function(i, s, a="info", c, l) {
            const u = mi(i, s, c && c.syntheticException || void 0, l);
            return u.level = a,
            c && c.event_id && (u.event_id = c.event_id),
            jt(u)
        }
        )(this._options.stackParser, e, t, n, this._options.attachStacktrace)
    }
    captureUserFeedback(e) {
        if (!this._isEnabled())
            return void (En && W.warn("SDK not enabled, will not capture user feedback."));
        const t = (function(n, {metadata: i, tunnel: s, dsn: a}) {
            const c = {
                event_id: n.event_id,
                sent_at: new Date().toISOString(),
                ...i && i.sdk && {
                    sdk: {
                        name: i.sdk.name,
                        version: i.sdk.version
                    }
                },
                ...!!s && !!a && {
                    dsn: cn(a)
                }
            };
            return Sr(c, [(function(u) {
                return [{
                    type: "user_report"
                }, u]
            }
            )(n)])
        }
        )(e, {
            metadata: this.getSdkMetadata(),
            dsn: this.getDsn(),
            tunnel: this.getOptions().tunnel
        });
        this.sendEnvelope(t)
    }
    _prepareEvent(e, t, n) {
        return e.platform = e.platform || "javascript",
        super._prepareEvent(e, t, n)
    }
}
const fu = typeof __SENTRY_DEBUG__ > "u" || __SENTRY_DEBUG__
  , _e = ee;
let ia, Ln, Bn, $r;
function hu() {
    if (!_e.document)
        return;
    const r = Ue.bind(null, "dom")
      , e = sa(r, !0);
    _e.document.addEventListener("click", e, !1),
    _e.document.addEventListener("keypress", e, !1),
    ["EventTarget", "Node"].forEach((t => {
        const n = _e[t]
          , i = n && n.prototype;
        i && i.hasOwnProperty && i.hasOwnProperty("addEventListener") && (Me(i, "addEventListener", (function(s) {
            return function(a, c, l) {
                if (a === "click" || a == "keypress")
                    try {
                        const u = this.__sentry_instrumentation_handlers__ = this.__sentry_instrumentation_handlers__ || {}
                          , h = u[a] = u[a] || {
                            refCount: 0
                        };
                        if (!h.handler) {
                            const m = sa(r);
                            h.handler = m,
                            s.call(this, a, m, l)
                        }
                        h.refCount++
                    } catch {}
                return s.call(this, a, c, l)
            }
        }
        )),
        Me(i, "removeEventListener", (function(s) {
            return function(a, c, l) {
                if (a === "click" || a == "keypress")
                    try {
                        const u = this.__sentry_instrumentation_handlers__ || {}
                          , h = u[a];
                        h && (h.refCount--,
                        h.refCount <= 0 && (s.call(this, a, h.handler, l),
                        h.handler = void 0,
                        delete u[a]),
                        Object.keys(u).length === 0 && delete this.__sentry_instrumentation_handlers__)
                    } catch {}
                return s.call(this, a, c, l)
            }
        }
        )))
    }
    ))
}
function sa(r, e=!1) {
    return t => {
        if (!t || t._sentryCaptured)
            return;
        const n = (function(s) {
            try {
                return s.target
            } catch {
                return null
            }
        }
        )(t);
        if ((function(s, a) {
            return s === "keypress" && (!a || !a.tagName || a.tagName !== "INPUT" && a.tagName !== "TEXTAREA" && !a.isContentEditable)
        }
        )(t.type, n))
            return;
        Ft(t, "_sentryCaptured", !0),
        n && !n._sentryId && Ft(n, "_sentryId", xe());
        const i = t.type === "keypress" ? "input" : t.type;
        (function(s) {
            if (s.type !== Ln)
                return !1;
            try {
                if (!s.target || s.target._sentryId !== Bn)
                    return !1
            } catch {}
            return !0
        }
        )(t) || (r({
            event: t,
            name: i,
            global: e
        }),
        Ln = t.type,
        Bn = n ? n._sentryId : void 0),
        clearTimeout(ia),
        ia = _e.setTimeout(( () => {
            Bn = void 0,
            Ln = void 0
        }
        ), 1e3)
    }
}
function ec(r) {
    const e = "history";
    Bt(e, r),
    Dt(e, pu)
}
function pu() {
    if (!(function() {
        const t = jr.chrome
          , n = t && t.app && t.app.runtime
          , i = "history"in jr && !!jr.history.pushState && !!jr.history.replaceState;
        return !n && i
    }
    )())
        return;
    const r = _e.onpopstate;
    function e(t) {
        return function(...n) {
            const i = n.length > 2 ? n[2] : void 0;
            if (i) {
                const s = $r
                  , a = String(i);
                $r = a,
                Ue("history", {
                    from: s,
                    to: a
                })
            }
            return t.apply(this, n)
        }
    }
    _e.onpopstate = function(...t) {
        const n = _e.location.href
          , i = $r;
        if ($r = n,
        Ue("history", {
            from: i,
            to: n
        }),
        r)
            try {
                return r.apply(this, t)
            } catch {}
    }
    ,
    Me(_e.history, "pushState", e),
    Me(_e.history, "replaceState", e)
}
const Xr = {};
function aa(r) {
    Xr[r] = void 0
}
const vr = "__sentry_xhr_v3__";
function mu() {
    if (!_e.XMLHttpRequest)
        return;
    const r = XMLHttpRequest.prototype;
    r.open = new Proxy(r.open,{
        apply(e, t, n) {
            const i = new Error
              , s = 1e3 * it()
              , a = rt(n[0]) ? n[0].toUpperCase() : void 0
              , c = (function(u) {
                if (rt(u))
                    return u;
                try {
                    return u.toString()
                } catch {}
            }
            )(n[1]);
            if (!a || !c)
                return e.apply(t, n);
            t[vr] = {
                method: a,
                url: c,
                request_headers: {}
            },
            a === "POST" && c.match(/sentry_key/) && (t.__sentry_own_request__ = !0);
            const l = () => {
                const u = t[vr];
                if (u && t.readyState === 4) {
                    try {
                        u.status_code = t.status
                    } catch {}
                    Ue("xhr", {
                        endTimestamp: 1e3 * it(),
                        startTimestamp: s,
                        xhr: t,
                        virtualError: i
                    })
                }
            }
            ;
            return "onreadystatechange"in t && typeof t.onreadystatechange == "function" ? t.onreadystatechange = new Proxy(t.onreadystatechange,{
                apply: (u, h, m) => (l(),
                u.apply(h, m))
            }) : t.addEventListener("readystatechange", l),
            t.setRequestHeader = new Proxy(t.setRequestHeader,{
                apply(u, h, m) {
                    const [_,M] = m
                      , b = h[vr];
                    return b && rt(_) && rt(M) && (b.request_headers[_.toLowerCase()] = M),
                    u.apply(h, m)
                }
            }),
            e.apply(t, n)
        }
    }),
    r.send = new Proxy(r.send,{
        apply(e, t, n) {
            const i = t[vr];
            return i ? (n[0] !== void 0 && (i.body = n[0]),
            Ue("xhr", {
                startTimestamp: 1e3 * it(),
                xhr: t
            }),
            e.apply(t, n)) : e.apply(t, n)
        }
    })
}
function gu(r, e=(function(t) {
    const n = Xr[t];
    if (n)
        return n;
    let i = _e[t];
    if (di(i))
        return Xr[t] = i.bind(_e);
    const s = _e.document;
    if (s && typeof s.createElement == "function")
        try {
            const a = s.createElement("iframe");
            a.hidden = !0,
            s.head.appendChild(a);
            const c = a.contentWindow;
            c && c[t] && (i = c[t]),
            s.head.removeChild(a)
        } catch (a) {
            fu && W.warn(`Could not create sandbox iframe for ${t} check, bailing to window.${t}: `, a)
        }
    return i && (Xr[t] = i.bind(_e))
}
)("fetch")) {
    let t = 0
      , n = 0;
    return Hl(r, (function(i) {
        const s = i.body.length;
        t += s,
        n++;
        const a = {
            body: i.body,
            method: "POST",
            referrerPolicy: "origin",
            headers: r.headers,
            keepalive: t <= 6e4 && n < 15,
            ...r.fetchOptions
        };
        if (!e)
            return aa("fetch"),
            on("No fetch implementation available");
        try {
            return e(r.url, a).then((c => (t -= s,
            n--,
            {
                statusCode: c.status,
                headers: {
                    "x-sentry-rate-limits": c.headers.get("X-Sentry-Rate-Limits"),
                    "retry-after": c.headers.get("Retry-After")
                }
            })))
        } catch (c) {
            return aa("fetch"),
            t -= s,
            n--,
            on(c)
        }
    }
    ))
}
function Dn(r, e, t, n) {
    const i = {
        filename: r,
        function: e === "<anonymous>" ? Nt : e,
        in_app: !0
    };
    return t !== void 0 && (i.lineno = t),
    n !== void 0 && (i.colno = n),
    i
}
const vu = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i
  , bu = /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i
  , yu = /\((\S*)(?::(\d+))(?::(\d+))\)/
  , _u = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i
  , wu = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i
  , ku = (function(...r) {
    const e = r.sort(( (t, n) => t[0] - n[0])).map((t => t[1]));
    return (t, n=0, i=0) => {
        const s = []
          , a = t.split(`
`);
        for (let c = n; c < a.length; c++) {
            const l = a[c];
            if (l.length > 1024)
                continue;
            const u = ms.test(l) ? l.replace(ms, "$1") : l;
            if (!u.match(/\S*Error: /)) {
                for (const h of e) {
                    const m = h(u);
                    if (m) {
                        s.push(m);
                        break
                    }
                }
                if (s.length >= 50 + i)
                    break
            }
        }
        return (function(c) {
            if (!c.length)
                return [];
            const l = Array.from(c);
            return /sentryWrapped/.test(Lr(l).function || "") && l.pop(),
            l.reverse(),
            gs.test(Lr(l).function || "") && (l.pop(),
            gs.test(Lr(l).function || "") && l.pop()),
            l.slice(0, 50).map((u => ({
                ...u,
                filename: u.filename || Lr(l).filename,
                function: u.function || Nt
            })))
        }
        )(s.slice(i))
    }
}
)([30, r => {
    const e = vu.exec(r);
    if (e) {
        const [,n,i,s] = e;
        return Dn(n, Nt, +i, +s)
    }
    const t = bu.exec(r);
    if (t) {
        if (t[2] && t[2].indexOf("eval") === 0) {
            const s = yu.exec(t[2]);
            s && (t[2] = s[1],
            t[3] = s[2],
            t[4] = s[3])
        }
        const [n,i] = oa(t[1] || Nt, t[2]);
        return Dn(i, n, t[3] ? +t[3] : void 0, t[4] ? +t[4] : void 0)
    }
}
], [50, r => {
    const e = _u.exec(r);
    if (e) {
        if (e[3] && e[3].indexOf(" > eval") > -1) {
            const i = wu.exec(e[3]);
            i && (e[1] = e[1] || "eval",
            e[3] = i[1],
            e[4] = i[2],
            e[5] = "")
        }
        let t = e[3]
          , n = e[1] || Nt;
        return [n,t] = oa(n, t),
        Dn(t, n, e[4] ? +e[4] : void 0, e[5] ? +e[5] : void 0)
    }
}
])
  , oa = (r, e) => {
    const t = r.indexOf("safari-extension") !== -1
      , n = r.indexOf("safari-web-extension") !== -1;
    return t || n ? [r.indexOf("@") !== -1 ? r.split("@")[0] : Nt, t ? `safari-extension:${e}` : `safari-web-extension:${e}`] : [r, e]
}
  , ca = 1024
  , Su = (r={}) => {
    const e = {
        console: !0,
        dom: !0,
        fetch: !0,
        history: !0,
        sentry: !0,
        xhr: !0,
        ...r
    };
    return {
        name: "Breadcrumbs",
        setup(t) {
            var n;
            e.console && (function(i) {
                const s = "console";
                Bt(s, i),
                Dt(s, tu)
            }
            )((function(i) {
                return function(s) {
                    if (pe() !== i)
                        return;
                    const a = {
                        category: "console",
                        data: {
                            arguments: s.args,
                            logger: "console"
                        },
                        level: ru(s.level),
                        message: ws(s.args, " ")
                    };
                    if (s.level === "assert") {
                        if (s.args[0] !== !1)
                            return;
                        a.message = `Assertion failed: ${ws(s.args.slice(1), " ") || "console.assert"}`,
                        a.data.arguments = s.args.slice(1)
                    }
                    Ct(a, {
                        input: s.args,
                        level: s.level
                    })
                }
            }
            )(t)),
            e.dom && (n = (function(i, s) {
                return function(a) {
                    if (pe() !== i)
                        return;
                    let c, l, u = typeof s == "object" ? s.serializeAttribute : void 0, h = typeof s == "object" && typeof s.maxStringLength == "number" ? s.maxStringLength : void 0;
                    h && h > ca && (En && W.warn(`\`dom.maxStringLength\` cannot exceed 1024, but a value of ${h} was configured. Sentry will use 1024 instead.`),
                    h = ca),
                    typeof u == "string" && (u = [u]);
                    try {
                        const _ = a.event
                          , M = (function(b) {
                            return !!b && !!b.target
                        }
                        )(_) ? _.target : _;
                        c = Wo(M, {
                            keyAttrs: u,
                            maxStringLength: h
                        }),
                        l = (function(b) {
                            if (!Li.HTMLElement)
                                return null;
                            let v = b;
                            for (let E = 0; E < 5; E++) {
                                if (!v)
                                    return null;
                                if (v instanceof HTMLElement) {
                                    if (v.dataset.sentryComponent)
                                        return v.dataset.sentryComponent;
                                    if (v.dataset.sentryElement)
                                        return v.dataset.sentryElement
                                }
                                v = v.parentNode
                            }
                            return null
                        }
                        )(M)
                    } catch {
                        c = "<unknown>"
                    }
                    if (c.length === 0)
                        return;
                    const m = {
                        category: `ui.${a.name}`,
                        message: c
                    };
                    l && (m.data = {
                        "ui.component_name": l
                    }),
                    Ct(m, {
                        event: a.event,
                        name: a.name,
                        global: a.global
                    })
                }
            }
            )(t, e.dom),
            Bt("dom", n),
            Dt("dom", hu)),
            e.xhr && (function(i) {
                Bt("xhr", i),
                Dt("xhr", mu)
            }
            )((function(i) {
                return function(s) {
                    if (pe() !== i)
                        return;
                    const {startTimestamp: a, endTimestamp: c} = s
                      , l = s.xhr[vr];
                    if (!a || !c || !l)
                        return;
                    const {method: u, url: h, status_code: m, body: _} = l
                      , M = {
                        method: u,
                        url: h,
                        status_code: m
                    }
                      , b = {
                        xhr: s.xhr,
                        input: _,
                        startTimestamp: a,
                        endTimestamp: c
                    };
                    Ct({
                        category: "xhr",
                        data: M,
                        type: "http",
                        level: ta(m)
                    }, b)
                }
            }
            )(t)),
            e.fetch && su((function(i) {
                return function(s) {
                    if (pe() !== i)
                        return;
                    const {startTimestamp: a, endTimestamp: c} = s;
                    if (c && (!s.fetchData.url.match(/sentry_key/) || s.fetchData.method !== "POST"))
                        if (s.error)
                            Ct({
                                category: "fetch",
                                data: s.fetchData,
                                level: "error",
                                type: "http"
                            }, {
                                data: s.error,
                                input: s.args,
                                startTimestamp: a,
                                endTimestamp: c
                            });
                        else {
                            const l = s.response
                              , u = {
                                ...s.fetchData,
                                status_code: l && l.status
                            }
                              , h = {
                                input: s.args,
                                response: l,
                                startTimestamp: a,
                                endTimestamp: c
                            };
                            Ct({
                                category: "fetch",
                                data: u,
                                type: "http",
                                level: ta(u.status_code)
                            }, h)
                        }
                }
            }
            )(t)),
            e.history && ec((function(i) {
                return function(s) {
                    if (pe() !== i)
                        return;
                    let a = s.from
                      , c = s.to;
                    const l = In(ue.location.href);
                    let u = a ? In(a) : void 0;
                    const h = In(c);
                    u && u.path || (u = l),
                    l.protocol === h.protocol && l.host === h.host && (c = h.relative),
                    l.protocol === u.protocol && l.host === u.host && (a = u.relative),
                    Ct({
                        category: "navigation",
                        data: {
                            from: a,
                            to: c
                        }
                    })
                }
            }
            )(t)),
            e.sentry && t.on("beforeSendEvent", (function(i) {
                return function(s) {
                    pe() === i && Ct({
                        category: "sentry." + (s.type === "transaction" ? "transaction" : "event"),
                        event_id: s.event_id,
                        level: s.level,
                        message: dt(s)
                    }, {
                        event: s
                    })
                }
            }
            )(t))
        }
    }
}
  , Eu = ["EventTarget", "Window", "Node", "ApplicationCache", "AudioTrackList", "BroadcastChannel", "ChannelMergerNode", "CryptoOperation", "EventSource", "FileReader", "HTMLUnknownElement", "IDBDatabase", "IDBRequest", "IDBTransaction", "KeyOperation", "MediaController", "MessagePort", "ModalWindow", "Notification", "SVGElementInstance", "Screen", "SharedWorker", "TextTrack", "TextTrackCue", "TextTrackList", "WebSocket", "WebSocketWorker", "Worker", "XMLHttpRequest", "XMLHttpRequestEventTarget", "XMLHttpRequestUpload"]
  , Mu = (r={}) => {
    const e = {
        XMLHttpRequest: !0,
        eventTarget: !0,
        requestAnimationFrame: !0,
        setInterval: !0,
        setTimeout: !0,
        ...r
    };
    return {
        name: "BrowserApiErrors",
        setupOnce() {
            e.setTimeout && Me(ue, "setTimeout", la),
            e.setInterval && Me(ue, "setInterval", la),
            e.requestAnimationFrame && Me(ue, "requestAnimationFrame", Cu),
            e.XMLHttpRequest && "XMLHttpRequest"in ue && Me(XMLHttpRequest.prototype, "send", Tu);
            const t = e.eventTarget;
            t && (Array.isArray(t) ? t : Eu).forEach(Ou)
        }
    }
}
;
function la(r) {
    return function(...e) {
        const t = e[0];
        return e[0] = Zt(t, {
            mechanism: {
                data: {
                    function: mt(r)
                },
                handled: !1,
                type: "instrument"
            }
        }),
        r.apply(this, e)
    }
}
function Cu(r) {
    return function(e) {
        return r.apply(this, [Zt(e, {
            mechanism: {
                data: {
                    function: "requestAnimationFrame",
                    handler: mt(r)
                },
                handled: !1,
                type: "instrument"
            }
        })])
    }
}
function Tu(r) {
    return function(...e) {
        const t = this;
        return ["onload", "onerror", "onprogress", "onreadystatechange"].forEach((n => {
            n in t && typeof t[n] == "function" && Me(t, n, (function(i) {
                const s = {
                    mechanism: {
                        data: {
                            function: n,
                            handler: mt(i)
                        },
                        handled: !1,
                        type: "instrument"
                    }
                }
                  , a = Bi(i);
                return a && (s.mechanism.data.handler = mt(a)),
                Zt(i, s)
            }
            ))
        }
        )),
        r.apply(this, e)
    }
}
function Ou(r) {
    const e = ue[r]
      , t = e && e.prototype;
    t && t.hasOwnProperty && t.hasOwnProperty("addEventListener") && (Me(t, "addEventListener", (function(n) {
        return function(i, s, a) {
            try {
                typeof s.handleEvent == "function" && (s.handleEvent = Zt(s.handleEvent, {
                    mechanism: {
                        data: {
                            function: "handleEvent",
                            handler: mt(s),
                            target: r
                        },
                        handled: !1,
                        type: "instrument"
                    }
                }))
            } catch {}
            return n.apply(this, [i, Zt(s, {
                mechanism: {
                    data: {
                        function: "addEventListener",
                        handler: mt(s),
                        target: r
                    },
                    handled: !1,
                    type: "instrument"
                }
            }), a])
        }
    }
    )),
    Me(t, "removeEventListener", (function(n) {
        return function(i, s, a) {
            try {
                const c = s.__sentry_wrapped__;
                c && n.call(this, i, c, a)
            } catch {}
            return n.call(this, i, s, a)
        }
    }
    )))
}
const Au = () => ({
    name: "BrowserSession",
    setupOnce() {
        ue.document !== void 0 ? (js({
            ignoreDuration: !0
        }),
        $s(),
        ec(( ({from: r, to: e}) => {
            r !== void 0 && r !== e && (js({
                ignoreDuration: !0
            }),
            $s())
        }
        ))) : En && W.warn("Using the `browserSessionIntegration` in non-browser environments is not supported.")
    }
})
  , Pu = (r={}) => {
    const e = {
        onerror: !0,
        onunhandledrejection: !0,
        ...r
    };
    return {
        name: "GlobalHandlers",
        setupOnce() {
            Error.stackTraceLimit = 50
        },
        setup(t) {
            e.onerror && ((function(n) {
                (function(i) {
                    const s = "error";
                    Bt(s, i),
                    Dt(s, _l)
                }
                )((i => {
                    const {stackParser: s, attachStacktrace: a} = da();
                    if (pe() !== n || na())
                        return;
                    const {msg: c, url: l, line: u, column: h, error: m} = i
                      , _ = (function(M, b, v, E) {
                        const C = M.exception = M.exception || {}
                          , x = C.values = C.values || []
                          , N = x[0] = x[0] || {}
                          , k = N.stacktrace = N.stacktrace || {}
                          , w = k.frames = k.frames || []
                          , T = E
                          , L = v
                          , D = rt(b) && b.length > 0 ? b : (function() {
                            try {
                                return Li.document.location.href
                            } catch {
                                return ""
                            }
                        }
                        )();
                        return w.length === 0 && w.push({
                            colno: T,
                            filename: D,
                            function: Nt,
                            in_app: !0,
                            lineno: L
                        }),
                        M
                    }
                    )(pi(s, m || c, void 0, a, !1), l, u, h);
                    _.level = "error",
                    Fs(_, {
                        originalException: m,
                        mechanism: {
                            handled: !1,
                            type: "onerror"
                        }
                    })
                }
                ))
            }
            )(t),
            ua("onerror")),
            e.onunhandledrejection && ((function(n) {
                (function(i) {
                    const s = "unhandledrejection";
                    Bt(s, i),
                    Dt(s, wl)
                }
                )((i => {
                    const {stackParser: s, attachStacktrace: a} = da();
                    if (pe() !== n || na())
                        return;
                    const c = (function(u) {
                        if (ri(u))
                            return u;
                        try {
                            if ("reason"in u)
                                return u.reason;
                            if ("detail"in u && "reason"in u.detail)
                                return u.detail.reason
                        } catch {}
                        return u
                    }
                    )(i)
                      , l = ri(c) ? {
                        exception: {
                            values: [{
                                type: "UnhandledRejection",
                                value: `Non-Error promise rejection captured with value: ${String(c)}`
                            }]
                        }
                    } : pi(s, c, void 0, a, !0);
                    l.level = "error",
                    Fs(l, {
                        originalException: c,
                        mechanism: {
                            handled: !1,
                            type: "onunhandledrejection"
                        }
                    })
                }
                ))
            }
            )(t),
            ua("onunhandledrejection"))
        }
    }
}
;
function ua(r) {
    En && W.log(`Global Handler attached: ${r}`)
}
function da() {
    const r = pe();
    return r && r.getOptions() || {
        stackParser: () => [],
        attachStacktrace: !1
    }
}
const Iu = () => ({
    name: "HttpContext",
    preprocessEvent(r) {
        if (!ue.navigator && !ue.location && !ue.document)
            return;
        const e = r.request && r.request.url || ue.location && ue.location.href
          , {referrer: t} = ue.document || {}
          , {userAgent: n} = ue.navigator || {}
          , i = {
            ...r.request && r.request.headers,
            ...t && {
                Referer: t
            },
            ...n && {
                "User-Agent": n
            }
        }
          , s = {
            ...r.request,
            ...e && {
                url: e
            },
            headers: i
        };
        r.request = s
    }
})
  , xu = (r={}) => {
    const e = r.limit || 5
      , t = r.key || "cause";
    return {
        name: "LinkedErrors",
        preprocessEvent(n, i, s) {
            const a = s.getOptions();
            eu($i, a.stackParser, a.maxValueLength, t, e, n, i)
        }
    }
}
;
var fa = "new"
  , ha = "loading"
  , pa = "loaded"
  , gi = "joining-meeting"
  , xt = "joined-meeting"
  , Tt = "left-meeting"
  , st = "error"
  , Nu = "playable"
  , Rn = "unknown"
  , Lu = "full"
  , Bu = "base"
  , ma = "no-room"
  , Du = "end-of-life"
  , Ru = "connection-error"
  , Fu = "iframe-ready-for-launch-config"
  , ju = "iframe-launch-config"
  , $u = "theme-updated"
  , Uu = "loading"
  , Vu = "load-attempt-failed"
  , ga = "loaded"
  , Wu = "started-camera"
  , qu = "camera-error"
  , zu = "joining-meeting"
  , Ju = "joined-meeting"
  , Gu = "left-meeting"
  , Ku = "participant-joined"
  , Hu = "participant-updated"
  , Qu = "participant-left"
  , Yu = "participant-counts-updated"
  , Xu = "access-state-updated"
  , Zu = "meeting-session-summary-updated"
  , ed = "meeting-session-state-updated"
  , td = "waiting-participant-added"
  , rd = "waiting-participant-updated"
  , nd = "waiting-participant-removed"
  , id = "track-started"
  , sd = "track-stopped"
  , ad = "transcription-started"
  , od = "transcription-stopped"
  , cd = "transcription-error"
  , va = "recording-started"
  , ba = "recording-stopped"
  , ld = "recording-stats"
  , ud = "recording-error"
  , dd = "recording-upload-completed"
  , fd = "recording-data"
  , hd = "app-message"
  , pd = "transcription-message"
  , md = "remote-media-player-started"
  , gd = "remote-media-player-updated"
  , vd = "remote-media-player-stopped"
  , bd = "local-screen-share-started"
  , yd = "local-screen-share-stopped"
  , _d = "local-screen-share-canceled"
  , wd = "active-speaker-change"
  , kd = "active-speaker-mode-change"
  , Sd = "network-quality-change"
  , Ed = "network-connection"
  , Md = "cpu-load-change"
  , Cd = "face-counts-updated"
  , Ur = "fullscreen"
  , Vr = "exited-fullscreen"
  , Td = "live-streaming-started"
  , Od = "live-streaming-updated"
  , Ad = "live-streaming-stopped"
  , Pd = "live-streaming-error"
  , Id = "lang-updated"
  , xd = "receive-settings-updated"
  , ya = "input-settings-updated"
  , _a = "nonfatal-error"
  , wa = "error"
  , Fn = 4096
  , ka = 102400
  , jn = "iframe-call-message"
  , Sa = "local-screen-start"
  , Ea = "daily-method-update-live-streaming-endpoints"
  , Wr = "transmit-log"
  , nt = "daily-custom-track"
  , Zr = {
    NONE: "none",
    BGBLUR: "background-blur",
    BGIMAGE: "background-image",
    FACE_DETECTION: "face-detection"
}
  , tc = {
    NONE: "none",
    NOISE_CANCELLATION: "noise-cancellation"
}
  , vi = {
    PLAY: "play",
    PAUSE: "pause"
}
  , $n = ["jpg", "png", "jpeg"]
  , Nd = "add-endpoints"
  , Ld = "remove-endpoints"
  , Ma = "sip-call-transfer";
function Ne() {
    return !Y() && typeof window < "u" && window.navigator && window.navigator.userAgent ? window.navigator.userAgent : ""
}
function Y() {
    return typeof navigator < "u" && navigator.product && navigator.product === "ReactNative"
}
function rc() {
    return navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia
}
function Bd() {
    return !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && ((function(r, e) {
        if (!r || !e)
            return !0;
        switch (r) {
        case "Chrome":
            return e.major >= 75;
        case "Safari":
            return RTCRtpTransceiver.prototype.hasOwnProperty("currentDirection") && !(e.major === 13 && e.minor === 0 && e.point === 0);
        case "Firefox":
            return e.major >= 67
        }
        return !0
    }
    )($t(), ln()) || Y())
}
function Ca() {
    if (Y() || !document)
        return !1;
    var r = document.createElement("iframe");
    return !!r.requestFullscreen || !!r.webkitRequestFullscreen
}
var bi = "none"
  , Dd = "software"
  , Rd = "hardware"
  , Fd = (function() {
    try {
        var r, e = document.createElement("canvas"), t = !1;
        (r = e.getContext("webgl2", {
            failIfMajorPerformanceCaveat: !0
        })) || (t = !0,
        r = e.getContext("webgl2"));
        var n = r != null;
        return e.remove(),
        n ? t ? Dd : Rd : bi
    } catch {
        return bi
    }
}
)();
function nc() {
    var r = arguments.length > 0 && arguments[0] !== void 0 && arguments[0];
    return !Y() && Fd !== bi && (r ? (function() {
        return Oa() ? !1 : ["Chrome", "Firefox"].includes($t())
    }
    )() : (function() {
        if (Oa())
            return !1;
        var e = $t();
        if (e === "Safari") {
            var t = Wi();
            if (t.major < 15 || t.major === 15 && t.minor < 4)
                return !1
        }
        return e === "Chrome" ? Vi().major >= 77 : e === "Firefox" ? qi().major >= 97 : ["Chrome", "Firefox", "Safari"].includes(e)
    }
    )())
}
function ic() {
    if (Y() || sc() || typeof AudioWorkletNode > "u")
        return !1;
    switch ($t()) {
    case "Chrome":
    case "Firefox":
        return !0;
    case "Safari":
        var r = ln();
        return r.major > 17 || r.major === 17 && r.minor >= 4
    }
    return !1
}
function Ta() {
    return rc() && !(function() {
        var r, e = $t();
        if (!Ne())
            return !0;
        switch (e) {
        case "Chrome":
            return (r = Vi()).major && r.major > 0 && r.major < 75;
        case "Firefox":
            return (r = qi()).major < 91;
        case "Safari":
            return (r = Wi()).major < 13 || r.major === 13 && r.minor < 1;
        default:
            return !0
        }
    }
    )()
}
function sc() {
    return Ne().match(/Linux; Android/)
}
function Oa() {
    var r, e = Ne(), t = e.match(/Mac/) && (!Y() && typeof window < "u" && (r = window) !== null && r !== void 0 && (r = r.navigator) !== null && r !== void 0 && r.maxTouchPoints ? window.navigator.maxTouchPoints : 0) >= 5;
    return !!(e.match(/Mobi/) || e.match(/Android/) || t) || !!Ne().match(/DailyAnd\//) || void 0
}
function $t() {
    if (typeof window < "u") {
        var r = Ne();
        return ac() ? "Safari" : r.indexOf("Edge") > -1 ? "Edge" : r.match(/Chrome\//) ? "Chrome" : r.indexOf("Safari") > -1 || oc() ? "Safari" : r.indexOf("Firefox") > -1 ? "Firefox" : r.indexOf("MSIE") > -1 || r.indexOf(".NET") > -1 ? "IE" : "Unknown Browser"
    }
}
function ln() {
    switch ($t()) {
    case "Chrome":
        return Vi();
    case "Safari":
        return Wi();
    case "Firefox":
        return qi();
    case "Edge":
        return (function() {
            var r = 0
              , e = 0;
            if (typeof window < "u") {
                var t = Ne().match(/Edge\/(\d+).(\d+)/);
                if (t)
                    try {
                        r = parseInt(t[1]),
                        e = parseInt(t[2])
                    } catch {}
            }
            return {
                major: r,
                minor: e
            }
        }
        )()
    }
}
function Vi() {
    var r = 0
      , e = 0
      , t = 0
      , n = 0
      , i = !1;
    if (typeof window < "u") {
        var s = Ne()
          , a = s.match(/Chrome\/(\d+).(\d+).(\d+).(\d+)/);
        if (a)
            try {
                r = parseInt(a[1]),
                e = parseInt(a[2]),
                t = parseInt(a[3]),
                n = parseInt(a[4]),
                i = s.indexOf("OPR/") > -1
            } catch {}
    }
    return {
        major: r,
        minor: e,
        build: t,
        patch: n,
        opera: i
    }
}
function ac() {
    return !!Ne().match(/iPad|iPhone|iPod/i) && rc()
}
function oc() {
    return Ne().indexOf("AppleWebKit/605.1.15") > -1
}
function Wi() {
    var r = 0
      , e = 0
      , t = 0;
    if (typeof window < "u") {
        var n = Ne().match(/Version\/(\d+).(\d+)(.(\d+))?/);
        if (n)
            try {
                r = parseInt(n[1]),
                e = parseInt(n[2]),
                t = parseInt(n[4])
            } catch {}
        else
            (ac() || oc()) && (r = 14,
            e = 0,
            t = 3)
    }
    return {
        major: r,
        minor: e,
        point: t
    }
}
function qi() {
    var r = 0
      , e = 0;
    if (typeof window < "u") {
        var t = Ne().match(/Firefox\/(\d+).(\d+)/);
        if (t)
            try {
                r = parseInt(t[1]),
                e = parseInt(t[2])
            } catch {}
    }
    return {
        major: r,
        minor: e
    }
}
var cc = (function() {
    return Oe((function r() {
        Te(this, r)
    }
    ), [{
        key: "addListenerForMessagesFromCallMachine",
        value: function(r, e, t) {
            hr()
        }
    }, {
        key: "addListenerForMessagesFromDailyJs",
        value: function(r, e, t) {
            hr()
        }
    }, {
        key: "sendMessageToCallMachine",
        value: function(r, e, t, n) {
            hr()
        }
    }, {
        key: "sendMessageToDailyJs",
        value: function(r, e) {
            hr()
        }
    }, {
        key: "removeListener",
        value: function(r) {
            hr()
        }
    }])
}
)();
function Aa(r, e) {
    var t = Object.keys(r);
    if (Object.getOwnPropertySymbols) {
        var n = Object.getOwnPropertySymbols(r);
        e && (n = n.filter((function(i) {
            return Object.getOwnPropertyDescriptor(r, i).enumerable
        }
        ))),
        t.push.apply(t, n)
    }
    return t
}
function Un(r) {
    for (var e = 1; e < arguments.length; e++) {
        var t = arguments[e] != null ? arguments[e] : {};
        e % 2 ? Aa(Object(t), !0).forEach((function(n) {
            Ge(r, n, t[n])
        }
        )) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(t)) : Aa(Object(t)).forEach((function(n) {
            Object.defineProperty(r, n, Object.getOwnPropertyDescriptor(t, n))
        }
        ))
    }
    return r
}
function lc() {
    try {
        var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {}
        )))
    } catch {}
    return (lc = function() {
        return !!r
    }
    )()
}
var jd = (function() {
    function r() {
        var e, t, n, i;
        return Te(this, r),
        t = this,
        n = Ve(n = r),
        (e = vn(t, lc() ? Reflect.construct(n, [], Ve(t).constructor) : n.apply(t, i)))._wrappedListeners = {},
        e._messageCallbacks = {},
        e
    }
    return bn(r, cc),
    Oe(r, [{
        key: "addListenerForMessagesFromCallMachine",
        value: function(e, t, n) {
            var i = this
              , s = function(a) {
                if (a.data && a.data.what === "iframe-call-message" && (!a.data.callClientId || a.data.callClientId === t) && (!a.data.from || a.data.from !== "module")) {
                    var c = Un({}, a.data);
                    if (delete c.from,
                    c.callbackStamp && i._messageCallbacks[c.callbackStamp]) {
                        var l = c.callbackStamp;
                        i._messageCallbacks[l].call(n, c),
                        delete i._messageCallbacks[l]
                    }
                    delete c.what,
                    delete c.callbackStamp,
                    e.call(n, c)
                }
            };
            this._wrappedListeners[e] = s,
            window.addEventListener("message", s)
        }
    }, {
        key: "addListenerForMessagesFromDailyJs",
        value: function(e, t, n) {
            var i = function(s) {
                var a;
                if (!(!s.data || s.data.what !== jn || !s.data.action || s.data.from && s.data.from !== "module" || s.data.callClientId && t && s.data.callClientId !== t || s != null && (a = s.data) !== null && a !== void 0 && a.callFrameId)) {
                    var c = s.data;
                    e.call(n, c)
                }
            };
            this._wrappedListeners[e] = i,
            window.addEventListener("message", i)
        }
    }, {
        key: "sendMessageToCallMachine",
        value: function(e, t, n, i) {
            if (!n)
                throw new Error("undefined callClientId. Are you trying to use a DailyCall instance previously destroyed?");
            var s = Un({}, e);
            if (s.what = jn,
            s.from = "module",
            s.callClientId = n,
            t) {
                var a = yn();
                this._messageCallbacks[a] = t,
                s.callbackStamp = a
            }
            var c = i ? i.contentWindow : window
              , l = this._callMachineTargetOrigin(i);
            l && c.postMessage(s, l)
        }
    }, {
        key: "sendMessageToDailyJs",
        value: function(e, t) {
            e.what = jn,
            e.callClientId = t,
            e.from = "embedded",
            window.postMessage(e, this._targetOriginFromWindowLocation())
        }
    }, {
        key: "removeListener",
        value: function(e) {
            var t = this._wrappedListeners[e];
            t && (window.removeEventListener("message", t),
            delete this._wrappedListeners[e])
        }
    }, {
        key: "forwardPackagedMessageToCallMachine",
        value: function(e, t, n) {
            var i = Un({}, e);
            i.callClientId = n;
            var s = t ? t.contentWindow : window
              , a = this._callMachineTargetOrigin(t);
            a && s.postMessage(i, a)
        }
    }, {
        key: "addListenerForPackagedMessagesFromCallMachine",
        value: function(e, t) {
            var n = function(i) {
                if (i.data && i.data.what === "iframe-call-message" && (!i.data.callClientId || i.data.callClientId === t) && (!i.data.from || i.data.from !== "module")) {
                    var s = i.data;
                    e(s)
                }
            };
            return this._wrappedListeners[e] = n,
            window.addEventListener("message", n),
            e
        }
    }, {
        key: "removeListenerForPackagedMessagesFromCallMachine",
        value: function(e) {
            var t = this._wrappedListeners[e];
            t && (window.removeEventListener("message", t),
            delete this._wrappedListeners[e])
        }
    }, {
        key: "_callMachineTargetOrigin",
        value: function(e) {
            return e ? e.src ? new URL(e.src).origin : void 0 : this._targetOriginFromWindowLocation()
        }
    }, {
        key: "_targetOriginFromWindowLocation",
        value: function() {
            return window.location.protocol === "file:" ? "*" : window.location.origin
        }
    }])
}
)();
function Pa(r, e) {
    var t = Object.keys(r);
    if (Object.getOwnPropertySymbols) {
        var n = Object.getOwnPropertySymbols(r);
        e && (n = n.filter((function(i) {
            return Object.getOwnPropertyDescriptor(r, i).enumerable
        }
        ))),
        t.push.apply(t, n)
    }
    return t
}
function uc() {
    try {
        var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {}
        )))
    } catch {}
    return (uc = function() {
        return !!r
    }
    )()
}
var $d = (function() {
    function r() {
        var e, t, n, i;
        return Te(this, r),
        t = this,
        n = Ve(n = r),
        e = vn(t, uc() ? Reflect.construct(n, [], Ve(t).constructor) : n.apply(t, i)),
        global.callMachineToDailyJsEmitter = global.callMachineToDailyJsEmitter || new ei.EventEmitter,
        global.dailyJsToCallMachineEmitter = global.dailyJsToCallMachineEmitter || new ei.EventEmitter,
        e._wrappedListeners = {},
        e._messageCallbacks = {},
        e
    }
    return bn(r, cc),
    Oe(r, [{
        key: "addListenerForMessagesFromCallMachine",
        value: function(e, t, n) {
            this._addListener(e, global.callMachineToDailyJsEmitter, t, n, "received call machine message")
        }
    }, {
        key: "addListenerForMessagesFromDailyJs",
        value: function(e, t, n) {
            this._addListener(e, global.dailyJsToCallMachineEmitter, t, n, "received daily-js message")
        }
    }, {
        key: "sendMessageToCallMachine",
        value: function(e, t, n) {
            this._sendMessage(e, global.dailyJsToCallMachineEmitter, n, t, "sending message to call machine")
        }
    }, {
        key: "sendMessageToDailyJs",
        value: function(e, t) {
            this._sendMessage(e, global.callMachineToDailyJsEmitter, t, null, "sending message to daily-js")
        }
    }, {
        key: "removeListener",
        value: function(e) {
            var t = this._wrappedListeners[e];
            t && (global.callMachineToDailyJsEmitter.removeListener("message", t),
            global.dailyJsToCallMachineEmitter.removeListener("message", t),
            delete this._wrappedListeners[e])
        }
    }, {
        key: "_addListener",
        value: function(e, t, n, i, s) {
            var a = this
              , c = function(l) {
                if (l.callClientId === n) {
                    if (l.callbackStamp && a._messageCallbacks[l.callbackStamp]) {
                        var u = l.callbackStamp;
                        a._messageCallbacks[u].call(i, l),
                        delete a._messageCallbacks[u]
                    }
                    e.call(i, l)
                }
            };
            this._wrappedListeners[e] = c,
            t.addListener("message", c)
        }
    }, {
        key: "_sendMessage",
        value: function(e, t, n, i, s) {
            var a = (function(l) {
                for (var u = 1; u < arguments.length; u++) {
                    var h = arguments[u] != null ? arguments[u] : {};
                    u % 2 ? Pa(Object(h), !0).forEach((function(m) {
                        Ge(l, m, h[m])
                    }
                    )) : Object.getOwnPropertyDescriptors ? Object.defineProperties(l, Object.getOwnPropertyDescriptors(h)) : Pa(Object(h)).forEach((function(m) {
                        Object.defineProperty(l, m, Object.getOwnPropertyDescriptor(h, m))
                    }
                    ))
                }
                return l
            }
            )({}, e);
            if (a.callClientId = n,
            i) {
                var c = yn();
                this._messageCallbacks[c] = i,
                a.callbackStamp = c
            }
            t.emit("message", a)
        }
    }])
}
)()
  , yi = "replace"
  , _i = "shallow-merge"
  , Ia = [yi, _i]
  , Ud = (function() {
    function r() {
        var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
          , t = e.data
          , n = e.mergeStrategy
          , i = n === void 0 ? yi : n;
        Te(this, r),
        r._validateMergeStrategy(i),
        r._validateData(t, i),
        this.mergeStrategy = i,
        this.data = t
    }
    return Oe(r, [{
        key: "isNoOp",
        value: function() {
            return r.isNoOpUpdate(this.data, this.mergeStrategy)
        }
    }], [{
        key: "isNoOpUpdate",
        value: function(e, t) {
            return Object.keys(e).length === 0 && t === _i
        }
    }, {
        key: "_validateMergeStrategy",
        value: function(e) {
            if (!Ia.includes(e))
                throw Error("Unrecognized mergeStrategy provided. Options are: [".concat(Ia, "]"))
        }
    }, {
        key: "_validateData",
        value: function(e, t) {
            if (!(function(c) {
                if (c == null || X(c) !== "object")
                    return !1;
                var l = Object.getPrototypeOf(c);
                return l == null || l === Object.prototype
            }
            )(e))
                throw Error("Meeting session data must be a plain (map-like) object");
            var n;
            try {
                if (n = JSON.stringify(e),
                t === yi) {
                    var i = JSON.parse(n);
                    ye(i, e) || console.warn("The meeting session data provided will be modified when serialized.", i, e)
                } else if (t === _i) {
                    for (var s in e)
                        if (Object.hasOwnProperty.call(e, s) && e[s] !== void 0) {
                            var a = JSON.parse(JSON.stringify(e[s]));
                            ye(e[s], a) || console.warn("At least one key in the meeting session data provided will be modified when serialized.", a, e[s])
                        }
                }
            } catch (c) {
                throw Error("Meeting session data must be serializable to JSON: ".concat(c))
            }
            if (n.length > ka)
                throw Error("Meeting session data is too large (".concat(n.length, " characters). Maximum size suppported is ").concat(ka, "."))
        }
    }])
}
)();
function dc() {
    try {
        var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {}
        )))
    } catch {}
    return (dc = function() {
        return !!r
    }
    )()
}
function wi(r) {
    var e = typeof Map == "function" ? new Map : void 0;
    return wi = function(t) {
        if (t === null || !(function(i) {
            try {
                return Function.toString.call(i).indexOf("[native code]") !== -1
            } catch {
                return typeof i == "function"
            }
        }
        )(t))
            return t;
        if (typeof t != "function")
            throw new TypeError("Super expression must either be null or a function");
        if (e !== void 0) {
            if (e.has(t))
                return e.get(t);
            e.set(t, n)
        }
        function n() {
            return (function(i, s, a) {
                if (dc())
                    return Reflect.construct.apply(null, arguments);
                var c = [null];
                c.push.apply(c, s);
                var l = new (i.bind.apply(i, c));
                return a && kr(l, a.prototype),
                l
            }
            )(t, arguments, Ve(this).constructor)
        }
        return n.prototype = Object.create(t.prototype, {
            constructor: {
                value: n,
                enumerable: !1,
                writable: !0,
                configurable: !0
            }
        }),
        kr(n, t)
    }
    ,
    wi(r)
}
function fc() {
    try {
        var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {}
        )))
    } catch {}
    return (fc = function() {
        return !!r
    }
    )()
}
function xa(r) {
    var e, t = (e = window._daily) === null || e === void 0 ? void 0 : e.pendings;
    if (t) {
        var n = t.indexOf(r);
        n !== -1 && t.splice(n, 1)
    }
}
var Vd = (function() {
    return Oe((function r(e) {
        Te(this, r),
        this._currentLoad = null,
        this._callClientId = e
    }
    ), [{
        key: "load",
        value: function() {
            var r, e = this, t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, n = arguments.length > 1 ? arguments[1] : void 0, i = arguments.length > 2 ? arguments[2] : void 0;
            if (this.loaded)
                return window._daily.instances[this._callClientId].callMachine.reset(),
                void n(!0);
            r = this._callClientId,
            window._daily.pendings.push(r),
            this._currentLoad && this._currentLoad.cancel(),
            this._currentLoad = new Wd(t,(function() {
                n(!1)
            }
            ),(function(s, a) {
                a || xa(e._callClientId),
                i(s, a)
            }
            )),
            this._currentLoad.start()
        }
    }, {
        key: "cancel",
        value: function() {
            this._currentLoad && this._currentLoad.cancel(),
            xa(this._callClientId)
        }
    }, {
        key: "loaded",
        get: function() {
            return this._currentLoad && this._currentLoad.succeeded
        }
    }])
}
)()
  , Wd = (function() {
    return Oe((function r() {
        var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
          , t = arguments.length > 1 ? arguments[1] : void 0
          , n = arguments.length > 2 ? arguments[2] : void 0;
        Te(this, r),
        this._attemptsRemaining = 3,
        this._currentAttempt = null,
        this._dailyConfig = e,
        this._successCallback = t,
        this._failureCallback = n
    }
    ), [{
        key: "start",
        value: function() {
            var r = this;
            if (!this._currentAttempt) {
                var e = function(t) {
                    r._currentAttempt.cancelled || (r._attemptsRemaining--,
                    r._failureCallback(t, r._attemptsRemaining > 0),
                    r._attemptsRemaining <= 0 || setTimeout((function() {
                        r._currentAttempt.cancelled || (r._currentAttempt = new Na(r._dailyConfig,r._successCallback,e),
                        r._currentAttempt.start())
                    }
                    ), 3e3))
                };
                this._currentAttempt = new Na(this._dailyConfig,this._successCallback,e),
                this._currentAttempt.start()
            }
        }
    }, {
        key: "cancel",
        value: function() {
            this._currentAttempt && this._currentAttempt.cancel()
        }
    }, {
        key: "cancelled",
        get: function() {
            return this._currentAttempt && this._currentAttempt.cancelled
        }
    }, {
        key: "succeeded",
        get: function() {
            return this._currentAttempt && this._currentAttempt.succeeded
        }
    }])
}
)()
  , Vn = (function() {
    function r() {
        return Te(this, r),
        e = this,
        n = arguments,
        t = Ve(t = r),
        vn(e, fc() ? Reflect.construct(t, n || [], Ve(e).constructor) : t.apply(e, n));
        var e, t, n
    }
    return bn(r, wi(Error)),
    Oe(r)
}
)()
  , un = 2e4
  , Na = (function() {
    return Oe((function e(t, n, i) {
        Te(this, e),
        this._loadAttemptImpl = Y() || !t.avoidEval ? new qd(t,n,i) : new zd(t,n,i)
    }
    ), [{
        key: "start",
        value: (r = F((function*() {
            return this._loadAttemptImpl.start()
        }
        )),
        function() {
            return r.apply(this, arguments)
        }
        )
    }, {
        key: "cancel",
        value: function() {
            this._loadAttemptImpl.cancel()
        }
    }, {
        key: "cancelled",
        get: function() {
            return this._loadAttemptImpl.cancelled
        }
    }, {
        key: "succeeded",
        get: function() {
            return this._loadAttemptImpl.succeeded
        }
    }]);
    var r
}
)()
  , qd = (function() {
    return Oe((function i(s, a, c) {
        Te(this, i),
        this.cancelled = !1,
        this.succeeded = !1,
        this._networkTimedOut = !1,
        this._networkTimeout = null,
        this._iosCache = typeof iOSCallObjectBundleCache < "u" && iOSCallObjectBundleCache,
        this._refetchHeaders = null,
        this._dailyConfig = s,
        this._successCallback = a,
        this._failureCallback = c
    }
    ), [{
        key: "start",
        value: (n = F((function*() {
            var i = rn(this._dailyConfig);
            !(yield this._tryLoadFromIOSCache(i)) && this._loadFromNetwork(i)
        }
        )),
        function() {
            return n.apply(this, arguments)
        }
        )
    }, {
        key: "cancel",
        value: function() {
            clearTimeout(this._networkTimeout),
            this.cancelled = !0
        }
    }, {
        key: "_tryLoadFromIOSCache",
        value: (t = F((function*(i) {
            if (!this._iosCache)
                return !1;
            try {
                var s = yield this._iosCache.get(i);
                return !!this.cancelled || !!s && (s.code ? (Function('"use strict";' + s.code)(),
                this.succeeded = !0,
                this._successCallback(),
                !0) : (this._refetchHeaders = s.refetchHeaders,
                !1))
            } catch {
                return !1
            }
        }
        )),
        function(i) {
            return t.apply(this, arguments)
        }
        )
    }, {
        key: "_loadFromNetwork",
        value: (e = F((function*(i) {
            var s = this;
            this._networkTimeout = setTimeout((function() {
                s._networkTimedOut = !0,
                s._failureCallback({
                    msg: "Timed out (>".concat(un, " ms) when loading call object bundle ").concat(i),
                    type: "timeout"
                })
            }
            ), un);
            try {
                var a = this._refetchHeaders ? {
                    headers: this._refetchHeaders
                } : {}
                  , c = yield fetch(i, a);
                if (clearTimeout(this._networkTimeout),
                this.cancelled || this._networkTimedOut)
                    throw new Vn;
                var l = yield this._getBundleCodeFromResponse(i, c);
                if (this.cancelled)
                    throw new Vn;
                Function('"use strict";' + l)(),
                this._iosCache && this._iosCache.set(i, l, c.headers),
                this.succeeded = !0,
                this._successCallback()
            } catch (u) {
                if (clearTimeout(this._networkTimeout),
                u instanceof Vn || this.cancelled || this._networkTimedOut)
                    return;
                this._failureCallback({
                    msg: "Failed to load call object bundle ".concat(i, ": ").concat(u),
                    type: u.message
                })
            }
        }
        )),
        function(i) {
            return e.apply(this, arguments)
        }
        )
    }, {
        key: "_getBundleCodeFromResponse",
        value: (r = F((function*(i, s) {
            if (s.ok)
                return yield s.text();
            if (this._iosCache && s.status === 304)
                return (yield this._iosCache.renew(i, s.headers)).code;
            throw new Error("Received ".concat(s.status, " response"))
        }
        )),
        function(i, s) {
            return r.apply(this, arguments)
        }
        )
    }]);
    var r, e, t, n
}
)()
  , zd = (function() {
    return Oe((function r(e, t, n) {
        Te(this, r),
        this.cancelled = !1,
        this.succeeded = !1,
        this._dailyConfig = e,
        this._successCallback = t,
        this._failureCallback = n,
        this._attemptId = yn(),
        this._networkTimeout = null,
        this._scriptElement = null
    }
    ), [{
        key: "start",
        value: function() {
            window._dailyCallMachineLoadWaitlist || (window._dailyCallMachineLoadWaitlist = new Set);
            var r = rn(this._dailyConfig);
            (typeof document > "u" ? "undefined" : X(document)) === "object" ? this._startLoading(r) : this._failureCallback({
                msg: "Call object bundle must be loaded in a DOM/web context",
                type: "missing context"
            })
        }
    }, {
        key: "cancel",
        value: function() {
            this._stopLoading(),
            this.cancelled = !0
        }
    }, {
        key: "_startLoading",
        value: function(r) {
            var e = this;
            this._signUpForCallMachineLoadWaitlist(),
            this._networkTimeout = setTimeout((function() {
                e._stopLoading(),
                e._failureCallback({
                    msg: "Timed out (>".concat(un, " ms) when loading call object bundle ").concat(r),
                    type: "timeout"
                })
            }
            ), un);
            var t = document.getElementsByTagName("head")[0]
              , n = document.createElement("script");
            this._scriptElement = n,
            n.onload = function() {
                e._stopLoading(),
                e.succeeded = !0,
                e._successCallback()
            }
            ,
            n.onerror = function(i) {
                e._stopLoading(),
                e._failureCallback({
                    msg: "Failed to load call object bundle ".concat(i.target.src),
                    type: i.message
                })
            }
            ,
            n.src = r,
            t.appendChild(n)
        }
    }, {
        key: "_stopLoading",
        value: function() {
            this._withdrawFromCallMachineLoadWaitlist(),
            clearTimeout(this._networkTimeout),
            this._scriptElement && (this._scriptElement.onload = null,
            this._scriptElement.onerror = null)
        }
    }, {
        key: "_signUpForCallMachineLoadWaitlist",
        value: function() {
            window._dailyCallMachineLoadWaitlist.add(this._attemptId)
        }
    }, {
        key: "_withdrawFromCallMachineLoadWaitlist",
        value: function() {
            window._dailyCallMachineLoadWaitlist.delete(this._attemptId)
        }
    }])
}
)()
  , qr = function(r, e, t) {
    return Gd(r.local, e, t) === !0
}
  , Jd = function(r, e, t) {
    return r.local.streams && r.local.streams[e] && r.local.streams[e].stream && r.local.streams[e].stream["get".concat(t === "video" ? "Video" : "Audio", "Tracks")]()[0]
}
  , zt = function(r, e, t, n) {
    var i = Kd(r, e, t, n);
    return i && i.pendingTrack
}
  , Gd = function(r, e, t) {
    if (!r)
        return !1;
    var n = function(s) {
        switch (s) {
        case "avatar":
            return !0;
        case "staged":
            return s;
        default:
            return !!s
        }
    }
      , i = r.public.subscribedTracks;
    return i && i[e] ? ["cam-audio", "cam-video", "screen-video", "screen-audio", "rmpAudio", "rmpVideo"].indexOf(t) === -1 && i[e].custom ? [!0, "staged"].includes(i[e].custom) ? n(i[e].custom) : n(i[e].custom[t]) : n(i[e][t]) : !i || n(i.ALL)
}
  , Kd = function(r, e, t, n) {
    var i = Object.values(r.streams || {}).filter((function(s) {
        return s.participantId === e && s.type === t && s.pendingTrack && s.pendingTrack.kind === n
    }
    )).sort((function(s, a) {
        return new Date(a.starttime) - new Date(s.starttime)
    }
    ));
    return i && i[0]
}
  , Hd = function(r, e) {
    var t = r.local.public.customTracks;
    if (t && t[e])
        return t[e].track
};
function La(r, e) {
    for (var t = e.getState(), n = 0, i = ["cam", "screen"]; n < i.length; n++)
        for (var s = i[n], a = 0, c = ["video", "audio"]; a < c.length; a++) {
            var l = c[a]
              , u = s === "cam" ? l : "screen".concat(l.charAt(0).toUpperCase() + l.slice(1))
              , h = r.tracks[u];
            if (h) {
                var m = r.local ? Jd(t, s, l) : zt(t, r.session_id, s, l);
                h.state === "playable" && (h.track = m),
                h.persistentTrack = m
            }
        }
}
function Ba(r, e) {
    try {
        var t = e.getState();
        for (var n in r.tracks)
            if (!Qd(n)) {
                var i = r.tracks[n].kind;
                if (i) {
                    var s = r.tracks[n];
                    if (s) {
                        var a = r.local ? Hd(t, n) : zt(t, r.session_id, n, i);
                        s.state === "playable" && (r.tracks[n].track = a),
                        s.persistentTrack = a
                    }
                } else
                    console.error("unknown type for custom track")
            }
    } catch (c) {
        console.error(c)
    }
}
function Qd(r) {
    return ["video", "audio", "screenVideo", "screenAudio"].includes(r)
}
function Da(r, e, t) {
    var n = t.getState();
    if (r.local) {
        if (r.audio)
            try {
                r.audioTrack = n.local.streams.cam.stream.getAudioTracks()[0],
                r.audioTrack || (r.audio = !1)
            } catch {}
        if (r.video)
            try {
                r.videoTrack = n.local.streams.cam.stream.getVideoTracks()[0],
                r.videoTrack || (r.video = !1)
            } catch {}
        if (r.screen)
            try {
                r.screenVideoTrack = n.local.streams.screen.stream.getVideoTracks()[0],
                r.screenAudioTrack = n.local.streams.screen.stream.getAudioTracks()[0],
                r.screenVideoTrack || r.screenAudioTrack || (r.screen = !1)
            } catch {}
    } else {
        var i = !0;
        try {
            var s = n.participants[r.session_id];
            s && s.public && s.public.rtcType && s.public.rtcType.impl === "peer-to-peer" && s.private && !["connected", "completed"].includes(s.private.peeringState) && (i = !1)
        } catch (h) {
            console.error(h)
        }
        if (!i)
            return r.audio = !1,
            r.audioTrack = !1,
            r.video = !1,
            r.videoTrack = !1,
            r.screen = !1,
            void (r.screenTrack = !1);
        try {
            if (n.streams,
            r.audio && qr(n, r.session_id, "cam-audio")) {
                var a = zt(n, r.session_id, "cam", "audio");
                a && (e && e.audioTrack && e.audioTrack.id === a.id ? r.audioTrack = a : a.muted || (r.audioTrack = a)),
                r.audioTrack || (r.audio = !1)
            }
            if (r.video && qr(n, r.session_id, "cam-video")) {
                var c = zt(n, r.session_id, "cam", "video");
                c && (e && e.videoTrack && e.videoTrack.id === c.id ? r.videoTrack = c : c.muted || (r.videoTrack = c)),
                r.videoTrack || (r.video = !1)
            }
            if (r.screen && qr(n, r.session_id, "screen-audio")) {
                var l = zt(n, r.session_id, "screen", "audio");
                l && (e && e.screenAudioTrack && e.screenAudioTrack.id === l.id ? r.screenAudioTrack = l : l.muted || (r.screenAudioTrack = l))
            }
            if (r.screen && qr(n, r.session_id, "screen-video")) {
                var u = zt(n, r.session_id, "screen", "video");
                u && (e && e.screenVideoTrack && e.screenVideoTrack.id === u.id ? r.screenVideoTrack = u : u.muted || (r.screenVideoTrack = u))
            }
            r.screenVideoTrack || r.screenAudioTrack || (r.screen = !1)
        } catch (h) {
            console.error("unexpected error matching up tracks", h)
        }
    }
}
function Yd(r, e) {
    var t = typeof Symbol < "u" && r[Symbol.iterator] || r["@@iterator"];
    if (!t) {
        if (Array.isArray(r) || (t = (function(l, u) {
            if (l) {
                if (typeof l == "string")
                    return Ra(l, u);
                var h = {}.toString.call(l).slice(8, -1);
                return h === "Object" && l.constructor && (h = l.constructor.name),
                h === "Map" || h === "Set" ? Array.from(l) : h === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(h) ? Ra(l, u) : void 0
            }
        }
        )(r)) || e) {
            t && (r = t);
            var n = 0
              , i = function() {};
            return {
                s: i,
                n: function() {
                    return n >= r.length ? {
                        done: !0
                    } : {
                        done: !1,
                        value: r[n++]
                    }
                },
                e: function(l) {
                    throw l
                },
                f: i
            }
        }
        throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
    }
    var s, a = !0, c = !1;
    return {
        s: function() {
            t = t.call(r)
        },
        n: function() {
            var l = t.next();
            return a = l.done,
            l
        },
        e: function(l) {
            c = !0,
            s = l
        },
        f: function() {
            try {
                a || t.return == null || t.return()
            } finally {
                if (c)
                    throw s
            }
        }
    }
}
function Ra(r, e) {
    (e == null || e > r.length) && (e = r.length);
    for (var t = 0, n = Array(e); t < e; t++)
        n[t] = r[t];
    return n
}
var ze = new Map
  , Gt = null;
function Xd(r, e) {
    var t = typeof Symbol < "u" && r[Symbol.iterator] || r["@@iterator"];
    if (!t) {
        if (Array.isArray(r) || (t = (function(l, u) {
            if (l) {
                if (typeof l == "string")
                    return Fa(l, u);
                var h = {}.toString.call(l).slice(8, -1);
                return h === "Object" && l.constructor && (h = l.constructor.name),
                h === "Map" || h === "Set" ? Array.from(l) : h === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(h) ? Fa(l, u) : void 0
            }
        }
        )(r)) || e) {
            t && (r = t);
            var n = 0
              , i = function() {};
            return {
                s: i,
                n: function() {
                    return n >= r.length ? {
                        done: !0
                    } : {
                        done: !1,
                        value: r[n++]
                    }
                },
                e: function(l) {
                    throw l
                },
                f: i
            }
        }
        throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
    }
    var s, a = !0, c = !1;
    return {
        s: function() {
            t = t.call(r)
        },
        n: function() {
            var l = t.next();
            return a = l.done,
            l
        },
        e: function(l) {
            c = !0,
            s = l
        },
        f: function() {
            try {
                a || t.return == null || t.return()
            } finally {
                if (c)
                    throw s
            }
        }
    }
}
function Fa(r, e) {
    (e == null || e > r.length) && (e = r.length);
    for (var t = 0, n = Array(e); t < e; t++)
        n[t] = r[t];
    return n
}
var Je = new Map
  , yr = null;
function Zd(r) {
    hc() ? (function(e) {
        ze.has(e) || (ze.set(e, {}),
        navigator.mediaDevices.enumerateDevices().then((function(t) {
            ze.has(e) && (ze.get(e).lastDevicesString = JSON.stringify(t),
            Gt || (Gt = (function() {
                var n = F((function*() {
                    var i, s = yield navigator.mediaDevices.enumerateDevices(), a = Yd(ze.keys());
                    try {
                        for (a.s(); !(i = a.n()).done; ) {
                            var c = i.value
                              , l = JSON.stringify(s);
                            l !== ze.get(c).lastDevicesString && (ze.get(c).lastDevicesString = l,
                            c(s))
                        }
                    } catch (u) {
                        a.e(u)
                    } finally {
                        a.f()
                    }
                }
                ));
                return function() {
                    return n.apply(this, arguments)
                }
            }
            )(),
            navigator.mediaDevices.addEventListener("devicechange", Gt)))
        }
        )).catch((function() {}
        )))
    }
    )(r) : (function(e) {
        Je.has(e) || (Je.set(e, {}),
        navigator.mediaDevices.enumerateDevices().then((function(t) {
            Je.has(e) && (Je.get(e).lastDevicesString = JSON.stringify(t),
            yr || (yr = setInterval(F((function*() {
                var n, i = yield navigator.mediaDevices.enumerateDevices(), s = Xd(Je.keys());
                try {
                    for (s.s(); !(n = s.n()).done; ) {
                        var a = n.value
                          , c = JSON.stringify(i);
                        c !== Je.get(a).lastDevicesString && (Je.get(a).lastDevicesString = c,
                        a(i))
                    }
                } catch (l) {
                    s.e(l)
                } finally {
                    s.f()
                }
            }
            )), 3e3)))
        }
        )))
    }
    )(r)
}
function ef(r) {
    hc() ? (function(e) {
        ze.has(e) && (ze.delete(e),
        ze.size === 0 && Gt && (navigator.mediaDevices.removeEventListener("devicechange", Gt),
        Gt = null))
    }
    )(r) : (function(e) {
        Je.has(e) && (Je.delete(e),
        Je.size === 0 && yr && (clearInterval(yr),
        yr = null))
    }
    )(r)
}
function hc() {
    var r;
    return Y() || ((r = navigator.mediaDevices) === null || r === void 0 ? void 0 : r.ondevicechange) !== void 0
}
var tf = new Set;
function rf(r, e) {
    return r && r.readyState === "live" && !(function(t, n) {
        return t.muted && !tf.has(t.id)
    }
    )(r)
}
function ja(r, e) {
    var t = Object.keys(r);
    if (Object.getOwnPropertySymbols) {
        var n = Object.getOwnPropertySymbols(r);
        e && (n = n.filter((function(i) {
            return Object.getOwnPropertyDescriptor(r, i).enumerable
        }
        ))),
        t.push.apply(t, n)
    }
    return t
}
function at(r) {
    for (var e = 1; e < arguments.length; e++) {
        var t = arguments[e] != null ? arguments[e] : {};
        e % 2 ? ja(Object(t), !0).forEach((function(n) {
            Ge(r, n, t[n])
        }
        )) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(t)) : ja(Object(t)).forEach((function(n) {
            Object.defineProperty(r, n, Object.getOwnPropertyDescriptor(t, n))
        }
        ))
    }
    return r
}
var br = Object.freeze({
    VIDEO: "video",
    AUDIO: "audio",
    SCREEN_VIDEO: "screenVideo",
    SCREEN_AUDIO: "screenAudio",
    CUSTOM_VIDEO: "customVideo",
    CUSTOM_AUDIO: "customAudio"
})
  , nf = Object.freeze({
    PARTICIPANTS: "participants",
    STREAMING: "streaming",
    TRANSCRIPTION: "transcription"
})
  , _r = Object.values(br)
  , $a = ["v", "a", "sv", "sa", "cv", "ca"];
Object.freeze(_r.reduce((function(r, e, t) {
    return r[e] = $a[t],
    r
}
), {})),
Object.freeze($a.reduce((function(r, e, t) {
    return r[e] = _r[t],
    r
}
), {}));
var sf = [br.VIDEO, br.AUDIO, br.SCREEN_VIDEO, br.SCREEN_AUDIO]
  , Ua = Object.values(nf)
  , Va = ["p", "s", "t"];
Object.freeze(Ua.reduce((function(r, e, t) {
    return r[e] = Va[t],
    r
}
), {})),
Object.freeze(Va.reduce((function(r, e, t) {
    return r[e] = Ua[t],
    r
}
), {}));
var pc = (function() {
    function r() {
        var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
          , t = e.base
          , n = e.byUserId
          , i = e.byParticipantId;
        Te(this, r),
        this.base = t,
        this.byUserId = n,
        this.byParticipantId = i
    }
    return Oe(r, [{
        key: "clone",
        value: function() {
            var e = new r;
            if (this.base instanceof de ? e.base = this.base.clone() : e.base = this.base,
            this.byUserId !== void 0)
                for (var t in e.byUserId = {},
                this.byUserId) {
                    var n = this.byUserId[t];
                    e.byUserId[t] = n instanceof de ? n.clone() : n
                }
            if (this.byParticipantId !== void 0)
                for (var i in e.byParticipantId = {},
                this.byParticipantId) {
                    var s = this.byParticipantId[i];
                    e.byParticipantId[i] = s instanceof de ? s.clone() : s
                }
            return e
        }
    }, {
        key: "toJSONObject",
        value: function() {
            var e = {};
            if (typeof this.base == "boolean" ? e.base = this.base : this.base instanceof de && (e.base = this.base.toJSONObject()),
            this.byUserId !== void 0)
                for (var t in e.byUserId = {},
                this.byUserId) {
                    var n = this.byUserId[t];
                    e.byUserId[t] = n instanceof de ? n.toJSONObject() : n
                }
            if (this.byParticipantId !== void 0)
                for (var i in e.byParticipantId = {},
                this.byParticipantId) {
                    var s = this.byParticipantId[i];
                    e.byParticipantId[i] = s instanceof de ? s.toJSONObject() : s
                }
            return e
        }
    }, {
        key: "toMinifiedJSONObject",
        value: function() {
            var e = {};
            if (this.base !== void 0 && (typeof this.base == "boolean" ? e.b = this.base : e.b = this.base.toMinifiedJSONObject()),
            this.byUserId !== void 0)
                for (var t in e.u = {},
                this.byUserId) {
                    var n = this.byUserId[t];
                    e.u[t] = typeof n == "boolean" ? n : n.toMinifiedJSONObject()
                }
            if (this.byParticipantId !== void 0)
                for (var i in e.p = {},
                this.byParticipantId) {
                    var s = this.byParticipantId[i];
                    e.p[i] = typeof s == "boolean" ? s : s.toMinifiedJSONObject()
                }
            return e
        }
    }, {
        key: "normalize",
        value: function() {
            return this.base instanceof de && (this.base = this.base.normalize()),
            this.byUserId && (this.byUserId = Object.fromEntries(Object.entries(this.byUserId).map((function(e) {
                var t = me(e, 2)
                  , n = t[0]
                  , i = t[1];
                return [n, i instanceof de ? i.normalize() : i]
            }
            )))),
            this.byParticipantId && (this.byParticipantId = Object.fromEntries(Object.entries(this.byParticipantId).map((function(e) {
                var t = me(e, 2)
                  , n = t[0]
                  , i = t[1];
                return [n, i instanceof de ? i.normalize() : i]
            }
            )))),
            this
        }
    }], [{
        key: "fromJSONObject",
        value: function(e) {
            var t, n, i;
            if (e.base !== void 0 && (t = typeof e.base == "boolean" ? e.base : de.fromJSONObject(e.base)),
            e.byUserId !== void 0)
                for (var s in n = {},
                e.byUserId) {
                    var a = e.byUserId[s];
                    n[s] = typeof a == "boolean" ? a : de.fromJSONObject(a)
                }
            if (e.byParticipantId !== void 0)
                for (var c in i = {},
                e.byParticipantId) {
                    var l = e.byParticipantId[c];
                    i[c] = typeof l == "boolean" ? l : de.fromJSONObject(l)
                }
            return new r({
                base: t,
                byUserId: n,
                byParticipantId: i
            })
        }
    }, {
        key: "fromMinifiedJSONObject",
        value: function(e) {
            var t, n, i;
            if (e.b !== void 0 && (t = typeof e.b == "boolean" ? e.b : de.fromMinifiedJSONObject(e.b)),
            e.u !== void 0)
                for (var s in n = {},
                e.u) {
                    var a = e.u[s];
                    n[s] = typeof a == "boolean" ? a : de.fromMinifiedJSONObject(a)
                }
            if (e.p !== void 0)
                for (var c in i = {},
                e.p) {
                    var l = e.p[c];
                    i[c] = typeof l == "boolean" ? l : de.fromMinifiedJSONObject(l)
                }
            return new r({
                base: t,
                byUserId: n,
                byParticipantId: i
            })
        }
    }, {
        key: "validateJSONObject",
        value: function(e) {
            if (X(e) !== "object")
                return [!1, "canReceive must be an object"];
            for (var t = ["base", "byUserId", "byParticipantId"], n = 0, i = Object.keys(e); n < i.length; n++) {
                var s = i[n];
                if (!t.includes(s))
                    return [!1, "canReceive can only contain keys (".concat(t.join(", "), ")")];
                if (s === "base") {
                    var a = me(de.validateJSONObject(e.base, !0), 2)
                      , c = a[0]
                      , l = a[1];
                    if (!c)
                        return [!1, l]
                } else {
                    if (X(e[s]) !== "object")
                        return [!1, "invalid (non-object) value for field '".concat(s, "' in canReceive")];
                    for (var u = 0, h = Object.values(e[s]); u < h.length; u++) {
                        var m = h[u]
                          , _ = me(de.validateJSONObject(m), 2)
                          , M = _[0]
                          , b = _[1];
                        if (!M)
                            return [!1, b]
                    }
                }
            }
            return [!0]
        }
    }])
}
)()
  , de = (function() {
    function r() {
        var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
          , t = e.video
          , n = e.audio
          , i = e.screenVideo
          , s = e.screenAudio
          , a = e.customVideo
          , c = e.customAudio;
        Te(this, r),
        this.video = t,
        this.audio = n,
        this.screenVideo = i,
        this.screenAudio = s,
        this.customVideo = a,
        this.customAudio = c
    }
    return Oe(r, [{
        key: "clone",
        value: function() {
            var e = new r;
            return this.video !== void 0 && (e.video = this.video),
            this.audio !== void 0 && (e.audio = this.audio),
            this.screenVideo !== void 0 && (e.screenVideo = this.screenVideo),
            this.screenAudio !== void 0 && (e.screenAudio = this.screenAudio),
            this.customVideo !== void 0 && (e.customVideo = at({}, this.customVideo)),
            this.customAudio !== void 0 && (e.customAudio = at({}, this.customAudio)),
            e
        }
    }, {
        key: "toJSONObject",
        value: function() {
            var e = {};
            return this.video !== void 0 && (e.video = this.video),
            this.audio !== void 0 && (e.audio = this.audio),
            this.screenVideo !== void 0 && (e.screenVideo = this.screenVideo),
            this.screenAudio !== void 0 && (e.screenAudio = this.screenAudio),
            this.customVideo !== void 0 && (e.customVideo = at({}, this.customVideo)),
            this.customAudio !== void 0 && (e.customAudio = at({}, this.customAudio)),
            e
        }
    }, {
        key: "toMinifiedJSONObject",
        value: function() {
            var e = {};
            return this.video !== void 0 && (e.v = this.video),
            this.audio !== void 0 && (e.a = this.audio),
            this.screenVideo !== void 0 && (e.sv = this.screenVideo),
            this.screenAudio !== void 0 && (e.sa = this.screenAudio),
            this.customVideo !== void 0 && (e.cv = at({}, this.customVideo)),
            this.customAudio !== void 0 && (e.ca = at({}, this.customAudio)),
            e
        }
    }, {
        key: "normalize",
        value: function() {
            function e(t, n) {
                return t && Object.keys(t).length === 1 && t["*"] === n
            }
            return !(this.video !== !0 || this.audio !== !0 || this.screenVideo !== !0 || this.screenAudio !== !0 || !e(this.customVideo, !0) || !e(this.customAudio, !0)) || (this.video !== !1 || this.audio !== !1 || this.screenVideo !== !1 || this.screenAudio !== !1 || !e(this.customVideo, !1) || !e(this.customAudio, !1)) && this
        }
    }], [{
        key: "fromBoolean",
        value: function(e) {
            return new r({
                video: e,
                audio: e,
                screenVideo: e,
                screenAudio: e,
                customVideo: {
                    "*": e
                },
                customAudio: {
                    "*": e
                }
            })
        }
    }, {
        key: "fromJSONObject",
        value: function(e) {
            return new r({
                video: e.video,
                audio: e.audio,
                screenVideo: e.screenVideo,
                screenAudio: e.screenAudio,
                customVideo: e.customVideo !== void 0 ? at({}, e.customVideo) : void 0,
                customAudio: e.customAudio !== void 0 ? at({}, e.customAudio) : void 0
            })
        }
    }, {
        key: "fromMinifiedJSONObject",
        value: function(e) {
            return new r({
                video: e.v,
                audio: e.a,
                screenVideo: e.sv,
                screenAudio: e.sa,
                customVideo: e.cv,
                customAudio: e.ca
            })
        }
    }, {
        key: "validateJSONObject",
        value: function(e, t) {
            if (typeof e == "boolean")
                return [!0];
            if (X(e) !== "object")
                return [!1, "invalid (non-object, non-boolean) value in canReceive"];
            for (var n = Object.keys(e), i = 0, s = n; i < s.length; i++) {
                var a = s[i];
                if (!_r.includes(a))
                    return [!1, "invalid media type '".concat(a, "' in canReceive")];
                if (sf.includes(a)) {
                    if (typeof e[a] != "boolean")
                        return [!1, "invalid (non-boolean) value for media type '".concat(a, "' in canReceive")]
                } else {
                    if (X(e[a]) !== "object")
                        return [!1, "invalid (non-object) value for media type '".concat(a, "' in canReceive")];
                    for (var c = 0, l = Object.values(e[a]); c < l.length; c++)
                        if (typeof l[c] != "boolean")
                            return [!1, "invalid (non-boolean) value for entry within '".concat(a, "' in canReceive")];
                    if (t && e[a]["*"] === void 0)
                        return [!1, `canReceive "base" permission must specify "*" as an entry within '`.concat(a, "'")]
                }
            }
            return t && n.length !== _r.length ? [!1, 'canReceive "base" permission must specify all media types: '.concat(_r.join(", "), " (or be set to a boolean shorthand)")] : [!0]
        }
    }])
}
)()
  , af = ["result"]
  , of = ["preserveIframe"];
function Wa(r, e) {
    var t = Object.keys(r);
    if (Object.getOwnPropertySymbols) {
        var n = Object.getOwnPropertySymbols(r);
        e && (n = n.filter((function(i) {
            return Object.getOwnPropertyDescriptor(r, i).enumerable
        }
        ))),
        t.push.apply(t, n)
    }
    return t
}
function R(r) {
    for (var e = 1; e < arguments.length; e++) {
        var t = arguments[e] != null ? arguments[e] : {};
        e % 2 ? Wa(Object(t), !0).forEach((function(n) {
            Ge(r, n, t[n])
        }
        )) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(t)) : Wa(Object(t)).forEach((function(n) {
            Object.defineProperty(r, n, Object.getOwnPropertyDescriptor(t, n))
        }
        ))
    }
    return r
}
function mc() {
    try {
        var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {}
        )))
    } catch {}
    return (mc = function() {
        return !!r
    }
    )()
}
function qa(r, e) {
    var t = typeof Symbol < "u" && r[Symbol.iterator] || r["@@iterator"];
    if (!t) {
        if (Array.isArray(r) || (t = (function(l, u) {
            if (l) {
                if (typeof l == "string")
                    return za(l, u);
                var h = {}.toString.call(l).slice(8, -1);
                return h === "Object" && l.constructor && (h = l.constructor.name),
                h === "Map" || h === "Set" ? Array.from(l) : h === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(h) ? za(l, u) : void 0
            }
        }
        )(r)) || e) {
            t && (r = t);
            var n = 0
              , i = function() {};
            return {
                s: i,
                n: function() {
                    return n >= r.length ? {
                        done: !0
                    } : {
                        done: !1,
                        value: r[n++]
                    }
                },
                e: function(l) {
                    throw l
                },
                f: i
            }
        }
        throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
    }
    var s, a = !0, c = !1;
    return {
        s: function() {
            t = t.call(r)
        },
        n: function() {
            var l = t.next();
            return a = l.done,
            l
        },
        e: function(l) {
            c = !0,
            s = l
        },
        f: function() {
            try {
                a || t.return == null || t.return()
            } finally {
                if (c)
                    throw s
            }
        }
    }
}
function za(r, e) {
    (e == null || e > r.length) && (e = r.length);
    for (var t = 0, n = Array(e); t < e; t++)
        n[t] = r[t];
    return n
}
var Ot = {}
  , Ja = "video"
  , cf = "voice"
  , Ga = Y() ? {
    data: {}
} : {
    data: {},
    topology: "none"
}
  , Ka = {
    present: 0,
    hidden: 0
}
  , gc = {
    maxBitrate: {
        min: 1e5,
        max: 25e5
    },
    maxFramerate: {
        min: 1,
        max: 30
    },
    scaleResolutionDownBy: {
        min: 1,
        max: 8
    }
}
  , Wn = Object.keys(gc)
  , Ha = ["state", "volume", "simulcastEncodings"]
  , Qa = {
    androidInCallNotification: {
        title: "string",
        subtitle: "string",
        iconName: "string",
        disableForCustomOverride: "boolean"
    },
    disableAutoDeviceManagement: {
        audio: "boolean",
        video: "boolean"
    }
}
  , dn = {
    id: {
        iconPath: "string",
        iconPathDarkMode: "string",
        label: "string",
        tooltip: "string",
        visualState: "'default' | 'sidebar-open' | 'active'"
    }
}
  , ki = {
    id: {
        allow: "string",
        controlledBy: "'*' | 'owners' | string[]",
        csp: "string",
        iconURL: "string",
        label: "string",
        loading: "'eager' | 'lazy'",
        location: "'main' | 'sidebar'",
        name: "string",
        referrerPolicy: "string",
        sandbox: "string",
        src: "string",
        srcdoc: "string",
        shared: "string[] | 'owners' | boolean"
    }
}
  , At = {
    customIntegrations: {
        validate: Ec,
        help: kc()
    },
    customTrayButtons: {
        validate: Sc,
        help: "customTrayButtons should be a dictionary of the type ".concat(JSON.stringify(dn))
    },
    url: {
        validate: function(r) {
            return typeof r == "string"
        },
        help: "url should be a string"
    },
    baseUrl: {
        validate: function(r) {
            return typeof r == "string"
        },
        help: "baseUrl should be a string"
    },
    token: {
        validate: function(r) {
            return typeof r == "string"
        },
        help: "token should be a string",
        queryString: "t"
    },
    dailyConfig: {
        validate: function(r, e) {
            try {
                return e.validateDailyConfig(r),
                !0
            } catch (t) {
                console.error("Failed to validate dailyConfig", t)
            }
            return !1
        },
        help: "Unsupported dailyConfig. Check error logs for detailed info."
    },
    reactNativeConfig: {
        validate: function(r) {
            return Mc(r, Qa)
        },
        help: "reactNativeConfig should look like ".concat(JSON.stringify(Qa), ", all fields optional")
    },
    lang: {
        validate: function(r) {
            return ["da", "de", "en-us", "en", "es", "fi", "fr", "it", "jp", "ka", "nl", "no", "pl", "pt", "pt-BR", "ru", "sv", "tr", "user"].includes(r)
        },
        help: "language not supported. Options are: da, de, en-us, en, es, fi, fr, it, jp, ka, nl, no, pl, pt, pt-BR, ru, sv, tr, user"
    },
    userName: !0,
    userData: {
        validate: function(r) {
            try {
                return vc(r),
                !0
            } catch (e) {
                return console.error(e),
                !1
            }
        },
        help: "invalid userData type provided"
    },
    startVideoOff: !0,
    startAudioOff: !0,
    allowLocalVideo: !0,
    allowLocalAudio: !0,
    activeSpeakerMode: !0,
    showLeaveButton: !0,
    showLocalVideo: !0,
    showParticipantsBar: !0,
    showFullscreenButton: !0,
    showUserNameChangeUI: !0,
    iframeStyle: !0,
    customLayout: !0,
    cssFile: !0,
    cssText: !0,
    bodyClass: !0,
    videoSource: {
        validate: function(r, e) {
            if (typeof r == "boolean")
                return e._preloadCache.allowLocalVideo = r,
                !0;
            var t;
            if (r instanceof MediaStreamTrack)
                e._sharedTracks.videoTrack = r,
                t = {
                    customTrack: nt
                };
            else {
                if (delete e._sharedTracks.videoTrack,
                typeof r != "string")
                    return console.error("videoSource must be a MediaStreamTrack, boolean, or a string"),
                    !1;
                t = {
                    deviceId: r
                }
            }
            return e._updatePreloadCacheInputSettings({
                video: {
                    settings: t
                }
            }, !1),
            !0
        }
    },
    audioSource: {
        validate: function(r, e) {
            if (typeof r == "boolean")
                return e._preloadCache.allowLocalAudio = r,
                !0;
            var t;
            if (r instanceof MediaStreamTrack)
                e._sharedTracks.audioTrack = r,
                t = {
                    customTrack: nt
                };
            else {
                if (delete e._sharedTracks.audioTrack,
                typeof r != "string")
                    return console.error("audioSource must be a MediaStreamTrack, boolean, or a string"),
                    !1;
                t = {
                    deviceId: r
                }
            }
            return e._updatePreloadCacheInputSettings({
                audio: {
                    settings: t
                }
            }, !1),
            !0
        }
    },
    subscribeToTracksAutomatically: {
        validate: function(r, e) {
            return e._preloadCache.subscribeToTracksAutomatically = r,
            !0
        }
    },
    theme: {
        validate: function(r) {
            var e = ["accent", "accentText", "background", "backgroundAccent", "baseText", "border", "mainAreaBg", "mainAreaBgAccent", "mainAreaText", "supportiveText"]
              , t = function(n) {
                for (var i = 0, s = Object.keys(n); i < s.length; i++) {
                    var a = s[i];
                    if (!e.includes(a))
                        return console.error('unsupported color "'.concat(a, '". Valid colors: ').concat(e.join(", "))),
                        !1;
                    if (!n[a].match(/^#[0-9a-f]{6}|#[0-9a-f]{3}$/i))
                        return console.error("".concat(a, ' theme color should be provided in valid hex color format. Received: "').concat(n[a], '"')),
                        !1
                }
                return !0
            };
            return X(r) === "object" && ("light"in r && "dark"in r || "colors"in r) ? "light"in r && "dark"in r ? "colors"in r.light ? "colors"in r.dark ? t(r.light.colors) && t(r.dark.colors) : (console.error('Dark theme is missing "colors" property.', r),
            !1) : (console.error('Light theme is missing "colors" property.', r),
            !1) : t(r.colors) : (console.error('Theme must contain either both "light" and "dark" properties, or "colors".', r),
            !1)
        },
        help: "unsupported theme configuration. Check error logs for detailed info."
    },
    layoutConfig: {
        validate: function(r) {
            if ("grid"in r) {
                var e = r.grid;
                if ("maxTilesPerPage"in e) {
                    if (!Number.isInteger(e.maxTilesPerPage))
                        return console.error("grid.maxTilesPerPage should be an integer. You passed ".concat(e.maxTilesPerPage, ".")),
                        !1;
                    if (e.maxTilesPerPage > 49)
                        return console.error("grid.maxTilesPerPage can't be larger than 49 without sacrificing browser performance. Please contact us at https://www.daily.co/contact to talk about your use case."),
                        !1
                }
                if ("minTilesPerPage"in e) {
                    if (!Number.isInteger(e.minTilesPerPage))
                        return console.error("grid.minTilesPerPage should be an integer. You passed ".concat(e.minTilesPerPage, ".")),
                        !1;
                    if (e.minTilesPerPage < 1)
                        return console.error("grid.minTilesPerPage can't be lower than 1."),
                        !1;
                    if ("maxTilesPerPage"in e && e.minTilesPerPage > e.maxTilesPerPage)
                        return console.error("grid.minTilesPerPage can't be higher than grid.maxTilesPerPage."),
                        !1
                }
            }
            return !0
        },
        help: "unsupported layoutConfig. Check error logs for detailed info."
    },
    receiveSettings: {
        validate: function(r) {
            return bc(r, {
                allowAllParticipantsKey: !1
            })
        },
        help: wc({
            allowAllParticipantsKey: !1
        })
    },
    sendSettings: {
        validate: function(r, e) {
            return !!(function(t, n) {
                try {
                    return n.validateUpdateSendSettings(t),
                    !0
                } catch (i) {
                    return console.error("Failed to validate send settings", i),
                    !1
                }
            }
            )(r, e) && (e._preloadCache.sendSettings = r,
            !0)
        },
        help: "Invalid sendSettings provided. Check error logs for detailed info."
    },
    inputSettings: {
        validate: function(r, e) {
            var t;
            return !!yc(r) && (e._inputSettings || (e._inputSettings = {}),
            _c(r, (t = e.properties) === null || t === void 0 ? void 0 : t.dailyConfig, e._sharedTracks),
            e._updatePreloadCacheInputSettings(r, !0),
            !0)
        },
        help: Si()
    },
    layout: {
        validate: function(r) {
            return r === "custom-v1" || r === "browser" || r === "none"
        },
        help: 'layout may only be set to "custom-v1"',
        queryString: "layout"
    },
    emb: {
        queryString: "emb"
    },
    embHref: {
        queryString: "embHref"
    },
    dailyJsVersion: {
        queryString: "dailyJsVersion"
    },
    proxy: {
        queryString: "proxy"
    },
    strictMode: !0,
    allowMultipleCallInstances: !0
}
  , zr = {
    styles: {
        validate: function(r) {
            for (var e in r)
                if (e !== "cam" && e !== "screen")
                    return !1;
            if (r.cam) {
                for (var t in r.cam)
                    if (t !== "div" && t !== "video")
                        return !1
            }
            if (r.screen) {
                for (var n in r.screen)
                    if (n !== "div" && n !== "video")
                        return !1
            }
            return !0
        },
        help: "styles format should be a subset of: { cam: {div: {}, video: {}}, screen: {div: {}, video: {}} }"
    },
    setSubscribedTracks: {
        validate: function(r, e) {
            if (e._preloadCache.subscribeToTracksAutomatically)
                return !1;
            var t = [!0, !1, "staged"];
            if (t.includes(r) || !Y() && r === "avatar")
                return !0;
            var n = ["audio", "video", "screenAudio", "screenVideo", "rmpAudio", "rmpVideo"]
              , i = function(s) {
                var a = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
                for (var c in s)
                    if (c === "custom") {
                        if (!t.includes(s[c]) && !i(s[c], !0))
                            return !1
                    } else {
                        var l = !a && !n.includes(c)
                          , u = !t.includes(s[c]);
                        if (l || u)
                            return !1
                    }
                return !0
            };
            return i(r)
        },
        help: "setSubscribedTracks cannot be used when setSubscribeToTracksAutomatically is enabled, and should be of the form: " + "true".concat(Y() ? "" : " | 'avatar'", " | false | 'staged' | { [audio: true|false|'staged'], [video: true|false|'staged'], [screenAudio: true|false|'staged'], [screenVideo: true|false|'staged'] }")
    },
    setAudio: !0,
    setVideo: !0,
    setScreenShare: {
        validate: function(r) {
            return r === !1
        },
        help: "setScreenShare must be false, as it's only meant for stopping remote participants' screen shares"
    },
    eject: !0,
    updatePermissions: {
        validate: function(r) {
            for (var e = 0, t = Object.entries(r); e < t.length; e++) {
                var n = me(t[e], 2)
                  , i = n[0]
                  , s = n[1];
                switch (i) {
                case "hasPresence":
                    if (typeof s != "boolean")
                        return !1;
                    break;
                case "canSend":
                    if (s instanceof Set || s instanceof Array || Array.isArray(s)) {
                        var a, c = ["video", "audio", "screenVideo", "screenAudio", "customVideo", "customAudio"], l = qa(s);
                        try {
                            for (l.s(); !(a = l.n()).done; ) {
                                var u = a.value;
                                if (!c.includes(u))
                                    return !1
                            }
                        } catch (C) {
                            l.e(C)
                        } finally {
                            l.f()
                        }
                    } else if (typeof s != "boolean")
                        return !1;
                    (s instanceof Array || Array.isArray(s)) && (r.canSend = new Set(s));
                    break;
                case "canReceive":
                    var h = me(pc.validateJSONObject(s), 2)
                      , m = h[0]
                      , _ = h[1];
                    if (!m)
                        return console.error(_),
                        !1;
                    break;
                case "canAdmin":
                    if (s instanceof Set || s instanceof Array || Array.isArray(s)) {
                        var M, b = ["participants", "streaming", "transcription"], v = qa(s);
                        try {
                            for (v.s(); !(M = v.n()).done; ) {
                                var E = M.value;
                                if (!b.includes(E))
                                    return !1
                            }
                        } catch (C) {
                            v.e(C)
                        } finally {
                            v.f()
                        }
                    } else if (typeof s != "boolean")
                        return !1;
                    (s instanceof Array || Array.isArray(s)) && (r.canAdmin = new Set(s));
                    break;
                default:
                    return !1
                }
            }
            return !0
        },
        help: "updatePermissions can take hasPresence, canSend, canReceive, and canAdmin permissions. hasPresence must be a boolean. canSend can be a boolean or an Array or Set of media types (video, audio, screenVideo, screenAudio, customVideo, customAudio). canReceive must be an object specifying base, byUserId, and/or byParticipantId fields (see documentation for more details). canAdmin can be a boolean or an Array or Set of admin types (participants, streaming, transcription)."
    }
};
Promise.any || (Promise.any = (function() {
    var r = F((function*(e) {
        return new Promise((function(t, n) {
            var i = [];
            e.forEach((function(s) {
                return Promise.resolve(s).then((function(a) {
                    t(a)
                }
                )).catch((function(a) {
                    i.push(a),
                    i.length === e.length && n(i)
                }
                ))
            }
            ))
        }
        ))
    }
    ));
    return function(e) {
        return r.apply(this, arguments)
    }
}
)());
var Ya = (function() {
    function r(o) {
        var f, d, p, g, S, P, I = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        if (Te(this, r),
        p = this,
        g = Ve(g = r),
        Ge(d = vn(p, mc() ? Reflect.construct(g, [], Ve(p).constructor) : g.apply(p, S)), "startListeningForDeviceChanges", (function() {
            Zd(d.handleDeviceChange)
        }
        )),
        Ge(d, "stopListeningForDeviceChanges", (function() {
            ef(d.handleDeviceChange)
        }
        )),
        Ge(d, "handleDeviceChange", (function(J) {
            J = J.map((function(Q) {
                return JSON.parse(JSON.stringify(Q))
            }
            )),
            d.emitDailyJSEvent({
                action: "available-devices-updated",
                availableDevices: J
            })
        }
        )),
        Ge(d, "handleNativeAppStateChange", (function() {
            var J = F((function*(Q) {
                if (Q === "destroyed")
                    return console.warn("App has been destroyed before leaving the meeting. Cleaning up all the resources!"),
                    void (yield d.destroy());
                var qe = Q === "active";
                d.disableReactNativeAutoDeviceManagement("video") || (qe ? d.camUnmutedBeforeLosingNativeActiveState && d.setLocalVideo(!0) : (d.camUnmutedBeforeLosingNativeActiveState = d.localVideo(),
                d.camUnmutedBeforeLosingNativeActiveState && d.setLocalVideo(!1)))
            }
            ));
            return function(Q) {
                return J.apply(this, arguments)
            }
        }
        )()),
        Ge(d, "handleNativeAudioFocusChange", (function(J) {
            d.disableReactNativeAutoDeviceManagement("audio") || (d._hasNativeAudioFocus = J,
            d.toggleParticipantAudioBasedOnNativeAudioFocus(),
            d._hasNativeAudioFocus ? d.micUnmutedBeforeLosingNativeAudioFocus && d.setLocalAudio(!0) : (d.micUnmutedBeforeLosingNativeAudioFocus = d.localAudio(),
            d.setLocalAudio(!1)))
        }
        )),
        Ge(d, "handleNativeSystemScreenCaptureStop", (function() {
            d.stopScreenShare()
        }
        )),
        d.strictMode = I.strictMode === void 0 || I.strictMode,
        d.allowMultipleCallInstances = (f = I.allowMultipleCallInstances) !== null && f !== void 0 && f,
        Object.keys(Ot).length && (d._logDuplicateInstanceAttempt(),
        !d.allowMultipleCallInstances)) {
            if (d.strictMode)
                throw new Error("Duplicate DailyIframe instances are not allowed");
            console.warn("Using strictMode: false to allow multiple call instances is now deprecated. Set `allowMultipleCallInstances: true`")
        }
        if (window._daily || (window._daily = {
            pendings: [],
            instances: {}
        }),
        d.callClientId = yn(),
        Ot[(P = d).callClientId] = P,
        window._daily.instances[d.callClientId] = {},
        d._sharedTracks = {},
        window._daily.instances[d.callClientId].tracks = d._sharedTracks,
        I.dailyJsVersion = r.version(),
        d._iframe = o,
        d._callObjectMode = I.layout === "none" && !d._iframe,
        d._preloadCache = {
            subscribeToTracksAutomatically: !0,
            outputDeviceId: null,
            inputSettings: null,
            sendSettings: null,
            videoTrackForNetworkConnectivityTest: null,
            videoTrackForConnectionQualityTest: null
        },
        I.showLocalVideo !== void 0 ? d._callObjectMode ? console.error("showLocalVideo is not available in call object mode") : d._showLocalVideo = !!I.showLocalVideo : d._showLocalVideo = !0,
        I.showParticipantsBar !== void 0 ? d._callObjectMode ? console.error("showParticipantsBar is not available in call object mode") : d._showParticipantsBar = !!I.showParticipantsBar : d._showParticipantsBar = !0,
        I.customIntegrations !== void 0 ? d._callObjectMode ? console.error("customIntegrations is not available in call object mode") : d._customIntegrations = I.customIntegrations : d._customIntegrations = {},
        I.customTrayButtons !== void 0 ? d._callObjectMode ? console.error("customTrayButtons is not available in call object mode") : d._customTrayButtons = I.customTrayButtons : d._customTrayButtons = {},
        I.activeSpeakerMode !== void 0 ? d._callObjectMode ? console.error("activeSpeakerMode is not available in call object mode") : d._activeSpeakerMode = !!I.activeSpeakerMode : d._activeSpeakerMode = !1,
        I.receiveSettings ? d._callObjectMode ? d._receiveSettings = I.receiveSettings : console.error("receiveSettings is only available in call object mode") : d._receiveSettings = {},
        d.validateProperties(I),
        d.properties = R({}, I),
        d._inputSettings || (d._inputSettings = {}),
        d._callObjectLoader = d._callObjectMode ? new Vd(d.callClientId) : null,
        d._callState = fa,
        d._isPreparingToJoin = !1,
        d._accessState = {
            access: Rn
        },
        d._meetingSessionSummary = {},
        d._finalSummaryOfPrevSession = {},
        d._meetingSessionState = Jn(Ga, d._callObjectMode),
        d._nativeInCallAudioMode = Ja,
        d._participants = {},
        d._isScreenSharing = !1,
        d._participantCounts = Ka,
        d._rmpPlayerState = {},
        d._waitingParticipants = {},
        d._network = {
            threshold: "good",
            quality: 100,
            networkState: "unknown",
            stats: {}
        },
        d._activeSpeaker = {},
        d._localAudioLevel = 0,
        d._isLocalAudioLevelObserverRunning = !1,
        d._remoteParticipantsAudioLevel = {},
        d._isRemoteParticipantsAudioLevelObserverRunning = !1,
        d._maxAppMessageSize = Fn,
        d._messageChannel = Y() ? new $d : new jd,
        d._iframe && (d._iframe.requestFullscreen ? d._iframe.addEventListener("fullscreenchange", (function() {
            document.fullscreenElement === d._iframe ? (d.emitDailyJSEvent({
                action: Ur
            }),
            d.sendMessageToCallMachine({
                action: Ur
            })) : (d.emitDailyJSEvent({
                action: Vr
            }),
            d.sendMessageToCallMachine({
                action: Vr
            }))
        }
        )) : d._iframe.webkitRequestFullscreen && d._iframe.addEventListener("webkitfullscreenchange", (function() {
            document.webkitFullscreenElement === d._iframe ? (d.emitDailyJSEvent({
                action: Ur
            }),
            d.sendMessageToCallMachine({
                action: Ur
            })) : (d.emitDailyJSEvent({
                action: Vr
            }),
            d.sendMessageToCallMachine({
                action: Vr
            }))
        }
        ))),
        Y()) {
            var B = d.nativeUtils();
            B.addAudioFocusChangeListener && B.removeAudioFocusChangeListener && B.addAppStateChangeListener && B.removeAppStateChangeListener && B.addSystemScreenCaptureStopListener && B.removeSystemScreenCaptureStopListener || console.warn("expected (add|remove)(AudioFocusChange|AppActiveStateChange|SystemScreenCaptureStop)Listener to be available in React Native"),
            d._hasNativeAudioFocus = !0,
            B.addAudioFocusChangeListener(d.handleNativeAudioFocusChange),
            B.addAppStateChangeListener(d.handleNativeAppStateChange),
            B.addSystemScreenCaptureStopListener(d.handleNativeSystemScreenCaptureStop)
        }
        return d._callObjectMode && d.startListeningForDeviceChanges(),
        d._messageChannel.addListenerForMessagesFromCallMachine(d.handleMessageFromCallMachine, d.callClientId, d),
        d
    }
    return bn(r, Nr),
    Oe(r, [{
        key: "destroy",
        value: (cr = F((function*() {
            var o;
            try {
                yield this.leave()
            } catch {}
            var f = this._iframe;
            if (f) {
                var d = f.parentElement;
                d && d.removeChild(f)
            }
            if (this._messageChannel.removeListener(this.handleMessageFromCallMachine),
            Y()) {
                var p = this.nativeUtils();
                p.removeAudioFocusChangeListener(this.handleNativeAudioFocusChange),
                p.removeAppStateChangeListener(this.handleNativeAppStateChange),
                p.removeSystemScreenCaptureStopListener(this.handleNativeSystemScreenCaptureStop)
            }
            this._callObjectMode && this.stopListeningForDeviceChanges(),
            this.resetMeetingDependentVars(),
            this._destroyed = !0,
            this.emitDailyJSEvent({
                action: "call-instance-destroyed"
            }),
            delete Ot[this.callClientId],
            !((o = window) === null || o === void 0 || (o = o._daily) === null || o === void 0) && o.instances && delete window._daily.instances[this.callClientId],
            this.strictMode && (this.callClientId = void 0)
        }
        )),
        function() {
            return cr.apply(this, arguments)
        }
        )
    }, {
        key: "isDestroyed",
        value: function() {
            return !!this._destroyed
        }
    }, {
        key: "loadCss",
        value: function(o) {
            var f = o.bodyClass
              , d = o.cssFile
              , p = o.cssText;
            return H(),
            this.sendMessageToCallMachine({
                action: "load-css",
                cssFile: this.absoluteUrl(d),
                bodyClass: f,
                cssText: p
            }),
            this
        }
    }, {
        key: "iframe",
        value: function() {
            return H(),
            this._iframe
        }
    }, {
        key: "meetingState",
        value: function() {
            return this._callState
        }
    }, {
        key: "accessState",
        value: function() {
            return Be(this._callObjectMode, "accessState()"),
            this._accessState
        }
    }, {
        key: "participants",
        value: function() {
            return this._participants
        }
    }, {
        key: "participantCounts",
        value: function() {
            return this._participantCounts
        }
    }, {
        key: "waitingParticipants",
        value: function() {
            return Be(this._callObjectMode, "waitingParticipants()"),
            this._waitingParticipants
        }
    }, {
        key: "validateParticipantProperties",
        value: function(o, f) {
            for (var d in f) {
                if (!zr[d])
                    throw new Error("unrecognized updateParticipant property ".concat(d));
                if (zr[d].validate && !zr[d].validate(f[d], this, this._participants[o]))
                    throw new Error(zr[d].help)
            }
        }
    }, {
        key: "updateParticipant",
        value: function(o, f) {
            return this._participants.local && this._participants.local.session_id === o && (o = "local"),
            o && f && (this.validateParticipantProperties(o, f),
            this.sendMessageToCallMachine({
                action: "update-participant",
                id: o,
                properties: f
            })),
            this
        }
    }, {
        key: "updateParticipants",
        value: function(o) {
            var f = this._participants.local && this._participants.local.session_id;
            for (var d in o)
                d === f && (d = "local"),
                d && o[d] && this.validateParticipantProperties(d, o[d]);
            return this.sendMessageToCallMachine({
                action: "update-participants",
                participants: o
            }),
            this
        }
    }, {
        key: "updateWaitingParticipant",
        value: (kt = F((function*() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : ""
              , d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
            if (Be(this._callObjectMode, "updateWaitingParticipant()"),
            re(this._callState, "updateWaitingParticipant()"),
            typeof f != "string" || X(d) !== "object")
                throw new Error("updateWaitingParticipant() must take an id string and a updates object");
            return new Promise((function(p, g) {
                o.sendMessageToCallMachine({
                    action: "daily-method-update-waiting-participant",
                    id: f,
                    updates: d
                }, (function(S) {
                    S.error && g(S.error),
                    S.id || g(new Error("unknown error in updateWaitingParticipant()")),
                    p({
                        id: S.id
                    })
                }
                ))
            }
            ))
        }
        )),
        function() {
            return kt.apply(this, arguments)
        }
        )
    }, {
        key: "updateWaitingParticipants",
        value: (or = F((function*() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            if (Be(this._callObjectMode, "updateWaitingParticipants()"),
            re(this._callState, "updateWaitingParticipants()"),
            X(f) !== "object")
                throw new Error("updateWaitingParticipants() must take a mapping between ids and update objects");
            return new Promise((function(d, p) {
                o.sendMessageToCallMachine({
                    action: "daily-method-update-waiting-participants",
                    updatesById: f
                }, (function(g) {
                    g.error && p(g.error),
                    g.ids || p(new Error("unknown error in updateWaitingParticipants()")),
                    d({
                        ids: g.ids
                    })
                }
                ))
            }
            ))
        }
        )),
        function() {
            return or.apply(this, arguments)
        }
        )
    }, {
        key: "requestAccess",
        value: (wt = F((function*() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
              , d = f.access
              , p = d === void 0 ? {
                level: Lu
            } : d
              , g = f.name
              , S = g === void 0 ? "" : g;
            return Be(this._callObjectMode, "requestAccess()"),
            re(this._callState, "requestAccess()"),
            new Promise((function(P, I) {
                o.sendMessageToCallMachine({
                    action: "daily-method-request-access",
                    access: p,
                    name: S
                }, (function(B) {
                    B.error && I(B.error),
                    B.access || I(new Error("unknown error in requestAccess()")),
                    P({
                        access: B.access,
                        granted: B.granted
                    })
                }
                ))
            }
            ))
        }
        )),
        function() {
            return wt.apply(this, arguments)
        }
        )
    }, {
        key: "localAudio",
        value: function() {
            return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.audio.state) : null
        }
    }, {
        key: "localVideo",
        value: function() {
            return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.video.state) : null
        }
    }, {
        key: "setLocalAudio",
        value: function(o) {
            var f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
            return "forceDiscardTrack"in f && (Y() ? (console.warn("forceDiscardTrack option not supported in React Native; ignoring"),
            f = {}) : o && (console.warn("forceDiscardTrack option only supported when calling setLocalAudio(false); ignoring"),
            f = {})),
            this.sendMessageToCallMachine({
                action: "local-audio",
                state: o,
                options: f
            }),
            this
        }
    }, {
        key: "localScreenAudio",
        value: function() {
            return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.screenAudio.state) : null
        }
    }, {
        key: "localScreenVideo",
        value: function() {
            return this._participants.local ? !["blocked", "off"].includes(this._participants.local.tracks.screenVideo.state) : null
        }
    }, {
        key: "updateScreenShare",
        value: function(o) {
            if (this._isScreenSharing)
                return this.sendMessageToCallMachine({
                    action: "local-screen-update",
                    options: o
                }),
                this;
            console.warn("There is no screen share in progress. Try calling startScreenShare first.")
        }
    }, {
        key: "setLocalVideo",
        value: function(o) {
            return this.sendMessageToCallMachine({
                action: "local-video",
                state: o
            }),
            this
        }
    }, {
        key: "_setAllowLocalAudio",
        value: function(o) {
            if (this._preloadCache.allowLocalAudio = o,
            this._callMachineInitialized)
                return this.sendMessageToCallMachine({
                    action: "set-allow-local-audio",
                    state: o
                }),
                this
        }
    }, {
        key: "_setAllowLocalVideo",
        value: function(o) {
            if (this._preloadCache.allowLocalVideo = o,
            this._callMachineInitialized)
                return this.sendMessageToCallMachine({
                    action: "set-allow-local-video",
                    state: o
                }),
                this
        }
    }, {
        key: "getReceiveSettings",
        value: (ar = F((function*(o) {
            var f = this
              , d = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}).showInheritedValues
              , p = d !== void 0 && d;
            if (Be(this._callObjectMode, "getReceiveSettings()"),
            !this._callMachineInitialized)
                return this._receiveSettings;
            switch (X(o)) {
            case "string":
                return new Promise((function(g) {
                    f.sendMessageToCallMachine({
                        action: "get-single-participant-receive-settings",
                        id: o,
                        showInheritedValues: p
                    }, (function(S) {
                        g(S.receiveSettings)
                    }
                    ))
                }
                ));
            case "undefined":
                return this._receiveSettings;
            default:
                throw new Error('first argument to getReceiveSettings() must be a participant id (or "base"), or there should be no arguments')
            }
        }
        )),
        function(o) {
            return ar.apply(this, arguments)
        }
        )
    }, {
        key: "updateReceiveSettings",
        value: (_t = F((function*(o) {
            var f = this;
            if (Be(this._callObjectMode, "updateReceiveSettings()"),
            !bc(o, {
                allowAllParticipantsKey: !0
            }))
                throw new Error(wc({
                    allowAllParticipantsKey: !0
                }));
            return re(this._callState, "updateReceiveSettings()", "To specify receive settings earlier, use the receiveSettings config property."),
            new Promise((function(d) {
                f.sendMessageToCallMachine({
                    action: "update-receive-settings",
                    receiveSettings: o
                }, (function(p) {
                    d({
                        receiveSettings: p.receiveSettings
                    })
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return _t.apply(this, arguments)
        }
        )
    }, {
        key: "_prepInputSettingsForSharing",
        value: function(o, f) {
            if (o) {
                var d = {};
                if (o.audio) {
                    var p, g, S;
                    o.audio.settings && (!Object.keys(o.audio.settings).length && f || (d.audio = {
                        settings: R({}, o.audio.settings)
                    })),
                    f && (p = d.audio) !== null && p !== void 0 && (p = p.settings) !== null && p !== void 0 && p.customTrack && (d.audio.settings = {
                        customTrack: this._sharedTracks.audioTrack
                    });
                    var P = ((g = o.audio.processor) === null || g === void 0 ? void 0 : g.type) === "none" && ((S = o.audio.processor) === null || S === void 0 ? void 0 : S._isDefaultWhenNone);
                    if (o.audio.processor && !P) {
                        var I = R({}, o.audio.processor);
                        delete I._isDefaultWhenNone,
                        d.audio = R(R({}, d.audio), {}, {
                            processor: I
                        })
                    }
                }
                if (o.video) {
                    var B, J, Q;
                    o.video.settings && (!Object.keys(o.video.settings).length && f || (d.video = {
                        settings: R({}, o.video.settings)
                    })),
                    f && (B = d.video) !== null && B !== void 0 && (B = B.settings) !== null && B !== void 0 && B.customTrack && (d.video.settings = {
                        customTrack: this._sharedTracks.videoTrack
                    });
                    var qe = ((J = o.video.processor) === null || J === void 0 ? void 0 : J.type) === "none" && ((Q = o.video.processor) === null || Q === void 0 ? void 0 : Q._isDefaultWhenNone);
                    if (o.video.processor && !qe) {
                        var St = R({}, o.video.processor);
                        delete St._isDefaultWhenNone,
                        d.video = R(R({}, d.video), {}, {
                            processor: St
                        })
                    }
                }
                return d
            }
        }
    }, {
        key: "getInputSettings",
        value: function() {
            var o = this;
            return H(),
            new Promise((function(f) {
                f(o._getInputSettings())
            }
            ))
        }
    }, {
        key: "_getInputSettings",
        value: function() {
            var o, f, d, p, g, S, P = {
                processor: {
                    type: "none",
                    _isDefaultWhenNone: !0
                }
            };
            this._inputSettings ? (o = ((d = this._inputSettings) === null || d === void 0 ? void 0 : d.video) || P,
            f = ((p = this._inputSettings) === null || p === void 0 ? void 0 : p.audio) || P) : (o = ((g = this._preloadCache) === null || g === void 0 || (g = g.inputSettings) === null || g === void 0 ? void 0 : g.video) || P,
            f = ((S = this._preloadCache) === null || S === void 0 || (S = S.inputSettings) === null || S === void 0 ? void 0 : S.audio) || P);
            var I = {
                audio: f,
                video: o
            };
            return this._prepInputSettingsForSharing(I, !0)
        }
    }, {
        key: "_updatePreloadCacheInputSettings",
        value: function(o, f) {
            var d = this._inputSettings || {}
              , p = {};
            if (o.video) {
                var g, S, P;
                p.video = {},
                o.video.settings ? (p.video.settings = {},
                f || o.video.settings.customTrack || (P = d.video) === null || P === void 0 || !P.settings ? p.video.settings = o.video.settings : p.video.settings = R(R({}, d.video.settings), o.video.settings),
                Object.keys(p.video.settings).length || delete p.video.settings) : (g = d.video) !== null && g !== void 0 && g.settings && (p.video.settings = d.video.settings),
                o.video.processor ? p.video.processor = o.video.processor : (S = d.video) !== null && S !== void 0 && S.processor && (p.video.processor = d.video.processor)
            } else
                d.video && (p.video = d.video);
            if (o.audio) {
                var I, B, J;
                p.audio = {},
                o.audio.settings ? (p.audio.settings = {},
                f || o.audio.settings.customTrack || (J = d.audio) === null || J === void 0 || !J.settings ? p.audio.settings = o.audio.settings : p.audio.settings = R(R({}, d.audio.settings), o.audio.settings),
                Object.keys(p.audio.settings).length || delete p.audio.settings) : (I = d.audio) !== null && I !== void 0 && I.settings && (p.audio.settings = d.audio.settings),
                o.audio.processor ? p.audio.processor = o.audio.processor : (B = d.audio) !== null && B !== void 0 && B.processor && (p.audio.processor = d.audio.processor)
            } else
                d.audio && (p.audio = d.audio);
            this._maybeUpdateInputSettings(p)
        }
    }, {
        key: "_devicesFromInputSettings",
        value: function(o) {
            var f, d, p = (o == null || (f = o.video) === null || f === void 0 || (f = f.settings) === null || f === void 0 ? void 0 : f.deviceId) || null, g = (o == null || (d = o.audio) === null || d === void 0 || (d = d.settings) === null || d === void 0 ? void 0 : d.deviceId) || null, S = this._preloadCache.outputDeviceId || null;
            return {
                camera: p ? {
                    deviceId: p
                } : {},
                mic: g ? {
                    deviceId: g
                } : {},
                speaker: S ? {
                    deviceId: S
                } : {}
            }
        }
    }, {
        key: "updateInputSettings",
        value: (sr = F((function*(o) {
            var f = this;
            return H(),
            yc(o) ? o.video || o.audio ? (_c(o, this.properties.dailyConfig, this._sharedTracks),
            this._callObjectMode && !this._callMachineInitialized ? (this._updatePreloadCacheInputSettings(o, !0),
            this._getInputSettings()) : new Promise((function(d, p) {
                f.sendMessageToCallMachine({
                    action: "update-input-settings",
                    inputSettings: o
                }, (function(g) {
                    if (g.error)
                        p(g.error);
                    else {
                        if (g.returnPreloadCache)
                            return f._updatePreloadCacheInputSettings(o, !0),
                            void d(f._getInputSettings());
                        f._maybeUpdateInputSettings(g.inputSettings),
                        d(f._prepInputSettingsForSharing(g.inputSettings, !0))
                    }
                }
                ))
            }
            ))) : this._getInputSettings() : (console.error(Si()),
            Promise.reject(Si()))
        }
        )),
        function(o) {
            return sr.apply(this, arguments)
        }
        )
    }, {
        key: "setBandwidth",
        value: function(o) {
            var f = o.kbs
              , d = o.trackConstraints;
            if (H(),
            this._callMachineInitialized)
                return this.sendMessageToCallMachine({
                    action: "set-bandwidth",
                    kbs: f,
                    trackConstraints: d
                }),
                this
        }
    }, {
        key: "getDailyLang",
        value: function() {
            var o = this;
            if (H(),
            this._callMachineInitialized)
                return new Promise((function(f) {
                    o.sendMessageToCallMachine({
                        action: "get-daily-lang"
                    }, (function(d) {
                        delete d.action,
                        delete d.callbackStamp,
                        f(d)
                    }
                    ))
                }
                ))
        }
    }, {
        key: "setDailyLang",
        value: function(o) {
            return H(),
            this.sendMessageToCallMachine({
                action: "set-daily-lang",
                lang: o
            }),
            this
        }
    }, {
        key: "setProxyUrl",
        value: function(o) {
            return this.sendMessageToCallMachine({
                action: "set-proxy-url",
                proxyUrl: o
            }),
            this
        }
    }, {
        key: "setIceConfig",
        value: function(o) {
            return this.sendMessageToCallMachine({
                action: "set-ice-config",
                iceConfig: o
            }),
            this
        }
    }, {
        key: "meetingSessionSummary",
        value: function() {
            return [Tt, st].includes(this._callState) ? this._finalSummaryOfPrevSession : this._meetingSessionSummary
        }
    }, {
        key: "getMeetingSession",
        value: (yt = F((function*() {
            var o = this;
            return console.warn("getMeetingSession() is deprecated: use meetingSessionSummary(), which will return immediately"),
            re(this._callState, "getMeetingSession()"),
            new Promise((function(f) {
                o.sendMessageToCallMachine({
                    action: "get-meeting-session"
                }, (function(d) {
                    delete d.action,
                    delete d.callbackStamp,
                    f(d)
                }
                ))
            }
            ))
        }
        )),
        function() {
            return yt.apply(this, arguments)
        }
        )
    }, {
        key: "meetingSessionState",
        value: function() {
            return re(this._callState, "meetingSessionState"),
            this._meetingSessionState
        }
    }, {
        key: "setMeetingSessionData",
        value: function(o) {
            var f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "replace";
            Be(this._callObjectMode, "setMeetingSessionData()"),
            re(this._callState, "setMeetingSessionData");
            try {
                (function(d, p) {
                    new Ud({
                        data: d,
                        mergeStrategy: p
                    })
                }
                )(o, f)
            } catch (d) {
                throw console.error(d),
                d
            }
            try {
                this.sendMessageToCallMachine({
                    action: "set-session-data",
                    data: o,
                    mergeStrategy: f
                })
            } catch (d) {
                throw new Error("Error setting meeting session data: ".concat(d))
            }
        }
    }, {
        key: "setUserName",
        value: function(o, f) {
            var d = this;
            return this.properties.userName = o,
            new Promise((function(p) {
                d.sendMessageToCallMachine({
                    action: "set-user-name",
                    name: o ?? "",
                    thisMeetingOnly: Y() || !!f && !!f.thisMeetingOnly
                }, (function(g) {
                    delete g.action,
                    delete g.callbackStamp,
                    p(g)
                }
                ))
            }
            ))
        }
    }, {
        key: "setUserData",
        value: (bt = F((function*(o) {
            var f = this;
            try {
                vc(o)
            } catch (d) {
                throw console.error(d),
                d
            }
            if (this.properties.userData = o,
            this._callMachineInitialized)
                return new Promise((function(d) {
                    try {
                        f.sendMessageToCallMachine({
                            action: "set-user-data",
                            userData: o
                        }, (function(p) {
                            delete p.action,
                            delete p.callbackStamp,
                            d(p)
                        }
                        ))
                    } catch (p) {
                        throw new Error("Error setting user data: ".concat(p))
                    }
                }
                ))
        }
        )),
        function(o) {
            return bt.apply(this, arguments)
        }
        )
    }, {
        key: "validateAudioLevelInterval",
        value: function(o) {
            if (o && (o < 100 || typeof o != "number"))
                throw new Error("The interval must be a number greater than or equal to 100 milliseconds.")
        }
    }, {
        key: "startLocalAudioLevelObserver",
        value: function(o) {
            var f = this;
            if (typeof AudioWorkletNode > "u" && !Y())
                throw new Error("startLocalAudioLevelObserver() is not supported on this browser");
            if (this.validateAudioLevelInterval(o),
            this._callMachineInitialized)
                return this._isLocalAudioLevelObserverRunning = !0,
                new Promise((function(d, p) {
                    f.sendMessageToCallMachine({
                        action: "start-local-audio-level-observer",
                        interval: o
                    }, (function(g) {
                        f._isLocalAudioLevelObserverRunning = !g.error,
                        g.error ? p({
                            error: g.error
                        }) : d()
                    }
                    ))
                }
                ));
            this._preloadCache.localAudioLevelObserver = {
                enabled: !0,
                interval: o
            }
        }
    }, {
        key: "isLocalAudioLevelObserverRunning",
        value: function() {
            return this._isLocalAudioLevelObserverRunning
        }
    }, {
        key: "stopLocalAudioLevelObserver",
        value: function() {
            this._preloadCache.localAudioLevelObserver = null,
            this._localAudioLevel = 0,
            this._isLocalAudioLevelObserverRunning = !1,
            this.sendMessageToCallMachine({
                action: "stop-local-audio-level-observer"
            })
        }
    }, {
        key: "startRemoteParticipantsAudioLevelObserver",
        value: function(o) {
            var f = this;
            if (this.validateAudioLevelInterval(o),
            this._callMachineInitialized)
                return this._isRemoteParticipantsAudioLevelObserverRunning = !0,
                new Promise((function(d, p) {
                    f.sendMessageToCallMachine({
                        action: "start-remote-participants-audio-level-observer",
                        interval: o
                    }, (function(g) {
                        f._isRemoteParticipantsAudioLevelObserverRunning = !g.error,
                        g.error ? p({
                            error: g.error
                        }) : d()
                    }
                    ))
                }
                ));
            this._preloadCache.remoteParticipantsAudioLevelObserver = {
                enabled: !0,
                interval: o
            }
        }
    }, {
        key: "isRemoteParticipantsAudioLevelObserverRunning",
        value: function() {
            return this._isRemoteParticipantsAudioLevelObserverRunning
        }
    }, {
        key: "stopRemoteParticipantsAudioLevelObserver",
        value: function() {
            this._preloadCache.remoteParticipantsAudioLevelObserver = null,
            this._remoteParticipantsAudioLevel = {},
            this._isRemoteParticipantsAudioLevelObserverRunning = !1,
            this.sendMessageToCallMachine({
                action: "stop-remote-participants-audio-level-observer"
            })
        }
    }, {
        key: "startCamera",
        value: (We = F((function*() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            if (Be(this._callObjectMode, "startCamera()"),
            qn(this._callState, this._isPreparingToJoin, "startCamera()", "Did you mean to use setLocalAudio() and/or setLocalVideo() instead?"),
            this.needsLoad())
                try {
                    yield this.load(f)
                } catch (d) {
                    return Promise.reject(d)
                }
            else {
                if (this._didPreAuth) {
                    if (f.url && f.url !== this.properties.url)
                        return console.error("url in startCamera() is different than the one used in preAuth()"),
                        Promise.reject();
                    if (f.token && f.token !== this.properties.token)
                        return console.error("token in startCamera() is different than the one used in preAuth()"),
                        Promise.reject()
                }
                this.validateProperties(f),
                this.properties = R(R({}, this.properties), f)
            }
            return new Promise((function(d) {
                o._preloadCache.inputSettings = o._prepInputSettingsForSharing(o._inputSettings, !1),
                o.sendMessageToCallMachine({
                    action: "start-camera",
                    properties: Wt(o.properties, o.callClientId),
                    preloadCache: Wt(o._preloadCache, o.callClientId)
                }, (function(p) {
                    d({
                        camera: p.camera,
                        mic: p.mic,
                        speaker: p.speaker
                    })
                }
                ))
            }
            ))
        }
        )),
        function() {
            return We.apply(this, arguments)
        }
        )
    }, {
        key: "validateCustomTrack",
        value: function(o, f, d) {
            if (d && d.length > 50)
                throw new Error("Custom track `trackName` must not be more than 50 characters");
            if (f && f !== "music" && f !== "speech" && !(f instanceof Object))
                throw new Error("Custom track `mode` must be either `music` | `speech` | `DailyMicAudioModeSettings` or `undefined`");
            if (d && ["cam-audio", "cam-video", "screen-video", "screen-audio", "rmpAudio", "rmpVideo", "customVideoDefaults"].includes(d))
                throw new Error("Custom track `trackName` must not match a track name already used by daily: cam-audio, cam-video, customVideoDefaults, screen-video, screen-audio, rmpAudio, rmpVideo");
            if (!(o instanceof MediaStreamTrack))
                throw new Error("Custom tracks provided must be instances of MediaStreamTrack")
        }
    }, {
        key: "startCustomTrack",
        value: function() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {
                track,
                mode,
                trackName,
                ignoreAudioLevel
            };
            return H(),
            re(this._callState, "startCustomTrack()"),
            this.validateCustomTrack(f.track, f.mode, f.trackName),
            new Promise((function(d, p) {
                o._sharedTracks.customTrack = f.track,
                f.track = nt,
                o.sendMessageToCallMachine({
                    action: "start-custom-track",
                    properties: f
                }, (function(g) {
                    g.error ? p({
                        error: g.error
                    }) : d(g.mediaTag)
                }
                ))
            }
            ))
        }
    }, {
        key: "stopCustomTrack",
        value: function(o) {
            var f = this;
            return H(),
            re(this._callState, "stopCustomTrack()"),
            new Promise((function(d) {
                f.sendMessageToCallMachine({
                    action: "stop-custom-track",
                    mediaTag: o
                }, (function(p) {
                    d(p.mediaTag)
                }
                ))
            }
            ))
        }
    }, {
        key: "setCamera",
        value: function(o) {
            var f = this;
            return pr(),
            Jr(this._callMachineInitialized, "setCamera()"),
            new Promise((function(d) {
                f.sendMessageToCallMachine({
                    action: "set-camera",
                    cameraDeviceId: o
                }, (function(p) {
                    d({
                        device: p.device
                    })
                }
                ))
            }
            ))
        }
    }, {
        key: "setAudioDevice",
        value: (Le = F((function*(o) {
            return pr(),
            this.nativeUtils().setAudioDevice(o),
            {
                deviceId: yield this.nativeUtils().getAudioDevice()
            }
        }
        )),
        function(o) {
            return Le.apply(this, arguments)
        }
        )
    }, {
        key: "cycleCamera",
        value: function() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            return new Promise((function(d) {
                o.sendMessageToCallMachine({
                    action: "cycle-camera",
                    properties: f
                }, (function(p) {
                    d({
                        device: p.device
                    })
                }
                ))
            }
            ))
        }
    }, {
        key: "cycleMic",
        value: function() {
            var o = this;
            return H(),
            new Promise((function(f) {
                o.sendMessageToCallMachine({
                    action: "cycle-mic"
                }, (function(d) {
                    f({
                        device: d.device
                    })
                }
                ))
            }
            ))
        }
    }, {
        key: "getCameraFacingMode",
        value: function() {
            var o = this;
            return pr(),
            new Promise((function(f) {
                o.sendMessageToCallMachine({
                    action: "get-camera-facing-mode"
                }, (function(d) {
                    f(d.facingMode)
                }
                ))
            }
            ))
        }
    }, {
        key: "setInputDevicesAsync",
        value: (ae = F((function*(o) {
            var f = this
              , d = o.audioDeviceId
              , p = o.videoDeviceId
              , g = o.audioSource
              , S = o.videoSource;
            if (H(),
            g !== void 0 && (d = g),
            S !== void 0 && (p = S),
            typeof d == "boolean" && (this._setAllowLocalAudio(d),
            d = void 0),
            typeof p == "boolean" && (this._setAllowLocalVideo(p),
            p = void 0),
            !d && !p)
                return yield this.getInputDevices();
            var P = {};
            return d && (d instanceof MediaStreamTrack ? (this._sharedTracks.audioTrack = d,
            d = nt,
            P.audio = {
                settings: {
                    customTrack: d
                }
            }) : (delete this._sharedTracks.audioTrack,
            P.audio = {
                settings: {
                    deviceId: d
                }
            })),
            p && (p instanceof MediaStreamTrack ? (this._sharedTracks.videoTrack = p,
            p = nt,
            P.video = {
                settings: {
                    customTrack: p
                }
            }) : (delete this._sharedTracks.videoTrack,
            P.video = {
                settings: {
                    deviceId: p
                }
            })),
            this._callObjectMode && this.needsLoad() ? (this._updatePreloadCacheInputSettings(P, !1),
            this._devicesFromInputSettings(this._inputSettings)) : new Promise((function(I) {
                f.sendMessageToCallMachine({
                    action: "set-input-devices",
                    audioDeviceId: d,
                    videoDeviceId: p
                }, (function(B) {
                    if (delete B.action,
                    delete B.callbackStamp,
                    B.returnPreloadCache)
                        return f._updatePreloadCacheInputSettings(P, !1),
                        void I(f._devicesFromInputSettings(f._inputSettings));
                    I(B)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return ae.apply(this, arguments)
        }
        )
    }, {
        key: "setOutputDeviceAsync",
        value: (U = F((function*(o) {
            var f = this
              , d = o.outputDeviceId;
            if (H(),
            !d || typeof d != "string")
                throw new Error("outputDeviceId must be provided and must be a valid device id");
            return this._preloadCache.outputDeviceId = d,
            this._callObjectMode && this.needsLoad() ? this._devicesFromInputSettings(this._inputSettings) : new Promise((function(p, g) {
                f.sendMessageToCallMachine({
                    action: "set-output-device",
                    outputDeviceId: d
                }, (function(S) {
                    if (delete S.action,
                    delete S.callbackStamp,
                    S.error) {
                        var P = new Error(S.error.message);
                        return P.type = S.error.type,
                        void g(P)
                    }
                    S.returnPreloadCache ? p(f._devicesFromInputSettings(f._inputSettings)) : p(S)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return U.apply(this, arguments)
        }
        )
    }, {
        key: "getInputDevices",
        value: (q = F((function*() {
            var o = this;
            return this._callObjectMode && this.needsLoad() ? this._devicesFromInputSettings(this._inputSettings) : new Promise((function(f) {
                o.sendMessageToCallMachine({
                    action: "get-input-devices"
                }, (function(d) {
                    d.returnPreloadCache ? f(o._devicesFromInputSettings(o._inputSettings)) : f({
                        camera: d.camera,
                        mic: d.mic,
                        speaker: d.speaker
                    })
                }
                ))
            }
            ))
        }
        )),
        function() {
            return q.apply(this, arguments)
        }
        )
    }, {
        key: "nativeInCallAudioMode",
        value: function() {
            return pr(),
            this._nativeInCallAudioMode
        }
    }, {
        key: "setNativeInCallAudioMode",
        value: function(o) {
            if (pr(),
            [Ja, cf].includes(o)) {
                if (o !== this._nativeInCallAudioMode)
                    return this._nativeInCallAudioMode = o,
                    !this.disableReactNativeAutoDeviceManagement("audio") && en(this._callState, this._isPreparingToJoin) && this.nativeUtils().setAudioMode(this._nativeInCallAudioMode),
                    this
            } else
                console.error("invalid in-call audio mode specified: ", o)
        }
    }, {
        key: "preAuth",
        value: (D = F((function*() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            if (Be(this._callObjectMode, "preAuth()"),
            qn(this._callState, this._isPreparingToJoin, "preAuth()"),
            this.needsLoad() && (yield this.load(f)),
            !f.url)
                throw new Error("preAuth() requires at least a url to be provided");
            return this.validateProperties(f),
            this.properties = R(R({}, this.properties), f),
            new Promise((function(d, p) {
                o._preloadCache.inputSettings = o._prepInputSettingsForSharing(o._inputSettings, !1),
                o.sendMessageToCallMachine({
                    action: "daily-method-preauth",
                    properties: Wt(o.properties, o.callClientId),
                    preloadCache: Wt(o._preloadCache, o.callClientId)
                }, (function(g) {
                    return g.error ? p(g.error) : g.access ? (o._didPreAuth = !0,
                    void d({
                        access: g.access
                    })) : p(new Error("unknown error in preAuth()"))
                }
                ))
            }
            ))
        }
        )),
        function() {
            return D.apply(this, arguments)
        }
        )
    }, {
        key: "load",
        value: (L = F((function*(o) {
            var f = this;
            if (this.needsLoad()) {
                if (this._destroyed && (this._logUseAfterDestroy(),
                this.strictMode))
                    throw new Error("Use after destroy");
                if (o && (this.validateProperties(o),
                this.properties = R(R({}, this.properties), o)),
                !this._callObjectMode && !this.properties.url)
                    throw new Error("can't load iframe meeting because url property isn't set");
                return this._updateCallState(ha),
                this.emitDailyJSEvent({
                    action: Uu
                }),
                this._callObjectMode ? new Promise((function(d, p) {
                    f._callObjectLoader.cancel();
                    var g = Date.now();
                    f._callObjectLoader.load(f.properties.dailyConfig, (function(S) {
                        f._bundleLoadTime = S ? "no-op" : Date.now() - g,
                        f._updateCallState(pa),
                        S && f.emitDailyJSEvent({
                            action: ga
                        }),
                        d()
                    }
                    ), (function(S, P) {
                        if (f.emitDailyJSEvent({
                            action: Vu
                        }),
                        !P) {
                            f._updateCallState(st),
                            f.resetMeetingDependentVars();
                            var I = {
                                action: wa,
                                errorMsg: S.msg,
                                error: {
                                    type: "connection-error",
                                    msg: "Failed to load call object bundle.",
                                    details: {
                                        on: "load",
                                        sourceError: S,
                                        bundleUrl: rn(f.properties.dailyConfig)
                                    }
                                }
                            };
                            f._maybeSendToSentry(I),
                            f.emitDailyJSEvent(I),
                            p(S.msg)
                        }
                    }
                    ))
                }
                )) : (this._iframe.src = jo(this.assembleMeetingUrl(), this.properties.dailyConfig),
                new Promise((function(d, p) {
                    f._loadedCallback = function(g) {
                        f._callState !== st ? (f._updateCallState(pa),
                        (f.properties.cssFile || f.properties.cssText) && f.loadCss(f.properties),
                        d()) : p(g)
                    }
                }
                )))
            }
        }
        )),
        function(o) {
            return L.apply(this, arguments)
        }
        )
    }, {
        key: "join",
        value: (T = F((function*() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            this._testCallInProgress && this.stopTestCallQuality();
            var d = !1;
            if (this.needsLoad()) {
                this.updateIsPreparingToJoin(!0);
                try {
                    yield this.load(f)
                } catch (p) {
                    return this.updateIsPreparingToJoin(!1),
                    Promise.reject(p)
                }
            } else {
                if (d = !(!this.properties.cssFile && !this.properties.cssText),
                this._didPreAuth) {
                    if (f.url && f.url !== this.properties.url)
                        return console.error("url in join() is different than the one used in preAuth()"),
                        this.updateIsPreparingToJoin(!1),
                        Promise.reject();
                    if (f.token && f.token !== this.properties.token)
                        return console.error("token in join() is different than the one used in preAuth()"),
                        this.updateIsPreparingToJoin(!1),
                        Promise.reject()
                }
                if (f.url && !this._callObjectMode && f.url && f.url !== this.properties.url)
                    return console.error("url in join() is different than the one used in load() (".concat(this.properties.url, " -> ").concat(f.url, ")")),
                    this.updateIsPreparingToJoin(!1),
                    Promise.reject();
                this.validateProperties(f),
                this.properties = R(R({}, this.properties), f)
            }
            return f.showLocalVideo !== void 0 && (this._callObjectMode ? console.error("showLocalVideo is not available in callObject mode") : this._showLocalVideo = !!f.showLocalVideo),
            f.showParticipantsBar !== void 0 && (this._callObjectMode ? console.error("showParticipantsBar is not available in callObject mode") : this._showParticipantsBar = !!f.showParticipantsBar),
            this._callState === xt || this._callState === gi ? (console.warn("already joined meeting, call leave() before joining again"),
            void this.updateIsPreparingToJoin(!1)) : (this._updateCallState(gi, !1),
            this.emitDailyJSEvent({
                action: zu
            }),
            this._preloadCache.inputSettings = this._prepInputSettingsForSharing(this._inputSettings || {}, !1),
            this.sendMessageToCallMachine({
                action: "join-meeting",
                properties: Wt(this.properties, this.callClientId),
                preloadCache: Wt(this._preloadCache, this.callClientId)
            }),
            new Promise((function(p, g) {
                o._joinedCallback = function(S, P) {
                    if (o._callState !== st) {
                        if (o._updateCallState(xt),
                        S)
                            for (var I in S) {
                                if (o._callObjectMode) {
                                    var B = o._callMachine().store;
                                    La(S[I], B),
                                    Ba(S[I], B),
                                    Da(S[I], o._participants[I], B)
                                }
                                o._participants[I] = R({}, S[I]),
                                o.toggleParticipantAudioBasedOnNativeAudioFocus()
                            }
                        d && o.loadCss(o.properties),
                        p(S)
                    } else
                        g(P)
                }
            }
            )))
        }
        )),
        function() {
            return T.apply(this, arguments)
        }
        )
    }, {
        key: "leave",
        value: (w = F((function*() {
            var o = this;
            return this._testCallInProgress && this.stopTestCallQuality(),
            new Promise((function(f) {
                o._callState === Tt || o._callState === st ? f() : o._callObjectLoader && !o._callObjectLoader.loaded ? (o._callObjectLoader.cancel(),
                o._updateCallState(Tt),
                o.resetMeetingDependentVars(),
                o.emitDailyJSEvent({
                    action: Tt
                }),
                f()) : (o._resolveLeave = f,
                o.sendMessageToCallMachine({
                    action: "leave-meeting"
                }))
            }
            ))
        }
        )),
        function() {
            return w.apply(this, arguments)
        }
        )
    }, {
        key: "startScreenShare",
        value: (k = F((function*() {
            var o = this
              , f = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            if (Jr(this._callMachineInitialized, "startScreenShare()"),
            f.screenVideoSendSettings && this._validateVideoSendSettings("screenVideo", f.screenVideoSendSettings),
            f.mediaStream && (this._sharedTracks.screenMediaStream = f.mediaStream,
            f.mediaStream = nt),
            typeof DailyNativeUtils < "u" && DailyNativeUtils.isIOS !== void 0 && DailyNativeUtils.isIOS) {
                var d = this.nativeUtils();
                if (yield d.isScreenBeingCaptured())
                    return void this.emitDailyJSEvent({
                        action: _a,
                        type: "screen-share-error",
                        errorMsg: "Could not start the screen sharing. The screen is already been captured!"
                    });
                d.setSystemScreenCaptureStartCallback((function() {
                    d.setSystemScreenCaptureStartCallback(null),
                    o.sendMessageToCallMachine({
                        action: Sa,
                        captureOptions: f
                    })
                }
                )),
                d.presentSystemScreenCapturePrompt()
            } else
                this.sendMessageToCallMachine({
                    action: Sa,
                    captureOptions: f
                })
        }
        )),
        function() {
            return k.apply(this, arguments)
        }
        )
    }, {
        key: "stopScreenShare",
        value: function() {
            Jr(this._callMachineInitialized, "stopScreenShare()"),
            this.sendMessageToCallMachine({
                action: "local-screen-stop"
            })
        }
    }, {
        key: "startRecording",
        value: function() {
            var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
              , f = o.type;
            if (f && f !== "cloud" && f !== "raw-tracks" && f !== "local")
                throw new Error("invalid type: ".concat(f, ", allowed values 'cloud', 'raw-tracks', or 'local'"));
            this.sendMessageToCallMachine(R({
                action: "local-recording-start"
            }, o))
        }
    }, {
        key: "updateRecording",
        value: function(o) {
            var f = o.layout
              , d = f === void 0 ? {
                preset: "default"
            } : f
              , p = o.instanceId;
            this.sendMessageToCallMachine({
                action: "daily-method-update-recording",
                layout: d,
                instanceId: p
            })
        }
    }, {
        key: "stopRecording",
        value: function() {
            var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            this.sendMessageToCallMachine(R({
                action: "local-recording-stop"
            }, o))
        }
    }, {
        key: "startLiveStreaming",
        value: function() {
            var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            this.sendMessageToCallMachine(R({
                action: "daily-method-start-live-streaming"
            }, o))
        }
    }, {
        key: "updateLiveStreaming",
        value: function(o) {
            var f = o.layout
              , d = f === void 0 ? {
                preset: "default"
            } : f
              , p = o.instanceId;
            this.sendMessageToCallMachine({
                action: "daily-method-update-live-streaming",
                layout: d,
                instanceId: p
            })
        }
    }, {
        key: "addLiveStreamingEndpoints",
        value: function(o) {
            var f = o.endpoints
              , d = o.instanceId;
            this.sendMessageToCallMachine({
                action: Ea,
                endpointsOp: Nd,
                endpoints: f,
                instanceId: d
            })
        }
    }, {
        key: "removeLiveStreamingEndpoints",
        value: function(o) {
            var f = o.endpoints
              , d = o.instanceId;
            this.sendMessageToCallMachine({
                action: Ea,
                endpointsOp: Ld,
                endpoints: f,
                instanceId: d
            })
        }
    }, {
        key: "stopLiveStreaming",
        value: function() {
            var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            this.sendMessageToCallMachine(R({
                action: "daily-method-stop-live-streaming"
            }, o))
        }
    }, {
        key: "validateDailyConfig",
        value: function(o) {
            o.camSimulcastEncodings && (console.warn("camSimulcastEncodings is deprecated. Use sendSettings, found in DailyCallOptions, to provide camera simulcast settings."),
            this.validateSimulcastEncodings(o.camSimulcastEncodings)),
            o.screenSimulcastEncodings && console.warn("screenSimulcastEncodings is deprecated. Use sendSettings, found in DailyCallOptions, to provide screen simulcast settings."),
            sc() && o.noAutoDefaultDeviceChange && console.warn("noAutoDefaultDeviceChange is not supported on Android, and will be ignored.")
        }
    }, {
        key: "validateSimulcastEncodings",
        value: function(o) {
            var f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null
              , d = arguments.length > 2 && arguments[2] !== void 0 && arguments[2];
            if (o) {
                if (!(o instanceof Array || Array.isArray(o)))
                    throw new Error("encodings must be an Array");
                if (!to(o.length, 1, 3))
                    throw new Error("encodings must be an Array with between 1 to ".concat(3, " layers"));
                for (var p = 0; p < o.length; p++) {
                    var g = o[p];
                    for (var S in this._validateEncodingLayerHasValidProperties(g),
                    g)
                        if (Wn.includes(S)) {
                            if (typeof g[S] != "number")
                                throw new Error("".concat(S, " must be a number"));
                            if (f) {
                                var P = f[S]
                                  , I = P.min
                                  , B = P.max;
                                if (!to(g[S], I, B))
                                    throw new Error("".concat(S, " value not in range. valid range: ").concat(I, " to ").concat(B))
                            }
                        } else if (!["active", "scalabilityMode"].includes(S))
                            throw new Error("Invalid key ".concat(S, ", valid keys are:") + Object.values(Wn));
                    if (d && !g.hasOwnProperty("maxBitrate"))
                        throw new Error("maxBitrate is not specified")
                }
            }
        }
    }, {
        key: "startRemoteMediaPlayer",
        value: (N = F((function*(o) {
            var f = this
              , d = o.url
              , p = o.settings
              , g = p === void 0 ? {
                state: vi.PLAY
            } : p;
            try {
                (function(S) {
                    if (typeof S != "string")
                        throw new Error('url parameter must be "string" type')
                }
                )(d),
                eo(g),
                (function(S) {
                    for (var P in S)
                        if (!Ha.includes(P))
                            throw new Error("Invalid key ".concat(P, ", valid keys are: ").concat(Ha));
                    S.simulcastEncodings && this.validateSimulcastEncodings(S.simulcastEncodings, gc, !0)
                }
                )(g)
            } catch (S) {
                throw console.error("invalid argument Error: ".concat(S)),
                console.error(`startRemoteMediaPlayer arguments must be of the form:
  { url: "playback url",
  settings?:
  {state: "play"|"pause", simulcastEncodings?: [{}] } }`),
                S
            }
            return new Promise((function(S, P) {
                f.sendMessageToCallMachine({
                    action: "daily-method-start-remote-media-player",
                    url: d,
                    settings: g
                }, (function(I) {
                    I.error ? P({
                        error: I.error,
                        errorMsg: I.errorMsg
                    }) : S({
                        session_id: I.session_id,
                        remoteMediaPlayerState: {
                            state: I.state,
                            settings: I.settings
                        }
                    })
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return N.apply(this, arguments)
        }
        )
    }, {
        key: "stopRemoteMediaPlayer",
        value: (x = F((function*(o) {
            var f = this;
            if (typeof o != "string")
                throw new Error(" remotePlayerID must be of type string");
            return new Promise((function(d, p) {
                f.sendMessageToCallMachine({
                    action: "daily-method-stop-remote-media-player",
                    session_id: o
                }, (function(g) {
                    g.error ? p({
                        error: g.error,
                        errorMsg: g.errorMsg
                    }) : d()
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return x.apply(this, arguments)
        }
        )
    }, {
        key: "updateRemoteMediaPlayer",
        value: (C = F((function*(o) {
            var f = this
              , d = o.session_id
              , p = o.settings;
            try {
                eo(p)
            } catch (g) {
                throw console.error("invalid argument Error: ".concat(g)),
                console.error(`updateRemoteMediaPlayer arguments must be of the form:
  session_id: "participant session",
  { settings?: {state: "play"|"pause"} }`),
                g
            }
            return new Promise((function(g, S) {
                f.sendMessageToCallMachine({
                    action: "daily-method-update-remote-media-player",
                    session_id: d,
                    settings: p
                }, (function(P) {
                    P.error ? S({
                        error: P.error,
                        errorMsg: P.errorMsg
                    }) : g({
                        session_id: P.session_id,
                        remoteMediaPlayerState: {
                            state: P.state,
                            settings: P.settings
                        }
                    })
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return C.apply(this, arguments)
        }
        )
    }, {
        key: "startTranscription",
        value: function(o) {
            re(this._callState, "startTranscription()"),
            this.sendMessageToCallMachine(R({
                action: "daily-method-start-transcription"
            }, o))
        }
    }, {
        key: "updateTranscription",
        value: function(o) {
            if (re(this._callState, "updateTranscription()"),
            !o)
                throw new Error("updateTranscription Error: options is mandatory");
            if (X(o) !== "object")
                throw new Error("updateTranscription Error: options must be object type");
            if (o.participants && !Array.isArray(o.participants))
                throw new Error("updateTranscription Error: participants must be an array");
            this.sendMessageToCallMachine(R({
                action: "daily-method-update-transcription"
            }, o))
        }
    }, {
        key: "stopTranscription",
        value: function(o) {
            if (re(this._callState, "stopTranscription()"),
            o && X(o) !== "object")
                throw new Error("stopTranscription Error: options must be object type");
            if (o && !o.instanceId)
                throw new Error('"instanceId" not provided');
            this.sendMessageToCallMachine(R({
                action: "daily-method-stop-transcription"
            }, o))
        }
    }, {
        key: "startDialOut",
        value: (E = F((function*(o) {
            var f = this;
            re(this._callState, "startDialOut()");
            var d = function(P) {
                if (P) {
                    if (!Array.isArray(P))
                        throw new Error("Error starting dial out: audio codec must be an array");
                    if (P.length <= 0)
                        throw new Error("Error starting dial out: audio codec array specified but empty");
                    P.forEach((function(I) {
                        if (typeof I != "string")
                            throw new Error("Error starting dial out: audio codec must be a string");
                        if (I !== "OPUS" && I !== "PCMU" && I !== "PCMA" && I !== "G722")
                            throw new Error("Error starting dial out: audio codec must be one of OPUS, PCMU, PCMA, G722")
                    }
                    ))
                }
            };
            if (!o.sipUri && !o.phoneNumber)
                throw new Error("Error starting dial out: either a sip uri or phone number must be provided");
            if (o.sipUri && o.phoneNumber)
                throw new Error("Error starting dial out: only one of sip uri or phone number must be provided");
            if (o.sipUri) {
                if (typeof o.sipUri != "string")
                    throw new Error("Error starting dial out: sipUri must be a string");
                if (!o.sipUri.startsWith("sip:"))
                    throw new Error("Error starting dial out: Invalid SIP URI, must start with 'sip:'");
                if (o.video && typeof o.video != "boolean")
                    throw new Error("Error starting dial out: video must be a boolean value");
                (function(P) {
                    if (P && (d(P.audio),
                    P.video)) {
                        if (!Array.isArray(P.video))
                            throw new Error("Error starting dial out: video codec must be an array");
                        if (P.video.length <= 0)
                            throw new Error("Error starting dial out: video codec array specified but empty");
                        P.video.forEach((function(I) {
                            if (typeof I != "string")
                                throw new Error("Error starting dial out: video codec must be a string");
                            if (I !== "H264" && I !== "VP8")
                                throw new Error("Error starting dial out: video codec must be H264 or VP8")
                        }
                        ))
                    }
                }
                )(o.codecs)
            }
            if (o.phoneNumber) {
                if (typeof o.phoneNumber != "string")
                    throw new Error("Error starting dial out: phoneNumber must be a string");
                if (!/^\+\d{1,}$/.test(o.phoneNumber))
                    throw new Error("Error starting dial out: Invalid phone number, must be valid phone number as per E.164");
                o.codecs && d(o.codecs.audio)
            }
            if (o.callerId) {
                if (typeof o.callerId != "string")
                    throw new Error("Error starting dial out: callerId must be a string");
                if (o.sipUri)
                    throw new Error("Error starting dial out: callerId not allowed with sipUri")
            }
            if (o.displayName) {
                if (typeof o.displayName != "string")
                    throw new Error("Error starting dial out: displayName must be a string");
                if (o.displayName.length >= 200)
                    throw new Error("Error starting dial out: displayName length must be less than 200")
            }
            if (o.userId) {
                if (typeof o.userId != "string")
                    throw new Error("Error starting dial out: userId must be a string");
                if (o.userId.length > 36)
                    throw new Error("Error starting dial out: userId length must be less than or equal to 36")
            }
            if (o.permissions && o.permissions.canReceive) {
                var p = me(pc.validateJSONObject(o.permissions.canReceive), 2)
                  , g = p[0]
                  , S = p[1];
                if (!g)
                    throw new Error(S)
            }
            return new Promise((function(P, I) {
                f.sendMessageToCallMachine(R({
                    action: "dialout-start"
                }, o), (function(B) {
                    B.error ? I(B.error) : P(B)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return E.apply(this, arguments)
        }
        )
    }, {
        key: "stopDialOut",
        value: function(o) {
            var f = this;
            return re(this._callState, "stopDialOut()"),
            new Promise((function(d, p) {
                f.sendMessageToCallMachine(R({
                    action: "dialout-stop"
                }, o), (function(g) {
                    g.error ? p(g.error) : d(g)
                }
                ))
            }
            ))
        }
    }, {
        key: "sipCallTransfer",
        value: (v = F((function*(o) {
            var f = this;
            if (re(this._callState, "sipCallTransfer()"),
            !o)
                throw new Error("sipCallTransfer() requires a sessionId and toEndPoint");
            return o.useSipRefer = !1,
            Za(o, "sipCallTransfer"),
            new Promise((function(d, p) {
                f.sendMessageToCallMachine(R({
                    action: Ma
                }, o), (function(g) {
                    g.error ? p(g.error) : d(g)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return v.apply(this, arguments)
        }
        )
    }, {
        key: "sipRefer",
        value: (b = F((function*(o) {
            var f = this;
            if (re(this._callState, "sipRefer()"),
            !o)
                throw new Error("sessionId and toEndPoint are mandatory parameter");
            return o.useSipRefer = !0,
            Za(o, "sipRefer"),
            new Promise((function(d, p) {
                f.sendMessageToCallMachine(R({
                    action: Ma
                }, o), (function(g) {
                    g.error ? p(g.error) : d(g)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return b.apply(this, arguments)
        }
        )
    }, {
        key: "sendDTMF",
        value: (M = F((function*(o) {
            var f = this;
            return re(this._callState, "sendDTMF()"),
            (function(d) {
                var p = d.sessionId
                  , g = d.tones;
                if (!p || !g)
                    throw new Error("sessionId and tones are mandatory parameter");
                if (typeof p != "string" || typeof g != "string")
                    throw new Error("sessionId and tones should be of string type");
                if (g.length > 20)
                    throw new Error("tones string must be upto 20 characters");
                var S = /[^0-9A-D*#]/g
                  , P = g.match(S);
                if (P && P[0])
                    throw new Error("".concat(P[0], " is not valid DTMF tone"))
            }
            )(o),
            new Promise((function(d, p) {
                f.sendMessageToCallMachine(R({
                    action: "send-dtmf"
                }, o), (function(g) {
                    g.error ? p(g.error) : d(g)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return M.apply(this, arguments)
        }
        )
    }, {
        key: "getNetworkStats",
        value: function() {
            var o = this;
            return this._callState !== xt ? Promise.resolve(R({
                stats: {
                    latest: {}
                }
            }, this._network)) : new Promise((function(f) {
                o.sendMessageToCallMachine({
                    action: "get-calc-stats"
                }, (function(d) {
                    f(R(R({}, o._network), {}, {
                        stats: d.stats
                    }))
                }
                ))
            }
            ))
        }
    }, {
        key: "testWebsocketConnectivity",
        value: (_ = F((function*() {
            var o = this;
            if (zn(this._testCallInProgress, "testWebsocketConnectivity()"),
            this.needsLoad())
                try {
                    yield this.load()
                } catch (f) {
                    return Promise.reject(f)
                }
            return new Promise((function(f, d) {
                o.sendMessageToCallMachine({
                    action: "test-websocket-connectivity"
                }, (function(p) {
                    p.error ? d(p.error) : f(p.results)
                }
                ))
            }
            ))
        }
        )),
        function() {
            return _.apply(this, arguments)
        }
        )
    }, {
        key: "abortTestWebsocketConnectivity",
        value: function() {
            this.sendMessageToCallMachine({
                action: "abort-test-websocket-connectivity"
            })
        }
    }, {
        key: "_validateVideoTrackForNetworkTests",
        value: function(o) {
            return o ? o instanceof MediaStreamTrack ? !!rf(o) || (console.error("Video track is not playable. This test needs a live video track."),
            !1) : (console.error("Video track needs to be of type `MediaStreamTrack`."),
            !1) : (console.error("Missing video track. You must provide a video track in order to run this test."),
            !1)
        }
    }, {
        key: "testCallQuality",
        value: (m = F((function*() {
            var o = this;
            H(),
            Be(this._callObjectMode, "testCallQuality()"),
            Jr(this._callMachineInitialized, "testCallQuality()", null, !0),
            qn(this._callState, this._isPreparingToJoin, "testCallQuality()");
            var f = this._testCallAlreadyInProgress
              , d = function(g) {
                f || (o._testCallInProgress = g)
            };
            if (d(!0),
            this.needsLoad())
                try {
                    var p = this._callState;
                    yield this.load(),
                    this._callState = p
                } catch (g) {
                    return d(!1),
                    Promise.reject(g)
                }
            return new Promise((function(g) {
                o.sendMessageToCallMachine({
                    action: "test-call-quality",
                    dailyJsVersion: o.properties.dailyJsVersion
                }, (function(S) {
                    var P = S.results
                      , I = P.result
                      , B = os(P, af);
                    if (I === "failed") {
                        var J, Q = R({}, B);
                        (J = B.error) !== null && J !== void 0 && J.details ? (B.error.details = JSON.parse(B.error.details),
                        Q.error = R(R({}, Q.error), {}, {
                            details: R({}, Q.error.details)
                        }),
                        Q.error.details.duringTest = "testCallQuality") : (Q.error = Q.error ? R({}, Q.error) : {},
                        Q.error.details = {
                            duringTest: "testCallQuality"
                        }),
                        o._maybeSendToSentry(Q)
                    }
                    d(!1),
                    g(R({
                        result: I
                    }, B))
                }
                ))
            }
            ))
        }
        )),
        function() {
            return m.apply(this, arguments)
        }
        )
    }, {
        key: "stopTestCallQuality",
        value: function() {
            this.sendMessageToCallMachine({
                action: "stop-test-call-quality"
            })
        }
    }, {
        key: "testConnectionQuality",
        value: (h = F((function*(o) {
            var f;
            Y() ? (console.warn("testConnectionQuality() is deprecated: use testPeerToPeerCallQuality() instead"),
            f = yield this.testPeerToPeerCallQuality(o)) : (console.warn("testConnectionQuality() is deprecated: use testCallQuality() instead"),
            f = yield this.testCallQuality());
            var d = {
                result: f.result,
                secondsElapsed: f.secondsElapsed
            };
            return f.data && (d.data = {
                maxRTT: f.data.maxRoundTripTime,
                packetLoss: f.data.avgRecvPacketLoss
            }),
            d
        }
        )),
        function(o) {
            return h.apply(this, arguments)
        }
        )
    }, {
        key: "testPeerToPeerCallQuality",
        value: (u = F((function*(o) {
            var f = this;
            if (zn(this._testCallInProgress, "testPeerToPeerCallQuality()"),
            this.needsLoad())
                try {
                    yield this.load()
                } catch (g) {
                    return Promise.reject(g)
                }
            var d = o.videoTrack
              , p = o.duration;
            if (!this._validateVideoTrackForNetworkTests(d))
                throw new Error("Video track error");
            return this._sharedTracks.videoTrackForConnectionQualityTest = d,
            new Promise((function(g, S) {
                f.sendMessageToCallMachine({
                    action: "test-p2p-call-quality",
                    duration: p
                }, (function(P) {
                    P.error ? S(P.error) : g(P.results)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return u.apply(this, arguments)
        }
        )
    }, {
        key: "stopTestConnectionQuality",
        value: function() {
            Y() ? (console.warn("stopTestConnectionQuality() is deprecated: use testPeerToPeerCallQuality() and stopTestPeerToPeerCallQuality() instead"),
            this.stopTestPeerToPeerCallQuality()) : (console.warn("stopTestConnectionQuality() is deprecated: use testCallQuality() and stopTestCallQuality() instead"),
            this.stopTestCallQuality())
        }
    }, {
        key: "stopTestPeerToPeerCallQuality",
        value: function() {
            this.sendMessageToCallMachine({
                action: "stop-test-p2p-call-quality"
            })
        }
    }, {
        key: "testNetworkConnectivity",
        value: (l = F((function*(o) {
            var f = this;
            if (zn(this._testCallInProgress, "testNetworkConnectivity()"),
            this.needsLoad())
                try {
                    yield this.load()
                } catch (d) {
                    return Promise.reject(d)
                }
            if (!this._validateVideoTrackForNetworkTests(o))
                throw new Error("Video track error");
            return this._sharedTracks.videoTrackForNetworkConnectivityTest = o,
            new Promise((function(d, p) {
                f.sendMessageToCallMachine({
                    action: "test-network-connectivity"
                }, (function(g) {
                    g.error ? p(g.error) : d(g.results)
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return l.apply(this, arguments)
        }
        )
    }, {
        key: "abortTestNetworkConnectivity",
        value: function() {
            this.sendMessageToCallMachine({
                action: "abort-test-network-connectivity"
            })
        }
    }, {
        key: "getCpuLoadStats",
        value: function() {
            var o = this;
            return new Promise((function(f) {
                o._callState === xt ? o.sendMessageToCallMachine({
                    action: "get-cpu-load-stats"
                }, (function(d) {
                    f(d.cpuStats)
                }
                )) : f({
                    cpuLoadState: void 0,
                    cpuLoadStateReason: void 0,
                    stats: {}
                })
            }
            ))
        }
    }, {
        key: "_validateEncodingLayerHasValidProperties",
        value: function(o) {
            var f;
            if (!(((f = Object.keys(o)) === null || f === void 0 ? void 0 : f.length) > 0))
                throw new Error("Empty encoding is not allowed. At least one of these valid keys should be specified:" + Object.values(Wn))
        }
    }, {
        key: "_validateVideoSendSettings",
        value: function(o, f) {
            var d = o === "screenVideo" ? ["default-screen-video", "detail-optimized", "motion-optimized", "motion-and-detail-balanced"] : ["default-video", "bandwidth-optimized", "bandwidth-and-quality-balanced", "quality-optimized", "adaptive-2-layers", "adaptive-3-layers"]
              , p = "Video send settings should be either an object or one of the supported presets: ".concat(d.join());
            if (typeof f == "string") {
                if (!d.includes(f))
                    throw new Error(p)
            } else {
                if (X(f) !== "object")
                    throw new Error(p);
                if (!f.maxQuality && !f.encodings && f.allowAdaptiveLayers === void 0)
                    throw new Error("Video send settings must contain at least maxQuality, allowAdaptiveLayers or encodings attribute");
                if (f.maxQuality && ["low", "medium", "high"].indexOf(f.maxQuality) === -1)
                    throw new Error("maxQuality must be either low, medium or high");
                if (f.encodings) {
                    var g = !1;
                    switch (Object.keys(f.encodings).length) {
                    case 1:
                        g = !f.encodings.low;
                        break;
                    case 2:
                        g = !f.encodings.low || !f.encodings.medium;
                        break;
                    case 3:
                        g = !f.encodings.low || !f.encodings.medium || !f.encodings.high;
                        break;
                    default:
                        g = !0
                    }
                    if (g)
                        throw new Error("Encodings must be defined as: low, low and medium, or low, medium and high.");
                    f.encodings.low && this._validateEncodingLayerHasValidProperties(f.encodings.low),
                    f.encodings.medium && this._validateEncodingLayerHasValidProperties(f.encodings.medium),
                    f.encodings.high && this._validateEncodingLayerHasValidProperties(f.encodings.high)
                }
            }
        }
    }, {
        key: "validateUpdateSendSettings",
        value: function(o) {
            var f = this;
            if (!o || Object.keys(o).length === 0)
                throw new Error("Send settings must contain at least information for one track!");
            Object.entries(o).forEach((function(d) {
                var p = me(d, 2)
                  , g = p[0]
                  , S = p[1];
                f._validateVideoSendSettings(g, S)
            }
            ))
        }
    }, {
        key: "updateSendSettings",
        value: function(o) {
            var f = this;
            return this.validateUpdateSendSettings(o),
            this.needsLoad() ? (this._preloadCache.sendSettings = o,
            {
                sendSettings: this._preloadCache.sendSettings
            }) : new Promise((function(d, p) {
                f.sendMessageToCallMachine({
                    action: "update-send-settings",
                    sendSettings: o
                }, (function(g) {
                    g.error ? p(g.error) : d(g.sendSettings)
                }
                ))
            }
            ))
        }
    }, {
        key: "getSendSettings",
        value: function() {
            return this._sendSettings || this._preloadCache.sendSettings
        }
    }, {
        key: "getLocalAudioLevel",
        value: function() {
            return this._localAudioLevel
        }
    }, {
        key: "getRemoteParticipantsAudioLevel",
        value: function() {
            return this._remoteParticipantsAudioLevel
        }
    }, {
        key: "getActiveSpeaker",
        value: function() {
            return H(),
            this._activeSpeaker
        }
    }, {
        key: "setActiveSpeakerMode",
        value: function(o) {
            return H(),
            this.sendMessageToCallMachine({
                action: "set-active-speaker-mode",
                enabled: o
            }),
            this
        }
    }, {
        key: "activeSpeakerMode",
        value: function() {
            return H(),
            this._activeSpeakerMode
        }
    }, {
        key: "subscribeToTracksAutomatically",
        value: function() {
            return this._preloadCache.subscribeToTracksAutomatically
        }
    }, {
        key: "setSubscribeToTracksAutomatically",
        value: function(o) {
            return re(this._callState, "setSubscribeToTracksAutomatically()", "Use the subscribeToTracksAutomatically configuration property."),
            this._preloadCache.subscribeToTracksAutomatically = o,
            this.sendMessageToCallMachine({
                action: "daily-method-subscribe-to-tracks-automatically",
                enabled: o
            }),
            this
        }
    }, {
        key: "enumerateDevices",
        value: (c = F((function*() {
            var o = this;
            if (this._callObjectMode) {
                var f = yield navigator.mediaDevices.enumerateDevices();
                return $t() === "Firefox" && ln().major > 115 && ln().major < 123 && (f = f.filter((function(d) {
                    return d.kind !== "audiooutput"
                }
                ))),
                {
                    devices: f.map((function(d) {
                        var p = JSON.parse(JSON.stringify(d));
                        if (!Y() && d.kind === "videoinput" && d.getCapabilities) {
                            var g, S = d.getCapabilities();
                            p.facing = (S == null || (g = S.facingMode) === null || g === void 0 ? void 0 : g.length) >= 1 ? S.facingMode[0] : void 0
                        }
                        return p
                    }
                    ))
                }
            }
            return new Promise((function(d) {
                o.sendMessageToCallMachine({
                    action: "enumerate-devices"
                }, (function(p) {
                    d({
                        devices: p.devices
                    })
                }
                ))
            }
            ))
        }
        )),
        function() {
            return c.apply(this, arguments)
        }
        )
    }, {
        key: "sendAppMessage",
        value: function(o) {
            var f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "*";
            if (re(this._callState, "sendAppMessage()"),
            JSON.stringify(o).length > this._maxAppMessageSize)
                throw new Error("Message data too large. Max size is " + this._maxAppMessageSize);
            return this.sendMessageToCallMachine({
                action: "app-msg",
                data: o,
                to: f
            }),
            this
        }
    }, {
        key: "addFakeParticipant",
        value: function(o) {
            return H(),
            re(this._callState, "addFakeParticipant()"),
            this.sendMessageToCallMachine(R({
                action: "add-fake-participant"
            }, o)),
            this
        }
    }, {
        key: "setShowNamesMode",
        value: function(o) {
            return Ee(this._callObjectMode, "setShowNamesMode()"),
            H(),
            o && o !== "always" && o !== "never" ? (console.error('setShowNamesMode argument should be "always", "never", or false'),
            this) : (this.sendMessageToCallMachine({
                action: "set-show-names",
                mode: o
            }),
            this)
        }
    }, {
        key: "setShowLocalVideo",
        value: function() {
            var o = !(arguments.length > 0 && arguments[0] !== void 0) || arguments[0];
            return Ee(this._callObjectMode, "setShowLocalVideo()"),
            H(),
            re(this._callState, "setShowLocalVideo()"),
            typeof o != "boolean" ? (console.error("setShowLocalVideo only accepts a boolean value"),
            this) : (this.sendMessageToCallMachine({
                action: "set-show-local-video",
                show: o
            }),
            this._showLocalVideo = o,
            this)
        }
    }, {
        key: "showLocalVideo",
        value: function() {
            return Ee(this._callObjectMode, "showLocalVideo()"),
            H(),
            this._showLocalVideo
        }
    }, {
        key: "setShowParticipantsBar",
        value: function() {
            var o = !(arguments.length > 0 && arguments[0] !== void 0) || arguments[0];
            return Ee(this._callObjectMode, "setShowParticipantsBar()"),
            H(),
            re(this._callState, "setShowParticipantsBar()"),
            typeof o != "boolean" ? (console.error("setShowParticipantsBar only accepts a boolean value"),
            this) : (this.sendMessageToCallMachine({
                action: "set-show-participants-bar",
                show: o
            }),
            this._showParticipantsBar = o,
            this)
        }
    }, {
        key: "showParticipantsBar",
        value: function() {
            return Ee(this._callObjectMode, "showParticipantsBar()"),
            H(),
            this._showParticipantsBar
        }
    }, {
        key: "customIntegrations",
        value: function() {
            return H(),
            Ee(this._callObjectMode, "customIntegrations()"),
            this._customIntegrations
        }
    }, {
        key: "setCustomIntegrations",
        value: function(o) {
            return H(),
            Ee(this._callObjectMode, "setCustomIntegrations()"),
            re(this._callState, "setCustomIntegrations()"),
            Ec(o) ? (this.sendMessageToCallMachine({
                action: "set-custom-integrations",
                integrations: o
            }),
            this._customIntegrations = o,
            this) : this
        }
    }, {
        key: "startCustomIntegrations",
        value: function(o) {
            var f = this;
            if (H(),
            Ee(this._callObjectMode, "startCustomIntegrations()"),
            re(this._callState, "startCustomIntegrations()"),
            Array.isArray(o) && o.some((function(g) {
                return typeof g != "string"
            }
            )) || !Array.isArray(o) && typeof o != "string")
                return console.error("startCustomIntegrations() only accepts string | string[]"),
                this;
            var d = typeof o == "string" ? [o] : o
              , p = d.filter((function(g) {
                return !(g in f._customIntegrations)
            }
            ));
            return p.length ? (console.error(`Can't find custom integration(s): "`.concat(p.join(", "), '"')),
            this) : (this.sendMessageToCallMachine({
                action: "start-custom-integrations",
                ids: d
            }),
            this)
        }
    }, {
        key: "stopCustomIntegrations",
        value: function(o) {
            var f = this;
            if (H(),
            Ee(this._callObjectMode, "stopCustomIntegrations()"),
            re(this._callState, "stopCustomIntegrations()"),
            Array.isArray(o) && o.some((function(g) {
                return typeof g != "string"
            }
            )) || !Array.isArray(o) && typeof o != "string")
                return console.error("stopCustomIntegrations() only accepts string | string[]"),
                this;
            var d = typeof o == "string" ? [o] : o
              , p = d.filter((function(g) {
                return !(g in f._customIntegrations)
            }
            ));
            return p.length ? (console.error(`Can't find custom integration(s): "`.concat(p.join(", "), '"')),
            this) : (this.sendMessageToCallMachine({
                action: "stop-custom-integrations",
                ids: d
            }),
            this)
        }
    }, {
        key: "customTrayButtons",
        value: function() {
            return Ee(this._callObjectMode, "customTrayButtons()"),
            H(),
            this._customTrayButtons
        }
    }, {
        key: "updateCustomTrayButtons",
        value: function(o) {
            return Ee(this._callObjectMode, "updateCustomTrayButtons()"),
            H(),
            re(this._callState, "updateCustomTrayButtons()"),
            Sc(o) ? (this.sendMessageToCallMachine({
                action: "update-custom-tray-buttons",
                btns: o
            }),
            this._customTrayButtons = o,
            this) : (console.error("updateCustomTrayButtons only accepts a dictionary of the type ".concat(JSON.stringify(dn))),
            this)
        }
    }, {
        key: "theme",
        value: function() {
            return Ee(this._callObjectMode, "theme()"),
            this.properties.theme
        }
    }, {
        key: "setTheme",
        value: function(o) {
            var f = this;
            return Ee(this._callObjectMode, "setTheme()"),
            new Promise((function(d, p) {
                try {
                    f.validateProperties({
                        theme: o
                    }),
                    f.properties.theme = R({}, o),
                    f.sendMessageToCallMachine({
                        action: "set-theme",
                        theme: f.properties.theme
                    });
                    try {
                        f.emitDailyJSEvent({
                            action: $u,
                            theme: f.properties.theme
                        })
                    } catch (g) {
                        console.log("could not emit 'theme-updated'", g)
                    }
                    d(f.properties.theme)
                } catch (g) {
                    p(g)
                }
            }
            ))
        }
    }, {
        key: "requestFullscreen",
        value: (a = F((function*() {
            if (H(),
            this._iframe && !document.fullscreenElement && Ca())
                try {
                    (yield this._iframe.requestFullscreen) ? this._iframe.requestFullscreen() : this._iframe.webkitRequestFullscreen()
                } catch (o) {
                    console.log("could not make video call fullscreen", o)
                }
        }
        )),
        function() {
            return a.apply(this, arguments)
        }
        )
    }, {
        key: "exitFullscreen",
        value: function() {
            H(),
            document.fullscreenElement ? document.exitFullscreen() : document.webkitFullscreenElement && document.webkitExitFullscreen()
        }
    }, {
        key: "getSidebarView",
        value: (s = F((function*() {
            var o = this;
            return this._callObjectMode ? (console.error("getSidebarView is not available in callObject mode"),
            Promise.resolve(null)) : new Promise((function(f) {
                o.sendMessageToCallMachine({
                    action: "get-sidebar-view"
                }, (function(d) {
                    f(d.view)
                }
                ))
            }
            ))
        }
        )),
        function() {
            return s.apply(this, arguments)
        }
        )
    }, {
        key: "setSidebarView",
        value: function(o) {
            return this._callObjectMode ? (console.error("setSidebarView is not available in callObject mode"),
            this) : (this.sendMessageToCallMachine({
                action: "set-sidebar-view",
                view: o
            }),
            this)
        }
    }, {
        key: "room",
        value: (i = F((function*() {
            var o = this
              , f = (arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}).includeRoomConfigDefaults
              , d = f === void 0 || f;
            return this._accessState.access === Rn || this.needsLoad() ? this.properties.url ? {
                roomUrlPendingJoin: this.properties.url
            } : null : new Promise((function(p) {
                o.sendMessageToCallMachine({
                    action: "lib-room-info",
                    includeRoomConfigDefaults: d
                }, (function(g) {
                    delete g.action,
                    delete g.callbackStamp,
                    p(g)
                }
                ))
            }
            ))
        }
        )),
        function() {
            return i.apply(this, arguments)
        }
        )
    }, {
        key: "geo",
        value: (n = F((function*() {
            try {
                var o = yield fetch("https://gs.daily.co/_ks_/x-swsl/:");
                return {
                    current: (yield o.json()).geo
                }
            } catch (f) {
                return console.error("geo lookup failed", f),
                {
                    current: ""
                }
            }
        }
        )),
        function() {
            return n.apply(this, arguments)
        }
        )
    }, {
        key: "setNetworkTopology",
        value: (t = F((function*(o) {
            var f = this;
            return H(),
            re(this._callState, "setNetworkTopology()"),
            new Promise((function(d, p) {
                f.sendMessageToCallMachine({
                    action: "set-network-topology",
                    opts: o
                }, (function(g) {
                    g.error ? p({
                        error: g.error
                    }) : d({
                        workerId: g.workerId
                    })
                }
                ))
            }
            ))
        }
        )),
        function(o) {
            return t.apply(this, arguments)
        }
        )
    }, {
        key: "getNetworkTopology",
        value: (e = F((function*() {
            var o = this;
            return new Promise((function(f, d) {
                o.needsLoad() && f({
                    topology: "none"
                }),
                o.sendMessageToCallMachine({
                    action: "get-network-topology"
                }, (function(p) {
                    p.error ? d({
                        error: p.error
                    }) : f({
                        topology: p.topology
                    })
                }
                ))
            }
            ))
        }
        )),
        function() {
            return e.apply(this, arguments)
        }
        )
    }, {
        key: "setPlayNewParticipantSound",
        value: function(o) {
            if (H(),
            typeof o != "number" && o !== !0 && o !== !1)
                throw new Error("argument to setShouldPlayNewParticipantSound should be true, false, or a number, but is ".concat(o));
            this.sendMessageToCallMachine({
                action: "daily-method-set-play-ding",
                arg: o
            })
        }
    }, {
        key: "on",
        value: function(o, f) {
            return Nr.prototype.on.call(this, o, f)
        }
    }, {
        key: "once",
        value: function(o, f) {
            return Nr.prototype.once.call(this, o, f)
        }
    }, {
        key: "off",
        value: function(o, f) {
            return Nr.prototype.off.call(this, o, f)
        }
    }, {
        key: "validateProperties",
        value: function(o) {
            var f, d;
            if (o != null && (f = o.dailyConfig) !== null && f !== void 0 && f.userMediaAudioConstraints) {
                var p, g;
                Y() || console.warn("userMediaAudioConstraints is deprecated. You can override constraints with inputSettings.audio.settings, found in DailyCallOptions.");
                var S = o.inputSettings || {};
                S.audio = ((p = o.inputSettings) === null || p === void 0 ? void 0 : p.audio) || {},
                S.audio.settings = ((g = o.inputSettings) === null || g === void 0 || (g = g.audio) === null || g === void 0 ? void 0 : g.settings) || {},
                S.audio.settings = R(R({}, S.audio.settings), o.dailyConfig.userMediaAudioConstraints),
                o.inputSettings = S,
                delete o.dailyConfig.userMediaAudioConstraints
            }
            if (o != null && (d = o.dailyConfig) !== null && d !== void 0 && d.userMediaVideoConstraints) {
                var P, I;
                Y() || console.warn("userMediaVideoConstraints is deprecated. You can override constraints with inputSettings.video.settings, found in DailyCallOptions.");
                var B = o.inputSettings || {};
                B.video = ((P = o.inputSettings) === null || P === void 0 ? void 0 : P.video) || {},
                B.video.settings = ((I = o.inputSettings) === null || I === void 0 || (I = I.video) === null || I === void 0 ? void 0 : I.settings) || {},
                B.video.settings = R(R({}, B.video.settings), o.dailyConfig.userMediaVideoConstraints),
                o.inputSettings = B,
                delete o.dailyConfig.userMediaVideoConstraints
            }
            for (var J in o) {
                if (!At[J])
                    throw new Error("unrecognized property '".concat(J, "'"));
                if (At[J].validate && !At[J].validate(o[J], this))
                    throw new Error("property '".concat(J, "': ").concat(At[J].help))
            }
        }
    }, {
        key: "assembleMeetingUrl",
        value: function() {
            var o, f, d = R(R({}, this.properties), {}, {
                emb: this.callClientId,
                embHref: encodeURIComponent(window.location.href),
                proxy: (o = this.properties.dailyConfig) !== null && o !== void 0 && o.proxyUrl ? encodeURIComponent((f = this.properties.dailyConfig) === null || f === void 0 ? void 0 : f.proxyUrl) : void 0
            }), p = d.url.match(/\?/) ? "&" : "?";
            return d.url + p + Object.keys(At).filter((function(g) {
                return At[g].queryString && d[g] !== void 0
            }
            )).map((function(g) {
                return "".concat(At[g].queryString, "=").concat(d[g])
            }
            )).join("&")
        }
    }, {
        key: "needsLoad",
        value: function() {
            return [fa, ha, Tt, st].includes(this._callState)
        }
    }, {
        key: "sendMessageToCallMachine",
        value: function(o, f) {
            if (this._destroyed && (this._logUseAfterDestroy(),
            this.strictMode))
                throw new Error("Use after destroy");
            this._messageChannel.sendMessageToCallMachine(o, f, this.callClientId, this._iframe)
        }
    }, {
        key: "forwardPackagedMessageToCallMachine",
        value: function(o) {
            this._messageChannel.forwardPackagedMessageToCallMachine(o, this._iframe, this.callClientId)
        }
    }, {
        key: "addListenerForPackagedMessagesFromCallMachine",
        value: function(o) {
            return this._messageChannel.addListenerForPackagedMessagesFromCallMachine(o, this.callClientId)
        }
    }, {
        key: "removeListenerForPackagedMessagesFromCallMachine",
        value: function(o) {
            this._messageChannel.removeListenerForPackagedMessagesFromCallMachine(o)
        }
    }, {
        key: "handleMessageFromCallMachine",
        value: function(o) {
            switch (o.action) {
            case Fu:
                this.sendMessageToCallMachine(R({
                    action: ju
                }, this.properties));
                break;
            case "call-machine-initialized":
                this._callMachineInitialized = !0;
                var f = {
                    action: Wr,
                    level: "log",
                    code: 1011,
                    stats: {
                        event: "bundle load",
                        time: this._bundleLoadTime === "no-op" ? 0 : this._bundleLoadTime,
                        preLoaded: this._bundleLoadTime === "no-op",
                        url: rn(this.properties.dailyConfig)
                    }
                };
                this.sendMessageToCallMachine(f),
                this._delayDuplicateInstanceLog && this._logDuplicateInstanceAttempt();
                break;
            case ga:
                this._loadedCallback && (this._loadedCallback(),
                this._loadedCallback = null),
                this.emitDailyJSEvent(o);
                break;
            case Ju:
                var d, p = R({}, o);
                delete p.internal,
                this._maxAppMessageSize = ((d = o.internal) === null || d === void 0 ? void 0 : d._maxAppMessageSize) || Fn,
                this._joinedCallback && (this._joinedCallback(o.participants),
                this._joinedCallback = null),
                this.emitDailyJSEvent(p);
                break;
            case Ku:
            case Hu:
                if (this._callState === Tt)
                    return;
                if (o.participant && o.participant.session_id) {
                    var g = o.participant.local ? "local" : o.participant.session_id;
                    if (this._callObjectMode) {
                        var S = this._callMachine().store;
                        La(o.participant, S),
                        Ba(o.participant, S),
                        Da(o.participant, this._participants[g], S)
                    }
                    try {
                        this.maybeParticipantTracksStopped(this._participants[g], o.participant),
                        this.maybeParticipantTracksStarted(this._participants[g], o.participant),
                        this.maybeEventRecordingStopped(this._participants[g], o.participant),
                        this.maybeEventRecordingStarted(this._participants[g], o.participant)
                    } catch (Jc) {
                        console.error("track events error", Jc)
                    }
                    this.compareEqualForParticipantUpdateEvent(o.participant, this._participants[g]) || (this._participants[g] = R({}, o.participant),
                    this.toggleParticipantAudioBasedOnNativeAudioFocus(),
                    this.emitDailyJSEvent(o))
                }
                break;
            case Qu:
                if (o.participant && o.participant.session_id) {
                    var P = this._participants[o.participant.session_id];
                    P && this.maybeParticipantTracksStopped(P, null),
                    delete this._participants[o.participant.session_id],
                    this.emitDailyJSEvent(o)
                }
                break;
            case Yu:
                ye(this._participantCounts, o.participantCounts) || (this._participantCounts = o.participantCounts,
                this.emitDailyJSEvent(o));
                break;
            case Xu:
                var I = {
                    access: o.access
                };
                o.awaitingAccess && (I.awaitingAccess = o.awaitingAccess),
                ye(this._accessState, I) || (this._accessState = I,
                this.emitDailyJSEvent(o));
                break;
            case Zu:
                if (o.meetingSession) {
                    this._meetingSessionSummary = o.meetingSession,
                    this.emitDailyJSEvent(o);
                    var B = R(R({}, o), {}, {
                        action: "meeting-session-updated"
                    });
                    this.emitDailyJSEvent(B)
                }
                break;
            case wa:
                var J;
                this._iframe && !o.preserveIframe && (this._iframe.src = ""),
                this._updateCallState(st),
                this.resetMeetingDependentVars(),
                this._loadedCallback && (this._loadedCallback(o.errorMsg),
                this._loadedCallback = null),
                o.preserveIframe;
                var Q = os(o, of);
                Q != null && (J = Q.error) !== null && J !== void 0 && J.details && (Q.error.details = JSON.parse(Q.error.details)),
                this._maybeSendToSentry(o),
                this._joinedCallback && (this._joinedCallback(null, Q),
                this._joinedCallback = null),
                this.emitDailyJSEvent(Q);
                break;
            case Gu:
                this._callState !== st && this._updateCallState(Tt),
                this.resetMeetingDependentVars(),
                this._resolveLeave && (this._resolveLeave(),
                this._resolveLeave = null),
                this.emitDailyJSEvent(o);
                break;
            case "selected-devices-updated":
                o.devices && this.emitDailyJSEvent(o);
                break;
            case Sd:
                var qe = o.state
                  , St = o.threshold
                  , lr = o.quality
                  , le = qe.state
                  , Ae = qe.reasons;
                le === this._network.networkState && ye(Ae, this._network.networkStateReasons) && St === this._network.threshold && lr === this._network.quality || (this._network.networkState = le,
                this._network.networkStateReasons = Ae,
                this._network.quality = lr,
                this._network.threshold = St,
                o.networkState = le,
                Ae.length && (o.networkStateReasons = Ae),
                delete o.state,
                this.emitDailyJSEvent(o));
                break;
            case Md:
                o && o.cpuLoadState && this.emitDailyJSEvent(o);
                break;
            case Cd:
                o && o.faceCounts !== void 0 && this.emitDailyJSEvent(o);
                break;
            case wd:
                var Et = o.activeSpeaker;
                this._activeSpeaker.peerId !== Et.peerId && (this._activeSpeaker.peerId = Et.peerId,
                this.emitDailyJSEvent({
                    action: o.action,
                    activeSpeaker: this._activeSpeaker
                }));
                break;
            case "show-local-video-changed":
                if (this._callObjectMode)
                    return;
                var ur = o.show;
                this._showLocalVideo = ur,
                this.emitDailyJSEvent({
                    action: o.action,
                    show: ur
                });
                break;
            case kd:
                var Ar = o.enabled;
                this._activeSpeakerMode !== Ar && (this._activeSpeakerMode = Ar,
                this.emitDailyJSEvent({
                    action: o.action,
                    enabled: this._activeSpeakerMode
                }));
                break;
            case td:
            case rd:
            case nd:
                this._waitingParticipants = o.allWaitingParticipants,
                this.emitDailyJSEvent({
                    action: o.action,
                    participant: o.participant
                });
                break;
            case xd:
                ye(this._receiveSettings, o.receiveSettings) || (this._receiveSettings = o.receiveSettings,
                this.emitDailyJSEvent({
                    action: o.action,
                    receiveSettings: o.receiveSettings
                }));
                break;
            case ya:
                this._maybeUpdateInputSettings(o.inputSettings);
                break;
            case "send-settings-updated":
                ye(this._sendSettings, o.sendSettings) || (this._sendSettings = o.sendSettings,
                this._preloadCache.sendSettings = null,
                this.emitDailyJSEvent({
                    action: o.action,
                    sendSettings: o.sendSettings
                }));
                break;
            case "local-audio-level":
                this._localAudioLevel = o.audioLevel,
                this._preloadCache.localAudioLevelObserver = null,
                this.emitDailyJSEvent(o);
                break;
            case "remote-participants-audio-level":
                this._remoteParticipantsAudioLevel = o.participantsAudioLevel,
                this._preloadCache.remoteParticipantsAudioLevelObserver = null,
                this.emitDailyJSEvent(o);
                break;
            case md:
                var dr = o.session_id;
                this._rmpPlayerState[dr] = o.playerState,
                this.emitDailyJSEvent(o);
                break;
            case vd:
                delete this._rmpPlayerState[o.session_id],
                this.emitDailyJSEvent(o);
                break;
            case gd:
                var fr = o.session_id
                  , ns = this._rmpPlayerState[fr];
                ns && this.compareEqualForRMPUpdateEvent(ns, o.remoteMediaPlayerState) || (this._rmpPlayerState[fr] = o.remoteMediaPlayerState,
                this.emitDailyJSEvent(o));
                break;
            case "custom-button-click":
            case "sidebar-view-changed":
                this.emitDailyJSEvent(o);
                break;
            case ed:
                var zc = this._meetingSessionState.topology !== (o.meetingSessionState && o.meetingSessionState.topology);
                this._meetingSessionState = Jn(o.meetingSessionState, this._callObjectMode),
                (this._callObjectMode || zc) && this.emitDailyJSEvent(o);
                break;
            case bd:
                this._isScreenSharing = !0,
                this.emitDailyJSEvent(o);
                break;
            case yd:
            case _d:
                this._isScreenSharing = !1,
                this.emitDailyJSEvent(o);
                break;
            case va:
            case ba:
            case ld:
            case ud:
            case dd:
            case ad:
            case od:
            case cd:
            case Wu:
            case qu:
            case hd:
            case pd:
            case "test-completed":
            case Ed:
            case fd:
            case Td:
            case Od:
            case Ad:
            case Pd:
            case _a:
            case Id:
            case "dialin-ready":
            case "dialin-connected":
            case "dialin-error":
            case "dialin-stopped":
            case "dialin-warning":
            case "dialout-connected":
            case "dialout-answered":
            case "dialout-error":
            case "dialout-stopped":
            case "dialout-warning":
                this.emitDailyJSEvent(o);
                break;
            case "request-fullscreen":
                this.requestFullscreen();
                break;
            case "request-exit-fullscreen":
                this.exitFullscreen()
            }
        }
    }, {
        key: "maybeEventRecordingStopped",
        value: function(o, f) {
            var d = "record";
            o && (f.local || f[d] !== !1 || o[d] === f[d] || this.emitDailyJSEvent({
                action: ba
            }))
        }
    }, {
        key: "maybeEventRecordingStarted",
        value: function(o, f) {
            var d = "record";
            o && (f.local || f[d] !== !0 || o[d] === f[d] || this.emitDailyJSEvent({
                action: va
            }))
        }
    }, {
        key: "_trackStatePlayable",
        value: function(o) {
            return !(!o || o.state !== Nu)
        }
    }, {
        key: "_trackChanged",
        value: function(o, f) {
            return (o == null ? void 0 : o.id) !== (f == null ? void 0 : f.id)
        }
    }, {
        key: "maybeEventTrackStopped",
        value: function(o, f, d) {
            var p, g, S = (p = f == null ? void 0 : f.tracks[o]) !== null && p !== void 0 ? p : null, P = (g = d == null ? void 0 : d.tracks[o]) !== null && g !== void 0 ? g : null, I = S == null ? void 0 : S.track;
            if (I) {
                var B = this._trackStatePlayable(S)
                  , J = this._trackStatePlayable(P)
                  , Q = this._trackChanged(I, P == null ? void 0 : P.track);
                B && (J && !Q || this.emitDailyJSEvent({
                    action: sd,
                    track: I,
                    participant: d ?? f,
                    type: o
                }))
            }
        }
    }, {
        key: "maybeEventTrackStarted",
        value: function(o, f, d) {
            var p, g, S = (p = f == null ? void 0 : f.tracks[o]) !== null && p !== void 0 ? p : null, P = (g = d == null ? void 0 : d.tracks[o]) !== null && g !== void 0 ? g : null, I = P == null ? void 0 : P.track;
            if (I) {
                var B = this._trackStatePlayable(S)
                  , J = this._trackStatePlayable(P)
                  , Q = this._trackChanged(S == null ? void 0 : S.track, I);
                J && (B && !Q || this.emitDailyJSEvent({
                    action: id,
                    track: I,
                    participant: d,
                    type: o
                }))
            }
        }
    }, {
        key: "maybeParticipantTracksStopped",
        value: function(o, f) {
            if (o)
                for (var d in o.tracks)
                    this.maybeEventTrackStopped(d, o, f)
        }
    }, {
        key: "maybeParticipantTracksStarted",
        value: function(o, f) {
            if (f)
                for (var d in f.tracks)
                    this.maybeEventTrackStarted(d, o, f)
        }
    }, {
        key: "compareEqualForRMPUpdateEvent",
        value: function(o, f) {
            var d, p;
            return o.state === f.state && ((d = o.settings) === null || d === void 0 ? void 0 : d.volume) === ((p = f.settings) === null || p === void 0 ? void 0 : p.volume)
        }
    }, {
        key: "emitDailyJSEvent",
        value: function(o) {
            try {
                o.callClientId = this.callClientId,
                this.emit(o.action, o)
            } catch (f) {
                console.log("could not emit", o, f)
            }
        }
    }, {
        key: "compareEqualForParticipantUpdateEvent",
        value: function(o, f) {
            return !!ye(o, f) && (!o.videoTrack || !f.videoTrack || o.videoTrack.id === f.videoTrack.id && o.videoTrack.muted === f.videoTrack.muted && o.videoTrack.enabled === f.videoTrack.enabled) && (!o.audioTrack || !f.audioTrack || o.audioTrack.id === f.audioTrack.id && o.audioTrack.muted === f.audioTrack.muted && o.audioTrack.enabled === f.audioTrack.enabled)
        }
    }, {
        key: "nativeUtils",
        value: function() {
            return Y() ? typeof DailyNativeUtils > "u" ? (console.warn("in React Native, DailyNativeUtils is expected to be available"),
            null) : DailyNativeUtils : null
        }
    }, {
        key: "updateIsPreparingToJoin",
        value: function(o) {
            this._updateCallState(this._callState, o)
        }
    }, {
        key: "_updateCallState",
        value: function(o) {
            var f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this._isPreparingToJoin;
            if (o !== this._callState || f !== this._isPreparingToJoin) {
                var d = this._callState
                  , p = this._isPreparingToJoin;
                this._callState = o,
                this._isPreparingToJoin = f;
                var g = this._callState === xt;
                this.updateShowAndroidOngoingMeetingNotification(g);
                var S = en(d, p)
                  , P = en(this._callState, this._isPreparingToJoin);
                S !== P && (this.updateKeepDeviceAwake(P),
                this.updateDeviceAudioMode(P),
                this.updateNoOpRecordingEnsuringBackgroundContinuity(P))
            }
        }
    }, {
        key: "resetMeetingDependentVars",
        value: function() {
            this._participants = {},
            this._participantCounts = Ka,
            this._waitingParticipants = {},
            this._activeSpeaker = {},
            this._activeSpeakerMode = !1,
            this._didPreAuth = !1,
            this._accessState = {
                access: Rn
            },
            this._finalSummaryOfPrevSession = this._meetingSessionSummary,
            this._meetingSessionSummary = {},
            this._meetingSessionState = Jn(Ga, this._callObjectMode),
            this._isScreenSharing = !1,
            this._receiveSettings = {},
            this._inputSettings = void 0,
            this._sendSettings = {},
            this._localAudioLevel = 0,
            this._isLocalAudioLevelObserverRunning = !1,
            this._remoteParticipantsAudioLevel = {},
            this._isRemoteParticipantsAudioLevelObserverRunning = !1,
            this._maxAppMessageSize = Fn,
            this._callMachineInitialized = !1,
            this._bundleLoadTime = void 0,
            this._preloadCache
        }
    }, {
        key: "updateKeepDeviceAwake",
        value: function(o) {
            Y() && this.nativeUtils().setKeepDeviceAwake(o, this.callClientId)
        }
    }, {
        key: "updateDeviceAudioMode",
        value: function(o) {
            if (Y() && !this.disableReactNativeAutoDeviceManagement("audio")) {
                var f = o ? this._nativeInCallAudioMode : "idle";
                this.nativeUtils().setAudioMode(f)
            }
        }
    }, {
        key: "updateShowAndroidOngoingMeetingNotification",
        value: function(o) {
            if (Y() && this.nativeUtils().setShowOngoingMeetingNotification) {
                var f, d, p, g;
                if (this.properties.reactNativeConfig && this.properties.reactNativeConfig.androidInCallNotification) {
                    var S = this.properties.reactNativeConfig.androidInCallNotification;
                    f = S.title,
                    d = S.subtitle,
                    p = S.iconName,
                    g = S.disableForCustomOverride
                }
                g && (o = !1),
                this.nativeUtils().setShowOngoingMeetingNotification(o, f, d, p, this.callClientId)
            }
        }
    }, {
        key: "updateNoOpRecordingEnsuringBackgroundContinuity",
        value: function(o) {
            Y() && this.nativeUtils().enableNoOpRecordingEnsuringBackgroundContinuity && this.nativeUtils().enableNoOpRecordingEnsuringBackgroundContinuity(o)
        }
    }, {
        key: "toggleParticipantAudioBasedOnNativeAudioFocus",
        value: function() {
            var o;
            if (Y()) {
                var f = (o = this._callMachine()) === null || o === void 0 || (o = o.store) === null || o === void 0 ? void 0 : o.getState();
                for (var d in f == null ? void 0 : f.streams) {
                    var p = f.streams[d];
                    p && p.pendingTrack && p.pendingTrack.kind === "audio" && (p.pendingTrack.enabled = this._hasNativeAudioFocus)
                }
            }
        }
    }, {
        key: "disableReactNativeAutoDeviceManagement",
        value: function(o) {
            return this.properties.reactNativeConfig && this.properties.reactNativeConfig.disableAutoDeviceManagement && this.properties.reactNativeConfig.disableAutoDeviceManagement[o]
        }
    }, {
        key: "absoluteUrl",
        value: function(o) {
            if (o !== void 0) {
                var f = document.createElement("a");
                return f.href = o,
                f.href
            }
        }
    }, {
        key: "sayHello",
        value: function() {
            var o = "hello, world.";
            return console.log(o),
            o
        }
    }, {
        key: "_logUseAfterDestroy",
        value: function() {
            var o = Object.values(Ot)[0];
            if (this.needsLoad())
                if (o && !o.needsLoad()) {
                    var f = {
                        action: Wr,
                        level: "error",
                        code: this.strictMode ? 9995 : 9997
                    };
                    o.sendMessageToCallMachine(f)
                } else
                    this.strictMode || console.error("You are are attempting to use a call instance that was previously destroyed, which is unsupported. Please remove `strictMode: false` from your constructor properties to enable strict mode to track down and fix this unsupported usage.");
            else {
                var d = {
                    action: Wr,
                    level: "error",
                    code: this.strictMode ? 9995 : 9997
                };
                this._messageChannel.sendMessageToCallMachine(d, null, this.callClientId, this._iframe)
            }
        }
    }, {
        key: "_logDuplicateInstanceAttempt",
        value: function() {
            for (var o = 0, f = Object.values(Ot); o < f.length; o++) {
                var d = f[o];
                d._callMachineInitialized ? (d.sendMessageToCallMachine({
                    action: Wr,
                    level: "warn",
                    code: this.allowMultipleCallInstances ? 9993 : 9992
                }),
                d._delayDuplicateInstanceLog = !1) : d._delayDuplicateInstanceLog = !0
            }
        }
    }, {
        key: "_maybeSendToSentry",
        value: function(o) {
            var f, d, p, g;
            if (!((f = o.error) !== null && f !== void 0 && f.type && (![Ru, Du, ma].includes(o.error.type) || o.error.type === ma && o.error.msg.includes("deleted")))) {
                var S = (d = this.properties) !== null && d !== void 0 && d.url ? new URL(this.properties.url) : void 0
                  , P = "production";
                S && S.host.includes(".staging.daily") && (P = "staging");
                var I, B, J, Q, qe, St = (function(dr) {
                    const fr = [Zl(), Yl(), Mu(), Su(), Pu(), xu(), nu(), Iu()];
                    return dr.autoSessionTracking !== !1 && fr.push(Au()),
                    fr
                }
                )({}).filter((function(dr) {
                    return !["BrowserApiErrors", "Breadcrumbs", "GlobalHandlers"].includes(dr.name)
                }
                )), lr = new du({
                    dsn: "https://f10f1c81e5d44a4098416c0867a8b740@o77906.ingest.sentry.io/168844",
                    transport: gu,
                    stackParser: ku,
                    integrations: St,
                    environment: P
                }), le = new gt;
                if (le.setClient(lr),
                lr.init(),
                this.session_id && le.setExtra("sessionId", this.session_id),
                this.properties) {
                    var Ae = R({}, this.properties);
                    Ae.userName = Ae.userName ? "[Filtered]" : void 0,
                    Ae.userData = Ae.userData ? "[Filtered]" : void 0,
                    Ae.token = Ae.token ? "[Filtered]" : void 0,
                    le.setExtra("properties", Ae)
                }
                if (S) {
                    var Et = S.searchParams.get("domain");
                    if (!Et) {
                        var ur = S.host.match(/(.*?)\./);
                        Et = ur && ur[1] || ""
                    }
                    Et && le.setTag("domain", Et)
                }
                o.error && (le.setTag("fatalErrorType", o.error.type),
                le.setExtra("errorDetails", o.error.details),
                !((I = o.error.details) === null || I === void 0) && I.uri && le.setTag("serverAddress", o.error.details.uri),
                !((B = o.error.details) === null || B === void 0) && B.workerGroup && le.setTag("workerGroup", o.error.details.workerGroup),
                !((J = o.error.details) === null || J === void 0) && J.geoGroup && le.setTag("geoGroup", o.error.details.geoGroup),
                !((Q = o.error.details) === null || Q === void 0) && Q.on && le.setTag("connectionAttempt", o.error.details.on),
                (qe = o.error.details) !== null && qe !== void 0 && qe.bundleUrl && (le.setTag("bundleUrl", o.error.details.bundleUrl),
                le.setTag("bundleError", o.error.details.sourceError.type))),
                le.setTags({
                    callMode: this._callObjectMode ? Y() ? "reactNative" : (p = this.properties) !== null && p !== void 0 && (p = p.dailyConfig) !== null && p !== void 0 && (p = p.callMode) !== null && p !== void 0 && p.includes("prebuilt") ? this.properties.dailyConfig.callMode : "custom" : "prebuilt-frame",
                    version: r.version()
                });
                var Ar = ((g = o.error) === null || g === void 0 ? void 0 : g.msg) || o.errorMsg;
                le.captureException(new Error(Ar))
            }
        }
    }, {
        key: "_callMachine",
        value: function() {
            var o;
            return (o = window._daily) === null || o === void 0 || (o = o.instances) === null || o === void 0 || (o = o[this.callClientId]) === null || o === void 0 ? void 0 : o.callMachine
        }
    }, {
        key: "_maybeUpdateInputSettings",
        value: function(o) {
            if (!ye(this._inputSettings, o)) {
                var f = this._getInputSettings();
                this._inputSettings = o;
                var d = this._getInputSettings();
                ye(f, d) || this.emitDailyJSEvent({
                    action: ya,
                    inputSettings: d
                })
            }
        }
    }], [{
        key: "supportedBrowser",
        value: function() {
            if (Y())
                return {
                    supported: !0,
                    mobile: !0,
                    name: "React Native",
                    version: null,
                    supportsScreenShare: !0,
                    supportsSfu: !0,
                    supportsVideoProcessing: !1,
                    supportsAudioProcessing: !1
                };
            var o = yl.getParser(Ne());
            return {
                supported: !!Ta(),
                mobile: o.getPlatformType() === "mobile",
                name: o.getBrowserName(),
                version: o.getBrowserVersion(),
                supportsFullscreen: !!Ca(),
                supportsScreenShare: !!Bd(),
                supportsSfu: !!Ta(),
                supportsVideoProcessing: nc(),
                supportsAudioProcessing: ic()
            }
        }
    }, {
        key: "version",
        value: function() {
            return "0.83.1"
        }
    }, {
        key: "createCallObject",
        value: function() {
            var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            return o.layout = "none",
            new r(null,o)
        }
    }, {
        key: "wrap",
        value: function(o) {
            var f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
            if (H(),
            !o || !o.contentWindow || typeof o.src != "string")
                throw new Error("DailyIframe::Wrap needs an iframe-like first argument");
            return f.layout || (f.customLayout ? f.layout = "custom-v1" : f.layout = "browser"),
            new r(o,f)
        }
    }, {
        key: "createFrame",
        value: function(o, f) {
            var d, p;
            H(),
            o && f ? (d = o,
            p = f) : o && o.append ? (d = o,
            p = {}) : (d = document.body,
            p = o || {});
            var g = p.iframeStyle;
            g || (g = d === document.body ? {
                position: "fixed",
                border: "1px solid black",
                backgroundColor: "white",
                width: "375px",
                height: "450px",
                right: "1em",
                bottom: "1em"
            } : {
                border: 0,
                width: "100%",
                height: "100%"
            });
            var S = document.createElement("iframe");
            window.navigator && window.navigator.userAgent.match(/Chrome\/61\./) ? S.allow = "microphone, camera" : S.allow = "microphone; camera; autoplay; display-capture; screen-wake-lock",
            S.style.visibility = "hidden",
            d.appendChild(S),
            S.style.visibility = null,
            Object.keys(g).forEach((function(P) {
                return S.style[P] = g[P]
            }
            )),
            p.layout || (p.customLayout ? p.layout = "custom-v1" : p.layout = "browser");
            try {
                return new r(S,p)
            } catch (P) {
                throw d.removeChild(S),
                P
            }
        }
    }, {
        key: "createTransparentFrame",
        value: function() {
            var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            H();
            var f = document.createElement("iframe");
            return f.allow = "microphone; camera; autoplay",
            f.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
      pointer-events: none;
    `,
            document.body.appendChild(f),
            o.layout || (o.layout = "custom-v1"),
            r.wrap(f, o)
        }
    }, {
        key: "getCallInstance",
        value: function() {
            var o = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : void 0;
            return o ? Ot[o] : Object.values(Ot)[0]
        }
    }]);
    var e, t, n, i, s, a, c, l, u, h, m, _, M, b, v, E, C, x, N, k, w, T, L, D, q, U, ae, Le, We, bt, yt, sr, _t, ar, wt, or, kt, cr
}
)();
function Wt(r, e) {
    var t = {};
    for (var n in r)
        if (r[n]instanceof MediaStreamTrack)
            console.warn("MediaStreamTrack found in props or cache.", n),
            t[n] = nt;
        else if (n === "dailyConfig") {
            if (r[n].modifyLocalSdpHook) {
                var i = window._daily.instances[e].customCallbacks || {};
                i.modifyLocalSdpHook = r[n].modifyLocalSdpHook,
                window._daily.instances[e].customCallbacks = i,
                delete r[n].modifyLocalSdpHook
            }
            if (r[n].modifyRemoteSdpHook) {
                var s = window._daily.instances[e].customCallbacks || {};
                s.modifyRemoteSdpHook = r[n].modifyRemoteSdpHook,
                window._daily.instances[e].customCallbacks = s,
                delete r[n].modifyRemoteSdpHook
            }
            t[n] = r[n]
        } else
            t[n] = r[n];
    return t
}
function re(r) {
    var e = arguments.length > 2 ? arguments[2] : void 0;
    if (r !== xt) {
        var t = "".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " only supported after join.");
        throw e && (t += " ".concat(e)),
        console.error(t),
        new Error(t)
    }
}
function en(r, e) {
    return [gi, xt].includes(r) || e
}
function qn(r, e) {
    var t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "This daily-js method"
      , n = arguments.length > 3 ? arguments[3] : void 0;
    if (en(r, e)) {
        var i = "".concat(t, " not supported after joining a meeting.");
        throw n && (i += " ".concat(n)),
        console.error(i),
        new Error(i)
    }
}
function Jr(r) {
    var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method"
      , t = arguments.length > 2 ? arguments[2] : void 0;
    if (!r) {
        var n = "".concat(e, arguments.length > 3 && arguments[3] !== void 0 && arguments[3] ? " requires preAuth() or startCamera() to initialize call state." : " requires preAuth(), startCamera(), or join() to initialize call state.");
        throw t && (n += " ".concat(t)),
        console.error(n),
        new Error(n)
    }
}
function zn(r) {
    if (r) {
        var e = "A pre-call quality test is in progress. Please try ".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " again once testing has completed. Use stopTestCallQuality() to end it early.");
        throw console.error(e),
        new Error(e)
    }
}
function Be(r) {
    if (!r) {
        var e = "".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " is only supported on custom callObject instances");
        throw console.error(e),
        new Error(e)
    }
}
function Ee(r) {
    if (r) {
        var e = "".concat(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "This daily-js method", " is only supported as part of Daily's Prebuilt");
        throw console.error(e),
        new Error(e)
    }
}
function H() {
    if (Y())
        throw new Error("This daily-js method is not currently supported in React Native")
}
function pr() {
    if (!Y())
        throw new Error("This daily-js method is only supported in React Native")
}
function vc(r) {
    if (r === void 0)
        return !0;
    var e;
    if (typeof r == "string")
        e = r;
    else
        try {
            e = JSON.stringify(r),
            ye(JSON.parse(e), r) || console.warn("The userData provided will be modified when serialized.")
        } catch (t) {
            throw Error("userData must be serializable to JSON: ".concat(t))
        }
    if (e.length > 4096)
        throw Error("userData is too large (".concat(e.length, " characters). Maximum size suppported is ").concat(4096, "."));
    return !0
}
function bc(r, e) {
    for (var t = e.allowAllParticipantsKey, n = function(m) {
        var _ = ["local"];
        return t || _.push("*"),
        m && !_.includes(m)
    }, i = function(m) {
        return !!(m.layer === void 0 || Number.isInteger(m.layer) && m.layer >= 0 || m.layer === "inherit")
    }, s = function(m) {
        return !!m && !(m.video && !i(m.video)) && !(m.screenVideo && !i(m.screenVideo))
    }, a = 0, c = Object.entries(r); a < c.length; a++) {
        var l = me(c[a], 2)
          , u = l[0]
          , h = l[1];
        if (!n(u) || !s(h))
            return !1
    }
    return !0
}
function yc(r) {
    if (X(r) !== "object")
        return !1;
    for (var e = 0, t = Object.entries(r); e < t.length; e++) {
        var n = me(t[e], 2)
          , i = n[0]
          , s = n[1];
        switch (i) {
        case "video":
            if (X(s) !== "object")
                return !1;
            for (var a = 0, c = Object.entries(s); a < c.length; a++) {
                var l = me(c[a], 2)
                  , u = l[0]
                  , h = l[1];
                switch (u) {
                case "processor":
                    if (!uf(h))
                        return !1;
                    break;
                case "settings":
                    if (!Xa(h))
                        return !1;
                    break;
                default:
                    return !1
                }
            }
            break;
        case "audio":
            if (X(s) !== "object")
                return !1;
            for (var m = 0, _ = Object.entries(s); m < _.length; m++) {
                var M = me(_[m], 2)
                  , b = M[0]
                  , v = M[1];
                switch (b) {
                case "processor":
                    if (!lf(v))
                        return !1;
                    break;
                case "settings":
                    if (!Xa(v))
                        return !1;
                    break;
                default:
                    return !1
                }
            }
            break;
        default:
            return !1
        }
    }
    return !0
}
function _c(r, e, t) {
    var n, i = [];
    r.video && r.video.processor && (nc((n = e == null ? void 0 : e.useLegacyVideoProcessor) !== null && n !== void 0 && n) || (r.video.settings ? delete r.video.processor : delete r.video,
    i.push("video"))),
    r.audio && r.audio.processor && (ic() || (r.audio.settings ? delete r.audio.processor : delete r.audio,
    i.push("audio"))),
    i.length > 0 && console.error("Ignoring settings for browser- or platform-unsupported input processor(s): ".concat(i.join(", "))),
    r.audio && r.audio.settings && (r.audio.settings.customTrack ? (t.audioTrack = r.audio.settings.customTrack,
    r.audio.settings = {
        customTrack: nt
    }) : delete t.audioTrack),
    r.video && r.video.settings && (r.video.settings.customTrack ? (t.videoTrack = r.video.settings.customTrack,
    r.video.settings = {
        customTrack: nt
    }) : delete t.videoTrack)
}
function lf(r) {
    if (Y())
        return console.warn("Video processing is not yet supported in React Native"),
        !1;
    var e = ["type"];
    return !!r && X(r) === "object" && (Object.keys(r).filter((function(t) {
        return !e.includes(t)
    }
    )).forEach((function(t) {
        console.warn("invalid key inputSettings -> audio -> processor : ".concat(t)),
        delete r[t]
    }
    )),
    !!(function(t) {
        return typeof t != "string" ? !1 : Object.values(tc).includes(t) ? !0 : (console.error("inputSettings audio processor type invalid"),
        !1)
    }
    )(r.type))
}
function uf(r) {
    if (Y())
        return console.warn("Video processing is not yet supported in React Native"),
        !1;
    var e = ["type", "config"];
    return !r || X(r) !== "object" || !(function(t) {
        return typeof t != "string" ? !1 : Object.values(Zr).includes(t) ? !0 : (console.error("inputSettings video processor type invalid"),
        !1)
    }
    )(r.type) || r.config && (X(r.config) !== "object" || !(function(t, n) {
        var i = Object.keys(n);
        if (i.length === 0)
            return !0;
        var s = "invalid object in inputSettings -> video -> processor -> config";
        switch (t) {
        case Zr.BGBLUR:
            return i.length > 1 || i[0] !== "strength" ? (console.error(s),
            !1) : !(typeof n.strength != "number" || n.strength <= 0 || n.strength > 1 || isNaN(n.strength)) || (console.error("".concat(s, "; expected: {0 < strength <= 1}, got: ").concat(n.strength)),
            !1);
        case Zr.BGIMAGE:
            return !(n.source !== void 0 && !(function(a) {
                if (a.source === "default")
                    return a.type = "default",
                    !0;
                if (a.source instanceof ArrayBuffer)
                    return !0;
                if (nn(a.source))
                    return a.type = "url",
                    !!(function(u) {
                        var h = new URL(u)
                          , m = h.pathname;
                        if (h.protocol === "data:")
                            try {
                                var _ = m.substring(m.indexOf(":") + 1, m.indexOf(";")).split("/")[1];
                                return $n.includes(_)
                            } catch (b) {
                                return console.error("failed to deduce blob content type", b),
                                !1
                            }
                        var M = m.split(".").at(-1).toLowerCase().trim();
                        return $n.includes(M)
                    }
                    )(a.source) || (console.error("invalid image type; supported types: [".concat($n.join(", "), "]")),
                    !1);
                return c = a.source,
                l = Number(c),
                isNaN(l) || !Number.isInteger(l) || l <= 0 || l > 10 ? (console.error("invalid image selection; must be an int, > 0, <= ".concat(10)),
                !1) : (a.type = "daily-preselect",
                !0);
                var c, l
            }
            )(n));
        default:
            return !0
        }
    }
    )(r.type, r.config)) ? !1 : (Object.keys(r).filter((function(t) {
        return !e.includes(t)
    }
    )).forEach((function(t) {
        console.warn("invalid key inputSettings -> video -> processor : ".concat(t)),
        delete r[t]
    }
    )),
    !0)
}
function Xa(r) {
    return X(r) === "object" && (!r.customTrack || r.customTrack instanceof MediaStreamTrack)
}
function Si() {
    var r = Object.values(Zr).join(" | ")
      , e = Object.values(tc).join(" | ");
    return "inputSettings must be of the form: { video?: { processor?: { type: [ ".concat(r, " ], config?: {} } }, audio?: { processor: {type: [ ").concat(e, " ] } } }")
}
function wc(r) {
    var e = r.allowAllParticipantsKey;
    return "receiveSettings must be of the form { [<remote participant id> | ".concat(Bu).concat(e ? ' | "'.concat("*", '"') : "", "]: ") + '{ [video: [{ layer: [<non-negative integer> | "inherit"] } | "inherit"]], [screenVideo: [{ layer: [<non-negative integer> | "inherit"] } | "inherit"]] }}}'
}
function kc() {
    return "customIntegrations should be an object of type ".concat(JSON.stringify(ki), ".")
}
function Sc(r) {
    if (r && X(r) !== "object" || Array.isArray(r))
        return console.error("customTrayButtons should be an Object of the type ".concat(JSON.stringify(dn), ".")),
        !1;
    if (r)
        for (var e = 0, t = Object.entries(r); e < t.length; e++)
            for (var n = me(t[e], 1)[0], i = 0, s = Object.entries(r[n]); i < s.length; i++) {
                var a = me(s[i], 2)
                  , c = a[0]
                  , l = a[1]
                  , u = dn.id[c];
                if (!u)
                    return console.error("customTrayButton does not support key ".concat(c)),
                    !1;
                switch (c) {
                case "iconPath":
                case "iconPathDarkMode":
                    if (!nn(l))
                        return console.error("customTrayButton ".concat(c, " should be a url.")),
                        !1;
                    break;
                case "visualState":
                    if (!["default", "sidebar-open", "active"].includes(l))
                        return console.error("customTrayButton ".concat(c, " should be ").concat(u, ". Got: ").concat(l)),
                        !1;
                    break;
                default:
                    if (X(l) !== u)
                        return console.error("customTrayButton ".concat(c, " should be a ").concat(u, ".")),
                        !1
                }
            }
    return !0
}
function Ec(r) {
    if (!r || r && X(r) !== "object" || Array.isArray(r))
        return console.error(kc()),
        !1;
    for (var e = function(m) {
        return "".concat(m, " should be ").concat(ki.id[m])
    }, t = function(m, _) {
        return console.error("customIntegration ".concat(m, ": ").concat(_))
    }, n = 0, i = Object.entries(r); n < i.length; n++) {
        var s = me(i[n], 1)[0];
        if (!("label"in r[s]))
            return t(s, "label is required"),
            !1;
        if (!("location"in r[s]))
            return t(s, "location is required"),
            !1;
        if (!("src"in r[s]) && !("srcdoc"in r[s]))
            return t(s, "src or srcdoc is required"),
            !1;
        for (var a = 0, c = Object.entries(r[s]); a < c.length; a++) {
            var l = me(c[a], 2)
              , u = l[0]
              , h = l[1];
            switch (u) {
            case "allow":
            case "csp":
            case "name":
            case "referrerPolicy":
            case "sandbox":
                if (typeof h != "string")
                    return t(s, e(u)),
                    !1;
                break;
            case "iconURL":
                if (!nn(h))
                    return t(s, "".concat(u, " should be a url")),
                    !1;
                break;
            case "src":
                if ("srcdoc"in r[s])
                    return t(s, "cannot have both src and srcdoc"),
                    !1;
                if (!nn(h))
                    return t(s, 'src "'.concat(h, '" is not a valid URL')),
                    !1;
                break;
            case "srcdoc":
                if ("src"in r[s])
                    return t(s, "cannot have both src and srcdoc"),
                    !1;
                if (typeof h != "string")
                    return t(s, e(u)),
                    !1;
                break;
            case "location":
                if (!["main", "sidebar"].includes(h))
                    return t(s, e(u)),
                    !1;
                break;
            case "controlledBy":
                if (h !== "*" && h !== "owners" && (!Array.isArray(h) || h.some((function(m) {
                    return typeof m != "string"
                }
                ))))
                    return t(s, e(u)),
                    !1;
                break;
            case "shared":
                if ((!Array.isArray(h) || h.some((function(m) {
                    return typeof m != "string"
                }
                ))) && h !== "owners" && typeof h != "boolean")
                    return t(s, e(u)),
                    !1;
                break;
            default:
                if (!ki.id[u])
                    return console.error("customIntegration does not support key ".concat(u)),
                    !1
            }
        }
    }
    return !0
}
function Mc(r, e) {
    if (e === void 0)
        return !1;
    switch (X(e)) {
    case "string":
        return X(r) === e;
    case "object":
        if (X(r) !== "object")
            return !1;
        for (var t in r)
            if (!Mc(r[t], e[t]))
                return !1;
        return !0;
    default:
        return !1
    }
}
function Za(r, e) {
    var t = r.sessionId
      , n = r.toEndPoint
      , i = r.callerId
      , s = r.useSipRefer;
    if (!t || !n)
        throw new Error("".concat(e, "() requires a sessionId and toEndPoint"));
    if (typeof t != "string" || typeof n != "string")
        throw new Error("Invalid paramater: sessionId and toEndPoint must be of type string");
    if (s && !n.startsWith("sip:"))
        throw new Error('"toEndPoint" must be a "sip" address');
    if (!n.startsWith("sip:") && !n.startsWith("+"))
        throw new Error("toEndPoint: ".concat(n, ' must starts with either "sip:" or "+"'));
    if (i && typeof i != "string")
        throw new Error("callerId must be of type string");
    if (i && !n.startsWith("+"))
        throw new Error("callerId is only valid when transferring to a PSTN number")
}
function eo(r) {
    if (X(r) !== "object")
        throw new Error('RemoteMediaPlayerSettings: must be "object" type');
    if (r.state && !Object.values(vi).includes(r.state))
        throw new Error("Invalid value for RemoteMediaPlayerSettings.state, valid values are: " + JSON.stringify(vi));
    if (r.volume) {
        if (typeof r.volume != "number")
            throw new Error('RemoteMediaPlayerSettings.volume: must be "number" type');
        if (r.volume < 0 || r.volume > 2)
            throw new Error("RemoteMediaPlayerSettings.volume: must be between 0.0 - 2.0")
    }
}
function to(r, e, t) {
    return !(typeof r != "number" || r < e || r > t)
}
function Jn(r, e) {
    return r && !e && delete r.data,
    r
}
function Cc(r) {
    let e = typeof r;
    if (e == "object") {
        if (Array.isArray(r))
            return "array";
        if (r === null)
            return "null"
    }
    return e
}
function df(r) {
    return r !== null && typeof r == "object" && !Array.isArray(r)
}
let tt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("")
  , Mn = [];
for (let r = 0; r < tt.length; r++)
    Mn[tt[r].charCodeAt(0)] = r;
Mn[45] = tt.indexOf("+");
Mn[95] = tt.indexOf("/");
function ff(r) {
    let e = r.length * 3 / 4;
    r[r.length - 2] == "=" ? e -= 2 : r[r.length - 1] == "=" && (e -= 1);
    let t = new Uint8Array(e), n = 0, i = 0, s, a = 0;
    for (let c = 0; c < r.length; c++) {
        if (s = Mn[r.charCodeAt(c)],
        s === void 0)
            switch (r[c]) {
            case "=":
                i = 0;
            case `
`:
            case "\r":
            case "	":
            case " ":
                continue;
            default:
                throw Error("invalid base64 string.")
            }
        switch (i) {
        case 0:
            a = s,
            i = 1;
            break;
        case 1:
            t[n++] = a << 2 | (s & 48) >> 4,
            a = s,
            i = 2;
            break;
        case 2:
            t[n++] = (a & 15) << 4 | (s & 60) >> 2,
            a = s,
            i = 3;
            break;
        case 3:
            t[n++] = (a & 3) << 6 | s,
            i = 0;
            break
        }
    }
    if (i == 1)
        throw Error("invalid base64 string.");
    return t.subarray(0, n)
}
function hf(r) {
    let e = "", t = 0, n, i = 0;
    for (let s = 0; s < r.length; s++)
        switch (n = r[s],
        t) {
        case 0:
            e += tt[n >> 2],
            i = (n & 3) << 4,
            t = 1;
            break;
        case 1:
            e += tt[i | n >> 4],
            i = (n & 15) << 2,
            t = 2;
            break;
        case 2:
            e += tt[i | n >> 6],
            e += tt[n & 63],
            t = 0;
            break
        }
    return t && (e += tt[i],
    e += "=",
    t == 1 && (e += "=")),
    e
}
var Se;
(function(r) {
    r.symbol = Symbol.for("protobuf-ts/unknown"),
    r.onRead = (t, n, i, s, a) => {
        (e(n) ? n[r.symbol] : n[r.symbol] = []).push({
            no: i,
            wireType: s,
            data: a
        })
    }
    ,
    r.onWrite = (t, n, i) => {
        for (let {no: s, wireType: a, data: c} of r.list(n))
            i.tag(s, a).raw(c)
    }
    ,
    r.list = (t, n) => {
        if (e(t)) {
            let i = t[r.symbol];
            return n ? i.filter(s => s.no == n) : i
        }
        return []
    }
    ,
    r.last = (t, n) => r.list(t, n).slice(-1)[0];
    const e = t => t && Array.isArray(t[r.symbol])
}
)(Se || (Se = {}));
var z;
(function(r) {
    r[r.Varint = 0] = "Varint",
    r[r.Bit64 = 1] = "Bit64",
    r[r.LengthDelimited = 2] = "LengthDelimited",
    r[r.StartGroup = 3] = "StartGroup",
    r[r.EndGroup = 4] = "EndGroup",
    r[r.Bit32 = 5] = "Bit32"
}
)(z || (z = {}));
function pf() {
    let r = 0
      , e = 0;
    for (let n = 0; n < 28; n += 7) {
        let i = this.buf[this.pos++];
        if (r |= (i & 127) << n,
        (i & 128) == 0)
            return this.assertBounds(),
            [r, e]
    }
    let t = this.buf[this.pos++];
    if (r |= (t & 15) << 28,
    e = (t & 112) >> 4,
    (t & 128) == 0)
        return this.assertBounds(),
        [r, e];
    for (let n = 3; n <= 31; n += 7) {
        let i = this.buf[this.pos++];
        if (e |= (i & 127) << n,
        (i & 128) == 0)
            return this.assertBounds(),
            [r, e]
    }
    throw new Error("invalid varint")
}
function Gn(r, e, t) {
    for (let s = 0; s < 28; s = s + 7) {
        const a = r >>> s
          , c = !(!(a >>> 7) && e == 0)
          , l = (c ? a | 128 : a) & 255;
        if (t.push(l),
        !c)
            return
    }
    const n = r >>> 28 & 15 | (e & 7) << 4
      , i = e >> 3 != 0;
    if (t.push((i ? n | 128 : n) & 255),
    !!i) {
        for (let s = 3; s < 31; s = s + 7) {
            const a = e >>> s
              , c = !!(a >>> 7)
              , l = (c ? a | 128 : a) & 255;
            if (t.push(l),
            !c)
                return
        }
        t.push(e >>> 31 & 1)
    }
}
const tn = 65536 * 65536;
function Tc(r) {
    let e = r[0] == "-";
    e && (r = r.slice(1));
    const t = 1e6;
    let n = 0
      , i = 0;
    function s(a, c) {
        const l = Number(r.slice(a, c));
        i *= t,
        n = n * t + l,
        n >= tn && (i = i + (n / tn | 0),
        n = n % tn)
    }
    return s(-24, -18),
    s(-18, -12),
    s(-12, -6),
    s(-6),
    [e, n, i]
}
function Ei(r, e) {
    if (e >>> 0 <= 2097151)
        return "" + (tn * e + (r >>> 0));
    let t = r & 16777215
      , n = (r >>> 24 | e << 8) >>> 0 & 16777215
      , i = e >> 16 & 65535
      , s = t + n * 6777216 + i * 6710656
      , a = n + i * 8147497
      , c = i * 2
      , l = 1e7;
    s >= l && (a += Math.floor(s / l),
    s %= l),
    a >= l && (c += Math.floor(a / l),
    a %= l);
    function u(h, m) {
        let _ = h ? String(h) : "";
        return m ? "0000000".slice(_.length) + _ : _
    }
    return u(c, 0) + u(a, c) + u(s, 1)
}
function ro(r, e) {
    if (r >= 0) {
        for (; r > 127; )
            e.push(r & 127 | 128),
            r = r >>> 7;
        e.push(r)
    } else {
        for (let t = 0; t < 9; t++)
            e.push(r & 127 | 128),
            r = r >> 7;
        e.push(1)
    }
}
function mf() {
    let r = this.buf[this.pos++]
      , e = r & 127;
    if ((r & 128) == 0)
        return this.assertBounds(),
        e;
    if (r = this.buf[this.pos++],
    e |= (r & 127) << 7,
    (r & 128) == 0)
        return this.assertBounds(),
        e;
    if (r = this.buf[this.pos++],
    e |= (r & 127) << 14,
    (r & 128) == 0)
        return this.assertBounds(),
        e;
    if (r = this.buf[this.pos++],
    e |= (r & 127) << 21,
    (r & 128) == 0)
        return this.assertBounds(),
        e;
    r = this.buf[this.pos++],
    e |= (r & 15) << 28;
    for (let t = 5; (r & 128) !== 0 && t < 10; t++)
        r = this.buf[this.pos++];
    if ((r & 128) != 0)
        throw new Error("invalid varint");
    return this.assertBounds(),
    e >>> 0
}
let ne;
function gf() {
    const r = new DataView(new ArrayBuffer(8));
    ne = globalThis.BigInt !== void 0 && typeof r.getBigInt64 == "function" && typeof r.getBigUint64 == "function" && typeof r.setBigInt64 == "function" && typeof r.setBigUint64 == "function" ? {
        MIN: BigInt("-9223372036854775808"),
        MAX: BigInt("9223372036854775807"),
        UMIN: BigInt("0"),
        UMAX: BigInt("18446744073709551615"),
        C: BigInt,
        V: r
    } : void 0
}
gf();
function Oc(r) {
    if (!r)
        throw new Error("BigInt unavailable, see https://github.com/timostamm/protobuf-ts/blob/v1.0.8/MANUAL.md#bigint-support")
}
const Ac = /^-?[0-9]+$/
  , fn = 4294967296
  , Gr = 2147483648;
class Pc {
    constructor(e, t) {
        this.lo = e | 0,
        this.hi = t | 0
    }
    isZero() {
        return this.lo == 0 && this.hi == 0
    }
    toNumber() {
        let e = this.hi * fn + (this.lo >>> 0);
        if (!Number.isSafeInteger(e))
            throw new Error("cannot convert to safe number");
        return e
    }
}
class ge extends Pc {
    static from(e) {
        if (ne)
            switch (typeof e) {
            case "string":
                if (e == "0")
                    return this.ZERO;
                if (e == "")
                    throw new Error("string is no integer");
                e = ne.C(e);
            case "number":
                if (e === 0)
                    return this.ZERO;
                e = ne.C(e);
            case "bigint":
                if (!e)
                    return this.ZERO;
                if (e < ne.UMIN)
                    throw new Error("signed value for ulong");
                if (e > ne.UMAX)
                    throw new Error("ulong too large");
                return ne.V.setBigUint64(0, e, !0),
                new ge(ne.V.getInt32(0, !0),ne.V.getInt32(4, !0))
            }
        else
            switch (typeof e) {
            case "string":
                if (e == "0")
                    return this.ZERO;
                if (e = e.trim(),
                !Ac.test(e))
                    throw new Error("string is no integer");
                let[t,n,i] = Tc(e);
                if (t)
                    throw new Error("signed value for ulong");
                return new ge(n,i);
            case "number":
                if (e == 0)
                    return this.ZERO;
                if (!Number.isSafeInteger(e))
                    throw new Error("number is no integer");
                if (e < 0)
                    throw new Error("signed value for ulong");
                return new ge(e,e / fn)
            }
        throw new Error("unknown value " + typeof e)
    }
    toString() {
        return ne ? this.toBigInt().toString() : Ei(this.lo, this.hi)
    }
    toBigInt() {
        return Oc(ne),
        ne.V.setInt32(0, this.lo, !0),
        ne.V.setInt32(4, this.hi, !0),
        ne.V.getBigUint64(0, !0)
    }
}
ge.ZERO = new ge(0,0);
class ce extends Pc {
    static from(e) {
        if (ne)
            switch (typeof e) {
            case "string":
                if (e == "0")
                    return this.ZERO;
                if (e == "")
                    throw new Error("string is no integer");
                e = ne.C(e);
            case "number":
                if (e === 0)
                    return this.ZERO;
                e = ne.C(e);
            case "bigint":
                if (!e)
                    return this.ZERO;
                if (e < ne.MIN)
                    throw new Error("signed long too small");
                if (e > ne.MAX)
                    throw new Error("signed long too large");
                return ne.V.setBigInt64(0, e, !0),
                new ce(ne.V.getInt32(0, !0),ne.V.getInt32(4, !0))
            }
        else
            switch (typeof e) {
            case "string":
                if (e == "0")
                    return this.ZERO;
                if (e = e.trim(),
                !Ac.test(e))
                    throw new Error("string is no integer");
                let[t,n,i] = Tc(e);
                if (t) {
                    if (i > Gr || i == Gr && n != 0)
                        throw new Error("signed long too small")
                } else if (i >= Gr)
                    throw new Error("signed long too large");
                let s = new ce(n,i);
                return t ? s.negate() : s;
            case "number":
                if (e == 0)
                    return this.ZERO;
                if (!Number.isSafeInteger(e))
                    throw new Error("number is no integer");
                return e > 0 ? new ce(e,e / fn) : new ce(-e,-e / fn).negate()
            }
        throw new Error("unknown value " + typeof e)
    }
    isNegative() {
        return (this.hi & Gr) !== 0
    }
    negate() {
        let e = ~this.hi
          , t = this.lo;
        return t ? t = ~t + 1 : e += 1,
        new ce(t,e)
    }
    toString() {
        if (ne)
            return this.toBigInt().toString();
        if (this.isNegative()) {
            let e = this.negate();
            return "-" + Ei(e.lo, e.hi)
        }
        return Ei(this.lo, this.hi)
    }
    toBigInt() {
        return Oc(ne),
        ne.V.setInt32(0, this.lo, !0),
        ne.V.setInt32(4, this.hi, !0),
        ne.V.getBigInt64(0, !0)
    }
}
ce.ZERO = new ce(0,0);
const no = {
    readUnknownField: !0,
    readerFactory: r => new bf(r)
};
function vf(r) {
    return r ? Object.assign(Object.assign({}, no), r) : no
}
class bf {
    constructor(e, t) {
        this.varint64 = pf,
        this.uint32 = mf,
        this.buf = e,
        this.len = e.length,
        this.pos = 0,
        this.view = new DataView(e.buffer,e.byteOffset,e.byteLength),
        this.textDecoder = t ?? new TextDecoder("utf-8",{
            fatal: !0,
            ignoreBOM: !0
        })
    }
    tag() {
        let e = this.uint32()
          , t = e >>> 3
          , n = e & 7;
        if (t <= 0 || n < 0 || n > 5)
            throw new Error("illegal tag: field no " + t + " wire type " + n);
        return [t, n]
    }
    skip(e) {
        let t = this.pos;
        switch (e) {
        case z.Varint:
            for (; this.buf[this.pos++] & 128; )
                ;
            break;
        case z.Bit64:
            this.pos += 4;
        case z.Bit32:
            this.pos += 4;
            break;
        case z.LengthDelimited:
            let n = this.uint32();
            this.pos += n;
            break;
        case z.StartGroup:
            let i;
            for (; (i = this.tag()[1]) !== z.EndGroup; )
                this.skip(i);
            break;
        default:
            throw new Error("cant skip wire type " + e)
        }
        return this.assertBounds(),
        this.buf.subarray(t, this.pos)
    }
    assertBounds() {
        if (this.pos > this.len)
            throw new RangeError("premature EOF")
    }
    int32() {
        return this.uint32() | 0
    }
    sint32() {
        let e = this.uint32();
        return e >>> 1 ^ -(e & 1)
    }
    int64() {
        return new ce(...this.varint64())
    }
    uint64() {
        return new ge(...this.varint64())
    }
    sint64() {
        let[e,t] = this.varint64()
          , n = -(e & 1);
        return e = (e >>> 1 | (t & 1) << 31) ^ n,
        t = t >>> 1 ^ n,
        new ce(e,t)
    }
    bool() {
        let[e,t] = this.varint64();
        return e !== 0 || t !== 0
    }
    fixed32() {
        return this.view.getUint32((this.pos += 4) - 4, !0)
    }
    sfixed32() {
        return this.view.getInt32((this.pos += 4) - 4, !0)
    }
    fixed64() {
        return new ge(this.sfixed32(),this.sfixed32())
    }
    sfixed64() {
        return new ce(this.sfixed32(),this.sfixed32())
    }
    float() {
        return this.view.getFloat32((this.pos += 4) - 4, !0)
    }
    double() {
        return this.view.getFloat64((this.pos += 8) - 8, !0)
    }
    bytes() {
        let e = this.uint32()
          , t = this.pos;
        return this.pos += e,
        this.assertBounds(),
        this.buf.subarray(t, t + e)
    }
    string() {
        return this.textDecoder.decode(this.bytes())
    }
}
function Z(r, e) {
    if (!r)
        throw new Error(e)
}
const yf = 34028234663852886e22
  , _f = -34028234663852886e22
  , wf = 4294967295
  , kf = 2147483647
  , Sf = -2147483648;
function wr(r) {
    if (typeof r != "number")
        throw new Error("invalid int 32: " + typeof r);
    if (!Number.isInteger(r) || r > kf || r < Sf)
        throw new Error("invalid int 32: " + r)
}
function hn(r) {
    if (typeof r != "number")
        throw new Error("invalid uint 32: " + typeof r);
    if (!Number.isInteger(r) || r > wf || r < 0)
        throw new Error("invalid uint 32: " + r)
}
function zi(r) {
    if (typeof r != "number")
        throw new Error("invalid float 32: " + typeof r);
    if (Number.isFinite(r) && (r > yf || r < _f))
        throw new Error("invalid float 32: " + r)
}
const io = {
    writeUnknownFields: !0,
    writerFactory: () => new Mf
};
function Ef(r) {
    return r ? Object.assign(Object.assign({}, io), r) : io
}
class Mf {
    constructor(e) {
        this.stack = [],
        this.textEncoder = e ?? new TextEncoder,
        this.chunks = [],
        this.buf = []
    }
    finish() {
        this.chunks.push(new Uint8Array(this.buf));
        let e = 0;
        for (let i = 0; i < this.chunks.length; i++)
            e += this.chunks[i].length;
        let t = new Uint8Array(e)
          , n = 0;
        for (let i = 0; i < this.chunks.length; i++)
            t.set(this.chunks[i], n),
            n += this.chunks[i].length;
        return this.chunks = [],
        t
    }
    fork() {
        return this.stack.push({
            chunks: this.chunks,
            buf: this.buf
        }),
        this.chunks = [],
        this.buf = [],
        this
    }
    join() {
        let e = this.finish()
          , t = this.stack.pop();
        if (!t)
            throw new Error("invalid state, fork stack empty");
        return this.chunks = t.chunks,
        this.buf = t.buf,
        this.uint32(e.byteLength),
        this.raw(e)
    }
    tag(e, t) {
        return this.uint32((e << 3 | t) >>> 0)
    }
    raw(e) {
        return this.buf.length && (this.chunks.push(new Uint8Array(this.buf)),
        this.buf = []),
        this.chunks.push(e),
        this
    }
    uint32(e) {
        for (hn(e); e > 127; )
            this.buf.push(e & 127 | 128),
            e = e >>> 7;
        return this.buf.push(e),
        this
    }
    int32(e) {
        return wr(e),
        ro(e, this.buf),
        this
    }
    bool(e) {
        return this.buf.push(e ? 1 : 0),
        this
    }
    bytes(e) {
        return this.uint32(e.byteLength),
        this.raw(e)
    }
    string(e) {
        let t = this.textEncoder.encode(e);
        return this.uint32(t.byteLength),
        this.raw(t)
    }
    float(e) {
        zi(e);
        let t = new Uint8Array(4);
        return new DataView(t.buffer).setFloat32(0, e, !0),
        this.raw(t)
    }
    double(e) {
        let t = new Uint8Array(8);
        return new DataView(t.buffer).setFloat64(0, e, !0),
        this.raw(t)
    }
    fixed32(e) {
        hn(e);
        let t = new Uint8Array(4);
        return new DataView(t.buffer).setUint32(0, e, !0),
        this.raw(t)
    }
    sfixed32(e) {
        wr(e);
        let t = new Uint8Array(4);
        return new DataView(t.buffer).setInt32(0, e, !0),
        this.raw(t)
    }
    sint32(e) {
        return wr(e),
        e = (e << 1 ^ e >> 31) >>> 0,
        ro(e, this.buf),
        this
    }
    sfixed64(e) {
        let t = new Uint8Array(8)
          , n = new DataView(t.buffer)
          , i = ce.from(e);
        return n.setInt32(0, i.lo, !0),
        n.setInt32(4, i.hi, !0),
        this.raw(t)
    }
    fixed64(e) {
        let t = new Uint8Array(8)
          , n = new DataView(t.buffer)
          , i = ge.from(e);
        return n.setInt32(0, i.lo, !0),
        n.setInt32(4, i.hi, !0),
        this.raw(t)
    }
    int64(e) {
        let t = ce.from(e);
        return Gn(t.lo, t.hi, this.buf),
        this
    }
    sint64(e) {
        let t = ce.from(e)
          , n = t.hi >> 31
          , i = t.lo << 1 ^ n
          , s = (t.hi << 1 | t.lo >>> 31) ^ n;
        return Gn(i, s, this.buf),
        this
    }
    uint64(e) {
        let t = ge.from(e);
        return Gn(t.lo, t.hi, this.buf),
        this
    }
}
const so = {
    emitDefaultValues: !1,
    enumAsInteger: !1,
    useProtoFieldName: !1,
    prettySpaces: 0
}
  , ao = {
    ignoreUnknownFields: !1
};
function Cf(r) {
    return r ? Object.assign(Object.assign({}, ao), r) : ao
}
function Tf(r) {
    return r ? Object.assign(Object.assign({}, so), r) : so
}
const Ic = Symbol.for("protobuf-ts/message-type");
function oo(r) {
    let e = !1;
    const t = [];
    for (let n = 0; n < r.length; n++) {
        let i = r.charAt(n);
        i == "_" ? e = !0 : /\d/.test(i) ? (t.push(i),
        e = !0) : e ? (t.push(i.toUpperCase()),
        e = !1) : n == 0 ? t.push(i.toLowerCase()) : t.push(i)
    }
    return t.join("")
}
var O;
(function(r) {
    r[r.DOUBLE = 1] = "DOUBLE",
    r[r.FLOAT = 2] = "FLOAT",
    r[r.INT64 = 3] = "INT64",
    r[r.UINT64 = 4] = "UINT64",
    r[r.INT32 = 5] = "INT32",
    r[r.FIXED64 = 6] = "FIXED64",
    r[r.FIXED32 = 7] = "FIXED32",
    r[r.BOOL = 8] = "BOOL",
    r[r.STRING = 9] = "STRING",
    r[r.BYTES = 12] = "BYTES",
    r[r.UINT32 = 13] = "UINT32",
    r[r.SFIXED32 = 15] = "SFIXED32",
    r[r.SFIXED64 = 16] = "SFIXED64",
    r[r.SINT32 = 17] = "SINT32",
    r[r.SINT64 = 18] = "SINT64"
}
)(O || (O = {}));
var Ke;
(function(r) {
    r[r.BIGINT = 0] = "BIGINT",
    r[r.STRING = 1] = "STRING",
    r[r.NUMBER = 2] = "NUMBER"
}
)(Ke || (Ke = {}));
var pn;
(function(r) {
    r[r.NO = 0] = "NO",
    r[r.PACKED = 1] = "PACKED",
    r[r.UNPACKED = 2] = "UNPACKED"
}
)(pn || (pn = {}));
function Of(r) {
    var e, t, n, i;
    return r.localName = (e = r.localName) !== null && e !== void 0 ? e : oo(r.name),
    r.jsonName = (t = r.jsonName) !== null && t !== void 0 ? t : oo(r.name),
    r.repeat = (n = r.repeat) !== null && n !== void 0 ? n : pn.NO,
    r.opt = (i = r.opt) !== null && i !== void 0 ? i : r.repeat || r.oneof ? !1 : r.kind == "message",
    r
}
function Af(r) {
    if (typeof r != "object" || r === null || !r.hasOwnProperty("oneofKind"))
        return !1;
    switch (typeof r.oneofKind) {
    case "string":
        return r[r.oneofKind] === void 0 ? !1 : Object.keys(r).length == 2;
    case "undefined":
        return Object.keys(r).length == 1;
    default:
        return !1
    }
}
class Pf {
    constructor(e) {
        var t;
        this.fields = (t = e.fields) !== null && t !== void 0 ? t : []
    }
    prepare() {
        if (this.data)
            return;
        const e = []
          , t = []
          , n = [];
        for (let i of this.fields)
            if (i.oneof)
                n.includes(i.oneof) || (n.push(i.oneof),
                e.push(i.oneof),
                t.push(i.oneof));
            else
                switch (t.push(i.localName),
                i.kind) {
                case "scalar":
                case "enum":
                    (!i.opt || i.repeat) && e.push(i.localName);
                    break;
                case "message":
                    i.repeat && e.push(i.localName);
                    break;
                case "map":
                    e.push(i.localName);
                    break
                }
        this.data = {
            req: e,
            known: t,
            oneofs: Object.values(n)
        }
    }
    is(e, t, n=!1) {
        if (t < 0)
            return !0;
        if (e == null || typeof e != "object")
            return !1;
        this.prepare();
        let i = Object.keys(e)
          , s = this.data;
        if (i.length < s.req.length || s.req.some(a => !i.includes(a)) || !n && i.some(a => !s.known.includes(a)))
            return !1;
        if (t < 1)
            return !0;
        for (const a of s.oneofs) {
            const c = e[a];
            if (!Af(c))
                return !1;
            if (c.oneofKind === void 0)
                continue;
            const l = this.fields.find(u => u.localName === c.oneofKind);
            if (!l || !this.field(c[c.oneofKind], l, n, t))
                return !1
        }
        for (const a of this.fields)
            if (a.oneof === void 0 && !this.field(e[a.localName], a, n, t))
                return !1;
        return !0
    }
    field(e, t, n, i) {
        let s = t.repeat;
        switch (t.kind) {
        case "scalar":
            return e === void 0 ? t.opt : s ? this.scalars(e, t.T, i, t.L) : this.scalar(e, t.T, t.L);
        case "enum":
            return e === void 0 ? t.opt : s ? this.scalars(e, O.INT32, i) : this.scalar(e, O.INT32);
        case "message":
            return e === void 0 ? !0 : s ? this.messages(e, t.T(), n, i) : this.message(e, t.T(), n, i);
        case "map":
            if (typeof e != "object" || e === null)
                return !1;
            if (i < 2)
                return !0;
            if (!this.mapKeys(e, t.K, i))
                return !1;
            switch (t.V.kind) {
            case "scalar":
                return this.scalars(Object.values(e), t.V.T, i, t.V.L);
            case "enum":
                return this.scalars(Object.values(e), O.INT32, i);
            case "message":
                return this.messages(Object.values(e), t.V.T(), n, i)
            }
            break
        }
        return !0
    }
    message(e, t, n, i) {
        return n ? t.isAssignable(e, i) : t.is(e, i)
    }
    messages(e, t, n, i) {
        if (!Array.isArray(e))
            return !1;
        if (i < 2)
            return !0;
        if (n) {
            for (let s = 0; s < e.length && s < i; s++)
                if (!t.isAssignable(e[s], i - 1))
                    return !1
        } else
            for (let s = 0; s < e.length && s < i; s++)
                if (!t.is(e[s], i - 1))
                    return !1;
        return !0
    }
    scalar(e, t, n) {
        let i = typeof e;
        switch (t) {
        case O.UINT64:
        case O.FIXED64:
        case O.INT64:
        case O.SFIXED64:
        case O.SINT64:
            switch (n) {
            case Ke.BIGINT:
                return i == "bigint";
            case Ke.NUMBER:
                return i == "number" && !isNaN(e);
            default:
                return i == "string"
            }
        case O.BOOL:
            return i == "boolean";
        case O.STRING:
            return i == "string";
        case O.BYTES:
            return e instanceof Uint8Array;
        case O.DOUBLE:
        case O.FLOAT:
            return i == "number" && !isNaN(e);
        default:
            return i == "number" && Number.isInteger(e)
        }
    }
    scalars(e, t, n, i) {
        if (!Array.isArray(e))
            return !1;
        if (n < 2)
            return !0;
        if (Array.isArray(e)) {
            for (let s = 0; s < e.length && s < n; s++)
                if (!this.scalar(e[s], t, i))
                    return !1
        }
        return !0
    }
    mapKeys(e, t, n) {
        let i = Object.keys(e);
        switch (t) {
        case O.INT32:
        case O.FIXED32:
        case O.SFIXED32:
        case O.SINT32:
        case O.UINT32:
            return this.scalars(i.slice(0, n).map(s => parseInt(s)), t, n);
        case O.BOOL:
            return this.scalars(i.slice(0, n).map(s => s == "true" ? !0 : s == "false" ? !1 : s), t, n);
        default:
            return this.scalars(i, t, n, Ke.STRING)
        }
    }
}
function $e(r, e) {
    switch (e) {
    case Ke.BIGINT:
        return r.toBigInt();
    case Ke.NUMBER:
        return r.toNumber();
    default:
        return r.toString()
    }
}
class If {
    constructor(e) {
        this.info = e
    }
    prepare() {
        var e;
        if (this.fMap === void 0) {
            this.fMap = {};
            const t = (e = this.info.fields) !== null && e !== void 0 ? e : [];
            for (const n of t)
                this.fMap[n.name] = n,
                this.fMap[n.jsonName] = n,
                this.fMap[n.localName] = n
        }
    }
    assert(e, t, n) {
        if (!e) {
            let i = Cc(n);
            throw (i == "number" || i == "boolean") && (i = n.toString()),
            new Error(`Cannot parse JSON ${i} for ${this.info.typeName}#${t}`)
        }
    }
    read(e, t, n) {
        this.prepare();
        const i = [];
        for (const [s,a] of Object.entries(e)) {
            const c = this.fMap[s];
            if (!c) {
                if (!n.ignoreUnknownFields)
                    throw new Error(`Found unknown field while reading ${this.info.typeName} from JSON format. JSON key: ${s}`);
                continue
            }
            const l = c.localName;
            let u;
            if (c.oneof) {
                if (a === null && (c.kind !== "enum" || c.T()[0] !== "google.protobuf.NullValue"))
                    continue;
                if (i.includes(c.oneof))
                    throw new Error(`Multiple members of the oneof group "${c.oneof}" of ${this.info.typeName} are present in JSON.`);
                i.push(c.oneof),
                u = t[c.oneof] = {
                    oneofKind: l
                }
            } else
                u = t;
            if (c.kind == "map") {
                if (a === null)
                    continue;
                this.assert(df(a), c.name, a);
                const h = u[l];
                for (const [m,_] of Object.entries(a)) {
                    this.assert(_ !== null, c.name + " map value", null);
                    let M;
                    switch (c.V.kind) {
                    case "message":
                        M = c.V.T().internalJsonRead(_, n);
                        break;
                    case "enum":
                        if (M = this.enum(c.V.T(), _, c.name, n.ignoreUnknownFields),
                        M === !1)
                            continue;
                        break;
                    case "scalar":
                        M = this.scalar(_, c.V.T, c.V.L, c.name);
                        break
                    }
                    this.assert(M !== void 0, c.name + " map value", _);
                    let b = m;
                    c.K == O.BOOL && (b = b == "true" ? !0 : b == "false" ? !1 : b),
                    b = this.scalar(b, c.K, Ke.STRING, c.name).toString(),
                    h[b] = M
                }
            } else if (c.repeat) {
                if (a === null)
                    continue;
                this.assert(Array.isArray(a), c.name, a);
                const h = u[l];
                for (const m of a) {
                    this.assert(m !== null, c.name, null);
                    let _;
                    switch (c.kind) {
                    case "message":
                        _ = c.T().internalJsonRead(m, n);
                        break;
                    case "enum":
                        if (_ = this.enum(c.T(), m, c.name, n.ignoreUnknownFields),
                        _ === !1)
                            continue;
                        break;
                    case "scalar":
                        _ = this.scalar(m, c.T, c.L, c.name);
                        break
                    }
                    this.assert(_ !== void 0, c.name, a),
                    h.push(_)
                }
            } else
                switch (c.kind) {
                case "message":
                    if (a === null && c.T().typeName != "google.protobuf.Value") {
                        this.assert(c.oneof === void 0, c.name + " (oneof member)", null);
                        continue
                    }
                    u[l] = c.T().internalJsonRead(a, n, u[l]);
                    break;
                case "enum":
                    if (a === null)
                        continue;
                    let h = this.enum(c.T(), a, c.name, n.ignoreUnknownFields);
                    if (h === !1)
                        continue;
                    u[l] = h;
                    break;
                case "scalar":
                    if (a === null)
                        continue;
                    u[l] = this.scalar(a, c.T, c.L, c.name);
                    break
                }
        }
    }
    enum(e, t, n, i) {
        if (e[0] == "google.protobuf.NullValue" && Z(t === null || t === "NULL_VALUE", `Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} only accepts null.`),
        t === null)
            return 0;
        switch (typeof t) {
        case "number":
            return Z(Number.isInteger(t), `Unable to parse field ${this.info.typeName}#${n}, enum can only be integral number, got ${t}.`),
            t;
        case "string":
            let s = t;
            e[2] && t.substring(0, e[2].length) === e[2] && (s = t.substring(e[2].length));
            let a = e[1][s];
            return typeof a > "u" && i ? !1 : (Z(typeof a == "number", `Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} has no value for "${t}".`),
            a)
        }
        Z(!1, `Unable to parse field ${this.info.typeName}#${n}, cannot parse enum value from ${typeof t}".`)
    }
    scalar(e, t, n, i) {
        let s;
        try {
            switch (t) {
            case O.DOUBLE:
            case O.FLOAT:
                if (e === null)
                    return 0;
                if (e === "NaN")
                    return Number.NaN;
                if (e === "Infinity")
                    return Number.POSITIVE_INFINITY;
                if (e === "-Infinity")
                    return Number.NEGATIVE_INFINITY;
                if (e === "") {
                    s = "empty string";
                    break
                }
                if (typeof e == "string" && e.trim().length !== e.length) {
                    s = "extra whitespace";
                    break
                }
                if (typeof e != "string" && typeof e != "number")
                    break;
                let a = Number(e);
                if (Number.isNaN(a)) {
                    s = "not a number";
                    break
                }
                if (!Number.isFinite(a)) {
                    s = "too large or small";
                    break
                }
                return t == O.FLOAT && zi(a),
                a;
            case O.INT32:
            case O.FIXED32:
            case O.SFIXED32:
            case O.SINT32:
            case O.UINT32:
                if (e === null)
                    return 0;
                let c;
                if (typeof e == "number" ? c = e : e === "" ? s = "empty string" : typeof e == "string" && (e.trim().length !== e.length ? s = "extra whitespace" : c = Number(e)),
                c === void 0)
                    break;
                return t == O.UINT32 ? hn(c) : wr(c),
                c;
            case O.INT64:
            case O.SFIXED64:
            case O.SINT64:
                if (e === null)
                    return $e(ce.ZERO, n);
                if (typeof e != "number" && typeof e != "string")
                    break;
                return $e(ce.from(e), n);
            case O.FIXED64:
            case O.UINT64:
                if (e === null)
                    return $e(ge.ZERO, n);
                if (typeof e != "number" && typeof e != "string")
                    break;
                return $e(ge.from(e), n);
            case O.BOOL:
                if (e === null)
                    return !1;
                if (typeof e != "boolean")
                    break;
                return e;
            case O.STRING:
                if (e === null)
                    return "";
                if (typeof e != "string") {
                    s = "extra whitespace";
                    break
                }
                try {
                    encodeURIComponent(e)
                } catch (l) {
                    l = "invalid UTF8";
                    break
                }
                return e;
            case O.BYTES:
                if (e === null || e === "")
                    return new Uint8Array(0);
                if (typeof e != "string")
                    break;
                return ff(e)
            }
        } catch (a) {
            s = a.message
        }
        this.assert(!1, i + (s ? " - " + s : ""), e)
    }
}
class xf {
    constructor(e) {
        var t;
        this.fields = (t = e.fields) !== null && t !== void 0 ? t : []
    }
    write(e, t) {
        const n = {}
          , i = e;
        for (const s of this.fields) {
            if (!s.oneof) {
                let u = this.field(s, i[s.localName], t);
                u !== void 0 && (n[t.useProtoFieldName ? s.name : s.jsonName] = u);
                continue
            }
            const a = i[s.oneof];
            if (a.oneofKind !== s.localName)
                continue;
            const c = s.kind == "scalar" || s.kind == "enum" ? Object.assign(Object.assign({}, t), {
                emitDefaultValues: !0
            }) : t;
            let l = this.field(s, a[s.localName], c);
            Z(l !== void 0),
            n[t.useProtoFieldName ? s.name : s.jsonName] = l
        }
        return n
    }
    field(e, t, n) {
        let i;
        if (e.kind == "map") {
            Z(typeof t == "object" && t !== null);
            const s = {};
            switch (e.V.kind) {
            case "scalar":
                for (const [l,u] of Object.entries(t)) {
                    const h = this.scalar(e.V.T, u, e.name, !1, !0);
                    Z(h !== void 0),
                    s[l.toString()] = h
                }
                break;
            case "message":
                const a = e.V.T();
                for (const [l,u] of Object.entries(t)) {
                    const h = this.message(a, u, e.name, n);
                    Z(h !== void 0),
                    s[l.toString()] = h
                }
                break;
            case "enum":
                const c = e.V.T();
                for (const [l,u] of Object.entries(t)) {
                    Z(u === void 0 || typeof u == "number");
                    const h = this.enum(c, u, e.name, !1, !0, n.enumAsInteger);
                    Z(h !== void 0),
                    s[l.toString()] = h
                }
                break
            }
            (n.emitDefaultValues || Object.keys(s).length > 0) && (i = s)
        } else if (e.repeat) {
            Z(Array.isArray(t));
            const s = [];
            switch (e.kind) {
            case "scalar":
                for (let l = 0; l < t.length; l++) {
                    const u = this.scalar(e.T, t[l], e.name, e.opt, !0);
                    Z(u !== void 0),
                    s.push(u)
                }
                break;
            case "enum":
                const a = e.T();
                for (let l = 0; l < t.length; l++) {
                    Z(t[l] === void 0 || typeof t[l] == "number");
                    const u = this.enum(a, t[l], e.name, e.opt, !0, n.enumAsInteger);
                    Z(u !== void 0),
                    s.push(u)
                }
                break;
            case "message":
                const c = e.T();
                for (let l = 0; l < t.length; l++) {
                    const u = this.message(c, t[l], e.name, n);
                    Z(u !== void 0),
                    s.push(u)
                }
                break
            }
            (n.emitDefaultValues || s.length > 0 || n.emitDefaultValues) && (i = s)
        } else
            switch (e.kind) {
            case "scalar":
                i = this.scalar(e.T, t, e.name, e.opt, n.emitDefaultValues);
                break;
            case "enum":
                i = this.enum(e.T(), t, e.name, e.opt, n.emitDefaultValues, n.enumAsInteger);
                break;
            case "message":
                i = this.message(e.T(), t, e.name, n);
                break
            }
        return i
    }
    enum(e, t, n, i, s, a) {
        if (e[0] == "google.protobuf.NullValue")
            return !s && !i ? void 0 : null;
        if (t === void 0) {
            Z(i);
            return
        }
        if (!(t === 0 && !s && !i))
            return Z(typeof t == "number"),
            Z(Number.isInteger(t)),
            a || !e[1].hasOwnProperty(t) ? t : e[2] ? e[2] + e[1][t] : e[1][t]
    }
    message(e, t, n, i) {
        return t === void 0 ? i.emitDefaultValues ? null : void 0 : e.internalJsonWrite(t, i)
    }
    scalar(e, t, n, i, s) {
        if (t === void 0) {
            Z(i);
            return
        }
        const a = s || i;
        switch (e) {
        case O.INT32:
        case O.SFIXED32:
        case O.SINT32:
            return t === 0 ? a ? 0 : void 0 : (wr(t),
            t);
        case O.FIXED32:
        case O.UINT32:
            return t === 0 ? a ? 0 : void 0 : (hn(t),
            t);
        case O.FLOAT:
            zi(t);
        case O.DOUBLE:
            return t === 0 ? a ? 0 : void 0 : (Z(typeof t == "number"),
            Number.isNaN(t) ? "NaN" : t === Number.POSITIVE_INFINITY ? "Infinity" : t === Number.NEGATIVE_INFINITY ? "-Infinity" : t);
        case O.STRING:
            return t === "" ? a ? "" : void 0 : (Z(typeof t == "string"),
            t);
        case O.BOOL:
            return t === !1 ? a ? !1 : void 0 : (Z(typeof t == "boolean"),
            t);
        case O.UINT64:
        case O.FIXED64:
            Z(typeof t == "number" || typeof t == "string" || typeof t == "bigint");
            let c = ge.from(t);
            return c.isZero() && !a ? void 0 : c.toString();
        case O.INT64:
        case O.SFIXED64:
        case O.SINT64:
            Z(typeof t == "number" || typeof t == "string" || typeof t == "bigint");
            let l = ce.from(t);
            return l.isZero() && !a ? void 0 : l.toString();
        case O.BYTES:
            return Z(t instanceof Uint8Array),
            t.byteLength ? hf(t) : a ? "" : void 0
        }
    }
}
function Mi(r, e=Ke.STRING) {
    switch (r) {
    case O.BOOL:
        return !1;
    case O.UINT64:
    case O.FIXED64:
        return $e(ge.ZERO, e);
    case O.INT64:
    case O.SFIXED64:
    case O.SINT64:
        return $e(ce.ZERO, e);
    case O.DOUBLE:
    case O.FLOAT:
        return 0;
    case O.BYTES:
        return new Uint8Array(0);
    case O.STRING:
        return "";
    default:
        return 0
    }
}
class Nf {
    constructor(e) {
        this.info = e
    }
    prepare() {
        var e;
        if (!this.fieldNoToField) {
            const t = (e = this.info.fields) !== null && e !== void 0 ? e : [];
            this.fieldNoToField = new Map(t.map(n => [n.no, n]))
        }
    }
    read(e, t, n, i) {
        this.prepare();
        const s = i === void 0 ? e.len : e.pos + i;
        for (; e.pos < s; ) {
            const [a,c] = e.tag()
              , l = this.fieldNoToField.get(a);
            if (!l) {
                let _ = n.readUnknownField;
                if (_ == "throw")
                    throw new Error(`Unknown field ${a} (wire type ${c}) for ${this.info.typeName}`);
                let M = e.skip(c);
                _ !== !1 && (_ === !0 ? Se.onRead : _)(this.info.typeName, t, a, c, M);
                continue
            }
            let u = t
              , h = l.repeat
              , m = l.localName;
            switch (l.oneof && (u = u[l.oneof],
            u.oneofKind !== m && (u = t[l.oneof] = {
                oneofKind: m
            })),
            l.kind) {
            case "scalar":
            case "enum":
                let _ = l.kind == "enum" ? O.INT32 : l.T
                  , M = l.kind == "scalar" ? l.L : void 0;
                if (h) {
                    let E = u[m];
                    if (c == z.LengthDelimited && _ != O.STRING && _ != O.BYTES) {
                        let C = e.uint32() + e.pos;
                        for (; e.pos < C; )
                            E.push(this.scalar(e, _, M))
                    } else
                        E.push(this.scalar(e, _, M))
                } else
                    u[m] = this.scalar(e, _, M);
                break;
            case "message":
                if (h) {
                    let E = u[m]
                      , C = l.T().internalBinaryRead(e, e.uint32(), n);
                    E.push(C)
                } else
                    u[m] = l.T().internalBinaryRead(e, e.uint32(), n, u[m]);
                break;
            case "map":
                let[b,v] = this.mapEntry(l, e, n);
                u[m][b] = v;
                break
            }
        }
    }
    mapEntry(e, t, n) {
        let i = t.uint32(), s = t.pos + i, a, c;
        for (; t.pos < s; ) {
            let[l,u] = t.tag();
            switch (l) {
            case 1:
                e.K == O.BOOL ? a = t.bool().toString() : a = this.scalar(t, e.K, Ke.STRING);
                break;
            case 2:
                switch (e.V.kind) {
                case "scalar":
                    c = this.scalar(t, e.V.T, e.V.L);
                    break;
                case "enum":
                    c = t.int32();
                    break;
                case "message":
                    c = e.V.T().internalBinaryRead(t, t.uint32(), n);
                    break
                }
                break;
            default:
                throw new Error(`Unknown field ${l} (wire type ${u}) in map entry for ${this.info.typeName}#${e.name}`)
            }
        }
        if (a === void 0) {
            let l = Mi(e.K);
            a = e.K == O.BOOL ? l.toString() : l
        }
        if (c === void 0)
            switch (e.V.kind) {
            case "scalar":
                c = Mi(e.V.T, e.V.L);
                break;
            case "enum":
                c = 0;
                break;
            case "message":
                c = e.V.T().create();
                break
            }
        return [a, c]
    }
    scalar(e, t, n) {
        switch (t) {
        case O.INT32:
            return e.int32();
        case O.STRING:
            return e.string();
        case O.BOOL:
            return e.bool();
        case O.DOUBLE:
            return e.double();
        case O.FLOAT:
            return e.float();
        case O.INT64:
            return $e(e.int64(), n);
        case O.UINT64:
            return $e(e.uint64(), n);
        case O.FIXED64:
            return $e(e.fixed64(), n);
        case O.FIXED32:
            return e.fixed32();
        case O.BYTES:
            return e.bytes();
        case O.UINT32:
            return e.uint32();
        case O.SFIXED32:
            return e.sfixed32();
        case O.SFIXED64:
            return $e(e.sfixed64(), n);
        case O.SINT32:
            return e.sint32();
        case O.SINT64:
            return $e(e.sint64(), n)
        }
    }
}
class Lf {
    constructor(e) {
        this.info = e
    }
    prepare() {
        if (!this.fields) {
            const e = this.info.fields ? this.info.fields.concat() : [];
            this.fields = e.sort( (t, n) => t.no - n.no)
        }
    }
    write(e, t, n) {
        this.prepare();
        for (const s of this.fields) {
            let a, c, l = s.repeat, u = s.localName;
            if (s.oneof) {
                const h = e[s.oneof];
                if (h.oneofKind !== u)
                    continue;
                a = h[u],
                c = !0
            } else
                a = e[u],
                c = !1;
            switch (s.kind) {
            case "scalar":
            case "enum":
                let h = s.kind == "enum" ? O.INT32 : s.T;
                if (l)
                    if (Z(Array.isArray(a)),
                    l == pn.PACKED)
                        this.packed(t, h, s.no, a);
                    else
                        for (const m of a)
                            this.scalar(t, h, s.no, m, !0);
                else
                    a === void 0 ? Z(s.opt) : this.scalar(t, h, s.no, a, c || s.opt);
                break;
            case "message":
                if (l) {
                    Z(Array.isArray(a));
                    for (const m of a)
                        this.message(t, n, s.T(), s.no, m)
                } else
                    this.message(t, n, s.T(), s.no, a);
                break;
            case "map":
                Z(typeof a == "object" && a !== null);
                for (const [m,_] of Object.entries(a))
                    this.mapEntry(t, n, s, m, _);
                break
            }
        }
        let i = n.writeUnknownFields;
        i !== !1 && (i === !0 ? Se.onWrite : i)(this.info.typeName, e, t)
    }
    mapEntry(e, t, n, i, s) {
        e.tag(n.no, z.LengthDelimited),
        e.fork();
        let a = i;
        switch (n.K) {
        case O.INT32:
        case O.FIXED32:
        case O.UINT32:
        case O.SFIXED32:
        case O.SINT32:
            a = Number.parseInt(i);
            break;
        case O.BOOL:
            Z(i == "true" || i == "false"),
            a = i == "true";
            break
        }
        switch (this.scalar(e, n.K, 1, a, !0),
        n.V.kind) {
        case "scalar":
            this.scalar(e, n.V.T, 2, s, !0);
            break;
        case "enum":
            this.scalar(e, O.INT32, 2, s, !0);
            break;
        case "message":
            this.message(e, t, n.V.T(), 2, s);
            break
        }
        e.join()
    }
    message(e, t, n, i, s) {
        s !== void 0 && (n.internalBinaryWrite(s, e.tag(i, z.LengthDelimited).fork(), t),
        e.join())
    }
    scalar(e, t, n, i, s) {
        let[a,c,l] = this.scalarInfo(t, i);
        (!l || s) && (e.tag(n, a),
        e[c](i))
    }
    packed(e, t, n, i) {
        if (!i.length)
            return;
        Z(t !== O.BYTES && t !== O.STRING),
        e.tag(n, z.LengthDelimited),
        e.fork();
        let[,s] = this.scalarInfo(t);
        for (let a = 0; a < i.length; a++)
            e[s](i[a]);
        e.join()
    }
    scalarInfo(e, t) {
        let n = z.Varint, i, s = t === void 0, a = t === 0;
        switch (e) {
        case O.INT32:
            i = "int32";
            break;
        case O.STRING:
            a = s || !t.length,
            n = z.LengthDelimited,
            i = "string";
            break;
        case O.BOOL:
            a = t === !1,
            i = "bool";
            break;
        case O.UINT32:
            i = "uint32";
            break;
        case O.DOUBLE:
            n = z.Bit64,
            i = "double";
            break;
        case O.FLOAT:
            n = z.Bit32,
            i = "float";
            break;
        case O.INT64:
            a = s || ce.from(t).isZero(),
            i = "int64";
            break;
        case O.UINT64:
            a = s || ge.from(t).isZero(),
            i = "uint64";
            break;
        case O.FIXED64:
            a = s || ge.from(t).isZero(),
            n = z.Bit64,
            i = "fixed64";
            break;
        case O.BYTES:
            a = s || !t.byteLength,
            n = z.LengthDelimited,
            i = "bytes";
            break;
        case O.FIXED32:
            n = z.Bit32,
            i = "fixed32";
            break;
        case O.SFIXED32:
            n = z.Bit32,
            i = "sfixed32";
            break;
        case O.SFIXED64:
            a = s || ce.from(t).isZero(),
            n = z.Bit64,
            i = "sfixed64";
            break;
        case O.SINT32:
            i = "sint32";
            break;
        case O.SINT64:
            a = s || ce.from(t).isZero(),
            i = "sint64";
            break
        }
        return [n, i, s || a]
    }
}
function Bf(r) {
    const e = r.messagePrototype ? Object.create(r.messagePrototype) : Object.defineProperty({}, Ic, {
        value: r
    });
    for (let t of r.fields) {
        let n = t.localName;
        if (!t.opt)
            if (t.oneof)
                e[t.oneof] = {
                    oneofKind: void 0
                };
            else if (t.repeat)
                e[n] = [];
            else
                switch (t.kind) {
                case "scalar":
                    e[n] = Mi(t.T, t.L);
                    break;
                case "enum":
                    e[n] = 0;
                    break;
                case "map":
                    e[n] = {};
                    break
                }
    }
    return e
}
function ht(r, e, t) {
    let n, i = t, s;
    for (let a of r.fields) {
        let c = a.localName;
        if (a.oneof) {
            const l = i[a.oneof];
            if ((l == null ? void 0 : l.oneofKind) == null)
                continue;
            if (n = l[c],
            s = e[a.oneof],
            s.oneofKind = l.oneofKind,
            n == null) {
                delete s[c];
                continue
            }
        } else if (n = i[c],
        s = e,
        n == null)
            continue;
        switch (a.repeat && (s[c].length = n.length),
        a.kind) {
        case "scalar":
        case "enum":
            if (a.repeat)
                for (let u = 0; u < n.length; u++)
                    s[c][u] = n[u];
            else
                s[c] = n;
            break;
        case "message":
            let l = a.T();
            if (a.repeat)
                for (let u = 0; u < n.length; u++)
                    s[c][u] = l.create(n[u]);
            else
                s[c] === void 0 ? s[c] = l.create(n) : l.mergePartial(s[c], n);
            break;
        case "map":
            switch (a.V.kind) {
            case "scalar":
            case "enum":
                Object.assign(s[c], n);
                break;
            case "message":
                let u = a.V.T();
                for (let h of Object.keys(n))
                    s[c][h] = u.create(n[h]);
                break
            }
            break
        }
    }
}
function Df(r, e, t) {
    if (e === t)
        return !0;
    if (!e || !t)
        return !1;
    for (let n of r.fields) {
        let i = n.localName
          , s = n.oneof ? e[n.oneof][i] : e[i]
          , a = n.oneof ? t[n.oneof][i] : t[i];
        switch (n.kind) {
        case "enum":
        case "scalar":
            let c = n.kind == "enum" ? O.INT32 : n.T;
            if (!(n.repeat ? co(c, s, a) : xc(c, s, a)))
                return !1;
            break;
        case "map":
            if (!(n.V.kind == "message" ? lo(n.V.T(), Kr(s), Kr(a)) : co(n.V.kind == "enum" ? O.INT32 : n.V.T, Kr(s), Kr(a))))
                return !1;
            break;
        case "message":
            let l = n.T();
            if (!(n.repeat ? lo(l, s, a) : l.equals(s, a)))
                return !1;
            break
        }
    }
    return !0
}
const Kr = Object.values;
function xc(r, e, t) {
    if (e === t)
        return !0;
    if (r !== O.BYTES)
        return !1;
    let n = e
      , i = t;
    if (n.length !== i.length)
        return !1;
    for (let s = 0; s < n.length; s++)
        if (n[s] != i[s])
            return !1;
    return !0
}
function co(r, e, t) {
    if (e.length !== t.length)
        return !1;
    for (let n = 0; n < e.length; n++)
        if (!xc(r, e[n], t[n]))
            return !1;
    return !0
}
function lo(r, e, t) {
    if (e.length !== t.length)
        return !1;
    for (let n = 0; n < e.length; n++)
        if (!r.equals(e[n], t[n]))
            return !1;
    return !0
}
const Nc = Object.getOwnPropertyDescriptors(Object.getPrototypeOf({}))
  , Rf = Nc[Ic] = {};
class Or {
    constructor(e, t, n) {
        this.defaultCheckDepth = 16,
        this.typeName = e,
        this.fields = t.map(Of),
        this.options = n ?? {},
        Rf.value = this,
        this.messagePrototype = Object.create(null, Nc),
        this.refTypeCheck = new Pf(this),
        this.refJsonReader = new If(this),
        this.refJsonWriter = new xf(this),
        this.refBinReader = new Nf(this),
        this.refBinWriter = new Lf(this)
    }
    create(e) {
        let t = Bf(this);
        return e !== void 0 && ht(this, t, e),
        t
    }
    clone(e) {
        let t = this.create();
        return ht(this, t, e),
        t
    }
    equals(e, t) {
        return Df(this, e, t)
    }
    is(e, t=this.defaultCheckDepth) {
        return this.refTypeCheck.is(e, t, !1)
    }
    isAssignable(e, t=this.defaultCheckDepth) {
        return this.refTypeCheck.is(e, t, !0)
    }
    mergePartial(e, t) {
        ht(this, e, t)
    }
    fromBinary(e, t) {
        let n = vf(t);
        return this.internalBinaryRead(n.readerFactory(e), e.byteLength, n)
    }
    fromJson(e, t) {
        return this.internalJsonRead(e, Cf(t))
    }
    fromJsonString(e, t) {
        let n = JSON.parse(e);
        return this.fromJson(n, t)
    }
    toJson(e, t) {
        return this.internalJsonWrite(e, Tf(t))
    }
    toJsonString(e, t) {
        var n;
        let i = this.toJson(e, t);
        return JSON.stringify(i, null, (n = t == null ? void 0 : t.prettySpaces) !== null && n !== void 0 ? n : 0)
    }
    toBinary(e, t) {
        let n = Ef(t);
        return this.internalBinaryWrite(e, n.writerFactory(), n).finish()
    }
    internalJsonRead(e, t, n) {
        if (e !== null && typeof e == "object" && !Array.isArray(e)) {
            let i = n ?? this.create();
            return this.refJsonReader.read(e, i, t),
            i
        }
        throw new Error(`Unable to parse message ${this.typeName} from JSON ${Cc(e)}.`)
    }
    internalJsonWrite(e, t) {
        return this.refJsonWriter.write(e, t)
    }
    internalBinaryWrite(e, t, n) {
        return this.refBinWriter.write(e, t, n),
        t
    }
    internalBinaryRead(e, t, n, i) {
        let s = i ?? this.create();
        return this.refBinReader.read(e, s, n, t),
        s
    }
}
var Lc = Object.defineProperty
  , we = (r, e) => Lc(r, "name", {
    value: e,
    configurable: !0
})
  , Ji = (r, e) => {
    for (var t in e)
        Lc(r, t, {
            get: e[t],
            enumerable: !0
        })
}
  , Ff = {};
Ji(Ff, {
    decode: () => Qi,
    decodeBuffer: () => Dc,
    decodeSample: () => Ki,
    encode: () => Hi,
    encodeBuffer: () => Bc,
    encodeSample: () => Gi
});
var jf = [1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7];
function Gi(r) {
    let e;
    r = r == -32768 ? -32767 : r;
    let t = ~r >> 8 & 128;
    if (t || (r = r * -1),
    r > 32635 && (r = 32635),
    r >= 256) {
        let n = jf[r >> 8 & 127]
          , i = r >> n + 3 & 15;
        e = n << 4 | i
    } else
        e = r >> 4;
    return e ^ (t ^ 85)
}
we(Gi, "encodeSample");
function Ki(r) {
    let e = 0;
    r ^= 85,
    r & 128 && (r &= -129,
    e = -1);
    let t = ((r & 240) >> 4) + 4
      , n = 0;
    return t != 4 ? n = 1 << t | (r & 15) << t - 4 | 1 << t - 5 : n = r << 1 | 1,
    n = e === 0 ? n : -n,
    n * 8 * -1
}
we(Ki, "decodeSample");
function Hi(r) {
    let e = new Uint8Array(r.length);
    for (let t = 0; t < r.length; t++)
        e[t] = Gi(r[t]);
    return e
}
we(Hi, "encode");
function Qi(r) {
    let e = new Int16Array(r.length);
    for (let t = 0; t < r.length; t++)
        e[t] = Ki(r[t]);
    return e
}
we(Qi, "decode");
function Bc(r) {
    const e = Math.floor(r.length / 2)
      , t = new Int16Array(e);
    for (let n = 0; n < e; n++)
        t[n] = r.readInt16LE(n * 2);
    return Buffer.from(Hi(t).buffer)
}
we(Bc, "encodeBuffer");
function Dc(r) {
    const e = Qi(new Uint8Array(r));
    return Buffer.from(e.buffer)
}
we(Dc, "decodeBuffer");
var $f = {};
Ji($f, {
    decode: () => es,
    decodeBuffer: () => Fc,
    decodeSample: () => Xi,
    encode: () => Zi,
    encodeBuffer: () => Rc,
    encodeSample: () => Yi
});
var Uf = 132
  , uo = 32635
  , Vf = [0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]
  , Wf = [0, 132, 396, 924, 1980, 4092, 8316, 16764];
function Yi(r) {
    const e = r < 0 ? 128 : 0;
    r = Math.abs(r),
    r += Uf,
    r > uo && (r = uo);
    const t = Vf[r >> 7 & 255]
      , n = r >> t + 3 & 15;
    return ~(e | t << 4 | n) & 255
}
we(Yi, "encodeSample");
function Xi(r) {
    r = ~r & 255;
    const e = r & 128 ? -1 : 1
      , t = r >> 4 & 7
      , n = r & 15
      , i = Wf[t] + (n << t + 3);
    return e * i
}
we(Xi, "decodeSample");
function Zi(r) {
    const e = new Uint8Array(r.length);
    for (let t = 0; t < r.length; t++)
        e[t] = Yi(r[t]);
    return e
}
we(Zi, "encode");
function es(r) {
    const e = new Int16Array(r.length);
    for (let t = 0; t < r.length; t++)
        e[t] = Xi(r[t]);
    return e
}
we(es, "decode");
function Rc(r) {
    const e = Math.floor(r.length / 2)
      , t = new Int16Array(e);
    for (let n = 0; n < e; n++)
        t[n] = r.readInt16LE(n * 2);
    return Buffer.from(Zi(t).buffer)
}
we(Rc, "encodeBuffer");
function Fc(r) {
    const e = es(new Uint8Array(r));
    return Buffer.from(e.buffer)
}
we(Fc, "decodeBuffer");
var qf = {};
Ji(qf, {
    calculateLoudness: () => jc,
    createWavHeader: () => $c,
    resample: () => zf
});
var Ci = [8, 16, 24, 32, 48];
function jc(r, e) {
    if (!(r instanceof Buffer) || r.length === 0)
        throw new Error("Invalid buffer, must be a non-empty Buffer.");
    if (!Ci.includes(e))
        throw new Error("Invalid bit depth, supported values are 8, 16, 24, 32, and 48.");
    if (e === 48)
        throw new Error("48-bit audio is not yet implemented.");
    const t = Math.ceil(e / 8);
    if (r.length % t !== 0)
        throw new Error(`Invalid buffer length ${r.length}. Must be a multiple of ${t} bytes for ${e}-bit audio.`);
    const n = Math.pow(2, e - 1) - 1
      , i = r.length / t;
    let s = 0;
    for (let c = 0; c < i; c++) {
        const l = c * t;
        let u;
        switch (e) {
        case 8:
            u = r[l],
            u & 128 && (u = u - 256);
            break;
        case 16:
            u = r[l] | r[l + 1] << 8,
            u & 32768 && (u = u - 65536);
            break;
        case 24:
            u = r[l] | r[l + 1] << 8 | r[l + 2] << 16,
            u & 8388608 && (u = u | -16777216);
            break;
        case 32:
            u = r[l] | r[l + 1] << 8 | r[l + 2] << 16 | r[l + 3] << 24;
            break;
        default:
            throw new Error(`Unsupported bit depth: ${e}`)
        }
        const h = u / n;
        s += h * h
    }
    const a = Math.sqrt(s / i);
    return a <= 1e-10 ? -100 : 20 * Math.log10(a)
}
we(jc, "calculateLoudness");
function $c(r, e, t, n) {
    const i = [{
        value: "RIFF",
        type: "string"
    }, {
        value: 36 + r,
        type: "uint32"
    }, {
        value: "WAVE",
        type: "string"
    }, {
        value: "fmt ",
        type: "string"
    }, {
        value: 16,
        type: "uint32"
    }, {
        value: 1,
        type: "uint16"
    }, {
        value: t,
        type: "uint16"
    }, {
        value: e,
        type: "uint32"
    }, {
        value: e * t * n / 8,
        type: "uint32"
    }, {
        value: t * n / 8,
        type: "uint16"
    }, {
        value: n,
        type: "uint16"
    }, {
        value: "data",
        type: "string"
    }, {
        value: r,
        type: "uint32"
    }]
      , s = Buffer.alloc(44);
    let a = 0;
    return i.forEach( ({value: c, type: l}) => {
        l === "string" ? (s.write(c, a),
        a += 4) : l === "uint32" ? (s.writeUInt32LE(c, a),
        a += 4) : l === "uint16" && (s.writeUInt16LE(c, a),
        a += 2)
    }
    ),
    s
}
we($c, "createWavHeader");
var zf = we( (r, e, t, n) => {
    if (e <= 0 || t <= 0)
        throw new Error("Sample rates must be positive.");
    if (!Ci.includes(n))
        throw new Error(`Invalid bit depth. Allowed values are: ${Ci.join(", ")}`);
    const i = t / e
      , s = Math.round(r.length * i)
      , a = new Array(s)
      , c = (1 << n - 1) - 1
      , l = -1 << n - 1;
    for (let u = 0; u < s; u++) {
        const h = u / i
          , m = Math.floor(h)
          , _ = Math.min(m + 1, r.length - 1)
          , M = h - m
          , b = r[m] * (1 - M) + r[_] * M
          , v = Math.round(b);
        a[u] = Math.max(l, Math.min(c, v))
    }
    return a
}
, "resample");
class je {
    static floatTo16BitPCM(e) {
        const t = new ArrayBuffer(e.length * 2)
          , n = new DataView(t);
        let i = 0;
        for (let s = 0; s < e.length; s++,
        i += 2) {
            let a = Math.max(-1, Math.min(1, e[s]));
            n.setInt16(i, a < 0 ? a * 32768 : a * 32767, !0)
        }
        return t
    }
    static mergeBuffers(e, t) {
        const n = new Uint8Array(e.byteLength + t.byteLength);
        return n.set(new Uint8Array(e), 0),
        n.set(new Uint8Array(t), e.byteLength),
        n.buffer
    }
    _packData(e, t) {
        return [new Uint8Array([t, t >> 8]), new Uint8Array([t, t >> 8, t >> 16, t >> 24])][e]
    }
    pack(e, t) {
        if (t != null && t.bitsPerSample)
            if (t != null && t.channels) {
                if (!(t != null && t.data))
                    throw new Error('Missing "data"')
            } else
                throw new Error('Missing "channels"');
        else
            throw new Error('Missing "bitsPerSample"');
        const {bitsPerSample: n, channels: i, data: s} = t
          , a = ["RIFF", this._packData(1, 52), "WAVE", "fmt ", this._packData(1, 16), this._packData(0, 1), this._packData(0, i.length), this._packData(1, e), this._packData(1, e * i.length * n / 8), this._packData(0, i.length * n / 8), this._packData(0, n), "data", this._packData(1, i[0].length * i.length * n / 8), s]
          , c = new Blob(a,{
            type: "audio/mpeg"
        })
          , l = URL.createObjectURL(c);
        return {
            blob: c,
            url: l,
            channelCount: i.length,
            sampleRate: e,
            duration: s.byteLength / (i.length * e * 2)
        }
    }
}
globalThis.WavPacker = je;
const fo = [4186.01, 4434.92, 4698.63, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040, 7458.62, 7902.13]
  , Jf = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  , pt = []
  , ts = [];
for (let r = 1; r <= 8; r++)
    for (let e = 0; e < fo.length; e++) {
        const t = fo[e];
        pt.push(t / Math.pow(2, 8 - r)),
        ts.push(Jf[e] + r)
    }
const mn = [32, 2e3]
  , ho = pt.filter( (r, e) => pt[e] > mn[0] && pt[e] < mn[1])
  , Gf = ts.filter( (r, e) => pt[e] > mn[0] && pt[e] < mn[1]);
class ir {
    static getFrequencies(e, t, n, i="frequency", s=-100, a=-30) {
        n || (n = new Float32Array(e.frequencyBinCount),
        e.getFloatFrequencyData(n));
        const c = t / 2
          , l = 1 / n.length * c;
        let u, h, m;
        if (i === "music" || i === "voice") {
            const b = i === "voice" ? ho : pt
              , v = Array(b.length).fill(s);
            for (let E = 0; E < n.length; E++) {
                const C = E * l
                  , x = n[E];
                for (let N = b.length - 1; N >= 0; N--)
                    if (C > b[N]) {
                        v[N] = Math.max(v[N], x);
                        break
                    }
            }
            u = v,
            h = i === "voice" ? ho : pt,
            m = i === "voice" ? Gf : ts
        } else
            u = Array.from(n),
            h = u.map( (b, v) => l * v),
            m = h.map(b => `${b.toFixed(2)} Hz`);
        const _ = u.map(b => Math.max(0, Math.min((b - s) / (a - s), 1)));
        return {
            values: new Float32Array(_),
            frequencies: h,
            labels: m
        }
    }
    constructor(e, t=null) {
        if (this.fftResults = [],
        t) {
            const {length: n, sampleRate: i} = t
              , s = new OfflineAudioContext({
                length: n,
                sampleRate: i
            })
              , a = s.createBufferSource();
            a.buffer = t;
            const c = s.createAnalyser();
            c.fftSize = 8192,
            c.smoothingTimeConstant = .1,
            a.connect(c);
            const l = 1 / 60
              , u = n / i
              , h = m => {
                const _ = l * m;
                _ < u && s.suspend(_).then( () => {
                    const M = new Float32Array(c.frequencyBinCount);
                    c.getFloatFrequencyData(M),
                    this.fftResults.push(M),
                    h(m + 1)
                }
                ),
                m === 1 ? s.startRendering() : s.resume()
            }
            ;
            a.start(0),
            h(1),
            this.audio = e,
            this.context = s,
            this.analyser = c,
            this.sampleRate = i,
            this.audioBuffer = t
        } else {
            const n = new AudioContext
              , i = n.createMediaElementSource(e)
              , s = n.createAnalyser();
            s.fftSize = 8192,
            s.smoothingTimeConstant = .1,
            i.connect(s),
            s.connect(n.destination),
            this.audio = e,
            this.context = n,
            this.analyser = s,
            this.sampleRate = this.context.sampleRate,
            this.audioBuffer = null
        }
    }
    getFrequencies(e="frequency", t=-100, n=-30) {
        let i = null;
        if (this.audioBuffer && this.fftResults.length) {
            const s = this.audio.currentTime / this.audio.duration
              , a = Math.min(s * this.fftResults.length | 0, this.fftResults.length - 1);
            i = this.fftResults[a]
        }
        return ir.getFrequencies(this.analyser, this.sampleRate, i, e, t, n)
    }
    async resumeIfSuspended() {
        return this.context.state === "suspended" && await this.context.resume(),
        !0
    }
}
globalThis.AudioAnalysis = ir;
const Kf = `
class StreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.hasStarted = false;
    this.hasInterrupted = false;
    this.outputBuffers = [];
    this.bufferLength = 128;
    this.write = { buffer: new Float32Array(this.bufferLength), trackId: null };
    this.writeOffset = 0;
    this.trackSampleOffsets = {};
    this.port.onmessage = (event) => {
      if (event.data) {
        const payload = event.data;
        if (payload.event === 'write') {
          const int16Array = payload.buffer;
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 0x8000; // Convert Int16 to Float32
          }
          this.writeData(float32Array, payload.trackId);
        } else if (
          payload.event === 'offset' ||
          payload.event === 'interrupt'
        ) {
          const requestId = payload.requestId;
          const trackId = this.write.trackId;
          const offset = this.trackSampleOffsets[trackId] || 0;
          this.port.postMessage({
            event: 'offset',
            requestId,
            trackId,
            offset,
          });
          if (payload.event === 'interrupt') {
            this.hasInterrupted = true;
          }
        } else {
          throw new Error(\`Unhandled event "\${payload.event}"\`);
        }
      }
    };
  }

  writeData(float32Array, trackId = null) {
    let { buffer } = this.write;
    let offset = this.writeOffset;
    for (let i = 0; i < float32Array.length; i++) {
      buffer[offset++] = float32Array[i];
      if (offset >= buffer.length) {
        this.outputBuffers.push(this.write);
        this.write = { buffer: new Float32Array(this.bufferLength), trackId };
        buffer = this.write.buffer;
        offset = 0;
      }
    }
    this.writeOffset = offset;
    return true;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputChannelData = output[0];
    const outputBuffers = this.outputBuffers;
    if (this.hasInterrupted) {
      this.port.postMessage({ event: 'stop' });
      return false;
    } else if (outputBuffers.length) {
      this.hasStarted = true;
      const { buffer, trackId } = outputBuffers.shift();
      for (let i = 0; i < outputChannelData.length; i++) {
        outputChannelData[i] = buffer[i] || 0;
      }
      if (trackId) {
        this.trackSampleOffsets[trackId] =
          this.trackSampleOffsets[trackId] || 0;
        this.trackSampleOffsets[trackId] += buffer.length;
      }
      return true;
    } else if (this.hasStarted) {
      this.port.postMessage({ event: 'stop' });
      return false;
    } else {
      return true;
    }
  }
}

registerProcessor('stream_processor', StreamProcessor);
`
  , Hf = new Blob([Kf],{
    type: "application/javascript"
})
  , Qf = URL.createObjectURL(Hf)
  , Yf = Qf;
class rs {
    constructor({sampleRate: e=44100}={}) {
        this.scriptSrc = Yf,
        this.sampleRate = e,
        this.context = null,
        this.stream = null,
        this.analyser = null,
        this.trackSampleOffsets = {},
        this.interruptedTrackIds = {}
    }
    async connect() {
        this.context = new AudioContext({
            sampleRate: this.sampleRate
        }),
        this._speakerID && this.context.setSinkId(this._speakerID),
        this.context.state === "suspended" && await this.context.resume();
        try {
            await this.context.audioWorklet.addModule(this.scriptSrc)
        } catch (t) {
            throw console.error(t),
            new Error(`Could not add audioWorklet module: ${this.scriptSrc}`)
        }
        const e = this.context.createAnalyser();
        return e.fftSize = 8192,
        e.smoothingTimeConstant = .1,
        this.analyser = e,
        !0
    }
    getFrequencies(e="frequency", t=-100, n=-30) {
        if (!this.analyser)
            throw new Error("Not connected, please call .connect() first");
        return ir.getFrequencies(this.analyser, this.sampleRate, null, e, t, n)
    }
    async updateSpeaker(e) {
        const t = this._speakerID;
        if (this._speakerID = e,
        this.context)
            try {
                e === "default" ? await this.context.setSinkId() : await this.context.setSinkId(e)
            } catch (n) {
                console.error(`Could not set sinkId to ${e}: ${n}`),
                this._speakerID = t
            }
    }
    _start() {
        const e = new AudioWorkletNode(this.context,"stream_processor");
        return e.connect(this.context.destination),
        e.port.onmessage = t => {
            const {event: n} = t.data;
            if (n === "stop")
                e.disconnect(),
                this.stream = null;
            else if (n === "offset") {
                const {requestId: i, trackId: s, offset: a} = t.data
                  , c = a / this.sampleRate;
                this.trackSampleOffsets[i] = {
                    trackId: s,
                    offset: a,
                    currentTime: c
                }
            }
        }
        ,
        this.analyser.disconnect(),
        e.connect(this.analyser),
        this.stream = e,
        !0
    }
    add16BitPCM(e, t="default") {
        if (typeof t != "string")
            throw new Error("trackId must be a string");
        if (this.interruptedTrackIds[t])
            return;
        this.stream || this._start();
        let n;
        if (e instanceof Int16Array)
            n = e;
        else if (e instanceof ArrayBuffer)
            n = new Int16Array(e);
        else
            throw new Error("argument must be Int16Array or ArrayBuffer");
        return this.stream.port.postMessage({
            event: "write",
            buffer: n,
            trackId: t
        }),
        n
    }
    async getTrackSampleOffset(e=!1) {
        if (!this.stream)
            return null;
        const t = crypto.randomUUID();
        this.stream.port.postMessage({
            event: e ? "interrupt" : "offset",
            requestId: t
        });
        let n;
        for (; !n; )
            n = this.trackSampleOffsets[t],
            await new Promise(s => setTimeout( () => s(), 1));
        const {trackId: i} = n;
        return e && i && (this.interruptedTrackIds[i] = !0),
        n
    }
    async interrupt() {
        return this.getTrackSampleOffset(!0)
    }
}
globalThis.WavStreamPlayer = rs;
const Xf = `
class AudioProcessor extends AudioWorkletProcessor {

  constructor() {
    super();
    this.port.onmessage = this.receive.bind(this);
    this.initialize();
  }

  initialize() {
    this.foundAudio = false;
    this.recording = false;
    this.chunks = [];
  }

  /**
   * Concatenates sampled chunks into channels
   * Format is chunk[Left[], Right[]]
   */
  readChannelData(chunks, channel = -1, maxChannels = 9) {
    let channelLimit;
    if (channel !== -1) {
      if (chunks[0] && chunks[0].length - 1 < channel) {
        throw new Error(
          \`Channel \${channel} out of range: max \${chunks[0].length}\`
        );
      }
      channelLimit = channel + 1;
    } else {
      channel = 0;
      channelLimit = Math.min(chunks[0] ? chunks[0].length : 1, maxChannels);
    }
    const channels = [];
    for (let n = channel; n < channelLimit; n++) {
      const length = chunks.reduce((sum, chunk) => {
        return sum + chunk[n].length;
      }, 0);
      const buffers = chunks.map((chunk) => chunk[n]);
      const result = new Float32Array(length);
      let offset = 0;
      for (let i = 0; i < buffers.length; i++) {
        result.set(buffers[i], offset);
        offset += buffers[i].length;
      }
      channels[n] = result;
    }
    return channels;
  }

  /**
   * Combines parallel audio data into correct format,
   * channels[Left[], Right[]] to float32Array[LRLRLRLR...]
   */
  formatAudioData(channels) {
    if (channels.length === 1) {
      // Simple case is only one channel
      const float32Array = channels[0].slice();
      const meanValues = channels[0].slice();
      return { float32Array, meanValues };
    } else {
      const float32Array = new Float32Array(
        channels[0].length * channels.length
      );
      const meanValues = new Float32Array(channels[0].length);
      for (let i = 0; i < channels[0].length; i++) {
        const offset = i * channels.length;
        let meanValue = 0;
        for (let n = 0; n < channels.length; n++) {
          float32Array[offset + n] = channels[n][i];
          meanValue += channels[n][i];
        }
        meanValues[i] = meanValue / channels.length;
      }
      return { float32Array, meanValues };
    }
  }

  /**
   * Converts 32-bit float data to 16-bit integers
   */
  floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  /**
   * Retrieves the most recent amplitude values from the audio stream
   * @param {number} channel
   */
  getValues(channel = -1) {
    const channels = this.readChannelData(this.chunks, channel);
    const { meanValues } = this.formatAudioData(channels);
    return { meanValues, channels };
  }

  /**
   * Exports chunks as an audio/wav file
   */
  export() {
    const channels = this.readChannelData(this.chunks);
    const { float32Array, meanValues } = this.formatAudioData(channels);
    const audioData = this.floatTo16BitPCM(float32Array);
    return {
      meanValues: meanValues,
      audio: {
        bitsPerSample: 16,
        channels: channels,
        data: audioData,
      },
    };
  }

  receive(e) {
    const { event, id } = e.data;
    let receiptData = {};
    switch (event) {
      case 'start':
        this.recording = true;
        break;
      case 'stop':
        this.recording = false;
        break;
      case 'clear':
        this.initialize();
        break;
      case 'export':
        receiptData = this.export();
        break;
      case 'read':
        receiptData = this.getValues();
        break;
      default:
        break;
    }
    // Always send back receipt
    this.port.postMessage({ event: 'receipt', id, data: receiptData });
  }

  sendChunk(chunk) {
    const channels = this.readChannelData([chunk]);
    const { float32Array, meanValues } = this.formatAudioData(channels);
    const rawAudioData = this.floatTo16BitPCM(float32Array);
    const monoAudioData = this.floatTo16BitPCM(meanValues);
    this.port.postMessage({
      event: 'chunk',
      data: {
        mono: monoAudioData,
        raw: rawAudioData,
      },
    });
  }

  process(inputList, outputList, parameters) {
    // Copy input to output (e.g. speakers)
    // Note that this creates choppy sounds with Mac products
    const sourceLimit = Math.min(inputList.length, outputList.length);
    for (let inputNum = 0; inputNum < sourceLimit; inputNum++) {
      const input = inputList[inputNum];
      const output = outputList[inputNum];
      const channelCount = Math.min(input.length, output.length);
      for (let channelNum = 0; channelNum < channelCount; channelNum++) {
        input[channelNum].forEach((sample, i) => {
          output[channelNum][i] = sample;
        });
      }
    }
    const inputs = inputList[0];
    // There's latency at the beginning of a stream before recording starts
    // Make sure we actually receive audio data before we start storing chunks
    let sliceIndex = 0;
    if (!this.foundAudio) {
      for (const channel of inputs) {
        sliceIndex = 0; // reset for each channel
        if (this.foundAudio) {
          break;
        }
        if (channel) {
          for (const value of channel) {
            if (value !== 0) {
              // find only one non-zero entry in any channel
              this.foundAudio = true;
              break;
            } else {
              sliceIndex++;
            }
          }
        }
      }
    }
    if (inputs && inputs[0] && this.foundAudio && this.recording) {
      // We need to copy the TypedArray, because the \`process\`
      // internals will reuse the same buffer to hold each input
      const chunk = inputs.map((input) => input.slice(sliceIndex));
      this.chunks.push(chunk);
      this.sendChunk(chunk);
    }
    return true;
  }
}

registerProcessor('audio_processor', AudioProcessor);
`
  , Zf = new Blob([Xf],{
    type: "application/javascript"
})
  , eh = URL.createObjectURL(Zf)
  , Uc = eh;
class Vc {
    constructor({sampleRate: e=44100, outputToSpeakers: t=!1, debug: n=!1}={}) {
        this.scriptSrc = Uc,
        this.sampleRate = e,
        this.outputToSpeakers = t,
        this.debug = !!n,
        this._deviceChangeCallback = null,
        this._deviceErrorCallback = null,
        this._devices = [],
        this.deviceSelection = null,
        this.stream = null,
        this.processor = null,
        this.source = null,
        this.node = null,
        this.recording = !1,
        this._lastEventId = 0,
        this.eventReceipts = {},
        this.eventTimeout = 5e3,
        this._chunkProcessor = () => {}
        ,
        this._chunkProcessorSize = void 0,
        this._chunkProcessorBuffer = {
            raw: new ArrayBuffer(0),
            mono: new ArrayBuffer(0)
        }
    }
    static async decode(e, t=44100, n=-1) {
        const i = new AudioContext({
            sampleRate: t
        });
        let s, a;
        if (e instanceof Blob) {
            if (n !== -1)
                throw new Error('Can not specify "fromSampleRate" when reading from Blob');
            a = e,
            s = await a.arrayBuffer()
        } else if (e instanceof ArrayBuffer) {
            if (n !== -1)
                throw new Error('Can not specify "fromSampleRate" when reading from ArrayBuffer');
            s = e,
            a = new Blob([s],{
                type: "audio/wav"
            })
        } else {
            let h, m;
            if (e instanceof Int16Array) {
                m = e,
                h = new Float32Array(e.length);
                for (let v = 0; v < e.length; v++)
                    h[v] = e[v] / 32768
            } else if (e instanceof Float32Array)
                h = e;
            else if (e instanceof Array)
                h = new Float32Array(e);
            else
                throw new Error('"audioData" must be one of: Blob, Float32Arrray, Int16Array, ArrayBuffer, Array<number>');
            if (n === -1)
                throw new Error('Must specify "fromSampleRate" when reading from Float32Array, In16Array or Array');
            if (n < 3e3)
                throw new Error('Minimum "fromSampleRate" is 3000 (3kHz)');
            m || (m = je.floatTo16BitPCM(h));
            const _ = {
                bitsPerSample: 16,
                channels: [h],
                data: m
            };
            a = new je().pack(n, _).blob,
            s = await a.arrayBuffer()
        }
        const c = await i.decodeAudioData(s)
          , l = c.getChannelData(0)
          , u = URL.createObjectURL(a);
        return {
            blob: a,
            url: u,
            values: l,
            audioBuffer: c
        }
    }
    log() {
        return this.debug && this.log(...arguments),
        !0
    }
    getSampleRate() {
        return this.sampleRate
    }
    getStatus() {
        return this.processor ? this.recording ? "recording" : "paused" : "ended"
    }
    async _event(e, t={}, n=null) {
        if (n = n || this.processor,
        !n)
            throw new Error("Can not send events without recording first");
        const i = {
            event: e,
            id: this._lastEventId++,
            data: t
        };
        n.port.postMessage(i);
        const s = new Date().valueOf();
        for (; !this.eventReceipts[i.id]; ) {
            if (new Date().valueOf() - s > this.eventTimeout)
                throw new Error(`Timeout waiting for "${e}" event`);
            await new Promise(c => setTimeout( () => c(!0), 1))
        }
        const a = this.eventReceipts[i.id];
        return delete this.eventReceipts[i.id],
        a
    }
    listenForDeviceChange(e) {
        if (e === null && this._deviceChangeCallback)
            navigator.mediaDevices.removeEventListener("devicechange", this._deviceChangeCallback),
            this._deviceChangeCallback = null;
        else if (e !== null) {
            let t = 0
              , n = [];
            const i = a => a.map(c => c.deviceId).sort().join(",")
              , s = async () => {
                let a = ++t;
                const c = await this.listDevices();
                a === t && i(n) !== i(c) && (n = c,
                e(c.slice()))
            }
            ;
            navigator.mediaDevices.addEventListener("devicechange", s),
            s(),
            this._deviceChangeCallback = s
        }
        return !0
    }
    listenForDeviceErrors(e) {
        this._deviceErrorCallback = e
    }
    async requestPermission() {
        const e = await navigator.permissions.query({
            name: "microphone"
        });
        if (e.state === "denied")
            this._deviceErrorCallback && this._deviceErrorCallback({
                devices: ["mic"],
                type: "unknown",
                error: new Error("Microphone access denied")
            });
        else if (e.state === "prompt")
            try {
                (await navigator.mediaDevices.getUserMedia({
                    audio: !0
                })).getTracks().forEach(i => i.stop())
            } catch (t) {
                console.error("Error accessing microphone."),
                this._deviceErrorCallback && this._deviceErrorCallback({
                    devices: ["mic"],
                    type: "unknown",
                    error: t
                })
            }
        return !0
    }
    async listDevices() {
        if (!navigator.mediaDevices || !("enumerateDevices"in navigator.mediaDevices))
            throw new Error("Could not request user devices");
        return await this.requestPermission(),
        (await navigator.mediaDevices.enumerateDevices()).filter(n => n.kind === "audioinput")
    }
    async begin(e) {
        var c;
        if (this.processor)
            throw new Error("Already connected: please call .end() to start a new session");
        if (!navigator.mediaDevices || !("getUserMedia"in navigator.mediaDevices))
            throw this._deviceErrorCallback && this._deviceErrorCallback({
                devices: ["mic", "cam"],
                type: "undefined-mediadevices"
            }),
            new Error("Could not request user media");
        e = e ?? ((c = this.deviceSelection) == null ? void 0 : c.deviceId);
        try {
            const l = {
                audio: !0
            };
            e && (l.audio = {
                deviceId: {
                    exact: e
                }
            }),
            this.stream = await navigator.mediaDevices.getUserMedia(l)
        } catch (l) {
            throw this._deviceErrorCallback && this._deviceErrorCallback({
                devices: ["mic"],
                type: "unknown",
                error: l
            }),
            new Error("Could not start media stream")
        }
        this.listDevices().then(l => {
            e = this.stream.getAudioTracks()[0].getSettings().deviceId,
            console.log("find current device", l, e, this.stream.getAudioTracks()[0].getSettings()),
            this.deviceSelection = l.find(u => u.deviceId === e),
            console.log("current device", this.deviceSelection)
        }
        );
        const t = new AudioContext({
            sampleRate: this.sampleRate
        })
          , n = t.createMediaStreamSource(this.stream);
        try {
            await t.audioWorklet.addModule(this.scriptSrc)
        } catch (l) {
            throw console.error(l),
            new Error(`Could not add audioWorklet module: ${this.scriptSrc}`)
        }
        const i = new AudioWorkletNode(t,"audio_processor");
        i.port.onmessage = l => {
            const {event: u, id: h, data: m} = l.data;
            if (u === "receipt")
                this.eventReceipts[h] = m;
            else if (u === "chunk")
                if (this._chunkProcessorSize) {
                    const _ = this._chunkProcessorBuffer;
                    this._chunkProcessorBuffer = {
                        raw: je.mergeBuffers(_.raw, m.raw),
                        mono: je.mergeBuffers(_.mono, m.mono)
                    },
                    this._chunkProcessorBuffer.mono.byteLength >= this._chunkProcessorSize && (this._chunkProcessor(this._chunkProcessorBuffer),
                    this._chunkProcessorBuffer = {
                        raw: new ArrayBuffer(0),
                        mono: new ArrayBuffer(0)
                    })
                } else
                    this._chunkProcessor(m)
        }
        ;
        const s = n.connect(i)
          , a = t.createAnalyser();
        return a.fftSize = 8192,
        a.smoothingTimeConstant = .1,
        s.connect(a),
        this.outputToSpeakers && (console.warn(`Warning: Output to speakers may affect sound quality,
especially due to system audio feedback preventative measures.
use only for debugging`),
        a.connect(t.destination)),
        this.source = n,
        this.node = s,
        this.analyser = a,
        this.processor = i,
        console.log("begin completed"),
        !0
    }
    getFrequencies(e="frequency", t=-100, n=-30) {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        return ir.getFrequencies(this.analyser, this.sampleRate, null, e, t, n)
    }
    async pause() {
        if (this.processor) {
            if (!this.recording)
                throw new Error("Already paused: please call .record() first")
        } else
            throw new Error("Session ended: please call .begin() first");
        return this._chunkProcessorBuffer.raw.byteLength && this._chunkProcessor(this._chunkProcessorBuffer),
        this.log("Pausing ..."),
        await this._event("stop"),
        this.recording = !1,
        !0
    }
    async record(e= () => {}
    , t=8192) {
        if (this.processor) {
            if (this.recording)
                throw new Error("Already recording: please call .pause() first");
            if (typeof e != "function")
                throw new Error("chunkProcessor must be a function")
        } else
            throw new Error("Session ended: please call .begin() first");
        return this._chunkProcessor = e,
        this._chunkProcessorSize = t,
        this._chunkProcessorBuffer = {
            raw: new ArrayBuffer(0),
            mono: new ArrayBuffer(0)
        },
        this.log("Recording ..."),
        await this._event("start"),
        this.recording = !0,
        !0
    }
    async clear() {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        return await this._event("clear"),
        !0
    }
    async read() {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        return this.log("Reading ..."),
        await this._event("read")
    }
    async save(e=!1) {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        if (!e && this.recording)
            throw new Error("Currently recording: please call .pause() first, or call .save(true) to force");
        this.log("Exporting ...");
        const t = await this._event("export");
        return new je().pack(this.sampleRate, t.audio)
    }
    async end() {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        const e = this.processor;
        this.log("Stopping ..."),
        await this._event("stop"),
        this.recording = !1,
        this.stream.getTracks().forEach(a => a.stop()),
        this.log("Exporting ...");
        const n = await this._event("export", {}, e);
        return this.processor.disconnect(),
        this.source.disconnect(),
        this.node.disconnect(),
        this.analyser.disconnect(),
        this.stream = null,
        this.processor = null,
        this.source = null,
        this.node = null,
        new je().pack(this.sampleRate, n.audio)
    }
    async quit() {
        return this.listenForDeviceChange(null),
        this.deviceSelection = null,
        this.processor && await this.end(),
        !0
    }
}
globalThis.WavRecorder = Vc;
class th {
    constructor({sampleRate: e=44100, outputToSpeakers: t=!1, debug: n=!1}={}) {
        this.scriptSrc = Uc,
        this.sampleRate = e,
        this.outputToSpeakers = t,
        this.debug = !!n,
        this.stream = null,
        this.processor = null,
        this.source = null,
        this.node = null,
        this.recording = !1,
        this._lastEventId = 0,
        this.eventReceipts = {},
        this.eventTimeout = 5e3,
        this._chunkProcessor = () => {}
        ,
        this._chunkProcessorSize = void 0,
        this._chunkProcessorBuffer = {
            raw: new ArrayBuffer(0),
            mono: new ArrayBuffer(0)
        }
    }
    log() {
        return this.debug && this.log(...arguments),
        !0
    }
    getSampleRate() {
        return this.sampleRate
    }
    getStatus() {
        return this.processor ? this.recording ? "recording" : "paused" : "ended"
    }
    async _event(e, t={}, n=null) {
        if (n = n || this.processor,
        !n)
            throw new Error("Can not send events without recording first");
        const i = {
            event: e,
            id: this._lastEventId++,
            data: t
        };
        n.port.postMessage(i);
        const s = new Date().valueOf();
        for (; !this.eventReceipts[i.id]; ) {
            if (new Date().valueOf() - s > this.eventTimeout)
                throw new Error(`Timeout waiting for "${e}" event`);
            await new Promise(c => setTimeout( () => c(!0), 1))
        }
        const a = this.eventReceipts[i.id];
        return delete this.eventReceipts[i.id],
        a
    }
    async begin(e) {
        if (this.processor)
            throw new Error("Already connected: please call .end() to start a new session");
        if (!e || e.kind !== "audio")
            throw new Error("No audio track provided");
        this.stream = new MediaStream([e]);
        const t = new AudioContext({
            sampleRate: this.sampleRate
        })
          , n = t.createMediaStreamSource(this.stream);
        try {
            await t.audioWorklet.addModule(this.scriptSrc)
        } catch (c) {
            throw console.error(c),
            new Error(`Could not add audioWorklet module: ${this.scriptSrc}`)
        }
        const i = new AudioWorkletNode(t,"audio_processor");
        i.port.onmessage = c => {
            const {event: l, id: u, data: h} = c.data;
            if (l === "receipt")
                this.eventReceipts[u] = h;
            else if (l === "chunk")
                if (this._chunkProcessorSize) {
                    const m = this._chunkProcessorBuffer;
                    this._chunkProcessorBuffer = {
                        raw: je.mergeBuffers(m.raw, h.raw),
                        mono: je.mergeBuffers(m.mono, h.mono)
                    },
                    this._chunkProcessorBuffer.mono.byteLength >= this._chunkProcessorSize && (this._chunkProcessor(this._chunkProcessorBuffer),
                    this._chunkProcessorBuffer = {
                        raw: new ArrayBuffer(0),
                        mono: new ArrayBuffer(0)
                    })
                } else
                    this._chunkProcessor(h)
        }
        ;
        const s = n.connect(i)
          , a = t.createAnalyser();
        return a.fftSize = 8192,
        a.smoothingTimeConstant = .1,
        s.connect(a),
        this.outputToSpeakers && (console.warn(`Warning: Output to speakers may affect sound quality,
especially due to system audio feedback preventative measures.
use only for debugging`),
        a.connect(t.destination)),
        this.source = n,
        this.node = s,
        this.analyser = a,
        this.processor = i,
        !0
    }
    getFrequencies(e="frequency", t=-100, n=-30) {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        return ir.getFrequencies(this.analyser, this.sampleRate, null, e, t, n)
    }
    async pause() {
        if (this.processor) {
            if (!this.recording)
                throw new Error("Already paused: please call .record() first")
        } else
            throw new Error("Session ended: please call .begin() first");
        return this._chunkProcessorBuffer.raw.byteLength && this._chunkProcessor(this._chunkProcessorBuffer),
        this.log("Pausing ..."),
        await this._event("stop"),
        this.recording = !1,
        !0
    }
    async record(e= () => {}
    , t=8192) {
        if (this.processor) {
            if (this.recording)
                throw new Error("Already recording: HELLO please call .pause() first");
            if (typeof e != "function")
                throw new Error("chunkProcessor must be a function")
        } else
            throw new Error("Session ended: please call .begin() first");
        return this._chunkProcessor = e,
        this._chunkProcessorSize = t,
        this._chunkProcessorBuffer = {
            raw: new ArrayBuffer(0),
            mono: new ArrayBuffer(0)
        },
        this.log("Recording ..."),
        await this._event("start"),
        this.recording = !0,
        !0
    }
    async clear() {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        return await this._event("clear"),
        !0
    }
    async read() {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        return this.log("Reading ..."),
        await this._event("read")
    }
    async save(e=!1) {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        if (!e && this.recording)
            throw new Error("Currently recording: please call .pause() first, or call .save(true) to force");
        this.log("Exporting ...");
        const t = await this._event("export");
        return new je().pack(this.sampleRate, t.audio)
    }
    async end() {
        if (!this.processor)
            throw new Error("Session ended: please call .begin() first");
        const e = this.processor;
        this.log("Stopping ..."),
        await this._event("stop"),
        this.recording = !1,
        this.log("Exporting ...");
        const t = await this._event("export", {}, e);
        return this.processor.disconnect(),
        this.source.disconnect(),
        this.node.disconnect(),
        this.analyser.disconnect(),
        this.stream = null,
        this.processor = null,
        this.source = null,
        this.node = null,
        new je().pack(this.sampleRate, t.audio)
    }
    async quit() {
        return this.listenForDeviceChange(null),
        this.processor && await this.end(),
        !0
    }
}
globalThis.WavRecorder = WavRecorder;
var rh = (function() {
    var r = function(e, t) {
        return r = Object.setPrototypeOf || {
            __proto__: []
        }instanceof Array && function(n, i) {
            n.__proto__ = i
        }
        || function(n, i) {
            for (var s in i)
                Object.prototype.hasOwnProperty.call(i, s) && (n[s] = i[s])
        }
        ,
        r(e, t)
    };
    return function(e, t) {
        if (typeof t != "function" && t !== null)
            throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
        r(e, t);
        function n() {
            this.constructor = e
        }
        e.prototype = t === null ? Object.create(t) : (n.prototype = t.prototype,
        new n)
    }
}
)()
  , Pt = function(r, e, t, n) {
    function i(s) {
        return s instanceof t ? s : new t(function(a) {
            a(s)
        }
        )
    }
    return new (t || (t = Promise))(function(s, a) {
        function c(h) {
            try {
                u(n.next(h))
            } catch (m) {
                a(m)
            }
        }
        function l(h) {
            try {
                u(n.throw(h))
            } catch (m) {
                a(m)
            }
        }
        function u(h) {
            h.done ? s(h.value) : i(h.value).then(c, l)
        }
        u((n = n.apply(r, e || [])).next())
    }
    )
}
  , It = function(r, e) {
    var t = {
        label: 0,
        sent: function() {
            if (s[0] & 1)
                throw s[1];
            return s[1]
        },
        trys: [],
        ops: []
    }, n, i, s, a = Object.create((typeof Iterator == "function" ? Iterator : Object).prototype);
    return a.next = c(0),
    a.throw = c(1),
    a.return = c(2),
    typeof Symbol == "function" && (a[Symbol.iterator] = function() {
        return this
    }
    ),
    a;
    function c(u) {
        return function(h) {
            return l([u, h])
        }
    }
    function l(u) {
        if (n)
            throw new TypeError("Generator is already executing.");
        for (; a && (a = 0,
        u[0] && (t = 0)),
        t; )
            try {
                if (n = 1,
                i && (s = u[0] & 2 ? i.return : u[0] ? i.throw || ((s = i.return) && s.call(i),
                0) : i.next) && !(s = s.call(i, u[1])).done)
                    return s;
                switch (i = 0,
                s && (u = [u[0] & 2, s.value]),
                u[0]) {
                case 0:
                case 1:
                    s = u;
                    break;
                case 4:
                    return t.label++,
                    {
                        value: u[1],
                        done: !1
                    };
                case 5:
                    t.label++,
                    i = u[1],
                    u = [0];
                    continue;
                case 7:
                    u = t.ops.pop(),
                    t.trys.pop();
                    continue;
                default:
                    if (s = t.trys,
                    !(s = s.length > 0 && s[s.length - 1]) && (u[0] === 6 || u[0] === 2)) {
                        t = 0;
                        continue
                    }
                    if (u[0] === 3 && (!s || u[1] > s[0] && u[1] < s[3])) {
                        t.label = u[1];
                        break
                    }
                    if (u[0] === 6 && t.label < s[1]) {
                        t.label = s[1],
                        s = u;
                        break
                    }
                    if (s && t.label < s[2]) {
                        t.label = s[2],
                        t.ops.push(u);
                        break
                    }
                    s[2] && t.ops.pop(),
                    t.trys.pop();
                    continue
                }
                u = e.call(r, t)
            } catch (h) {
                u = [6, h],
                i = 0
            } finally {
                n = s = 0
            }
        if (u[0] & 5)
            throw u[1];
        return {
            value: u[0] ? u[1] : void 0,
            done: !0
        }
    }
}
  , Wc = (function() {
    function r() {
        this._callbacks = {},
        this._micEnabled = !0,
        this._camEnabled = !1,
        this._supportsScreenShare = !1
    }
    return r.prototype.setUserAudioCallback = function(e) {
        this._userAudioCallback = e
    }
    ,
    r.prototype.setClientOptions = function(e, t) {
        var n, i, s;
        t === void 0 && (t = !1),
        !(this._options && !t) && (this._options = e,
        this._callbacks = (n = e.callbacks) !== null && n !== void 0 ? n : {},
        this._micEnabled = (i = e.enableMic) !== null && i !== void 0 ? i : !0,
        this._camEnabled = (s = e.enableCam) !== null && s !== void 0 ? s : !1)
    }
    ,
    Object.defineProperty(r.prototype, "supportsScreenShare", {
        get: function() {
            return this._supportsScreenShare
        },
        enumerable: !1,
        configurable: !0
    }),
    r
}
)();
(function(r) {
    rh(e, r);
    function e(t, n) {
        t === void 0 && (t = void 0),
        n === void 0 && (n = 8e3);
        var i = r.call(this) || this;
        return i._initialized = !1,
        i._recorderChunkSize = void 0,
        i._recorderChunkSize = t,
        i._wavRecorder = new Vc({
            sampleRate: n
        }),
        i._wavStreamPlayer = new rs({
            sampleRate: 24e3
        }),
        i
    }
    return e.prototype.initialize = function() {
        return Pt(this, void 0, Promise, function() {
            return It(this, function(t) {
                switch (t.label) {
                case 0:
                    return t.trys.push([0, 2, , 3]),
                    [4, this._wavRecorder.begin()];
                case 1:
                    return t.sent(),
                    [3, 3];
                case 2:
                    return t.sent(),
                    [3, 3];
                case 3:
                    return this._wavRecorder.listenForDeviceChange(null),
                    this._wavRecorder.listenForDeviceChange(this._handleAvailableDevicesUpdated.bind(this)),
                    this._wavRecorder.listenForDeviceErrors(null),
                    this._wavRecorder.listenForDeviceErrors(this._handleDeviceError.bind(this)),
                    [4, this._wavStreamPlayer.connect()];
                case 4:
                    return t.sent(),
                    this._initialized = !0,
                    [2]
                }
            })
        })
    }
    ,
    e.prototype.connect = function() {
        return Pt(this, void 0, Promise, function() {
            var t;
            return It(this, function(n) {
                switch (n.label) {
                case 0:
                    return this._initialized ? [3, 2] : [4, this.initialize()];
                case 1:
                    n.sent(),
                    n.label = 2;
                case 2:
                    return t = this._wavRecorder.getStatus() == "recording",
                    this._micEnabled && !t ? [4, this._startRecording()] : [3, 4];
                case 3:
                    n.sent(),
                    n.label = 4;
                case 4:
                    return this._camEnabled && console.warn("WavMediaManager does not support video input."),
                    [2]
                }
            })
        })
    }
    ,
    e.prototype.disconnect = function() {
        return Pt(this, void 0, Promise, function() {
            return It(this, function(t) {
                switch (t.label) {
                case 0:
                    return this._initialized ? [4, this._wavRecorder.end()] : [2];
                case 1:
                    return t.sent(),
                    [4, this._wavStreamPlayer.interrupt()];
                case 2:
                    return t.sent(),
                    this._initialized = !1,
                    [2]
                }
            })
        })
    }
    ,
    e.prototype.userStartedSpeaking = function() {
        return Pt(this, void 0, Promise, function() {
            return It(this, function(t) {
                return [2, this._wavStreamPlayer.interrupt()]
            })
        })
    }
    ,
    e.prototype.bufferBotAudio = function(t, n) {
        return this._wavStreamPlayer.add16BitPCM(t, n)
    }
    ,
    e.prototype.getAllMics = function() {
        return this._wavRecorder.listDevices()
    }
    ,
    e.prototype.getAllCams = function() {
        return Promise.resolve([])
    }
    ,
    e.prototype.getAllSpeakers = function() {
        return Promise.resolve([])
    }
    ,
    e.prototype.updateMic = function(t) {
        return Pt(this, void 0, Promise, function() {
            var n, i, s, a;
            return It(this, function(c) {
                switch (c.label) {
                case 0:
                    return n = this._wavRecorder.deviceSelection,
                    this._wavRecorder.getStatus() === "ended" ? [3, 2] : [4, this._wavRecorder.end()];
                case 1:
                    c.sent(),
                    c.label = 2;
                case 2:
                    return c.trys.push([2, 6, , 7]),
                    [4, this._wavRecorder.begin(t)];
                case 3:
                    return c.sent(),
                    this._micEnabled ? [4, this._startRecording()] : [3, 5];
                case 4:
                    c.sent(),
                    c.label = 5;
                case 5:
                    return i = this._wavRecorder.deviceSelection,
                    i && n && n.label !== i.label && ((a = (s = this._callbacks).onMicUpdated) === null || a === void 0 || a.call(s, i)),
                    [3, 7];
                case 6:
                    return c.sent(),
                    [3, 7];
                case 7:
                    return [2]
                }
            })
        })
    }
    ,
    e.prototype.updateCam = function(t) {}
    ,
    e.prototype.updateSpeaker = function(t) {}
    ,
    Object.defineProperty(e.prototype, "selectedMic", {
        get: function() {
            var t;
            return (t = this._wavRecorder.deviceSelection) !== null && t !== void 0 ? t : {}
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "selectedCam", {
        get: function() {
            return {}
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "selectedSpeaker", {
        get: function() {
            return {}
        },
        enumerable: !1,
        configurable: !0
    }),
    e.prototype.enableMic = function(t) {
        return Pt(this, void 0, Promise, function() {
            var n = this;
            return It(this, function(i) {
                switch (i.label) {
                case 0:
                    return this._micEnabled = t,
                    this._wavRecorder.stream ? (this._wavRecorder.stream.getAudioTracks().forEach(function(s) {
                        var a, c;
                        s.enabled = t,
                        t || (c = (a = n._callbacks).onTrackStopped) === null || c === void 0 || c.call(a, s, po())
                    }),
                    t ? [4, this._startRecording()] : [3, 2]) : [2];
                case 1:
                    return i.sent(),
                    [3, 4];
                case 2:
                    return [4, this._wavRecorder.pause()];
                case 3:
                    i.sent(),
                    i.label = 4;
                case 4:
                    return [2]
                }
            })
        })
    }
    ,
    e.prototype.enableCam = function(t) {
        console.warn("WavMediaManager does not support video input.")
    }
    ,
    e.prototype.enableScreenShare = function(t) {
        console.warn("WavMediaManager does not support screen sharing.")
    }
    ,
    Object.defineProperty(e.prototype, "isCamEnabled", {
        get: function() {
            return !1
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "isMicEnabled", {
        get: function() {
            return this._micEnabled
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "isSharingScreen", {
        get: function() {
            return !1
        },
        enumerable: !1,
        configurable: !0
    }),
    e.prototype.tracks = function() {
        var t, n = (t = this._wavRecorder.stream) === null || t === void 0 ? void 0 : t.getTracks()[0];
        return {
            local: n ? {
                audio: n
            } : {}
        }
    }
    ,
    e.prototype._startRecording = function() {
        return Pt(this, void 0, void 0, function() {
            var t, n = this, i, s, a;
            return It(this, function(c) {
                switch (c.label) {
                case 0:
                    return [4, this._wavRecorder.record(function(l) {
                        var u;
                        (u = n._userAudioCallback) === null || u === void 0 || u.call(n, l.mono)
                    }, this._recorderChunkSize)];
                case 1:
                    return c.sent(),
                    t = (i = this._wavRecorder.stream) === null || i === void 0 ? void 0 : i.getAudioTracks()[0],
                    t && ((a = (s = this._callbacks).onTrackStarted) === null || a === void 0 || a.call(s, t, po())),
                    [2]
                }
            })
        })
    }
    ,
    e.prototype._handleAvailableDevicesUpdated = function(t) {
        var n, i, s, a;
        (i = (n = this._callbacks).onAvailableCamsUpdated) === null || i === void 0 || i.call(n, t.filter(function(u) {
            return u.kind === "videoinput"
        })),
        (a = (s = this._callbacks).onAvailableMicsUpdated) === null || a === void 0 || a.call(s, t.filter(function(u) {
            return u.kind === "audioinput"
        }));
        var c = t.find(function(u) {
            return u.deviceId === "default"
        })
          , l = this._wavRecorder.deviceSelection;
        l && (!t.some(function(u) {
            return u.deviceId === l.deviceId
        }) || l.deviceId === "default" && l.label !== (c == null ? void 0 : c.label)) && this.updateMic("")
    }
    ,
    e.prototype._handleDeviceError = function(t) {
        var n, i, s = t.devices, a = t.type, c = t.error, l = new Xe(s,a,c == null ? void 0 : c.message,c ? {
            sourceError: c
        } : void 0);
        (i = (n = this._callbacks).onDeviceError) === null || i === void 0 || i.call(n, l)
    }
    ,
    e
}
)(Wc);
var po = function() {
    return {
        id: "local",
        name: "",
        local: !0
    }
}, nh = (function() {
    var r = function(e, t) {
        return r = Object.setPrototypeOf || {
            __proto__: []
        }instanceof Array && function(n, i) {
            n.__proto__ = i
        }
        || function(n, i) {
            for (var s in i)
                Object.prototype.hasOwnProperty.call(i, s) && (n[s] = i[s])
        }
        ,
        r(e, t)
    };
    return function(e, t) {
        if (typeof t != "function" && t !== null)
            throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
        r(e, t);
        function n() {
            this.constructor = e
        }
        e.prototype = t === null ? Object.create(t) : (n.prototype = t.prototype,
        new n)
    }
}
)(), De = function(r, e, t, n) {
    function i(s) {
        return s instanceof t ? s : new t(function(a) {
            a(s)
        }
        )
    }
    return new (t || (t = Promise))(function(s, a) {
        function c(h) {
            try {
                u(n.next(h))
            } catch (m) {
                a(m)
            }
        }
        function l(h) {
            try {
                u(n.throw(h))
            } catch (m) {
                a(m)
            }
        }
        function u(h) {
            h.done ? s(h.value) : i(h.value).then(c, l)
        }
        u((n = n.apply(r, e || [])).next())
    }
    )
}, Re = function(r, e) {
    var t = {
        label: 0,
        sent: function() {
            if (s[0] & 1)
                throw s[1];
            return s[1]
        },
        trys: [],
        ops: []
    }, n, i, s, a = Object.create((typeof Iterator == "function" ? Iterator : Object).prototype);
    return a.next = c(0),
    a.throw = c(1),
    a.return = c(2),
    typeof Symbol == "function" && (a[Symbol.iterator] = function() {
        return this
    }
    ),
    a;
    function c(u) {
        return function(h) {
            return l([u, h])
        }
    }
    function l(u) {
        if (n)
            throw new TypeError("Generator is already executing.");
        for (; a && (a = 0,
        u[0] && (t = 0)),
        t; )
            try {
                if (n = 1,
                i && (s = u[0] & 2 ? i.return : u[0] ? i.throw || ((s = i.return) && s.call(i),
                0) : i.next) && !(s = s.call(i, u[1])).done)
                    return s;
                switch (i = 0,
                s && (u = [u[0] & 2, s.value]),
                u[0]) {
                case 0:
                case 1:
                    s = u;
                    break;
                case 4:
                    return t.label++,
                    {
                        value: u[1],
                        done: !1
                    };
                case 5:
                    t.label++,
                    i = u[1],
                    u = [0];
                    continue;
                case 7:
                    u = t.ops.pop(),
                    t.trys.pop();
                    continue;
                default:
                    if (s = t.trys,
                    !(s = s.length > 0 && s[s.length - 1]) && (u[0] === 6 || u[0] === 2)) {
                        t = 0;
                        continue
                    }
                    if (u[0] === 3 && (!s || u[1] > s[0] && u[1] < s[3])) {
                        t.label = u[1];
                        break
                    }
                    if (u[0] === 6 && t.label < s[1]) {
                        t.label = s[1],
                        s = u;
                        break
                    }
                    if (s && t.label < s[2]) {
                        t.label = s[2],
                        t.ops.push(u);
                        break
                    }
                    s[2] && t.ops.pop(),
                    t.trys.pop();
                    continue
                }
                u = e.call(r, t)
            } catch (h) {
                u = [6, h],
                i = 0
            } finally {
                n = s = 0
            }
        if (u[0] & 5)
            throw u[1];
        return {
            value: u[0] ? u[1] : void 0,
            done: !0
        }
    }
}, ih = (function(r) {
    nh(e, r);
    function e(t, n, i, s, a, c, l) {
        t === void 0 && (t = !0),
        n === void 0 && (n = !0),
        a === void 0 && (a = void 0),
        c === void 0 && (c = 8e3),
        l === void 0 && (l = 24e3);
        var u, h = r.call(this) || this;
        return h._selectedCam = {},
        h._selectedMic = {},
        h._selectedSpeaker = {},
        h._remoteAudioLevelInterval = null,
        h._recorderChunkSize = void 0,
        h._initialized = !1,
        h._connected = !1,
        h._currentAudioTrack = null,
        h._connectResolve = null,
        h.onTrackStartedCallback = i,
        h.onTrackStoppedCallback = s,
        h._recorderChunkSize = a,
        h._supportsScreenShare = !0,
        h._daily = (u = Ya.getCallInstance()) !== null && u !== void 0 ? u : Ya.createCallObject(),
        n && (h._mediaStreamRecorder = new th({
            sampleRate: c
        })),
        t && (h._wavStreamPlayer = new rs({
            sampleRate: l
        })),
        h._daily.on("track-started", h.handleTrackStarted.bind(h)),
        h._daily.on("track-stopped", h.handleTrackStopped.bind(h)),
        h._daily.on("available-devices-updated", h._handleAvailableDevicesUpdated.bind(h)),
        h._daily.on("selected-devices-updated", h._handleSelectedDevicesUpdated.bind(h)),
        h._daily.on("camera-error", h.handleDeviceError.bind(h)),
        h._daily.on("local-audio-level", h._handleLocalAudioLevel.bind(h)),
        h
    }
    return e.prototype.initialize = function() {
        return De(this, void 0, Promise, function() {
            var t, n, i, s, a, c = this, l, u, h, m, _, M, b, v, E, C, x, N;
            return Re(this, function(k) {
                switch (k.label) {
                case 0:
                    return this._initialized ? (console.warn("DailyMediaManager already initialized"),
                    [2]) : [4, this._daily.startCamera({
                        startVideoOff: !this._camEnabled,
                        startAudioOff: !this._micEnabled,
                        dailyConfig: {
                            useDevicePreferenceCookies: !0
                        }
                    })];
                case 1:
                    return t = k.sent(),
                    [4, this._daily.enumerateDevices()];
                case 2:
                    return n = k.sent().devices,
                    i = n.filter(function(w) {
                        return w.kind === "videoinput"
                    }),
                    s = n.filter(function(w) {
                        return w.kind === "audioinput"
                    }),
                    a = n.filter(function(w) {
                        return w.kind === "audiooutput"
                    }),
                    (u = (l = this._callbacks).onAvailableCamsUpdated) === null || u === void 0 || u.call(l, i),
                    (m = (h = this._callbacks).onAvailableMicsUpdated) === null || m === void 0 || m.call(h, s),
                    (M = (_ = this._callbacks).onAvailableSpeakersUpdated) === null || M === void 0 || M.call(_, a),
                    this._selectedCam = t.camera,
                    (v = (b = this._callbacks).onCamUpdated) === null || v === void 0 || v.call(b, t.camera),
                    this._selectedMic = t.mic,
                    (C = (E = this._callbacks).onMicUpdated) === null || C === void 0 || C.call(E, t.mic),
                    this._selectedSpeaker = t.speaker,
                    (N = (x = this._callbacks).onSpeakerUpdated) === null || N === void 0 || N.call(x, t.speaker),
                    this._daily.isLocalAudioLevelObserverRunning() ? [3, 4] : [4, this._daily.startLocalAudioLevelObserver(100)];
                case 3:
                    k.sent(),
                    k.label = 4;
                case 4:
                    return this._wavStreamPlayer ? [4, this._wavStreamPlayer.connect()] : [3, 6];
                case 5:
                    k.sent(),
                    this._remoteAudioLevelInterval || (this._remoteAudioLevelInterval = setInterval(function() {
                        var w, T = c._wavStreamPlayer.getFrequencies(), L = 0;
                        !((w = T.values) === null || w === void 0) && w.length && (L = T.values.reduce(function(D, q) {
                            return D + q
                        }, 0) / T.values.length),
                        c._handleRemoteAudioLevel(L)
                    }, 100)),
                    k.label = 6;
                case 6:
                    return this._initialized = !0,
                    [2]
                }
            })
        })
    }
    ,
    e.prototype.connect = function() {
        return De(this, void 0, Promise, function() {
            var t = this;
            return Re(this, function(n) {
                return this._connected ? (console.warn("DailyMediaManager already connected"),
                [2]) : (this._connected = !0,
                this._initialized ? (this._micEnabled && this._startRecording(),
                [2]) : [2, new Promise(function(i) {
                    (function() {
                        return De(t, void 0, void 0, function() {
                            return Re(this, function(s) {
                                switch (s.label) {
                                case 0:
                                    return this._connectResolve = i,
                                    [4, this.initialize()];
                                case 1:
                                    return s.sent(),
                                    [2]
                                }
                            })
                        })
                    }
                    )()
                }
                )])
            })
        })
    }
    ,
    e.prototype.disconnect = function() {
        return De(this, void 0, Promise, function() {
            var t, n;
            return Re(this, function(i) {
                switch (i.label) {
                case 0:
                    return this._remoteAudioLevelInterval && clearInterval(this._remoteAudioLevelInterval),
                    this._remoteAudioLevelInterval = null,
                    this._daily.leave(),
                    this._currentAudioTrack = null,
                    [4, (t = this._mediaStreamRecorder) === null || t === void 0 ? void 0 : t.end()];
                case 1:
                    return i.sent(),
                    (n = this._wavStreamPlayer) === null || n === void 0 || n.interrupt(),
                    this._initialized = !1,
                    this._connected = !1,
                    [2]
                }
            })
        })
    }
    ,
    e.prototype.userStartedSpeaking = function() {
        return De(this, void 0, Promise, function() {
            var t;
            return Re(this, function(n) {
                return [2, (t = this._wavStreamPlayer) === null || t === void 0 ? void 0 : t.interrupt()]
            })
        })
    }
    ,
    e.prototype.bufferBotAudio = function(t, n) {
        var i;
        return (i = this._wavStreamPlayer) === null || i === void 0 ? void 0 : i.add16BitPCM(t, n)
    }
    ,
    e.prototype.getAllMics = function() {
        return De(this, void 0, Promise, function() {
            var t;
            return Re(this, function(n) {
                switch (n.label) {
                case 0:
                    return [4, this._daily.enumerateDevices()];
                case 1:
                    return t = n.sent().devices,
                    [2, t.filter(function(i) {
                        return i.kind === "audioinput"
                    })]
                }
            })
        })
    }
    ,
    e.prototype.getAllCams = function() {
        return De(this, void 0, Promise, function() {
            var t;
            return Re(this, function(n) {
                switch (n.label) {
                case 0:
                    return [4, this._daily.enumerateDevices()];
                case 1:
                    return t = n.sent().devices,
                    [2, t.filter(function(i) {
                        return i.kind === "videoinput"
                    })]
                }
            })
        })
    }
    ,
    e.prototype.getAllSpeakers = function() {
        return De(this, void 0, Promise, function() {
            var t;
            return Re(this, function(n) {
                switch (n.label) {
                case 0:
                    return [4, this._daily.enumerateDevices()];
                case 1:
                    return t = n.sent().devices,
                    [2, t.filter(function(i) {
                        return i.kind === "audiooutput"
                    })]
                }
            })
        })
    }
    ,
    e.prototype.updateMic = function(t) {
        var n = this;
        this._daily.setInputDevicesAsync({
            audioDeviceId: t
        }).then(function(i) {
            n._selectedMic = i.mic
        })
    }
    ,
    e.prototype.updateCam = function(t) {
        var n = this;
        this._daily.setInputDevicesAsync({
            videoDeviceId: t
        }).then(function(i) {
            n._selectedCam = i.camera
        })
    }
    ,
    e.prototype.updateSpeaker = function(t) {
        return De(this, void 0, Promise, function() {
            var n, i, s, a, c = this, l, u;
            return Re(this, function(h) {
                switch (h.label) {
                case 0:
                    return t !== "default" && this._selectedSpeaker.deviceId === t ? [2] : (n = t,
                    n !== "default" ? [3, 2] : [4, this.getAllSpeakers()]);
                case 1:
                    if (i = h.sent(),
                    s = i.find(function(m) {
                        return m.deviceId === "default"
                    }),
                    !s)
                        return console.warn("No default speaker found"),
                        [2];
                    i.splice(i.indexOf(s), 1),
                    a = i.find(function(m) {
                        return s.label.includes(m.label)
                    }),
                    n = (l = a == null ? void 0 : a.deviceId) !== null && l !== void 0 ? l : t,
                    h.label = 2;
                case 2:
                    return (u = this._wavStreamPlayer) === null || u === void 0 || u.updateSpeaker(n).then(function() {
                        var m, _;
                        c._selectedSpeaker = {
                            deviceId: t
                        },
                        (_ = (m = c._callbacks).onSpeakerUpdated) === null || _ === void 0 || _.call(m, c._selectedSpeaker)
                    }),
                    [2]
                }
            })
        })
    }
    ,
    Object.defineProperty(e.prototype, "selectedMic", {
        get: function() {
            return this._selectedMic
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "selectedCam", {
        get: function() {
            return this._selectedCam
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "selectedSpeaker", {
        get: function() {
            return this._selectedSpeaker
        },
        enumerable: !1,
        configurable: !0
    }),
    e.prototype.enableMic = function(t) {
        return De(this, void 0, Promise, function() {
            var n;
            return Re(this, function(i) {
                return this._micEnabled = t,
                !((n = this._daily.participants()) === null || n === void 0) && n.local ? (this._daily.setLocalAudio(t),
                this._mediaStreamRecorder && (t ? this._mediaStreamRecorder.getStatus() === "paused" && this._startRecording() : this._mediaStreamRecorder.getStatus() === "recording" && this._mediaStreamRecorder.pause()),
                [2]) : [2]
            })
        })
    }
    ,
    e.prototype.enableCam = function(t) {
        this._camEnabled = t,
        this._daily.setLocalVideo(t)
    }
    ,
    e.prototype.enableScreenShare = function(t) {
        t ? this._daily.startScreenShare() : this._daily.stopScreenShare()
    }
    ,
    Object.defineProperty(e.prototype, "isCamEnabled", {
        get: function() {
            return this._daily.localVideo()
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "isMicEnabled", {
        get: function() {
            return this._daily.localAudio()
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "isSharingScreen", {
        get: function() {
            return this._daily.localScreenAudio() || this._daily.localScreenVideo()
        },
        enumerable: !1,
        configurable: !0
    }),
    e.prototype.tracks = function() {
        var t, n, i, s, a, c, l, u, h, m, _, M, b = this._daily.participants();
        return {
            local: {
                audio: (i = (n = (t = b == null ? void 0 : b.local) === null || t === void 0 ? void 0 : t.tracks) === null || n === void 0 ? void 0 : n.audio) === null || i === void 0 ? void 0 : i.persistentTrack,
                screenAudio: (c = (a = (s = b == null ? void 0 : b.local) === null || s === void 0 ? void 0 : s.tracks) === null || a === void 0 ? void 0 : a.screenAudio) === null || c === void 0 ? void 0 : c.persistentTrack,
                screenVideo: (h = (u = (l = b == null ? void 0 : b.local) === null || l === void 0 ? void 0 : l.tracks) === null || u === void 0 ? void 0 : u.screenVideo) === null || h === void 0 ? void 0 : h.persistentTrack,
                video: (M = (_ = (m = b == null ? void 0 : b.local) === null || m === void 0 ? void 0 : m.tracks) === null || _ === void 0 ? void 0 : _.video) === null || M === void 0 ? void 0 : M.persistentTrack
            }
        }
    }
    ,
    e.prototype._startRecording = function() {
        var t = this;
        if (!(!this._connected || !this._mediaStreamRecorder))
            try {
                this._mediaStreamRecorder.record(function(i) {
                    t._userAudioCallback(i.mono)
                }, this._recorderChunkSize)
            } catch (i) {
                var n = i;
                n.message.includes("Already recording") || console.error("Error starting recording", i)
            }
    }
    ,
    e.prototype._handleAvailableDevicesUpdated = function(t) {
        var n, i, s, a, c, l;
        (i = (n = this._callbacks).onAvailableCamsUpdated) === null || i === void 0 || i.call(n, t.availableDevices.filter(function(u) {
            return u.kind === "videoinput"
        })),
        (a = (s = this._callbacks).onAvailableMicsUpdated) === null || a === void 0 || a.call(s, t.availableDevices.filter(function(u) {
            return u.kind === "audioinput"
        })),
        (l = (c = this._callbacks).onAvailableSpeakersUpdated) === null || l === void 0 || l.call(c, t.availableDevices.filter(function(u) {
            return u.kind === "audiooutput"
        })),
        this._selectedSpeaker.deviceId === "default" && this.updateSpeaker("default")
    }
    ,
    e.prototype._handleSelectedDevicesUpdated = function(t) {
        var n, i, s, a, c, l;
        ((n = this._selectedCam) === null || n === void 0 ? void 0 : n.deviceId) !== t.devices.camera && (this._selectedCam = t.devices.camera,
        (s = (i = this._callbacks).onCamUpdated) === null || s === void 0 || s.call(i, t.devices.camera)),
        ((a = this._selectedMic) === null || a === void 0 ? void 0 : a.deviceId) !== t.devices.mic && (this._selectedMic = t.devices.mic,
        (l = (c = this._callbacks).onMicUpdated) === null || l === void 0 || l.call(c, t.devices.mic))
    }
    ,
    e.prototype.handleDeviceError = function(t) {
        var n, i, s = function(a) {
            var c = [];
            switch (a.type) {
            case "permissions":
                return a.blockedMedia.forEach(function(l) {
                    c.push(l === "video" ? "cam" : "mic")
                }),
                new Xe(c,a.type,a.msg,{
                    blockedBy: a.blockedBy
                });
            case "not-found":
                return a.missingMedia.forEach(function(l) {
                    c.push(l === "video" ? "cam" : "mic")
                }),
                new Xe(c,a.type,a.msg);
            case "constraints":
                return a.failedMedia.forEach(function(l) {
                    c.push(l === "video" ? "cam" : "mic")
                }),
                new Xe(c,a.type,a.msg,{
                    reason: a.reason
                });
            case "cam-in-use":
                return c.push("cam"),
                new Xe(c,"in-use",a.msg);
            case "mic-in-use":
                return c.push("mic"),
                new Xe(c,"in-use",a.msg);
            case "cam-mic-in-use":
                return c.push("cam"),
                c.push("mic"),
                new Xe(c,"in-use",a.msg);
            case "undefined-mediadevices":
            case "unknown":
            default:
                return c.push("cam"),
                c.push("mic"),
                new Xe(c,a.type,a.msg)
            }
        };
        (i = (n = this._callbacks).onDeviceError) === null || i === void 0 || i.call(n, s(t.error))
    }
    ,
    e.prototype._handleLocalAudioLevel = function(t) {
        var n, i;
        (i = (n = this._callbacks).onLocalAudioLevel) === null || i === void 0 || i.call(n, t.audioLevel)
    }
    ,
    e.prototype._handleRemoteAudioLevel = function(t) {
        var n, i;
        (i = (n = this._callbacks).onRemoteAudioLevel) === null || i === void 0 || i.call(n, t, sh())
    }
    ,
    e.prototype.handleTrackStarted = function(t) {
        return De(this, void 0, void 0, function() {
            var n, i, s, a, c, l;
            return Re(this, function(u) {
                switch (u.label) {
                case 0:
                    if (!(!((s = t.participant) === null || s === void 0) && s.local))
                        return [2];
                    if (t.track.kind !== "audio")
                        return [3, 15];
                    if (!this._mediaStreamRecorder)
                        return [3, 14];
                    switch (n = this._mediaStreamRecorder.getStatus(),
                    i = n,
                    i) {
                    case "ended":
                        return [3, 1];
                    case "paused":
                        return [3, 5];
                    case "recording":
                        return [3, 6]
                    }
                    return [3, 6];
                case 1:
                    return u.trys.push([1, 3, , 4]),
                    [4, this._mediaStreamRecorder.begin(t.track)];
                case 2:
                    return u.sent(),
                    this._connected && (this._startRecording(),
                    this._connectResolve && (this._connectResolve(),
                    this._connectResolve = null)),
                    [3, 4];
                case 3:
                    return u.sent(),
                    [3, 4];
                case 4:
                    return [3, 14];
                case 5:
                    return this._startRecording(),
                    [3, 14];
                case 6:
                    return this._currentAudioTrack === t.track ? [3, 12] : [4, this._mediaStreamRecorder.end()];
                case 7:
                    u.sent(),
                    u.label = 8;
                case 8:
                    return u.trys.push([8, 10, , 11]),
                    [4, this._mediaStreamRecorder.begin(t.track)];
                case 9:
                    return u.sent(),
                    this._startRecording(),
                    [3, 11];
                case 10:
                    return u.sent(),
                    [3, 11];
                case 11:
                    return [3, 13];
                case 12:
                    console.warn("track-started event received for current track and already recording"),
                    u.label = 13;
                case 13:
                    return [3, 14];
                case 14:
                    this._currentAudioTrack = t.track,
                    u.label = 15;
                case 15:
                    return (c = (a = this._callbacks).onTrackStarted) === null || c === void 0 || c.call(a, t.track, t.participant ? mo(t.participant) : void 0),
                    (l = this.onTrackStartedCallback) === null || l === void 0 || l.call(this, t),
                    [2]
                }
            })
        })
    }
    ,
    e.prototype.handleTrackStopped = function(t) {
        var n, i, s, a;
        !((n = t.participant) === null || n === void 0) && n.local && (t.track.kind === "audio" && this._mediaStreamRecorder && this._mediaStreamRecorder.getStatus() === "recording" && this._mediaStreamRecorder.pause(),
        (s = (i = this._callbacks).onTrackStopped) === null || s === void 0 || s.call(i, t.track, t.participant ? mo(t.participant) : void 0),
        (a = this.onTrackStoppedCallback) === null || a === void 0 || a.call(this, t))
    }
    ,
    e
}
)(Wc), mo = function(r) {
    return {
        id: r.user_id,
        local: r.local,
        name: r.user_name
    }
}, sh = function() {
    return {
        id: "bot",
        local: !1,
        name: "Bot"
    }
}, ah = (function() {
    var r = function(e, t) {
        return r = Object.setPrototypeOf || {
            __proto__: []
        }instanceof Array && function(n, i) {
            n.__proto__ = i
        }
        || function(n, i) {
            for (var s in i)
                Object.prototype.hasOwnProperty.call(i, s) && (n[s] = i[s])
        }
        ,
        r(e, t)
    };
    return function(e, t) {
        if (typeof t != "function" && t !== null)
            throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
        r(e, t);
        function n() {
            this.constructor = e
        }
        e.prototype = t === null ? Object.create(t) : (n.prototype = t.prototype,
        new n)
    }
}
)(), ot = function(r, e, t, n) {
    function i(s) {
        return s instanceof t ? s : new t(function(a) {
            a(s)
        }
        )
    }
    return new (t || (t = Promise))(function(s, a) {
        function c(h) {
            try {
                u(n.next(h))
            } catch (m) {
                a(m)
            }
        }
        function l(h) {
            try {
                u(n.throw(h))
            } catch (m) {
                a(m)
            }
        }
        function u(h) {
            h.done ? s(h.value) : i(h.value).then(c, l)
        }
        u((n = n.apply(r, e || [])).next())
    }
    )
}, ct = function(r, e) {
    var t = {
        label: 0,
        sent: function() {
            if (s[0] & 1)
                throw s[1];
            return s[1]
        },
        trys: [],
        ops: []
    }, n, i, s, a = Object.create((typeof Iterator == "function" ? Iterator : Object).prototype);
    return a.next = c(0),
    a.throw = c(1),
    a.return = c(2),
    typeof Symbol == "function" && (a[Symbol.iterator] = function() {
        return this
    }
    ),
    a;
    function c(u) {
        return function(h) {
            return l([u, h])
        }
    }
    function l(u) {
        if (n)
            throw new TypeError("Generator is already executing.");
        for (; a && (a = 0,
        u[0] && (t = 0)),
        t; )
            try {
                if (n = 1,
                i && (s = u[0] & 2 ? i.return : u[0] ? i.throw || ((s = i.return) && s.call(i),
                0) : i.next) && !(s = s.call(i, u[1])).done)
                    return s;
                switch (i = 0,
                s && (u = [u[0] & 2, s.value]),
                u[0]) {
                case 0:
                case 1:
                    s = u;
                    break;
                case 4:
                    return t.label++,
                    {
                        value: u[1],
                        done: !1
                    };
                case 5:
                    t.label++,
                    i = u[1],
                    u = [0];
                    continue;
                case 7:
                    u = t.ops.pop(),
                    t.trys.pop();
                    continue;
                default:
                    if (s = t.trys,
                    !(s = s.length > 0 && s[s.length - 1]) && (u[0] === 6 || u[0] === 2)) {
                        t = 0;
                        continue
                    }
                    if (u[0] === 3 && (!s || u[1] > s[0] && u[1] < s[3])) {
                        t.label = u[1];
                        break
                    }
                    if (u[0] === 6 && t.label < s[1]) {
                        t.label = s[1],
                        s = u;
                        break
                    }
                    if (s && t.label < s[2]) {
                        t.label = s[2],
                        t.ops.push(u);
                        break
                    }
                    s[2] && t.ops.pop(),
                    t.trys.pop();
                    continue
                }
                u = e.call(r, t)
            } catch (h) {
                u = [6, h],
                i = 0
            } finally {
                n = s = 0
            }
        if (u[0] & 5)
            throw u[1];
        return {
            value: u[0] ? u[1] : void 0,
            done: !0
        }
    }
}, Hr = function(r, e, t) {
    if (t || arguments.length === 2)
        for (var n = 0, i = e.length, s; n < i; n++)
            (s || !(n in e)) && (s || (s = Array.prototype.slice.call(e, 0, n)),
            s[n] = e[n]);
    return r.concat(s || Array.prototype.slice.call(e))
}, qc = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], oh = 5e3, ch = 15e3, lh = 15e4, go = 2, uh = 10, dh = 1e3, fh = 3e4, hh = 1.5, ph = 4100, mh = "SIG_CONNECTION_CANCELED", gh = "WEBSOCKET_ERROR", be;
(function(r) {
    r[r.DEBUG = 0] = "DEBUG",
    r[r.ERROR = 1] = "ERROR",
    r[r.INFO = 2] = "INFO",
    r[r.WARN = 3] = "WARN"
}
)(be || (be = {}));
var vh = (function() {
    function r(e, t) {
        this._closedManually = !1,
        this._errored = !1,
        this._rejected = !1,
        this._timed_out = !1,
        this._initialConnectionOk = !1,
        this._ws = new WebSocket(e,t)
    }
    return r.prototype.addEventListener = function(e, t) {
        this._ws.addEventListener(e, t)
    }
    ,
    r.prototype.close = function(e, t) {
        this._ws.close(e, t)
    }
    ,
    r.prototype.send = function(e) {
        this._ws.send(e)
    }
    ,
    Object.defineProperty(r.prototype, "url", {
        get: function() {
            return this._ws.url
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(r.prototype, "readyState", {
        get: function() {
            return this._ws.readyState
        },
        enumerable: !1,
        configurable: !0
    }),
    r
}
)()
  , Cn = (function(r) {
    ah(e, r);
    function e(t, n, i) {
        i === void 0 && (i = {});
        var s, a = r.call(this) || this;
        if (!t)
            throw new Error("Need a valid WebSocket URL");
        return a._ws = null,
        a._url = t,
        a._protocols = n,
        a._parseBlobToJson = (s = i == null ? void 0 : i.parseBlobToJson) !== null && s !== void 0 ? s : !0,
        a.init(),
        a
    }
    return e.prototype.init = function() {
        this._keepAliveTimeout = ch,
        this._keepAliveInterval = oh,
        this._disconnected = !1,
        this._keepIntervalID = null,
        this._shouldRetryFn = null,
        this._connectionTimeout = lh,
        this._reconnectAttempts = 0,
        this._allowedReconnectAttempts = go,
        this._reconnectInterval = dh,
        this._maxReconnectInterval = fh,
        this._reconnectDecay = hh
    }
    ,
    e.prototype.connect = function() {
        return ot(this, void 0, void 0, function() {
            var t = this;
            return ct(this, function(n) {
                return [2, new Promise(function(i, s) {
                    t._disconnected = !1,
                    t.clearReconnectTimeout();
                    var a = new vh(t._url,t._protocols);
                    t.setConnectionTimeout(),
                    a.addEventListener("close", function(c) {
                        var l = c
                          , u = a._timed_out ? ph : l.code
                          , h = a._timed_out ? "websocket connection timed out" : l.reason;
                        if (a._timed_out = !1,
                        !a._closedManually && a._initialConnectionOk ? (console.warn("signaling socket closed unexpectedly: ".concat(u).concat(h ? " " + h : "")),
                        t._closeSocket(),
                        t.emit("close", u, h)) : t.log("signaling socket closed"),
                        !a._closedManually && (a._errored || a._timed_out) && (console.warn("signaling socket closed on error: ".concat(u).concat(h ? " " + h : "")),
                        !a._rejected)) {
                            a._rejected = !0;
                            var m = new Error("WebSocket connection error (".concat(u, "): ").concat(h));
                            m.name = gh,
                            s(m)
                        }
                    }),
                    a.addEventListener("open", function(c) {
                        if (t.log("wss connection opened to", be.DEBUG, t._url),
                        t.clearConnectionTimeout(),
                        !(a._rejected || a._timed_out)) {
                            if (a._closedManually || t._ws && t._ws !== a) {
                                a._rejected = !0,
                                a.close();
                                var l = Error("wss connection interrupted by disconnect or newer connection");
                                l.name = mh,
                                s(l);
                                return
                            }
                            a._initialConnectionOk = t._url,
                            t._lastMsgRecvTime = Date.now(),
                            t._keepAliveInterval && (t._keepIntervalID = setInterval(function() {
                                return t.checkSocketHealthAndSendKeepAlive()
                            }, t._keepAliveInterval)),
                            t._ws = a,
                            t.emit("open"),
                            i(a)
                        }
                    }),
                    a.addEventListener("error", function(c) {
                        if (!a._closedManually) {
                            var l = c.currentTarget;
                            t.log("websocket error event: ".concat(l == null ? void 0 : l.url))
                        }
                        a._errored = !0
                    }),
                    a.addEventListener("message", function(c) {
                        t._handleMessage(c)
                    })
                }
                )]
            })
        })
    }
    ,
    e.prototype.setConnectionTimeout = function() {
        var t = this;
        this._connectionTimeoutID = setTimeout(function() {
            return ot(t, void 0, void 0, function() {
                return ct(this, function(n) {
                    switch (n.label) {
                    case 0:
                        return this.log("Connection reconnect attempt timed out."),
                        this.emit("connection-timeout"),
                        this.clearConnectionTimeout(),
                        [4, this._closeSocket()];
                    case 1:
                        return n.sent(),
                        [2]
                    }
                })
            })
        }, this._connectionTimeout)
    }
    ,
    e.prototype.clearConnectionTimeout = function() {
        clearTimeout(this._connectionTimeoutID),
        this._connectionTimeoutID = void 0
    }
    ,
    e.prototype.clearReconnectTimeout = function() {
        clearTimeout(this._reconnectTimeoutID),
        this._reconnectTimeoutID = void 0
    }
    ,
    e.prototype.clearKeepAliveInterval = function() {
        this._keepIntervalID && (clearInterval(this._keepIntervalID),
        this._keepIntervalID = null)
    }
    ,
    e.prototype.checkSocketHealthAndSendKeepAlive = function() {
        return ot(this, void 0, void 0, function() {
            return ct(this, function(t) {
                switch (t.label) {
                case 0:
                    return this._ws && this._ws.readyState === WebSocket.OPEN ? !this._keepAliveTimeout || !this._keepAliveInterval ? [2] : Date.now() - this._lastMsgRecvTime > this._keepAliveTimeout ? (this.log("Connection is stale, need to reconnect", be.WARN),
                    [4, this._closeSocket()]) : [3, 2] : [2];
                case 1:
                    return t.sent(),
                    [2];
                case 2:
                    return Date.now() - this._lastMsgSendTime < this._keepAliveInterval ? [2] : (this.log("Emitting keep-alive", be.DEBUG),
                    this.emit("keep-alive"),
                    [2])
                }
            })
        })
    }
    ,
    e.prototype._closeSocket = function() {
        return ot(this, void 0, void 0, function() {
            var t, n, i;
            return ct(this, function(s) {
                switch (s.label) {
                case 0:
                    this.log("Closing"),
                    s.label = 1;
                case 1:
                    return s.trys.push([1, 4, , 5]),
                    this.clearKeepAliveInterval(),
                    this._lastMsgRecvTime = 0,
                    this._ws && (this._ws._closedManually = !0,
                    this._ws.close()),
                    t = ((i = this._ws) === null || i === void 0 ? void 0 : i._initialConnectionOk) && this._shouldRetryFn && this._shouldRetryFn(),
                    this._ws = null,
                    t ? (this.log("Emitting reconnect", be.DEBUG),
                    this.emit("reconnecting"),
                    [4, this.retryFailedConnection()]) : [3, 3];
                case 2:
                    s.sent(),
                    s.label = 3;
                case 3:
                    return [3, 5];
                case 4:
                    return n = s.sent(),
                    this.log("Error while closing and retrying: ".concat(n), be.ERROR),
                    [3, 5];
                case 5:
                    return [2]
                }
            })
        })
    }
    ,
    e.prototype.retryFailedConnection = function() {
        return ot(this, void 0, void 0, function() {
            var t, n = this;
            return ct(this, function(i) {
                if (this._reconnectAttempts < this._allowedReconnectAttempts) {
                    if (this._reconnectTimeoutID)
                        return this.log("Retry already scheduled"),
                        [2];
                    this.log("Retrying failed connection"),
                    t = this._reconnectInterval * Math.pow(this._reconnectDecay, this._reconnectAttempts),
                    t = t > this._maxReconnectInterval ? this._maxReconnectInterval : t,
                    this.log("Reconnecting in ".concat(t / 1e3, " seconds")),
                    this._reconnectAttempts += 1,
                    this._reconnectTimeoutID = setTimeout(function() {
                        return n.connect()
                    }, t)
                } else
                    this.log("Maximum connection retry attempts exceeded", be.ERROR),
                    this.emit("reconnect-failed");
                return [2]
            })
        })
    }
    ,
    e.prototype.log = function(t, n) {
        n === void 0 && (n = be.DEBUG);
        for (var i = [], s = 2; s < arguments.length; s++)
            i[s - 2] = arguments[s];
        switch (n) {
        case be.DEBUG:
            console.debug.apply(console, Hr(["websocket: ".concat(t)], i, !1));
            break;
        case be.ERROR:
            console.error.apply(console, Hr(["websocket: ".concat(t)], i, !1));
            break;
        case be.WARN:
            console.warn.apply(console, Hr(["websocket: ".concat(t)], i, !1));
            break;
        case be.INFO:
        default:
            console.log.apply(console, Hr(["websocket: ".concat(t)], i, !1));
            break
        }
    }
    ,
    e.prototype.send = function(t) {
        return ot(this, void 0, void 0, function() {
            return ct(this, function(n) {
                try {
                    this._ws && this._ws.readyState === WebSocket.OPEN ? (this._lastMsgSendTime = Date.now(),
                    this._ws.send(t)) : this.log("Failed to send data, web socket not open.", be.ERROR)
                } catch (i) {
                    this.log("Failed to send data. ".concat(i), be.ERROR)
                }
                return [2]
            })
        })
    }
    ,
    e.prototype.close = function() {
        return ot(this, void 0, void 0, function() {
            return ct(this, function(t) {
                try {
                    this.log("Closing websocket"),
                    this._disconnected = !0,
                    this.clearReconnectTimeout(),
                    this._closeSocket()
                } catch (n) {
                    this.log("Failed to close websocket. ".concat(n))
                }
                return [2]
            })
        })
    }
    ,
    Object.defineProperty(e.prototype, "readyState", {
        get: function() {
            var t, n;
            return (n = (t = this._ws) === null || t === void 0 ? void 0 : t.readyState) !== null && n !== void 0 ? n : WebSocket.CLOSED
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "url", {
        get: function() {
            return this._url
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "keepAliveTimeout", {
        get: function() {
            return this._keepAliveTimeout
        },
        set: function(t) {
            typeof t == "number" && (this.log("Setting ACK freshness timeout to ".concat(t)),
            this._keepAliveTimeout = t)
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "keepAliveInterval", {
        get: function() {
            return this._keepAliveInterval
        },
        set: function(t) {
            typeof t == "number" && (this.log("Setting keep-alive interval to ".concat(t)),
            this._keepAliveInterval = t)
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "shouldRetryFn", {
        set: function(t) {
            typeof t == "function" && (this._shouldRetryFn = t)
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "connectionTimeout", {
        get: function() {
            return this._connectionTimeout
        },
        set: function(t) {
            typeof t == "number" && (this._connectionTimeout = t)
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "maxReconnectAttempts", {
        get: function() {
            return this._allowedReconnectAttempts
        },
        set: function(t) {
            t > 0 && t < uh ? (this.log("Setting maximum connection retry attempts to ".concat(t)),
            this._allowedReconnectAttempts = t) : this._allowedReconnectAttempts = go
        },
        enumerable: !1,
        configurable: !0
    }),
    Object.defineProperty(e.prototype, "reconnectInterval", {
        get: function() {
            return this._reconnectInterval
        },
        set: function(t) {
            typeof t == "number" && (this._reconnectInterval = t < this._maxReconnectInterval ? t : this._maxReconnectInterval)
        },
        enumerable: !1,
        configurable: !0
    }),
    e.prototype._handleMessage = function(t) {
        return ot(this, void 0, void 0, function() {
            var n, i, s, a = this;
            return ct(this, function(c) {
                switch (c.label) {
                case 0:
                    return this._lastMsgRecvTime = Date.now(),
                    n = t.data,
                    i = new Promise(function(l, u) {
                        if (typeof n == "string")
                            l(n);
                        else if (n instanceof ArrayBuffer) {
                            var h = n;
                            l(new Uint8Array(h))
                        } else if (n instanceof Blob) {
                            if (!a._parseBlobToJson) {
                                l(n);
                                return
                            }
                            var m = n
                              , _ = new FileReader;
                            _.onload = function() {
                                var M = _.result;
                                try {
                                    var b = JSON.parse(M);
                                    l(b)
                                } catch (v) {
                                    console.error("Failed to parse JSON from Blob:", v)
                                }
                            }
                            ,
                            _.readAsText(m)
                        }
                    }
                    ),
                    [4, i];
                case 1:
                    return s = c.sent(),
                    this.emit("message", s),
                    [2]
                }
            })
        })
    }
    ,
    e
}
)(bo.EventEmitter);
["binaryType", "bufferedAmount", "extensions", "protocol", "readyState", "url", "keepAliveTimeout", "keepAliveInterval", "shouldRetryFn", "connectionTimeout", "maxReconnectAttempts", "reconnectInterval"].forEach(function(r) {
    Object.defineProperty(Cn.prototype, r, {
        enumerable: !0
    })
});
["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function(r) {
    Object.defineProperty(Cn.prototype, r, {
        enumerable: !0,
        value: qc.indexOf(r)
    })
});
["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function(r) {
    Object.defineProperty(Cn, r, {
        enumerable: !0,
        value: qc.indexOf(r)
    })
});
class bh extends Or {
    constructor() {
        super("pipecat.TextFrame", [{
            no: 1,
            name: "id",
            kind: "scalar",
            T: 4,
            L: 0
        }, {
            no: 2,
            name: "name",
            kind: "scalar",
            T: 9
        }, {
            no: 3,
            name: "text",
            kind: "scalar",
            T: 9
        }])
    }
    create(e) {
        const t = globalThis.Object.create(this.messagePrototype);
        return t.id = 0n,
        t.name = "",
        t.text = "",
        e !== void 0 && ht(this, t, e),
        t
    }
    internalBinaryRead(e, t, n, i) {
        let s = i ?? this.create()
          , a = e.pos + t;
        for (; e.pos < a; ) {
            let[c,l] = e.tag();
            switch (c) {
            case 1:
                s.id = e.uint64().toBigInt();
                break;
            case 2:
                s.name = e.string();
                break;
            case 3:
                s.text = e.string();
                break;
            default:
                let u = n.readUnknownField;
                if (u === "throw")
                    throw new globalThis.Error(`Unknown field ${c} (wire type ${l}) for ${this.typeName}`);
                let h = e.skip(l);
                u !== !1 && (u === !0 ? Se.onRead : u)(this.typeName, s, c, l, h)
            }
        }
        return s
    }
    internalBinaryWrite(e, t, n) {
        e.id !== 0n && t.tag(1, z.Varint).uint64(e.id),
        e.name !== "" && t.tag(2, z.LengthDelimited).string(e.name),
        e.text !== "" && t.tag(3, z.LengthDelimited).string(e.text);
        let i = n.writeUnknownFields;
        return i !== !1 && (i == !0 ? Se.onWrite : i)(this.typeName, e, t),
        t
    }
}
const Kn = new bh;
class yh extends Or {
    constructor() {
        super("pipecat.AudioRawFrame", [{
            no: 1,
            name: "id",
            kind: "scalar",
            T: 4,
            L: 0
        }, {
            no: 2,
            name: "name",
            kind: "scalar",
            T: 9
        }, {
            no: 3,
            name: "audio",
            kind: "scalar",
            T: 12
        }, {
            no: 4,
            name: "sample_rate",
            kind: "scalar",
            T: 13
        }, {
            no: 5,
            name: "num_channels",
            kind: "scalar",
            T: 13
        }, {
            no: 6,
            name: "pts",
            kind: "scalar",
            opt: !0,
            T: 4,
            L: 0
        }])
    }
    create(e) {
        const t = globalThis.Object.create(this.messagePrototype);
        return t.id = 0n,
        t.name = "",
        t.audio = new Uint8Array(0),
        t.sampleRate = 0,
        t.numChannels = 0,
        e !== void 0 && ht(this, t, e),
        t
    }
    internalBinaryRead(e, t, n, i) {
        let s = i ?? this.create()
          , a = e.pos + t;
        for (; e.pos < a; ) {
            let[c,l] = e.tag();
            switch (c) {
            case 1:
                s.id = e.uint64().toBigInt();
                break;
            case 2:
                s.name = e.string();
                break;
            case 3:
                s.audio = e.bytes();
                break;
            case 4:
                s.sampleRate = e.uint32();
                break;
            case 5:
                s.numChannels = e.uint32();
                break;
            case 6:
                s.pts = e.uint64().toBigInt();
                break;
            default:
                let u = n.readUnknownField;
                if (u === "throw")
                    throw new globalThis.Error(`Unknown field ${c} (wire type ${l}) for ${this.typeName}`);
                let h = e.skip(l);
                u !== !1 && (u === !0 ? Se.onRead : u)(this.typeName, s, c, l, h)
            }
        }
        return s
    }
    internalBinaryWrite(e, t, n) {
        e.id !== 0n && t.tag(1, z.Varint).uint64(e.id),
        e.name !== "" && t.tag(2, z.LengthDelimited).string(e.name),
        e.audio.length && t.tag(3, z.LengthDelimited).bytes(e.audio),
        e.sampleRate !== 0 && t.tag(4, z.Varint).uint32(e.sampleRate),
        e.numChannels !== 0 && t.tag(5, z.Varint).uint32(e.numChannels),
        e.pts !== void 0 && t.tag(6, z.Varint).uint64(e.pts);
        let i = n.writeUnknownFields;
        return i !== !1 && (i == !0 ? Se.onWrite : i)(this.typeName, e, t),
        t
    }
}
const Hn = new yh;
class _h extends Or {
    constructor() {
        super("pipecat.TranscriptionFrame", [{
            no: 1,
            name: "id",
            kind: "scalar",
            T: 4,
            L: 0
        }, {
            no: 2,
            name: "name",
            kind: "scalar",
            T: 9
        }, {
            no: 3,
            name: "text",
            kind: "scalar",
            T: 9
        }, {
            no: 4,
            name: "user_id",
            kind: "scalar",
            T: 9
        }, {
            no: 5,
            name: "timestamp",
            kind: "scalar",
            T: 9
        }])
    }
    create(e) {
        const t = globalThis.Object.create(this.messagePrototype);
        return t.id = 0n,
        t.name = "",
        t.text = "",
        t.userId = "",
        t.timestamp = "",
        e !== void 0 && ht(this, t, e),
        t
    }
    internalBinaryRead(e, t, n, i) {
        let s = i ?? this.create()
          , a = e.pos + t;
        for (; e.pos < a; ) {
            let[c,l] = e.tag();
            switch (c) {
            case 1:
                s.id = e.uint64().toBigInt();
                break;
            case 2:
                s.name = e.string();
                break;
            case 3:
                s.text = e.string();
                break;
            case 4:
                s.userId = e.string();
                break;
            case 5:
                s.timestamp = e.string();
                break;
            default:
                let u = n.readUnknownField;
                if (u === "throw")
                    throw new globalThis.Error(`Unknown field ${c} (wire type ${l}) for ${this.typeName}`);
                let h = e.skip(l);
                u !== !1 && (u === !0 ? Se.onRead : u)(this.typeName, s, c, l, h)
            }
        }
        return s
    }
    internalBinaryWrite(e, t, n) {
        e.id !== 0n && t.tag(1, z.Varint).uint64(e.id),
        e.name !== "" && t.tag(2, z.LengthDelimited).string(e.name),
        e.text !== "" && t.tag(3, z.LengthDelimited).string(e.text),
        e.userId !== "" && t.tag(4, z.LengthDelimited).string(e.userId),
        e.timestamp !== "" && t.tag(5, z.LengthDelimited).string(e.timestamp);
        let i = n.writeUnknownFields;
        return i !== !1 && (i == !0 ? Se.onWrite : i)(this.typeName, e, t),
        t
    }
}
const Qn = new _h;
class wh extends Or {
    constructor() {
        super("pipecat.MessageFrame", [{
            no: 1,
            name: "data",
            kind: "scalar",
            T: 9
        }])
    }
    create(e) {
        const t = globalThis.Object.create(this.messagePrototype);
        return t.data = "",
        e !== void 0 && ht(this, t, e),
        t
    }
    internalBinaryRead(e, t, n, i) {
        let s = i ?? this.create()
          , a = e.pos + t;
        for (; e.pos < a; ) {
            let[c,l] = e.tag();
            switch (c) {
            case 1:
                s.data = e.string();
                break;
            default:
                let u = n.readUnknownField;
                if (u === "throw")
                    throw new globalThis.Error(`Unknown field ${c} (wire type ${l}) for ${this.typeName}`);
                let h = e.skip(l);
                u !== !1 && (u === !0 ? Se.onRead : u)(this.typeName, s, c, l, h)
            }
        }
        return s
    }
    internalBinaryWrite(e, t, n) {
        e.data !== "" && t.tag(1, z.LengthDelimited).string(e.data);
        let i = n.writeUnknownFields;
        return i !== !1 && (i == !0 ? Se.onWrite : i)(this.typeName, e, t),
        t
    }
}
const Yn = new wh;
class kh extends Or {
    constructor() {
        super("pipecat.Frame", [{
            no: 1,
            name: "text",
            kind: "message",
            oneof: "frame",
            T: () => Kn
        }, {
            no: 2,
            name: "audio",
            kind: "message",
            oneof: "frame",
            T: () => Hn
        }, {
            no: 3,
            name: "transcription",
            kind: "message",
            oneof: "frame",
            T: () => Qn
        }, {
            no: 4,
            name: "message",
            kind: "message",
            oneof: "frame",
            T: () => Yn
        }])
    }
    create(e) {
        const t = globalThis.Object.create(this.messagePrototype);
        return t.frame = {
            oneofKind: void 0
        },
        e !== void 0 && ht(this, t, e),
        t
    }
    internalBinaryRead(e, t, n, i) {
        let s = i ?? this.create()
          , a = e.pos + t;
        for (; e.pos < a; ) {
            let[c,l] = e.tag();
            switch (c) {
            case 1:
                s.frame = {
                    oneofKind: "text",
                    text: Kn.internalBinaryRead(e, e.uint32(), n, s.frame.text)
                };
                break;
            case 2:
                s.frame = {
                    oneofKind: "audio",
                    audio: Hn.internalBinaryRead(e, e.uint32(), n, s.frame.audio)
                };
                break;
            case 3:
                s.frame = {
                    oneofKind: "transcription",
                    transcription: Qn.internalBinaryRead(e, e.uint32(), n, s.frame.transcription)
                };
                break;
            case 4:
                s.frame = {
                    oneofKind: "message",
                    message: Yn.internalBinaryRead(e, e.uint32(), n, s.frame.message)
                };
                break;
            default:
                let u = n.readUnknownField;
                if (u === "throw")
                    throw new globalThis.Error(`Unknown field ${c} (wire type ${l}) for ${this.typeName}`);
                let h = e.skip(l);
                u !== !1 && (u === !0 ? Se.onRead : u)(this.typeName, s, c, l, h)
            }
        }
        return s
    }
    internalBinaryWrite(e, t, n) {
        e.frame.oneofKind === "text" && Kn.internalBinaryWrite(e.frame.text, t.tag(1, z.LengthDelimited).fork(), n).join(),
        e.frame.oneofKind === "audio" && Hn.internalBinaryWrite(e.frame.audio, t.tag(2, z.LengthDelimited).fork(), n).join(),
        e.frame.oneofKind === "transcription" && Qn.internalBinaryWrite(e.frame.transcription, t.tag(3, z.LengthDelimited).fork(), n).join(),
        e.frame.oneofKind === "message" && Yn.internalBinaryWrite(e.frame.message, t.tag(4, z.LengthDelimited).fork(), n).join();
        let i = n.writeUnknownFields;
        return i !== !1 && (i == !0 ? Se.onWrite : i)(this.typeName, e, t),
        t
    }
}
const mr = new kh;
class Sh {
    serialize(e) {}
    serializeAudio(e, t, n) {
        // Fix: dùng e.buffer thay vì e để giữ nguyên dữ liệu (tránh truncate Int16→Uint8)
        const src = e.buffer || e;
        const i = new Uint8Array(src)
          , s = mr.create({
            frame: {
                oneofKind: "audio",
                audio: {
                    id: 0n,
                    name: "audio",
                    audio: i,
                    sampleRate: t,
                    numChannels: n
                }
            }
        });
        return new Uint8Array(mr.toBinary(s))
    }
    serializeMessage(e) {
        const t = mr.create({
            frame: {
                oneofKind: "message",
                message: {
                    data: JSON.stringify(e)
                }
            }
        });
        return new Uint8Array(mr.toBinary(t))
    }
    async deserialize(e) {
        if (!(e instanceof Blob))
            throw new Error("Unknown data type");
        const t = await e.arrayBuffer()
          , n = mr.fromBinary(new Uint8Array(t)).frame;
        if (n.oneofKind === "audio") {
            const i = Array.from(n.audio.audio)
              , s = new Uint8Array(i);
            return {
                type: "audio",
                audio: new Int16Array(s.buffer)
            }
        } else {
            if (n.oneofKind === "message")
                return {
                    type: "message",
                    message: JSON.parse(n.message.data)
                };
            throw new Error("Unknown frame kind")
        }
    }
}
class er extends No {
    constructor(e={}) {
        super(),
        this._wsUrl = null,
        this.audioQueue = [],
        this._wsUrl = e.wsUrl ?? e.ws_url ?? null,
        this._recorderSampleRate = e.recorderSampleRate ?? er.RECORDER_SAMPLE_RATE,
        this._mediaManager = e.mediaManager || new ih(!0,!0,void 0,void 0,512,this._recorderSampleRate,e.playerSampleRate ?? er.PLAYER_SAMPLE_RATE),
        this._mediaManager.setUserAudioCallback(this.handleUserAudioStream.bind(this)),
        this._ws = null,
        this._serializer = e.serializer || new Sh
    }
    initialize(e, t) {
        this._options = e,
        this._callbacks = e.callbacks ?? {},
        this._onMessage = t,
        this._mediaManager.setClientOptions(e),
        this.state = "disconnected"
    }
    async initDevices() {
        this.state = "initializing",
        await this._mediaManager.initialize(),
        this.state = "initialized"
    }
    _validateConnectionParams(e) {
        if (e == null)
            return;
        if (typeof e != "object")
            throw new Ce("Invalid connection parameters");
        const t = i => i.replace(/_([a-z,A-Z])/g, (s, a) => a.toUpperCase())
          , n = {};
        for (const [i,s] of Object.entries(e)) {
            const a = t(i);
            if (a === "wsUrl") {
                if (typeof s != "string")
                    throw new Ce(`Invalid type for wsUrl: expected string, got ${typeof s}`)
            } else
                throw new Ce(`Unrecognized connection parameter: ${i}.`);
            n[a] = s
        }
        return n
    }
    async _connect(e) {
        var t, n, i, s;
        if (!((t = this._abortController) != null && t.signal.aborted)) {
            if (this.state = "connecting",
            this._wsUrl = (e == null ? void 0 : e.wsUrl) ?? (e == null ? void 0 : e.ws_url) ?? this._wsUrl,
            !this._wsUrl)
                throw K.error("No url provided for connection"),
                this.state = "error",
                new Zn;
            try {
                if (this._ws = this.initializeWebsocket(),
                await this._ws.connect(),
                await this._mediaManager.connect(),
                (n = this._abortController) != null && n.signal.aborted)
                    return;
                this.state = "connected",
                (s = (i = this._callbacks).onConnected) == null || s.call(i)
            } catch (a) {
                const c = `Failed to connect to websocket: ${a}`;
                throw K.error(c),
                this.state = "error",
                new Zn(c)
            }
        }
    }
    async _disconnect() {
        var e, t, n;
        this.state = "disconnecting",
        await this._mediaManager.disconnect(),
        await ((e = this._ws) == null ? void 0 : e.close()),
        this.state = "disconnected",
        (n = (t = this._callbacks).onDisconnected) == null || n.call(t)
    }
    getAllMics() {
        return this._mediaManager.getAllMics()
    }
    getAllCams() {
        return this._mediaManager.getAllCams()
    }
    getAllSpeakers() {
        return this._mediaManager.getAllSpeakers()
    }
    async updateMic(e) {
        return this._mediaManager.updateMic(e)
    }
    updateCam(e) {
        return this._mediaManager.updateCam(e)
    }
    updateSpeaker(e) {
        return this._mediaManager.updateSpeaker(e)
    }
    get selectedMic() {
        return this._mediaManager.selectedMic
    }
    get selectedSpeaker() {
        return this._mediaManager.selectedSpeaker
    }
    enableMic(e) {
        this._mediaManager.enableMic(e)
    }
    get isMicEnabled() {
        return this._mediaManager.isMicEnabled
    }
    get state() {
        return this._state
    }
    set state(e) {
        var t, n;
        this._state !== e && (this._state = e,
        (n = (t = this._callbacks).onTransportStateChanged) == null || n.call(t, e))
    }
    tracks() {
        return this._mediaManager.tracks()
    }
    initializeWebsocket() {
        const e = new Cn(this._wsUrl,void 0,{
            parseBlobToJson: !1
        });
        return e.keepAliveInterval = 0,
        e.on("open", () => {
            K.debug("Websocket connection opened")
        }
        ),
        e.on("message", async t => {
            try {
                const n = await this._serializer.deserialize(t);
                n.type === "audio" ? this._mediaManager.bufferBotAudio(n.audio) : n.type === "message" && n.message.label === "rtvi-ai" && this._onMessage(n.message)
            } catch (n) {
                K.error("Failed to deserialize incoming message", n)
            }
        }
        ),
        e.on("error", t => {
            this.connectionError(`websocket error: ${t}`)
        }
        ),
        e.on("connection-timeout", () => {
            this.connectionError("websocket connection timed out")
        }
        ),
        e.on("close", t => {
            this.connectionError(`websocket connection closed. Code: ${t}`)
        }
        ),
        e.on("reconnect-failed", () => {
            this.connectionError("websocket reconnect failed")
        }
        ),
        e
    }
    sendReadyMessage() {
        this.state = "ready",
        this.sendMessage(ke.clientReady())
    }
    handleUserAudioStream(e) {
        if (this.state === "ready")
            try {
                this.flushAudioQueue(),
                this._sendAudioInput(e)
            } catch (t) {
                K.error("Error sending audio stream to websocket:", t),
                this.state = "error"
            }
        else
            this.audioQueue.push(e)
    }
    flushAudioQueue() {
        if (!(this.audioQueue.length <= 0))
            for (K.info("Will flush audio queue", this.audioQueue.length); this.audioQueue.length > 0; ) {
                const e = this.audioQueue.shift();
                e && this._sendAudioInput(e)
            }
    }
    sendRawMessage(e) {
        const t = this._serializer.serialize(e);
        this._sendMsg(t)
    }
    sendMessage(e) {
        const t = this._serializer.serializeMessage(e);
        this._sendMsg(t)
    }
    async _sendAudioInput(e) {
        try {
            const t = this._serializer.serializeAudio(e, this._recorderSampleRate, 1);
            await this._sendMsg(t)
        } catch (t) {
            K.error("Error sending audio frame", t)
        }
    }
    async _sendMsg(e) {
        if (!this._ws) {
            K.error("sendMsg called but WS is null");
            return
        }
        if (this._ws.readyState !== WebSocket.OPEN) {
            K.error("attempt to send to closed socket");
            return
        }
        if (e)
            try {
                await this._ws.send(e)
            } catch (t) {
                K.error("sendMsg error", t)
            }
    }
    connectionError(e) {
        console.error(e),
        this.state = "error",
        this.disconnect()
    }
    enableScreenShare(e) {
        throw K.error("enableScreenShare not implemented for WebSocketTransport"),
        new Qr("enableScreenShare","webSocketTransport","This feature has not been implemented")
    }
    get isSharingScreen() {
        return K.error("isSharingScreen not implemented for WebSocketTransport"),
        !1
    }
    enableCam(e) {
        throw K.error("enableCam not implemented for WebSocketTransport"),
        new Qr("enableCam","webSocketTransport","This feature has not been implemented")
    }
    get isCamEnabled() {
        return K.error("isCamEnabled not implemented for WebSocketTransport"),
        !1
    }
    get selectedCam() {
        throw K.error("selectedCam not implemented for WebSocketTransport"),
        new Qr("selectedCam","webSocketTransport","This feature has not been implemented")
    }
}
er.RECORDER_SAMPLE_RATE = 8e3;
er.PLAYER_SAMPLE_RATE = 24e3;
window.BotClient = Ye;
window.WebSocketTransport = er;
window.RTVIEvent = $;
