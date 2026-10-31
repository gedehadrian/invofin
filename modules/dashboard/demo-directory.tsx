"use client";

import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const organizations = [
  { id: "1", name: "CV Berkah Nusantara", type: "Vendor", status: "Aktif" },
  { id: "2", name: "PT Sumber Retail Indonesia", type: "Buyer", status: "Aktif" },
  { id: "3", name: "Nusantara Capital", type: "Lender", status: "Aktif" },
  { id: "4", name: "CV Maju Bersama", type: "Vendor", status: "Menunggu" },
];

export function DemoDirectory({ view }: { view: string }) {
  const [rows, setRows] = useState(organizations);
  const [query, setQuery] = useState("");
  const title = view === "organizations" ? "Organisasi" : view === "users" ? "Pengguna" : "Jejak audit";
  return <div className="space-y-6"><div><p className="text-xs text-primary">WORKSPACE ADMINISTRATOR</p><h1 className="mt-3 text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">Preview pengelolaan platform menggunakan data sintetis.</p></div><section className="surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 p-5"><h2 className="text-sm font-semibold">Daftar {title.toLowerCase()}</h2><label className="relative"><Search className="absolute left-3 top-3 size-3.5 text-muted-foreground" /><Input className="h-10 pl-9" value={query} onChange={event => setQuery(event.target.value)} aria-label={`Cari ${title}`} placeholder="Cari data..." /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-xs"><thead className="border-y bg-muted/50 text-muted-foreground"><tr>{(view === "organizations" ? ["Organisasi", "Jenis", "Status", "Aksi contoh"] : view === "users" ? ["Nama", "Organisasi", "Peran", "Status"] : ["Waktu", "Aktor", "Aktivitas", "Referensi"]).map(label => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{view === "organizations" ? rows.filter(row => row.name.toLowerCase().includes(query.toLowerCase())).map(row => <tr key={row.id} className="border-b"><td className="flex items-center gap-2 px-5 py-5"><Building2 className="size-4 text-primary" />{row.name}</td><td className="px-5">{row.type}</td><td className="px-5">{row.status}</td><td className="px-5"><Button variant="outline" size="sm" onClick={() => { setRows(current => current.map(item => item.id === row.id ? { ...item, status: item.status === "Aktif" ? "Ditangguhkan" : "Aktif" } : item)); toast.success("Status contoh diperbarui untuk sesi ini."); }}>{row.status === "Aktif" ? "Tangguhkan" : "Aktifkan"}</Button></td></tr>) : (view === "users" ? [
    ["Alex Pratama", "CV Berkah Nusantara", "Vendor", "Aktif"], ["Nadia Putri", "PT Sumber Retail Indonesia", "Buyer", "Aktif"], ["Rafi Wijaya", "Nusantara Capital", "Lender", "Aktif"], ["Dina Safitri", "InvoFin Risk", "Risk Officer", "Aktif"],
  ] : [["31 Okt 2026, 09.30", "Nadia Putri", "Konfirmasi invoice", "INV/2026/1028"], ["31 Okt 2026, 09.15", "Dina Safitri", "Tinjauan risiko", "INV/2026/1021"], ["30 Okt 2026, 14.00", "Alex Pratama", "Pengajuan invoice", "INV/2026/1028"]]).filter(row => row.join(" ").toLowerCase().includes(query.toLowerCase())).map((row, index) => <tr key={index} className="border-b">{row.map((cell, i) => <td key={i} className="px-5 py-5">{cell}</td>)}</tr>)}</tbody></table></div><p className="p-5 text-xs text-muted-foreground">Data contoh. Akses pengelolaan akun asli memerlukan autentikasi dan otorisasi server.</p></section></div>;
}
