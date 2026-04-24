import React from 'react';

interface SidebarProps {
}

export default function Sidebar({}: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-20 bg-[var(--bg-deep)] border-r border-white/5 flex flex-col items-center py-8 z-[110] hidden sm:flex">
    </aside>
  );
}
