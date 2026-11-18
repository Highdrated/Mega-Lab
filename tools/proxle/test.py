import asyncio,json,os,sys
from playwright.async_api import async_playwright
SOL={
 'install':['A:app:term', 'ipconfig', 'ip route', 'cat /etc/resolv.conf', 'X:LAB.objIndex()==1', 'A:app:ipam', 'ping 192.168.0.10', 'ping 192.168.0.201', 'A:reserve:202', 'A:reserve:201', 'X:LAB.objIndex()==2&&LAB.W().inst.plan.ip=="192.168.0.201/24"&&LAB.W().inst.plan.gw=="192.168.0.1"&&LAB.W().inst.plan.dns=="192.168.0.10"&&LAB.W().inst.plan.host=="pve1.lab.local"', 'A:review', 'X:LAB.objIndex()==3', 'PLANBAD', 'A:review', 'X:LAB.W().inst.rev.length==5', 'PLAN', 'A:review', 'X:LAB.W().inst.rev.length==0', 'X:LAB.objIndex()==3', 'A:app:browser', 'A:nav:proxmox', 'A:nav:proxmox.be', 'A:nav:www.proxmox.com', 'A:nav:proxmox.com/en/downloads', 'A:dl:pbs', 'A:app:usb', 'A:flashsel:proxmox-backup-server.iso', 'A:flash', 'A:usb:laptop', 'A:flash', 'A:usb:pocket', 'A:rk:mount', 'X:!LAB.W().inst.rack.mounted', 'A:go:room', 'A:rk:kind:console', 'A:rk:link:scr:trol', 'X:!LAB.W().inst.rack.link.scr', 'A:rk:kind:hands', 'A:rk:add:trol', 'A:rk:add:lap', 'A:power', 'X:!LAB.W().inst.power', 'A:rk:mount', 'X:!LAB.W().inst.rack.mounted', 'A:rk:kind:power', 'X:LAB.W().inst.rack.kind=="hands"', 'A:rk:open', 'A:rk:mount', 'X:!LAB.W().inst.rack.mounted', 'A:rk:rails', 'A:rk:mount', 'A:power', 'X:!LAB.W().inst.power', 'A:rk:rear', 'A:rk:p:A3', 'A:rk:kind:power', 'A:rk:p:psu1', 'A:rk:p:P3', 'A:rk:p:A1', 'A:rk:p:A3', 'A:rk:kind:power', 'A:rk:p:psu2', 'A:rk:p:A4', 'X:LAB.objIndex()==3&&!!LAB.W().inst.rack.link.psu2&&LAB.W().inst.rack.link.psu1=="A3"', 'A:rk:front', 'A:power', 'X:LAB.W().inst.screen=="post"', 'A:key:wait', 'A:power', 'A:usb:server', 'A:power', 'A:key:F11', 'A:boot:usb', 'X:LAB.W().inst.screen=="wrongprod"', 'A:power', 'A:usb:pocket', 'A:go:desk', 'A:app:browser', 'A:dl:ve', 'A:usb:laptop', 'A:flashsel:proxmox-ve_9.2-1.iso', 'A:flash', 'A:usb:pocket', 'A:go:room', 'A:rk:rear', 'A:rk:kind:hands', 'A:rk:p:psu2', 'A:rk:kind:power', 'A:rk:p:psu2', 'A:rk:p:B3', 'X:LAB.objIndex()==6', 'A:rk:kind:net', 'A:rk:p:eno2', 'A:rk:p:P6', 'X:LAB.objIndex()==6', 'A:rk:front', 'A:rk:kind:net', 'A:rk:link:scr:trol', 'X:!LAB.W().inst.rack.link.scr', 'A:rk:kind:console', 'A:rk:link:trol:scr', 'X:LAB.W().inst.rack.link.scr=="trol"', 'A:rk:kind:hands', 'A:usb:server', 'A:power', 'A:key:F2', 'A:vt', 'A:biosexit', 'A:key:F11', 'A:boot:usb', 'A:inst:gui', 'A:eula', 'CFG', 'A:wnext', 'A:wnext', 'A:wnext', 'A:wnext', 'A:wnext', 'A:reboot', 'A:key:wait', 'X:LAB.W().inst.screen=="instmenu"', 'A:power', 'A:usb:pocket', 'A:power', 'A:key:wait', 'X:LAB.W().inst.screen=="running"', 'A:go:desk', 'A:app:term', 'ping 192.168.0.201', 'ssh root@192.168.0.201', 'X:LAB.W().host=="laptop"', 'A:go:room', 'A:rk:rear', 'A:rk:kind:hands', 'A:rk:p:eno2', 'A:rk:kind:net', 'A:rk:p:eno1', 'A:rk:p:P3', 'A:go:desk', 'ping 192.168.0.201', 'pvecm status', 'ssh pve1', 'ssh 192.168.0.201', 'ssh root@192.168.0.201', 'yes', 'wrongpass', 'ssh root@192.168.0.201', 'Geheim-2026', 'hostname', 'A:go:room', 'A:rk:rear', 'A:rk:kind:hands', 'A:rk:p:psu1', 'X:LAB.W().inst.power', 'A:rk:kind:hands', 'A:rk:p:psu2', 'X:!LAB.W().inst.power&&LAB.W().host=="laptop"', 'A:rk:kind:power', 'A:rk:p:psu1', 'A:rk:p:A3', 'A:rk:kind:power', 'A:rk:p:psu2', 'A:rk:p:B4', 'A:rk:front', 'A:power', 'A:key:wait', 'X:LAB.W().nodes.pve1.up'],
 'install#bmc':['A:app:term', 'ip route', 'cat /etc/resolv.conf', 'ping 192.168.0.201', 'A:reserve:201', 'A:review', 'A:app:browser', 'A:nav:proxmox.com/en/downloads', 'A:dl:ve', 'A:nav:192.168.0.142', 'X:LAB.W().inst.page=="err"', 'A:go:room', 'A:rk:kind:console', 'A:rk:link:scr:trol', 'X:!LAB.W().inst.rack.link.scr', 'A:rk:kind:hands', 'A:rk:add:trol', 'A:rk:add:lap', 'A:rk:kind:serial', 'A:rk:link:con:lap', 'X:LAB.W().inst.rack.link.con=="lap"', 'A:rk:kind:net', 'A:rk:link:mgmt:P4', 'X:!LAB.W().inst.rack.link.mgmt', 'A:rk:open', 'A:rk:rails:3', 'A:rk:mount:3', 'A:rk:kind:power', 'A:rk:link:psu1:A3', 'A:rk:link:B3:psu2', 'A:rk:kind:net', 'A:rk:link:eno1:P3', 'A:rk:link:mgmt:P3', 'X:!LAB.W().inst.rack.link.mgmt', 'A:rk:link:mgmt:P4', 'A:go:desk', 'A:nav:https://192.168.0.142', 'X:LAB.W().inst.page=="bmc"', 'A:bmclogin:nope', 'X:!LAB.W().inst.bmc.auth', 'A:bmclogin:K7Q2-MXPL', 'A:vmedia', 'X:!LAB.W().inst.vmedia', 'VMSEL', 'A:vmedia', 'X:LAB.objIndex()==7', 'A:bmcpower', 'X:LAB.W().inst.screen=="post"', 'A:key:F2', 'A:vt', 'A:biosexit', 'A:key:F11', 'A:boot:vcd', 'A:inst:gui', 'A:eula', 'CFG', 'A:wnext', 'A:wnext', 'A:wnext', 'A:wnext', 'A:wnext', 'A:reboot', 'A:key:wait', 'X:LAB.W().inst.screen=="instmenu"', 'A:vmedia', 'X:LAB.W().inst.screen=="nodev"', 'A:bmcpower', 'A:bmcpower', 'A:key:wait', 'X:LAB.W().inst.screen=="running"', 'A:app:term', 'ssh root@192.168.0.201', 'yes', 'Geheim-2026', 'hostname'],
 'ready':['pvecm status','ssh root@192.168.0.201','yes','pw','hostname','pveversion','pvecm status','ping 192.168.0.202'],
 'create':['ssh root@192.168.0.201','yes','pw','pvecm create west','pvecm status'],
 'join':['ssh root@192.168.0.201','yes','pw','pvecm add 192.168.0.201','ssh root@192.168.0.202','yes','pw','pvecm add 192.168.0.201','secret','yes','exit','ssh root@pve3','ssh root@192.168.0.203','yes','pw','pvecm add 192.168.0.201','qm list','qm destroy 900','pvecm add 192.168.0.201','pw','yes','exit','ssh root@192.168.0.202','pvecm nodes','openssl x509 -in /etc/pve/nodes/pve1/pve-ssl.pem -noout -subject -issuer','openssl x509 -in /etc/pve/nodes/pve2/pve-ssl.pem -noout -subject -issuer'],
 'move':['ssh root@192.168.0.201','yes','pw','qm migrate 101 pve2 --online','qm config 101','pvesm add nfs nas-west --server 192.168.0.50 --export /volume1/pve --content images','qm disk move 101 scsi0 nas-west','qm migrate 101 pve2 --online'],
 'dies':['ssh root@192.168.0.201','yes','pw','EV0','pvecm status','ha-manager status','EV1','pvecm status','qm stop 101','EV2','pvecm status'],
 'add':['ssh root@192.168.0.201','yes','pw','ssh root@192.168.0.204','yes','pw','pveversion','pvecm add 192.168.0.201','x','yes','pvecm status','pvesm status','exit','qm migrate 101 pve4 --online'],
 'bka':['ssh root@192.168.0.201','yes','pw','vzdump 101 --storage nas-west --mode snapshot','pvesm add nfs backup-a --server 192.168.0.50 --export /volume1/backup --content backup','vzdump 101 --storage backup-a --mode snapshot','pvesm list backup-a'],
 'bkb':['ssh root@192.168.0.201','yes','pw','pvesm list backup-a','qmrestore backup-a:backup/vzdump-qemu-101-2026_11_18-02_00_04.vma.zst 101','qm start 101','pvesm add nfs backup-b --server 192.168.9.50 --export /volume1/backup --content backup','vzdump 101 --storage backup-b --mode snapshot','pvesm list backup-b'],
}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1500,'height':860})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','labs','proxle.html'))+'');await pg.wait_for_timeout(600)
        ok=True
        for sid,cmds in SOL.items():
            await pg.evaluate(f"LAB.load('{sid}')")
            trace=[]
            for c in cmds:
                if c=='CFG': await pg.evaluate("LAB.cfg({fs:'zfs (RAID1)',d0:'sda',d1:'sdb',country:'Belgium',pw:'Geheim-2026',pw2:'Geheim-2026',mail:'k@lab.be',host:'pve1.lab.local',ip:'192.168.0.201/24',gw:'192.168.0.1',dns:'192.168.0.10'})")
                elif c=='VMSEL': await pg.evaluate("LAB.W().inst.vmSel='proxmox-ve_9.2-1.iso'")
                elif c=='PLANBAD': await pg.evaluate("LAB.plan({host:'pve1',ip:'192.168.0.150',gw:'192.168.0.254',dns:'8.8.8.8'})")
                elif c=='PLAN': await pg.evaluate("LAB.plan({host:'pve1.lab.local',ip:'192.168.0.201/24',gw:'192.168.0.1',dns:'192.168.0.10'})")
                elif c.startswith('X:'):
                    if not await pg.evaluate(c[2:]): print('ASSERT FAIL',c); ok=False
                    continue
                elif c.startswith('A:flashsel:'): await pg.evaluate("f=>{LAB.W().inst.selImg=f}",c[11:])
                elif c.startswith('A:'):
                    p=c[2:].split(':',1); await pg.evaluate("([n,a])=>LAB.act(n,a)",[p[0],p[1] if len(p)>1 else None])
                    trace.append((c,await pg.evaluate("LAB.W().inst.screen+'/'+LAB.W().inst.page+'/'+LAB.W().inst.usbImg"))); continue
                elif c.startswith('EV'): await pg.evaluate(f"LAB.ev({c[2:]})")
                else: await pg.evaluate("c=>LAB.run(c)",c)
                trace.append((c,await pg.evaluate("LAB.objIndex()")))
            k=await pg.evaluate("LAB.objIndex()")
            print(sid,'DONE' if k<0 else f'STUCK at {k}',[t[1] for t in trace] if not sid.startswith('install') else [x[1] for x in trace if isinstance(x[1],str)])
            ok=ok and k<0
        await pg.evaluate("localStorage.clear()");await pg.evaluate("LAB.load('install')");await pg.click('[data-act="app:browser"]');await pg.fill('#url','proxmox.com/en/downloads');await pg.press('#url','Enter');await pg.wait_for_timeout(300)
        txt=await pg.evaluate("document.getElementById('term').innerText")
        print(txt[-900:])
        print('errors',errs,'ALL OK' if ok and not errs else 'FAIL');await b.close()
        sys.exit(0 if ok and not errs else 1)
asyncio.run(main())
