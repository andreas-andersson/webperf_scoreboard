"use client";

import { SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { RefObject } from "react";

interface SearchProps {
  tableBodyRef?: RefObject<HTMLTableSectionElement | null>;
}

export function Search({ tableBodyRef }: SearchProps) {

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    if (!tableBodyRef?.current) return;

    const rows = tableBodyRef.current.rows;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = row.textContent?.toLowerCase() || "";
        if (text.includes(term)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
  }

  return (
    <InputGroup className="mb-4 w-full border-none">
      <InputGroupInput accessKey="s" placeholder="Search..." onChange={handleSearch} />
      <InputGroupAddon>
      <SearchIcon />
      </InputGroupAddon>
    </InputGroup>
  );
}