#!/usr/bin/env node
/*
 * Собирает src/components/Common/FigmaIcons.tsx из SVG, выгруженных
 * из макета (src/assets/figma-icons).
 *
 * Иконки перекладываются в компонент, а не грузятся как файлы: так они
 * попадают в общий бандл одним куском, наследуют цвет через currentColor
 * и не требуют вставки чужой разметки в DOM на клиенте.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "src", "assets", "figma-icons");
const target = join(here, "..", "src", "components", "Common", "FigmaIcons.tsx");

const camel = name =>
  name.replace(/\.svg$/, "").split(/[^a-z0-9]+/i)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const entries = [];
for (const file of readdirSync(source).sort().filter(f => f.endsWith(".svg"))) {
  const svg = readFileSync(join(source, file), "utf8");
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const paths = [...svg.matchAll(/<path\s([^>]+?)\/>/g)].map(([, attrs]) => ({
    d: /(?:^|\s)d="([^"]+)"/.exec(attrs)?.[1],
    fillRule: /fill-rule="([^"]+)"/.exec(attrs)?.[1],
    transform: /transform="([^"]+)"/.exec(attrs)?.[1],
  })).filter(p => p.d);

  if (!viewBox || !paths.length) {
    console.error(`пропущено без геометрии: ${file}`);
    continue;
  }
  entries.push({ key: file.replace(/\.svg$/, ""), name: camel(file), viewBox, paths });
}

const body = entries.map(({ key, viewBox, paths }) => {
  const shapes = paths.map(p =>
    `      <path d=${JSON.stringify(p.d)}`
    + (p.fillRule ? ` fillRule="${p.fillRule}"` : "")
    + (p.transform ? ` transform=${JSON.stringify(p.transform)}` : "")
    + " fill=\"currentColor\" />").join("\n");
  return `  ${JSON.stringify(key)}: {\n    viewBox: ${JSON.stringify(viewBox)},\n    shapes: (\n      <>\n${shapes}\n      </>\n    ),\n  },`;
}).join("\n");

const out = `// Файл собран scripts/build-figma-icons.mjs из макета Figma. Не править вручную.
import type { ReactNode } from 'react'

interface IconShape {
  viewBox: string
  shapes: ReactNode
}

export const FIGMA_ICONS: Record<string, IconShape> = {
${body}
}

export type FigmaIconName = keyof typeof FIGMA_ICONS

interface AspectIconProps {
  name: FigmaIconName
  size?: number
  className?: string
  title?: string
}

/** Иконка из макета. Цвет наследуется, поэтому состояние задаёт родитель. */
export function AspectIcon({ name, size = 16, className, title }: AspectIconProps) {
  const icon = FIGMA_ICONS[name]
  if (!icon) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {icon.shapes}
    </svg>
  )
}
`;

writeFileSync(target, out);
console.log(`иконок в компоненте: ${entries.length} -> ${target}`);
