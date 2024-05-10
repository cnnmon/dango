import OpenAI from "openai";
import { EXECUTE_PHRASE } from "./utils";

const openai = new OpenAI({
  // @ts-ignore
  apiKey: window.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/* TYPES */

export type Step = {
  number: number;
  description: string;
  information: string;
}

enum MessageSender {
  USER = "user",
  BOT = "system",
}

export type Message = {
  role: MessageSender;
  content: string;
}

export type VscodeResponse = {
  code: string;
  filename: string;
}

/* UTILITY FUNCTIONS */

export const botSays = (content: string) => {
  return { role: MessageSender.BOT, content };
}

export const userSays = (content: string) => {
  return { role: MessageSender.USER, content };
}

const errorResponse = "I'm sorry, I ran into an error generating a response. Please try again later.";

/* CHAT FUNCTIONS */

export const formatStep = (step: Step): string => {
  return `<b>Step ${step.number}: ${step.description}</b>`;
}

export const getDesignDocConfirmation = (step: Step): Message[] => {
  return [
    botSays(`You are currently on ${formatStep(step)}`),
    getChatInstructions(),
  ];
}

export const getChatInstructions = (): Message => {
  const instructions = `Type <b>${EXECUTE_PHRASE}</b> to work together on this step (this may take a minute or two). Or, ask any questions you might have.`;
  return botSays(instructions);
}

/* HANDLE USER MESSAGES AND SPECIAL REQUESTS */
/* Two phases of interaction:
    1. DETECTIVE: Dango asks you questions about the step
    2. PROGRAMMER: Dango generates code
*/

const getInitialPrompt = (designDoc: string, { description, information }: Step) => `
  You are a pair programmer whose job is to generate code given a 'living design document', which you will update as you receive information by chatting with the project's owner.\n\n

  It is important to follow the current state of the 'living design doc':\n${designDoc}\n\n

  You are currently on step ${description}.\n
  ${information && `Additional information:\n${information}`}\n

  If the user asks for help, tell them your interface allows for the following command:\n
  Type ${EXECUTE_PHRASE} and Dango will read the design doc and either ask questions to clarify the step, generate code, or add implementation recommendations to the design doc.

  If the user wants to reset the design doc or step, they can click off the current tab and back to reset the memory of the design doc.\n\n

  These commands should be automatically detected and handled. If the user deviates from these commands, you can remind them of the available commands.\n\n
`;

export const sendMessage = async ({
  command,
  userMessage,
  currentStepIdx,
  steps,
  designDoc,
  messages,
  generate, /* VSCODE FUNCTIONS */
}: {
  command: string;
  userMessage: string;
  currentStepIdx: number;
  steps: Step[];
  designDoc: string | null;
  messages: Message[];
  generate: (step: Step) => void; /* VSCODE FUNCTIONS */
}): Promise<{
  success: boolean;
  newMessages: Message[];
}> => {
  // If no design doc, return error (this is realistically never happen since the user should be reset to landing)
  if (!designDoc) {
    return {
      success: false,
      newMessages: [botSays("Cannot proceed without a design doc.")],
    }
  }

  // If no steps, return error
  if (steps.length === 0) {
    return {
      success: false,
      newMessages: [botSays("Cannot proceed without steps.")],
    }
  }

  const step = steps[currentStepIdx];
  if (command === EXECUTE_PHRASE) {
    generate(step);
    return {
      success: true,
      newMessages: [],
    }
  }

  // Normal chat catch-all (codebase questions, etc.)
  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      ...messages,
      userSays(userMessage),
      botSays("Respond concisely and simply, ideally within 1-2 sentences."),
    ],
    model: "gpt-4-turbo",
  })

  if (response.choices[0]?.message.content) {
    return {
      success: true,
      newMessages: [botSays(response.choices[0].message.content)],
    }
  }

  // Default error response
  return {
    success: false,
    newMessages: [botSays(errorResponse)],
  }
};
