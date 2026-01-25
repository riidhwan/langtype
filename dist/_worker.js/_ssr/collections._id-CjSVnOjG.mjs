import { j as jsxRuntimeExports, r as reactExports } from "../_chunks/_libs/react.mjs";
import { c as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as Route } from "./router-DU9EaVdG.mjs";
import "node:process";
import "../_chunks/_libs/@tanstack/router-core.mjs";
import "../_libs/cookie-es.mjs";
import "../_chunks/_libs/@tanstack/history.mjs";
import "../_libs/tiny-invariant.mjs";
import "../_libs/seroval.mjs";
import "../_libs/unenv.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_chunks/_libs/@tanstack/react-router.mjs";
import "../_libs/tiny-warning.mjs";
import "../_libs/react-dom.mjs";
import "../_libs/isbot.mjs";
function autoMatchSpacing(rawInput, target) {
  const cleanInput = rawInput.replace(/\s/g, "");
  const inputChars = cleanInput.split("");
  let result = "";
  let inputIndex = 0;
  for (let i = 0; i < target.length; i++) {
    if (inputIndex >= inputChars.length) break;
    const targetChar = target[i];
    if (targetChar === " ") {
      result += " ";
    } else {
      result += inputChars[inputIndex];
      inputIndex++;
    }
  }
  return result;
}
function useTypingEngine(sentences) {
  const [currentIndex, setCurrentIndex] = reactExports.useState(0);
  const [input, setInput] = reactExports.useState("");
  const [status, setStatus] = reactExports.useState("typing");
  const currentSentence = sentences[currentIndex] || "";
  const [timeLeft, setTimeLeft] = reactExports.useState(0);
  reactExports.useEffect(() => {
    setInput("");
    setStatus("typing");
    setTimeLeft(0);
  }, [currentIndex]);
  reactExports.useEffect(() => {
    let timer;
    if ((status === "submitted" || status === "completed") && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1e3);
    } else if (timeLeft === 0 && (status === "submitted" || status === "completed")) {
      if (currentIndex < sentences.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }
    return () => clearInterval(timer);
  }, [status, timeLeft, currentIndex, sentences.length]);
  const setInputSafe = (value) => {
    if (status === "completed" || status === "submitted") return;
    const spacedValue = autoMatchSpacing(value, currentSentence);
    setInput(spacedValue);
  };
  const submit = () => {
    if (status === "completed" || status === "submitted") return;
    const isMatch = input === currentSentence;
    setStatus(isMatch ? "completed" : "submitted");
    setTimeLeft(5);
  };
  const wordCount = reactExports.useMemo(() => {
    if (!currentSentence) return 0;
    return currentSentence.trim().split(/\s+/).length;
  }, [currentSentence]);
  const charCount = reactExports.useMemo(() => currentSentence.length, [currentSentence]);
  const isCorrect = status === "completed";
  return {
    input,
    setInput: setInputSafe,
    currentSentence,
    currentIndex,
    wordCount,
    charCount,
    isCorrect,
    status,
    submit,
    timeLeft
  };
}
function SentenceDisplay({ text }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-xl mb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "Translate this:" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl md:text-2xl font-serif text-foreground leading-relaxed border-l-4 border-primary pl-4 py-1", children: text })
  ] });
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const getWordsWithIndices = (text) => {
  const words = [];
  let currentIndex = 0;
  const rawWords = text.split(" ");
  rawWords.forEach((wordText) => {
    words.push({
      text: wordText,
      startIndex: currentIndex
    });
    currentIndex += wordText.length + 1;
  });
  return words;
};
function VisualTranslationInput({
  value,
  onChange,
  onSubmit,
  targetText,
  status = "typing"
}) {
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (status === "typing") {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [targetText, status]);
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit();
    }
  };
  const words = getWordsWithIndices(targetText);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative w-full max-w-2xl cursor-text font-mono",
      onClick: handleContainerClick,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: inputRef,
            type: "text",
            className: "absolute inset-0 opacity-0 pointer-events-none",
            value,
            onChange: (e) => onChange(e.target.value),
            onKeyDown: handleKeyDown,
            autoFocus: true,
            disabled: status === "completed"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-y-4 gap-x-4", children: words.map((word, wIdx) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-x-1", children: word.text.split("").map((char, charOffset) => {
          const index = word.startIndex + charOffset;
          const inputValue = value[index] || "";
          const isTyped = index < value.length;
          const isCurrent = index === value.length && status === "typing";
          let statusColor = "border-muted-foreground/30 text-muted-foreground";
          if (status === "submitted" || status === "completed") {
            const isMatch = inputValue === char;
            statusColor = isMatch ? "border-green-500 bg-green-500/20 text-green-700" : "border-red-500 bg-red-500/20 text-red-600";
          } else if (isTyped) {
            statusColor = "border-foreground text-foreground";
          }
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              "data-testid": "char-slot",
              className: cn(
                "w-5 h-8 md:w-8 md:h-12 border-b-2 flex items-center justify-center text-lg md:text-2xl transition-colors select-none",
                statusColor,
                // Current cursor position
                isCurrent && "border-primary animate-pulse"
              ),
              children: inputValue
            },
            index
          );
        }) }, wIdx)) })
      ]
    }
  );
}
function TypingGame({ challenges }) {
  const {
    input,
    setInput,
    isCorrect,
    status,
    submit,
    currentIndex,
    currentSentence,
    timeLeft
  } = useTypingEngine(challenges.map((c) => c.translation));
  const currentChallenge = challenges[currentIndex];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-2xl flex flex-col items-center gap-4 md:gap-8", children: [
    currentChallenge && /* @__PURE__ */ jsxRuntimeExports.jsx(SentenceDisplay, { text: currentChallenge.original }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full flex flex-col items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        VisualTranslationInput,
        {
          value: input,
          onChange: setInput,
          onSubmit: submit,
          targetText: currentSentence,
          status
        }
      ),
      isCorrect && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-green-600 font-bold animate-pulse mt-4", children: [
        "✨ Correct! Moving to next sentence in ",
        timeLeft,
        "..."
      ] }),
      status === "submitted" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-2 mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-red-600 font-bold", children: [
          "❌ Incorrect. Moving in ",
          timeLeft,
          "..."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-muted-foreground", children: [
          "Correct answer: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-bold text-foreground", children: currentSentence })
        ] })
      ] })
    ] })
  ] });
}
function CollectionGamePage() {
  const collection = Route.useLoaderData();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl text-muted-foreground", children: collection.title }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TypingGame, { challenges: collection.challenges || [] })
  ] });
}
export {
  CollectionGamePage as component
};
