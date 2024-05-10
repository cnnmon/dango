import React from "react";
import { Message, Step } from "./utils/chatService";
import { ellipses, parseAndFormatMessageText } from "./utils/utils";

function NavButton({ currentStepIdx, steps, handleStepChange, direction }: {
  currentStepIdx: number,
  steps: Step[],
  handleStepChange: (newStep: number) => void,
  direction: "prev" | "next",
}) {
  const isPrev = direction === "prev";
  const stepIdx = currentStepIdx + (isPrev ? -1 : 1);
  if (stepIdx < 0 || stepIdx >= steps.length) {
    return <div></div>;
  }

  const step = steps[stepIdx];
  const { number, description } = step;
  
  return (
    <button
      className={`subtitle`}
      onClick={() => handleStepChange(stepIdx)}>
      {direction === "prev" && "←"} {`Step ${number}: ${ellipses(description)}`} {direction === "next" && "→"}
    </button>
  );
}

function StepFooter({
  designDoc, currentStepIdx, steps, handleStepChange
}: {
  designDoc: string | null,
  currentStepIdx: number,
  steps: Step[],
  handleStepChange: (newStep: number) => void,
}) {
  if (!designDoc || steps.length === 0) {
    return (
      <></>
    );
  }

  const currentStep = steps[currentStepIdx];
  if (!currentStep) {
    return <div></div>;
  }

  const { number, description } = currentStep;

  return (
    <>
      <p className="subtitle text-center">
        You're on <b>Step {number}: {currentStep && ellipses(description, 10)}</b>.
      </p>

      <div className="flex flex-row w-full justify-between gap-2 mt-2">
        <NavButton currentStepIdx={currentStepIdx} steps={steps} handleStepChange={handleStepChange} direction="prev" />
        <NavButton currentStepIdx={currentStepIdx} steps={steps} handleStepChange={handleStepChange} direction="next" />
      </div>
    </>
  );
}

export default function Chatbox({
  messages,
  designDoc,
  currentStepIdx,
  steps,
  isDangoLoading,
  handleUserMessage,
  handleStepChange,
  textareaValue,
  setTextareaValue,
  messagesEndRef,
}: {
  messages: Message[],
  designDoc: string | null,
  currentStepIdx: number,
  steps: Step[],
  isDangoLoading: boolean,
  textareaValue: string,
  setTextareaValue: React.Dispatch<React.SetStateAction<string>>,
  handleUserMessage: () => void,
  handleStepChange: (newStep: number) => void,
  messagesEndRef: React.RefObject<HTMLDivElement>,
}) {
  return (
    <>
      <div className="flex flex-col gap-2 mb-2 h-[70vh] max-h-[70vh] overflow-y-auto">
        {messages.map((message, idx) => (
          <div key={idx} className={`flex flex-row whitespace-pre-wrap items-center gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className="text-lg">{message.role === "user" ? "🧍" : "🍡"}</span>
            <div className="p-2 rounded-md bg-gray-200 flex-1 text-black">
              {parseAndFormatMessageText(message.content)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-1 w-0"></div>
      </div>

      <textarea
        className="bg-white p-2 w-full resize-none text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder="Say something..."
        value={textareaValue}
        onChange={(e) => setTextareaValue(e.target.value)}
        />
      
      <button
        className={`submit-button align-middle select-none font-bold text-center uppercase transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none py-2 px-6 rounded-lg bg-gray-900 text-white shadow-md shadow-gray-900/10 hover:shadow-lg hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none w-full ${isDangoLoading || !textareaValue ? "cursor-not-allowed bg-gray-400" : ""}`} 
        disabled={isDangoLoading || !textareaValue}
        onClick={handleUserMessage}>
        {isDangoLoading ? "🍡 is thinking..." : "Submit"}
      </button>

      <div className="mt-2">
        <StepFooter
          designDoc={designDoc}
          currentStepIdx={currentStepIdx}
          steps={steps}
          handleStepChange={handleStepChange}
        />
      </div>
    </>
  );
}