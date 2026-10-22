/* Interações da homepage: leves, progressivas e compatíveis com movimento reduzido. */
(() => {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const visual = document.querySelector('.home-visual');
  const bear = document.querySelector('.home-bear');
  const fragments = [...document.querySelectorAll('.bear-fragments span')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const setHeaderState = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 18);
  };

  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  if (!visual || !bear || reduced.matches) return;

  let frame = 0;
  let pointer = { x: 0, y: 0 };
  let bounds = null;

  const renderPointer = () => {
    frame = 0;
    if (!bounds) bounds = visual.getBoundingClientRect();
    const nx = pointer.x / bounds.width - 0.5;
    const ny = pointer.y / bounds.height - 0.5;
    const x = nx * 20;
    const y = ny * 14;
    bear.style.setProperty('--bear-pointer-x', `${x.toFixed(1)}px`);
    bear.style.setProperty('--bear-pointer-y', `${y.toFixed(1)}px`);
    bear.style.setProperty('--bear-tilt', `${(nx * 7).toFixed(2)}deg`);
    fragments.forEach((fragment, index) => {
      const depth = 0.3 + (index % 4) * 0.08;
      const driftX = Number(fragment.dataset.x || 0) * 0.035 * depth + nx * 16 * depth;
      const driftY = Number(fragment.dataset.y || 0) * 0.035 * depth + ny * 12 * depth;
      fragment.style.transform = `translate(calc(-50% + ${driftX.toFixed(1)}px), calc(-50% + ${driftY.toFixed(1)}px)) rotate(${fragment.dataset.r || 0}deg)`;
    });
  };

  visual.addEventListener('pointerenter', () => {
    bounds = visual.getBoundingClientRect();
  });
  visual.addEventListener('pointermove', (event) => {
    if (!bounds) bounds = visual.getBoundingClientRect();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    if (!frame) frame = requestAnimationFrame(renderPointer);
  });
  visual.addEventListener('pointerleave', () => {
    bounds = null;
    pointer = { x: visual.clientWidth / 2, y: visual.clientHeight / 2 };
    if (!frame) frame = requestAnimationFrame(renderPointer);
    bear.style.setProperty('--bear-pointer-x', '0px');
    bear.style.setProperty('--bear-pointer-y', '0px');
    bear.style.setProperty('--bear-tilt', '0deg');
  });

  window.addEventListener('resize', () => { bounds = null; }, { passive: true });
})();
