import { motion } from "framer-motion";
import { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

const conversations = [
  { id: 1, name: "Sarah Mitchell", lastMsg: "Thank you for confirming!", time: "2m ago", unread: true, booking: "BK-7821" },
  { id: 2, name: "James Wilson", lastMsg: "Can we change the date?", time: "1h ago", unread: true, booking: "BK-7820" },
  { id: 3, name: "Emily Chen", lastMsg: "Great experience!", time: "3h ago", unread: false, booking: "BK-7819" },
  { id: 4, name: "Michael Brown", lastMsg: "Is outdoor seating available?", time: "1d ago", unread: false, booking: "BK-7818" },
];

const messages = [
  { id: 1, sender: "customer", text: "Hi, I'd like to confirm my reservation for tomorrow.", time: "10:30 AM" },
  { id: 2, sender: "vendor", text: "Hello Sarah! Yes, your table for 4 is confirmed for 7:30 PM tomorrow evening.", time: "10:32 AM" },
  { id: 3, sender: "customer", text: "Perfect! Can we also get the window table if available?", time: "10:33 AM" },
  { id: 4, sender: "vendor", text: "I'll make a note of your preference. We'll do our best to accommodate!", time: "10:35 AM" },
  { id: 5, sender: "customer", text: "Thank you for confirming!", time: "10:36 AM" },
];

export default function Messages() {
  const [selectedConv, setSelectedConv] = useState(conversations[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">Communicate with your customers.</p>
      </div>

      <div className="flex gap-0 bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden h-[600px]">
        {/* Conversations List */}
        <div className="w-80 border-r border-border overflow-y-auto shrink-0">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedConv(c)}
              className={cn(
                "w-full text-left p-4 border-b border-border/50 transition-colors",
                selectedConv.id === c.id ? "bg-accent/5" : "hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full vendor-gradient flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-sm truncate">{c.name}</p>
                    <span className="text-xs text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMsg}</p>
                  <p className="text-xs text-accent mt-0.5">Ref: {c.booking}</p>
                </div>
                {c.unread && <div className="w-2 h-2 rounded-full bg-accent shrink-0" />}
              </div>
            </button>
          ))}
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full vendor-gradient flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {selectedConv.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{selectedConv.name}</p>
              <p className="text-xs text-muted-foreground">Booking: {selectedConv.booking}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "vendor" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                  m.sender === "vendor"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}>
                  <p>{m.text}</p>
                  <p className={cn("text-[10px] mt-1", m.sender === "vendor" ? "text-primary-foreground/60" : "text-muted-foreground")}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <Paperclip size={18} className="text-muted-foreground" />
            </button>
            <input
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Type a message..."
            />
            <button className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
