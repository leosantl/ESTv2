import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download } from "lucide-react";
import { useLojaProdutos, useLojaVendas, useLojaClientes, useLojaFinanceiro } from "@/hooks/queries/loja";

export const Route = createFileRoute("/app/$companyId/loja/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Loja" }] }),
  component: RelatoriosPage,
});

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function RelatoriosPage() {
  const { companyId } = useParams({ from: "/app/$companyId/loja/relatorios" });
  const { data: produtos = [] } = useLojaProdutos(companyId);
  const { data: vendasData } = useLojaVendas(companyId, "paga");
  const { data: clientes = [] } = useLojaClientes(companyId);
  const { data: lancamentos = [] } = useLojaFinanceiro(companyId);

  const vendas = vendasData?.data ?? [];
  const totalReceita = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "receber" && l.status === "pago").reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesa = (lancamentos as Record<string, unknown>[]).filter((l) => l.tipo === "pagar" && l.status === "pago").reduce((s, l) => s + Number(l.valor), 0);

  const prodSemEstoque = produtos.filter((p) => p.estoque_atual === 0);
  const prodMinimo = produtos.filter((p) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo);

  function exportCSV(headers: string[], rows: string[][], filename: string) {
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })),
      download: filename,
    });
    a.click();
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHeader title="Relatórios" description="Visão analítica de produtos, clientes, vendas e financeiro." />
      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Total de produtos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{produtos.length}</p></CardContent></Card>
            <Card className="border-red-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-red-600">Sem estoque</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{prodSemEstoque.length}</p></CardContent></Card>
            <Card className="border-amber-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-amber-600">Estoque mínimo</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{prodMinimo.length}</p></CardContent></Card>
          </div>
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <p className="text-sm font-semibold">Inventário de produtos</p>
              <Button size="sm" variant="outline" onClick={() => exportCSV(
                ["Nome", "Tipo", "Unidade", "Estoque Atual", "Mínimo", "Compra (R$)", "Venda (R$)", "Margem (%)"],
                produtos.map((p) => [p.nome, p.tipo, p.unidade, String(p.estoque_atual), String(p.estoque_minimo), String(p.valor_compra), String(p.valor_venda), String(p.margem_lucro)]),
                "inventario.csv"
              )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Produto</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Estoque</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Venda</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...produtos].sort((a, b) => a.estoque_atual - b.estoque_atual).slice(0, 20).map((p) => (
                  <TableRow key={p.id} className="text-sm">
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className={`text-right tabular-nums ${p.estoque_atual === 0 ? "text-red-600 font-bold" : p.estoque_atual <= p.estoque_minimo ? "text-amber-600" : ""}`}>{p.estoque_atual} {p.unidade}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{fmt(p.valor_venda)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{p.margem_lucro.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Total de vendas pagas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{vendas.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Faturamento total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold tabular-nums">{fmt(vendas.reduce((s, v) => s + v.total, 0))}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Ticket médio</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold tabular-nums">{fmt(vendas.length ? vendas.reduce((s, v) => s + v.total, 0) / vendas.length : 0)}</p></CardContent></Card>
          </div>
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <p className="text-sm font-semibold">Últimas vendas</p>
              <Button size="sm" variant="outline" onClick={() => exportCSV(
                ["Data", "Nº", "Cliente", "Forma Pagamento", "Total (R$)"],
                vendas.map((v) => [new Date(v.data_venda).toLocaleDateString("pt-BR"), v.numero_venda ?? "", v.loja_clientes?.nome ?? "", v.forma_pagamento ?? "", String(v.total)]),
                "vendas.csv"
              )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Data</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nº</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.slice(0, 20).map((v) => (
                  <TableRow key={v.id} className="text-sm">
                    <TableCell className="text-xs text-muted-foreground">{new Date(v.data_venda).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-xs font-mono">{v.numero_venda ?? "—"}</TableCell>
                    <TableCell className="text-xs">{v.loja_clientes?.nome ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmt(v.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Total de clientes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{clientes.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Ativos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{clientes.filter((c) => c.status === "ativo").length}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Bloqueados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{clientes.filter((c) => c.status === "bloqueado").length}</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-emerald-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-emerald-700">Receitas pagas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-700 tabular-nums">{fmt(totalReceita)}</p></CardContent></Card>
            <Card className="border-red-200"><CardHeader className="pb-1"><CardTitle className="text-sm text-red-700">Despesas pagas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-700 tabular-nums">{fmt(totalDespesa)}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Lucro líquido</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold tabular-nums ${totalReceita - totalDespesa >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(totalReceita - totalDespesa)}</p></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
