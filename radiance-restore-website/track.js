/* Sends phone and text taps to Google Analytics as phone_tap and text_tap.
   GA itself is injected by Netlify snippet injection (G-2HJVV0L7F5), so this
   only fires if gtag is present. */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="sms:"]');
    if (!a || typeof window.gtag !== 'function') return;
    var isText = a.getAttribute('href').indexOf('sms:') === 0;
    window.gtag('event', isText ? 'text_tap' : 'phone_tap', {
      link_url: a.getAttribute('href'),
      link_text: (a.textContent || '').trim().slice(0, 60),
      page_path: location.pathname
    });
  }, true);
})();
