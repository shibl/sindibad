// Sends the game's events to the page that hosts it.
mergeInto(LibraryManager.library, {
  SailSend: function (name, value) {
    var n = UTF8ToString(name), v = UTF8ToString(value);
    if (window.__sailSend) window.__sailSend(n, v);
  },
});
