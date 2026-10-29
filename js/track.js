(function () {
  const code = (window.TRAFFIC && window.TRAFFIC.goatcounter || "").trim();
  const host = location.hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "" || host.endsWith(".local");
  let skip = false;
  try { skip = localStorage.getItem("workshop-traffic-ignore") === "1"; } catch (e) {}

  window.trackLab = function (lab) {
    if (!lab || !window.goatcounter || !window.goatcounter.count) return;
    try { window.goatcounter.count({ path: "lab/" + lab.id, title: lab.name, event: true }); } catch (e) {}
  };

  if (!code || local || skip) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = "https://" + code + ".goatcounter.com/count";
  document.head.appendChild(s);
})();
