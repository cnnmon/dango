import OpenAI from "openai";
import { ADD_TO_DESIGN_PHRASE, EXECUTE_PHRASE, PLANNING_PHRASE } from "./utils";
import assert from "assert";

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
    botSays(`Type '${PLANNING_PHRASE}' to begin planning the implementation for this current step together. If you want to generate immediately, type '${EXECUTE_PHRASE}'.`)
  ];
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

  Your interface allows for the following commands:\n
  - '${PLANNING_PHRASE}' to let Dango plan and ask about the current step\n
  - '${ADD_TO_DESIGN_PHRASE}' to add information to the design doc\n
  - '${EXECUTE_PHRASE}' to generate code or recommendations\n
  These commands should be automatically detected and handled. If the user deviates from these commands, you can remind them of the available commands.\n\n
`;

const handleInitialDetectiveRequest = async (step: Step, designDoc: string) => {
  const additionalQuestioningPrompt = `
    By the information provided, do you think you can generate relevant code for this step? Is there any other information you would need to generate correct code? If so, what questions would you like to ask the project's owner to clarify things?\n\n

    You may ONLY respond in the following JSON format:\n
    {\n
      "ready": boolean where true means you are ready to generate code with no questions,\n
      "questions": list of strings where each string is a question you have for the project's owner,\n
    }\n\n

    An example response is:\n
    {\n
      "ready": false,\n
      "questions": ["What is the expected output of the program?", "What is the language of the program?"],\n
    }\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      botSays(additionalQuestioningPrompt),
    ],
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
  });

  try {
    const message = response.choices[0]?.message.content;
    const { ready, questions } = JSON.parse(message as string);
    if (ready) {
      return {
        success: true,
        newMessages: [botSays(`Seems like I have no further questions about this step! Type '${EXECUTE_PHRASE}' to generate code or recommendations.`)],
      }
    } else {
      const formattedQuestions = questions.map((q: string) => `- ${q}`).join('\n');
      const questionMessage =  `Before we move on, it would be helpful to answer the question(s):\n\n${formattedQuestions}\n\nYou can:\n- Respond with '${ADD_TO_DESIGN_PHRASE}' followed by your answers and I'll add it to your design doc.\nEdit your design doc directly with more information.\nType '${EXECUTE_PHRASE}' to generate code or recommendations immediately.`
      return {
        success: true,
        newMessages: [botSays(questionMessage)],
      }
    }
  } catch (error) {
    console.log("Error parsing code response:", error);
    return {
      success: false,
      newMessages: [botSays(errorResponse)],
    }
  }
}

