const HOST_OS = {
  linux: { label: "Linux PC", nic: "eth0", prompt: d => d.name + "$ " },
  windows: { label: "Windows PC", nic: "Ethernet", prompt: d => "C:\\Users\\" + d.name + "> " },
  macos: { label: "Mac", nic: "en0", prompt: d => d.name + " ~ % " },
};
function hostOs(dev){
  if(!dev || dev.type !== "host") return "linux";
  return HOST_OS[dev.cfg && dev.cfg.os] ? dev.cfg.os : "linux";
}
function hostOsLabel(dev){ return HOST_OS[hostOs(dev)].label; }
function hostNic(dev){ return HOST_OS[hostOs(dev)].nic; }
function setHostOs(devOrId, os){
  const d = typeof devOrId === "string" ? devices[devOrId] : devOrId;
  if(d && d.type === "host" && HOST_OS[os]) d.cfg.os = os;
  return d ? d.id : null;
}
function maskToBits(mask){
  if(!validIp(mask || "")) return null;
  const n = ipToInt(mask) >>> 0;
  let bits = 0, seenZero = false;
  for(let i = 31; i >= 0; i--){
    const b = (n >>> i) & 1;
    if(b){ if(seenZero) return null; bits++; } else seenZero = true;
  }
  return bits;
}
function bitsToMask(bits){
  const n = bits <= 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return [24, 16, 8, 0].map(s => (n >>> s) & 255).join(".");
}
function hostDhcpReason(out){
  const t = out.map(l => l.text).join("\n");
  const m = t.match(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/);
  return m ? m[1] : "no answer";
}
function hostClearAddr(dev){
  dev.cfg.ip = null; dev.cfg.bits = null; dev.cfg.gw = null; dev.cfg.viaDhcp = false;
}
function psArgs(parts){
  const a = {};
  for(let i = 1; i < parts.length; i++){
    if(parts[i][0] === "-" && parts[i + 1] !== undefined && parts[i + 1][0] !== "-"){
      a[parts[i].slice(1).toLowerCase()] = parts[i + 1].replace(/^["']|["']$/g, "");
      i++;
    }
  }
  return a;
}

const WIN_HELP =
  "ipconfig                             show this PC's address\n" +
  "ipconfig /all                        ...plus MAC, DHCP state and DNS\n" +
  "ipconfig /renew                      ask DHCP for an address\n" +
  "ipconfig /release                    give the address back\n" +
  "netsh interface ip set address \"Ethernet\" static <ip> <mask> <gateway>\n" +
  "netsh interface ip set address \"Ethernet\" dhcp\n" +
  "netsh interface ip set dns \"Ethernet\" static <dns-ip>\n" +
  "New-NetIPAddress -InterfaceAlias \"Ethernet\" -IPAddress <ip> -PrefixLength <bits> -DefaultGateway <gw>\n" +
  "route print / route add 0.0.0.0 mask 0.0.0.0 <gw>\n" +
  "ping <ip-or-name> / tracert <ip>     test reachability / show the path\n" +
  "arp -a                               show the ARP cache\n" +
  "nslookup <name> / curl <name>        resolve a name / fetch a web page\n" +
  "ssh [user@]<ip-or-name>              open a CLI session on a switch, router or server\n" +
  "netsh wlan show networks / netsh wlan connect name=<ssid> / netsh wlan disconnect\n" +
  "hostname / Rename-Computer -NewName <name>\n" +
  "cls                                  wipe this terminal screen";
const WIN_INSTEAD = {
  ip: "ipconfig, or netsh interface ip set address",
  dhclient: "ipconfig /renew",
  ifconfig: "ipconfig",
  traceroute: "tracert <ip>",
  nameserver: "netsh interface ip set dns \"Ethernet\" static <dns-ip>",
  clear: "cls",
  sudo: "an administrator prompt (no sudo on Windows)",
};
function winIpconfig(dev, all){
  const rows = ["Windows IP Configuration", ""];
  if(all) rows.push("   Host Name . . . . . . . . . . . . : " + dev.name, "");
  rows.push("Ethernet adapter Ethernet:", "");
  if(!isLinked(dev.id, "eth0")){
    rows.push("   Media State . . . . . . . . . . . : Media disconnected");
    if(all) rows.push("   Physical Address. . . . . . . . . : " + macOf(dev.id, "eth0"));
    return rows.join("\n");
  }
  if(all){
    rows.push("   Physical Address. . . . . . . . . : " + macOf(dev.id, "eth0"));
    rows.push("   DHCP Enabled. . . . . . . . . . . : " + (dev.cfg.viaDhcp ? "Yes" : "No"));
  }
  if(dev.cfg.ip){
    rows.push("   IPv4 Address. . . . . . . . . . . : " + dev.cfg.ip);
    rows.push("   Subnet Mask . . . . . . . . . . . : " + bitsToMask(dev.cfg.bits));
    rows.push("   Default Gateway . . . . . . . . . : " + (dev.cfg.gw || ""));
  } else {
    rows.push("   Autoconfiguration IPv4 Address. . : 169.254.12.7   (no address: APIPA means DHCP did not answer)");
    rows.push("   Subnet Mask . . . . . . . . . . . : 255.255.0.0");
    rows.push("   Default Gateway . . . . . . . . . :");
  }
  if(all) rows.push("   DNS Servers . . . . . . . . . . . : " + (dev.cfg.ns || ""));
  return rows.join("\n");
}
function winDhcp(dev){
  const out = runDhclient(dev);
  if(out.some(l => l.cls === "err"))
    return lines("err", "An error occurred while renewing interface Ethernet : unable to contact your DHCP server. Request has timed out.\n(" + hostDhcpReason(out) + ")");
  return lines("out", winIpconfig(dev, false));
}
function winExec(dev, cmd){
  const parts = cmd.split(/\s+/);
  const c = parts[0].toLowerCase();
  const low = cmd.toLowerCase();
  if(cmd === "?" || c === "help") return lines("out", WIN_HELP);
  if(c === "cls"){ dev.cli.log.length = 0; return []; }
  if(c === "ipconfig"){
    const a = (parts[1] || "").toLowerCase();
    if(a === "/renew") return winDhcp(dev);
    if(a === "/release"){ hostClearAddr(dev); return lines("out", winIpconfig(dev, false)); }
    if(a && a !== "/all") return lines("err", "Error: unrecognized or incomplete command line.\nUSAGE: ipconfig [/all | /renew | /release]");
    return lines("out", winIpconfig(dev, a === "/all"));
  }
  if(c === "netsh"){
    let m = low.match(/^netsh\s+interface\s+ip(?:v4)?\s+set\s+address\s+(?:name=)?"?ethernet"?\s+(?:source=)?(static|dhcp)\s*(.*)$/);
    if(m){
      if(m[1] === "dhcp") return winDhcp(dev);
      const a = m[2].split(/\s+/).filter(Boolean);
      const bits = maskToBits(a[1]);
      if(!validIp(a[0] || "") || bits === null || (a[2] && !validIp(a[2])))
        return lines("err", "Usage: netsh interface ip set address \"Ethernet\" static <ip> <mask> [<gateway>]\n(example: netsh interface ip set address \"Ethernet\" static 10.0.10.11 255.255.255.0 10.0.10.1)");
      dev.cfg.ip = a[0]; dev.cfg.bits = bits; dev.cfg.gw = a[2] || null; dev.cfg.viaDhcp = false;
      return lines("out", "Ok.");
    }
    m = low.match(/^netsh\s+interface\s+ip(?:v4)?\s+set\s+dns(?:servers)?\s+(?:name=)?"?ethernet"?\s+(?:source=)?static\s+(\S+)/);
    if(m){
      if(!validIp(m[1])) return lines("err", "The parameter is incorrect.");
      dev.cfg.ns = m[1];
      return lines("out", "Ok.");
    }
    if(/^netsh\s+wlan\s+show\s+networks/.test(low)) return lines("out", wifiScan(dev));
    m = cmd.match(/^netsh\s+wlan\s+connect\s+(?:name=)?"?([^"\s]+)"?/i);
    if(m){ const r = wifiJoin(dev, m[1]); return lines(r.err ? "err" : "out", r.text); }
    if(/^netsh\s+wlan\s+disconnect/.test(low)){ const r = wifiLeave(dev); return lines(r.err ? "err" : "out", r.text); }
    return lines("err", "The following command was not found: " + cmd.replace(/^netsh\s*/i, "") + ".\n(type help for the netsh commands this PC knows)");
  }
  if(c === "new-netipaddress"){
    const a = psArgs(parts);
    const bits = parseInt(a.prefixlength, 10);
    if(!validIp(a.ipaddress || "") || !(bits >= 1 && bits <= 32) || (a.defaultgateway && !validIp(a.defaultgateway)))
      return lines("err", "New-NetIPAddress : missing or invalid parameter.\nUsage: New-NetIPAddress -InterfaceAlias \"Ethernet\" -IPAddress <ip> -PrefixLength <bits> [-DefaultGateway <gw>]");
    dev.cfg.ip = a.ipaddress; dev.cfg.bits = bits; dev.cfg.viaDhcp = false;
    if(a.defaultgateway) dev.cfg.gw = a.defaultgateway;
    return lines("out", "IPAddress      : " + a.ipaddress + "\nInterfaceAlias : Ethernet\nPrefixLength   : " + bits + "\nPrefixOrigin   : Manual");
  }
  if(c === "set-dnsclientserveraddress"){
    const a = psArgs(parts);
    if(!validIp(a.serveraddresses || "")) return lines("err", "Usage: Set-DnsClientServerAddress -InterfaceAlias \"Ethernet\" -ServerAddresses <dns-ip>");
    dev.cfg.ns = a.serveraddresses;
    return [];
  }
  if(c === "rename-computer"){
    const a = psArgs(parts);
    if(!a.newname || !/^[\w.-]+$/.test(a.newname)) return lines("err", "Usage: Rename-Computer -NewName <name>");
    dev.name = a.newname;
    return lines("out", "WARNING: The changes will take effect after you restart the computer.\n(the lab applies it straight away)");
  }
  if(c === "hostname"){
    if(parts[1]) return lines("err", "hostname only SHOWS the name on Windows. To change it: Rename-Computer -NewName <name>");
    return lines("out", dev.name);
  }
  if(c === "route"){
    const a = (parts[1] || "").toLowerCase();
    if(a === "print"){
      const rows = ["IPv4 Route Table", "Network Destination        Netmask          Gateway       Interface"];
      if(dev.cfg.gw) rows.push("          0.0.0.0          0.0.0.0    " + dev.cfg.gw + "    " + (dev.cfg.ip || ""));
      if(dev.cfg.ip) rows.push("    " + networkOf(dev.cfg.ip, dev.cfg.bits) + "    " + bitsToMask(dev.cfg.bits) + "         On-link    " + dev.cfg.ip);
      return lines("out", rows.length > 2 ? rows.join("\n") : "(no routes: this PC has no address yet)");
    }
    if(a === "add" && parts[2] === "0.0.0.0" && (parts[3] || "").toLowerCase() === "mask" && parts[4] === "0.0.0.0" && validIp(parts[5] || "")){
      dev.cfg.gw = parts[5];
      return lines("out", " OK!");
    }
    if(a === "delete" && parts[2] === "0.0.0.0"){ dev.cfg.gw = null; return lines("out", " OK!"); }
    return lines("err", "Usage: route print | route add 0.0.0.0 mask 0.0.0.0 <gateway> | route delete 0.0.0.0");
  }
  if(c === "tracert"){
    if(!validIp(parts[1] || "")) return lines("err", "Usage: tracert <ip>");
    return doTraceroute(dev, parts[1]);
  }
  if(c === "arp"){
    const e = Object.entries(dev.arp);
    return lines("out", e.length
      ? "Interface: " + (dev.cfg.ip || "0.0.0.0") + "\n  Internet Address      Physical Address      Type\n" +
        e.map(([ip, a]) => "  " + pad(ip, 22) + pad(a.mac.replace(/:/g, "-"), 22) + "dynamic").join("\n")
      : "No ARP Entries Found.");
  }
  if(["ping", "nslookup", "curl", "ssh"].includes(c)) return null;
  return lines("err", "'" + parts[0] + "' is not recognized as an internal or external command,\noperable program or batch file." +
    (WIN_INSTEAD[c] ? "\n(this is a Windows PC. The Windows way: " + WIN_INSTEAD[c] + ")" : "\n(type help for what this PC knows)"));
}

const MAC_HELP =
  "ifconfig en0                         show this Mac's address\n" +
  "ipconfig getifaddr en0               just the IP\n" +
  "sudo ipconfig set en0 DHCP           ask DHCP for an address\n" +
  "sudo ipconfig set en0 MANUAL <ip> <mask>\n" +
  "networksetup -setmanual \"Ethernet\" <ip> <mask> <gateway>\n" +
  "networksetup -setdhcp \"Ethernet\"\n" +
  "networksetup -setdnsservers \"Ethernet\" <dns-ip>\n" +
  "networksetup -getinfo \"Ethernet\"     address, mask, router in one view\n" +
  "sudo route add default <gw> / sudo route delete default / netstat -rn\n" +
  "ping <ip-or-name> / traceroute <ip>  test reachability / show the path\n" +
  "arp -a                               show the ARP cache\n" +
  "nslookup <name> / curl <name>        resolve a name / fetch a web page\n" +
  "ssh [user@]<ip-or-name>              open a CLI session on a switch, router or server\n" +
  "networksetup -setairportnetwork en0 <ssid> / networksetup -setairportpower en0 off\n" +
  "wifi scan                            lab shorthand: a real Mac scans from the Wi-Fi menu\n" +
  "hostname / sudo scutil --set HostName <name>\n" +
  "clear                                wipe this terminal screen";
const MAC_INSTEAD = {
  ip: "ifconfig en0, or networksetup -setmanual \"Ethernet\" <ip> <mask> <gateway>",
  dhclient: "sudo ipconfig set en0 DHCP",
  nameserver: "networksetup -setdnsservers \"Ethernet\" <dns-ip>",
  tracert: "traceroute <ip>",
  cls: "clear",
  netsh: "networksetup",
};
function macIfconfig(dev){
  const rows = ["en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500", "\tether " + macOf(dev.id, "eth0")];
  if(dev.cfg.ip){
    const bc = intToIp((ipToInt(networkOf(dev.cfg.ip, dev.cfg.bits)) + Math.pow(2, 32 - dev.cfg.bits) - 1) >>> 0);
    rows.push("\tinet " + dev.cfg.ip + " netmask " + bitsToMask(dev.cfg.bits) + " broadcast " + bc);
  }
  rows.push("\tstatus: " + (isLinked(dev.id, "eth0") ? "active" : "inactive"));
  return rows.join("\n");
}
function macDhcp(dev){
  const out = runDhclient(dev);
  if(out.some(l => l.cls === "err"))
    return lines("err", "en0: no DHCP lease received, falling back to a 169.254 self-assigned address\n(" + hostDhcpReason(out) + ")");
  return lines("out", "en0: DHCP lease " + dev.cfg.ip + " netmask " + bitsToMask(dev.cfg.bits) + " router " + (dev.cfg.gw || "none"));
}
function macExec(dev, cmd){
  const parts = cmd.split(/\s+/);
  const c = parts[0];
  if(cmd === "?" || c === "help") return lines("out", MAC_HELP);
  if(c === "clear"){ dev.cli.log.length = 0; return []; }
  if(c === "ifconfig") return lines("out", macIfconfig(dev));
  if(c === "ipconfig"){
    if(parts[1] === "getifaddr" && parts[2] === "en0") return dev.cfg.ip ? lines("out", dev.cfg.ip) : [];
    if(parts[1] === "set" && parts[2] === "en0" && /^dhcp$/i.test(parts[3] || "")) return macDhcp(dev);
    if(parts[1] === "set" && parts[2] === "en0" && /^manual$/i.test(parts[3] || "")){
      const bits = maskToBits(parts[5]);
      if(!validIp(parts[4] || "") || bits === null) return lines("err", "usage: sudo ipconfig set en0 MANUAL <ip> <mask>");
      dev.cfg.ip = parts[4]; dev.cfg.bits = bits; dev.cfg.viaDhcp = false;
      return [];
    }
    return lines("err", "usage: ipconfig getifaddr en0 | sudo ipconfig set en0 DHCP | sudo ipconfig set en0 MANUAL <ip> <mask>");
  }
  if(c === "networksetup"){
    const flag = (parts[1] || "").toLowerCase();
    const rest = parts.slice(2).map(p => p.replace(/^["']|["']$/g, ""));
    if(flag === "-setairportnetwork" && rest[0] === "en0" && rest[1]){ const r = wifiJoin(dev, rest[1]); return lines(r.err ? "err" : "out", r.text); }
    if(flag === "-setairportpower" && rest[0] === "en0" && /^off$/i.test(rest[1] || "")){ const r = wifiLeave(dev); return lines(r.err ? "err" : "out", r.text); }
    if(!/^ethernet$/i.test(rest[0] || ""))
      return lines("err", "usage: networksetup -getinfo|-setdhcp|-setmanual|-setdnsservers \"Ethernet\" ...   (this Mac's wired service is called Ethernet)");
    if(flag === "-setdhcp") return macDhcp(dev);
    if(flag === "-setmanual"){
      const bits = maskToBits(rest[2]);
      if(!validIp(rest[1] || "") || bits === null || !validIp(rest[3] || ""))
        return lines("err", "usage: networksetup -setmanual \"Ethernet\" <ip> <mask> <gateway>");
      dev.cfg.ip = rest[1]; dev.cfg.bits = bits; dev.cfg.gw = rest[3]; dev.cfg.viaDhcp = false;
      return [];
    }
    if(flag === "-setdnsservers"){
      if(!validIp(rest[1] || "")) return lines("err", "usage: networksetup -setdnsservers \"Ethernet\" <dns-ip>");
      dev.cfg.ns = rest[1];
      return [];
    }
    if(flag === "-getinfo")
      return lines("out", (dev.cfg.viaDhcp ? "DHCP Configuration" : "Manual Configuration") +
        "\nIP address: " + (dev.cfg.ip || "none") + "\nSubnet mask: " + (dev.cfg.ip ? bitsToMask(dev.cfg.bits) : "none") +
        "\nRouter: " + (dev.cfg.gw || "none") + "\nEthernet Address: " + macOf(dev.id, "eth0"));
    return lines("err", "networksetup: unknown option. Type help for the ones this Mac knows.");
  }
  if(c === "route"){
    const a = parts.filter(p => p !== "-n");
    if(a[1] === "add" && a[2] === "default" && validIp(a[3] || "")){ dev.cfg.gw = a[3]; return lines("out", "add net default: gateway " + a[3]); }
    if(a[1] === "delete" && a[2] === "default"){ dev.cfg.gw = null; return lines("out", "delete net default"); }
    return lines("err", "usage: sudo route add default <gateway> | sudo route delete default   (netstat -rn shows the table)");
  }
  if(c === "netstat"){
    const rows = ["Routing tables", "", "Internet:", "Destination        Gateway            Flags    Netif"];
    if(dev.cfg.gw) rows.push(pad("default", 19) + pad(dev.cfg.gw, 19) + "UGScg    en0");
    if(dev.cfg.ip) rows.push(pad(networkOf(dev.cfg.ip, dev.cfg.bits) + "/" + dev.cfg.bits, 19) + pad("link#6", 19) + "UCS      en0");
    return lines("out", rows.join("\n"));
  }
  if(c === "scutil"){
    if(parts[1] === "--set" && /^(HostName|ComputerName|LocalHostName)$/.test(parts[2] || "") && /^[\w.-]+$/.test(parts[3] || "")){
      dev.name = parts[3];
      return [];
    }
    return lines("err", "usage: sudo scutil --set HostName <name>");
  }
  if(c === "hostname"){
    if(parts[1]) return lines("err", "hostname: on macOS a lasting rename is: sudo scutil --set HostName <name>");
    return lines("out", dev.name);
  }
  if(c === "wifi" && parts[1] === "scan") return lines("out", wifiScan(dev));
  if(["ping", "nslookup", "curl", "ssh", "arp", "traceroute"].includes(c)) return null;
  return lines("err", "zsh: command not found: " + parts[0] +
    (MAC_INSTEAD[c] ? "\n(this is a Mac. The macOS way: " + MAC_INSTEAD[c] + ")" : "\n(type help for what this Mac knows)"));
}
function hostOsExec(dev, cmd){
  const os = hostOs(dev);
  if(os === "linux") return null;
  if(os === "macos") return macExec(dev, cmd.replace(/^sudo\s+/, ""));
  return winExec(dev, cmd);
}
const HOST_OS_COMPLETIONS = {
  windows: [
    { label: "ipconfig", help: "show the address (/all, /renew, /release)" },
    { label: "netsh", help: "set a static address, DNS, or join Wi-Fi" },
    { label: "New-NetIPAddress", help: "PowerShell: set a static address" },
    { label: "route", help: "route print / route add 0.0.0.0 mask 0.0.0.0 <gw>" },
    { label: "ping", help: "test reachability" },
    { label: "tracert", help: "show the L3 path" },
    { label: "arp", help: "show the ARP cache (arp -a)" },
    { label: "nslookup", help: "resolve a name via your DNS server" },
    { label: "curl", help: "fetch a web page by name or IP" },
    { label: "ssh", help: "open a CLI session on a switch, router or server" },
    { label: "hostname", help: "show this PC's name" },
    { label: "cls", help: "wipe this terminal screen" },
    { label: "help", help: "quick reference" },
  ],
  macos: [
    { label: "ifconfig", help: "show the address (ifconfig en0)" },
    { label: "ipconfig", help: "getifaddr en0 / set en0 DHCP / set en0 MANUAL" },
    { label: "networksetup", help: "set a static address, DHCP, DNS, or join Wi-Fi" },
    { label: "route", help: "sudo route add default <gw>" },
    { label: "netstat", help: "netstat -rn shows the routing table" },
    { label: "ping", help: "test reachability" },
    { label: "traceroute", help: "show the L3 path" },
    { label: "arp", help: "show the ARP cache (arp -a)" },
    { label: "nslookup", help: "resolve a name via your DNS server" },
    { label: "curl", help: "fetch a web page by name or IP" },
    { label: "ssh", help: "open a CLI session on a switch, router or server" },
    { label: "hostname", help: "show this Mac's name" },
    { label: "clear", help: "wipe this terminal screen" },
    { label: "help", help: "quick reference" },
  ],
};
