import React from "react";
import { Terminal, Fingerprint } from "lucide-react";
import { TeamMember } from "../types";

export default function TeamMemberSciFiCard({ member }: { member: TeamMember }) {
  const secCode = member.secCode || `SEC-${Math.floor(10000 + Math.random() * 90000)}-A-1784`;
  const status = member.status || "ASSOCIATE";
  const bio = member.bio || "AUTHORIZATION GRANTED TO OVERSEE GEOMETRIC MASS INVESTIGATIONS AND RECONCILE MATERIAL TECTONICS WITH THE ENVIRONMENT.";

  return (
    <div className="relative bg-[#05070a]/95 border border-cyan-500/25 text-[#00f0ff] p-3 rounded-sm font-mono text-[9px] uppercase tracking-wide shadow-[0_0_12px_rgba(0,240,255,0.03)] overflow-hidden transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] group select-none flex flex-col justify-between h-[365px]">
      
      {/* Sci-fi notched corner brackets decor */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-cyan-400/70" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-cyan-400/70" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-cyan-400/70" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-cyan-400/70" />

      {/* Grid Overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.01)_1px,transparent_1px)] bg-[size:6px_6px] pointer-events-none" />
      
      {/* Scanning scanline */}
      <div className="absolute inset-x-0 h-[1.5px] bg-cyan-500/10 top-0 animate-[scan_7s_linear_infinite] pointer-events-none shadow-[0_0_3px_rgba(0,240,255,0.4)]" />

      <div className="flex flex-col h-full justify-between">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center border-b border-cyan-500/15 pb-1 mb-2">
          <div className="flex items-center gap-1">
            <Terminal size={8} className="text-cyan-400 animate-pulse" />
            <span className="font-bold text-[7px] tracking-[0.18em] text-cyan-400/90">SHAILORA ASSOCIATES</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 px-1.5 py-0.5 rounded-full border border-cyan-500/10">
            <span className="w-1.5 h-1.5 rounded-full relative flex">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${member.statusLight === "red" ? "bg-red-500" : "bg-emerald-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${member.statusLight === "red" ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]" : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"}`}></span>
            </span>
            <span className={`text-[6px] font-mono font-bold tracking-wider ${member.statusLight === "red" ? "text-red-400" : "text-emerald-400"}`}>
              {member.statusLight === "red" ? "PAST" : "ACTIVE"}
            </span>
          </div>
        </div>

        {/* IDENTITY & ROLE TITLE */}
        <div className="mb-2">
          <span className="text-[5.5px] text-cyan-500/40 block tracking-wider">PERSONNEL RECORD</span>
          <h4 className="text-[11px] font-bold text-white tracking-[0.06em] font-sans truncate">{member.name}</h4>
          <span className="text-[7px] text-cyan-400 font-medium block mt-0.5">[{member.role}]</span>
        </div>

        {/* 3 PORTRAIT IMAGES SIDE-BY-SIDE */}
        <div className="grid grid-cols-3 gap-1 mb-2.5">
          {/* Left Profile */}
          <div className="relative aspect-[3/4] bg-zinc-950 border border-cyan-500/20 overflow-hidden group/photo">
            <div className="absolute top-0.5 left-1 text-[4.5px] text-cyan-400/50 font-mono z-10">L-VIEW</div>
            {member.imageLeft ? (
              <img
                src={member.imageLeft}
                alt={`${member.name} Left Profile`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale brightness-[0.85] contrast-[1.15] transition-all duration-300 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[5px] text-cyan-500/20 font-mono">N/A</div>
            )}
            <div className="absolute inset-0 bg-cyan-950/5 pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_50%,transparent_50%)] bg-[size:100%_3px] pointer-events-none" />
          </div>

          {/* Front Profile */}
          <div className="relative aspect-[3/4] bg-zinc-950 border border-cyan-400/35 overflow-hidden group/photo shadow-[0_0_6px_rgba(0,240,255,0.08)]">
            <div className="absolute top-0.5 left-1 text-[4.5px] text-cyan-400/70 font-mono z-10 font-bold">F-VIEW</div>
            {member.image ? (
              <img
                src={member.image}
                alt={`${member.name} Front Profile`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale brightness-[0.85] contrast-[1.15] transition-all duration-300 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[5px] text-cyan-500/20 font-mono">N/A</div>
            )}
            <div className="absolute inset-0 bg-cyan-950/5 pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_50%,transparent_50%)] bg-[size:100%_3px] pointer-events-none" />
          </div>

          {/* Right Profile */}
          <div className="relative aspect-[3/4] bg-zinc-950 border border-cyan-500/20 overflow-hidden group/photo">
            <div className="absolute top-0.5 left-1 text-[4.5px] text-cyan-400/50 font-mono z-10">R-VIEW</div>
            {member.imageRight ? (
              <img
                src={member.imageRight}
                alt={`${member.name} Right Profile`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale brightness-[0.85] contrast-[1.15] transition-all duration-300 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[5px] text-cyan-500/20 font-mono">N/A</div>
            )}
            <div className="absolute inset-0 bg-cyan-950/5 pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_50%,transparent_50%)] bg-[size:100%_3px] pointer-events-none" />
          </div>
        </div>

        {/* SYSTEM STATUS DETAILS */}
        <div className="space-y-0.5 text-[7px] mb-2">
          <div className="flex justify-between items-center py-0.5 border-b border-cyan-500/10">
            <span className="text-cyan-500/40">OPERATIONAL STATUS:</span>
            <span className="text-white/90 font-medium tracking-wide truncate max-w-[120px]">{status}</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-cyan-500/10">
            <span className="text-cyan-500/40">SECURITY ID:</span>
            <span className="text-cyan-350 font-semibold tracking-tight">{secCode}</span>
          </div>
        </div>

        {/* SYSTEM DIRECTIVE / BIO STATEMENT */}
        <div className="bg-cyan-950/10 border border-cyan-500/10 p-2 rounded-sm text-justify leading-relaxed text-cyan-300/80 text-[7px] h-14 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-950 scrollbar-track-transparent">
          {bio}
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-1 text-[5px] text-cyan-500/30 border-t border-cyan-500/10 pt-1 mt-1 font-mono">
          <Fingerprint size={6} />
          <span>OFFICIAL DOSSIER • SHAILORA ASSOCIATES</span>
        </div>
      </div>

    </div>
  );
}
