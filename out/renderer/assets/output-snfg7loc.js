import { r as reactExports, j as jsxRuntimeExports, c as client, R as React } from "./client-6dElx9E4.js";
function App() {
  const [displayState, setDisplayState] = reactExports.useState("idle");
  const [slide, setSlide] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const removeSlide = window.presenterOutput.onSlideUpdate((payload) => {
      setSlide(payload);
      setDisplayState("slide");
    });
    const removeBlank = window.presenterOutput.onBlank(() => {
      setDisplayState("blank");
    });
    const removeClear = window.presenterOutput.onClear(() => {
      setSlide(null);
      setDisplayState("idle");
    });
    return () => {
      removeSlide();
      removeBlank();
      removeClear();
    };
  }, []);
  if (displayState === "idle" || displayState === "blank") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-screen w-screen bg-black" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-screen w-screen items-center justify-center bg-black", children: [
    slide?.imagePath && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        src: slide.imagePath,
        alt: "",
        className: "absolute inset-0 h-full w-full object-cover",
        style: { opacity: 0.4 }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 max-w-4xl px-16 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-6xl font-bold leading-tight text-white", children: slide?.title }),
      slide?.body && (slide.body.trimStart().startsWith("<") ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "mt-6 text-3xl font-light leading-relaxed text-white/80 slide-body",
          dangerouslySetInnerHTML: { __html: slide.body }
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-3xl font-light leading-relaxed text-white/80", children: slide.body }))
    ] })
  ] });
}
client.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
