import React from "react";
import Chat from "./Chat";

// Window listens for messages from the extension
// @ts-ignore
window.addEventListener('message', event => {
  const message = event.data;
  console.log(`Received message: ${JSON.stringify(message)}`);
});

// Sends messages to the extension
// @ts-ignore
declare const vscode: VSCode;
const _ = () => {
  vscode.postMessage({
    type: "click",
    value: "hello from button"
  });
}

export default function App() {
  return (
    <>
      <Chat />
    </>
  );
}