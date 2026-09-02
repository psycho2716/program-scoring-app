import os from "node:os";

function isLanAddress(address) {
  if (address.startsWith("192.168.")) return true;
  if (address.startsWith("10.")) return true;
  return false;
}

const lines = [];
for (const interfaces of Object.values(os.networkInterfaces())) {
  for (const net of interfaces ?? []) {
    if (net.family !== "IPv4" || net.internal) continue;
    if (!isLanAddress(net.address)) continue;
    lines.push(`  http://${net.address}:3000`);
  }
}

console.log("");
console.log("LAN access (judge tablets on same Wi-Fi):");
if (lines.length === 0) {
  console.log("  No private LAN IP found. Run ipconfig and use your Wi-Fi IPv4 address.");
} else {
  for (const line of lines) console.log(line);
}
console.log("");
console.log("If unreachable, run scripts/open-lan-firewall.ps1 as Administrator.");
console.log("");
