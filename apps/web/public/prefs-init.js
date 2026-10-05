// No-FOUC user-preference init (theme + text size). Loaded as an async
// external script in the root <head>; React hoists it out of the component
// tree, and the small file can run before the app finishes hydrating.
;(function () {
  try {
    var t = localStorage.getItem("theme")
    // Dark is the product default on first visit. A saved user choice always
    // wins, so the header toggle remains sticky across tenants and sessions.
    var d = t ? t === "dark" : true
    document.documentElement.classList.toggle("dark", d)
    var s = localStorage.getItem("text-size")
    if (s === "large") document.documentElement.classList.add("text-scale-lg")
    else if (s === "xlarge")
      document.documentElement.classList.add("text-scale-xl")
  } catch {}
})()
