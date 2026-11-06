// Sends the game's events to the page that hosts it.
mergeInto(LibraryManager.library, {
  ClawSend: function (name, value) {
    var n = UTF8ToString(name), v = UTF8ToString(value);
    if (window.__clawSend) window.__clawSend(n, v);
  },
});
