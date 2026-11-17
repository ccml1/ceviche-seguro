# Genera casos-uso.svg (UML de casos de uso). Ejecutar: python3 gen_casos_uso.py
import math
W,H=1500,1000
uc={'consultar':(500,100,'Consultar puestos por distrito'),'sello':(500,195,'Ver sello sanitario y<br>producto declarado'),
 'reportar':(500,290,'Reportar puesto'),'registro':(500,400,'Registrarse como vendedor'),'puesto':(500,490,'Registrar puesto'),
 'licencia':(500,690,'Cargar licencia y<br>carnet de sanidad'),'frio':(500,790,'Registrar control de frío'),
 'alerta':(500,905,'Alertar temperatura &gt; 4 °C'),'login':(750,575,'Iniciar sesión'),
 'calc':(1010,195,'Calcular sello<br>(verde/amarillo/rojo)'),'inspeccion':(1010,400,'Registrar inspección'),
 'atender':(1010,690,'Atender reportes'),'archivos':(1010,795,'Ver archivos de licencias'),'cuentas':(1010,905,'Crear cuentas de inspector')}
actors={'Consumidor':(110,195),'Vendedor':(110,600),'Inspector municipal':(1390,640),'Administrador':(1390,905)}
links=[('Consumidor','consultar'),('Consumidor','sello'),('Consumidor','reportar'),('Vendedor','registro'),('Vendedor','login'),
 ('Vendedor','puesto'),('Vendedor','licencia'),('Vendedor','frio'),('Inspector municipal','login'),('Inspector municipal','inspeccion'),
 ('Inspector municipal','atender'),('Inspector municipal','archivos'),('Administrador','cuentas')]
rel=[('sello','calc','«include»'),('inspeccion','calc','«include»'),('alerta','frio','«extend»')]
RX,RY=150,38
def edge(a,b):
    (x1,y1),(x2,y2)=a,b; dx,dy=x2-x1,y2-y1; t=1/math.sqrt((dx/RX)**2+(dy/RY)**2); return x1+dx*t,y1+dy*t
s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="Arial" font-size="17">',
 '<defs><marker id="ar" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto"><path d="M0,0 L12,5 L0,10" fill="none" stroke="#333"/></marker>'
 '<marker id="gen" markerWidth="20" markerHeight="18" refX="19" refY="9" orient="auto"><path d="M0,0 L19,9 L0,18 Z" fill="white" stroke="#222" stroke-width="1.5"/></marker></defs>',
 f'<rect width="{W}" height="{H}" fill="white"/>','<rect x="300" y="20" width="910" height="960" fill="#f7f9fc" stroke="#333" stroke-width="2" rx="6"/>',
 '<text x="755" y="50" text-anchor="middle" font-weight="bold" font-size="21">Sistema Ceviche Seguro</text>']
for a,u in links:
    x,y=actors[a]; ux,uy,_=uc[u]; ex,ey=edge((ux,uy),(x,y)); s.append(f'<line x1="{x}" y1="{y}" x2="{ex:.0f}" y2="{ey:.0f}" stroke="#555" stroke-width="1.5"/>')
for a,b,lab in rel:
    (x1,y1,_),(x2,y2,_)=uc[a],uc[b]; sx,sy=edge((x1,y1),(x2,y2)); ex,ey=edge((x2,y2),(x1,y1))
    s.append(f'<line x1="{sx:.0f}" y1="{sy:.0f}" x2="{ex:.0f}" y2="{ey:.0f}" stroke="#333" stroke-width="1.5" stroke-dasharray="7,5" marker-end="url(#ar)"/>')
    mx,my=(sx+ex)/2,(sy+ey)/2; dx=0 if abs(sx-ex)>5 else 45
    s.append(f'<text x="{mx+dx:.0f}" y="{my-8 if dx==0 else my+5:.0f}" font-size="15" fill="#333" text-anchor="middle">{lab}</text>')
ix,iy=actors['Inspector municipal']; ax,ay=actors['Administrador']
s.append(f'<line x1="{ax}" y1="{ay-72}" x2="{ix}" y2="{iy+76}" stroke="#222" stroke-width="1.8" marker-end="url(#gen)"/>')
s.append(f'<text x="{ix+10}" y="{(ay+iy)/2+5:.0f}" font-size="14" fill="#333">generalización</text>')
for k,(x,y,t) in uc.items():
    s.append(f'<ellipse cx="{x}" cy="{y}" rx="{RX}" ry="{RY}" fill="#e8f1fb" stroke="#2b5d8a" stroke-width="2"/>')
    ls=t.split('<br>'); y0=y-(len(ls)-1)*10+6
    for i,l in enumerate(ls): s.append(f'<text x="{x}" y="{y0+i*20}" text-anchor="middle">{l}</text>')
for n,(x,y) in actors.items():
    s.append(f'<g stroke="#222" stroke-width="2.5" fill="none"><circle cx="{x}" cy="{y-55}" r="16" fill="white"/><line x1="{x}" y1="{y-39}" x2="{x}" y2="{y+5}"/><line x1="{x-25}" y1="{y-25}" x2="{x+25}" y2="{y-25}"/><line x1="{x}" y1="{y+5}" x2="{x-20}" y2="{y+40}"/><line x1="{x}" y1="{y+5}" x2="{x+20}" y2="{y+40}"/></g>')
    s.append(f'<text x="{x}" y="{y+65}" text-anchor="middle" font-weight="bold">{n}</text>')
s.append('</svg>'); open('casos-uso.svg','w').write('\n'.join(s))
