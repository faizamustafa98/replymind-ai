"use client";
import { useState } from "react";
import ConversationCard from "@/src/components/dashboard/ConversationCard";

export default function ConversationList({
  conversations = [],
  heading = "Conversations",
  onSelectChat,
}) {
  const [query, setQuery] = useState("");

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.preview.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="w-full h-full flex flex-col bg-surface/40 backdrop-blur-md overflow-hidden">
      <header className="px-gutter pt-gutter pb-md space-y-md w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-medium text-on-surface">{heading}</h2>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors group">
            <span className="material-symbols-outlined group-hover:rotate-180">
              filter_list
            </span>
          </button>
        </div>
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60 group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            className="w-full pl-xl pr-md py-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-body-sm"
            placeholder="Search chats..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-gutter pb-xl space-y-xs w-full">
        {filtered.length > 0 ? (
          filtered.map((chat) => (
            <ConversationCard
              key={chat.id}
              chat={chat}
              onSelect={onSelectChat}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center mt-16 gap-3 text-on-surface-variant/40">
            <span className="material-symbols-outlined text-4xl">
              search_off
            </span>
            <p className="text-sm">No conversations found.</p>
          </div>
        )}
      </div>
    </section>
  );
}
