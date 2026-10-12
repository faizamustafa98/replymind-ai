export default function ChatMessage({ message }) {
    const isMe = message.from === "me";
    return (<div className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-xs max-w-[70%] ${isMe ? "ml-auto" : ""}`}>
      <div className={`p-md shadow-sm border border-outline-variant/20 hover:shadow-md transition-shadow ${isMe
          ? "bg-primary-container text-on-primary-container rounded-tl-lg rounded-bl-lg rounded-br-lg"
          : "bg-white rounded-tr-lg rounded-bl-lg rounded-br-lg"}`}>
        <p className="text-body-md leading-relaxed">{message.text}</p>
      </div>
      <div className={`flex items-center gap-xs text-[11px] text-on-surface-variant ${isMe ? "mr-1" : "ml-1"}`}>
        <span>{message.time}</span>
        {isMe && <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>}
      </div>
    </div>);
}
