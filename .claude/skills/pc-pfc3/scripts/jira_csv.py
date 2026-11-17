"""Genera docs/scrum/jira-import.csv desde docs/scrum/backlog.json (ejecutar desde la raíz del repo)."""
import csv, json, pathlib
raiz = pathlib.Path.cwd()
d = json.loads((raiz / 'docs/scrum/backlog.json').read_text(encoding='utf-8'))
prioridad = {'Must': 'Highest', 'Should': 'High', 'Could': 'Medium'}
salida = raiz / 'docs/scrum/jira-import.csv'
with salida.open('w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['Issue Type', 'Summary', 'Description', 'Story Points', 'Priority', 'Sprint', 'Labels'])
    for h in d['historias']:
        desc = f"Como {h['rol']}, quiero {h['quiero']}, para {h['para']}.\n\nCriterios de aceptación:\n" + '\n'.join('- ' + c for c in h['ca'])
        w.writerow(['Story', f"{h['id']} {h['quiero'][:70]}", desc, h['pts'], prioridad.get(h['moscow'], 'Low'),
                    f"Sprint {h['sprint']}" if h['sprint'] else '', d['epicas'][h['epica']].replace(' ', '_')])
print('OK', salida)
