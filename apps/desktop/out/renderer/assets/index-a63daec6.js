import { u as useChatStore, r as reactExports, s as staggerIn, j as jsxRuntimeExports, S as ScrollArea, C as CONTACTS, a as ContactAvatar } from "./index-167cc251.js";
function ChatModule() {
  const openChat = useChatStore((s) => s.openChat);
  const gridRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (gridRef.current?.children.length) {
      staggerIn(gridRef.current.children, { y: 12, delayStep: 18 });
    }
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { className: "h-full px-4 pt-1 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: gridRef, className: "grid grid-cols-4 gap-3", children: CONTACTS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      title: c.name,
      onClick: () => openChat(c),
      style: { opacity: 0 },
      className: "transition-transform duration-150 hover:scale-105 active:scale-95",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContactAvatar, { contact: c })
    },
    c.name
  )) }) });
}
export {
  ChatModule as default
};
