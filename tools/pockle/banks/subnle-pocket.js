// Completion rule: units are the 8 guided-path lessons, in path order. Each lesson has a
// lesson step (index pushed to S.read when finished) and a practice step (index pushed to
// S.pathDone when 4 of 5 tickets are right). A unit counts as done when BOTH are true for
// that lesson index in localStorage "subnle-pocket-v1".
POCKET.register({
  id: "subnle-pocket",
  name: "Subnle Pocket",
  topic: "Subnetting",
  href: "subnle-pocket.html",
  keys: ["subnle-pocket-v1"],
  units: [
    { id: "bits", title: "Bits & octets" },
    { id: "prefix", title: "The /number" },
    { id: "block", title: "Block size" },
    { id: "netbc", title: "Network & broadcast" },
    { id: "sizing", title: "Sizing a VLAN" },
    { id: "split", title: "Splitting a block" },
    { id: "summary", title: "Summary routes" },
    { id: "ranges", title: "Special ranges" }
  ],
  done(get) {
    try {
      var ids = ["bits", "prefix", "block", "netbc", "sizing", "split", "summary", "ranges"];
      var s = get("subnle-pocket-v1");
      if (!s || typeof s !== "object") return [];
      var read = Array.isArray(s.read) ? s.read : [];
      var passed = Array.isArray(s.pathDone) ? s.pathDone : [];
      return ids.filter(function (id, i) {
        return read.indexOf(i) !== -1 && passed.indexOf(i) !== -1;
      });
    } catch (e) { return []; }
  },
  sample: {
    "subnle-pocket-v1": "{\"xp\":310,\"bestSprint\":9,\"bestRun\":7,\"streak\":2,\"lastDay\":\"2026-10-28\",\"theme\":\"orbital\",\"on\":[\"bin\",\"dec2bin\",\"mask\",\"cidr\"],\"stats\":{\"bin\":{\"a\":12,\"c\":11}},\"read\":[0,1,2,3],\"lsn\":{\"0\":6,\"1\":4,\"2\":4,\"3\":4,\"4\":1},\"pathDone\":[0,1,2],\"daily\":{\"day\":\"\",\"score\":-1}}"
  },
  sampleDone: ["bits", "prefix", "block"],
  cards: [
    { u: "bits", q: "How many octets are in an IPv4 address?", o: ["2", "32", "8", "4"], a: 3, why: "4 numbers separated by 3 dots." },
    { u: "bits", q: "Convert this octet to decimal.", code: "11000000", o: ["128", "224", "192", "3"], a: 2, why: "128 + 64 = 192." },
    { u: "bits", q: "What is the highest value one octet can hold?", o: ["128", "255", "254", "256"], a: 1, why: "All 8 bits on: 128+64+32+16+8+4+2+1 = 255." },
    { u: "bits", q: "Write 10 in binary.", o: ["00001010", "00000110", "00001100", "10100000"], a: 0, why: "8 + 2 = 10." },
    { u: "bits", q: "Convert 200 to binary.", o: ["11001000", "11000100", "10101000", "11100000"], a: 0, why: "128 + 64 + 8 = 200." },
    { u: "bits", q: "Convert this octet to decimal.", code: "11110000", o: ["15", "224", "248", "240"], a: 3, why: "128 + 64 + 32 + 16 = 240." },
    { u: "bits", q: "What are the 8 bit values, left to right?", o: ["1 2 4 8 16 32 64 128", "256 128 64 32 16 8 4 2", "128 64 32 16 8 4 2 1", "100 50 25 12 6 3 2 1"], a: 2, why: "They double from right to left." },
    { u: "bits", q: "Convert this octet to decimal.", code: "00100101", o: ["41", "37", "69", "33"], a: 1, why: "32 + 4 + 1 = 37." },
    { u: "prefix", q: "How many bits are in an IPv4 address?", o: ["8", "32", "24", "64"], a: 1, why: "4 octets x 8 bits." },
    { u: "prefix", q: "What does the /24 in 192.168.10.37/24 mean?", o: ["The first 24 bits are the network", "24 devices", "Mask 255.255.255.24", "Last octet is 24"], a: 0, why: "The rest of the bits name the device." },
    { u: "prefix", q: "What is the mask for /26?", o: ["255.255.255.0", "255.255.255.128", "255.255.255.224", "255.255.255.192"], a: 3, why: "2 ones in the 4th octet: 128 + 64 = 192." },
    { u: "prefix", q: "How many device (host) bits does a /26 have?", o: ["26", "8", "6", "2"], a: 2, why: "32 - 26 = 6." },
    { u: "prefix", q: "Which number can never appear in a mask?", o: ["224", "248", "250", "252"], a: 2, why: "Masks are ones from the left, so only 0, 128, 192, 224, 240, 248, 252, 254, 255." },
    { u: "prefix", q: "What prefix is 255.255.255.240?", o: ["/26", "/28", "/27", "/29"], a: 1, why: "24 + 4 ones (240) = /28." },
    { u: "prefix", q: "What prefix is 255.255.252.0?", o: ["/22", "/20", "/23", "/24"], a: 0, why: "16 + 6 ones (252) = /22." },
    { u: "prefix", q: "How many host bits does a /20 have?", o: ["20", "8", "4", "12"], a: 3, why: "32 - 20 = 12." },
    { u: "prefix", q: "The mask octet for 3 ones is...", o: ["192", "7", "240", "224"], a: 3, why: "128 + 64 + 32 = 224." },
    { u: "block", q: "/28 has mask 240. Block size?", o: ["14", "32", "16", "240"], a: 2, why: "256 - 240 = 16." },
    { u: "block", q: "Address .70 on a /27 sits in which block?", o: ["32 - 63", "64 - 95", "70 - 101", "0 - 31"], a: 1, why: "Block 32: 0, 32, 64, 96. 70 is in 64 - 95." },
    { u: "block", q: "One prefix shorter means the block...", o: ["Doubles", "Halves", "Stays the same", "Adds 1"], a: 0, why: "/28 = 16, /27 = 32, /26 = 64." },
    { u: "block", q: "Block size for a /26 in the 4th octet?", o: ["64", "32", "26", "128"], a: 0, why: "256 - 192 = 64." },
    { u: "block", q: "Where do /27 blocks start in the last octet?", o: ["0, 27, 54, 81...", "0, 16, 32, 48...", "1, 33, 65, 97...", "0, 32, 64, 96..."], a: 3, why: "At multiples of the block size, starting at 0." },
    { u: "block", q: "Block size in the 3rd octet for /22 (mask 252)?", o: ["2", "8", "4", "22"], a: 2, why: "256 - 252 = 4. /16 to /23 use the 3rd octet." },
    { u: "block", q: "How many usable hosts in a /28?", o: ["16", "14", "15", "28"], a: 1, why: "16 addresses - 2 = 14." },
    { u: "block", q: "Block size for /30?", o: ["2", "4", "8", "30"], a: 1, why: "Mask 252: 256 - 252 = 4." },
    { u: "netbc", q: "The first address of a block is the...", o: ["Network address", "Gateway", "Broadcast", "First host"], a: 0, why: "The last address is the broadcast." },
    { u: "netbc", q: "Network address of 192.168.1.70/26?", o: ["192.168.1.0", "192.168.1.128", "192.168.1.70", "192.168.1.64"], a: 3, why: "Block 64: 70 sits in 64 - 127." },
    { u: "netbc", q: "Broadcast of 192.168.1.70/26?", o: ["192.168.1.255", "192.168.1.128", "192.168.1.127", "192.168.1.126"], a: 2, why: "Next network (128) - 1." },
    { u: "netbc", q: "Server 10.0.0.70/26, gateway 10.0.0.62. Why no ping?", o: ["Wrong mask", "Broadcast is blocked", "Gateway is in another subnet", "DNS is down"], a: 2, why: "Server is in 64 - 127, gateway in 0 - 63." },
    { u: "netbc", q: "Usable hosts in a /27?", o: ["32", "30", "31", "27"], a: 1, why: "5 device bits: 32 - 2 = 30." },
    { u: "netbc", q: "First usable host in 10.1.1.37/27?", o: ["10.1.1.33", "10.1.1.32", "10.1.1.37", "10.1.1.1"], a: 0, why: "Network .32 + 1." },
    { u: "netbc", q: "Last usable host in 10.1.1.37/27?", o: ["10.1.1.63", "10.1.1.254", "10.1.1.64", "10.1.1.62"], a: 3, why: "Broadcast .63 - 1." },
    { u: "netbc", q: "Can you put 172.16.5.64/26 on a server NIC?", o: ["Yes", "Only as gateway", "No, it is the broadcast", "No, it is the network address"], a: 3, why: "64 is the start of a /26 block." },
    { u: "netbc", q: "Two hosts, both /24: 10.5.5.10 and 10.5.6.10. Same subnet?", o: ["Yes", "Only with a trunk", "No, they need a router", "Yes, same first octets"], a: 2, why: "Networks 10.5.5.0 and 10.5.6.0 differ." },
    { u: "netbc", q: "The switch finds the network with which bit operation?", o: ["OR", "AND", "XOR", "NOT"], a: 1, why: "Keep a 1 only where address and mask are both 1." },
    { u: "sizing", q: "Customer cage with 200 servers. Smallest prefix?", o: ["/24", "/23", "/25", "/26"], a: 0, why: "/25 = 126, too few. /24 = 254." },
    { u: "sizing", q: "50 devices in one VLAN. Smallest prefix?", o: ["/26", "/25", "/27", "/28"], a: 0, why: "/27 = 30, too few. /26 = 62." },
    { u: "sizing", q: "120 devices. Smallest prefix?", o: ["/24", "/23", "/26", "/25"], a: 3, why: "/25 = 126 hosts." },
    { u: "sizing", q: "Why pick the smallest subnet that fits?", o: ["Faster switching", "Routers need it", "Bigger just wastes addresses", "Required by DHCP"], a: 2, why: "Address space is limited." },
    { u: "sizing", q: "10 devices plus a gateway. Smallest prefix?", o: ["/29", "/28", "/27", "/30"], a: 1, why: "/29 = 6, too few. /28 = 14." },
    { u: "sizing", q: "300 devices. Smallest prefix?", o: ["/24", "/23", "/22", "/25"], a: 1, why: "/24 = 254, too few. /23 = 510." },
    { u: "sizing", q: "Usable hosts in a /30?", o: ["2", "4", "1", "0"], a: 0, why: "4 addresses - 2 = 2." },
    { u: "sizing", q: "Exactly 62 devices. Does a /26 fit?", o: ["Only without a gateway", "No, need a /25", "No, need a /27", "Yes, exactly 62 usable"], a: 3, why: "2^6 - 2 = 62." },
    { u: "split", q: "A /24 split into /28s. How many subnets?", o: ["4", "8", "16", "28"], a: 2, why: "4 borrowed bits: 2^4 = 16." },
    { u: "split", q: "Each borrowed bit does what to the number of subnets?", o: ["Adds one", "Halves it", "Doubles it", "Nothing"], a: 2, why: "And halves each subnet's size." },
    { u: "split", q: "From one /24 you need 100, 50 and 10 hosts. Place which first?", o: ["10", "100", "50", "Does not matter"], a: 1, why: "Biggest first keeps blocks aligned." },
    { u: "split", q: "10.20.0.0/24 cut into /26s. Network of subnet #3?", o: ["10.20.0.128", "10.20.0.64", "10.20.0.192", "10.20.0.3"], a: 0, why: "Start + 2 blocks of 64." },
    { u: "split", q: "A /22 split into /24s. How many?", o: ["2", "22", "8", "4"], a: 3, why: "2 borrowed bits: 2^2 = 4." },
    { u: "split", q: "10.0.0.0/25 is taken. Where does the next /25 start?", o: ["10.0.0.126", "10.0.0.127", "10.0.1.0", "10.0.0.128"], a: 3, why: "Broadcast .127, so +1." },
    { u: "split", q: "After 10.20.0.0/25, place a /26 for 50 hosts. Where?", o: ["10.20.0.64", "10.20.0.192", "10.20.0.128", "10.20.1.0"], a: 2, why: "Right after the /25 ends at .127." },
    { u: "split", q: "10.1.0.0/16 into /20s. Network of subnet #2?", o: ["10.1.2.0", "10.1.16.0", "10.1.32.0", "10.1.0.16"], a: 1, why: "Each /20 is 16 in the 3rd octet." },
    { u: "summary", q: "Summary for 10.1.8.0/24 to 10.1.11.0/24?", o: ["10.1.8.0/22", "10.1.8.0/21", "10.1.0.0/20", "10.1.11.0/22"], a: 0, why: "4 networks = 2^2: /24 - 2 = /22, and 8 is a multiple of 4." },
    { u: "summary", q: "Why use summary routes?", o: ["Fewer routes, less work for routers", "More security", "Faster DHCP", "More hosts"], a: 0, why: "One route replaces many." },
    { u: "summary", q: "A clean summary needs how many networks?", o: ["Any number", "Exactly 4", "3, 6, 9...", "2, 4, 8..."], a: 3, why: "A power of two." },
    { u: "summary", q: "Summary for 192.168.4.0/24 and 192.168.5.0/24?", o: ["192.168.5.0/23", "192.168.4.0/22", "192.168.4.0/23", "192.168.0.0/21"], a: 2, why: "2 networks: /24 - 1 = /23, 4 is even." },
    { u: "summary", q: "Why can't .6 to .9 (4 networks) summarise cleanly?", o: ["Too many", "6 is not a multiple of 4", "Need 8 networks", "They are private"], a: 1, why: "The first network must be a multiple of the count." },
    { u: "summary", q: "Summary for 10.0.16.0/24 to 10.0.23.0/24 (8 networks)?", o: ["10.0.16.0/22", "10.0.16.0/21", "10.0.16.0/20", "10.0.0.0/19"], a: 1, why: "8 = 2^3: /24 - 3 = /21; 16 is a multiple of 8." },
    { u: "summary", q: "Summary for 172.16.32.0/24 to 172.16.35.0/24?", o: ["172.16.32.0/22", "172.16.32.0/23", "172.16.32.0/21", "172.16.35.0/22"], a: 0, why: "4 networks: /22, and 32 is a multiple of 4." },
    { u: "ranges", q: "A laptop shows 169.254.12.4. What happened?", o: ["Guest Wi-Fi", "VPN is on", "It is a public IP", "DHCP failed"], a: 3, why: "The device gave itself an address." },
    { u: "ranges", q: "Which is an RFC 1918 private address?", o: ["172.32.1.1", "192.169.1.1", "172.20.1.1", "100.64.1.1"], a: 2, why: "172.16 to 172.31 is private." },
    { u: "ranges", q: "127.0.0.1 is...", o: ["Private", "Link-local", "Loopback", "CGNAT"], a: 2, why: "127/8 never leaves the box." },
    { u: "ranges", q: "100.64.0.0/10 is used for...", o: ["Loopback", "CGNAT at ISPs", "APIPA", "Multicast"], a: 1, why: "ISPs share public IPs with it." },
    { u: "ranges", q: "Wildcard mask for /26?", o: ["0.0.0.63", "255.255.255.192", "0.0.0.64", "0.0.0.192"], a: 0, why: "255 - 192 = 63." },
    { u: "ranges", q: "Who uses wildcard masks?", o: ["Junos static routes", "LLDP", "DHCP", "Cisco ACLs and OSPF"], a: 3, why: "Junos just uses the /prefix." },
    { u: "ranges", q: "Is 192.168.200.5 private?", o: ["Only with NAT", "No", "Only on Wi-Fi", "Yes"], a: 3, why: "192.168/16 is RFC 1918." },
    { u: "ranges", q: "Wildcard mask for /24?", o: ["255.255.255.0", "0.0.255.255", "0.0.0.255", "0.0.0.254"], a: 2, why: "255 - each mask octet." }
  ]
});
