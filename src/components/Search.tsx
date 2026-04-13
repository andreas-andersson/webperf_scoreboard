"use client";

import { SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { RefObject, useEffect, useRef } from "react";
import { Kbd } from "./ui/kbd";

interface SearchProps {
  tableBodyRef?: RefObject<HTMLTableSectionElement | null>;
  onResultsChange?: (hasResults: boolean) => void;
}

export function Search({ tableBodyRef, onResultsChange }: SearchProps) {

  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    if (!tableBodyRef?.current) return;

    let visibleCount = 0;
    const rows = tableBodyRef.current.rows;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const text = row.textContent?.toLowerCase() || "";
      const visible = text.includes(term);
      row.style.display = visible ? "" : "none";
      if (visible) visibleCount++;
    }
    onResultsChange?.(visibleCount > 0);
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "/" && !e.repeat) {
      e.preventDefault();
      searchRef.current?.focus();
    }

    if (e.key === "Escape" && document.activeElement === searchRef.current) {
      searchRef.current?.blur();
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <InputGroup className="mb-4 w-full border-none">
      <label htmlFor="leaderboard-search" className="sr-only">Search sites</label>
      <InputGroupInput
        id="leaderboard-search"
        ref={searchRef}
        type="search"
        placeholder="Search..."
        onChange={handleSearch}
        aria-controls="leaderboard-table-body"
      />
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <Kbd>/</Kbd>
      </InputGroupAddon>
    </InputGroup>
  );
}