const handleAddInformationRequest = async ({
  messages,
  step,
  designDoc,
  userMessage,
  updateDesignDoc,
}: {
  messages: Message[],
  step: Step,
  designDoc: string,
  userMessage: string,
  updateDesignDoc: (stepToUpdate: Step) => void,
}) => {
  const additionalInformationPrompt = `
    The current step looks like the JSON object:\n
    ${JSON.stringify(step)}\n\n

    The user responded '${ADD_TO_DESIGN_PHRASE}' plus additional information they'd like to add to the design doc relating to this step.\n

    Keep in mind the design doc structure:\n${designDoc}\n\n

    From the user response, return the updated step object with any new information. You may ONLY respond in the following JSON format:\n
    {\n
      "number": number as the step number (keep this the same),\n
      "description": string describing the step at a high level,\n
      "files": list of strings or null of relevant file paths,\n
      "information": string 
    }\n\n

    An example response is:\n
    {\n
      "number": 1,\n
      "description": "Write a program that prints 'Hello, world!'",\n
      "files": ["hello.py"],\n
      "information": "The program should be written in JavaScript. And it should use the Note.js library."
    }\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      ...messages,
      userSays(userMessage),
      botSays(additionalInformationPrompt),
    ],
    model: "gpt-4-turbo",
  });

  if (response.choices[0]?.message.content) {
    const updatedStep = JSON.parse(response.choices[0].message.content);
    console.log("Add response:", response.choices[0].message.content);
    updateDesignDoc(updatedStep); // Send it off to vscode to update!
    return {
      success: true,
      newMessages: [],
    }
  }

  return {
    success: false,
    newMessages: [botSays(errorResponse)],
  }
}

const handleCodeGenerationRequest = async ({
  messages,
  step,
  designDoc,
  userMessage,
  generateFile,
  updateDesignDoc,
  readAllFiles,
}: {
  messages: Message[],
  step: Step,
  designDoc: string,
  userMessage: string,
  generateFile: (response: VscodeResponse) => void,
  updateDesignDoc: (stepToUpdate: Step) => void,
  readAllFiles: () => Promise<{
    name: string;
    content: string;
  }[]>,
}) => {

  console.log("About to handle code generation request!");

  const files = await readAllFiles();

  console.log("File Contents: ", files);

  let fileNames = "Existing Files:";
  let fileContents = "";
  for (const file of files) {
    fileNames += ` ${file.name},`;
    fileContents += `File: ${file.name}\n\n${file.content}\n\n`;
  }

  console.log(fileNames);
  console.log("File Contents String: ", fileContents);

  const codePrompt = `
    You are asked to generate code for ONLY the current step:\n${JSON.stringify(step)}\n\n
    Try not to generate code for future steps or steps that have already been completed. However, prioritize generating code that is correct and complete for the current step. You may need to reference the existing files included below. You should also add information to the design doc on this step about the new file you've generated.\n\n
    
    If you can't generate code for this step, add new information on what the project owner can do instead. Or, you may say you're unsure or unable to generate code.\n\n

    You may ONLY respond in the following JSON format:\n
    {\n
      "success": boolean where true means you successfully generated code or provided information on what to do instead,\n
      "step": {\n
        "number": number as the step number (keep this the same),\n
        "description": string describing the step at a high level,\n
        "files": list of strings or null of relevant file paths,\n
        "information": string\n
      } as the updated step object with any new information,\n
      "code": string of the code to generate or null if no code is generated,\n
      "filename": string of the filename to save the code as or null if no code is generated,\n
    }\n\n

    An example response is:\n
    {\n
      "success": true,\n
      "step": {\n
        "number": 1,\n
        "description": "Write a program that prints 'Hello, world!'",\n
        "files": [],\n
        "information": "Run 'python hello.py' in terminal."\n // New information
      },\n
      "code": "print('Hello, world!')",\n
      "filename": "hello.py"\n
    }\n

    Or, if you can't generate code:\n
    {\n
      "success": false,\n
      "step": {\n
        "number": 1,\n
        "description": "Create a new Next.js and Tailwind project.",\n
        "files": [],\n
        "information": "Run setup.sh in terminal to create the project. Look up Tailwind documentation for more information."\n // New information
      },\n
      "code": "npx create-next-app@latest my-project --typescript --eslint",\n
      "filename": "setup.sh"\n
    }\n
    
    Or:
    {\n
      "success": false,\n
      "step": {\n
        "number": 1,\n
        "description": "Create sound files for each key.",\n
        "files": [],\n
        "information": "Cannot generate. Recommend using the Tone.js library to generate them."\n // New information
      },\n
      "code": null,\n
      "filename": null\n
    }\n

    Here are the existing files in the codebase that you may need to reference:${fileNames}\n\n

    ${fileContents}\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      botSays(getInitialPrompt(designDoc, step)),
      ...messages,
      userSays(userMessage),
      botSays(codePrompt),
    ],
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
  });

  try {
    const message = response.choices[0]?.message.content;
    const { success, step: newStep, code, filename } = JSON.parse(message as string);

    if (!success) {
      updateDesignDoc(newStep);
      return {
        success: true,
        newMessages: [],
      }
    }

    if (!code || !filename) {
      return {
        success: false,
        newMessages: [botSays(errorResponse)],
      }
    }

    // If the description of the step has changed as well as the code
    if (step.information !== newStep.information || step.description !== newStep.description) {
      updateDesignDoc(newStep); // Send it off to vscode to update!
    }

    generateFile({ code, filename });

    return {
      success: true,
      newMessages: []
    }
  } catch (error) {
    console.log("Error parsing code response:", error);
    return {
      success: false,
      newMessages: [botSays(errorResponse)],
    }
  }
}

export const sendMessage = async ({
  command,
  userMessage,
  currentStepIdx,
  steps,
  designDoc,
  messages,
  /* VSCODE FUNCTIONS */
  generateFile,
  updateDesignDoc,
  readAllFiles,
  generateTemplateDesignDoc,
  generateStepsAndUpdateDesignDoc,
}: {
  command: string;
  userMessage: string;
  currentStepIdx: number;
  steps: Step[];
  designDoc: string | null;
  messages: Message[];
  generateFile: (response: VscodeResponse) => void;
  updateDesignDoc: (stepToUpdate: Step) => void;
  readAllFiles: () => Promise<{
    name: string;
    content: string;
  }[]>
  generateTemplateDesignDoc: () => void;
  generateStepsAndUpdateDesignDoc: () => void;
}): Promise<{
  success: boolean;
  newMessages: Message[];
}> => {
  // The only command that can be used to generate design doc & steps
  if (command === EXECUTE_PHRASE) {
    if (!designDoc) {
      // Generate the design doc first
      generateTemplateDesignDoc();
      return {
        success: true,
        newMessages: [],
      }
    }

    if (steps.length === 0) {
      // Generate steps
      generateStepsAndUpdateDesignDoc();
      return {
        success: true,
        newMessages: [],
      }
    }
  }

  // If no design doc, return error
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
  switch (command) {
    case PLANNING_PHRASE:
      readAllFiles();
      return handleInitialDetectiveRequest(step, designDoc);
    case ADD_TO_DESIGN_PHRASE:
      return handleAddInformationRequest({
        messages,
        step,
        designDoc,
        userMessage,
        updateDesignDoc
      });
    case EXECUTE_PHRASE:
      return handleCodeGenerationRequest({
        messages,
        step,
        designDoc,
        userMessage,
        generateFile,
        updateDesignDoc,
        readAllFiles,
      });
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
