(() => {
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if (!revealItems.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  revealItems.forEach((el) => observer.observe(el));
})();

/* Hero visual: animated data links from edge nodes to the AgentBox core */
(() => {
  const visual = document.querySelector(".agent-visual");
  const svg = visual && visual.querySelector(".hero-links");
  const core = visual && visual.querySelector(".system-core");
  if (!visual || !svg || !core) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";
  const nodeSelectors = [".node-hardware", ".node-cloud", ".node-model", ".node-workflow"];

  const edgeOffset = (rect, ux, uy, pad) => {
    // distance from rect center to its border along direction (ux, uy)
    const tx = ux === 0 ? Infinity : Math.abs(rect.width / 2 / ux);
    const ty = uy === 0 ? Infinity : Math.abs(rect.height / 2 / uy);
    return Math.min(tx, ty) + pad;
  };

  const draw = () => {
    svg.replaceChildren();
    if (window.innerWidth <= 760) return;

    const box = visual.getBoundingClientRect();
    const c = core.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const cx = c.left - box.left + c.width / 2;
    const cy = c.top - box.top + c.height / 2;

    nodeSelectors.forEach((sel, i) => {
      const node = visual.querySelector(sel);
      if (!node) return;
      const r = node.getBoundingClientRect();
      const nx = r.left - box.left + r.width / 2;
      const ny = r.top - box.top + r.height / 2;
      const dx = cx - nx;
      const dy = cy - ny;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      const x1 = nx + ux * edgeOffset(r, ux, uy, 7);
      const y1 = ny + uy * edgeOffset(r, ux, uy, 7);
      const x2 = cx - ux * edgeOffset(c, ux, uy, 9);
      const y2 = cy - uy * edgeOffset(c, ux, uy, 9);

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const bend = Math.min(34, dist * 0.32);
      // bow the arc away from the container centre so it travels through open space
      const ccx = box.width / 2;
      const ccy = box.height / 2;
      const ax = mx - uy * bend;
      const ay = my + ux * bend;
      const bx = mx + uy * bend;
      const by = my - ux * bend;
      const useA = (ax - ccx) ** 2 + (ay - ccy) ** 2 >= (bx - ccx) ** 2 + (by - ccy) ** 2;
      const qx = useA ? ax : bx;
      const qy = useA ? ay : by;

      const d = `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;
      const base = document.createElementNS(NS, "path");
      base.setAttribute("d", d);
      base.setAttribute("class", "hero-link-base");
      svg.appendChild(base);
      const line = document.createElementNS(NS, "path");
      line.setAttribute("d", d);
      line.setAttribute("class", "hero-link-line");
      svg.appendChild(line);

      if (reduced.matches) return;

      // inbound packet (node -> core, blue) and outbound packet (core -> node, green)
      [
        { cls: "hero-link-dot", d: d, begin: i * 0.65 },
        { cls: "hero-link-dot alt", d: `M ${x2} ${y2} Q ${qx} ${qy} ${x1} ${y1}`, begin: i * 0.65 + 1.3 },
      ].forEach((spec) => {
        const dot = document.createElementNS(NS, "circle");
        dot.setAttribute("r", "3.5");
        dot.setAttribute("class", spec.cls);
        const motion = document.createElementNS(NS, "animateMotion");
        motion.setAttribute("dur", "2.6s");
        motion.setAttribute("begin", `${spec.begin}s`);
        motion.setAttribute("repeatCount", "indefinite");
        motion.setAttribute("path", spec.d);
        motion.setAttribute("calcMode", "spline");
        motion.setAttribute("keyPoints", "0;1");
        motion.setAttribute("keyTimes", "0;1");
        motion.setAttribute("keySplines", "0.42 0 0.58 1");
        dot.appendChild(motion);
        svg.appendChild(dot);
      });
    });
  };

  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  // wait for fonts/layout to settle so card sizes are final
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  schedule();
  window.addEventListener("resize", schedule, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(visual);
})();
