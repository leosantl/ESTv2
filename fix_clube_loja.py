import os, subprocess

BASE = os.path.expanduser("~/Downloads/ESTv2")

def patch(rel, old, new, label=""):
    path = os.path.join(BASE, rel)
    with open(path, encoding="utf-8") as f:
        c = f.read()
    if old in c:
        with open(path, "w", encoding="utf-8") as f:
            f.write(c.replace(old, new, 1))
        print(f"  OK: {label or rel}")
    else:
        print(f"  SKIP (nao encontrado): {label or rel}")

# 1. companies.ts: tipo Estande -> Loja
patch(
    "src/hooks/queries/companies.ts",
    '"Clube" | "Estande" | "Empresa"',
    '"Clube" | "Loja" | "Empresa"',
    "companies.ts tipo"
)

# 2. onboarding.tsx: opcao Estande -> Loja
patch(
    "src/routes/onboarding.tsx",
    '<option value="Estande">Estande</option>',
    '<option value="Loja">Loja</option>',
    "onboarding Estande->Loja"
)

# 3. documents.tsx: se ainda tiver referencia a "estande" como tab, corrige
# (o arquivo pode ja ter sido reescrito sem essa tab - verificar)
doc_path = os.path.join(BASE, "src/routes/app.$companyId.documents.tsx")
with open(doc_path, encoding="utf-8") as f:
    doc = f.read()

changes = 0
for old, new in [
    ('"estande" | "atiradores"', '"clube" | "atiradores"'),
    ('useState<Tab>("estande")', 'useState<Tab>("clube")'),
    ('label: "Estande"', 'label: "Clube"'),
    ('tab === "estande"', 'tab === "clube"'),
    ('"estande" ?', '"clube" ?'),
    ('key: "estande"', 'key: "clube"'),
    ('do estande', 'do clube'),
    ('Documento do estande', 'Documento do clube'),
    ('const estande =', 'const clube ='),
    (' estande.filter(', ' clube.filter('),
    ('? estande :', '? clube :'),
]:
    if old in doc:
        doc = doc.replace(old, new)
        changes += 1

with open(doc_path, "w", encoding="utf-8") as f:
    f.write(doc)
print(f"  documents.tsx: {changes} substituicoes aplicadas")

# commit
subprocess.run(["git", "am", "--abort"], cwd=BASE, capture_output=True)  # abort pending am if any
subprocess.run(["git", "add",
    "src/hooks/queries/companies.ts",
    "src/routes/onboarding.tsx",
    "src/routes/app.$companyId.documents.tsx"
], cwd=BASE)
r = subprocess.run(["git", "commit", "-m", "refactor: Estande->Loja (tipo empresa), Estande tab->Clube em documentos"], cwd=BASE, capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())

r2 = subprocess.run(["git", "push", "-u", "origin", "claude/saas-evaluation-gaps-gqhbgj"], cwd=BASE, capture_output=True, text=True)
print(r2.stdout.strip() or r2.stderr.strip())
if r2.returncode == 0:
    print("Pronto! Deploy em 1-2 min.")
else:
    print("Push falhou:", r2.stderr)
