import re, os, subprocess

BASE = os.path.expanduser("~/Downloads/ESTv2")
path = os.path.join(BASE, "src/routes/onboarding.tsx")

with open(path, encoding="utf-8") as f:
    c = f.read()

matches = list(re.finditer(r'[Ee]stande', c))
print(f"Encontradas {len(matches)} ocorrencias:")
for m in matches:
    print(f"  pos {m.start()}: ...{c[max(0,m.start()-60):m.end()+60]}...")

before = c
c = re.sub(r'value=["\']Estande["\']', 'value="Loja"', c)
c = re.sub(r'>Estande<', '>Loja<', c)
c = re.sub(r'"Estande"', '"Loja"', c)
c = re.sub(r"'Estande'", "'Loja'", c)

changed = c != before
print(f"\nArquivo {'alterado' if changed else 'nao alterado'}.")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)

if changed:
    subprocess.run(["git", "add", "src/routes/onboarding.tsx"], cwd=BASE)
    r = subprocess.run(["git", "commit", "-m", "fix: replace Estande with Loja in onboarding select"], cwd=BASE, capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    r2 = subprocess.run(["git", "push", "-u", "origin", "claude/saas-evaluation-gaps-gqhbgj"], cwd=BASE, capture_output=True, text=True)
    print(r2.stdout.strip() or r2.stderr.strip())
    if r2.returncode == 0:
        print("Pronto! Deploy em 1-2 min.")
    else:
        print("Push falhou:", r2.stderr)
