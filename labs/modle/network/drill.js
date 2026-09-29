const scene = document.getElementById("scene");
const uplink = { id: "uplink", x: 60, y: 65 };
const switchPorts = [];
for (let i = 0; i < 8; i++) {
  switchPorts.push({ id: "sw" + i, x: 400 + i * 24, y: 65 });
}

let pending = null;
let connected = null;

function tag(x, y, w, lines) {
  const h = 14 + lines.length * 13;
  let html = '<rect class="tagbox" x="' + (x - w / 2) + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4"></rect>';
  lines.forEach(function (l, i) {
    html += '<text x="' + x + '" y="' + (y + 15 + i * 13) + '" text-anchor="middle" class="tagtext" style="fill:' + l.color + '">' + l.text + '</text>';
  });
  return html;
}

function switchDevice() {
  return '<g>' +
    '<rect x="380" y="20" width="220" height="34" rx="8" fill="var(--body2)" stroke="var(--line)"></rect>' +
    '<circle class="eye" cx="398" cy="37" r="4" fill="var(--amber)"></circle>' +
    '<circle class="eye b" cx="412" cy="37" r="4" fill="var(--amber)"></circle>' +
    '<text x="500" y="42" text-anchor="middle" style="font-size:10px;fill:var(--text)">SW-1 &#183; 8-port access switch</text>' +
    '</g>';
}

function portEl(p) {
  return '<g class="port" id="' + p.id + '" data-id="' + p.id + '">' +
    '<rect class="slot" x="' + (p.x - 7) + '" y="' + (p.y - 7) + '" width="14" height="14" rx="2"></rect>' +
    '</g>';
}

function cablePath(a, b, live) {
  const midY = 100;
  return '<path class="cable-line' + (live ? " live" : "") + '" d="M' + a.x + ' ' + a.y +
    ' C ' + a.x + ' ' + midY + ', ' + b.x + ' ' + midY + ', ' + b.x + ' ' + b.y + '"></path>';
}

function render() {
  let html = switchDevice();

  if (connected) {
    const swP = switchPorts.find(function (p) { return p.id === connected.swPort; });
    html += cablePath(uplink, swP, true);
  }

  html += tag(uplink.x, 82, 118, [
    { text: "your uplink", color: "var(--amber2)" },
    { text: "tablet 10.0.0.1", color: "var(--muted)" }
  ]);
  html += tag(500, 82, 150, [
    { text: "ping target", color: "var(--amber2)" },
    { text: "10.0.0.2", color: "var(--muted)" }
  ]);

  html += portEl(uplink);
  switchPorts.forEach(function (p) { html += portEl(p); });

  scene.innerHTML = html;

  const upEl = document.getElementById(uplink.id);
  upEl.classList.toggle("active", !!connected);
  upEl.classList.toggle("pending", pending === uplink.id);

  switchPorts.forEach(function (p) {
    const el = document.getElementById(p.id);
    el.classList.toggle("active", !!connected && connected.swPort === p.id);
    el.classList.toggle("pending", pending === p.id);
  });

  scene.querySelectorAll(".port").forEach(function (el) {
    el.addEventListener("click", function () { handlePortClick(el.dataset.id); });
  });

  document.getElementById("hint").textContent = connected
    ? "link up \u2014 click either lit port to unplug"
    : (pending ? "now click a port on the switch" : "click the uplink port to start a cable");
}

function handlePortClick(id) {
  if (connected && (id === connected.pcPort || id === connected.swPort)) {
    connected = null;
    pending = null;
    render();
    return;
  }
  if (!pending) {
    pending = id;
    render();
    return;
  }
  const isUplinkPending = pending === uplink.id;
  const isSwClick = switchPorts.some(function (p) { return p.id === id; });
  const isUplinkClick = id === uplink.id;

  if (isUplinkPending && isSwClick) {
    connected = { pcPort: uplink.id, swPort: id };
    pending = null;
  } else if (!isUplinkPending && isUplinkClick) {
    connected = { pcPort: uplink.id, swPort: pending };
    pending = null;
  } else {
    pending = id;
  }
  render();
}

render();

const output = document.getElementById("output");
const explain = document.getElementById("explain");
const input = document.getElementById("cmd");

function runCommand() {
  const cmd = input.value.trim();
  explain.classList.remove("show");

  if (!cmd) {
    output.innerHTML = '<span class="fail">Type a command first.</span>';
    return;
  }

  const m = cmd.match(/^ping\s+([\d.]+)/i);
  if (!m) {
    output.innerHTML = '<span class="fail">Unknown command: ' + cmd + '</span>';
    return;
  }

  if (m[1] !== "10.0.0.2") {
    output.innerHTML = '<span class="fail">Destination host unreachable.</span>';
    return;
  }

  if (connected) {
    output.innerHTML = '<span class="ok">PING 10.0.0.2: 56 data bytes\n' +
      '64 bytes from 10.0.0.2: icmp_seq=0 time=0.4ms\n' +
      '64 bytes from 10.0.0.2: icmp_seq=1 time=0.3ms\n' +
      '64 bytes from 10.0.0.2: icmp_seq=2 time=0.4ms\n' +
      '4 packets transmitted, 4 received, 0% packet loss</span>';
  } else {
    output.innerHTML = '<span class="fail">PING 10.0.0.2: 56 data bytes\n' +
      'Request timeout for icmp_seq 0\n' +
      'Request timeout for icmp_seq 1\n' +
      'Request timeout for icmp_seq 2\n' +
      '4 packets transmitted, 0 received, 100% packet loss</span>';
    explain.classList.add("show");
    explain.innerHTML = '<b>Why:</b> ping is Layer 3, but it still needs a working Layer 1 link underneath it. ' +
      'No cable plugged into the uplink, no signal, no frames, no packets \u2014 the request never leaves your tablet.';
  }
}

document.getElementById("run").addEventListener("click", runCommand);
input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") runCommand();
});
