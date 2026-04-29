/* ============================================================
   AVATARS · Pokedex-style picker page
   ------------------------------------------------------------
   Click an unlocked card -> POST /api/avatars/select -> flip the
   ACTIVE badge + show a small toast confirming the swap. Locked
   cards are inert (silhouette + lock icon). The active selection
   is read on subsequent page loads so every page (home, lessons,
   quiz) shows the chosen mascot. Uses jQuery per course rules.
   ============================================================ */

(function ($) {
  'use strict';

  function showToast(text) {
    var toast = document.getElementById('avatarToast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    if (showToast._timer) clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2200);
  }

  function setActiveCard(grid, avatarId) {
    var cards = grid.querySelectorAll('.avatar-card');
    cards.forEach(function (card) {
      var match = card.getAttribute('data-avatar-id') === avatarId;
      card.setAttribute('data-active', match ? 'true' : 'false');
      var statusText = card.querySelector('.avatar-status-text');
      if (statusText) {
        var locked = card.getAttribute('data-locked') === 'true';
        if (locked) statusText.textContent = 'Locked';
        else if (match) statusText.textContent = 'Active';
        else statusText.textContent = 'Tap to equip';
      }
    });
  }

  function selectAvatar(avatarId) {
    return $.ajax({
      url: '/api/avatars/select',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ id: avatarId })
    });
  }

  $(function () {
    var grid = document.getElementById('avatarsGrid');
    if (!grid) return;

    grid.addEventListener('click', function (ev) {
      var card = ev.target.closest('.avatar-card');
      if (!card) return;
      if (card.getAttribute('data-locked') === 'true') {
        showToast('Locked. Defeat Cyber Inu in the Final Battle to unlock.');
        return;
      }
      var avatarId = card.getAttribute('data-avatar-id');
      if (!avatarId) return;
      if (card.getAttribute('data-active') === 'true') {
        showToast('Already active.');
        return;
      }

      // Optimistic UI flip — server confirms below
      setActiveCard(grid, avatarId);
      var name = (card.querySelector('.avatar-name') || {}).textContent || avatarId;

      selectAvatar(avatarId)
        .done(function (resp) {
          if (resp && resp.state && resp.state.active) {
            setActiveCard(grid, resp.state.active);
            showToast(name.trim() + ' is now your guide.');
          }
        })
        .fail(function () {
          showToast("Couldn't switch avatar. Try again.");
        });
    });
  });

})(window.jQuery);
