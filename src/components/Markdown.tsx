"use client";

import React from "react";

// Renderizador de markdown mínimo e seguro (sem dependências, sem HTML cru).
// Cobre o subconjunto que o assistente usa: títulos, negrito, código inline,
// listas com marcadores e numeradas, e parágrafos.

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-ink-900">
          {m[2]}
        </strong>
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <code key={key++} className="rounded bg-ink-100 px-1 py-0.5 text-[0.85em] text-ink-800">
          {m[3]}
        </code>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{renderInline(it)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key++} className="my-1 ml-5 list-decimal space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="my-1 ml-5 list-disc space-y-1">
          {items}
        </ul>
      )
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);

    if (h) {
      flush();
      const level = h[1].length;
      const cls =
        level <= 2 ? "mt-2 mb-1 text-[0.95rem] font-semibold text-ink-900" : "mt-2 text-sm font-semibold text-ink-900";
      blocks.push(
        <p key={key++} className={cls}>
          {renderInline(h[2])}
        </p>
      );
    } else if (ol) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
    } else if (ul) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
    } else {
      flush();
      blocks.push(
        <p key={key++} className="leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  flush();

  return <div className="space-y-1.5">{blocks}</div>;
}
