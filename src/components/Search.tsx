"use client";

import { SearchIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { RefObject, useEffect, useRef } from "react";

interface SearchProps {
  tableBodyRef?: RefObject<HTMLTableSectionElement | null>;
}

export function Search({ tableBodyRef }: SearchProps) {

  const searchRef = useRef<HTMLInputElement>(null);

  /**
   * Handle filtering table rows based on search input
   * @param e Change event from the search input
   * @returns void
   */
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

  /**
   * Handle keydown events for focusing and blurring the search input
   * @param e Keyboard event
   * @returns void
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "/" && !e.repeat) {
      e.preventDefault();
      searchRef.current?.focus();
    }

    if (e.key === "Escape" && document.activeElement === searchRef.current) {
      searchRef.current?.blur();
    }
  }

  // Set up keydown event listener
  useEffect(() => {
    // Focus search input on "/" key press
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <InputGroup className="mb-4 w-full border-none">
      <InputGroupInput ref={searchRef} accessKey="s" placeholder="Search..." onChange={handleSearch} />
      <InputGroupAddon>
      <SearchIcon />
      </InputGroupAddon>
    </InputGroup>
  );
}