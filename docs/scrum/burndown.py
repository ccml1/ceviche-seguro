import json, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
d=json.load(open('backlog.json')); b=d['burndown_sprint1']; dias=b['dias']; real=b['real']; tot=real[0]; n=len(dias)-1
ideal=[tot-tot*i/n for i in range(n+1)]
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11})
fig,ax=plt.subplots(figsize=(8,4.2),dpi=200); fig.patch.set_facecolor('#fcfcfb'); ax.set_facecolor('#fcfcfb')
ax.plot(range(n+1),ideal,color='#8a8984',lw=2,ls=(0,(5,4)),label='Ideal')
ax.plot(range(n+1),real,color='#2a78d6',lw=2,marker='o',ms=6,mec='#fcfcfb',mew=2,label='Real')
ax.annotate('Ideal',(3,ideal[3]),xytext=(-10,-22),textcoords='offset points',color='#52514e')
ax.annotate('Real',(2,real[2]),xytext=(6,8),textcoords='offset points',color='#0b0b0b',fontweight='bold')
ax.set_xticks(range(n+1),dias); ax.set_ylabel('Story points restantes',color='#52514e'); ax.set_ylim(0,tot+2)
ax.set_title('Burndown Sprint 1 — 21 story points (ilustrativo)',loc='left',fontsize=12,color='#0b0b0b')
for s in ['top','right']: ax.spines[s].set_visible(False)
for s in ['left','bottom']: ax.spines[s].set_color('#c9c8c2')
ax.tick_params(colors='#52514e'); ax.grid(axis='y',color='#e6e5e0',lw=0.8); ax.set_axisbelow(True)
ax.legend(frameon=False,loc='upper right')
fig.tight_layout(); fig.savefig('burndown-sprint1.png')
